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

/**
 * Product-shell port into the accepted canonical Gateway Phase 8 path.
 * Dashboard supplies exact scope, exact routed proposal, and explicit user act.
 * The bridge owns proposal fingerprinting and canonical confirmation validation.
 */
export interface PurposeMutationBridge {
  proposeOwnerRoutedChange(input: PurposeRoutedProposalInput): unknown;
  confirmOwnerRoutedChange(input: PurposeConfirmationInput): unknown;
}
