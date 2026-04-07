import type { ServerMessage, ComponentInfo, ElementIdentity, TextEditAnnotation } from "@glide-editor/shared";
import { getFiberFromHostInstance, isCompositeFiber, getDisplayName } from "bippy";
import { getOwnerStack } from "bippy/source";
import { resolveFrameFilePath } from "./utils/source-resolve.js";
import { send, onMessage, requestFileDiscovery } from "./bridge.js";
import { getCachedFilePath, setCachedFilePath } from "./file-discovery-cache.js";
import { COLORS } from "./design-tokens.js";
import { setInteractionPointerEvents, activateInteraction, getPageElementAtPoint } from "./interaction.js";
import { getActiveTool } from "./canvas-state.js";
import { addTextEditAnnotation } from "./canvas-state.js";
import { isInternalName, isLibraryPath, isValidElement } from "./utils/component-filter.js";
import { clearSelection, selectElement, getSelection } from "./selection.js";
import { addChangeEntry } from "./changelog.js";
import { computeNthOfType } from "./utils/nth-of-type.js";

// --- Helpers ---

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

// --- Blocklist: replaced/void elements where contentEditable is useless ---
const BLOCKED_TAGS = new Set([
  "IMG", "INPUT", "VIDEO", "IFRAME", "CANVAS", "SELECT",
  "TEXTAREA", "HR", "BR", "EMBED", "OBJECT", "PROGRESS",
]);

// --- Internal state ---
let editingElement: HTMLElement | null = null;
let originalTextContent = "";
let originalInnerHTML = "";
let lastKnownText = "";
let componentInfo: ComponentInfo | null = null;
let componentInfoPromise: Promise<ComponentInfo | null> | null = null;
let savedOutline = "";
let unsubscribeMessage: (() => void) | null = null;

// --- Pending commit for annotation fallback ---
let pendingCommit: {
  componentInfo: ComponentInfo;
  originalText: string;
  newText: string;
  cursorOffset?: number;
  originalInnerHTML: string;
  tagName: string;
  element?: HTMLElement;
} | null = null;

// --- Exports ---

export function isTextEditing(): boolean {
  return editingElement !== null;
}

export function initInlineTextEdit(): void {
  document.addEventListener("dblclick", handleDblClick, true);
  document.addEventListener("mousedown", handleOutsidePointerDown, true);
  unsubscribeMessage = onMessage((msg: ServerMessage) => {
    if (msg.type === "updateTextComplete") {
      handleUpdateTextResponse(msg);
    }
  });
}

export function destroyInlineTextEdit(): void {
  if (editingElement) {
    exitEditMode();
  }
  document.removeEventListener("dblclick", handleDblClick, true);
  document.removeEventListener("mousedown", handleOutsidePointerDown, true);
  unsubscribeMessage?.();
  unsubscribeMessage = null;
}

export function cancelTextEditSession(): void {
  if (!editingElement) return;
  editingElement.innerHTML = originalInnerHTML;
  pendingCommit = null;
  exitEditMode();
}

function handleUpdateTextResponse(msg: Extract<ServerMessage, { type: "updateTextComplete" }>): void {
  if (msg.success && msg.undoId && pendingCommit) {
    // Path A: AST write succeeded — record as active change with undo support
    const pc = pendingCommit;
    const identity: ElementIdentity = {
      componentName: pc.componentInfo.componentName,
      filePath: pc.componentInfo.filePath,
      lineNumber: pc.componentInfo.lineNumber,
      columnNumber: pc.componentInfo.columnNumber,
      tagName: pc.tagName,
    };
    addChangeEntry({
      type: "textEdit",
      componentName: pc.componentInfo.componentName,
      filePath: pc.componentInfo.filePath,
      summary: `"${truncate(pc.originalText, 20)}" → "${truncate(pc.newText, 20)}"`,
      state: "active",
      elementIdentity: identity,
      revertData: { type: "cliUndo", undoIds: [msg.undoId] },
    });
  } else if (!msg.success && msg.reason === "no-match" && pendingCommit) {
    // Path B-1: AST write returned no-match — fall back to annotation
    const pc = pendingCommit;
    const ann: TextEditAnnotation = {
      type: "textEdit",
      id: `text-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      componentName: pc.componentInfo.componentName,
      filePath: pc.componentInfo.filePath,
      lineNumber: pc.componentInfo.lineNumber,
      columnNumber: pc.componentInfo.columnNumber,
      originalText: pc.originalText,
      newText: pc.newText,
      cursorOffset: pc.cursorOffset,
    };
    const identity: ElementIdentity = {
      componentName: pc.componentInfo.componentName,
      filePath: pc.componentInfo.filePath,
      lineNumber: pc.componentInfo.lineNumber,
      columnNumber: pc.componentInfo.columnNumber,
      tagName: pc.tagName,
    };
    addTextEditAnnotation(ann, identity, pc.originalInnerHTML, undefined, pc.element);
    addChangeEntry({
      type: "textAnnotation",
      componentName: ann.componentName,
      filePath: ann.filePath || "",
      summary: `"${truncate(ann.originalText, 20)}" → "${truncate(ann.newText, 20)}"`,
      state: "pending",
      elementIdentity: identity,
      revertData: {
        type: "annotationRemove",
        annotationId: ann.id,
        originalInnerHTML: pc.originalInnerHTML,
        elementIdentity: identity,
      },
    });
  }
  pendingCommit = null;
}

// --- Multi-line detection ---

function isMultiLine(el: HTMLElement): boolean {
  if (el.scrollHeight > el.clientHeight + 4) return true;
  if (el.querySelector("br")) return true;
  const style = getComputedStyle(el);
  if (style.whiteSpace !== "nowrap" && el.getClientRects().length > 1) return true;
  return false;
}

// --- Component resolution (matches selection.ts async pattern for React 19) ---

async function resolveComponent(el: HTMLElement): Promise<ComponentInfo | null> {
  const fiber = getFiberFromHostInstance(el);
  if (!fiber) return null;

  // Strategy 1: async getOwnerStack (React 19 — _debugSource is absent)
  try {
    const frames = await getOwnerStack(fiber);
    if (frames && frames.length > 0) {
      for (const frame of frames) {
        if (!frame.functionName) continue;
        const name = frame.functionName;
        if (name[0] !== name[0].toUpperCase()) continue;
        if (isInternalName(name)) continue;

        const filePath = resolveFrameFilePath(frame.fileName);

        // Skip library components (framer-motion, react-router, etc.)
        if (!filePath || isLibraryPath(filePath) || isLibraryPath(frame.fileName || "")) continue;

        return {
          tagName: el.tagName.toLowerCase(),
          componentName: name,
          filePath,
          lineNumber: frame.lineNumber ?? 0,
          columnNumber: frame.columnNumber ?? 0,
          stack: [],
          boundingRect: el.getBoundingClientRect(),
        };
      }
    }
  } catch {
    // getOwnerStack failed — fall through to fiber walk
  }

  // Strategy 2: synchronous fiber walk fallback (React 18 — uses _debugSource)
  try {
    let current = fiber;
    while (current) {
      if (isCompositeFiber(current)) {
        const name = getDisplayName(current.type);
        const debugSource = current._debugSource || current._debugOwner?._debugSource;

        if (name && name[0] === name[0].toUpperCase() && !isInternalName(name) && debugSource) {
          return {
            tagName: el.tagName.toLowerCase(),
            componentName: name,
            filePath: debugSource.fileName || "",
            lineNumber: debugSource.lineNumber || 0,
            columnNumber: debugSource.columnNumber || 0,
            stack: [],
            boundingRect: el.getBoundingClientRect(),
          };
        }
      }
      if (!current.return) break;
      current = current.return;
    }
  } catch {
    // Fiber resolution can fail
  }
  return null;
}

// --- Double-click handler ---

function handleDblClick(e: MouseEvent): void {
  if (editingElement) {
    commitAndExit();
  }

  let target: HTMLElement | null = null;
  const eventTarget = e.target as HTMLElement;

  if (
    eventTarget instanceof HTMLElement &&
    eventTarget !== document.documentElement &&
    eventTarget !== document.body &&
    !eventTarget.hasAttribute("data-glide-interaction") &&
    !eventTarget.closest("#glide-root")
  ) {
    target = eventTarget;
  } else {
    target = getPageElementAtPoint(e.clientX, e.clientY);
  }

  if (!target) return;
  if (BLOCKED_TAGS.has(target.tagName)) return;
  if (!target.textContent?.trim()) return;

  // Prevent browser's native word selection on double-click
  e.preventDefault();
  enterEditMode(target);
}

// --- Edit lifecycle ---

function enterEditMode(element: HTMLElement): void {
  editingElement = element;

  originalTextContent = element.textContent || "";
  originalInnerHTML = element.innerHTML;
  lastKnownText = originalTextContent;

  // Use the selection system's already-resolved component info (correct for React 19)
  // Falls back to local resolveComponent only if no selection exists
  const selectionInfo = getSelection();
  if (selectionInfo && selectionInfo.filePath) {
    componentInfo = selectionInfo;
    componentInfoPromise = null;
  } else {
    componentInfo = null;
    componentInfoPromise = resolveComponent(element).then((info) => {
      if (editingElement === element) {
        componentInfo = info;
      }
      return info;
    });
  }

  savedOutline = element.style.outline;
  element.style.outline = `2px solid ${COLORS.accent}`;

  element.contentEditable = "true";

  setInteractionPointerEvents(false);

  element.focus();
  // Place cursor at the end of text content
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false); // collapse to end
    sel.addRange(range);
  }

  element.addEventListener("blur", handleBlur);
  element.addEventListener("keydown", handleKeydown);
  element.addEventListener("input", handleInput);
}

function handleInput(): void {
  if (editingElement) {
    lastKnownText = editingElement.textContent || "";
  }
}

function handleBlur(): void {
  commitAndExit();
}

function handleOutsidePointerDown(e: MouseEvent): void {
  if (!editingElement) return;

  const eventTarget = e.target;
  if (
    eventTarget instanceof Node &&
    (eventTarget === editingElement || editingElement.contains(eventTarget))
  ) {
    return;
  }

  const targetElement = eventTarget instanceof HTMLElement ? eventTarget : null;
  if (targetElement?.closest("#glide-root")) {
    commitAndExit();
    return;
  }

  const clickedElement = resolveClickTarget(e);
  if (clickedElement && isValidElement(clickedElement)) {
    e.preventDefault();
    e.stopPropagation();
    commitAndExit({ nextSelection: clickedElement, reselectEditedElement: false });
    return;
  }

  e.preventDefault();
  e.stopPropagation();
  commitAndExit({ clearSelection: true, reselectEditedElement: false });
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    e.preventDefault();
    commitAndExit();
    return;
  }

  if (e.key === "Enter" && editingElement && !isMultiLine(editingElement)) {
    e.preventDefault();
    commitAndExit();
    return;
  }

  e.stopPropagation();
}

function resolveClickTarget(e: MouseEvent): HTMLElement | null {
  const eventTarget = e.target;
  if (
    eventTarget instanceof HTMLElement &&
    eventTarget !== document.documentElement &&
    eventTarget !== document.body &&
    !eventTarget.hasAttribute("data-glide-interaction") &&
    !eventTarget.closest("#glide-root")
  ) {
    return eventTarget;
  }
  return getPageElementAtPoint(e.clientX, e.clientY);
}

function getCaretOffsetWithin(element: HTMLElement): number | undefined {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return undefined;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return undefined;
  if (!element.contains(range.endContainer)) return undefined;

  const prefix = range.cloneRange();
  prefix.selectNodeContents(element);
  prefix.setEnd(range.endContainer, range.endOffset);
  return prefix.toString().length;
}

function createTextAnnotation(
  info: ComponentInfo,
  origText: string,
  newText: string,
  cursorOff: number | undefined,
  origHTML: string,
  element: HTMLElement | null,
): void {
  if (!info.filePath && info.componentName) {
    const cached = getCachedFilePath(info.componentName);
    if (cached) {
      info = { ...info, filePath: cached };
    } else {
      requestFileDiscovery(info.componentName).then((discovered) => {
        if (discovered) setCachedFilePath(info.componentName, discovered);
      });
    }
  }

  const ann: TextEditAnnotation = {
    type: "textEdit",
    id: `text-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    componentName: info.componentName,
    filePath: info.filePath || "",
    lineNumber: info.lineNumber || 0,
    columnNumber: info.columnNumber || 0,
    originalText: origText,
    newText,
    cursorOffset: cursorOff,
  };
  const callSite = info.stack?.find(
    f => f.componentName !== info.componentName && f.filePath
  );
  const identity: ElementIdentity = {
    componentName: info.componentName,
    filePath: info.filePath || "",
    lineNumber: info.lineNumber || 0,
    columnNumber: info.columnNumber || 0,
    tagName: info.tagName,
    callSiteLine: callSite?.lineNumber,
    callSiteCol: callSite?.columnNumber,
  };
  addTextEditAnnotation(ann, identity, origHTML, {
    tagName: element?.tagName.toLowerCase() || info.tagName,
    className: element?.className || undefined,
    parentTagName: element?.parentElement?.tagName.toLowerCase(),
    parentClassName: element?.parentElement?.className || undefined,
  }, element || undefined);
  addChangeEntry({
    type: "textAnnotation",
    componentName: ann.componentName,
    filePath: ann.filePath || "",
    summary: `"${truncate(ann.originalText, 20)}" → "${truncate(ann.newText, 20)}"`,
    state: "pending",
    elementIdentity: identity,
    revertData: {
      type: "annotationRemove",
      annotationId: ann.id,
      originalInnerHTML: origHTML,
      elementIdentity: identity,
    },
  });
}

function commitAndExit(options?: {
  nextSelection?: HTMLElement | null;
  clearSelection?: boolean;
  reselectEditedElement?: boolean;
}): void {
  if (!editingElement) return;

  const newText = lastKnownText;
  const cursorOffset = getCaretOffsetWithin(editingElement);
  const changed = newText !== originalTextContent;

  console.log("[Glide:textEdit] commitAndExit changed:", changed, "componentInfo:", componentInfo?.componentName, "filePath:", componentInfo?.filePath);

  // If resolution is still in flight, wait for it then create the annotation
  if (changed && !componentInfo && componentInfoPromise) {
    const savedElement = editingElement;
    const savedOriginalText = originalTextContent;
    const savedOriginalHTML = originalInnerHTML;
    const savedCursorOffset = cursorOffset;
    const pending = componentInfoPromise;
    componentInfoPromise = null;
    exitEditMode();
    pending.then((resolved) => {
      if (resolved) {
        createTextAnnotation(resolved, savedOriginalText, newText, savedCursorOffset, savedOriginalHTML, savedElement);
      }
    });
    if (options?.nextSelection && document.contains(options.nextSelection)) {
      selectElement(options.nextSelection, { skipSidebar: false });
    } else if (options?.clearSelection) {
      clearSelection();
    } else if (savedElement && document.contains(savedElement)) {
      selectElement(savedElement, { skipSidebar: false });
    }
    return;
  }

  if (changed && componentInfo) {
    createTextAnnotation(componentInfo, originalTextContent, newText, cursorOffset, originalInnerHTML, editingElement);
  }

  const elementToSelect = editingElement;
  exitEditMode();
  if (options?.nextSelection && document.contains(options.nextSelection)) {
    selectElement(options.nextSelection, { skipSidebar: false });
    return;
  }
  if (options?.clearSelection) {
    clearSelection();
    return;
  }
  if (options?.reselectEditedElement === false) {
    return;
  }
  // After exiting edit mode, highlight the edited element as selected
  if (elementToSelect && document.contains(elementToSelect)) {
    selectElement(elementToSelect, { skipSidebar: false });
  }
}

function exitEditMode(): void {
  if (!editingElement) return;

  // Remove listeners BEFORE removeAttribute — removing contenteditable
  // can trigger a synchronous blur event, causing re-entrant commitAndExit
  editingElement.removeEventListener("blur", handleBlur);
  editingElement.removeEventListener("keydown", handleKeydown);
  editingElement.removeEventListener("input", handleInput);

  editingElement.removeAttribute("contenteditable");

  editingElement.style.outline = savedOutline;

  activateInteraction(getActiveTool());

  editingElement = null;
  originalTextContent = "";
  originalInnerHTML = "";
  lastKnownText = "";
  componentInfo = null;
  componentInfoPromise = null;
  savedOutline = "";
}
