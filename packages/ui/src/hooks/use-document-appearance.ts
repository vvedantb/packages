import { useSyncExternalStore } from "react";

/** Light or dark, as the page currently draws itself. Neutral is dark-family. */
export type DocumentAppearance = "light" | "dark";

/**
 * Reads the appearance from `<html>`: the `dark` class (Tailwind's convention,
 * set before paint by the app's boot script) or `data-theme="dark"`.
 *
 * Use this rather than a theme context when code can run outside the app's
 * theme provider (a signed-out marketing page, a canvas effect): the class is
 * the one source every page shares.
 */
export function readDocumentAppearance(): DocumentAppearance {
  const root = document.documentElement;
  return root.classList.contains("dark") ||
    root.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

/** Calls `onChange` whenever `<html>`'s class or `data-theme` changes. */
export function subscribeDocumentAppearance(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
  return () => observer.disconnect();
}

function readServerAppearance(): DocumentAppearance {
  return "light";
}

/**
 * The page's appearance, re-rendering when it changes. Server snapshot is
 * `"light"`, matching a page with no `dark` class.
 */
export function useDocumentAppearance(): DocumentAppearance {
  return useSyncExternalStore(
    subscribeDocumentAppearance,
    readDocumentAppearance,
    readServerAppearance,
  );
}
