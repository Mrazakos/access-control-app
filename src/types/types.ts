// ============================================================================
// APPLICATION-SPECIFIC TYPES
// ============================================================================

import {
  VerifiableCredential as BaseVerifiableCredential,
  AccessControlCredentialSubject,
} from "@mrazakos/vc-ecdsa-crypto";

/**
 * Extended Verifiable Credential for our access control application
 * Adds application-specific fields for local storage and backward compatibility
 */
export interface VerifiableCredential extends BaseVerifiableCredential {
  // Use AccessControlCredentialSubject from the library (can be single or array per W3C spec)
  credentialSubject:
    | AccessControlCredentialSubject
    | AccessControlCredentialSubject[];

  // Application-specific fields for local storage
  id?: string; // Unique identifier for local storage (UUID)

  // Backward compatibility fields (for migration)
  lockId?: number; // Deprecated: use credentialSubject.lock.id (or credentialSubject[0].lock.id if array)
  lockNickname?: string; // Deprecated: use credentialSubject.lock.name
}

/**
 * User metadata (stored locally, never sent to blockchain)
 */
export interface UserMetaData {
  email: string;
  name?: string;
}
