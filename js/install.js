// The "install me" hint on the title screen, for phones playing in a browser tab.
// Chrome on Android can install the game itself, so its hint is tappable. iPhones are told the Share
// steps. Other Android browsers (Firefox only makes a shortcut) are sent to Chrome, which makes a real app.
let promptEvent = null;
let changed = () => {};

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // keep Chrome's own bar away; the title screen offers it instead
  promptEvent = e;
  changed();
});
window.addEventListener("appinstalled", () => {
  promptEvent = null;
  changed();
});

function installed() {
  return matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone === true;
}

// → { words, tap } for the title screen, or null when there's nothing to say (installed, or a computer).
export function installHint() {
  if (installed()) return null;
  const ua = navigator.userAgent;
  const iphone = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  if (promptEvent) return { words: "📲 TAP HERE TO INSTALL THE GAME", tap: true };
  if (iphone) return { words: "📲 To install: Share ⬆, then Add to Home Screen" };
  if (android && /Chrome\//.test(ua)) return { words: "📲 To install: ⋮ menu, then Install app" };
  if (android) return { words: "📲 To install it as an app, open this in Chrome" };
  return null;
}

// Shows Chrome's install question. Must run from a tap.
export async function install() {
  if (!promptEvent) return;
  const event = promptEvent;
  promptEvent = null;
  await event.prompt();
  changed();
}

// Lets the title screen redraw its hint when Chrome decides the game can be installed.
export function onHintChange(fn) {
  changed = fn;
}
