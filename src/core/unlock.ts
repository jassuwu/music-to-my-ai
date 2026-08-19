/**
 * Chrome will not start an AudioContext until the page has seen a real user
 * gesture. Creating one earlier "works" — it starts suspended and can be
 * resumed later — but Chrome logs an autoplay warning every single page load,
 * so the context is instead created *inside* the gesture, which is the pattern
 * MDN recommends and which produces no warning at all.
 *
 * In practice the user's own click or Enter to submit a prompt arrives well
 * before any text streams back. If a page is loaded mid-stream and no gesture
 * ever comes, we simply stay silent — no banner, no nag. The state self-heals
 * the moment the user types.
 */
export function whenUnlocked(): Promise<AudioContext> {
  // If the document has already been interacted with — a reload after typing,
  // a click that navigated here — we can start immediately.
  if (navigator.userActivation?.hasBeenActive) {
    return Promise.resolve(new AudioContext());
  }

  return new Promise((resolve) => {
    const events = ["pointerdown", "keydown"] as const;

    const unlock = () => {
      for (const type of events) document.removeEventListener(type, unlock, true);
      resolve(new AudioContext());
    };

    for (const type of events) {
      document.addEventListener(type, unlock, true);
    }
  });
}
