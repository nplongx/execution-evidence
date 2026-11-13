# Source lineage and extraction boundary

## Upstream origin

The package was extracted from the Runalith source repository:

- Repository: https://github.com/nplongx/runalith
- Branch: integration/runalith-system-20261107
- Base revision: 29c24cfa2b6ead5704d26cf2746bc384f2938b80
- Selected source paths were clean before extraction.

## Included first-party source

- src/runtime/execution-contract.js
- src/runtime/execution-verifier.js
- src/runtime/execution-evidence.js

The package owns its root entrypoint, package manifest/lockfile, focused tests, scripts, CI, documentation, security policy, changelog and source manifest.

## Pinned external contracts

Dependencies are installed from immutable public GitHub archive tarballs:

| Package | Source repository | Commit |
|---|---|---|
| @runalith/cos-ap | nplongx/runalith-cos-ap | b6f2b51d549ba2f287ebd49d18ce29a212b2270a |
| @runalith/workflow-contracts | nplongx/runalith-workflow-contracts | 0419b17985500e3d9b3aa18e07c0b2f6b010070b |

COS-AP supplies durable Execution request/result validation. Workflow Contracts supplies bounded strict JSON parsing. These are public dependency packages; this repository does not import monolith internals.

## Deliberate exclusions

- ExecutionManager, RecoveryManager, DistributedScheduler, TaskLeaseManager, and process supervision remain in the host Execution Runtime.
- Provider artifact retrieval, ZIP/archive parsing, GitHub Actions API calls and runner/worker identity remain in host provider adapters.
- ExecutionStateStore, ExecutionStatePort, ExecutionStateParticipant, provider ledgers and Workflow transactions remain in their existing owners.
- No database, provider credentials, workspace files, command execution, tmux or deployment configuration is included.

## Independence and limits

The package has no database, filesystem, network or subprocess runtime dependency. It validates caller-supplied objects/bytes and returns deterministic validation output.

This is a narrow Execution Evidence package, not a complete Execution Runtime extraction. Host owns retrieval, identity, immutable dispatch context, result persistence, lease fencing, task terminalization and retry/unknown-outcome policy.

docs/source-manifest.json records SHA-256 and byte size for every package-owned file except the manifest itself. npm run check:manifest verifies exact file inventory and bytes; it does not query or compare the live upstream branch.
