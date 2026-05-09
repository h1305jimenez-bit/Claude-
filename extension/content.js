// Content script — runs on job application pages
// Listens for fill commands from popup.js via chrome.runtime.sendMessage

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "PING") {
    sendResponse({ ok: true, url: window.location.href });
  }
  return true;
});
