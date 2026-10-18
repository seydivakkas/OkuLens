import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const script=fileURLToPath(new URL('../scripts/ticari-lisans-denetimi.mjs',import.meta.url));
const needed=['LICENSE','vendor/readability/LICENSE.md','vendor/readability/NOTICE',
 'docs/THIRD_PARTY_MODELS.md','docs/TICARI_KULLANIM_POLITIKASI.md','docs/GIZLILIK_POLITIKASI_TASLAK.md'];
function scenario({license='MIT',withNotice=true,withPackages=true}={}){
 const cwd=mkdtempSync(join(tmpdir(),'okulens-commercial-'));
 writeFileSync(join(cwd,'package.json'),JSON.stringify({name:'sample',license:'MIT',version:'1.0.0'}));
 for(const file of needed){mkdirSync(join(cwd,...file.split('/').slice(0,-1)),{recursive:true});writeFileSync(join(cwd,file),'Test placeholder');}
 if(withPackages){
  const dep=join(cwd,'node_modules','demo-dependency');
  mkdirSync(dep,{recursive:true});
  writeFileSync(join(dep,'package.json'),JSON.stringify({name:'demo-dependency',license,version:'1.0.0'}));
  if(withNotice)writeFileSync(join(dep,'LICENSE'),'Lisans metni sentetik test verisi.');
 }
 const cleanup=()=>rmSync(cwd,{force:true,recursive:true});
 return {cwd,cleanup,run:(release=false)=>spawnSync(process.execPath,[script,...(release?['--release']:[])],{cwd,encoding:'utf8'})};
}
test('MIT paketini ve lisans bildirimini envantere alır',()=>{
 const x=scenario();
 try{const r=x.run();assert.equal(r.status,0,r.stderr+'\n'+r.stdout);
  const report=JSON.parse(readFileSync(join(x.cwd,'build','ticari-uygunluk','lisans-envanteri.json'),'utf8'));
  assert.equal(report.status,'READY_FOR_LEGAL_REVIEW');
  assert.equal(report.packages.length,1);
  assert.equal(report.packages[0].license,'MIT');
 }finally{x.cleanup();}
});
test('Copyleft veya lisansı bilinmeyen bağımlılık otomatik onaylanmaz',()=>{
 for(const license of ['GPL-3.0-only','SEE LICENSE IN custom-file','Business Source License']){
  const x=scenario({license});
  try{const r=x.run(true);assert.notEqual(r.status,0,'Engellenmeyen lisans: '+license);
   assert.match(r.stdout,/LICENSE_REVIEW/);
  }finally{x.cleanup();}
 }
});
test('Eksik lisans bildirimi geliştirici denetiminde PARTIAL, release sırasında FAIL',()=>{
 const x=scenario({withNotice:false});
 try{
  const d=x.run();assert.equal(d.status,0);assert.match(d.stdout,/PARTIAL/);
  const release=x.run(true);assert.notEqual(release.status,0);
 }finally{x.cleanup();}
});
test('Bağımlılık dizini yoksa incelenmiş gibi davranmaz',()=>{
 const x=scenario({withPackages:false});
 try{const r=x.run(true);assert.notEqual(r.status,0);assert.match(r.stdout,/DEPENDENCY_TREE_MISSING/);}finally{x.cleanup();}
});
