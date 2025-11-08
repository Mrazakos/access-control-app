import axios, { AxiosInstance, AxiosError } from "axios";
import { VerifiableCredential } from "../types/types";

/**
 * Response types for Lock API
 */
export interface LockInitResponse {
  success: boolean;
  message?: string;
  lockId?: number;
  timestamp: string;
  error?: string;
}

export interface LockStatusResponse {
  isConfigured: boolean;
  lockId?: number;
  publicKey?: string;
  timestamp: string;
}

export interface LockResetResponse {
  success: boolean;
  message?: string;
  timestamp: string;
  error?: string;
}

export interface CredentialVerificationResponse {
  verified: boolean;
  error?: string;
  credentialId?: string;
  lockId?: number;
  isRevoked?: boolean;
  timestamp: string;
}

/**
 * Configuration for Lock API Service
 */
export interface LockApiConfig {
  baseUrl: string;
  timeout?: number;
}

/**
 * Service for communicating with Lock API
 * Handles configuration and credential verification endpoints
 */
export class LockApiService {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  constructor(config: LockApiConfig) {
    this.baseUrl = config.baseUrl;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error("❌ Lock API Error:", error.message);
        if (error.response) {
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);
        } else if (error.request) {
          console.error("No response received:", error.request);
        }
        throw error;
      }
    );
  }

  /**
   * Update the base URL for the lock
   */
  updateBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
    this.axiosInstance.defaults.baseURL = baseUrl;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ==================== Configuration Endpoints ====================

  /**
   * Initialize lock configuration
   * POST /api/v1/config/init
   * @param lockId - The ID of the lock to initialize
   * @param publicKey - The public key for the lock
   */
  async initializeLock(
    lockId: number,
    publicKey: string
  ): Promise<LockInitResponse> {
    try {
      console.log("🔧 Initializing lock:", {
        lockId,
        publicKey,
      });

      const response = await this.axiosInstance.post<LockInitResponse>(
        "/config/init",
        {
          lockId,
          publicKey,
        }
      );

      console.log("✅ Lock initialization response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to initialize lock:", error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw new Error("Failed to initialize lock: " + (error as Error).message);
    }
  }

  /**
   * Get current lock configuration status
   * GET /api/v1/config/status
   */
  async getConfigStatus(): Promise<LockStatusResponse> {
    try {
      console.log("🔍 Fetching lock configuration status...");

      const response = await this.axiosInstance.get<LockStatusResponse>(
        "/config/status"
      );

      console.log("✅ Lock status:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to get lock status:", error);
      throw new Error("Failed to get lock status: " + (error as Error).message);
    }
  }

  /**
   * Reset lock configuration
   * POST /api/v1/config/reset
   * Requires admin-level Verifiable Credential
   * @param adminCredential - Admin credential for authorization
   */
  async resetLockConfig(
    adminCredential: VerifiableCredential
  ): Promise<LockResetResponse> {
    try {
      console.log("🔄 Resetting lock configuration...");

      const response = await this.axiosInstance.post<LockResetResponse>(
        "/config/reset",
        adminCredential
      );

      console.log("✅ Lock reset response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to reset lock:", error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw new Error("Failed to reset lock: " + (error as Error).message);
    }
  }

  // ==================== Verification Endpoints ====================

  /**
   * Verify a verifiable credential to unlock
   * POST /api/v1/verify
   * @param credential - The verifiable credential to verify
   */
  async verifyCredential(
    credential: VerifiableCredential
  ): Promise<CredentialVerificationResponse> {
    try {
      console.log("🔐 Verifying credential:", credential.id);
      console.log("🏢 Lock ID:", credential.lockId);

      const response =
        await this.axiosInstance.post<CredentialVerificationResponse>(
          "/verify",
          credential
        );

      console.log("✅ Verification response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to verify credential:", error);
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data;
      }
      throw new Error(
        "Failed to verify credential: " + (error as Error).message
      );
    }
  }

  // ==================== Health Check ====================

  /**
   * Check if the lock API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      console.log("🏥 Checking lock API health...");
      await this.axiosInstance.get("/config/status", { timeout: 3000 });
      console.log("✅ Lock API is reachable");
      return true;
    } catch (error) {
      console.error("❌ Lock API is not reachable:", error);
      return false;
    }
  }
}

/**
 * Factory function to create a LockApiService instance
 */
export const createLockApiService = (
  baseUrl: string,
  timeout?: number
): LockApiService => {
  return new LockApiService({ baseUrl, timeout });
};
