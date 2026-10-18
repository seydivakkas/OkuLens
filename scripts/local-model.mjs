/* Model kurulumu isteğe bağlıdır: Node CLI, kullanıcı onayı ve SHA-256 denetimi.
 * Varsayılan npm install hiçbir model dosyası indirmez.
 */
import {createHash} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,rename,rm,stat} from 'node:fs/promises';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {METADATA_SHA256} from '../shared/browser-model-catalog.mjs';

export const MODEL_ID='onnx-community/Qwen3-0.6B-Instruct-ONNX';
export const REVISION='54250909aca286a05b9d013c8af7a21859ee6ead';
export const WEIGHTS={
 webgpu:{file:'onnx/model_q4f16.onnx',sha256:'4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d'},
 wasm:{file:'onnx/model_q4.onnx',sha256:'a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d'}
};
const META=['config.json','tokenizer.json','tokenizer_config.json','generation_config.json','special_tokens_map.json','added_tokens.json','vocab.json','merges.txt','chat_template.jinja'];
const root=path.resolve('models');
const base=path.join(root,...MODEL_ID.split('/'));
function shaFile(file){
 return import('node:fs').then(({createReadStream})=>new Promise((resolve,reject)=>{
  const h=createHash('sha256');const f=createReadStream(file);
  f.on('data',d=>h.update(d));f.on('error',reject);f.on('end',()=>resolve(h.digest('hex')));
 }));
}
async function download(relative,expected){
 if(relative.includes('..')||relative.startsWith('/'))throw new Error('UNSAFE_PATH');
 const dest=path.join(base,...relative.split('/'));
 await mkdir(path.dirname(dest),{recursive:true});
 try{
  const found=await shaFile(dest);
  if(!expected||found===expected)return {path:relative,sha256:found,bytes:(await stat(dest)).size};
 }catch{}
 const url='https://huggingface.co/'+MODEL_ID+'/resolve/'+REVISION+'/'+relative;
 console.log('İndiriliyor:',relative);
 const response=await fetch(url,{headers:{'User-Agent':'OkuLens-LocalModelInstaller/1.0'}});
 if(!response.ok||!response.body)throw new Error('MODEL_DOWNLOAD_HTTP_'+response.status+' '+relative);
 const temp=dest+'.part';
 const hash=createHash('sha256');
 let bytes=0;
 try{
  const count=new Transform({transform(chunk,_encoding,cb){hash.update(chunk);bytes+=chunk.length;cb(null,chunk);}});
  await pipeline(Readable.fromWeb(response.body),count,createWriteStream(temp));
  const actual=hash.digest('hex');
  if(expected&&actual!==expected)throw new Error('SHA256_MISMATCH '+relative);
  await rm(dest,{force:true});
  await rename(temp,dest);
  return {path:relative,sha256:actual,bytes};
 }catch(e){await rm(temp,{force:true});throw e;}
}
async function main(){
 const args=process.argv.slice(2);
 const mode=args.includes('--remove')?'remove':args.includes('--verify')?'verify':'install';
 if(mode==='remove'){
  if(!args.includes('--confirm'))throw new Error('Silme için --confirm gerekli.');
  await rm(root,{recursive:true,force:true});console.log('Yerel model dizini silindi.');return;
 }
 if(mode==='install'&&!args.includes('--accept-license'))throw new Error('Model lisansı/indirme onayı için --accept-license gerekli.');
 const backends=args.includes('--backend=both')?['webgpu','wasm']:args.includes('--backend=wasm')?['wasm']:['webgpu'];
 const manifestPath=path.join(root,'model-manifest.json');
 if(mode==='verify'){
  const record=JSON.parse(await readFile(manifestPath,'utf8'));
  if(record.modelId!==MODEL_ID||record.revision!==REVISION)throw new Error('MODEL_MANIFEST_MISMATCH');
  for(const file of record.files){
   if(file.path.includes('..'))throw new Error('MODEL_MANIFEST_UNSAFE_PATH');
   const actual=await shaFile(path.join(base,...file.path.split('/')));
   if(actual!==file.sha256)throw new Error('SHA256_MISMATCH '+file.path);
   if(Object.values(WEIGHTS).some(w=>w.file===file.path&&w.sha256!==actual))throw new Error('WEIGHT_SHA256_MISMATCH');
   if(METADATA_SHA256[file.path]&&METADATA_SHA256[file.path]!==actual)throw new Error('METADATA_SHA256_MISMATCH');
  }
  console.log('Model dosyaları doğrulandı:',record.files.length);return;
 }
 // Sadece kullanıcının istediği backend indirilir; üretken model olmazsa TextRank kalır.
 let existing={files:[],backends:[]};
 try{
  const saved=JSON.parse(await readFile(manifestPath,'utf8'));
  if(saved.modelId===MODEL_ID&&saved.revision===REVISION)existing=saved;
 }catch{}
 const files=[];
 for(const metadata of META)files.push(await download(metadata,METADATA_SHA256[metadata]));
 for(const name of backends){const v=WEIGHTS[name];files.push(await download(v.file,v.sha256));}
 // Mevcut ikinci backend kurulumunu silme; kaydedilecek her dosyayı disk üzerinde doğrula.
 for(const previous of existing.files||[]){
  if(files.some(f=>f.path===previous.path))continue;
  try{
   const disk=await shaFile(path.join(base,...previous.path.split('/')));
   if(disk===previous.sha256)files.push(previous);
  }catch{}
 }
 const finalBackends=[...new Set([...backends,...(existing.backends||[])])]
  .filter(name=>files.some(f=>f.path===WEIGHTS[name]?.file&&f.sha256===WEIGHTS[name]?.sha256));
 await mkdir(root,{recursive:true});
 const manifest={schemaVersion:1,modelId:MODEL_ID,revision:REVISION,license:'Apache-2.0',
  installation:'user-consented-local',backends:finalBackends,installedAt:new Date().toISOString(),files};
 await import('node:fs/promises').then(fs=>fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n'));
 console.log('Kurulum tamamlandı. Kayıt:',manifestPath);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 main().catch(e=>{console.error('MODEL_INSTALL_FAILED:',e.message);process.exitCode=1;});
}
