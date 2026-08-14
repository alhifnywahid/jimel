/**
 * navigation.ts - SPA navigation helper without react-router.
 *
 * navigate() pushes a new URL to the History API then emits a "jimel:navigate"
 * event so <App> (which subscribes) renders the matching page without a reload.
 * Used to switch between the inbox (/) and /docs.
 */
export function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("jimel:navigate"));
}
