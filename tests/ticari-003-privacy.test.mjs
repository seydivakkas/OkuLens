import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');
const manifest=JSON.parse(read('../manifest.json'));
test('KVKK gizlilik: bütün sitelerde kalıcı site izni istenmez',()=>{
 assert.equal(manifest.host_permissions,undefined);
 assert.deepEqual(manifest.optional_host_permissions,['https://huggingface.co/*','https://us.aws.cdn.hf.co/*']);
 assert.ok(manifest.permissions.includes('activeTab'));
 assert.ok(!manifest.permissions.includes('webRequest'));
 assert.ok(!manifest.permissions.includes('history'));
});
test('uzantı saklama alanı içeriğe değil güvenilir uzantı bağlamına ayrılır',()=>{
 const background=read('../background/service-worker.js');
 assert.match(background,/storage\.local\.setAccessLevel/);
 assert.match(background,/TRUSTED_CONTEXTS/);
});
test('SPA değişim mesajlarında URL/DOM/posta metni taşınmaz',()=>{
 const code=read('../content/spa-monitor.js');
 assert.match(code,/sendMessage\(\{\s*type:\s*'OKULENS_SOURCE_CHANGED',\s*reason\s*\}\)/);
 assert.doesNotMatch(code,/sendMessage\(\{\s*type:\s*'OKULENS_SOURCE_CHANGED',\s*url:/);
});
test('kabul raporu ölçülmeyen ağ durumunu kesinmiş gibi işaretlemez',()=>{
 const source=read('../studio/acceptance.js');
 assert.doesNotMatch(source,/sentToRemote\s*:\s*false/);
 assert.match(source,/networkCaptureStatus:'NOT_MEASURED'/);
 assert.match(source,/offlineInferenceVerified:false/);
});
test('gizlilik sayfası tarayıcı içi OPFS indirmesi ve gerçek cihaz HOLD belirtir',()=>{
 const privacy=read('../options/gizlilik.html');
 assert.match(privacy,/OPFS/);
 assert.match(privacy,/HOLD/);
 assert.match(privacy,/kullanıcının açık indirme onayı/);
});
