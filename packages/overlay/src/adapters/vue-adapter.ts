import type { JSXStructuralPath, JSXPathSegment } from "@react-rewrite/shared";
import type { FrameworkAdapter, ResolvedComponent } from "./types.js";
import { extractFilePath } from "../utils/source-resolve.js";

/**
 * Vue 3 runtime introspection adapter.
 *
 * Vue 3 in dev mode annotates DOM elements with `__vueParentComponent`
 * (the component instance that owns the element). Component instances
 * expose `type.__file` with the SFC source path, and `type.__name` or
 * `type.name` for the component name.
 *
 * Vite's Vue plugin emits `__file` on all components in dev mode.
 */

const HTML_TAGS = new Set([
  "a","abbr","address","area","article","aside","audio","b","base","bdi","bdo",
  "blockquote","body","br","button","canvas","caption","cite","code","col",
  "colgroup","data","datalist","dd","del","details","dfn","dialog","div","dl",
  "dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2",
  "h3","h4","h5","h6","head","header","hgroup","hr","html","i","iframe","img",
  "input","ins","kbd","label","legend","li","link","main","map","mark","menu",
  "meta","meter","nav","noscript","object","ol","optgroup","option","output","p",
  "picture","pre","progress","q","rp","rt","ruby","s","samp","script","search",
  "section","select","slot","small","source","span","strong","sub","summary",
  "sup","table","tbody","td","template","textarea","tfoot","th","thead","time",
  "title","tr","track","u","ul","var","video","wbr",
]);

function getVueInstance(el: any): any {
  // Vue 3 attaches __vueParentComponent to DOM elements in dev mode
  return el.__vueParentComponent ?? null;
}

function getComponentName(instance: any): string {
  if (!instance?.type) return "";
  return (
    instance.type.__name ||
    instance.type.name ||
    instance.type.__file?.match(/([^/\\]+)\.vue$/)?.[1] ||
    ""
  );
}

function getComponentFile(instance: any): string {
  if (!instance?.type) return "";
  const raw = instance.type.__file || "";
  if (!raw) return "";
  return extractFilePath(raw);
}

function isUserComponent(name: string): boolean {
  if (!name) return false;
  if (name[0] !== name[0].toUpperCase()) return false;
  const internals = new Set([
    "Transition", "TransitionGroup", "KeepAlive", "Teleport",
    "Suspense", "Fragment", "BaseTransition",
  ]);
  return !internals.has(name);
}

function buildComponentStack(instance: any): ResolvedComponent["stack"] {
  const stack: ResolvedComponent["stack"] = [];
  let current = instance;

  while (current) {
    const name = getComponentName(current);
    if (name && isUserComponent(name)) {
      const filePath = getComponentFile(current);
      stack.push({
        componentName: name,
        filePath,
        lineNumber: 0,
        columnNumber: 0,
      });
    }
    current = current.parent;
  }

  return stack;
}

export class VueAdapter implements FrameworkAdapter {
  name = "vue";

  init(): void {
    // Vue 3 dev mode instrumentation is automatic; no explicit hook needed.
    // We just verify Vue is present.
    if (typeof (window as any).__VUE__  === "undefined") {
      console.warn("[Glide] Vue runtime not detected. Make sure Vue devtools are not disabled.");
    }
  }

  async resolveComponent(el: HTMLElement): Promise<ResolvedComponent | null> {
    return this.resolveComponentSync(el);
  }

  resolveComponentSync(el: HTMLElement): ResolvedComponent | null {
    const instance = getVueInstance(el);
    if (!instance) {
      // Walk up to find nearest Vue-managed ancestor
      let parent = el.parentElement;
      while (parent) {
        const parentInstance = getVueInstance(parent);
        if (parentInstance) {
          return this.buildResult(el, parentInstance);
        }
        parent = parent.parentElement;
      }
      return null;
    }
    return this.buildResult(el, instance);
  }

  buildStructuralPath(
    element: HTMLElement,
    filePath: string,
    componentName: string,
  ): JSXStructuralPath | null {
    const segments: JSXPathSegment[] = [];
    let current: HTMLElement | null = element;
    let foundBoundary = false;

    // Walk up the DOM tree from the target element to the component root
    while (current) {
      const instance = getVueInstance(current);

      // Check if we've reached the owning component's root element
      if (instance) {
        const name = getComponentName(instance);
        if (name === componentName) {
          foundBoundary = true;
          break;
        }
        // Different component — record as a composite segment
        if (name && isUserComponent(name)) {
          segments.push({
            name,
            discriminator: { type: "index", value: 0 },
          });
          current = current.parentElement;
          continue;
        }
      }

      // Host element — record tag and sibling index
      const tag = current.tagName.toLowerCase();
      if (HTML_TAGS.has(tag)) {
        let siblingIndex = 0;
        if (current.parentElement) {
          const parent = current.parentElement;
          for (let i = 0; i < parent.children.length; i++) {
            const sibling = parent.children[i];
            if (sibling === current) break;
            if (sibling.tagName.toLowerCase() === tag) {
              siblingIndex++;
            }
          }
        }

        const id = current.getAttribute("id");
        const key = current.getAttribute("data-key") || current.getAttribute("key");
        let discriminator: JSXPathSegment["discriminator"];

        if (key) {
          discriminator = { type: "key", value: key };
        } else if (id) {
          discriminator = { type: "id", value: id };
        } else {
          discriminator = { type: "index", value: siblingIndex };
        }

        let classHint: string[] | undefined;
        const className = current.className;
        if (className && typeof className === "string") {
          const classes = className.split(/\s+/).filter(Boolean).slice(0, 3);
          if (classes.length > 0) classHint = classes;
        }

        segments.push({ name: tag, discriminator, classHint });
      }

      current = current.parentElement;
    }

    if (!foundBoundary) return null;

    segments.reverse();
    if (segments.length > 0) {
      segments[0].discriminator = { type: "root" };
    }

    return { componentName, filePath, segments };
  }

  private buildResult(
    el: HTMLElement,
    instance: any,
  ): ResolvedComponent | null {
    const name = getComponentName(instance);
    const filePath = getComponentFile(instance);
    const stack = buildComponentStack(instance);

    if (!name) return null;

    const result: ResolvedComponent = {
      tagName: el.tagName.toLowerCase(),
      componentName: name,
      filePath,
      lineNumber: 0,
      columnNumber: 0,
      stack,
    };

    result.jsxPath =
      this.buildStructuralPath(el, filePath, name) ?? undefined;

    return result;
  }
}
