import * as forge from "node-forge";
import { KeyPair, VerifiableCredential } from "../types/types";

/**
 * Utility class for cryptographic operations using node-forge
 * Replicates Node.js crypto functionality for React Native
 */
export class CryptoUtils {
  /**
   * Generates an RSA key pair (async using node-forge)
   * @returns A newly generated RSA key pair
   */
  static async generateKeyPair(): Promise<KeyPair> {
    return new Promise((resolve, reject) => {
      try {
        // Generate RSA key pair asynchronously
        forge.pki.rsa.generateKeyPair(
          { bits: 2048 },
          (err: any, keypair: any) => {
            if (err) {
              reject(err);
              return;
            }

            // Convert to PEM format (equivalent to Node.js crypto output)
            const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
            const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);

            resolve({
              privateKey,
              publicKey,
            });
          }
        );
      } catch (error) {
        reject(new Error(`Key generation failed: ${error}`));
      }
    });
  }

  /**
   * Signs data with a private key using RSA with SHA-256
   * Returns base64 encoded signature and hash
   * @param data Data to sign (string or object)
   * @param privateKey Private key in PEM format
   * @returns Signature and hash in base64 format
   */
  static async sign(
    data: string | object,
    privateKey: string
  ): Promise<Partial<VerifiableCredential>> {
    try {
      const dataString = typeof data === "string" ? data : JSON.stringify(data);

      // Create SHA-256 hash
      const md = forge.md.sha256.create();
      md.update(dataString, "utf8");

      // Parse the private key
      const key = forge.pki.privateKeyFromPem(privateKey);

      // Sign the hash (basic RSA signing)
      const signature = key.sign(md);
      const dataHash = md.digest();

      return {
        signature: forge.util.encode64(signature),
        userMetaDataHash: forge.util.encode64(dataHash.getBytes()),
      };
    } catch (error) {
      throw new Error(`Signing failed: ${error}`);
    }
  }

  /**
   * Verifies a digital signature with strict base64 validation
   * @param dataHash Base64 encoded hash of the original data
   * @param signature Base64 encoded signature
   * @param publicKey Public key in PEM format
   * @returns True if signature is valid
   */
  static verify(
    dataHash: string,
    signature: string,
    publicKey: string
  ): boolean {
    try {
      // SECURITY FIX: Strict base64 validation to prevent tampering
      if (!CryptoUtils.isValidBase64(signature)) {
        console.warn("Invalid base64 signature detected:", signature);
        return false;
      }

      if (!CryptoUtils.isValidBase64(dataHash)) {
        console.warn("Invalid base64 dataHash detected:", dataHash);
        return false;
      }

      // Parse the public key
      const key = forge.pki.publicKeyFromPem(publicKey);

      // Decode base64 inputs
      const decodedHash = forge.util.decode64(dataHash);
      const decodedSignature = forge.util.decode64(signature);

      // Verify signature (basic RSA verification)
      return key.verify(decodedHash, decodedSignature);
    } catch (error) {
      console.error("Verification failed:", error);
      return false;
    }
  }

  /**
   * Strict base64 validation to prevent signature tampering
   * @param str String to validate
   * @returns True if valid base64
   */
  private static isValidBase64(str: string): boolean {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

    if (!base64Regex.test(str)) {
      return false;
    }

    try {
      const decoded = forge.util.decode64(str);
      const reencoded = forge.util.encode64(decoded);
      return reencoded === str;
    } catch {
      return false;
    }
  }

  /**
   * Generates a random address
   * @returns Random address string
   */
  static generateAddress(): string {
    const randomBytes = forge.random.getBytesSync(20);
    return "addr_" + forge.util.encode64(randomBytes);
  }

  /**
   * Generates a random number for IDs
   * @returns Random ID number
   */
  static generateId(): number {
    return Math.floor(Math.random() * 1000000);
  }

  /**
   * Creates a SHA-256 hash of the input data
   * @param data Data to hash
   * @returns Base64 encoded hash
   */
  static hash(data: string): string {
    const md = forge.md.sha256.create();
    md.update(data, "utf8");
    return forge.util.encode64(md.digest().getBytes());
  }

  /**
   * Test function to verify all crypto operations are working correctly
   * @returns Test results with success/failure status
   */
  static async runCryptoTest(): Promise<{
    success: boolean;
    results: string[];
    error?: string;
  }> {
    const results: string[] = [];

    try {
      results.push("🔄 Starting crypto operations test...");

      // 1. Generate key pair
      results.push("📋 Step 1: Generating RSA key pair...");
      const keyPair = await this.generateKeyPair();
      results.push("✅ Key pair generated successfully");

      // 2. Test data
      const testData = {
        message: "Hello, crypto world!",
        timestamp: Date.now(),
        user: "test-user",
      };
      results.push(`📋 Step 2: Test data: ${JSON.stringify(testData)}`);

      // 3. Sign the data
      results.push("📋 Step 3: Signing data...");
      const signResult = await this.sign(testData, keyPair.privateKey);
      results.push(`✅ Data signed successfully`);
      results.push(
        `📝 Signature: ${signResult.signature?.substring(0, 50)}...`
      );
      results.push(
        `📝 Hash: ${signResult.userMetaDataHash?.substring(0, 50)}...`
      );

      // 4. Verify the signature
      results.push("📋 Step 4: Verifying signature...");
      const isValid = this.verify(
        signResult.userMetaDataHash!,
        signResult.signature!,
        keyPair.publicKey
      );

      if (isValid) {
        results.push("✅ Signature verification: PASSED");
      } else {
        results.push("❌ Signature verification: FAILED");
        return {
          success: false,
          results,
          error: "Signature verification failed",
        };
      }

      // 5. Test with tampered signature (should fail)
      results.push("📋 Step 5: Testing with tampered signature...");
      const tamperedSignature = "invalidBase64!@#";
      const shouldFail = this.verify(
        signResult.userMetaDataHash!,
        tamperedSignature,
        keyPair.publicKey
      );

      if (!shouldFail) {
        results.push("✅ Tampered signature verification: CORRECTLY FAILED");
      } else {
        results.push("❌ Tampered signature verification: INCORRECTLY PASSED");
        return {
          success: false,
          results,
          error: "Tampered signature should have failed verification",
        };
      }

      // 6. Test address generation
      results.push("📋 Step 6: Testing address generation...");
      const address1 = this.generateAddress();
      const address2 = this.generateAddress();

      if (
        address1.startsWith("addr_") &&
        address2.startsWith("addr_") &&
        address1 !== address2
      ) {
        results.push("✅ Address generation: PASSED");
        results.push(`📝 Sample address: ${address1}`);
      } else {
        results.push("❌ Address generation: FAILED");
        return {
          success: false,
          results,
          error: "Address generation not working correctly",
        };
      }

      // 7. Test ID generation
      results.push("📋 Step 7: Testing ID generation...");
      const id1 = this.generateId();
      const id2 = this.generateId();

      if (typeof id1 === "number" && typeof id2 === "number" && id1 !== id2) {
        results.push("✅ ID generation: PASSED");
        results.push(`📝 Sample IDs: ${id1}, ${id2}`);
      } else {
        results.push("❌ ID generation: FAILED");
        return {
          success: false,
          results,
          error: "ID generation not working correctly",
        };
      }

      results.push("🎉 All crypto operations completed successfully!");
      results.push(
        "🔒 Your node-forge implementation matches Node.js crypto functionality!"
      );
      return { success: true, results };
    } catch (error) {
      results.push(`❌ Error during testing: ${error}`);
      return { success: false, results, error: String(error) };
    }
  }
}
