import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import {
  ECDSACryptoService,
  VCIssuer,
  AccessControlCredentialSubject,
} from "@mrazakos/vc-ecdsa-crypto";
import { UserMetaData, VerifiableCredential } from "../types/types";
import {
  AccessCredential,
  CredentialType,
  IssuedCredential,
} from "../hooks/useVerifiableCredentials";

// Storage key for issued credentials (must match useVerifiableCredentials)
const ISSUED_CREDENTIALS_KEY = "@issued_credentials";

export interface IssueCredentialRequest {
  lockId: number;
  lockNickname: string;
  lockPublicKey: string;
  lockPrivateKey: string;
  userMetaData: UserMetaData;
  accessLevel?: "standard" | "admin";
  permissions?: string[];
  validUntil?: string; // ISO string format
  isOwner?: boolean; // Flag to identify owner credentials
}

export class CredentialService {
  private static instance: CredentialService;

  private constructor() {}

  static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService();
    }
    return CredentialService.instance;
  }

  /**
   * Generate a unique credential ID
   */
  private generateCredentialId(): string {
    return `vc:${uuidv4()}`;
  }

  /**
   * Issue a new credential with configurable access level
   */
  async issueCredential(
    request: IssueCredentialRequest
  ): Promise<IssuedCredential> {
    try {
      const credentialId = this.generateCredentialId();

      // Initialize services
      const crypto = new ECDSACryptoService();
      const issuer = new VCIssuer();

      // Hash the user data for privacy
      const userMetaDataHash = crypto.hash(
        JSON.stringify(request.userMetaData)
      );

      // Set default access level and permissions
      const accessLevel = request.accessLevel || "standard";
      const permissions =
        request.permissions ||
        (accessLevel === "admin" ? ["unlock", "reset"] : ["unlock"]);

      // Create credential subject with lock info
      const credentialSubject: AccessControlCredentialSubject = {
        id: `did:user:${userMetaDataHash.slice(0, 16)}`,
        userMetaDataHash: userMetaDataHash,
        lock: {
          id: request.lockId.toString(),
          name: request.lockNickname,
        },
        accessLevel: accessLevel,
        permissions: permissions,
      };

      // Create issuer identity
      const issuerInfo = {
        id: `did:lock:${request.lockId}`,
        name: request.lockNickname,
      };

      // Determine credential types
      const credentialTypes = ["LockAccessCredential"];
      if (request.isOwner || accessLevel === "admin") {
        credentialTypes.push("OwnerCredential");
      }

      // Issue the credential using the VCIssuer API
      const credential = await issuer.issueOffChainCredential(
        issuerInfo,
        credentialSubject,
        request.lockPrivateKey,
        {
          publicKey: request.lockPublicKey,
          credentialTypes: credentialTypes,
          credentialId: credentialId,
          validityDays: request.validUntil
            ? Math.max(
                1,
                Math.ceil(
                  (new Date(request.validUntil).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : undefined, // No expiration if not specified
        }
      );

      // Create the issued credential with full userMetaData
      const issuedCredential: IssuedCredential = {
        ...credential,
        credentialSubject:
          credential.credentialSubject as AccessControlCredentialSubject,
        id: credentialId,
        credentialType: CredentialType.ISSUED,
        userMetaData: request.userMetaData,
        isOwner: request.isOwner || false, // Set owner flag
        // Backward compatibility fields
        lockId: request.lockId,
        lockNickname: request.lockNickname,
      };

      return issuedCredential;
    } catch (err) {
      console.error("Failed to issue credential:", err);
      throw new Error(
        `Failed to issue credential: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Store an issued credential in AsyncStorage
   */
  async storeIssuedCredential(
    credential: IssuedCredential
  ): Promise<IssuedCredential[]> {
    try {
      // Load existing credentials
      const storedData = await AsyncStorage.getItem(ISSUED_CREDENTIALS_KEY);
      const existingCredentials: IssuedCredential[] = storedData
        ? JSON.parse(storedData)
        : [];

      // Add new credential
      const updatedCredentials = [...existingCredentials, credential];

      // Save to storage
      await AsyncStorage.setItem(
        ISSUED_CREDENTIALS_KEY,
        JSON.stringify(updatedCredentials)
      );

      return updatedCredentials;
    } catch (err) {
      console.error("Failed to store credential:", err);
      throw new Error("Failed to store credential");
    }
  }

  /**
   * Issue and store a credential in one operation
   */
  async issueAndStoreCredential(
    request: IssueCredentialRequest
  ): Promise<IssuedCredential> {
    const credential = await this.issueCredential(request);
    await this.storeIssuedCredential(credential);
    return credential;
  }

  /**
   * Get all stored issued credentials
   */
  async getStoredIssuedCredentials(): Promise<IssuedCredential[]> {
    try {
      const storedData = await AsyncStorage.getItem(ISSUED_CREDENTIALS_KEY);
      return storedData ? JSON.parse(storedData) : [];
    } catch (err) {
      console.error("Failed to get stored credentials:", err);
      return [];
    }
  }

  /**
   * Remove credentials for a specific lock (used for rollback)
   */
  async removeCredentialsByLockId(lockId: number): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(ISSUED_CREDENTIALS_KEY);
      if (storedData) {
        const credentials: IssuedCredential[] = JSON.parse(storedData);
        const filteredCredentials = credentials.filter(
          (cred) => cred.lockId !== lockId
        );
        await AsyncStorage.setItem(
          ISSUED_CREDENTIALS_KEY,
          JSON.stringify(filteredCredentials)
        );
      }
    } catch (err) {
      console.error("Failed to remove credentials by lock ID:", err);
      throw new Error("Failed to remove credentials");
    }
  }

  /**
   * Issue owner admin credential for a lock
   */
  async issueOwnerCredential(
    lockId: number,
    lockName: string,
    lockPublicKey: string,
    lockPrivateKey: string,
    ownerAddress: string
  ): Promise<IssuedCredential> {
    const ownerMetaData: UserMetaData = {
      email: ownerAddress,
      name: "Lock Owner",
    };

    return this.issueAndStoreCredential({
      lockId,
      lockNickname: lockName,
      lockPublicKey,
      lockPrivateKey,
      userMetaData: ownerMetaData,
      accessLevel: "admin",
      permissions: ["unlock", "reset"],
      isOwner: true,
    });
  }
  getCleanCredential(
    credential: IssuedCredential | AccessCredential
  ): VerifiableCredential {
    const cleanCredential: any = {
      "@context": credential["@context"],
      id: credential.id,
      type: credential.type,
      issuer: credential.issuer,
      credentialSubject: credential.credentialSubject,
      proof: credential.proof,
    };

    // Add optional W3C standard fields if they exist
    if (credential.validFrom) {
      cleanCredential.validFrom = credential.validFrom;
    }
    if (credential.validUntil) {
      cleanCredential.validUntil = credential.validUntil;
    }

    return cleanCredential as VerifiableCredential;
  }

  /**
   * Check if a credential is an owner credential
   */
  isOwnerCredential(credential: IssuedCredential): boolean {
    const subject = Array.isArray(credential.credentialSubject)
      ? credential.credentialSubject[0]
      : credential.credentialSubject;

    return (
      credential.isOwner === true ||
      (subject.accessLevel === "admin" &&
        (credential.type?.includes("OwnerCredential") || false))
    );
  }

  /**
   * Get the owner credential for a specific lock
   */
  async getOwnerCredentialForLock(
    lockId: number
  ): Promise<IssuedCredential | null> {
    try {
      const credentials = await this.getStoredIssuedCredentials();
      const ownerCredential = credentials.find(
        (cred) => cred.lockId === lockId && this.isOwnerCredential(cred)
      );
      return ownerCredential || null;
    } catch (err) {
      console.error("Failed to get owner credential:", err);
      return null;
    }
  }

  /**
   * Check if an owner credential exists for a lock
   */
  async hasOwnerCredential(lockId: number): Promise<boolean> {
    const ownerCred = await this.getOwnerCredentialForLock(lockId);
    return ownerCred !== null;
  }
}
