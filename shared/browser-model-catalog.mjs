/* TİCARİ-002: Kaynağı sabit ve doğrulanabilir ilk model profili.
 * Ağırlıklar upstream SHA ile, dokuz metadata dosyası 18.10.2026 GitHub Actions
 * bağımsız fetch SHA denetimi ile pinlendi. Gerçek Chrome/Edge kabulü HOLD.
 */
export const METADATA_SHA256=Object.freeze({
 'config.json':'c62bd6f68dc0d4d2436c86ad002a81ac6c8b9029837b8ea5f5404811eb465529',
 'tokenizer.json':'aeb13307a71acd8fe81861d94ad54ab689df773318809eed3cbe794b4492dae4',
 'tokenizer_config.json':'443bfa629eb16387a12edbf92a76f6a6f10b2af3b53d87ba1550adfcf45f7fa0',
 'generation_config.json':'64d86df2173901c58389974bde21f7d2ab9eb7d79f35a337753329d39cf265c0',
 'chat_template.jinja':'b692e04b8bbd2723e45851897691899d7b4b5abb4974ed99ac60331b5001a99d',
 'added_tokens.json':'c0284b582e14987fbd3d5a2cb2bd139084371ed9acbae488829a1c900833c680',
 'merges.txt':'8831e4f1a044471340f7c0a83d7bd71306a5b867e95fd870f74d0c5308a904d5',
 'special_tokens_map.json':'76862e765266b85aa9459767e33cbaf13970f327a0e88d1c65846c2ddd3a1ecd',
 'vocab.json':'ca10d7e9fb3ed18575dd1e277a2579c16d108e32f27439684afa0e10b1440910'
});
export const MODEL={
 id:'onnx-community/Qwen3-0.6B-Instruct-ONNX',
 revision:'54250909aca286a05b9d013c8af7a21859ee6ead',
 license:'Apache-2.0',
 requiredMetadata:['config.json','tokenizer.json','tokenizer_config.json','generation_config.json','chat_template.jinja','added_tokens.json','merges.txt','special_tokens_map.json','vocab.json'],
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
 return [...MODEL.requiredMetadata.map(path=>({path,sha256:METADATA_SHA256[path]})),
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
