/**
 * Vue SFC transform engine.
 *
 * Parses .vue Single File Components, locates elements in the <template> block,
 * and mutates class attributes and text content using string-level manipulation
 * (preserving formatting better than full AST serialization).
 *
 * Strategy: We use regex-based parsing to locate the <template> section,
 * then use a lightweight HTML parser to find and modify specific elements.
 * This avoids depending on @vue/compiler-sfc at runtime (which is heavy)
 * while still handling the most common patterns.
 */

import * as fs from "node:fs";
import type { ClassNameUpdate } from "./transform.js";
import { logger } from "./logger.js";

// ── SFC section extraction ──────────────────────────────────────────────

interface SFCSection {
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
  content: string;
}

export function extractTemplateSection(source: string): SFCSection | null {
  const openMatch = source.match(/<template(\s[^>]*)?>[\r\n]?/);
  if (!openMatch || openMatch.index == null) return null;

  const contentStart = openMatch.index + openMatch[0].length;
  const closeMatch = source.indexOf("</template>", contentStart);
  if (closeMatch === -1) return null;

  return {
    start: openMatch.index,
    end: closeMatch + "</template>".length,
    contentStart,
    contentEnd: closeMatch,
    content: source.slice(contentStart, closeMatch),
  };
}

// ── Element finding in template HTML ────────────────────────────────────

export interface TemplateElement {
  tagName: string;
  /** Absolute offset in the full SFC source where the opening tag starts */
  offset: number;
  /** Line number (1-based) in the full SFC source */
  line: number;
  /** Column number (0-based) in the full SFC source */
  col: number;
  /** The full opening tag string (e.g., `<div class="foo" :class="bar">`) */
  openingTag: string;
  /** Offset of opening tag end (after >) */
  openingTagEnd: number;
  /** Offset of closing tag start (before </), or same as openingTagEnd for self-closing */
  closingTagStart: number;
  /** Inner HTML between opening and closing tags */
  innerHTML: string;
  /** Static class attribute value */
  staticClass: string;
  /** All attributes as raw strings */
  attributes: Array<{ name: string; value: string; offset: number }>;
}

/**
 * Find all elements in template HTML content.
 * Returns elements with their positions relative to the full SFC source.
 */
export function findTemplateElements(
  templateContent: string,
  templateOffset: number,
  source: string,
): TemplateElement[] {
  const elements: TemplateElement[] = [];
  const tagPattern = /<([a-zA-Z][\w.-]*)((?:\s+[^>]*?)?)(\s*\/?>)/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(templateContent)) !== null) {
    const tagName = match[1];
    const attrsStr = match[2];
    const closing = match[3];
    const offset = templateOffset + match.index;
    const isSelfClosing = closing.trimEnd().endsWith("/>");

    // Calculate line/col from absolute offset
    const { line, col } = getLineCol(source, offset);

    // Parse attributes
    const attributes = parseAttributes(attrsStr, offset + tagName.length + 1);

    // Extract static class
    const classAttr = attributes.find((a) => a.name === "class");
    const staticClass = classAttr?.value ?? "";

    const openingTagEnd = offset + match[0].length;

    let closingTagStart = openingTagEnd;
    let innerHTML = "";

    if (!isSelfClosing) {
      // Find matching closing tag (simple, non-nested approach for common cases)
      const closePattern = new RegExp(`</${tagName}\\s*>`, "g");
      closePattern.lastIndex = match.index + match[0].length;
      let depth = 1;
      const reopenPattern = new RegExp(`<${tagName}(?:\\s|>|/>)`, "g");
      reopenPattern.lastIndex = match.index + match[0].length;

      // Simple heuristic: find the closing tag at the same depth
      const restContent = templateContent.slice(match.index + match[0].length);
      const closeIdx = findMatchingClose(restContent, tagName);
      if (closeIdx !== -1) {
        closingTagStart = templateOffset + match.index + match[0].length + closeIdx;
        innerHTML = templateContent.slice(
          match.index + match[0].length,
          match.index + match[0].length + closeIdx,
        );
      }
    }

    elements.push({
      tagName,
      offset,
      line,
      col,
      openingTag: match[0],
      openingTagEnd,
      closingTagStart,
      innerHTML,
      staticClass,
      attributes,
    });
  }

  return elements;
}

function findMatchingClose(html: string, tagName: string): number {
  const openRe = new RegExp(`<${tagName}(?:\\s|>)`, "gi");
  const closeRe = new RegExp(`</${tagName}\\s*>`, "gi");
  let depth = 1;
  let pos = 0;

  while (pos < html.length && depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;

    const openMatch = openRe.exec(html);
    const closeMatch = closeRe.exec(html);

    if (!closeMatch) return -1;

    if (openMatch && openMatch.index < closeMatch.index) {
      depth++;
      pos = openMatch.index + openMatch[0].length;
    } else {
      depth--;
      if (depth === 0) return closeMatch.index;
      pos = closeMatch.index + closeMatch[0].length;
    }
  }

  return -1;
}

function getLineCol(
  source: string,
  offset: number,
): { line: number; col: number } {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }
  return { line, col: offset - lastNewline - 1 };
}

function parseAttributes(
  attrsStr: string,
  baseOffset: number,
): TemplateElement["attributes"] {
  const attrs: TemplateElement["attributes"] = [];
  const attrPattern =
    /([:\w@.-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(attrsStr)) !== null) {
    attrs.push({
      name: match[1],
      value: match[2] ?? match[3] ?? match[4] ?? "",
      offset: baseOffset + match.index,
    });
  }

  return attrs;
}

// ── Class mutation for Vue templates ────────────────────────────────────

function classMatchesPrefix(cls: string, prefix: string, breakpoint?: string): boolean {
  if (breakpoint) {
    const bpPrefix = `${breakpoint}:${prefix}`;
    if (cls === bpPrefix) return true;
    return cls.startsWith(`${bpPrefix}-`);
  }
  if (cls.includes(":")) return false;
  if (cls === prefix) return true;
  return cls.startsWith(`${prefix}-`);
}

function buildClass(update: ClassNameUpdate): string {
  const bp = update.breakpoint ? `${update.breakpoint}:` : "";
  if (update.standalone) {
    return `${bp}${update.tailwindToken ?? `${update.tailwindPrefix}-[${update.value}]`}`;
  }
  return update.tailwindToken
    ? `${bp}${update.tailwindPrefix}-${update.tailwindToken}`
    : `${bp}${update.tailwindPrefix}-[${update.value}]`;
}

function updateClassString(classStr: string, updates: ClassNameUpdate[]): string {
  let classes = classStr.split(/\s+/).filter(Boolean);
  for (const update of updates) {
    const newClass = buildClass(update);
    const bp = update.breakpoint;
    const directIdx = classes.findIndex((c) => {
      if (update.classPattern) {
        const pattern = bp ? `^${bp}:${update.classPattern.slice(1)}` : update.classPattern;
        return new RegExp(pattern).test(c);
      }
      return classMatchesPrefix(c, update.tailwindPrefix, bp);
    });
    if (directIdx !== -1) {
      classes[directIdx] = newClass;
    } else {
      classes.push(newClass);
    }
  }
  return classes.join(" ");
}

/**
 * Mutate the class attribute of a Vue template element.
 * Works by string replacement in the source — preserves formatting.
 *
 * Handles:
 * - class="static classes"
 * - No class attribute (adds one)
 *
 * Returns the modified source string.
 */
export function mutateVueClass(
  source: string,
  element: TemplateElement,
  updates: ClassNameUpdate[],
): string {
  const classAttr = element.attributes.find((a) => a.name === "class");

  if (classAttr) {
    // Update existing class attribute
    const oldValue = classAttr.value;
    const newValue = updateClassString(oldValue, updates);

    // Find the exact class="..." in the opening tag and replace
    const openingTag = element.openingTag;
    const classPattern = /\bclass\s*=\s*"([^"]*)"/;
    const classMatch = openingTag.match(classPattern);

    if (classMatch) {
      const newTag = openingTag.replace(
        classPattern,
        `class="${newValue}"`,
      );
      return (
        source.slice(0, element.offset) +
        newTag +
        source.slice(element.offset + openingTag.length)
      );
    }

    // Try single quotes
    const classPatternSingle = /\bclass\s*=\s*'([^']*)'/;
    const classMatchSingle = openingTag.match(classPatternSingle);
    if (classMatchSingle) {
      const newTag = openingTag.replace(
        classPatternSingle,
        `class="${newValue}"`,
      );
      return (
        source.slice(0, element.offset) +
        newTag +
        source.slice(element.offset + openingTag.length)
      );
    }
  }

  // No class attribute — add one
  const allClasses = updates.map(buildClass).join(" ");
  const insertPos = element.offset + element.tagName.length + 1; // After <tagName
  return (
    source.slice(0, insertPos) +
    ` class="${allClasses}"` +
    source.slice(insertPos)
  );
}

// ── Inline style mutation for Vue/Angular templates ─────────────────────

/**
 * Set or update a CSS property in an element's inline `style` attribute.
 * Handles merging with existing styles and adding the attribute if absent.
 */
export function mutateTemplateInlineStyle(
  source: string,
  element: TemplateElement,
  property: string,
  value: string,
): string {
  const styleAttr = element.attributes.find((a) => a.name === "style" || a.name === "[style]");
  const openingTag = element.openingTag;

  if (styleAttr && styleAttr.name === "style") {
    const oldStyles = styleAttr.value;
    const newStyles = upsertCssProperty(oldStyles, property, value);

    const stylePattern = /\bstyle\s*=\s*"([^"]*)"/;
    const styleMatch = openingTag.match(stylePattern);
    if (styleMatch) {
      const newTag = openingTag.replace(stylePattern, `style="${newStyles}"`);
      return source.slice(0, element.offset) + newTag + source.slice(element.offset + openingTag.length);
    }

    const stylePatternSingle = /\bstyle\s*=\s*'([^']*)'/;
    const styleMatchSingle = openingTag.match(stylePatternSingle);
    if (styleMatchSingle) {
      const newTag = openingTag.replace(stylePatternSingle, `style="${newStyles}"`);
      return source.slice(0, element.offset) + newTag + source.slice(element.offset + openingTag.length);
    }
  }

  // No style attribute — add one
  const insertPos = element.offset + element.tagName.length + 1;
  return (
    source.slice(0, insertPos) +
    ` style="${property}: ${value}"` +
    source.slice(insertPos)
  );
}

function upsertCssProperty(styleStr: string, property: string, value: string): string {
  const parts = styleStr.split(";").map((s) => s.trim()).filter(Boolean);
  let found = false;
  const updated = parts.map((part) => {
    const [prop] = part.split(":").map((s) => s.trim());
    if (prop === property) {
      found = true;
      return `${property}: ${value}`;
    }
    return part;
  });
  if (!found) updated.push(`${property}: ${value}`);
  return updated.join("; ");
}

/**
 * Parse an existing CSS transform string to extract the current translateX/Y value in px.
 */
export function parseTransformTranslate(transformStr: string, axis: "x" | "y"): number {
  const fnName = axis === "x" ? "translateX" : "translateY";
  const re = new RegExp(`${fnName}\\((-?[\\d.]+)px\\)`);
  const m = transformStr.match(re);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Set translateX/Y in a CSS transform string, preserving other transform functions.
 */
export function setTransformTranslate(transformStr: string, axis: "x" | "y", px: number): string {
  const fnName = axis === "x" ? "translateX" : "translateY";
  const newFn = `${fnName}(${Math.round(px)}px)`;
  const re = new RegExp(`${fnName}\\(-?[\\d.]+px\\)`);

  if (re.test(transformStr)) {
    if (Math.abs(px) < 0.5) {
      // Remove the translate entirely
      let result = transformStr.replace(re, "").trim();
      result = result.replace(/\s{2,}/g, " ");
      return result;
    }
    return transformStr.replace(re, newFn);
  }

  if (Math.abs(px) < 0.5) return transformStr;
  return transformStr ? `${transformStr} ${newFn}` : newFn;
}

// ── Text mutation for Vue templates ─────────────────────────────────────

/**
 * Replace text content of an element in a Vue template.
 * Finds the element by tag + line/col, then replaces text between opening and closing tags.
 */
export function mutateVueText(
  source: string,
  element: TemplateElement,
  originalText: string,
  newText: string,
): string {
  const innerHTML = element.innerHTML;
  if (!innerHTML) return source;

  // Try exact match
  const trimmed = innerHTML.trim();
  if (normalizeWs(trimmed) === normalizeWs(originalText.trim())) {
    // Replace while preserving leading/trailing whitespace
    const idx = innerHTML.indexOf(trimmed);
    const prefix = innerHTML.slice(0, idx);
    const suffix = innerHTML.slice(idx + trimmed.length);
    const newInner = prefix + newText + suffix;

    return (
      source.slice(0, element.openingTagEnd) +
      newInner +
      source.slice(element.closingTagStart)
    );
  }

  // Try substring match
  if (innerHTML.includes(originalText)) {
    const newInner = innerHTML.replace(originalText, newText);
    return (
      source.slice(0, element.openingTagEnd) +
      newInner +
      source.slice(element.closingTagStart)
    );
  }

  // Whitespace-flexible match
  const flexPattern = originalText
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  const flexRe = new RegExp(flexPattern);
  const flexMatch = innerHTML.match(flexRe);
  if (flexMatch) {
    const newInner = innerHTML.replace(flexRe, newText);
    return (
      source.slice(0, element.openingTagEnd) +
      newInner +
      source.slice(element.closingTagStart)
    );
  }

  return source;
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ");
}

// ── Template duplication ─────────────────────────────────────────────────

/**
 * Duplicate a template element by line number — inserts a copy of the
 * full element (opening through closing tag) immediately after the original.
 */
export function duplicateTemplateElement(
  source: string,
  elements: TemplateElement[],
  targetLine: number,
): string {
  const target = elements.find(e => e.line === targetLine);
  if (!target) throw new Error(`No element found at line ${targetLine}`);

  const closeTag = `</${target.tagName}>`;
  let elementEnd: number;
  if (target.closingTagStart > target.openingTagEnd) {
    const closePos = source.indexOf(closeTag, target.closingTagStart);
    elementEnd = closePos !== -1 ? closePos + closeTag.length : target.openingTagEnd;
  } else {
    elementEnd = target.openingTagEnd;
  }

  const elementSource = source.slice(target.offset, elementEnd);

  // Detect indentation
  const beforeEl = source.slice(Math.max(0, target.offset - 200), target.offset);
  const indentMatch = beforeEl.match(/(\n[ \t]*)$/);
  const indent = indentMatch ? indentMatch[1] : "\n";

  return source.slice(0, elementEnd) + indent + elementSource + source.slice(elementEnd);
}

// ── Template reorder ────────────────────────────────────────────────────

/**
 * Reorder two sibling elements in a template by moving the element at
 * `fromLine` to just before the element at `toLine`.
 * Works by extracting the full source range (opening through closing tag)
 * and reinserting it at the target position.
 */
export function mutateTemplateReorder(
  source: string,
  elements: TemplateElement[],
  fromLine: number,
  toLine: number,
): string {
  const fromEl = elements.find(e => e.line === fromLine);
  const toEl = elements.find(e => e.line === toLine);

  if (!fromEl) throw new Error(`No element found at line ${fromLine}`);
  if (!toEl) throw new Error(`No element found at line ${toLine}`);

  // Calculate end positions (closing tag end)
  const fromStart = fromEl.offset;
  const fromCloseTag = `</${fromEl.tagName}>`;
  let fromEnd: number;
  if (fromEl.closingTagStart > fromEl.openingTagEnd) {
    const closePos = source.indexOf(fromCloseTag, fromEl.closingTagStart);
    fromEnd = closePos !== -1 ? closePos + fromCloseTag.length : fromEl.openingTagEnd;
  } else {
    fromEnd = fromEl.openingTagEnd;
  }

  const toStart = toEl.offset;

  // Include leading whitespace/newline for the moved block
  let extractStart = fromStart;
  const beforeFrom = source.slice(Math.max(0, fromStart - 200), fromStart);
  const leadingWsMatch = beforeFrom.match(/(\s*?)$/);
  if (leadingWsMatch && leadingWsMatch[1].includes("\n")) {
    extractStart = fromStart - leadingWsMatch[1].length;
  }

  const extracted = source.slice(extractStart, fromEnd);

  // Remove the source element first
  let result = source.slice(0, extractStart) + source.slice(fromEnd);

  // Adjust target offset if it comes after the removal
  let adjustedToStart = toStart;
  if (toStart > fromEnd) {
    adjustedToStart -= (fromEnd - extractStart);
  } else if (toStart > extractStart) {
    throw new Error("Cannot reorder overlapping elements");
  }

  // Get indentation from the target element for consistent formatting
  const beforeTo = result.slice(Math.max(0, adjustedToStart - 200), adjustedToStart);
  const toIndentMatch = beforeTo.match(/(\n[ \t]*)$/);
  const indent = toIndentMatch ? toIndentMatch[1] : "\n";

  // Trim the extracted block and re-indent
  const trimmedExtracted = extracted.trim();

  // Insert before the target element
  result = result.slice(0, adjustedToStart) +
    trimmedExtracted + indent +
    result.slice(adjustedToStart);

  return result;
}

// ── Element resolution ──────────────────────────────────────────────────

/**
 * Find a template element by tag name + hints (className, nthOfType, id).
 */
export function findVueElement(
  elements: TemplateElement[],
  tagName: string,
  hints: {
    className?: string;
    nthOfType?: number;
    id?: string;
    line?: number;
    col?: number;
  },
): TemplateElement | null {
  // Filter by tag name
  const candidates = elements.filter(
    (e) => e.tagName.toLowerCase() === tagName.toLowerCase(),
  );

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Try ID
  if (hints.id) {
    const byId = candidates.find((e) =>
      e.attributes.some((a) => a.name === "id" && a.value === hints.id),
    );
    if (byId) return byId;
  }

  // Try className overlap
  if (hints.className) {
    const domClasses = hints.className.split(/\s+/).filter(Boolean);
    let bestMatch: TemplateElement | null = null;
    let bestOverlap = 0;

    for (const candidate of candidates) {
      const astClasses = candidate.staticClass.split(/\s+/).filter(Boolean);
      if (astClasses.length === 0) continue;

      const overlap =
        astClasses.filter((c) => domClasses.includes(c)).length /
        Math.max(astClasses.length, domClasses.length);

      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestMatch = candidate;
      }
    }

    if (bestMatch && bestOverlap >= 0.3) return bestMatch;
  }

  // Try nthOfType
  if (hints.nthOfType != null && hints.nthOfType < candidates.length) {
    return candidates[hints.nthOfType];
  }

  // Only return the first candidate if there's exactly one; otherwise we can't
  // confidently identify the target and should fail rather than modify the wrong element
  return null;
}

// ── High-level SFC transform entry points ───────────────────────────────

export function isVueSFC(filePath: string): boolean {
  return filePath.endsWith(".vue");
}

export function vueSFCUpdateClass(
  filePath: string,
  tagName: string,
  updates: ClassNameUpdate[],
  hints: { className?: string; nthOfType?: number; id?: string },
): string {
  const source = fs.readFileSync(filePath, "utf-8");
  const template = extractTemplateSection(source);
  if (!template) throw new Error("No <template> section found in Vue SFC");

  const elements = findTemplateElements(
    template.content,
    template.contentStart,
    source,
  );
  const target = findVueElement(elements, tagName, hints);
  if (!target)
    throw new Error(
      `No <${tagName}> element found in template${hints.className ? ` (class="${hints.className}")` : ""}`,
    );

  return mutateVueClass(source, target, updates);
}

export function vueSFCUpdateText(
  filePath: string,
  tagName: string,
  originalText: string,
  newText: string,
  hints: { className?: string; nthOfType?: number; id?: string },
): string {
  const source = fs.readFileSync(filePath, "utf-8");
  const template = extractTemplateSection(source);
  if (!template) throw new Error("No <template> section found in Vue SFC");

  const elements = findTemplateElements(
    template.content,
    template.contentStart,
    source,
  );
  const target = findVueElement(elements, tagName, hints);
  if (!target) throw new Error(`No <${tagName}> element found in template`);

  return mutateVueText(source, target, originalText, newText);
}
