# Execution Evidence

[![CI](https://github.com/nplongx/execution-evidence/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nplongx/execution-evidence/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**@runalith/execution-evidence** provides versioned Execution request/result contracts, bounded evidence validation, and raw-byte integrity verification for host-managed execution results.

This is a pure validation library. It does not run processes, fetch provider artifacts, persist results, authorize task completion, or prove who created evidence. The host owns execution, artifact retrieval, Workflow state, provider identity, and trust decisions.

> **Status:** 0.1.0, GitHub-first source package. Not published to npm. APIs remain pre-1.0.

## Scope

- Immutable, JSON-safe Execution request/result snapshots with COS-AP v1 schema validation.
- Execution contract version and result status constants.
- Bounded evidence object validation, duplicate-key-safe strict JSON parsing, and deterministic content hashing.
- Raw evidence byte snapshotting with aggregate size and file-count limits.
- Exact SHA-256 and byte-count binding for stdout, stderr, and git-status evidence.
- Output-commit consistency checks between result and execution evidence.
- Explicit output-commit provenance classification: worker-reported and execution.json-bound, not independently attested.
- Strict predicates for successful local execution and successful local result summaries.

## Non-goals

This package does not:
- spawn a process, manage tmux, create a workspace, or enforce a sandbox;
- retrieve or unpack GitHub/provider artifacts;
- authenticate the provider, runner, worker, or evidence producer;
- verify a digital signature or trusted post-run attestation;
- persist attempts/results/artifacts or append Workflow events;
- settle leases, terminalize tasks, or authorize provider replay;
- independently prove a Git commit exists or that worker output is truthful.

## Requirements and dependencies

- Node.js >=22.13.0.
- Pinned public contracts:
  - @runalith/cos-ap
  - @runalith/workflow-contracts

Dependencies use immutable public GitHub archive URLs in package.json/package-lock.json. No SSH key is required. No other third-party runtime dependency.

## Install

~~~sh
npm install github:nplongx/execution-evidence
~~~

## Quick start

~~~js
import {
  createExecutionRequest,
  createExecutionResult,
  verifyExecutionEvidence,
} from '@runalith/execution-evidence';

const request = createExecutionRequest({
  job_id: 'job_example',
  task_id: 'task_example',
  lease_id: 'lease_example',
  attempt: 1,
  role: 'engineer',
  input_commit: '0123456789abcdef0123456789abcdef01234567',
  task_payload_ref: 'task://job_example/task_example',
  workspace: '/workspace',
  required_evidence: ['task-payload.json', 'execution.json', 'stdout.txt', 'stderr.txt', 'git-status.txt'],
});

const result = createExecutionResult({
  job_id: request.job_id,
  task_id: request.task_id,
  lease_id: request.lease_id,
  attempt: request.attempt,
  status: 'SUCCEEDED',
  input_commit: request.input_commit,
  output_commit: 'fedcba9876543210fedcba9876543210fedcba98',
  exit_code: 0,
  provider_run_id: 'provider-run-123',
  evidence_artifact: 'artifact://provider-run-123/evidence',
  evidence_refs: ['task-payload.json', 'execution.json', 'stdout.txt', 'stderr.txt', 'git-status.txt'],
  started_at: '2026-11-13T08:00:00.000Z',
  finished_at: '2026-11-13T08:00:03.000Z',
  error: null,
});

const verification = verifyExecutionEvidence({
  result,
  evidence: {
    'task-payload.json': {
      schema_version: 1,
      job_id: request.job_id,
      task_id: request.task_id,
      lease_id: request.lease_id,
      attempt: request.attempt,
      required_evidence: result.evidence_refs,
    },
    'execution.json': { task_id: request.task_id, exit_code: 0, timed_out: false },
    'stdout.txt': 'P4_OK\n',
    'stderr.txt': '',
    'git-status.txt': '',
  },
});

if (!verification.valid) {
  throw new Error(verification.errors.join('; '));
}
~~~

The example illustrates structural validation only. A production host should normally supply exact raw bytes and an independently trusted input-commit anchor.

## Raw evidence verification

For raw verification, the host supplies:
- decoded result object;
- parsed evidence object;
- exact raw byte views keyed by evidence filename;
- requireRawEvidenceBytes: true;
- trustedInputCommit from the immutable dispatch/plan context.

The verifier snapshots the supplied byte views before checking them. It rejects proxy objects, unsupported prototypes, unsafe object properties, cycles, excessive nesting, sparse arrays, oversized JSON and excessive evidence byte/file counts.

The raw evidence contract binds:
- result.json to the supplied result representation;
- task-payload.json to job/task/lease/attempt and required evidence references;
- execution.json to task identity and worker-reported output metadata;
- stdout.txt and stderr.txt to exact byte counts and SHA-256 digests;
- git-status.txt to exact byte count and SHA-256 digest.

A successful raw evidence check requires a trustedInputCommit anchor supplied independently by the host. Do not derive that anchor from result.json or execution.json.

Default bounds:
- MAX_RAW_EVIDENCE_BYTES: 16 MiB aggregate.
- Evidence file-count limit: 1024 files (internal bound; not a public constant).
- MAX_STRICT_JSON_BYTES: supplied by @runalith/workflow-contracts.

## Output commit provenance

When raw evidence is coherent, verifier reports:

~~~text
worker_reported_and_execution_json_bound_not_independently_attested
~~~

This classification is intentional. result.json and execution.json are worker-produced records. Matching hashes establish byte consistency between supplied files; they do not establish an independently trusted Git observation. A host must not promote this marker to “attested”, “verified by provider”, or equivalent. Independent provenance requires a separate trusted post-run observer or signed attestation contract.

The verifier rejects result/execution output_commit disagreement and missing/malformed execution output commit for successful raw evidence. If both worker-produced records are coherently substituted, this verifier cannot independently detect the lie; that limitation is part of the result semantics.

## API overview

- createExecutionRequest(input)
- createExecutionResult(input)
- validateExecutionRequest(value)
- validateExecutionResult(value)
- verifyExecutionEvidence(input)
- assertExecutionEvidence(input)
- isVerifiedSuccessfulLocalExecution(result, expectedTaskId)
- isSuccessfulLocalExecutionSummary(result, expectedTaskId)

See [API and contracts](docs/architecture.md) and the copied tests for exact validation behavior.

## Host ownership

Host must:
1. authenticate provider/runner context and bind it to the expected job/task/lease/attempt;
2. obtain artifact bytes from a trusted provider path and safely unpack them before verification;
3. supply trustedInputCommit from the immutable approved dispatch context;
4. persist the verifier result and raw artifacts under the appropriate Workflow/Execution transaction;
5. enforce policy for failure, timeout, unknown provider outcome, retry and terminalization.

A valid result means the supplied structures and bytes passed the checks implemented here. It does not authorize Workflow success or settle external effects.

## Development and validation

~~~sh
npm ci
npm run check
npm run test:packed-consumer
npm run pack:check
~~~

The copied regression suite covers request/result schema, immutable snapshots, raw evidence size limits, malformed/proxy/cyclic objects, duplicate-sensitive canonicalization, byte-view mutation races, stdout/stderr/git-status digests, trusted input anchor, and output-commit substitution.

CI runs Node.js 22 and 24 on Ubuntu. Tests use local values/byte buffers; they do not contact a provider or execute commands.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture and API](docs/architecture.md)
- [Host integration and evidence inputs](docs/integration.md)
- [Terminology](docs/terminology.md)
- [Source lineage and pinned dependencies](docs/source-lineage.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See LICENSE.
