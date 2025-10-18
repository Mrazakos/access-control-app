// ============================================================================
// CRYPTO-RELATED TYPES (For future extraction into separate module)
// ============================================================================

/**
 * Represents a cryptographic key pair
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Represents a hash value
 */
export type Hash = string;

/**
 * Represents an Ethereum-style address
 */
export type Address = string;

/**
 * Input type for signing a Verifiable Credential
 * Contains the essential data that needs to be cryptographically signed
 */
export interface VCSigningInput {
  userMetaDataHash: string; // Hash of the user metadata for privacy protection
  issuanceDate: string; // ISO string format
  expirationDate?: string; // ISO string format (optional)
}

/**
 * Result of a signing operation
 * Contains the signature and the hash that was signed
 */
export interface SigningResult {
  signature: string;
  signedMessageHash: string;
}

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
