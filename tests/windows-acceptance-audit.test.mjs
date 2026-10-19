import test from 'node:test';
import assert from 'node:assert/strict';
import {assessWindowsEvidence} from '../scripts/windows-acceptance-audit.mjs';

const identity='onnx-community/Qwen3-0.6B-Instruct-ONNX';
function evidence(data){return {data,sha256:'f'.repeat(64)};}
function env(browser='Chrome'){
 return evidence({
  kind:'OKULENS_WINDOWS_ENVIRONMENT_EVIDENCE',browser,
  browserDetected:true,browserVersion:'155.0.1',windowsVersion:'10.0.26100',
  repositoryCommit:'a'.repeat(40),extensionName:'OkuLens',extensionVersion:'0.4.0',
  decision:'HOLD'
 });
}
function preflight(){
 return evidence({
  kind:'OKULENS_OPFS_WORKER_PREFLIGHT',realModelInferenceVerified:false,
  networkCaptureStatus:'NOT_MEASURED',decision:'HOLD',
  result:{stage:'PREFLIGHT_FILES_READABLE',modelId:identity,revision:'rev',
   backend:'webgpu',checkedFiles:10,sampledBytes:40960,opfsCacheHits:10}
 });
}
function inference(caseId){
 return evidence({
  kind:'OKULENS_REAL_MODEL_ACCEPTANCE_EVIDENCE',caseId,decision:'HOLD',
  outputText:'Örnek gerçek model çıktısı.',actualWords:4,
  model:{id:identity,revision:'rev',backend:'webgpu',verifiedRuntimeInference:true},
  runtime:{networkCaptureStatus:'MEASURED_NO_REMOTE_EGRESS',offlineInferenceVerified:true},
  humanReview:{turkishQuality:'pass',factualSupport:'pass',sourceCitationVerified:'pass'}
 });
}
test('yalnız ortam bilgisi bir model kabulü veya çevrimdışı kanıt sayılmaz',()=>{
 const r=assessWindowsEvidence({environment:env()});
 assert.equal(r.decision,'HOLD');
 assert.equal(r.environment.validated,true);
 assert.equal(r.preflight.validated,false);
 assert.equal(r.missingCases.length,5);
});
test('OPFS Worker ön kontrolü gerçek inference ve ağ kabulüne yükseltilmez',()=>{
 const r=assessWindowsEvidence({environment:env(),preflight:preflight()});
 assert.equal(r.preflight.validated,true);
 assert.equal(r.decision,'HOLD');
 assert.equal(r.networkAndGpuIndependentReview,'NOT_VERIFIED');
});
test('tüm beş vakanın kağıt üzerinde başarılı raporu bile PASS üretmez',()=>{
 const all=['micro','standard','deep','simple','injected'].map(inference);
 const r=assessWindowsEvidence({environment:env(),preflight:preflight(),inferences:all});
 assert.equal(r.cases.every(x=>x.validated),true);
 assert.deepEqual(r.missingCases,[]);
 assert.equal(r.decision,'HOLD');
 assert.ok(r.findings.includes('CROSS_BROWSER_AND_EXTERNAL_NETWORK_VRAM_REVIEW_REQUIRED'));
});
test('öznel kaynak incelemesi yapılmadıysa model raporu eksik işaretlenir',()=>{
 const x=inference('micro');x.data.humanReview.sourceCitationVerified='unreviewed';
 const r=assessWindowsEvidence({environment:env('Edge'),preflight:preflight(),inferences:[x]});
 assert.ok(r.cases[0].issues.includes('INDEPENDENT_SOURCE_REVIEW_MISSING'));
 assert.equal(r.decision,'HOLD');
});
test('ölçülmeyen ağ veya çevrimdışı üretim PASS gösterilmez',()=>{
 const x=inference('standard');
 x.data.runtime.networkCaptureStatus='NOT_MEASURED';
 x.data.runtime.offlineInferenceVerified=false;
 const r=assessWindowsEvidence({environment:env(),inferences:[x]});
 assert.ok(r.cases[0].issues.includes('NETWORK_EVIDENCE_MISSING'));
 assert.ok(r.cases[0].issues.includes('OFFLINE_INFERENCE_NOT_VERIFIED'));
});
test('ortam raporunun PASS iddiası reddedilir',()=>{
 const x=env();x.data.decision='PASS';
 const r=assessWindowsEvidence({environment:x});
 assert.equal(r.environment.validated,false);
 assert.ok(r.environment.issues.includes('ENVIRONMENT_MUST_NOT_CLAIM_PASS'));
});
