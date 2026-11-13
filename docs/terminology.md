# Terminology

| Term | Meaning |
|---|---|
| Execution request | Versioned input contract binding job/task/lease/attempt and requested execution context. |
| Execution result | Versioned result envelope describing status, commits, exit code, provider run and evidence references. |
| Evidence object | Parsed representation supplied by the host for validation. |
| Raw evidence bytes | Exact provider/runner artifact file bytes before text/JSON decoding. |
| Trusted input commit | Host-supplied commit identity derived from immutable dispatch/plan context, not the result envelope. |
| Evidence hash | Deterministic content digest of the validated evidence representation/bytes. |
| Output commit | Worker-reported post-execution Git commit value contained in result and execution evidence. |
| Output-commit provenance | Classification of what the verifier established about the output commit; not a signature or independent attestation. |
| Provider run | External execution identifier reported by a host/provider adapter. |

## Status and validity

- A request/result passing COS-AP validation means it conforms to the versioned envelope rules.
- valid=true means the supplied evidence satisfied this verifier's structural, byte and binding checks.
- valid=false means one or more checks failed; errors list the discovered mismatches.
- A thrown TypeError may represent malformed in-memory values, proxy/prototype abuse or exceeded bounds.
- A verified evidence object is not a Workflow authorization decision.

## Provenance wording

worker_reported_and_execution_json_bound_not_independently_attested means result.json and execution.json agree on output commit and relevant byte metadata, but are both worker-produced claims. It must never be shortened to independently verified or attested.

A content digest establishes byte identity under the implemented canonicalization. It does not establish authorship, truth, custody, provider identity, authorization or remote execution.
