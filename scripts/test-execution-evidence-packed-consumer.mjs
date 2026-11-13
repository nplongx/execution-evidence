#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-evidence-packed-consumer-'));
const consumerRoot = path.join(temporaryRoot, 'consumer');
const environment = {
  ...process.env,
  NODE_NO_WARNINGS: '1',
  npm_config_update_notifier: 'false',
  npm_config_fund: 'false',
  npm_config_audit: 'false'
};

function run(command, args, cwd, label) {
  const result = spawnSync(command, args, {
    cwd, env: environment, encoding: 'utf8', timeout: 180000, maxBuffer: 8 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    throw new Error(label + ' failed (status=' + result.status + ', signal=' + result.signal + '):\n' +
      (result.stdout || '') + '\n' + (result.stderr || '') + '\n' + (result.error?.message || ''));
  }
  return result.stdout.trim();
}

try {
  fs.mkdirSync(consumerRoot, { mode: 0o700 });
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', temporaryRoot], ROOT, 'npm pack'));
  assert.equal(packed.length, 1);
  assert.equal(packed[0].name, '@runalith/execution-evidence');
  assert.equal(packed[0].version, '0.1.0');
  const tarball = path.join(temporaryRoot, packed[0].filename);
  assert.ok(fs.statSync(tarball).size > 5000);
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', consumerRoot, tarball],
    ROOT, 'install packed Execution Evidence into clean consumer');

  const smoke = [
    "import assert from 'node:assert/strict';",
    "import * as api from '@runalith/execution-evidence';",
    "assert.equal(api.ExecutionContractVersion, 1);",
    "assert.equal(typeof api.createExecutionRequest, 'function');",
    "assert.equal(typeof api.createExecutionResult, 'function');",
    "assert.equal(typeof api.verifyExecutionEvidence, 'function');",
    "assert.equal(typeof api.assertExecutionEvidence, 'function');",
    "assert.equal(api.MAX_RAW_EVIDENCE_BYTES, 16 * 1024 * 1024);",
    "const request = api.createExecutionRequest({job_id:'job_consumer',task_id:'task_consumer',lease_id:'lease_consumer',attempt:1,role:'engineer',input_commit:'a'.repeat(40),task_payload_ref:'task://job_consumer/task_consumer',workspace:'/workspace',required_evidence:['task-payload.json','execution.json','stdout.txt','stderr.txt','git-status.txt']});",
    "const result = api.createExecutionResult({job_id:request.job_id,task_id:request.task_id,lease_id:request.lease_id,attempt:request.attempt,status:'SUCCEEDED',input_commit:request.input_commit,output_commit:'b'.repeat(40),exit_code:0,provider_run_id:'provider-consumer',evidence_artifact:'artifact-consumer',evidence_refs:request.required_evidence,started_at:'2026-11-13T08:00:00.000Z',finished_at:'2026-11-13T08:00:01.000Z',error:null});",
    "const evidence = {'task-payload.json':{schema_version:1,job_id:request.job_id,task_id:request.task_id,lease_id:request.lease_id,attempt:request.attempt,required_evidence:request.required_evidence},'execution.json':{task_id:request.task_id,exit_code:0,timed_out:false},'stdout.txt':'P4_OK\\n','stderr.txt':'','git-status.txt':''};",
    "const verification = api.verifyExecutionEvidence({result,evidence});",
    "assert.equal(verification.valid,true,verification.errors.join('; '));",
    "assert.equal(verification.evidence_hash.length,64);",
    "assert.equal(api.isVerifiedSuccessfulLocalExecution({task_id:'task_consumer',status:'completed',execution_status:'completed',execution_exit_code:0,execution_session_id:'exec-consumer',execution_attempt:1},'task_consumer'),true);",
    "console.log('packed consumer public contract, evidence verifier and success predicate PASS');"
  ].join('\n');

  run(process.execPath, ['--input-type=module','-e',smoke], consumerRoot, 'packed consumer API smoke');
  console.log('Execution Evidence packed consumer PASS: ' + packed[0].filename +
    ' (' + packed[0].entryCount + ' package files, ' + packed[0].size + ' bytes)');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
