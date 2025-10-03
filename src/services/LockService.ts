import AsyncStorage from "@react-native-async-storage/async-storage";
import { CryptoUtils } from "../utils/CryptoUtils";
import { Address } from "../types/types";

export interface Lock {
  id: number;
  name: string;
  description?: string;
  location?: string;
  publicKey: string;
  privateKey: string; // Stored locally only
  createdAt: string; // ISO string
  isActive: boolean;
}

export interface CreateLockRequest {
  name: string;
  description?: string;
  location?: string;
}

export interface RegisterLockOnChainRequest {
  publicKey: string;
}

const LOCKS_STORAGE_KEY = "@local_locks";

export class LockService {
  private static instance: LockService;

  private constructor() {}

  static getInstance(): LockService {
    if (!LockService.instance) {
      LockService.instance = new LockService();
    }
    return LockService.instance;
  }

  /**
   * Create a new lock locally and generate key pair
   */
  async createLock(request: CreateLockRequest): Promise<Lock> {
    try {
      // Generate key pair for the lock
      const keyPair = await CryptoUtils.generateKeyPair();

      const locks = await this.getStoredLocks();

      // Generate unique lock ID
      const newId = Math.max(0, ...locks.map((lock) => lock.id)) + 1;

      const newLock: Lock = {
        id: newId,
        name: request.name,
        description: request.description,
        location: request.location,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      // Store the lock locally
      const updatedLocks = [...locks, newLock];
      await AsyncStorage.setItem(
        LOCKS_STORAGE_KEY,
        JSON.stringify(updatedLocks)
      );

      console.log(`Created lock ${newId} locally`);
      return newLock;
    } catch (error) {
      console.error("Failed to create lock:", error);
      throw new Error("Failed to create lock");
    }
  }

  /**
   * Get all locally stored locks
   */
  async getStoredLocks(): Promise<Lock[]> {
    try {
      const storedData = await AsyncStorage.getItem(LOCKS_STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : [];
    } catch (error) {
      console.error("Failed to get stored locks:", error);
      return [];
    }
  }

  /**
   * Get a specific lock by ID
   */
  async getLockById(lockId: number): Promise<Lock | null> {
    try {
      const locks = await this.getStoredLocks();
      return locks.find((lock) => lock.id === lockId) || null;
    } catch (error) {
      console.error("Failed to get lock by ID:", error);
      return null;
    }
  }

  /**
   * Update lock with blockchain lock ID
   */
  async updateLockWithBlockchainId(
    publicKey: string,
    blockchainLockId: number
  ): Promise<Lock | null> {
    try {
      const locks = await this.getStoredLocks();
      const lockIndex = locks.findIndex((lock) => lock.publicKey === publicKey);

      if (lockIndex === -1) {
        console.warn(`Lock with publicKey ${publicKey} not found`);
        return null;
      }

      const updatedLock = {
        ...locks[lockIndex],
        blockchainLockId,
      };

      locks[lockIndex] = updatedLock;
      await AsyncStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(locks));

      console.log(
        `✅ Updated lock ${updatedLock.id} with blockchain ID: ${blockchainLockId}`
      );
      return updatedLock;
    } catch (error) {
      console.error("Error updating lock with blockchain ID:", error);
      throw error;
    }
  }

  /**
   * Update a lock by public key - allows updating the id field with blockchain lock ID
   */
  async updateLockByPublicKey(
    publicKey: string,
    updates: Partial<
      Pick<Lock, "id" | "name" | "description" | "location" | "isActive">
    >
  ): Promise<Lock | null> {
    try {
      const locks = await this.getStoredLocks();
      const lockIndex = locks.findIndex((lock) => lock.publicKey === publicKey);

      if (lockIndex === -1) {
        console.warn(`Lock with publicKey ${publicKey} not found`);
        return null;
      }

      const updatedLock = { ...locks[lockIndex], ...updates };
      locks[lockIndex] = updatedLock;

      await AsyncStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(locks));

      if (updates.id) {
        console.log(
          `✅ Updated lock with publicKey ${publicKey} to blockchain ID: ${updates.id}`
        );
      }

      return updatedLock;
    } catch (error) {
      console.error("Error updating lock by public key:", error);
      throw error;
    }
  }

  /**
   * Update a lock's metadata by lock ID
   */
  async updateLock(
    lockId: number,
    updates: Partial<
      Pick<Lock, "name" | "description" | "location" | "isActive">
    >
  ): Promise<Lock | null> {
    try {
      const locks = await this.getStoredLocks();
      const lockIndex = locks.findIndex((lock) => lock.id === lockId);

      if (lockIndex === -1) {
        throw new Error(`Lock with ID ${lockId} not found`);
      }

      const updatedLock = { ...locks[lockIndex], ...updates };
      locks[lockIndex] = updatedLock;

      await AsyncStorage.setItem(LOCKS_STORAGE_KEY, JSON.stringify(locks));
      return updatedLock;
    } catch (error) {
      console.error("Failed to update lock:", error);
      throw new Error("Failed to update lock");
    }
  }

  /**
   * Delete a lock locally
   */
  async deleteLock(lockId: number): Promise<void> {
    try {
      const locks = await this.getStoredLocks();
      const filteredLocks = locks.filter((lock) => lock.id !== lockId);

      await AsyncStorage.setItem(
        LOCKS_STORAGE_KEY,
        JSON.stringify(filteredLocks)
      );
      console.log(`Deleted lock ${lockId} locally`);
    } catch (error) {
      console.error("Failed to delete lock:", error);
      throw new Error("Failed to delete lock");
    }
  }

  /**
   * Clear all locally stored locks
   */
  async clearAllLocks(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCKS_STORAGE_KEY);
      console.log("Cleared all local locks");
    } catch (error) {
      console.error("Failed to clear all locks:", error);
      throw new Error("Failed to clear all locks");
    }
  }
}
