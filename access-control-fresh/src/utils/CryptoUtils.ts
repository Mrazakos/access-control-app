import * as crypto from "crypto";
import { KeyPair, VerifiableCredential } from "../types/types";

/**
 * Utility class for cryptographic operations
 */
export class CryptoUtils {
  /**
   * Generates a simple key pair
   * @returns A newly generated RSA key pair
   */
  static generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    return {
      privateKey,
      publicKey,
    };
  }

  /**
   * Signs data with a private key
   * Can input an object (will stringify), hash it, then sign
   */
  static sign(
    data: string | object,
    privateKey: string
  ): Partial<VerifiableCredential> {
    const dataString = typeof data === "string" ? data : JSON.stringify(data);
    const dataHash = crypto.createHash("sha256").update(dataString).digest();

    return {
      signature: crypto
        .sign("sha256", dataHash, {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        })
        .toString("base64"),
      userMetaDataHash: dataHash.toString("base64"),
    };
  }
}
