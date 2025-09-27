import RNSimpleCrypto from "react-native-simple-crypto";
import { KeyPair, VerifiableCredential } from "../types/types";

/**
 * Utility class for cryptographic operations
 */
export class CryptoUtils {
  /**
   * Generates a simple key pair
   * @returns A newly generated RSA key pair
   */
  static async generateKeyPair(): Promise<KeyPair> {
    const { public: publicKey, private: privateKey } =
      await RNSimpleCrypto.RSA.generateKeys(1024);
    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Signs data with a private key
   * Can input an object (will stringify), hash it, then sign
   */
  static async sign(
    data: string | object,
    privateKey: string
  ): Promise<Partial<VerifiableCredential>> {
    const dataString = typeof data === "string" ? data : JSON.stringify(data);

    return {
      signature: await RNSimpleCrypto.RSA.sign(
        dataString,
        privateKey,
        "SHA256"
      ),
      userMetaDataHash: await RNSimpleCrypto.SHA.sha256(dataString),
    };
  }
}
