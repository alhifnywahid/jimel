/**
 * navigation.ts - helper navigasi SPA tanpa react-router.
 *
 * navigate() mem-push URL baru ke History API lalu memancarkan event
 * "jimel:navigate" supaya <App> (yang subscribe) me-render halaman yang sesuai
 * tanpa reload. Dipakai untuk berpindah antara inbox (/) dan /docs.
 */
export function navigate(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("jimel:navigate"));
}
