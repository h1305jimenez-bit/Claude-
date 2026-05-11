// Background service worker — no-op for now
// Future: handle OAuth, token refresh, badge updates
chrome.runtime.onInstalled.addListener(() => {
  console.log("Applyjobs extension installed");
});
