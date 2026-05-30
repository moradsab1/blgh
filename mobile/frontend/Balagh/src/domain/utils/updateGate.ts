// HTTP 426 "Upgrade Required" is the backend's signal that the client is too
// old to talk to the API safely. When a mutation comes back 426, the app shows
// a non-dismissable update gate (§14 Phase 6 / data contract §10).
//
// Pure helper so the gating decision is unit-testable without a backend.
export const UPDATE_REQUIRED_STATUS = 426;

export function shouldGateForStatus(status: number): boolean {
  return status === UPDATE_REQUIRED_STATUS;
}
