/* TİCARİ-002: Kaynağı sabit ve doğrulanabilir ilk model profili.
 * Ağırlık SHA'ları upstream model sayfasından; tokenizer metadata SHA'sı kurulumda
 * kaydedilir (pinlenmiş revision tek başına kriptografik doğruluk kanıtı değildir).
 */
export const MODEL={
 id:'onnx-community/Qwen3-0.6B-Instruct-ONNX',
 revision:'54250909aca286a05b9d013c8af7a21859ee6ead',
 license:'Apache-2.0',
 requiredMetadata:['config.json','tokenizer.json','tokenizer_config.json','generation_config.json','chat_template.jinja'],
 backend:{
  webgpu:{weight:'onnx/model_q4f16.onnx',sha256:'4ad5a67d818b55749eb4cad425ca542a7aa9ea66eba11a0d31ab6b81f35a182d',estimatedBytes:648000000},
  wasm:{weight:'onnx/model_q4.onnx',sha256:'a1efc0c2ec91473bcd8cd27b2a25d50452252eac5a5d582722cbdc7d8e11f13d',estimatedBytes:997000000}
 }
};
export const STORE_KEY='okulens:browser-model:v1';
export const STORE_PREFIX='okulens-model-v1';
export const STORAGE_LAYOUT=1;
export function assetsFor(backend){
 if(!Object.hasOwn(MODEL.backend,backend))throw new RangeError('INVALID_MODEL_BACKEND');
 return [...MODEL.requiredMetadata.map(path=>({path,sha256:null})),
  {path:MODEL.backend[backend].weight,sha256:MODEL.backend[backend].sha256}];
}
export function makeRemoteURL(relative){
 if(typeof relative!=='string'||!/^([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+$/.test(relative)
   ||relative.split('/').includes('..'))throw new Error('UNSAFE_MODEL_PATH');
 return 'https://huggingface.co/'+MODEL.id+'/resolve/'+MODEL.revision+'/'+relative;
}
export function localModelKey(installId,relative){
 if(!/^[a-zA-Z0-9_-]{1,64}$/.test(installId))throw new Error('INVALID_INSTALL_ID');
 // HTTP URL gerekmiyor: OPFS dosya dizini. Sadece sabit kataloğa ait dosya yolları.
 if(![...assetsFor('webgpu'),...assetsFor('wasm')].some(x=>x.path===relative))throw new Error('UNLISTED_MODEL_FILE');
 return [STORE_PREFIX,installId,...relative.split('/')];
}
