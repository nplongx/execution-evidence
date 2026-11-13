# Architecture and API

## Purpose

@runalith/execution-evidence contains pure Execution result contracts, canonical evidence handling, and raw-byte integrity verification. It is below provider retrieval, process supervision, Workflow persistence, lease management, and authorization.

## Component view

~~~mermaid
flowchart TD
  Host[Execution host / verifier caller] --> Context[Trusted dispatch context]
  Host --> Bytes[Provider artifact bytes]
  Context --> Verify[Execution Evidence API]
  Bytes --> Verify
  Verify --> Contract[Execution request/result contract]
  Verify --> Parse[Bounded strict JSON]
  Verify --> Hash[Canonical evidence + raw byte digests]
  Contract --> Result[Verification result and error list]
  Parse --> Result
  Hash --> Result
  Result --> HostDecision[Host-owned persistence and Workflow policy]
~~~

A successful return means only that the supplied request/result/evidence material passed this library's checks. It is not a provider authentication, signature verification, independent output attestation, Workflow success decision, or authorization to complete a task.

## Module map

| Module | Responsibility | Exclusion |
|---|---|---|
| index.js | Public exports for contracts, verifier and success predicates. | No host or storage adapters. |
| src/runtime/execution-contract.js | Versioned request/result creation, JSON-safe deep snapshot/freeze and COS-AP validation. | Does not allocate leases, persist attempts or authorize dispatch. |
| src/runtime/execution-verifier.js | Bounded evidence structure/raw-byte validation, canonical hashing, SHA-256/size binding and output-commit consistency. | Does not fetch, unzip, authenticate, persist or independently attest artifacts. |
| src/runtime/execution-evidence.js | Strict success predicates for local execution rows and local summaries. | Does not spawn or supervise processes. |

## Verification flow

1. The host obtains result metadata and exact evidence bytes from its provider/runner adapter.
2. The host supplies an independently trusted input commit from immutable dispatch context.
3. Execution contract validation checks the request/result envelope and field constraints.
4. Evidence verifier bounds object count, file count, raw bytes, JSON size, prototype depth and recursion.
5. It snapshots mutable byte views before hashing/decoding, rejecting proxies and unstable views.
6. It validates expected evidence references, exact bytes, SHA-256 values, execution metadata, output commit consistency, and successful-result conditions.
7. It returns an immutable summary with valid/errors/evidence_hash and an explicit output_commit_provenance marker when applicable.
8. Host persists the verification outcome and decides state transitions under Workflow/Execution transaction rules.

The verifier accepts evidence objects and raw byte maps. It does not read paths, retrieve HTTP responses, parse ZIP containers, or start subprocesses.

## Bounds and canonicalization

- Raw evidence aggregate: 16 MiB.
- Raw evidence file count: 1024.
- JSON payload bound: MAX_STRICT_JSON_BYTES from @runalith/workflow-contracts.
- Evidence nesting, node count, arrays, object properties, proxies, and byte views are validated before recursive canonicalization.
- Canonical evidence digest binds own properties, including an own __proto__ key, while rejecting non-JSON prototypes and accessor-backed values.
- Mutable ArrayBuffer/SharedArrayBuffer views are copied so digest and decoded representation use the same immutable snapshot.

## Output commit semantics

The verifier compares result.output_commit against execution.json output_commit and verifies successful raw evidence contains a Git commit SHA. It returns the fixed provenance value:

~~~text
worker_reported_and_execution_json_bound_not_independently_attested
~~~

This marker states exactly what the verifier proved. Both records may have been produced by the same worker. A coordinated replacement of result and execution metadata is not independently detectable without a separate trust anchor/attestation source.

For raw evidence verification, trustedInputCommit is mandatory and comes from host-owned dispatch context. A result/evidence self-declared input commit is not its own trust anchor.

## Dependency model

Runtime dependencies are two pinned public contracts:
- @runalith/cos-ap: versioned durable Execution request/result validation.
- @runalith/workflow-contracts: bounded strict JSON parsing and MAX_STRICT_JSON_BYTES.

No SQLite, WorkflowStore, ExecutionManager, provider client, filesystem or process-supervision dependency is included.
