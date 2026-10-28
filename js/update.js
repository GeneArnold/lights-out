// Keeping the installed game up to date. The title screen shows the version, asks the site whether a
// newer release is out, and offers a button that fetches it.
import { BUILT, VERSION } from "./version.js";

export function versionLabel() {
  return VERSION === "dev" ? "version: this computer" : `version ${BUILT} (${VERSION.slice(0, 7)})`;
}

// → true when the site has a newer release than this copy, false when it doesn't, null when it
// could not be asked (no signal, or running on this computer).
export async function checkForUpdate() {
  if (VERSION === "dev") return null;
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()).version !== VERSION;
  } catch {
    return null;
  }
}

// Throws away the stored copy of the game and reloads it from the site. The reload brings the new
// release, which then stores itself again for offline play.
export async function update() {
  try {
    const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(registrations.map((r) => r.unregister()));
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {
    // Nothing stored, or the browser refused: the reload below still asks the site.
  }
  location.reload();
}
