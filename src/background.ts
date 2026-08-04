chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.set({ installed: true })
})

chrome.tabs.onActivated.addListener(async () => {
  await chrome.storage.local.set({ lastTabChange: Date.now() })
})
