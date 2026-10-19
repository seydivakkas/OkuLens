/* Yalnız iki açık, küçük IPC işlemi. Raw ipcRenderer, fs veya Node aktarılmaz. */
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('okulensDesktop',Object.freeze({
 openText:()=>ipcRenderer.invoke('desktop:open-text'),
 saveSummary:text=>ipcRenderer.invoke('desktop:save-summary',text),
 modelStatus:backend=>ipcRenderer.invoke('desktop:model-status',backend),
 installModel:(backend,consent)=>ipcRenderer.invoke('desktop:model-install',backend,consent),
 cancelModel:()=>ipcRenderer.invoke('desktop:model-cancel'),
 verifyModel:backend=>ipcRenderer.invoke('desktop:model-verify',backend),
 removeModel:(backend,confirmed)=>ipcRenderer.invoke('desktop:model-remove',backend,confirmed),
 onModelProgress:callback=>{
  if(typeof callback!=='function')return ()=>{};
  const handler=(_event,p)=>callback(p);
  ipcRenderer.on('desktop:model-progress',handler);
  return ()=>ipcRenderer.removeListener('desktop:model-progress',handler);
 }
}));
