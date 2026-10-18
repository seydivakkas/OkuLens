import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedModelDownloadHost,fetchModelAsset} from '../shared/model-download-policy.mjs';
test('yalnız Hugging Face kaynaklı alan adları CDN adayıdır',()=>{
 for(const x of ['huggingface.co','us.aws.cdn.hf.co','cas-bridge.xethub.hf.co'])assert.equal(allowedModelDownloadHost(x),true);
 for(const x of ['huggingface.co.evil.example','hf.co.evil.com','evil.com',''])assert.equal(allowedModelDownloadHost(x),false);
});
test('model isteğinde cookie/credential ve referrer gönderilmez',async()=>{
 let args;
 const res=await fetchModelAsset('config.json',{fetcher:async(url,opts)=>{
  args={url,opts};return {ok:true,status:200,body:{},url:'https://huggingface.co/abc'};
 }});
 assert.ok(res.ok);
 assert.equal(args.opts.credentials,'omit');
 assert.equal(args.opts.referrerPolicy,'no-referrer');
 assert.equal(args.opts.redirect,'follow');
});
test('CDN izin ya da CORS hataları belirsiz başarısızlık değildir',async()=>{
 await assert.rejects(fetchModelAsset('tokenizer.json',{fetcher:async()=>{throw new TypeError('Failed to fetch');}}),/MODEL_CDN_OR_CORS_BLOCKED/);
});
test('HTTPS dışında veya farklı CDN üzerine yönlendirme fail-closed',async()=>{
 const f=url=>async()=>({ok:true,body:{cancel:async()=>{}},url});
 await assert.rejects(fetchModelAsset('config.json',{fetcher:f('https://example.com/model')}),/MODEL_REDIRECT_HOST_UNAPPROVED/);
 await assert.rejects(fetchModelAsset('config.json',{fetcher:f('http://huggingface.co/model')}),/MODEL_RESPONSE_NOT_HTTPS/);
});
test('bilinmeyen model dosya yolları ağ isteğinden önce reddedilir',async()=>{
 let count=0;
 await assert.rejects(fetchModelAsset('../private',{fetcher:async()=>{count++;return {};}}),/UNSAFE_MODEL_PATH/);
 assert.equal(count,0);
});
