import {
  getFiberFromHostInstance,
  getDisplayName,
  isCompositeFiber,
  isInstrumentationActive,
  instrument,
} from "bippy";
import { getOwnerStack } from "bippy/source";
import { resolveFrameFilePath } from "../utils/source-resolve.js";
import { isInternalName } from "../utils/component-filter.js";
import { buildJSXPath } from "../utils/jsx-path.js";
import type { FrameworkAdapter, ResolvedComponent } from "./types.js";

export class ReactAdapter implements FrameworkAdapter {
  name = "react";

  init(): void {
    if (!isInstrumentationActive()) {
      instrument({
        onCommitFiberRoot() {},
      });
    }
  }

  async resolveComponent(el: HTMLElement): Promise<ResolvedComponent | null> {
    const fiber = getFiberFromHostInstance(el);
    if (!fiber) return null;

    try {
      const frames = await getOwnerStack(fiber);
      if (frames && frames.length > 0) {
        const stack: ResolvedComponent["stack"] = [];
        for (const frame of frames) {
          if (!frame.functionName) continue;
          const name = frame.functionName;
          if (name[0] !== name[0].toUpperCase()) continue;
          if (isInternalName(name)) continue;

          const filePath = resolveFrameFilePath(frame.fileName);
          stack.push({
            componentName: name,
            filePath,
            lineNumber: frame.lineNumber ?? 0,
            columnNumber: frame.columnNumber ?? 0,
          });
        }

        if (stack.length > 0) {
          const primary = stack.find((f) => f.filePath) || stack[0];
          const result: ResolvedComponent = {
            tagName: el.tagName.toLowerCase(),
            componentName: primary.componentName,
            filePath: primary.filePath,
            lineNumber: primary.lineNumber,
            columnNumber: primary.columnNumber,
            stack,
          };
          result.jsxPath =
            buildJSXPath(el, primary.filePath, primary.componentName) ??
            undefined;
          return result;
        }
      }
    } catch (err) {
      console.warn(
        "[Glide] getOwnerStack failed, falling back to fiber walk:",
        err,
      );
    }

    return this.resolveFromFiberWalk(el, fiber);
  }

  resolveComponentSync(el: HTMLElement): ResolvedComponent | null {
    const fiber = getFiberFromHostInstance(el);
    if (!fiber) return null;
    return this.resolveFromFiberWalk(el, fiber);
  }

  buildStructuralPath(
    element: HTMLElement,
    filePath: string,
    componentName: string,
  ) {
    return buildJSXPath(element, filePath, componentName);
  }

  private resolveFromFiberWalk(
    el: HTMLElement,
    fiber: any,
  ): ResolvedComponent | null {
    const stack: ResolvedComponent["stack"] = [];
    let current = fiber;

    while (current) {
      if (isCompositeFiber(current)) {
        const name = getDisplayName(current.type);
        const debugSource =
          current._debugSource || current._debugOwner?._debugSource;

        let filePath = "";
        let lineNumber = 0;
        let columnNumber = 0;

        if (debugSource) {
          filePath = debugSource.fileName || "";
          lineNumber = debugSource.lineNumber || 0;
          columnNumber = debugSource.columnNumber || 0;
        }

        if (
          name &&
          name[0] === name[0].toUpperCase() &&
          !isInternalName(name)
        ) {
          stack.push({ componentName: name, filePath, lineNumber, columnNumber });
        }
      }
      current = current.return;
    }

    if (stack.length === 0) return null;

    const result: ResolvedComponent = {
      tagName: el.tagName.toLowerCase(),
      componentName: stack[0].componentName,
      filePath: stack[0].filePath,
      lineNumber: stack[0].lineNumber,
      columnNumber: stack[0].columnNumber,
      stack,
    };
    result.jsxPath =
      buildJSXPath(el, stack[0].filePath, stack[0].componentName) ?? undefined;
    return result;
  }
}
