const OPEN_SELECTION = 'okulens-open-selection';
const MENU_SUMMARIZE = 'okulens-summarize-selection';

async function initialize() {
  try {
    // chrome.storage.local varsayılan olarak content scripts'e açıktır.
    // Model manifesti ve tercihler yalnızca güvenilir uzantı sayfalarından okunmalı.
    await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  } catch (error) {
    console.warn('OkuLens storage erişim sınırı kurulamadı:', String(error?.name||'STORAGE_ACCESS_LEVEL_FAILED'));
  }
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn('OkuLens yan panel davranışı kurulamadı:', error);
  }
}
initialize();
chrome.runtime.onInstalled.addListener(async () => {
  await initialize();
  try {
    chrome.contextMenus.create({
      id: MENU_SUMMARIZE,
      title: 'OkuLens ile seçimi özetle',
      contexts: ['selection']
    });
  } catch (error) {
    console.warn('OkuLens bağlam menüsü:', error);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_SUMMARIZE || !tab?.id) return;
  // Açılış, doğrudan kullanıcının sağ-tık menüsü seçiminden yapılır.
  chrome.sidePanel.open({ tabId: tab.id }).catch(console.warn);
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === OPEN_SELECTION && sender.tab?.id) {
    // Sayfadaki kullanıcı jestinden gönderilen mesaj; destek farklılıkları hata verir.
    chrome.sidePanel.open({ tabId: sender.tab.id }).catch(console.warn);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(`summary:tab:${tabId}`).catch(console.warn);
});
