import test from 'node:test';
import assert from 'node:assert/strict';
import {installBrowserModel,browserModelStatus,removeBrowserModel} from '../shared/browser-model-store.mjs';
import {STORE_KEY,STORE_PREFIX} from '../shared/browser-model-catalog.mjs';

function notFound(){const e=new Error('Not found');e.name='NotFoundError';return e;}
class MemoryDirectory {
 constructor(){this.dirs=new Map();this.files=new Map();}
 async getDirectoryHandle(name,{create=false}={}){
  if(!this.dirs.has(name)){if(!create)throw notFound();this.dirs.set(name,new MemoryDirectory());}
  return this.dirs.get(name);
 }
 async getFileHandle(name,{create=false}={}){
  if(!this.files.has(name)){if(!create)throw notFound();this.files.set(name,{bytes:new Uint8Array()});}
  const node=this.files.get(name);
  return {
   async createWritable(){
    let buffer=[];
    return {
     async write(part){buffer.push(new Uint8Array(part));},
     async close(){node.bytes=new Uint8Array(buffer.reduce((n,x)=>n+x.length,0));
       let offset=0;for(const b of buffer){node.bytes.set(b,offset);offset+=b.length;}},
     async abort(){buffer=[];}
    };
   },
   async getFile(){return {size:node.bytes.length,stream(){return new Response(node.bytes).body;}};}
  };
 }
 async removeEntry(name){if(!this.dirs.delete(name)&&!this.files.delete(name))throw notFound();}
}
function fakeEnvironment(){
 const root=new MemoryDirectory(), values=new Map(),fetches=[];
 const storage={
  async getDirectory(){return root;},
  async estimate(){return {usage:0,quota:8_000_000_000};}
 };
 const local={
  async get(k){return {[k]:values.get(k)};},
  async set(record){for(const [k,v] of Object.entries(record))values.set(k,v);},
  async remove(key){values.delete(key);}
 };
 const deps={storage,local,locks:{async request(_name,_opts,fn){return fn();}},
  async fetcher(url){
   fetches.push(url);
   return new Response(new TextEncoder().encode('sentetik-veri'),{status:200});
  }};
 return {deps,root,values,fetches};
}
test('ağırlık hash uyuşmazlığında tüm yeni OPFS dosyaları kaldırılır',async()=>{
 const env=fakeEnvironment();
 await assert.rejects(installBrowserModel('webgpu',{deps:env.deps}),/MODEL_SHA256_MISMATCH/);
 assert.equal(env.values.has(STORE_KEY),false);
 const root=await env.root.getDirectoryHandle(STORE_PREFIX);
 assert.equal(root.dirs.size,0);
 assert.equal(env.fetches.length,10); // 9 metadata + 1 ağırlık
});
test('önyükleme/kurulum hatası eski kurulum kaydını silmez',async()=>{
 const env=fakeEnvironment();
 const old={schemaVersion:1,id:'onnx-community/Qwen3-0.6B-Instruct-ONNX',
  revision:'54250909aca286a05b9d013c8af7a21859ee6ead',backend:'webgpu',
  installId:'ancakbuoyki',files:[]};
 await env.deps.local.set({[STORE_KEY]:old});
 await assert.rejects(installBrowserModel('webgpu',{deps:env.deps}),/MODEL_SHA256_MISMATCH/);
 assert.deepEqual(env.values.get(STORE_KEY),old);
});
test('kullanıcı iptalinde yarım model kayıt altına alınmaz',async()=>{
 const env=fakeEnvironment(),ctrl=new AbortController();
 await assert.rejects(installBrowserModel('webgpu',{
  deps:env.deps,signal:ctrl.signal,
  onProgress:(item)=>{if(item.stage==='downloading')ctrl.abort();}
 }),/AbortError/);
 assert.equal(env.values.has(STORE_KEY),false);
});
test('silme isteğinde model yoksa yanlış başarı bildirilmez',async()=>{
 const env=fakeEnvironment();
 const r=await removeBrowserModel(env.deps);
 assert.equal(r.removed,false);
 const status=await browserModelStatus(env.deps);
 assert.equal(status.ready,false);
});
