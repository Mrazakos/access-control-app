/**
 * Represents a verifiable credential containing user metadata
 */
export interface VerifiableCredential {
  userMetaDataHash: string; // hash
  lockId: number;
  lockNickname: string;
  signature: string;
  expirationDate?: string; // ISO string format
  issuanceDate?: string; // ISO string format
  id?: string; // Unique identifier for the credential
}

export interface UserMetaData {
  email: string;
  name?: string;
  timeStamp: Date;
}

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
