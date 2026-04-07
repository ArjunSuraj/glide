import type { FrameworkAdapter } from "./types.js";
import { ReactAdapter } from "./react-adapter.js";
import { VueAdapter } from "./vue-adapter.js";
import { AngularAdapter } from "./angular-adapter.js";

export type { FrameworkAdapter, ResolvedComponent } from "./types.js";

let activeAdapter: FrameworkAdapter | null = null;

/**
 * Detect the frontend framework at runtime and create the appropriate adapter.
 * Priority:
 * 1. Explicit framework hint from CLI (window.__GLIDE_APP_FRAMEWORK__)
 * 2. Runtime detection via global markers
 */
export function createAdapter(): FrameworkAdapter {
  const hint = (window as any).__GLIDE_APP_FRAMEWORK__ as string | undefined;

  if (hint === "vue" || (!hint && isVueApp())) {
    activeAdapter = new VueAdapter();
  } else if (hint === "angular" || (!hint && isAngularApp())) {
    activeAdapter = new AngularAdapter();
  } else {
    activeAdapter = new ReactAdapter();
  }

  activeAdapter.init();
  console.log(`[Glide] Using ${activeAdapter.name} adapter`);
  return activeAdapter;
}

export function getAdapter(): FrameworkAdapter {
  if (!activeAdapter) {
    return createAdapter();
  }
  return activeAdapter;
}

function isVueApp(): boolean {
  return typeof (window as any).__VUE__ !== "undefined" ||
    !!document.querySelector("[data-v-app]");
}

function isAngularApp(): boolean {
  return typeof (window as any).ng !== "undefined" ||
    !!document.querySelector("[ng-version]") ||
    !!document.querySelector("app-root");
}
