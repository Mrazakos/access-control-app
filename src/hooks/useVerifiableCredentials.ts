import { useState, useCallback, useEffect, useMemo } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { Address as ViemAddress } from "viem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { VCRevoke } from "@mrazakos/vc-ecdsa-crypto";
import { AccessControl__factory } from "../typechain-types/factories/contracts/AccessControl__factory";
import { VerifiableCredential, UserMetaData } from "../types/types";
import { environment } from "../config/environment";
import { LockService } from "../services/LockService";
import { CredentialService } from "../services/CredentialService";
import { AccessLevel } from "../enums/accessLevels";
import { Permissions } from "../enums/permissions";
import { CredentialType } from "../enums/credentialType";

// Contract configuration - uses environment-based contract address
const CONTRACT_ADDRESS = (environment.network.contractAddress ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as ViemAddress;

console.log(
  `📝 Using contract address: ${CONTRACT_ADDRESS} (${environment.network.chainName})`
);

// 🔐 Extended VerifiableCredential with type classification
export interface TypedVerifiableCredential extends VerifiableCredential {
  credentialType: CredentialType; // Renamed from 'type' to avoid conflict with W3C type
}

// 🏭 ISSUED CREDENTIAL - Stores full user metadata
export interface IssuedCredential extends TypedVerifiableCredential {
  credentialType: CredentialType.ISSUED;
  userMetaData: UserMetaData; // Store full user metadata for issued credentials
  isOwner?: boolean; // Flag to identify owner credentials
}

// 🚪 ACCESS CREDENTIAL - Stores only user metadata hash
export interface AccessCredential extends TypedVerifiableCredential {
  credentialType: CredentialType.ACCESS;
  // userMetaDataHash is already in base VerifiableCredential
}

export interface QrCodeCredential extends AccessCredential {
  qrExpiresAt: string; // ISO string
}

export interface RevokeSignatureRequest {
  lockId: number;
  signature: string;
}

export interface CredentialRequest {
  lockId: number;
  lockNickname: string;
  userMetaData: UserMetaData;
  pubk: string;
  privK: string;
  validUntil?: string; // ISO string format
}

export interface UseVerifiableCredentialsReturn {
  // 📋 All credentials (both types)
  allCredentials: (IssuedCredential | AccessCredential)[];
  isLoading: boolean;
  error: string | null;

  // 🏭 ISSUED CREDENTIALS (VCs you issued to others - stores full userMetaData)
  issuedCredentials: IssuedCredential[];
  issueOwnerCredential: (
    request: CredentialRequest
  ) => Promise<IssuedCredential>;
  issueCredential: (request: CredentialRequest) => Promise<IssuedCredential>;
  getIssuedCredentials: () => Promise<IssuedCredential[]>;
  getIssuedCredentialsByLockId: (lockId: number) => Promise<IssuedCredential[]>;

  // 🚪 ACCESS VCs (VCs others issued to you - stores only userMetaDataHash)
  accessCredentials: AccessCredential[];
  filteredAccessCredentials: AccessCredential[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  receiveAccessCredential: (credential: QrCodeCredential) => Promise<void>;
  getAccessCredentials: () => Promise<AccessCredential[]>;
  getValidAccessCredentials: () => Promise<AccessCredential[]>;
  getAccessCredentialsByLockId: (lockId: number) => Promise<AccessCredential[]>;
  deleteAccessCredential: (credentialId: string) => Promise<void>;

  // 🔄 General operations
  refreshIssuedCredentials: () => Promise<void>;
  refreshAccessCredentials: () => Promise<void>;

  getCredentialById: (
    id: string
  ) => Promise<IssuedCredential | AccessCredential | null>;
  isCredentialExpired: (credential: VerifiableCredential) => boolean;
  clearAllCredentials: () => Promise<void>;

  // 🧹 Utility: Get clean W3C credential (removes extra fields added after signing)
  getCleanCredential: (
    credential: IssuedCredential | AccessCredential
  ) => VerifiableCredential;

  // 🔐 Signature revocation on blockchain (for issued credentials)
  revokeIssuedCredential: (credentialId: string) => Promise<void>;
  isTransactionPending: boolean;
  transactionHash: string | null;
  transactionError: string | null;
} // Separate storage keys for different credential types
const ISSUED_CREDENTIALS_KEY = "@issued_credentials";
const ACCESS_CREDENTIALS_KEY = "@access_credentials";

export const useVerifiableCredentials = (): UseVerifiableCredentialsReturn => {
  const [issuedCredentials, setIssuedCredentials] = useState<
    IssuedCredential[]
  >([]);
  const [accessCredentials, setAccessCredentials] = useState<
    AccessCredential[]
  >([]);
  const [filteredAccessCredentials, setFilteredAccessCredentials] = useState<
    AccessCredential[]
  >([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();

  // Wagmi hooks for blockchain operations
  const {
    writeContract,
    data: transactionHash,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();

  const isTransactionPending = isWritePending;
  const transactionError = writeError?.message || null;

  // Update filtered credentials whenever accessCredentials or searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAccessCredentials(accessCredentials);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = accessCredentials.filter((cred) => {
      const lockName = cred.lockNickname?.toLowerCase() || "";
      const lockId = cred.lockId?.toString() || "";
      return lockName.includes(query) || lockId.includes(query);
    });
    setFilteredAccessCredentials(filtered);
  }, [accessCredentials, searchQuery]);

  // Generate a unique credential ID using UUID v4
  const generateCredentialId = useCallback((): string => {
    return `vc:${uuidv4()}`;
  }, []);

  // Check if a credential is expired
  const isCredentialExpired = useCallback(
    (credential: VerifiableCredential): boolean => {
      if (!credential.validUntil) {
        return false; // No expiration date means it doesn't expire
      }

      const expirationDate = new Date(credential.validUntil);
      return expirationDate < new Date();
    },
    []
  );

  // 🧹 Get clean W3C credential (removes extra fields added after signing)
  // This is critical for signature verification - extra fields break verification
  const getCleanCredential = useCallback(
    (credential: IssuedCredential | AccessCredential): VerifiableCredential => {
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
    },
    []
  );

  const issueOwnerCredential = useCallback(
    async (request: CredentialRequest): Promise<IssuedCredential> => {
      try {
        setIsLoading(true);
        setError(null);

        // Use CredentialService to issue and store owner credential
        const credentialService = CredentialService.getInstance();
        const credential = await credentialService.issueAndStoreCredential({
          lockId: request.lockId,
          lockNickname: request.lockNickname,
          lockPublicKey: request.pubk,
          lockPrivateKey: request.privK,
          userMetaData: request.userMetaData,
          accessLevel: AccessLevel.ADMIN,
          permissions: [Permissions.UNLOCK, Permissions.RESET],
          isOwner: true,
          validUntil: request.validUntil,
        });

        // Update state
        const updatedCredentials =
          await credentialService.getStoredIssuedCredentials();
        setIssuedCredentials(updatedCredentials);

        return credential;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to issue credential";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );
  // 🏭 Issue a new credential (stores full userMetaData)
  const issueCredential = useCallback(
    async (request: CredentialRequest): Promise<IssuedCredential> => {
      try {
        setIsLoading(true);
        setError(null);

        // Use CredentialService to issue and store credential
        const credentialService = CredentialService.getInstance();
        const credential = await credentialService.issueAndStoreCredential({
          lockId: request.lockId,
          lockNickname: request.lockNickname,
          lockPublicKey: request.pubk,
          lockPrivateKey: request.privK,
          userMetaData: request.userMetaData,
          accessLevel: AccessLevel.STANDARD, // Default for regular issued credentials
          permissions: [Permissions.UNLOCK],
          validUntil: request.validUntil,
        });

        // Update state
        const updatedCredentials =
          await credentialService.getStoredIssuedCredentials();
        setIssuedCredentials(updatedCredentials);

        return credential;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to issue credential";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 🚪 Receive an access credential (stores only userMetaDataHash)
  const receiveAccessCredential = useCallback(
    async (credential: QrCodeCredential): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if QR code has expired
        if (credential.qrExpiresAt) {
          const expiresAt = new Date(credential.qrExpiresAt as string);
          const now = new Date();

          if (expiresAt < now) {
            throw new Error(
              "This QR code has expired. Please request a new one from the lock owner."
            );
          }
        }

        // Create an access credential (only stores userMetaDataHash)
        // Remove qrExpiresAt before storing as it's only for QR validation
        const { qrExpiresAt, ...credentialWithoutQrData } = credential;
        const accessCredential: AccessCredential = {
          ...credentialWithoutQrData,
          credentialType: CredentialType.ACCESS,
        };

        // Check if credential already exists
        const existingIndex = accessCredentials.findIndex(
          (c) => c.id === credential.id
        );

        let updatedCredentials: AccessCredential[];
        if (existingIndex >= 0) {
          // Update existing credential
          updatedCredentials = [...accessCredentials];
          updatedCredentials[existingIndex] = accessCredential;
        } else {
          // Add new credential
          updatedCredentials = [...accessCredentials, accessCredential];
        }

        setAccessCredentials(updatedCredentials);
        await AsyncStorage.setItem(
          ACCESS_CREDENTIALS_KEY,
          JSON.stringify(updatedCredentials)
        );

        console.log("✅ Access credential received:", credential.id);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to receive access credential";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [accessCredentials]
  );

  // 🔍 Load credentials from AsyncStorage
  const loadAccessCredentials = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Load access credentials
      const accessData = await AsyncStorage.getItem(ACCESS_CREDENTIALS_KEY);
      const storedAccessCredentials: AccessCredential[] = accessData
        ? JSON.parse(accessData)
        : [];

      setAccessCredentials(storedAccessCredentials);
    } catch (err) {
      const errorMsg = "Failed to load credentials";
      setError(errorMsg);
      console.error(errorMsg, err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const loadIssuedCredentials = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Load issued credentials
      const issuedData = await AsyncStorage.getItem(ISSUED_CREDENTIALS_KEY);
      const storedIssuedCredentials: IssuedCredential[] = issuedData
        ? JSON.parse(issuedData)
        : [];

      setIssuedCredentials(storedIssuedCredentials);
    } catch (err) {
      const errorMsg = "Failed to load issued credentials";
      setError(errorMsg);
      console.error(errorMsg, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load access credentials on mount
  useEffect(() => {
    loadAccessCredentials();
  }, [loadAccessCredentials]);

  // Load issued credentials on mount
  useEffect(() => {
    loadIssuedCredentials();
  }, [loadIssuedCredentials]);

  // 🔍 Helper functions for issued credentials
  const getIssuedCredentials = useCallback(async (): Promise<
    IssuedCredential[]
  > => {
    return issuedCredentials;
  }, [issuedCredentials]);

  const getIssuedCredentialsByLockId = useCallback(
    async (lockId: number): Promise<IssuedCredential[]> => {
      return issuedCredentials.filter((c) => c.lockId === lockId);
    },
    [issuedCredentials]
  );

  const revokeIssuedCredential = useCallback(
    async (credentialId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Find the credential to revoke
        const credentialToRevoke = issuedCredentials.find(
          (c) => c.id === credentialId
        );

        if (!credentialToRevoke) {
          throw new Error("Credential not found");
        }

        if (!address) {
          throw new Error("Wallet not connected");
        }

        console.log("🚫 Revoking credential on blockchain:", credentialId);

        // Get lock info from credential subject (handle both single and array cases)
        const subject = Array.isArray(credentialToRevoke.credentialSubject)
          ? credentialToRevoke.credentialSubject[0]
          : credentialToRevoke.credentialSubject;

        if (!subject.lock) {
          throw new Error("Credential does not have lock information");
        }

        // Get the lock's private key and address to sign the revocation
        const lock = await LockService.getInstance().getLockById(
          parseInt(subject.lock.id)
        );

        if (!lock) {
          throw new Error("Lock not found");
        }

        // Get clean credential (remove extra fields before converting to on-chain)
        const cleanCredential = getCleanCredential(credentialToRevoke);

        // Use VCRevoke to convert the off-chain VC to on-chain format
        const vcRevoke = new VCRevoke();
        const onChainVC = await vcRevoke.convertToOnChain(
          cleanCredential,
          lock.privateKey,
          lock.address
        );

        // Get the credential hash (same for both off-chain and on-chain)
        const vcHash = vcRevoke.getCredentialHash(onChainVC);

        // Get the on-chain signature from the proof
        const signature = Array.isArray(onChainVC.proof)
          ? onChainVC.proof[0].proofValue
          : onChainVC.proof.proofValue;

        const lockId = BigInt(subject.lock.id);

        console.log("🚫 Revoking with params:", {
          lockId: lockId.toString(),
          vcHash,
          signature,
          lockAddress: lock.address,
        });

        // Revoke the credential on the blockchain
        // revokeCredential(uint256 lockId, bytes32 vcHash, bytes signature)
        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "revokeCredential",
          args: [lockId, vcHash as `0x${string}`, signature as `0x${string}`],
        });

        console.log("🚫 Credential revocation submitted to blockchain");

        // Remove from local storage after blockchain transaction is submitted
        const updatedCredentials = issuedCredentials.filter(
          (c) => c.id !== credentialId
        );
        setIssuedCredentials(updatedCredentials);

        await AsyncStorage.setItem(
          ISSUED_CREDENTIALS_KEY,
          JSON.stringify(updatedCredentials)
        );

        console.log("✅ Issued credential revoked successfully:", credentialId);
      } catch (err) {
        const errorMsg = "Failed to revoke issued credential";
        setError(errorMsg);
        console.error(errorMsg, err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [issuedCredentials, address, writeContract, getCleanCredential]
  );

  // 🔍 Helper functions for access credentials
  const getAccessCredentials = useCallback(async (): Promise<
    AccessCredential[]
  > => {
    return accessCredentials;
  }, [accessCredentials]);

  const getAccessCredentialsByLockId = useCallback(
    async (lockId: number): Promise<AccessCredential[]> => {
      return accessCredentials.filter((c) => c.lockId === lockId);
    },
    [accessCredentials]
  );

  const getValidAccessCredentials = useCallback(async (): Promise<
    AccessCredential[]
  > => {
    return accessCredentials.filter((c) => !isCredentialExpired(c));
  }, [accessCredentials, isCredentialExpired]);

  const deleteAccessCredential = useCallback(
    async (credentialId: string): Promise<void> => {
      try {
        setIsLoading(true);
        const updatedCredentials = accessCredentials.filter(
          (c) => c.id !== credentialId
        );
        setAccessCredentials(updatedCredentials);
        await AsyncStorage.setItem(
          ACCESS_CREDENTIALS_KEY,
          JSON.stringify(updatedCredentials)
        );
        console.log("✅ Access credential deleted:", credentialId);
      } catch (err) {
        setError("Failed to delete access credential");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [accessCredentials]
  );

  // 🔍 General helper functions
  const getCredentialById = useCallback(
    async (id: string): Promise<IssuedCredential | AccessCredential | null> => {
      const issued = issuedCredentials.find((c) => c.id === id);
      if (issued) return issued;

      const access = accessCredentials.find((c) => c.id === id);
      return access || null;
    },
    [issuedCredentials, accessCredentials]
  );

  const refreshAccessCredentials = useCallback(async (): Promise<void> => {
    await loadAccessCredentials();
  }, [loadAccessCredentials]);

  const refreshIssuedCredentials = useCallback(async (): Promise<void> => {
    await loadIssuedCredentials();
  }, [loadIssuedCredentials]);

  // Combined credentials for backward compatibility
  const allCredentials = useMemo((): (
    | IssuedCredential
    | AccessCredential
  )[] => {
    return [...issuedCredentials, ...accessCredentials];
  }, [issuedCredentials, accessCredentials]);

  // 🗑️ Clear all credentials
  const clearAllCredentials = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(ISSUED_CREDENTIALS_KEY);
      await AsyncStorage.removeItem(ACCESS_CREDENTIALS_KEY);
      setIssuedCredentials([]);
      setAccessCredentials([]);
      console.log("✅ All credentials cleared");
    } catch (err) {
      const errorMsg = "Failed to clear credentials";
      setError(errorMsg);
      console.error(errorMsg, err);
      throw err;
    }
  }, []);

  return {
    // 📋 All credentials (both types)
    allCredentials,
    isLoading,
    error,

    // 🏭 ISSUED CREDENTIALS (VCs you issued to others - stores full userMetaData)
    issuedCredentials,
    issueOwnerCredential,
    issueCredential,
    getIssuedCredentials,
    getIssuedCredentialsByLockId,

    // 🚪 ACCESS VCs (VCs others issued to you - stores only userMetaDataHash)
    accessCredentials,
    filteredAccessCredentials,
    searchQuery,
    setSearchQuery,
    receiveAccessCredential,
    getAccessCredentials,
    getValidAccessCredentials,
    getAccessCredentialsByLockId,
    deleteAccessCredential,

    // 🔄 General operations
    refreshIssuedCredentials,
    refreshAccessCredentials,
    getCredentialById,
    isCredentialExpired,
    clearAllCredentials,
    getCleanCredential,

    // 🔐 Signature revocation on blockchain (for issued credentials)
    revokeIssuedCredential,
    isTransactionPending,
    transactionHash: transactionHash || null,
    transactionError,
  };
};
