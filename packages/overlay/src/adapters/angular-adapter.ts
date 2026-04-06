import type { JSXStructuralPath, JSXPathSegment } from "@react-rewrite/shared";
import type { FrameworkAdapter, ResolvedComponent } from "./types.js";

/**
 * Angular runtime introspection adapter.
 *
 * Angular in dev mode exposes `ng.getComponent(el)` and `ng.getOwningComponent(el)`
 * for mapping DOM elements to component instances. Source file info requires
 * Angular's debug metadata which is available when AOT optimization is disabled
 * (the default for `ng serve`).
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

declare const ng: {
  getComponent(el: Element): any;
  getOwningComponent(el: Element): any;
  getContext(el: Element): any;
} | undefined;

function getAngularComponent(el: Element): any {
  if (typeof ng === "undefined") return null;
  try {
    return ng.getComponent(el) ?? ng.getOwningComponent(el) ?? null;
  } catch {
    return null;
  }
}

function getComponentName(component: any): string {
  if (!component) return "";
  const ctor = component.constructor;
  if (!ctor) return "";
  let name = ctor.name || "";
  // Angular 20 mangles class names with a leading underscore (e.g., _LoginComponent)
  if (name.startsWith("_") && name.length > 1 && name[1] === name[1].toUpperCase()) {
    name = name.slice(1);
  }
  return name;
}

function getComponentFile(component: any): string {
  if (!component) return "";
  const ctor = component.constructor;
  const cmpDef = ctor?.ɵcmp || ctor?.ɵfac?.__source;

  if (ctor?.__file) return ctor.__file;
  if (ctor?.__source?.fileName) return ctor.__source.fileName;

  if (cmpDef?.templateUrl) {
    return cmpDef.templateUrl.replace(/\.html$/, ".ts");
  }

  // Angular doesn't expose source file paths on component instances.
  // Return empty so the CLI-side discoverFile fallback (grep-based) kicks in.
  return "";
}

function getSelector(component: any): string {
  if (!component) return "";
  const ctor = component.constructor;
  const cmpDef = ctor?.ɵcmp;
  if (cmpDef?.selectors) {
    // selectors is an array like [["app-sidebar"]]
    const first = cmpDef.selectors?.[0]?.[0];
    if (typeof first === "string") return first;
  }
  return "";
}

function isUserComponent(name: string): boolean {
  if (!name) return false;
  const internals = new Set([
    "RouterOutlet", "NgComponentOutlet",
    "NgIf", "NgForOf", "NgSwitch", "NgSwitchCase", "NgSwitchDefault",
    "NgClass", "NgStyle", "NgTemplateOutlet", "NgPlural", "NgPluralCase",
  ]);
  if (internals.has(name)) return false;
  // Skip third-party library components whose templates aren't user-editable
  const thirdPartyPrefixes = ["Dx", "Mat", "Cdk", "Ng"];
  for (const prefix of thirdPartyPrefixes) {
    if (name.startsWith(prefix) && name.length > prefix.length &&
        name[prefix.length] === name[prefix.length].toUpperCase()) {
      return false;
    }
  }
  return true;
}

function buildComponentStack(el: Element): ResolvedComponent["stack"] {
  const stack: ResolvedComponent["stack"] = [];
  const seen = new Set<any>();
  let current: Element | null = el;

  while (current) {
    const component = getAngularComponent(current);
    if (component && !seen.has(component)) {
      seen.add(component);
      const name = getComponentName(component);
      if (name && isUserComponent(name)) {
        stack.push({
          componentName: name,
          filePath: getComponentFile(component),
          lineNumber: 0,
          columnNumber: 0,
        });
      }
    }
    current = current.parentElement;
  }

  return stack;
}

export class AngularAdapter implements FrameworkAdapter {
  name = "angular";

  init(): void {
    if (typeof ng === "undefined") {
      console.warn(
        "[Glide] Angular debug APIs not found. Ensure the app is running in development mode.",
      );
    }
  }

  async resolveComponent(el: HTMLElement): Promise<ResolvedComponent | null> {
    return this.resolveComponentSync(el);
  }

  resolveComponentSync(el: HTMLElement): ResolvedComponent | null {
    // Walk up from the element to find the nearest user-authored Angular component.
    // Third-party components (DevExtreme Dx*, Angular Material Mat*, CDK Cdk*) are
    // skipped by isUserComponent so we land on the user's own component instead.
    let current: Element | null = el;
    while (current) {
      const component = getAngularComponent(current);
      if (component) {
        const name = getComponentName(component);
        if (name && isUserComponent(name)) {
          return this.buildResult(el, component, current);
        }
      }
      current = current.parentElement;
    }
    return null;
  }

  buildStructuralPath(
    element: HTMLElement,
    filePath: string,
    componentName: string,
  ): JSXStructuralPath | null {
    const segments: JSXPathSegment[] = [];
    let current: HTMLElement | null = element;
    let foundBoundary = false;

    while (current) {
      // Check if this is the component host element
      const component = getAngularComponent(current);
      if (component) {
        const name = getComponentName(component);
        if (name === componentName) {
          foundBoundary = true;
          break;
        }
        if (name && isUserComponent(name)) {
          const selector = getSelector(component);
          segments.push({
            name: selector || name,
            discriminator: { type: "index", value: 0 },
          });
          current = current.parentElement;
          continue;
        }
      }

      const tag = current.tagName.toLowerCase();
      if (HTML_TAGS.has(tag) || tag.includes("-")) {
        let siblingIndex = 0;
        if (current.parentElement) {
          for (let i = 0; i < current.parentElement.children.length; i++) {
            const sibling = current.parentElement.children[i];
            if (sibling === current) break;
            if (sibling.tagName.toLowerCase() === tag) siblingIndex++;
          }
        }

        const id = current.getAttribute("id");
        let discriminator: JSXPathSegment["discriminator"];
        if (id) {
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
    component: any,
    componentEl: Element,
  ): ResolvedComponent | null {
    const name = getComponentName(component);
    const filePath = getComponentFile(component);
    const stack = buildComponentStack(el);

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
