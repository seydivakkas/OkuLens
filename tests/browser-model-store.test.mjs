import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {IncrementalSHA256} from '../shared/incremental-sha256.mjs';
import {MODEL,assetsFor,makeRemoteURL,localModelKey} from '../shared/browser-model-catalog.mjs';
import {browserModelStatus,quotaInfo,installBrowserModel} from '../shared/browser-model-store.mjs';

test('SHA256 NIST boş metin vektörü',()=>{
 assert.equal(new IncrementalSHA256().digestHex(),
 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});
test('SHA256 NIST abc vektörü',()=>{
 const h=new IncrementalSHA256();h.update(new TextEncoder().encode('a'));h.update(new TextEncoder().encode('bc'));
 assert.equal(h.digestHex(),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
test('SHA256 rastgele veriler çok sayıda blokta Node crypto ile aynı',()=>{
 for(const size of [1,55,56,63,64,65,119,120,512,1024,65537,4194305]){
  const b=new Uint8Array(size);for(let i=0;i<size;i++)b[i]=(i*37+5)%256;
  const hash=new IncrementalSHA256();
  for(let i=0;i<size;i+=137)hash.update(b.subarray(i,i+137));
  assert.equal(hash.digestHex(),createHash('sha256').update(b).digest('hex'),String(size));
 }
});
test('SHA256 ikinci kez finalleştirilemez veya güncellenemez',()=>{
 const h=new IncrementalSHA256();h.digestHex();
 assert.throws(()=>h.update(new Uint8Array([1])),/HASH_FINALIZED/);
 assert.throws(()=>h.digestHex(),/HASH_FINALIZED/);
});
test('model katalog path traversal ve bilinmeyen backend reddeder',()=>{
 assert.throws(()=>makeRemoteURL('../passwd'),/UNSAFE/);
 assert.throws(()=>localModelKey('safe','../../bad'),/UNLISTED/);
 assert.throws(()=>assetsFor('remote'),/INVALID_MODEL_BACKEND/);
 assert.equal(assetsFor('webgpu').at(-1).sha256,MODEL.backend.webgpu.sha256);
});
test('tarayıcı kurulu değil durumu ağ çağrısı yapmadan anlaşılır',async()=>{
 const result=await browserModelStatus({local:{async get(){return {};}},
  storage:{async getDirectory(){throw new Error('no model');}}});
 assert.equal(result.ready,false);
 assert.equal(result.reason,'BROWSER_MODEL_NOT_INSTALLED');
});
test('kota verisi yoksa sahte kullanılabilir kapasite verilmez',async()=>{
 const x=await quotaInfo({async estimate(){return {usage:undefined,quota:undefined};}});
 assert.equal(x.known,false);assert.equal(x.available,null);
});
test('açık indirme çağrısı olmadan ağ kullanılmaz; kota yetersizse ağ kullanılmaz',async()=>{
 let fetched=0;
 const storage={async estimate(){return {quota:10,usage:0};}};
 const locks={async request(_key,_opts,fn){return fn();}};
 await assert.rejects(
  installBrowserModel('webgpu',{deps:{storage,locks,local:{get:async()=>({})},fetcher:async()=>{fetched++;return {};}}}),
  /INSUFFICIENT_STORAGE_QUOTA/
 );
 assert.equal(fetched,0);
});
test('desteklenmeyen backend kurulumdan önce reddedilir',async()=>{
 await assert.rejects(installBrowserModel('cloud'),/INVALID_MODEL_BACKEND/);
});
