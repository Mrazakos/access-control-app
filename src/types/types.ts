// ============================================================================
// APPLICATION-SPECIFIC TYPES
// ============================================================================

/**
 * Represents a verifiable credential containing user metadata
 */
export interface VerifiableCredential {
  signedMessageHash: string; // hash of the message containing userDataHash + expiration date
  lockId: number;
  lockNickname: string;
  signature: string;
  userDataHash: string; // hash of the user metadata for privacy protection
  expirationDate?: string; // ISO string format
  issuanceDate?: string; // ISO string format
  id?: string; // Unique identifier for the credential
}

/**
 * User metadata (stored locally, never sent to blockchain)
 */
export interface UserMetaData {
  email: string;
  name?: string;
}
