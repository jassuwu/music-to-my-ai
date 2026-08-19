/**
 * Service worker. Owns the mute shortcut, which content scripts cannot
 * register themselves. Settings live in chrome.storage.sync so they follow
 * the profile; content scripts react to changes rather than being messaged.
 */
chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-mute") return;
  void chrome.storage.sync.get({ muted: false }).then(({ muted }) =>
    chrome.storage.sync.set({ muted: !muted }),
  );
});
