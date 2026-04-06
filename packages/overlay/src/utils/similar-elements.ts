import { isValidElement } from "./component-filter.js";

const MAX_RESULTS = 100;

function normalizeClassString(raw: string): string {
  return raw.split(/\s+/).filter(Boolean).sort().join(" ");
}

export function findSimilarElements(selected: HTMLElement): HTMLElement[] {
  const raw = selected.getAttribute("class");
  if (!raw || !raw.trim()) return [];

  const normalized = normalizeClassString(raw);
  const tag = selected.tagName.toLowerCase();
  const candidates = document.querySelectorAll(tag);
  const results: HTMLElement[] = [];

  for (let i = 0; i < candidates.length && results.length < MAX_RESULTS; i++) {
    const el = candidates[i] as HTMLElement;
    if (el === selected) continue;
    if (el.closest("#glide-root")) continue;
    if (!isValidElement(el)) continue;

    const elRaw = el.getAttribute("class");
    if (!elRaw) continue;
    if (normalizeClassString(elRaw) === normalized) {
      results.push(el);
    }
  }

  return results;
}
