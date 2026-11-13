# Security Policy

Report vulnerabilities privately through GitHub Security Advisories for nplongx/execution-evidence. Do not publish exploit details before maintainers assess impact.

## Security scope

Execution Evidence processes potentially untrusted worker/provider metadata and raw bytes. It is a bounded validator, not a sandbox, provider authenticator, signature verifier, or security certification.

## Host-owned trust

The host must:
- authenticate provider/runner context independently;
- bind result job/task/lease/attempt to the active immutable dispatch;
- obtain trustedInputCommit from host-controlled immutable plan/dispatch state;
- securely retrieve and unpack provider artifacts before passing raw bytes;
- enforce archive path, symlink, duplicate-entry, decompression, file-count and size defenses;
- decide whether worker-reported evidence is sufficient for the business action;
- persist verification outcomes under Workflow/Execution transaction and lease fences.

Do not derive expected identity or trusted input commit from the same untrusted evidence being verified.

## Output commit is not independently attested

The verifier reports worker_reported_and_execution_json_bound_not_independently_attested. result.json and execution.json may both originate from the same worker. A matching digest/field binding proves consistency of supplied bytes, not independent observation of a Git repository or authorship.

A coordinated substitution of result.json and execution.json can remain internally consistent. This package intentionally does not label that as independent verification. A stronger assurance model requires an independent trusted observer, signed attestation, or provider-authenticated provenance channel designed by the host.

## Bounded input handling

The verifier enforces raw byte/file-count limits, bounded strict JSON, safe canonical values, and SHA-256/byte-count checks. It rejects proxy objects, cycles, excessive nesting, non-plain prototypes, accessor properties, sparse arrays and unstable/malformed values.

These controls reduce memory exhaustion and parser/canonicalization abuse. They do not make arbitrary archive extraction safe; host must parse archives defensively before calling this package.

## No state mutation

The package does not persist rows, append Workflow events, settle leases, or mark tasks successful. A valid result is input to a separate host policy/transaction. Never treat verifier.valid as permission to bypass current Workflow state or lease checks.

## Supported use

Use only inside a trusted execution host. Do not expose raw verification endpoints directly to untrusted network callers without a separate authenticated, bounded API layer.
