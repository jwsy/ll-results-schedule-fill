// filename: background.js
// Fetch proxy in case content-script fetch is blocked by CSP
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "FETCH_STANDINGS" && typeof msg.url === "string") {
    fetch(msg.url, { credentials: "include" })
      .then(async (res) => {
        const text = await res.text();
        sendResponse({ ok: res.ok, status: res.status, text });
      })
      .catch((err) => {
        sendResponse({ ok: false, status: 0, error: String(err) });
      });
    return true; // async response
  }
});

