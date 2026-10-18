/* @huggingface/transformers yalnızca geliştirici build'i sırasında paketlenir.
 * Runtime CDN import, eval veya uzaktan JavaScript YOK.
 */
import {build} from 'esbuild';
import {mkdir,cp,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
const out=path.resolve('vendor');
await mkdir(out,{recursive:true});
const bundled = await build({
 stdin:{contents:"export {pipeline, TextStreamer, env} from '@huggingface/transformers';",resolveDir:process.cwd(),sourcefile:'okulens-runtime-entry.mjs',loader:'js'},
 bundle:true,format:'esm',platform:'browser',target:'chrome116',outfile:path.join(out,'transformers.runtime.mjs'),
 sourcemap:false,minify:true,legalComments:'eof',
 define:{'process.env.NODE_ENV':'"production"'},
 logLevel:'warning',
 metafile:true
});
await writeFile(path.join(out,'runtime-inputs.json'),
 JSON.stringify({schemaVersion:1,description:'esbuild derleme girdileri; çalışma zamanındaki tüm erişimler için garanti değildir.',
  inputs:Object.keys(bundled.metafile.inputs).sort()},null,2)+'\n');
// ORT Web WASM modülleri 3.x paketinin npm ağacından (build sırasında) alınır.
const dist=path.resolve('node_modules/onnxruntime-web/dist');
const dest=path.join(out,'ort');
await mkdir(dest,{recursive:true});
for(const name of await readdir(dist)){
 if(/^(ort-wasm|ort\.wasm)/.test(name)&&/\.(?:wasm|mjs)$/.test(name)){
  await cp(path.join(dist,name),path.join(dest,name));
 }
}
const libs=await readdir(dest);
if(!libs.some(n=>n.endsWith('.wasm')))throw new Error('ORT_WASM_ASSET_MISSING');
await writeFile(path.join(out,'runtime-build.json'),
 JSON.stringify({runtime:'@huggingface/transformers',version:'3.8.1',onnxRuntimeAssets:libs,buildOnly:true},null,2)+'\n');
console.log('Yerel runtime hazır:',libs.length,'ORT dosyası');
