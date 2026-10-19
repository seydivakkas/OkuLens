/* OkuLens Windows masaüstü P0 — yalnızca paketli kaynaklar ve kullanıcı seçimi.
 * Node API'leri DOM'a sunulmaz; renderer sandbox ve contextIsolation etkindir.
 */
const {app,BrowserWindow,dialog,ipcMain,protocol,session}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {TextDecoder}=require('node:util');

protocol.registerSchemesAsPrivileged([
 {scheme:'okulens',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}
]);

const ROOT=path.resolve(__dirname,'..');
const ASSETS=new Map([
 ['/desktop/index.html','text/html; charset=utf-8'],
 ['/desktop/style.css','text/css; charset=utf-8'],
 ['/desktop/renderer.mjs','text/javascript; charset=utf-8'],
 ['/shared/summarize.mjs','text/javascript; charset=utf-8'],
 ['/shared/hybrid-nlp.mjs','text/javascript; charset=utf-8']
]);
const MAX_BYTES=2*1024*1024;
let mainWindow=null;
function validateSender(event){
 if(!mainWindow||event.sender!==mainWindow.webContents||
    event.senderFrame!==mainWindow.webContents.mainFrame){
  throw new Error('DESKTOP_IPC_SENDER_REJECTED');
 }
}
function safeAsset(requestUrl){
 let url;
 try{url=new URL(requestUrl);}catch{return null;}
 if(url.protocol!=='okulens:'||url.hostname!=='desktop'||url.username||url.password||
    url.search||url.hash||!ASSETS.has(url.pathname))return null;
 return {path:path.join(ROOT,url.pathname.slice(1).split('/').join(path.sep)),
  mime:ASSETS.get(url.pathname)};
}
async function respondAsset(request){
 const asset=safeAsset(request.url);
 if(!asset)return new Response('Kaynak bulunamadi',{status:404});
 try{
  const bytes=await fs.readFile(asset.path);
  return new Response(bytes,{status:200,headers:{'Content-Type':asset.mime,
   'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
 }catch{return new Response('Dosya okunamadi',{status:404});}
}
function createWindow(){
 mainWindow=new BrowserWindow({
  width:1280,height:840,minWidth:860,minHeight:570,
  title:'OkuLens — Windows',
  show:false,
  backgroundColor:'#f4f6fb',
  webPreferences:{
   preload:path.join(__dirname,'preload.cjs'),
   nodeIntegration:false,contextIsolation:true,sandbox:true,
   webSecurity:true
  }
 });
 mainWindow.once('ready-to-show',()=>mainWindow.show());
 mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 mainWindow.webContents.on('will-navigate',event=>event.preventDefault());
 mainWindow.loadURL('okulens://desktop/desktop/index.html');
 mainWindow.on('closed',()=>{mainWindow=null;});
}
function registerIPC(){
 ipcMain.handle('desktop:open-text',async(event)=>{
  validateSender(event);
  const choice=await dialog.showOpenDialog(mainWindow,{
   title:'OkuLens — Yerel metin dosyası seç',
   properties:['openFile'],
   filters:[{name:'Metin ve Markdown',extensions:['txt','md']}]
  });
  if(choice.canceled||choice.filePaths.length!==1)return {canceled:true};
  const chosen=choice.filePaths[0];
  if(!['.txt','.md'].includes(path.extname(chosen).toLowerCase()))throw new Error('DESTEKLENMEYEN_DOSYA_UZANTISI');
  const stat=await fs.stat(chosen);
  if(!stat.isFile()||stat.size>MAX_BYTES)throw new Error('DOSYA_BOYUTU_EN_FAZLA_2_MIB');
  const bytes=await fs.readFile(chosen);
  const body=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  if(body.length>260000)throw new Error('METIN_EN_FAZLA_260000_KARAKTER');
  return {canceled:false,name:path.basename(chosen),text:body};
 });
 ipcMain.handle('desktop:save-summary',async(event,text)=>{
  validateSender(event);
  if(typeof text!=='string'||text.length>260000||!text.trim())throw new Error('KAYDEDILECEK_OZET_YOK');
  const choice=await dialog.showSaveDialog(mainWindow,{
   title:'OkuLens — Özeti kaydet',
   defaultPath:'OkuLens-Ozet.txt',
   filters:[{name:'Metin',extensions:['txt']}]
  });
  if(choice.canceled||!choice.filePath)return {canceled:true};
  if(path.extname(choice.filePath).toLowerCase()!=='.txt')throw new Error('DOSYA_UZANTISI_TXT_OLMALI');
  await fs.writeFile(choice.filePath,text,{encoding:'utf8'});
  return {canceled:false,name:path.basename(choice.filePath)};
 });
}
app.whenReady().then(async()=>{
 // Kullanıcı onayı olmadan model, bulut API veya sayfa isteği yapılmaz.
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 session.defaultSession.webRequest.onBeforeRequest(
  {urls:['http://*/*','https://*/*']},(_details,callback)=>callback({cancel:true})
 );
 protocol.handle('okulens',respondAsset);
 registerIPC();
 createWindow();
}).catch(error=>{console.error('DESKTOP_START_FAILED',error?.message);app.quit();});
app.on('window-all-closed',()=>app.quit());
