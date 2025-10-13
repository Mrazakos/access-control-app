import { ethers } from "ethers";
import { KeyPair, VerifiableCredential } from "../types/types";

/**
 * FAST Crypto Utils using ECDSA (secp256k1)
 * 100-1000x faster than RSA on mobile devices
 */
export class CryptoUtils {
  /**
   * Generates ECDSA key pair
   */
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      console.log("🚀 Generating ECDSA key pair...");
      const startTime = Date.now();

      const wallet = ethers.Wallet.createRandom();

      const endTime = Date.now();
      console.log(`✅ Key generation: ${endTime - startTime}ms`);

      return {
        privateKey: wallet.privateKey,
        publicKey: wallet.publicKey, // Compressed format (68 chars)
      };
    } catch (error) {
      throw new Error(`ECDSA key generation failed: ${error}`);
    }
  }

  /**
   * Signs data hash with ECDSA - Signs the hash, not the original data
   */
  static async sign(
    data: string | object,
    privateKey: string
  ): Promise<Partial<VerifiableCredential>> {
    try {
      // Step 1: Convert data to string and create hash
      const dataString = typeof data === "string" ? data : JSON.stringify(data);
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(dataString));

      console.log(`📝 Data hash: ${dataHash}`);

      // Step 2: Sign the hash (not the original data)
      const wallet = new ethers.Wallet(privateKey);

      // Convert hash to bytes and sign it
      const hashBytes = ethers.getBytes(dataHash);
      const signature = await wallet.signMessage(hashBytes);

      console.log(`✍️ Signature: ${signature}`);

      return {
        signature: signature,
        signedMessageHash: dataHash,
      };
    } catch (error) {
      throw new Error(`ECDSA signing failed: ${error}`);
    }
  }

  /**
   * Verifies ECDSA signature against data hash
   * The decrypted signature should match the data hash
   * // Conceptually, verification answers:
    "Given this hash, signature, and public key, 
    could this signature have ONLY been created by 
    someone who knew the corresponding private key 
    AND was signing this exact hash?"

    // If answer is YES → signature is valid
    // If answer is NO → signature is invalid or forged
   */
  static verify(
    dataHash: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      console.log(`🔍 Verifying signature for hash: ${dataHash}`);

      // Convert hash to bytes for verification
      const hashBytes = ethers.getBytes(dataHash);

      // Recover the address from the signature and hash
      const recoveredAddress = ethers.verifyMessage(hashBytes, signature);

      // Get the expected address from the public key
      const expectedAddress = ethers.computeAddress(publicKey);

      const isValid =
        recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
      console.log(
        `✅ Signature verification: ${isValid ? "PASSED" : "FAILED"}`
      );

      return isValid;
    } catch (error) {
      console.error("❌ ECDSA verification failed:", error);
      return false;
    }
  }

  // Utility functions
  static generateAddress(): string {
    const randomWallet = ethers.Wallet.createRandom();
    return `addr_${randomWallet.address.slice(2)}`; // Remove 0x prefix
  }

  static generateId(): number {
    return Math.floor(Math.random() * 1000000);
  }

  static hash(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  // Updated test function
  static async runCryptoTest(): Promise<{
    success: boolean;
    results: string[];
    error?: string;
  }> {
    const results: string[] = [];

    try {
      results.push("🚀 Starting FAST ECDSA crypto test...");

      // Performance test
      const perfStart = Date.now();
      const keyPair = await this.generateKeyPair();
      const perfEnd = Date.now();
      results.push(
        `⚡ Key generation: ${perfEnd - perfStart}ms (was 30s-5min!)`
      );

      const testData = "Hello, fast ECDSA world!";

      const signResult = await this.sign(testData, keyPair.privateKey);
      results.push("✅ Signing completed");
      results.push(`📝 Data hash: ${signResult.signedMessageHash}`);

      // Test proper hash-based verification
      const isValid = this.verify(
        signResult.signedMessageHash!, // Use the hash, not original data
        signResult.signature!,
        keyPair.publicKey
      );

      if (isValid) {
        results.push("✅ Verification: PASSED");
        results.push("🎉 ECDSA is 100-1000x faster than RSA!");
        return { success: true, results };
      } else {
        return { success: false, results, error: "Verification failed" };
      }
    } catch (error) {
      return { success: false, results, error: String(error) };
    }
  }
}
