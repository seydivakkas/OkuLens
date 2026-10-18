import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectModelOrphans,cleanupModelOrphans} from '../shared/opfs-model-recovery.mjs';
import {STORE_KEY,STORE_PREFIX} from '../shared/browser-model-catalog.mjs';
function file(bytes){return {kind:'file',async getFile(){return {size:bytes};}};}
function folder(children={}){
 const map=new Map(Object.entries(children));
 return {kind:'directory',entries:async function*(){yield* map.entries();},
  async getDirectoryHandle(name){
   if(!map.has(name)){const e=new Error('not found');e.name='NotFoundError';throw e;}
   return map.get(name);
  },
  async removeEntry(name){map.delete(name);},
  has(name){return map.has(name)}
 };
}
function env(manifest){
 const active='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
 const abandoned='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
 const root=folder({[STORE_PREFIX]:folder({
  [active]:folder({'onnx':folder({'model.onnx':file(700)})}),
  [abandoned]:folder({'onnx':folder({'unfinished.part':file(100)})}),
  'legacy-unknown':folder({'safe':file(10)})
 })});
 const local={async get(){return {[STORE_KEY]:manifest===undefined?{installId:active}:manifest};}};
 const deps={local,storage:{async getDirectory(){return root;}},
  locks:{async request(_key,_opts,cb){return cb();}}};
 return {deps,root,active,abandoned};
}
test('dryRun sahipsiz kurulumları listeler ama dosya silmez',async()=>{
 const x=env();
 const result=await inspectModelOrphans(x.deps);
 assert.equal(result.orphanCount,1);
 assert.equal(result.removedCount,0);
 assert.equal(result.reclaimableBytes,100);
 assert.equal(result.unknownCount,1);
 const dir=await x.root.getDirectoryHandle(STORE_PREFIX);
 assert.equal(dir.has(x.abandoned),true);
 assert.equal(dir.has(x.active),true);
});
test('silme yalnız açık confirmed ile yapılır',async()=>{
 const x=env();
 await assert.rejects(cleanupModelOrphans({deps:x.deps}),/EXPLICIT_CONFIRMATION_REQUIRED/);
 const dir=await x.root.getDirectoryHandle(STORE_PREFIX);
 assert.equal(dir.has(x.abandoned),true);
});
test('temizlik sadece sahipsiz UUID klasörlerini siler; aktif model ve bilinmeyen kalır',async()=>{
 const x=env();
 const result=await cleanupModelOrphans({confirmed:true,deps:x.deps});
 assert.equal(result.removedCount,1);
 const dir=await x.root.getDirectoryHandle(STORE_PREFIX);
 assert.equal(dir.has(x.abandoned),false);
 assert.equal(dir.has(x.active),true);
 assert.equal(dir.has('legacy-unknown'),true);
});
test('aktif manifest yoksa güvenli taramada yalnız kurulum UUIDleri adaydır',async()=>{
 const x=env(null);
 const result=await inspectModelOrphans(x.deps);
 assert.equal(result.orphanCount,2);
 assert.equal(result.unknownCount,1);
});
test('OPFS kök klasörü yoksa temizlik başarısızlık değil boş sonuçtur',async()=>{
 const deps={local:{async get(){return {[STORE_KEY]:null};}},
  locks:{async request(_k,_o,fn){return fn();}},
  storage:{async getDirectory(){const e=new Error('missing');e.name='NotFoundError';throw e;}}};
 const r=await cleanupModelOrphans({confirmed:true,deps});
 assert.equal(r.removedCount,0);
});
