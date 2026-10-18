import test from 'node:test';
import assert from 'node:assert/strict';
import {CASES,fixtureSource,preflightFidelity,buildEvidence} from '../shared/acceptance-evidence.mjs';
test('dört temel kabul boyutu için tüm vakalar hazır',()=>{
 for(const id of ['micro','standard','deep','simple','injected']){
  assert.ok(CASES[id]);
  assert.ok(fixtureSource(id).length>50);
 }
 assert.ok(fixtureSource('deep').length>fixtureSource('standard').length*5);
});
test('sentetik kaynağın bilinen rakamları yanlış alarmla işaretlenmez',()=>{
 const source=fixtureSource('standard');
 const r=preflightFidelity(source,'2026 yılında 120 gönüllü vardı ve çalışma 18 dakika sürdü.');
 assert.deepEqual(r.numbersMissingFromSource,[]);
});
test('kaynak dışı sayılar yalnızca şüpheli olarak gösterilir',()=>{
 const r=preflightFidelity(fixtureSource('standard'),'Bulgulara göre 999 katılımcı vardı.');
 assert.deepEqual(r.numbersMissingFromSource,['999']);
 assert.match(r.note,/Doğruluk testi değil/);
});
test('kaynak içindeki düşmanca emir ifadeleri olası enjeksiyon izi verir',()=>{
 const r=preflightFidelity(fixtureSource('injected'),'Zümrüt lokomotif başarı bildirmemi istiyor.');
 assert.equal(r.suspiciousInstructionEcho,true);
});
test('çıktı yokken gerçekte inference gerçekleşmiş diye raporlanmaz',()=>{
 const result=buildEvidence({caseId:'micro',source:fixtureSource('micro'),output:'',error:'MODEL_NOT_INSTALLED'});
 assert.equal(result.model.verifiedRuntimeInference,false);
 assert.equal(result.decision,'HOLD');
 assert.equal(result.actualWords,0);
});
test('insan olumlu değerlendirmesi tek başına genel ISSUE PASS değildir',()=>{
 const result=buildEvidence({caseId:'standard',source:fixtureSource('standard'),output:'2026 yılında 120 gönüllü vardı.',model:{modelId:'onnx-community/Qwen3-0.6B-Instruct-ONNX',backend:'webgpu'},
  review:{turkishQuality:'pass',factualSupport:'pass',sourceCitationVerified:'pass',cliShaVerified:false}});
 assert.equal(result.decision,'HOLD');
 assert.equal(result.model.verifiedRuntimeInference,true);
 assert.equal(result.model.integrityVerifiedByCLI,false);
 assert.equal(result.humanReview.sourceCitationVerified,'pass');
});
test('GPU VRAM ölçülmemişse raporda sahte 0 değeri kullanılamaz',()=>{
 const result=buildEvidence({caseId:'standard',source:'Kaynak',output:'Bir özet',metrics:{elapsedMs:2321,firstTokenMs:1812,
  memoryKind:'chromium-js-heap-estimate',peakHeapBytes:205000}});
 assert.equal(result.memory.estimatedGpuVramBytes,null);
 assert.equal(result.memory.peakHeapBytes,205000);
 assert.equal(result.firstTokenMs,1812);
});
test('model akış olayları kesin sonuç yerine telemetri olarak tutulur',()=>{
 const result=buildEvidence({caseId:'simple',source:'Kaynak',output:'Örnek çıktı',
  events:[{type:'loading'},{type:'stream'},{type:'stream'},{type:'done'}]});
 assert.equal(result.streamEvents,2);
 assert.equal(result.actualWords,2);
 assert.equal(result.decision,'HOLD');
});
