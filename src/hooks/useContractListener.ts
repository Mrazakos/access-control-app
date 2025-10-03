import { useEffect, useState, useCallback } from "react";
import { useWatchContractEvent, useReadContract, useConfig } from "wagmi";
import { readContract, simulateContract } from "wagmi/actions";
import { Address as ViemAddress, Log } from "viem";
import { AccessControl__factory } from "../typechain-types/factories/contracts/AccessControl__factory";

const CONTRACT_ADDRESS = (process.env.EXPO_PUBLIC_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3") as ViemAddress;

export interface LockRegistrationResult {
  lockId: number;
  owner: string;
  publicKey: string;
  transactionHash?: string;
}

export interface ContractEventListeners {
  // Enhanced lock registration with return value tracking
  registerLockWithReturnValue: (
    publicKey: string,
    onResult: (result: LockRegistrationResult) => void,
    onError?: (error: string) => void
  ) => Promise<void>;

  // Simulate to get predicted ID
  simulateRegisterLock: (publicKey: string) => Promise<number | null>;

  // Direct event watchers
  useLockRegisteredWatch: (
    callback: (lockId: number, owner: string, publicKey: string) => void
  ) => void;
  useLockOwnershipTransferredWatch: (
    callback: (lockId: number, previousOwner: string, newOwner: string) => void
  ) => void;
  useSignatureRevokedWatch: (
    callback: (lockId: number, signature: string, revoker: string) => void
  ) => void;

  // Get return values from view functions
  getLockInfoWithReturnValue: (lockId: number) => Promise<{
    owner: string;
    publicKey: string;
    revokedCount: number;
    exists: boolean;
  } | null>;
}

export const useContractListener = (): ContractEventListeners => {
  const config = useConfig();
  const [pendingRegistrations, setPendingRegistrations] = useState<
    Map<
      string,
      {
        onResult: (result: LockRegistrationResult) => void;
        onError?: (error: string) => void;
        timestamp: number;
      }
    >
  >(new Map());

  // Watch for LockRegistered events and match them to pending registrations
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: AccessControl__factory.abi,
    eventName: "LockRegistered",
    onLogs: (logs: Log[]) => {
      logs.forEach((log: any) => {
        const { lockId, owner, publicKey } = log.args;

        // Check if this event matches any pending registration
        const pending = pendingRegistrations.get(publicKey);
        if (pending) {
          console.log(
            `✅ Found matching event for publicKey: ${publicKey}, lockId: ${Number(
              lockId
            )}`
          );

          pending.onResult({
            lockId: Number(lockId),
            owner,
            publicKey,
            transactionHash: log.transactionHash,
          });

          // Remove from pending
          setPendingRegistrations((prev) => {
            const newMap = new Map(prev);
            newMap.delete(publicKey);
            return newMap;
          });
        }
      });
    },
  });

  // Cleanup old pending registrations (after 5 minutes)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setPendingRegistrations((prev) => {
        const newMap = new Map(prev);
        for (const [key, value] of newMap.entries()) {
          if (now - value.timestamp > 5 * 60 * 1000) {
            // 5 minutes
            value.onError?.("Registration timeout - event not received");
            newMap.delete(key);
          }
        }
        return newMap;
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(cleanup);
  }, []);

  const registerLockWithReturnValue = useCallback(
    async (
      publicKey: string,
      onResult: (result: LockRegistrationResult) => void,
      onError?: (error: string) => void
    ) => {
      try {
        // 1. Get predicted ID for immediate UX feedback
        const { result: predictedId } = await simulateContract(config, {
          address: CONTRACT_ADDRESS,
          abi: AccessControl__factory.abi,
          functionName: "registerLock",
          args: [publicKey],
        });

        console.log(
          `🔮 Predicted lock ID: ${Number(
            predictedId
          )} for publicKey: ${publicKey}`
        );

        // 2. Register this public key as pending
        setPendingRegistrations((prev) =>
          new Map(prev).set(publicKey, {
            onResult,
            onError,
            timestamp: Date.now(),
          })
        );

        // 3. The actual transaction execution should be done by the caller
        // This function just sets up the event listening
      } catch (error) {
        console.error("Error in registerLockWithReturnValue:", error);
        onError?.(error instanceof Error ? error.message : "Unknown error");
      }
    },
    [config]
  );

  const useLockRegisteredWatch = (
    callback: (lockId: number, owner: string, publicKey: string) => void
  ) => {
    useWatchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: AccessControl__factory.abi,
      eventName: "LockRegistered",
      onLogs: (logs: Log[]) => {
        logs.forEach((log: any) => {
          const { lockId, owner, publicKey } = log.args;
          callback(Number(lockId), owner, publicKey);
        });
      },
    });
  };

  const useLockOwnershipTransferredWatch = (
    callback: (lockId: number, previousOwner: string, newOwner: string) => void
  ) => {
    useWatchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: AccessControl__factory.abi,
      eventName: "LockOwnershipTransferred",
      onLogs: (logs: Log[]) => {
        logs.forEach((log: any) => {
          const { lockId, previousOwner, newOwner } = log.args;
          callback(Number(lockId), previousOwner, newOwner);
        });
      },
    });
  };

  const useSignatureRevokedWatch = (
    callback: (lockId: number, signature: string, revoker: string) => void
  ) => {
    useWatchContractEvent({
      address: CONTRACT_ADDRESS,
      abi: AccessControl__factory.abi,
      eventName: "SignatureRevoked",
      onLogs: (logs: Log[]) => {
        logs.forEach((log: any) => {
          const { lockId, signature, revoker } = log.args;
          callback(Number(lockId), signature, revoker);
        });
      },
    });
  };

  const getLockInfoWithReturnValue = async (lockId: number) => {
    try {
      const result = await readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: AccessControl__factory.abi,
        functionName: "getLockInfo",
        args: [BigInt(lockId)],
      });

      const [owner, publicKey, revokedCount, exists] = result as [
        string,
        string,
        bigint,
        boolean
      ];

      return {
        owner,
        publicKey,
        revokedCount: Number(revokedCount),
        exists,
      };
    } catch (error) {
      console.error("Error getting lock info:", error);
      return null;
    }
  };

  const simulateRegisterLock = async (
    publicKey: string
  ): Promise<number | null> => {
    try {
      const { result } = await simulateContract(config, {
        address: CONTRACT_ADDRESS,
        abi: AccessControl__factory.abi,
        functionName: "registerLock",
        args: [publicKey],
      });

      return Number(result);
    } catch (error) {
      console.error("Error simulating register lock:", error);
      return null;
    }
  };

  return {
    registerLockWithReturnValue,
    simulateRegisterLock,
    useLockRegisteredWatch,
    useLockOwnershipTransferredWatch,
    useSignatureRevokedWatch,
    getLockInfoWithReturnValue,
  };
};
