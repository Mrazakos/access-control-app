import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CryptoUtils } from "../utils/CryptoUtils";
import { VerifiableCredential, UserMetaData } from "../types/types";

export interface CredentialRequest {
  lockId: number;
  lockNickname: string;
  userMetaData: UserMetaData;
  privK: string;
  expirationDate?: string; // ISO string format
}

export interface UseVerifiableCredentialsReturn {
  credentials: VerifiableCredential[];
  isLoading: boolean;
  error: string | null;
  issueCredential: (
    request: CredentialRequest
  ) => Promise<VerifiableCredential>;
  storeCredential: (credential: VerifiableCredential) => Promise<void>;
  getCredentials: () => Promise<VerifiableCredential[]>;
  getCredentialById: (id: string) => Promise<VerifiableCredential | null>;
  getCredentialsByLockId: (lockId: number) => Promise<VerifiableCredential[]>;
  deleteCredential: (id: string) => Promise<void>;
  refreshCredentials: () => Promise<void>;
  isCredentialExpired: (credential: VerifiableCredential) => boolean;
  getValidCredentials: () => Promise<VerifiableCredential[]>;
}

const STORAGE_KEY = "@verifiable_credentials";

export const useVerifiableCredentials = (): UseVerifiableCredentialsReturn => {
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a unique credential ID
  const generateCredentialId = useCallback((): string => {
    return `vc:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
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

  // Issue a new verifiable credential
  const issueCredential = useCallback(
    async (request: CredentialRequest): Promise<VerifiableCredential> => {
      try {
        setIsLoading(true);
        setError(null);

        const credentialId = generateCredentialId();
        const issuanceDate = new Date().toISOString();

        // Create user metadata hash using your existing crypto utilities
        const userMetaDataString = JSON.stringify(request.userMetaData);
        const vc = CryptoUtils.sign(userMetaDataString, request.privK);

        // Create the credential data for signing
        const fullVc = {
          ...vc,
          id: credentialId,
          lockId: request.lockId,
          lockNickname: request.lockNickname,
          issuanceDate: issuanceDate,
          expirationDate: request.expirationDate,
        } as VerifiableCredential;

        if (!vc.signature) {
          throw new Error("Failed to generate credential signature");
        }

        // Store the credential
        const existingCredentials = await getStoredCredentials();
        const updatedCredentials = [...existingCredentials, fullVc];
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedCredentials)
        );
        setCredentials(updatedCredentials);

        return fullVc;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to issue credential";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [generateCredentialId]
  );

  // Get stored credentials from AsyncStorage
  const getStoredCredentials = useCallback(async (): Promise<
    VerifiableCredential[]
  > => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : [];
    } catch (err) {
      console.error("Failed to retrieve stored credentials:", err);
      return [];
    }
  }, []);

  // Store a credential in local storage
  const storeCredential = useCallback(
    async (credential: VerifiableCredential): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const existingCredentials = await getStoredCredentials();

        // Check if credential already exists
        const existingIndex = existingCredentials.findIndex(
          (cred) => cred.id === credential.id
        );

        let updatedCredentials: VerifiableCredential[];
        if (existingIndex >= 0) {
          // Update existing credential
          updatedCredentials = [...existingCredentials];
          updatedCredentials[existingIndex] = credential;
        } else {
          // Add new credential
          updatedCredentials = [...existingCredentials, credential];
        }

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedCredentials)
        );
        setCredentials(updatedCredentials);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to store credential";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [getStoredCredentials]
  );

  // Get all credentials
  const getCredentials = useCallback(async (): Promise<
    VerifiableCredential[]
  > => {
    try {
      setIsLoading(true);
      setError(null);

      const storedCredentials = await getStoredCredentials();
      setCredentials(storedCredentials);
      return storedCredentials;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get credentials";
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getStoredCredentials]);

  // Get credential by ID
  const getCredentialById = useCallback(
    async (id: string): Promise<VerifiableCredential | null> => {
      try {
        const storedCredentials = await getStoredCredentials();
        return storedCredentials.find((cred) => cred.id === id) || null;
      } catch (err) {
        console.error("Failed to get credential by ID:", err);
        return null;
      }
    },
    [getStoredCredentials]
  );

  // Get credentials by lock ID
  const getCredentialsByLockId = useCallback(
    async (lockId: number): Promise<VerifiableCredential[]> => {
      try {
        const storedCredentials = await getStoredCredentials();
        return storedCredentials.filter((cred) => cred.lockId === lockId);
      } catch (err) {
        console.error("Failed to get credentials by lock ID:", err);
        return [];
      }
    },
    [getStoredCredentials]
  );

  // Get only valid (non-expired) credentials
  const getValidCredentials = useCallback(async (): Promise<
    VerifiableCredential[]
  > => {
    try {
      const storedCredentials = await getStoredCredentials();
      return storedCredentials.filter((cred) => !isCredentialExpired(cred));
    } catch (err) {
      console.error("Failed to get valid credentials:", err);
      return [];
    }
  }, [getStoredCredentials, isCredentialExpired]);

  // Delete a credential
  const deleteCredential = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const existingCredentials = await getStoredCredentials();
        const updatedCredentials = existingCredentials.filter(
          (cred) => cred.id !== id
        );

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(updatedCredentials)
        );
        setCredentials(updatedCredentials);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete credential";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [getStoredCredentials]
  );

  // Clear all credentials
  const clearAllCredentials = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await AsyncStorage.removeItem(STORAGE_KEY);
      setCredentials([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear credentials";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh credentials from storage
  const refreshCredentials = useCallback(async (): Promise<void> => {
    await getCredentials();
  }, [getCredentials]);

  return {
    credentials,
    isLoading,
    error,
    issueCredential,
    storeCredential,
    getCredentials,
    getCredentialById,
    getCredentialsByLockId,
    deleteCredential,
    refreshCredentials,
    isCredentialExpired,
    getValidCredentials,
  };
};
