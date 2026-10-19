import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
 desktopModelStatus,installDesktopModel,verifyDesktopModel,modelFileForRequest,
 removeDesktopModel,MODEL
} from '../desktop/model-store.mjs';
import {runDesktopOnnx} from '../desktop/onnx-client.mjs';

async function sandbox(fn){
 const root=await mkdtemp(join(tmpdir(),'okulens-wp1-'));
 try{await fn(root);}finally{await rm(root,{recursive:true,force:true});}
}
test('W-P1 model sabit upstream commit, tam SHA listesi ve Apache lisansi',()=>{
 assert.match(MODEL.revision,/^[a-f0-9]{40}$/);
 for(const profile of Object.values(MODEL.backend)){
  assert.match(profile.sha256,/^[a-f0-9]{64}$/);
 }
 assert.equal(MODEL.license,'Apache-2.0');
});
test('ilk kurulumda model hazırmış gibi görünmez',async()=>{
 await sandbox(async root=>{
  const s=await desktopModelStatus(root,'webgpu');
  assert.equal(s.ready,false);
  assert.equal(s.reason,'MODEL_NOT_INSTALLED');
 });
});
test('backend beyaz liste disinda dosya sistemi erisimi verilmez',async()=>{
 await sandbox(async root=>{
  assert.equal(await modelFileForRequest(root,'webgpu','../secret'),null);
  assert.equal(await modelFileForRequest(root,'evil','config.json'),null);
  assert.equal(await modelFileForRequest(root,'webgpu','config.json'),null);
 });
});
test('model indirme abort sinyali ile ağ isteğinden önce durur',async()=>{
 await sandbox(async root=>{
  const c=new AbortController();c.abort();
  let calls=0;
  await assert.rejects(installDesktopModel(root,'webgpu',{
   signal:c.signal,fetcher:async()=>{calls++;return null;}
  }),/AbortError/);
  assert.equal(calls,0);
 });
});
test('kötü HTTPS yanıtı stage kalıntısını temizler ve kurulu sayılmaz',async()=>{
 await sandbox(async root=>{
  await assert.rejects(installDesktopModel(root,'webgpu',{
   fetcher:async()=>({ok:true,url:'https://attacker.example/model',body:new ReadableStream()})
  }),/MODEL_REDIRECT_HOST_UNAPPROVED/);
  const s=await desktopModelStatus(root,'webgpu');
  assert.equal(s.ready,false);
 });
});
test('bozuk metadata SHA model kurulumunu tamamlamadan reddedilir',async()=>{
 await sandbox(async root=>{
  await assert.rejects(installDesktopModel(root,'wasm',{
   fetcher:async url=>({ok:true,url,body:new ReadableStream({
    start(c){c.enqueue(new TextEncoder().encode('tampered metadata'));c.close();}
   })})
  }),/MODEL_SHA256_MISMATCH config.json/);
  assert.equal((await desktopModelStatus(root,'wasm')).ready,false);
 });
});
test('kurulu model hash kaydı geçersizse stat bile yeterli değildir',async()=>{
 await sandbox(async root=>{
  const dir=join(root,'qwen-webgpu');await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'manifest.json'),JSON.stringify({
   backend:'webgpu',modelId:MODEL.id,revision:MODEL.revision,
   license:MODEL.license,files:[]
  }));
  const s=await desktopModelStatus(root,'webgpu');
  assert.equal(s.ready,false);
  assert.match(s.reason,/MODEL_MANIFEST_INCOMPLETE/);
 });
});
test('model silme yalnız açık confirmed ile yapılır',async()=>{
 await sandbox(async root=>{
  await assert.rejects(removeDesktopModel(root,'webgpu'),/MODEL_REMOVE_CONFIRMATION_REQUIRED/);
  assert.deepEqual(await removeDesktopModel(root,'webgpu',{confirmed:true}),{removed:true,backend:'webgpu'});
 });
});
test('olmayan model için SHA doğrulama PASS olmaz',async()=>{
 await sandbox(async root=>await assert.rejects(verifyDesktopModel(root,'wasm'),/MODEL_NOT_INSTALLED/));
});
test('onnx worker üretimi gerçek sonucuyla döner ve worker kapanır',async()=>{
 let worker,terminated=false;
 const promise=runDesktopOnnx({backend:'wasm',text:'Selam',targetWords:10},{
  workerFactory:()=>{
   worker={terminate(){terminated=true},postMessage(m){
    assert.equal(m.type,'GENERATE');assert.equal(m.backend,'wasm');
    queueMicrotask(()=>worker.onmessage({data:{jobId:m.jobId,type:'done',result:{text:'Kaynağa bağlı kısa çıktı.',engine:'local-onnx-generative'}}}));
   }};return worker;
  }
 });
 assert.equal((await promise).text,'Kaynağa bağlı kısa çıktı.');
 assert.equal(terminated,true);
});
test('onnx worker hata verirse TextRank basarisi taklit edilmez',async()=>{
 let worker;
 await assert.rejects(runDesktopOnnx({backend:'webgpu'},{
  workerFactory:()=>{
   worker={terminate(){},postMessage(m){
    queueMicrotask(()=>worker.onmessage({data:{jobId:m.jobId,type:'error',code:'ONNX_MODEL_FAILED'}}));
   }};return worker;
  }
 }),/ONNX_MODEL_FAILED/);
});
test('onnx worker iptal edilirse sonlandirilir',async()=>{
 const controller=new AbortController();let terminated=false;
 const p=runDesktopOnnx({backend:'wasm'},{signal:controller.signal,
  workerFactory:()=>({terminate(){terminated=true},postMessage(){}})});
 controller.abort();
 await assert.rejects(p,/AbortError/);
 assert.equal(terminated,true);
});
