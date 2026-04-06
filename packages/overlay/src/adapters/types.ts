import type { JSXStructuralPath } from "@react-rewrite/shared";

export interface ResolvedComponent {
  tagName: string;
  componentName: string;
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  stack: Array<{
    componentName: string;
    filePath: string;
    lineNumber: number;
    columnNumber: number;
  }>;
  jsxPath?: JSXStructuralPath;
}

export interface FrameworkAdapter {
  /** Human-readable name for logging */
  name: string;

  /** Initialize the adapter (called once at overlay startup) */
  init(): void;

  /**
   * Resolve component info from a DOM element.
   * Async to support source map symbolication in React 19.
   */
  resolveComponent(el: HTMLElement): Promise<ResolvedComponent | null>;

  /**
   * Synchronous-only resolve for hover labels and marquee (fast path).
   * May return less info than resolveComponent.
   */
  resolveComponentSync(el: HTMLElement): ResolvedComponent | null;

  /**
   * Build a structural path from a DOM element up to its owning component.
   * Used for deterministic node identity across file edits.
   */
  buildStructuralPath(
    element: HTMLElement,
    filePath: string,
    componentName: string,
  ): JSXStructuralPath | null;
}
