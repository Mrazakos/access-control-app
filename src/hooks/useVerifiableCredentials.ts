import { useState, useCallback, useEffect, useMemo } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { Address as ViemAddress } from "viem";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { CryptoUtils } from "../utils/CryptoUtils";
import { AccessControl__factory } from "../typechain-types/factories/contracts/AccessControl__factory";
import { VerifiableCredential, UserMetaData } from "../types/types";

// Contract configuration
const CONTRACT_ADDRESS = (process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as ViemAddress;

// 📋 Credential Types
export enum CredentialType {
  ISSUED = "issued", // VCs you issued to others (as lock owner)
  ACCESS = "access", // VCs others issued to you (for door access)
}

// 🔐 Extended VerifiableCredential with type classification
export interface TypedVerifiableCredential extends VerifiableCredential {
  type: CredentialType;
}

// 🏭 ISSUED CREDENTIAL - Stores full user metadata
export interface IssuedCredential extends TypedVerifiableCredential {
  type: CredentialType.ISSUED;
  userMetaData: UserMetaData; // Store full user metadata for issued credentials
}

// 🚪 ACCESS CREDENTIAL - Stores only user metadata hash
export interface AccessCredential extends TypedVerifiableCredential {
  type: CredentialType.ACCESS;
  // userMetaDataHash is already in base VerifiableCredential
}

export interface RevokeSignatureRequest {
  lockId: number;
  signature: string;
}

export interface CredentialRequest {
  lockId: number;
  lockNickname: string;
  userMetaData: UserMetaData;
  privK: string;
  expirationDate?: string; // ISO string format
}

export interface UseVerifiableCredentialsReturn {
  // 📋 All credentials (both types)
  allCredentials: (IssuedCredential | AccessCredential)[];
  isLoading: boolean;
  error: string | null;

  // 🏭 ISSUED CREDENTIALS (VCs you issued to others - stores full userMetaData)
  issuedCredentials: IssuedCredential[];
  issueCredential: (request: CredentialRequest) => Promise<IssuedCredential>;
  getIssuedCredentials: () => Promise<IssuedCredential[]>;
  getIssuedCredentialsByLockId: (lockId: number) => Promise<IssuedCredential[]>;

  // 🚪 ACCESS VCs (VCs others issued to you - stores only userMetaDataHash)
  accessCredentials: AccessCredential[];
  filteredAccessCredentials: AccessCredential[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  receiveAccessCredential: (credential: VerifiableCredential) => Promise<void>;
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

  // 🔐 Signature revocation on blockchain (for issued credentials)
  revokeIssuedCredential: (credentialId: string) => Promise<void>;
  batchRevokeSignatures: (
    lockId: number,
    signatures: string[]
  ) => Promise<void>;
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
      if (!credential.expirationDate) {
        return false; // No expiration date means it doesn't expire
      }

      const expirationDate = new Date(credential.expirationDate);
      return expirationDate < new Date();
    },
    []
  );

  // 🏭 Issue a new credential (stores full userMetaData)
  const issueCredential = useCallback(
    async (request: CredentialRequest): Promise<IssuedCredential> => {
      try {
        setIsLoading(true);
        setError(null);

        const credentialId = generateCredentialId();
        const issuanceDate = new Date().toISOString();

        // Hash the user data for privacy (user data won't be revealed)
        const userDataHash = CryptoUtils.hash(
          JSON.stringify(request.userMetaData)
        );

        // Sign a message containing the user data hash + expiration date
        // This way user data stays private but expiration is cryptographically protected
        const message = JSON.stringify({
          userDataHash: userDataHash,
          expirationDate: request.expirationDate || null,
        });
        const vc = await CryptoUtils.sign(message, request.privK);

        if (!vc.signature) {
          throw new Error("Failed to generate credential signature");
        }

        if (!vc.signature || !vc.signedMessageHash) {
          throw new Error("Failed to generate credential signature or hash");
        }

        // Create the issued credential with full userMetaData
        const issuedCredential: IssuedCredential = {
          id: credentialId,
          lockId: request.lockId,
          signedMessageHash: vc.signedMessageHash,
          lockNickname: request.lockNickname,
          signature: vc.signature,
          userDataHash: userDataHash, // Include the hash for verification
          issuanceDate: issuanceDate,
          expirationDate: request.expirationDate,
          type: CredentialType.ISSUED,
          userMetaData: request.userMetaData, // Store full metadata for issued credentials
        };

        // Store in issued credentials
        const updatedCredentials = [...issuedCredentials, issuedCredential];
        await AsyncStorage.setItem(
          ISSUED_CREDENTIALS_KEY,
          JSON.stringify(updatedCredentials)
        );
        setIssuedCredentials(updatedCredentials);

        return issuedCredential;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to issue credential";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [generateCredentialId, issuedCredentials]
  );

  // 🚪 Receive an access credential (stores only userMetaDataHash)
  const receiveAccessCredential = useCallback(
    async (credential: VerifiableCredential): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Create an access credential (only stores userMetaDataHash)
        const accessCredential: AccessCredential = {
          ...credential,
          type: CredentialType.ACCESS,
          // Note: Only userMetaDataHash is stored, not full userMetaData
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

        // Find the credential to get its signature and lockId
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

        // First, revoke the signature on the blockchain
        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "revokeSignature",
          args: [
            BigInt(credentialToRevoke.lockId),
            credentialToRevoke.signature,
          ],
        });

        console.log("� Signature revocation submitted to blockchain");

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
    [issuedCredentials, address, writeContract]
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

  // 🔐 Batch revoke signatures on blockchain
  const batchRevokeSignatures = useCallback(
    async (lockId: number, signatures: string[]): Promise<void> => {
      try {
        setError(null);

        if (!address) {
          throw new Error("Wallet not connected");
        }

        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "batchRevokeSignatures",
          args: [BigInt(lockId), signatures],
        });

        console.log("🚫 Batch signature revocation submitted to blockchain");
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to batch revoke signatures on chain";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [writeContract, address]
  );

  return {
    // 📋 All credentials (both types)
    allCredentials,
    isLoading,
    error,

    // 🏭 ISSUED CREDENTIALS (VCs you issued to others - stores full userMetaData)
    issuedCredentials,
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

    // 🔐 Signature revocation on blockchain (for issued credentials)
    revokeIssuedCredential,
    batchRevokeSignatures,
    isTransactionPending,
    transactionHash: transactionHash || null,
    transactionError,
  };
};
