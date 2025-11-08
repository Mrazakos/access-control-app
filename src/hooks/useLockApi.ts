import { useState, useCallback, useEffect, useMemo } from "react";
import {
  LockApiService,
  createLockApiService,
  LockInitResponse,
  LockStatusResponse,
  LockResetResponse,
  CredentialVerificationResponse,
} from "../services/LockApiService";
import { VerifiableCredential } from "../types/types";

export interface UseLockApiConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface UseLockApiReturn {
  // Service instance
  apiService: LockApiService | null;

  // Configuration
  baseUrl: string | null;
  setBaseUrl: (url: string) => void;

  // Status
  isLoading: boolean;
  error: string | null;
  clearError: () => void;

  // Lock Configuration
  initializeLock: (
    lockId: number,
    publicKey: string
  ) => Promise<LockInitResponse>;
  getConfigStatus: () => Promise<LockStatusResponse | null>;
  resetLockConfig: (
    adminCredential: VerifiableCredential
  ) => Promise<LockResetResponse>;

  // Credential Verification
  verifyCredential: (
    credential: VerifiableCredential
  ) => Promise<CredentialVerificationResponse>;

  // Health Check
  checkHealth: () => Promise<boolean>;
  isHealthy: boolean;
}

/**
 * React hook for managing Lock API interactions
 */
export const useLockApi = (config?: UseLockApiConfig): UseLockApiReturn => {
  const [baseUrl, setBaseUrlState] = useState<string | null>(
    config?.baseUrl || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(false);

  // Create API service instance when baseUrl is set
  const apiService = useMemo(() => {
    if (!baseUrl) return null;
    return createLockApiService(baseUrl, config?.timeout);
  }, [baseUrl, config?.timeout]);

  // Update base URL
  const setBaseUrl = useCallback((url: string) => {
    console.log("🔧 Setting lock API base URL:", url);
    setBaseUrlState(url);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize lock
  const initializeLock = useCallback(
    async (lockId: number, publicKey: string): Promise<LockInitResponse> => {
      if (!apiService) {
        throw new Error(
          "Lock API service not initialized. Please set a base URL first."
        );
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiService.initializeLock(lockId, publicKey);

        if (!response.success) {
          throw new Error(response.error || "Failed to initialize lock");
        }

        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to initialize lock";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiService]
  );

  // Get configuration status
  const getConfigStatus =
    useCallback(async (): Promise<LockStatusResponse | null> => {
      if (!apiService) {
        console.warn("Lock API service not initialized");
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiService.getConfigStatus();
        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to get config status";
        setError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, [apiService]);

  // Reset lock configuration
  const resetLockConfig = useCallback(
    async (
      adminCredential: VerifiableCredential
    ): Promise<LockResetResponse> => {
      if (!apiService) {
        throw new Error(
          "Lock API service not initialized. Please set a base URL first."
        );
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiService.resetLockConfig(adminCredential);

        if (!response.success) {
          throw new Error(response.error || "Failed to reset lock");
        }

        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to reset lock";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiService]
  );

  // Verify credential
  const verifyCredential = useCallback(
    async (
      credential: VerifiableCredential
    ): Promise<CredentialVerificationResponse> => {
      if (!apiService) {
        throw new Error(
          "Lock API service not initialized. Please set a base URL first."
        );
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiService.verifyCredential(credential);

        if (!response.verified) {
          console.warn("⚠️ Credential verification failed:", response.error);
        }

        return response;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to verify credential";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiService]
  );

  // Health check
  const checkHealth = useCallback(async (): Promise<boolean> => {
    if (!apiService) {
      setIsHealthy(false);
      return false;
    }

    try {
      const healthy = await apiService.healthCheck();
      setIsHealthy(healthy);
      return healthy;
    } catch (err) {
      setIsHealthy(false);
      return false;
    }
  }, [apiService]);

  // Auto health check on baseUrl change
  useEffect(() => {
    if (apiService) {
      checkHealth();
    }
  }, [apiService, checkHealth]);

  return {
    apiService,
    baseUrl,
    setBaseUrl,
    isLoading,
    error,
    clearError,
    initializeLock,
    getConfigStatus,
    resetLockConfig,
    verifyCredential,
    checkHealth,
    isHealthy,
  };
};
