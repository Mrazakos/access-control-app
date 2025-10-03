import { useState, useCallback, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { Address as ViemAddress } from "viem";
import {
  LockService,
  Lock,
  CreateLockRequest,
  RegisterLockOnChainRequest,
} from "../services/LockService";
import { AccessControl__factory } from "../typechain-types/factories/contracts/AccessControl__factory";
import { Address } from "../types/types";
import {
  useContractListener,
  LockRegistrationResult,
} from "./useContractListener";

// Contract configuration
const CONTRACT_ADDRESS = (process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as ViemAddress;

export interface LockInfo {
  lockId: number;
  publicKey: string;
  owner: Address;
  exists: boolean;
  revokedCount: number;
}

export interface UseLockReturn {
  // Local storage operations
  locks: Lock[];
  isLoading: boolean;
  error: string | null;
  createLock: (request: CreateLockRequest) => Promise<Lock>;
  getLocks: () => Promise<Lock[]>;
  getLockById: (lockId: number) => Promise<Lock | null>;
  updateLockByPublicKey: (
    publicKey: string,
    updates: Partial<
      Pick<Lock, "id" | "name" | "description" | "location" | "isActive">
    >
  ) => Promise<Lock | null>;
  updateLock: (
    lockId: number,
    updates: Partial<
      Pick<Lock, "name" | "description" | "location" | "isActive">
    >
  ) => Promise<Lock | null>;
  deleteLock: (lockId: number) => Promise<void>;
  clearAllLocks: () => Promise<void>;
  refreshLocks: () => Promise<void>;

  // ✨ ENHANCED COMBINED OPERATION - Now with return value tracking
  createAndRegisterLock: (
    request: CreateLockRequest,
    onLockRegistered?: (result: LockRegistrationResult) => void
  ) => Promise<Lock>;
}

export const useLock = (): UseLockReturn => {
  const [locks, setLocks] = useState<Lock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();
  const lockService = LockService.getInstance();
  const contractListener = useContractListener();

  // Wagmi hooks for blockchain operations
  const {
    writeContract,
    data: transactionHash,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();

  const { isLoading: isReceiptLoading } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: AccessControl__factory.abi,
    functionName: "paused",
  });

  const isTransactionPending = isWritePending || isReceiptLoading;
  const transactionError = writeError?.message || null;

  // Load locks on mount
  useEffect(() => {
    refreshLocks();
  }, []);

  // Create a new lock locally
  const createLock = useCallback(
    async (request: CreateLockRequest): Promise<Lock> => {
      try {
        setIsLoading(true);
        setError(null);

        const newLock = await lockService.createLock(request);

        // Update local state
        const updatedLocks = await lockService.getStoredLocks();
        setLocks(updatedLocks);

        return newLock;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create lock";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [lockService]
  );

  // Get all locks
  const getLocks = useCallback(async (): Promise<Lock[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const storedLocks = await lockService.getStoredLocks();
      setLocks(storedLocks);
      return storedLocks;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get locks";
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [lockService]);

  // Get lock by ID
  const getLockById = useCallback(
    async (lockId: number): Promise<Lock | null> => {
      try {
        return await lockService.getLockById(lockId);
      } catch (err) {
        console.error("Failed to get lock by ID:", err);
        return null;
      }
    },
    [lockService]
  );

  // Update lock by public key (for blockchain ID updates)
  const updateLockByPublicKey = useCallback(
    async (
      publicKey: string,
      updates: Partial<
        Pick<Lock, "id" | "name" | "description" | "location" | "isActive">
      >
    ): Promise<Lock | null> => {
      try {
        const updatedLock = await lockService.updateLockByPublicKey(
          publicKey,
          updates
        );

        // Refresh locks in state
        const updatedLocks = await lockService.getStoredLocks();
        setLocks(updatedLocks);

        return updatedLock;
      } catch (err) {
        console.error("Failed to update lock by public key:", err);
        return null;
      }
    },
    [lockService]
  );

  // Update lock
  const updateLock = useCallback(
    async (
      lockId: number,
      updates: Partial<
        Pick<Lock, "name" | "description" | "location" | "isActive">
      >
    ): Promise<Lock | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const updatedLock = await lockService.updateLock(lockId, updates);

        // Refresh locks in state
        const updatedLocks = await lockService.getStoredLocks();
        setLocks(updatedLocks);

        return updatedLock;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update lock";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [lockService]
  );

  // Delete lock
  const deleteLock = useCallback(
    async (lockId: number): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        await lockService.deleteLock(lockId);

        // Update local state
        const updatedLocks = await lockService.getStoredLocks();
        setLocks(updatedLocks);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete lock";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [lockService]
  );

  // Clear all locks
  const clearAllLocks = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      await lockService.clearAllLocks();
      setLocks([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear all locks";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [lockService]);

  // Refresh locks from storage
  const refreshLocks = useCallback(async (): Promise<void> => {
    await getLocks();
  }, [getLocks]);

  // ✨ ENHANCED COMBINED OPERATION - Create lock locally AND register on blockchain with result tracking
  const createAndRegisterLock = useCallback(
    async (
      request: CreateLockRequest,
      onLockRegistered?: (result: LockRegistrationResult) => void
    ): Promise<Lock> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!address) {
          throw new Error("Wallet not connected");
        }

        // Step 1: Create lock locally (generates keys, saves to AsyncStorage)
        console.log("🔐 Creating lock locally...");
        const newLock = await lockService.createLock(request);
        console.log(`✅ Lock created locally with ID: ${newLock.id}`);

        // Step 2: Update local state immediately so user sees the lock
        const updatedLocks = await lockService.getStoredLocks();
        setLocks(updatedLocks);

        // Step 3: Set up event listener for this specific public key
        await contractListener.registerLockWithReturnValue(
          newLock.publicKey,
          async (result) => {
            console.log(
              `🎉 Lock registered on blockchain: ID ${result.lockId} for publicKey ${result.publicKey}`
            );

            // Update the local lock's ID with the actual blockchain lock ID
            await updateLockByPublicKey(result.publicKey, {
              id: result.lockId,
            });
            console.log(
              `📝 Updated local lock ID to blockchain ID: ${result.lockId}`
            );

            // Call the optional callback
            onLockRegistered?.(result);
          },
          (error) => {
            console.error(`❌ Lock registration failed: ${error}`);
            setError(`Blockchain registration failed: ${error}`);
          }
        );

        // Step 4: Execute the blockchain transaction
        console.log("⚡️ Registering lock on blockchain...");
        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "registerLock",
          args: [newLock.publicKey],
        });

        console.log("🚀 Lock registration submitted to blockchain!");
        console.log(`📝 Transaction will be confirmed automatically`);

        return newLock;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to create and register lock";
        setError(errorMessage);
        console.error("❌ Error:", errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [lockService, writeContract, address, contractListener]
  );

  return {
    // Local storage operations
    locks,
    isLoading,
    error,
    createLock,
    getLocks,
    getLockById,
    updateLockByPublicKey,
    updateLock,
    deleteLock,
    clearAllLocks,
    refreshLocks,

    // ✨ ENHANCED COMBINED OPERATION - Use this for lock creation + blockchain registration with result tracking
    createAndRegisterLock,
  };
};