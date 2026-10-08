export interface PurposeRoutedProposalInput {
  systemId: string;
  workspaceId: string;
  scope: string;
  text: string;
}

export interface PurposeConfirmationInput {
  systemId: string;
  workspaceId: string;
  scope: string;
  routedEnvelope: Record<string, unknown>;
  grantedBy: string;
  confirmedAt: string;
}

export interface PurposeApplicationInput {
  systemId: string;
  workspaceId: string;
  scope: string;
  confirmedEnvelope: Record<string, unknown>;
}

/**
 * Product-shell port into the accepted canonical Gateway Phase 8 path.
 * Canonical Gateway owns classification, routing, confirmation proof,
 * owner-native execution, idempotency, and owner-backed mutation receipts.
 */
export interface PurposeMutationBridge {
  proposeOwnerRoutedChange(input: PurposeRoutedProposalInput): unknown;
  confirmOwnerRoutedChange(input: PurposeConfirmationInput): unknown;
  applyConfirmedOwnerChange(input: PurposeApplicationInput): unknown;
}
