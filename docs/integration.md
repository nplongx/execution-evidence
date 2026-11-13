# Host integration and evidence inputs

## Inputs the host must own

The host must bind each verification call to:
- authenticated provider/runner identity or a trusted local runner process;
- expected job_id, task_id, lease_id, attempt and owner epoch;
- approved immutable plan and dispatch request;
- trustedInputCommit from the approved dispatch context;
- exact result/evidence artifact bytes obtained from the provider/runner;
- the policy for accepting or rejecting the verifier result.

The verifier does not fetch artifacts or establish these identities. Never trust job/task/lease values copied only from the evidence being verified.

## API example

~~~js
import {
  verifyExecutionEvidence,
  assertExecutionEvidence,
} from '@runalith/execution-evidence';

const verification = verifyExecutionEvidence({
  result,
  evidence,
  evidenceBytes,
  requireRawEvidenceBytes: true,
  trustedInputCommit: immutableDispatch.input_commit,
});

if (!verification.valid) {
  // Host records a rejected/quarantined verification result.
  throw new Error(verification.errors.join('; '));
}

// The provenance field deliberately does not claim independent attestation.
console.log(verification.evidence_hash, verification.output_commit_provenance);

// Throws when invalid.
const verified = assertExecutionEvidence({
  result,
  evidence,
  evidenceBytes,
  requireRawEvidenceBytes: true,
  trustedInputCommit: immutableDispatch.input_commit,
});
~~~

assertExecutionEvidence() throws if verification.valid is false and otherwise returns the verification object. It does not persist or authorize completion.

## Raw byte map

evidenceBytes is a plain object mapping evidence filename to Buffer or Uint8Array. Example keys include result.json, task-payload.json, execution.json, stdout.txt, stderr.txt, git-status.txt and any other declared evidence file.

The host is responsible for secure artifact retrieval and archive parsing. Apply archive path traversal, symlink, duplicate-name, decompression size and file-count defenses before constructing the evidenceBytes map. This package receives already selected file bytes and does not inspect ZIP metadata.

For raw verification:
- requireRawEvidenceBytes must be true;
- trustedInputCommit must be supplied by the host;
- exact result.json bytes must match the supplied result object;
- stdout/stderr/git-status metadata must match byte counts and SHA-256 digests in execution.json;
- successful evidence must have valid output commit binding and expected required files.

Do not derive trustedInputCommit from result.json or evidence.execution.json.

## Limits

| Constant | Default |
|---|---:|
| MAX_RAW_EVIDENCE_BYTES | 16 MiB aggregate |
| Evidence file-count limit (internal bound) | 1024 |
| MAX_STRICT_JSON_BYTES | Exported by @runalith/workflow-contracts |

The strict JSON parser rejects duplicate keys and applies the dependency's bounded parsing rules. Canonical object validation separately rejects cycles, proxies, unsupported prototypes, accessor properties, malformed arrays and excessive nesting.

## Downstream state ownership

After successful verification, host still must:
- compare result identity against the exact active lease/task/attempt;
- revalidate lease fencing and current workflow plan;
- persist result/artifact/attempt/event in the Workflow-owned SQLite transaction;
- quarantine worker-reported output provenance unless an independent attestation policy is satisfied;
- keep unresolved provider outcomes distinct from verified success/failure.

Do not move SQLite writes, lease state or Workflow terminalization into this package. No state is persisted here.

## Failure handling

The verifier returns { valid: false, errors: [...] } for ordinary invalid evidence. Structural abuse such as proxy-backed values, invalid prototypes, cycles or limits may throw a TypeError. Host should treat both outcomes as rejection and preserve bounded diagnostics.

The verifier's output_commit_provenance marker is not an assurance level that callers may override. Do not rename or reinterpret it as independently verified.
