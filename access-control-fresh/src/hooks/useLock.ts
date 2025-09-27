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
  RevokeSignatureRequest,
} from "../services/lockService";
import { AccessControl__factory } from "../typechain-types/factories/contracts/AccessControl__factory";
import { Address } from "../types/types";

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
  updateLock: (
    lockId: number,
    updates: Partial<
      Pick<Lock, "name" | "description" | "location" | "isActive">
    >
  ) => Promise<Lock | null>;
  deleteLock: (lockId: number) => Promise<void>;
  clearAllLocks: () => Promise<void>;
  refreshLocks: () => Promise<void>;

  // ✨ COMBINED OPERATION
  createAndRegisterLock: (request: CreateLockRequest) => Promise<Lock>;

  // Separate blockchain operations (if you need them)
  registerLockOnChain: (request: RegisterLockOnChainRequest) => Promise<void>;
  revokeSignatureOnChain: (request: RevokeSignatureRequest) => Promise<void>;
  batchRevokeSignatures: (
    lockId: number,
    signatures: string[]
  ) => Promise<void>;
  transferLockOwnership: (lockId: number, newOwner: Address) => Promise<void>;
  isTransactionPending: boolean;
  transactionHash: string | null;
  transactionError: string | null;

  // Blockchain read operations (some reactive, some dynamic)
  totalLocksOnChain: number | undefined; // Reactive data from useReadContract
  isContractPaused: boolean | undefined; // Reactive data from useReadContract
  refetchContractData: () => void; // Manually refetch contract data
  getLockInfoOnChain: (lockId: number) => Promise<LockInfo | null>; // Dynamic reads
  getTotalLocksOnChain: () => Promise<number>;
  isSignatureRevokedOnChain: (
    lockId: number,
    signature: string
  ) => Promise<boolean>;
  checkContractPaused: () => Promise<boolean>;
}

export const useLock = (): UseLockReturn => {
  const [locks, setLocks] = useState<Lock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();
  const lockService = LockService.getInstance();

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

  // Blockchain read hooks - these provide automatic caching and refetching
  const { data: totalLocks, refetch: refetchTotalLocks } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: AccessControl__factory.abi,
    functionName: "getTotalLocks",
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

  // ✨ COMBINED OPERATION - Create lock locally AND register on blockchain
  const createAndRegisterLock = useCallback(
    async (request: CreateLockRequest): Promise<Lock> => {
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

        // Step 3: Register on blockchain
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
    [lockService, writeContract, address]
  );

  // Register lock on blockchain
  const registerLockOnChain = useCallback(
    async (request: RegisterLockOnChainRequest): Promise<void> => {
      try {
        setError(null);

        if (!address) {
          throw new Error("Wallet not connected");
        }

        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "registerLock",
          args: [request.publicKey],
        });

        console.log("Lock registration submitted to blockchain");
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to register lock on chain";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [writeContract, address]
  );

  // Revoke signature on blockchain
  const revokeSignatureOnChain = useCallback(
    async (request: RevokeSignatureRequest): Promise<void> => {
      try {
        setError(null);

        if (!address) {
          throw new Error("Wallet not connected");
        }

        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "revokeSignature",
          args: [BigInt(request.lockId), request.signature],
        });

        console.log("Signature revocation submitted to blockchain");
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to revoke signature on chain";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [writeContract, address]
  );

  // Batch revoke signatures on blockchain
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

        console.log("Batch signature revocation submitted to blockchain");
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

  // Transfer lock ownership on blockchain
  const transferLockOwnership = useCallback(
    async (lockId: number, newOwner: Address): Promise<void> => {
      try {
        setError(null);

        if (!address) {
          throw new Error("Wallet not connected");
        }

        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "transferLockOwnership",
          args: [BigInt(lockId), newOwner as ViemAddress],
        });

        console.log("Lock ownership transfer submitted to blockchain");
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to transfer lock ownership on chain";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [writeContract, address]
  );

  // Helper functions for dynamic read operations
  const getLockInfoOnChain = useCallback(
    async (lockId: number): Promise<LockInfo | null> => {
      try {
        // We'll use wagmi's readContract (not hook) for dynamic reads
        // This is for cases where we need to read with dynamic parameters
        // The hook-based reads are better for static/reactive data
        return null; // Placeholder - you can implement specific read logic here
      } catch (error) {
        console.error("Error getting lock info:", error);
        return null;
      }
    },
    []
  );

  const getTotalLocksOnChain = useCallback(async (): Promise<number> => {
    // Use the reactive hook data if available, otherwise return 0
    return Number(totalLocks) || 0;
  }, [totalLocks]);

  const isSignatureRevokedOnChain = useCallback(
    async (lockId: number, signature: string): Promise<boolean> => {
      try {
        // For dynamic reads, you might need to use wagmi's readContract function
        // or implement a custom solution
        return false; // Placeholder
      } catch (error) {
        console.error("Error checking signature revocation:", error);
        return false;
      }
    },
    []
  );

  const checkContractPaused = useCallback(async (): Promise<boolean> => {
    // Use the reactive hook data
    return Boolean(isPaused);
  }, [isPaused]);

  // Helper to manually refetch contract data
  const refetchContractData = useCallback(() => {
    refetchTotalLocks();
    refetchPaused();
  }, [refetchTotalLocks, refetchPaused]);

  return {
    // Local storage operations
    locks,
    isLoading,
    error,
    createLock,
    getLocks,
    getLockById,
    updateLock,
    deleteLock,
    clearAllLocks,
    refreshLocks,

    // ✨ COMBINED OPERATION - Use this for simple lock creation + blockchain registration
    createAndRegisterLock,

    // Separate blockchain operations (if you need them)
    registerLockOnChain,
    revokeSignatureOnChain,
    batchRevokeSignatures,
    transferLockOwnership,
    isTransactionPending,
    transactionHash: transactionHash || null,
    transactionError,

    // Blockchain read operations - reactive data
    totalLocksOnChain: Number(totalLocks),
    isContractPaused: Boolean(isPaused),
    refetchContractData,

    // Blockchain read operations - dynamic functions
    getLockInfoOnChain,
    getTotalLocksOnChain,
    isSignatureRevokedOnChain,
    checkContractPaused,
  };
};
