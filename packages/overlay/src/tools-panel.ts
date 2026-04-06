// packages/overlay/src/tools-panel.ts
import type { ToolType } from "@react-rewrite/shared";
import { getActiveTool, setActiveTool, getToolOptions, setToolOption } from "./canvas-state.js";
import { getShadowRoot } from "./toolbar.js";
import { COLORS, SHADOWS, RADII, TRANSITIONS, FONT_FAMILY } from "./design-tokens.js";
import { openColorPicker } from "./color-picker.js";
import { toggleCanvasTransform, isCanvasActive } from "./canvas-transform.js";
import { isTextEditing } from "./inline-text-edit.js";
import { getActiveCount, isChangelogOpen, onChangelogChange, setChangelogOpen } from "./changelog.js";

const ICONS = {
  pointer: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13.9093 12.3603L17.0007 20.8537L14.1816 21.8798L11.0902 13.3864L6.91797 16.5422L8.4087 1.63318L19.134 12.0959L13.9093 12.3603Z"></path></svg>`,
  text: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 6V21H11V6H5V4H19V6H13Z"></path></svg>`,
  color: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C10.2 22 8.5 21.5 7 20.6C5.5 19.7 4.3 18.4 3.4 16.9C2.5 15.4 2 13.7 2 12C2 6.47715 6.47715 2 12 2ZM12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C12.5523 20 13 19.5523 13 19C13 18.72 12.89 18.47 12.71 18.29C12.53 18.11 12.42 17.86 12.42 17.58C12.42 17.0277 12.8677 16.58 13.42 16.58H15C18.3137 16.58 21 13.8937 21 10.58C21 6.94 16.9706 4 12 4ZM7.5 10C8.32843 10 9 10.6716 9 11.5C9 12.3284 8.32843 13 7.5 13C6.67157 13 6 12.3284 6 11.5C6 10.6716 6.67157 10 7.5 10ZM10.5 7C11.3284 7 12 7.67157 12 8.5C12 9.32843 11.3284 10 10.5 10C9.67157 10 9 9.32843 9 8.5C9 7.67157 9.67157 7 10.5 7ZM14.5 7C15.3284 7 16 7.67157 16 8.5C16 9.32843 15.3284 10 14.5 10C13.6716 10 13 9.32843 13 8.5C13 7.67157 13.6716 7 14.5 7ZM17.5 10C18.3284 10 19 10.6716 19 11.5C19 12.3284 18.3284 13 17.5 13C16.6716 13 16 12.3284 16 11.5C16 10.6716 16.6716 10 17.5 10Z"></path></svg>`,
  interact: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.4 3C17.7314 3 18 3.26863 18 3.6V5H20.4C20.7314 5 21 5.26863 21 5.6V8H22.4C22.7314 8 23 8.26863 23 8.6V15.4C23 15.7314 22.7314 16 22.4 16H21V18.4C21 18.7314 20.7314 19 20.4 19H18V20.4C18 20.7314 17.7314 21 17.4 21H6.6C6.26863 21 6 20.7314 6 20.4V19H3.6C3.26863 19 3 18.7314 3 18.4V15.6C3 15.2686 3.26863 15 3.6 15H1.6C1.26863 15 1 14.7314 1 14.4V9.6C1 9.26863 1.26863 9 1.6 9H3V5.6C3 5.26863 3.26863 5 3.6 5H6V3.6C6 3.26863 6.26863 3 6.6 3H17.4ZM16 5H8V7H5V9H3V13H5V17H8V19H16V17H19V13H21V10H19V7H16V5ZM13 9V11H15V13H13V15H11V13H9V11H11V9H13Z"></path></svg>`,
  canvas: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM11 13H4V19H11V13ZM20 13H13V19H20V13ZM11 5H4V11H11V5ZM20 5H13V11H20V5Z"></path></svg>`,
  logs: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 6h12"></path><path d="M7 12h12"></path><path d="M7 18h12"></path><path d="M3.5 6h.01"></path><path d="M3.5 12h.01"></path><path d="M3.5 18h.01"></path></svg>`,
  undo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7.18,4,8.6,5.44,6.06,8h9.71a6,6,0,0,1,0,12h-2V18h2a4,4,0,0,0,0-8H6.06L8.6,12.51,7.18,13.92,2.23,9Z"></path></svg>`,
  redo: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.82,4,15.4,5.44,17.94,8H8.23a6,6,0,0,0,0,12h2V18h-2a4,4,0,0,1,0-8H17.94L15.4,12.51l1.42,1.41L21.77,9Z"></path></svg>`,
  reset: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12C22 17.5228 17.5229 22 12 22C6.4772 22 2 17.5228 2 12C2 6.47715 6.4772 2 12 2V4C7.5817 4 4 7.58172 4 12C4 16.4183 7.5817 20 12 20C16.4183 20 20 16.4183 20 12C20 9.53614 18.8862 7.33243 17.1346 5.86492L15 8V2L21 2L18.5535 4.44656C20.6649 6.28002 22 8.9841 22 12Z"></path></svg>`,
  similar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 3H3C2.44772 3 2 3.44772 2 4V8C2 8.55228 2.44772 9 3 9H7C7.55228 9 8 8.55228 8 8V4C8 3.44772 7.55228 3 7 3ZM14 3H10C9.44772 3 9 3.44772 9 4V8C9 8.55228 9.44772 9 10 9H14C14.5523 9 15 8.55228 15 8V4C15 3.44772 14.5523 3 14 3ZM21 3H17C16.4477 3 16 3.44772 16 4V8C16 8.55228 16.4477 9 17 9H21C21.5523 9 22 8.55228 22 8V4C22 3.44772 21.5523 3 21 3ZM7 10H3C2.44772 10 2 10.4477 2 11V15C2 15.5523 2.44772 16 3 16H7C7.55228 16 8 15.5523 8 15V11C8 10.4477 7.55228 10 7 10ZM14 10H10C9.44772 10 9 10.4477 9 11V15C9 15.5523 9.44772 16 10 16H14C14.5523 16 15 15.5523 15 15V11C15 10.4477 14.5523 10 14 10Z"></path></svg>`,
};

const MOD_KEY = navigator.platform.includes("Mac") ? "\u2318" : "Ctrl+";
const MOD_LABEL = navigator.platform.includes("Mac") ? "Cmd" : "Ctrl";

const TOOL_DEFS: Array<{ type: ToolType; icon: string; label: string; shortcut: string }> = [
  { type: "interact", icon: ICONS.interact, label: "Interact", shortcut: "I" },
  { type: "select", icon: ICONS.pointer, label: "Select", shortcut: "S" },
  { type: "text", icon: ICONS.text, label: "Text", shortcut: "T" },
];

const PANEL_STYLES = `
  .tools-panel {
    position: fixed;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    background: ${COLORS.bgPrimary};
    border: 1px solid ${COLORS.border};
    border-radius: ${RADII.lg};
    box-shadow: ${SHADOWS.md};
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px;
    gap: 4px;
    font-family: ${FONT_FAMILY};
    user-select: none;
    opacity: 0;
    animation: panelFadeIn ${TRANSITIONS.settle} forwards;
  }
  @keyframes panelFadeIn {
    to { opacity: 1; }
  }
  .tool-divider {
    width: 16px;
    height: 1px;
    background: ${COLORS.border};
    flex-shrink: 0;
  }
  .tool-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-left: 2px solid transparent;
    color: ${COLORS.textSecondary};
    cursor: pointer;
    border-radius: 50%;
    position: relative;
    padding: 0;
    transition: background ${TRANSITIONS.fast}, color ${TRANSITIONS.fast};
  }
  .tool-btn svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  .tool-btn svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
  .tool-btn:hover {
    background: ${COLORS.bgSecondary};
    color: ${COLORS.textPrimary};
  }
  .tool-btn.active {
    background: ${COLORS.accentSoft};
    color: ${COLORS.accent};
    border-left-color: ${COLORS.accent};
    border-radius: 0 50% 50% 0;
  }
  .tool-btn .tooltip {
    display: none;
    position: absolute;
    left: 44px;
    top: 50%;
    transform: translateY(-50%);
    background: ${COLORS.bgPrimary};
    border: 1px solid ${COLORS.border};
    box-shadow: ${SHADOWS.sm};
    color: ${COLORS.textPrimary};
    padding: 4px 8px;
    border-radius: ${RADII.sm};
    font-size: 12px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity ${TRANSITIONS.medium};
    z-index: 2147483647;
  }
  .tool-btn .tooltip .shortcut-badge {
    display: inline-block;
    background: ${COLORS.bgSecondary};
    color: ${COLORS.textTertiary};
    border-radius: 4px;
    padding: 1px 5px;
    font-size: 11px;
    margin-left: 6px;
  }
  .tool-btn:hover .tooltip {
    display: block;
  }
  .tool-btn.tooltip-visible .tooltip {
    opacity: 1;
  }
  .sub-options {
    width: 100%;
    padding: 4px 0;
    border-top: 1px solid ${COLORS.border};
    border-bottom: 1px solid ${COLORS.border};
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: opacity ${TRANSITIONS.medium};
  }
  .sub-options.visible {
    opacity: 1;
  }
  .sub-options.hidden {
    display: none;
  }
  .color-swatch {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    padding: 0;
    box-shadow: ${SHADOWS.sm};
  }
  .segmented-control {
    display: flex;
    background: ${COLORS.bgSecondary};
    border-radius: 6px;
    padding: 2px;
    width: 100%;
  }
  .segment {
    flex: 1;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: ${COLORS.textSecondary};
    font-size: 10px;
    font-family: ${FONT_FAMILY};
    cursor: pointer;
    padding: 0;
    transition: background ${TRANSITIONS.fast}, color ${TRANSITIONS.fast}, box-shadow ${TRANSITIONS.fast};
  }
  .segment.active {
    background: ${COLORS.bgPrimary};
    color: ${COLORS.textPrimary};
    box-shadow: ${SHADOWS.sm};
  }
  .action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: ${COLORS.textSecondary};
    cursor: pointer;
    border-radius: 50%;
    padding: 0;
    transition: background ${TRANSITIONS.fast}, color ${TRANSITIONS.fast}, opacity ${TRANSITIONS.fast};
  }
  .action-btn svg {
    width: 18px;
    height: 18px;
  }
  .action-btn:hover {
    background: ${COLORS.bgSecondary};
    color: ${COLORS.textPrimary};
  }
  .action-btn.active {
    background: ${COLORS.accentSoft};
    color: ${COLORS.accent};
  }
  .action-btn:disabled {
    opacity: 0.3;
    cursor: default;
    pointer-events: none;
  }
  .action-btn.has-badge {
    position: relative;
  }
  .action-badge {
    position: absolute;
    top: 3px;
    right: 3px;
    min-width: 14px;
    height: 14px;
    padding: 0 4px;
    border-radius: 999px;
    background: ${COLORS.accent};
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    line-height: 14px;
    text-align: center;
    box-sizing: border-box;
    pointer-events: none;
  }
  .action-badge.hidden {
    display: none;
  }
  .action-btn.danger:hover {
    background: ${COLORS.dangerSoft};
    color: ${COLORS.danger};
  }
  .help-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: ${COLORS.textTertiary};
    cursor: pointer;
    border-radius: 50%;
    padding: 0;
    font-size: 14px;
    font-weight: 600;
    font-family: ${FONT_FAMILY};
    transition: background ${TRANSITIONS.fast}, color ${TRANSITIONS.fast};
  }
  .help-btn:hover {
    background: ${COLORS.bgSecondary};
    color: ${COLORS.textPrimary};
  }
  .shortcuts-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.4);
    animation: fadeIn 150ms ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .shortcuts-card {
    background: ${COLORS.bgPrimary};
    border: 1px solid ${COLORS.border};
    border-radius: ${RADII.lg};
    box-shadow: ${SHADOWS.lg};
    padding: 24px 28px;
    min-width: 320px;
    max-width: 420px;
    font-family: ${FONT_FAMILY};
    animation: cardSlide 200ms ease;
  }
  @keyframes cardSlide {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .shortcuts-title {
    font-size: 14px;
    font-weight: 600;
    color: ${COLORS.textPrimary};
    margin: 0 0 16px 0;
  }
  .shortcuts-section {
    margin-bottom: 14px;
  }
  .shortcuts-section-label {
    font-size: 10px;
    font-weight: 600;
    color: ${COLORS.textTertiary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
  }
  .shortcut-action {
    font-size: 12px;
    color: ${COLORS.textPrimary};
  }
  .shortcut-keys {
    display: flex;
    gap: 3px;
    align-items: center;
  }
  .shortcut-key {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    background: ${COLORS.bgSecondary};
    border: 1px solid ${COLORS.border};
    border-radius: 5px;
    font-size: 11px;
    font-family: ${FONT_FAMILY};
    color: ${COLORS.textSecondary};
    box-shadow: 0 1px 0 rgba(0,0,0,0.06);
  }
  .shortcut-plus {
    font-size: 10px;
    color: ${COLORS.textTertiary};
  }
`;

let panelEl: HTMLDivElement | null = null;
let subOptionsEl: HTMLDivElement | null = null;
let toolButtons: Map<ToolType, HTMLButtonElement> = new Map();
let canvasUndoBtn: HTMLButtonElement | null = null;
let canvasRedoBtn: HTMLButtonElement | null = null;
let logsBtn: HTMLButtonElement | null = null;
let logsBadgeEl: HTMLSpanElement | null = null;
let similarBtn: HTMLButtonElement | null = null;
let similarBadgeEl: HTMLSpanElement | null = null;
let onClearAll: (() => void) | null = null;
let onCanvasUndo: (() => void) | null = null;
let onCanvasRedo: (() => void) | null = null;
let onToggleSimilar: (() => boolean) | null = null;
let cleanupChangelogSubscription: (() => void) | null = null;

export function setOnClearAll(fn: () => void): void { onClearAll = fn; }
export function setOnCanvasUndo(fn: () => void): void { onCanvasUndo = fn; }
export function setOnCanvasRedo(fn: () => void): void { onCanvasRedo = fn; }
export function setOnToggleSimilar(fn: () => boolean): void { onToggleSimilar = fn; }

export function updateSimilarBadge(count: number): void {
  if (!similarBadgeEl) return;
  if (count > 0) {
    similarBadgeEl.textContent = String(count);
    similarBadgeEl.classList.remove("hidden");
  } else {
    similarBadgeEl.classList.add("hidden");
  }
}

export function updateSimilarButtonState(enabled: boolean): void {
  if (similarBtn) {
    similarBtn.style.color = enabled ? "rgba(251, 191, 36, 0.9)" : "";
  }
}

export function updateCanvasUndoButton(enabled: boolean): void {
  if (canvasUndoBtn) canvasUndoBtn.disabled = !enabled;
}

export function updateCanvasRedoButton(enabled: boolean): void {
  if (canvasRedoBtn) canvasRedoBtn.disabled = !enabled;
}

function updateLogsButton(): void {
  if (!logsBtn || !logsBadgeEl) return;
  const activeCount = getActiveCount();
  logsBtn.classList.toggle("active", isChangelogOpen());
  logsBadgeEl.classList.toggle("hidden", activeCount === 0);
  logsBadgeEl.textContent = String(activeCount);
}

export function initToolsPanel(): void {
  const shadowRoot = getShadowRoot();
  if (!shadowRoot) return;

  const style = document.createElement("style");
  style.textContent = PANEL_STYLES;
  shadowRoot.appendChild(style);

  panelEl = document.createElement("div");
  panelEl.className = "tools-panel";

  const groups = [
    ["interact", "select", "text"],
  ];

  for (let gi = 0; gi < groups.length; gi++) {
    if (gi > 0) {
      const divider = document.createElement("div");
      divider.className = "tool-divider";
      panelEl.appendChild(divider);
    }
    for (const toolType of groups[gi]) {
      const def = TOOL_DEFS.find(d => d.type === toolType)!;
      const btn = document.createElement("button");
      btn.className = `tool-btn${def.type === "select" ? " active" : ""}`;
      btn.innerHTML = `${def.icon}<span class="tooltip">${def.label}<span class="shortcut-badge">${MOD_KEY}${def.shortcut}</span></span>`;
      btn.addEventListener("click", () => setActiveTool(def.type));

      // 400ms tooltip delay
      let tooltipTimer: ReturnType<typeof setTimeout> | null = null;
      btn.addEventListener("mouseenter", () => {
        tooltipTimer = setTimeout(() => btn.classList.add("tooltip-visible"), 400);
      });
      btn.addEventListener("mouseleave", () => {
        if (tooltipTimer) clearTimeout(tooltipTimer);
        btn.classList.remove("tooltip-visible");
      });

      panelEl.appendChild(btn);
      toolButtons.set(def.type, btn);
    }
  }

  // Sub-options container
  subOptionsEl = document.createElement("div");
  subOptionsEl.className = "sub-options hidden";
  panelEl.appendChild(subOptionsEl);

  // Bottom section: undo + reset
  const bottomDivider = document.createElement("div");
  bottomDivider.className = "tool-divider";
  panelEl.appendChild(bottomDivider);

  canvasUndoBtn = document.createElement("button");
  canvasUndoBtn.className = "action-btn";
  canvasUndoBtn.innerHTML = ICONS.undo;
  canvasUndoBtn.title = "Undo (Ctrl+Z)";
  canvasUndoBtn.disabled = true;
  canvasUndoBtn.addEventListener("click", () => { if (onCanvasUndo) onCanvasUndo(); });
  panelEl.appendChild(canvasUndoBtn);

  canvasRedoBtn = document.createElement("button");
  canvasRedoBtn.className = "action-btn";
  canvasRedoBtn.innerHTML = ICONS.redo;
  canvasRedoBtn.title = "Redo (Ctrl+Shift+Z)";
  canvasRedoBtn.disabled = true;
  canvasRedoBtn.addEventListener("click", () => { if (onCanvasRedo) onCanvasRedo(); });
  panelEl.appendChild(canvasRedoBtn);

  similarBtn = document.createElement("button");
  similarBtn.className = "action-btn has-badge";
  similarBtn.innerHTML = `${ICONS.similar}<span class="action-badge hidden" style="background: rgba(251,191,36,0.9)">0</span>`;
  similarBtn.title = `Similar Highlights (${MOD_LABEL}+Shift+H)`;
  similarBtn.style.color = "rgba(251, 191, 36, 0.9)";
  similarBtn.addEventListener("click", () => {
    if (onToggleSimilar) onToggleSimilar();
  });
  similarBadgeEl = similarBtn.querySelector(".action-badge");
  panelEl.appendChild(similarBtn);

  logsBtn = document.createElement("button");
  logsBtn.className = "action-btn has-badge";
  logsBtn.innerHTML = `${ICONS.logs}<span class="action-badge hidden">0</span>`;
  logsBtn.title = "Logs";
  logsBtn.addEventListener("click", () => {
    setChangelogOpen(!isChangelogOpen());
  });
  logsBadgeEl = logsBtn.querySelector(".action-badge");
  panelEl.appendChild(logsBtn);

  const clearBtn = document.createElement("button");
  clearBtn.className = "action-btn danger";
  clearBtn.innerHTML = ICONS.reset;
  clearBtn.title = "Reset Canvas";
  clearBtn.addEventListener("click", () => { if (onClearAll) onClearAll(); });
  panelEl.appendChild(clearBtn);

  const canvasBtn = document.createElement("button");
  canvasBtn.className = "action-btn";
  canvasBtn.innerHTML = ICONS.canvas;
  canvasBtn.title = "Toggle Infinite Canvas";
  canvasBtn.addEventListener("click", () => {
    toggleCanvasTransform();
    // Visual feedback: toggle active state
    canvasBtn.style.color = isCanvasActive() ? COLORS.accent : "";
  });
  panelEl.appendChild(canvasBtn);

  // Help button — shows keyboard shortcuts
  const helpBtn = document.createElement("button");
  helpBtn.className = "help-btn";
  helpBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 8H14V6.5C14 4.567 15.567 3 17.5 3C19.433 3 21 4.567 21 6.5C21 8.433 19.433 10 17.5 10H16V14H17.5C19.433 14 21 15.567 21 17.5C21 19.433 19.433 21 17.5 21C15.567 21 14 19.433 14 17.5V16H10V17.5C10 19.433 8.433 21 6.5 21C4.567 21 3 19.433 3 17.5C3 15.567 4.567 14 6.5 14H8V10H6.5C4.567 10 3 8.433 3 6.5C3 4.567 4.567 3 6.5 3C8.433 3 10 4.567 10 6.5V8ZM8 8V6.5C8 5.67157 7.32843 5 6.5 5C5.67157 5 5 5.67157 5 6.5C5 7.32843 5.67157 8 6.5 8H8ZM8 16H6.5C5.67157 16 5 16.6716 5 17.5C5 18.3284 5.67157 19 6.5 19C7.32843 19 8 18.3284 8 17.5V16ZM16 8H17.5C18.3284 8 19 7.32843 19 6.5C19 5.67157 18.3284 5 17.5 5C16.6716 5 16 5.67157 16 6.5V8ZM16 16V17.5C16 18.3284 16.6716 19 17.5 19C18.3284 19 19 18.3284 19 17.5C19 16.6716 18.3284 16 17.5 16H16ZM10 10V14H14V10H10Z"></path></svg>`;
  helpBtn.title = `Keyboard Shortcuts (${MOD_KEY}/)`;
  helpBtn.addEventListener("click", () => toggleShortcutsOverlay());
  panelEl.appendChild(helpBtn);

  shadowRoot.appendChild(panelEl);
  document.addEventListener("keydown", handleToolShortcut, true);
  cleanupChangelogSubscription = onChangelogChange(updateLogsButton);
  updateLogsButton();
}

function handleToolShortcut(e: KeyboardEvent): void {
  // Suppress shortcuts when text input is focused
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
  if (isTextEditing()) return;

  // Ctrl/Cmd+Shift+Z → redo
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === "Z") {
    e.preventDefault();
    if (onCanvasRedo) onCanvasRedo();
    return;
  }

  // Ctrl/Cmd+Shift+H → toggle similar highlights
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === "H") {
    e.preventDefault();
    if (onToggleSimilar) onToggleSimilar();
    return;
  }

  // Modifier keys → ignore (let browser handle Cmd+T, Ctrl+V, etc.)
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key.toUpperCase();

  // Toggle shortcuts overlay with ?
  if (e.key === "?") {
    toggleShortcutsOverlay();
    e.preventDefault();
    return;
  }

  const tool = TOOL_DEFS.find(d => d.shortcut === key);
  if (tool) {
    setActiveTool(tool.type);
    e.preventDefault();
  }
}

// ---------------------------------------------------------------------------
// Shortcuts Overlay
// ---------------------------------------------------------------------------

let shortcutsOverlayEl: HTMLDivElement | null = null;
let shortcutsKeyHandler: ((e: KeyboardEvent) => void) | null = null;

function toggleShortcutsOverlay(): void {
  if (shortcutsOverlayEl) {
    closeShortcutsOverlay();
  } else {
    openShortcutsOverlay();
  }
}

function openShortcutsOverlay(): void {
  const shadowRoot = getShadowRoot();
  if (!shadowRoot || shortcutsOverlayEl) return;

  shortcutsOverlayEl = document.createElement("div");
  shortcutsOverlayEl.className = "shortcuts-overlay";

  const card = document.createElement("div");
  card.className = "shortcuts-card";

  const title = document.createElement("div");
  title.className = "shortcuts-title";
  title.textContent = "Keyboard Shortcuts";
  card.appendChild(title);

  const sections: Array<{ label: string; items: Array<{ action: string; keys: string[] }> }> = [
    {
      label: "Tools",
      items: TOOL_DEFS.map(d => ({
        action: d.label,
        keys: [d.shortcut],
      })),
    },
    {
      label: "Actions",
      items: [
        { action: "Undo", keys: [MOD_LABEL, "Z"] },
        { action: "Redo", keys: [MOD_LABEL, "Shift", "Z"] },
        { action: "Similar Highlights", keys: [MOD_LABEL, "Shift", "H"] },
        { action: "Toggle Logs", keys: [MOD_LABEL, "Shift", "L"] },
        { action: "Keyboard Shortcuts", keys: ["?"] },
        { action: "Cancel / Deselect", keys: ["Esc"] },
        { action: "Interact with App", keys: ["I"] },
      ],
    },
    {
      label: "Canvas",
      items: [
        { action: "Pan", keys: ["Space", "Drag"] },
        { action: "Zoom", keys: [MOD_LABEL, "Scroll"] },
      ],
    },
  ];

  for (const section of sections) {
    const sectionEl = document.createElement("div");
    sectionEl.className = "shortcuts-section";

    const labelEl = document.createElement("div");
    labelEl.className = "shortcuts-section-label";
    labelEl.textContent = section.label;
    sectionEl.appendChild(labelEl);

    for (const item of section.items) {
      const row = document.createElement("div");
      row.className = "shortcut-row";

      const action = document.createElement("span");
      action.className = "shortcut-action";
      action.textContent = item.action;
      row.appendChild(action);

      const keysWrap = document.createElement("span");
      keysWrap.className = "shortcut-keys";
      for (let i = 0; i < item.keys.length; i++) {
        if (i > 0) {
          const plus = document.createElement("span");
          plus.className = "shortcut-plus";
          plus.textContent = "+";
          keysWrap.appendChild(plus);
        }
        const key = document.createElement("span");
        key.className = "shortcut-key";
        key.textContent = item.keys[i];
        keysWrap.appendChild(key);
      }
      row.appendChild(keysWrap);

      sectionEl.appendChild(row);
    }

    card.appendChild(sectionEl);
  }

  shortcutsOverlayEl.appendChild(card);

  // Close on backdrop click
  shortcutsOverlayEl.addEventListener("click", (e) => {
    if (e.target === shortcutsOverlayEl) closeShortcutsOverlay();
  });

  shadowRoot.appendChild(shortcutsOverlayEl);

  // Dismiss on any keypress
  shortcutsKeyHandler = (e: KeyboardEvent) => {
    closeShortcutsOverlay();
    // Don't prevent the key from also triggering its shortcut
  };
  document.addEventListener("keydown", shortcutsKeyHandler, true);
}

function closeShortcutsOverlay(): void {
  if (shortcutsKeyHandler) {
    document.removeEventListener("keydown", shortcutsKeyHandler, true);
    shortcutsKeyHandler = null;
  }
  shortcutsOverlayEl?.remove();
  shortcutsOverlayEl = null;
}

export function updateActiveToolUI(tool: ToolType): void {
  for (const [type, btn] of toolButtons) {
    btn.classList.toggle("active", type === tool);
  }
  updateSubOptions(tool);
}

function updateSubOptions(tool: ToolType): void {
  if (!subOptionsEl) return;
  subOptionsEl.innerHTML = "";
  subOptionsEl.classList.add("hidden");
  subOptionsEl.classList.remove("visible");

  if (tool === "text") {
    subOptionsEl.classList.remove("hidden");
    requestAnimationFrame(() => subOptionsEl?.classList.add("visible"));
    const opts = getToolOptions();

    // Color swatch
    const swatch = document.createElement("button");
    swatch.className = "color-swatch";
    swatch.style.background = opts.textColor;
    swatch.addEventListener("click", () => {
      const rect = swatch.getBoundingClientRect();
      openColorPicker({
        initialColor: opts.textColor,
        position: { x: rect.right + 8, y: rect.top },
        showPropertyToggle: false,
        onColorChange(hex) {
          setToolOption("textColor", hex);
          swatch.style.background = hex;
        },
        onClose() {},
      });
    });
    subOptionsEl.appendChild(swatch);

    // Segmented control for font sizes
    const segmented = document.createElement("div");
    segmented.className = "segmented-control";
    for (const size of [12, 16, 20, 24]) {
      const seg = document.createElement("button");
      seg.className = `segment${size === opts.fontSize ? " active" : ""}`;
      seg.textContent = `${size}`;
      seg.addEventListener("click", () => {
        setToolOption("fontSize", size);
        segmented.querySelectorAll(".segment").forEach(s => s.classList.remove("active"));
        seg.classList.add("active");
      });
      segmented.appendChild(seg);
    }
    subOptionsEl.appendChild(segmented);
  }
}

export function flashToolButton(tool: ToolType): void {
  const btn = toolButtons.get(tool);
  if (!btn) return;
  btn.style.backgroundColor = COLORS.accentSoft;
  btn.style.transition = `background-color 300ms ease`;
  setTimeout(() => {
    btn.style.backgroundColor = "";
    btn.style.transition = "";
  }, 300);
}

export function hideToolsPanel(): void {
  if (panelEl) panelEl.style.display = "none";
}

export function showToolsPanel(): void {
  if (panelEl) panelEl.style.display = "";
}

export function destroyToolsPanel(): void {
  document.removeEventListener("keydown", handleToolShortcut, true);
  cleanupChangelogSubscription?.();
  cleanupChangelogSubscription = null;
  closeShortcutsOverlay();
  panelEl?.remove();
  panelEl = null;
  subOptionsEl = null;
  canvasUndoBtn = null;
  canvasRedoBtn = null;
  similarBtn = null;
  similarBadgeEl = null;
  logsBtn = null;
  logsBadgeEl = null;
  toolButtons.clear();
}
