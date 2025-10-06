import { useState, useCallback, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { Address as ViemAddress } from "viem";
import { ethers } from "ethers";
import { LockService, Lock, CreateLockRequest } from "../services/LockService";
import { AccessControl__factory } from "../typechain-types/factories/contracts/AccessControl__factory";
import { Address } from "../types/types";

// Contract configuration
const CONTRACT_ADDRESS = (process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as ViemAddress;

export interface LockRegistrationResult {
  lockId: number;
  owner: string;
  publicKey: string;
  transactionHash?: string;
}

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
      Pick<Lock, "id" | "name" | "description" | "location" | "status">
    >
  ) => Promise<Lock | null>;
  updateLock: (
    lockId: number,
    updates: Partial<Pick<Lock, "name" | "description" | "location" | "status">>
  ) => Promise<Lock | null>;
  deleteLock: (lockId: number) => Promise<void>;
  clearAllLocks: () => Promise<void>;
  refreshLocks: () => Promise<void>;

  // ✨ ENHANCED COMBINED OPERATION - Now with transaction receipt tracking
  createAndRegisterLock: (
    request: CreateLockRequest,
    onLockRegistered?: (result: LockRegistrationResult) => void
  ) => Promise<Lock>;

  // ✨ RETRY OPERATION - Retry blockchain registration for failed locks
  retryLockRegistration: (
    lock: Lock,
    onLockRegistered?: (result: LockRegistrationResult) => void
  ) => Promise<void>;
}

export const useLock = (): UseLockReturn => {
  const [locks, setLocks] = useState<Lock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] = useState<{
    publicKey: string;
    callback?: (result: LockRegistrationResult) => void;
    timeoutId?: NodeJS.Timeout;
  } | null>(null);

  const { address } = useAccount();
  const lockService = LockService.getInstance();

  // Wagmi hooks for blockchain operations
  const {
    writeContract,
    data: transactionHash,
    error: writeError,
    isPending: isWritePending,
  } = useWriteContract();

  const {
    data: transactionReceipt,
    isLoading: isReceiptLoading,
    isSuccess: isReceiptSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
  });

  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: AccessControl__factory.abi,
    functionName: "paused",
  });

  // 🚀 NEW: Handle transaction receipt instead of events
  useEffect(() => {
    console.log(pendingRegistration, isReceiptSuccess);
    if (transactionReceipt && pendingRegistration && isReceiptSuccess) {
      console.log("📄 Transaction receipt received!");
      console.log("📄 Transaction status:", transactionReceipt.status);
      console.log("📄 Transaction hash:", transactionReceipt.transactionHash);
      console.log("📄 Logs count:", transactionReceipt.logs.length);

      if (transactionReceipt.status === "success") {
        // Parse the LockRegistered event from transaction logs
        try {
          const iface = new ethers.Interface(AccessControl__factory.abi);
          let eventFound = false;

          for (const log of transactionReceipt.logs) {
            if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
              try {
                const parsedLog = iface.parseLog({
                  topics: log.topics as string[],
                  data: log.data,
                });

                console.log("📋 Parsed log:", parsedLog?.name, parsedLog?.args);

                if (parsedLog?.name === "LockRegistered") {
                  const { lockId, owner, publicKey } = parsedLog.args;

                  console.log(`🎯 LockRegistered event found:`, {
                    lockId: lockId?.toString(),
                    owner,
                    publicKey,
                    pendingKey: pendingRegistration.publicKey,
                  });

                  if (publicKey === pendingRegistration.publicKey) {
                    console.log(
                      `🎉 Lock registered successfully! ID: ${lockId}`
                    );
                    eventFound = true;

                    // Update the lock with blockchain ID
                    updateLockByPublicKey(publicKey, {
                      id: Number(lockId),
                      status: "active",
                    })
                      .then(() => {
                        refreshLocks();

                        // Call callback if provided
                        pendingRegistration?.callback?.({
                          lockId: Number(lockId),
                          owner,
                          publicKey,
                          transactionHash: transactionReceipt.transactionHash,
                        });

                        // Clear timeout and pending registration
                        if (pendingRegistration?.timeoutId) {
                          clearTimeout(pendingRegistration.timeoutId);
                          console.log(
                            `✅ Registration timeout cleared for successful registration`
                          );
                        }
                        setPendingRegistration(null);
                      })
                      .catch((err) => {
                        console.error("Error updating lock:", err);
                      });

                    break;
                  }
                }
              } catch (parseError) {
                // Not our event, continue
                console.log("📋 Could not parse log (not our event)");
              }
            }
          }

          if (!eventFound) {
            console.log(
              "⚠️ LockRegistered event not found in transaction logs"
            );
            console.log(
              "📋 Available logs:",
              transactionReceipt.logs.map((log) => ({
                address: log.address,
                topics: log.topics,
              }))
            );
          }
        } catch (err) {
          console.error("❌ Error parsing transaction logs:", err);
          // Set lock to failed on parsing error
          if (pendingRegistration) {
            updateLockByPublicKey(pendingRegistration.publicKey, {
              status: "failed",
            });
            if (pendingRegistration.timeoutId) {
              clearTimeout(pendingRegistration.timeoutId);
            }
            setPendingRegistration(null);
          }
        }
      } else {
        // Transaction failed
        console.log("❌ Transaction failed");
        if (pendingRegistration) {
          updateLockByPublicKey(pendingRegistration.publicKey, {
            status: "failed",
          });
          if (pendingRegistration.timeoutId) {
            clearTimeout(pendingRegistration.timeoutId);
          }
          setPendingRegistration(null);
        }
      }
    }
  }, [transactionReceipt, pendingRegistration, isReceiptSuccess]);

  // Handle transaction receipt errors
  useEffect(() => {
    if (receiptError && pendingRegistration) {
      console.error("❌ Transaction receipt error:", receiptError);
      updateLockByPublicKey(pendingRegistration.publicKey, {
        status: "failed",
      });
      if (pendingRegistration.timeoutId) {
        clearTimeout(pendingRegistration.timeoutId);
      }
      setPendingRegistration(null);
      setError("Transaction failed. Please try again.");
    }
  }, [receiptError, pendingRegistration]);

  // Load locks on mount
  useEffect(() => {
    refreshLocks();
  }, []);

  // Auto-fail pending registrations after 2 minutes timeout
  useEffect(() => {
    return () => {
      // Cleanup timeout on unmount
      if (pendingRegistration?.timeoutId) {
        clearTimeout(pendingRegistration.timeoutId);
      }
    };
  }, [pendingRegistration?.timeoutId]);

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
        Pick<Lock, "id" | "name" | "description" | "location" | "status">
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

  // Helper function to create timeout for pending registration
  const createRegistrationTimeout = useCallback(
    (publicKey: string): NodeJS.Timeout => {
      console.log(
        `⏱️ Starting 2-minute timeout for registration: ${publicKey}`
      );

      return setTimeout(async () => {
        console.log(
          `⏰ Registration timeout expired for publicKey: ${publicKey}`
        );

        // Update lock status to failed
        await updateLockByPublicKey(publicKey, { status: "failed" });

        // Clear pending registration
        setPendingRegistration(null);

        setError(
          "Lock registration timed out after 2 minutes. Please try again."
        );
        console.log(`❌ Lock registration failed due to timeout: ${publicKey}`);
      }, 2 * 60 * 1000);
    },
    [updateLockByPublicKey]
  );

  // Update lock
  const updateLock = useCallback(
    async (
      lockId: number,
      updates: Partial<
        Pick<Lock, "name" | "description" | "location" | "status">
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
    async (
      request: CreateLockRequest,
      onLockRegistered?: (result: LockRegistrationResult) => void
    ): Promise<Lock> => {
      let newLock: Lock | null = null;

      try {
        setIsLoading(true);
        setError(null);

        if (!address) {
          throw new Error("Wallet not connected");
        }

        // Step 1: Create lock locally (generates keys, saves to AsyncStorage)
        console.log("🔐 Creating lock locally...");
        newLock = await lockService.createLock(request);
        console.log(`✅ Lock created locally with ID: ${newLock.id}`);

        // Step 2: Update local state immediately so user sees the lock
        const updatedLocks = await lockService.getStoredLocks();
        setLocks(updatedLocks);

        // Step 3: Set up pending registration to wait for transaction receipt
        console.log(
          `🔄 Setting up pending registration for publicKey: ${newLock.publicKey}`
        );
        const timeoutId = createRegistrationTimeout(newLock.publicKey);
        setPendingRegistration({
          publicKey: newLock.publicKey,
          callback: onLockRegistered,
          timeoutId,
        });

        // Step 4: Execute the blockchain transaction
        console.log("⚡️ Registering lock on blockchain...");
        console.log(
          `📤 Sending registerLock with publicKey: ${newLock.publicKey}`
        );
        console.log(`📤 Contract address: ${CONTRACT_ADDRESS}`);
        console.log(`📤 User address: ${address}`);

        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "registerLock",
          args: [newLock.publicKey],
        });

        console.log("🚀 Lock registration submitted to blockchain!");
        console.log(`📝 Now waiting for transaction receipt...`);

        return newLock;
      } catch (err) {
        // Clear pending registration and timeout on error
        if (pendingRegistration?.timeoutId) {
          clearTimeout(pendingRegistration.timeoutId);
        }
        setPendingRegistration(null);

        // Update lock status to failed if it was created locally
        if (newLock) {
          await updateLockByPublicKey(newLock.publicKey, { status: "failed" });
        }

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
    [lockService, writeContract, address, createRegistrationTimeout]
  );

  // ✨ RETRY OPERATION - Retry blockchain registration for failed locks
  const retryLockRegistration = useCallback(
    async (
      lock: Lock,
      onLockRegistered?: (result: LockRegistrationResult) => void
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        if (!address) {
          throw new Error("Wallet not connected");
        }

        // Update lock status to syncing
        await updateLockByPublicKey(lock.publicKey, { status: "syncing" });

        // Set up pending registration to wait for transaction receipt
        console.log(
          `🔄 Setting up retry registration for publicKey: ${lock.publicKey}`
        );
        const timeoutId = createRegistrationTimeout(lock.publicKey);
        setPendingRegistration({
          publicKey: lock.publicKey,
          callback: onLockRegistered,
          timeoutId,
        });

        // Execute the blockchain transaction with existing public key
        console.log("⚡️ Retrying lock registration on blockchain...");
        console.log(
          `📤 Sending registerLock with publicKey: ${lock.publicKey}`
        );
        await writeContract({
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "registerLock",
          args: [lock.publicKey],
        });

        console.log("🚀 Lock retry registration submitted to blockchain!");
        console.log(`📝 Now waiting for transaction receipt...`);
      } catch (err) {
        // Clear pending registration and timeout on error and set status to failed
        if (pendingRegistration?.timeoutId) {
          clearTimeout(pendingRegistration.timeoutId);
        }
        setPendingRegistration(null);
        await updateLockByPublicKey(lock.publicKey, { status: "failed" });

        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to retry lock registration";
        setError(errorMessage);
        console.error("❌ Retry Error:", errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      lockService,
      writeContract,
      address,
      updateLockByPublicKey,
      createRegistrationTimeout,
    ]
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

    // ✨ COMBINED OPERATION - Use this for lock creation + blockchain registration
    createAndRegisterLock,

    // ✨ RETRY OPERATION - Use this to retry failed lock registrations
    retryLockRegistration,
  };
};
