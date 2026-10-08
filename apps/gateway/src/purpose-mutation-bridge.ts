export interface PurposeRoutedProposalInput {
  systemId: string;
  workspaceId: string;
  scope: string;
  text: string;
}

/**
 * Product-shell port into the already accepted canonical Gateway Phase 8 path.
 * Dashboard supplies scope + user intent only. The implementation behind this
 * port owns proposal classification, current direction-owner read, and routing.
 */
export interface PurposeMutationBridge {
  proposeOwnerRoutedChange(input: PurposeRoutedProposalInput): unknown;
}
