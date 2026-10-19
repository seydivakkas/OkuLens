/* Yalnız iki açık, küçük IPC işlemi. Raw ipcRenderer, fs veya Node aktarılmaz. */
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('okulensDesktop',Object.freeze({
 openText:()=>ipcRenderer.invoke('desktop:open-text'),
 saveSummary:text=>ipcRenderer.invoke('desktop:save-summary',text)
}));
