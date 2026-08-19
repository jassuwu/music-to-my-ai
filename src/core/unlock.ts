/**
 * Chrome will not start an AudioContext until the page has seen a real user
 * gesture. In practice the user's own click or Enter to submit a prompt
 * arrives well before any text streams back, so we simply wait for it.
 *
 * If no gesture ever arrives (page reloaded mid-stream, response resumed on
 * load) we stay silent and show nothing — the state self-heals the moment the
 * user types.
 */
export function createUnlockedContext(): {
  ctx: AudioContext;
  ready: Promise<void>;
} {
  const ctx = new AudioContext();
  const ready = new Promise<void>((resolve) => {
    if (ctx.state === "running") return resolve();

    const unlock = () => {
      void ctx.resume().then(() => {
        if (ctx.state === "running") {
          detach();
          resolve();
        }
      });
    };
    const detach = () => {
      for (const type of ["pointerdown", "keydown"] as const) {
        document.removeEventListener(type, unlock, true);
      }
    };
    for (const type of ["pointerdown", "keydown"] as const) {
      document.addEventListener(type, unlock, true);
    }
  });

  return { ctx, ready };
}
