/** Public API for the standalone Execution Evidence package. */
export {
  ExecutionContractVersion,
  ExecutionResultStatus,
  createExecutionRequest,
  createExecutionResult,
  validateExecutionRequest,
  validateExecutionResult
} from './src/runtime/execution-contract.js';

export {
  MAX_RAW_EVIDENCE_BYTES,
  verifyExecutionEvidence,
  assertExecutionEvidence
} from './src/runtime/execution-verifier.js';

export {
  isVerifiedSuccessfulLocalExecution,
  isSuccessfulLocalExecutionSummary
} from './src/runtime/execution-evidence.js';

export { MAX_STRICT_JSON_BYTES } from '@runalith/workflow-contracts';
