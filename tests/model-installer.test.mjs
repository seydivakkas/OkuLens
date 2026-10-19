import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {WEIGHTS,MODEL_ID,REVISION} from '../scripts/local-model.mjs';
test('model kaynağı sabitlenmiştir ve SHA-256 sağlanır',()=>{
 assert.equal(MODEL_ID,'onnx-community/Qwen3-0.6B-Instruct-ONNX');
 assert.match(REVISION,/^[a-f0-9]{40}$/);
 for(const item of Object.values(WEIGHTS))assert.match(item.sha256,/^[a-f0-9]{64}$/);
});
test('model indirme açık --accept-license onayı olmadan başlamaz',()=>{
 const cli=new URL('../scripts/local-model.mjs',import.meta.url);
 const r=spawnSync(process.execPath,[fileURLToPath(cli)],{encoding:'utf8'});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/--accept-license/);
});
test('model silme açık --confirm olmadan başlamaz',()=>{
 const cli=new URL('../scripts/local-model.mjs',import.meta.url);
 const r=spawnSync(process.execPath,[fileURLToPath(cli),'--remove'],{encoding:'utf8'});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/--confirm/);
});
