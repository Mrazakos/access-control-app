# Future NPM Module Structure

## Package Structure

```
@your-org/vc-crypto-utils/
├── src/
│   ├── index.ts           # Main entry point
│   ├── types.ts           # All crypto-related types
│   ├── CryptoUtils.ts     # Core crypto functionality
│   └── __tests__/
│       └── CryptoUtils.test.ts
├── dist/                  # Compiled output
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## Example Files

### src/types.ts

```typescript
/**
 * Represents a cryptographic key pair
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Represents a hash value
 */
export type Hash = string;

/**
 * Represents an Ethereum-style address
 */
export type Address = string;

/**
 * Input type for signing a Verifiable Credential
 */
export interface VCSigningInput {
  userMetaDataHash: string;
  issuanceDate: string;
  expirationDate?: string;
}

/**
 * Result of a signing operation
 */
export interface SigningResult {
  signature: string;
  signedMessageHash: string;
}
```

### src/index.ts

```typescript
export { CryptoUtils } from "./CryptoUtils";
export type {
  KeyPair,
  Hash,
  Address,
  VCSigningInput,
  SigningResult,
} from "./types";
```

### package.json

```json
{
  "name": "@your-org/vc-crypto-utils",
  "version": "1.0.0",
  "description": "Fast ECDSA crypto utilities for Verifiable Credentials",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "verifiable-credentials",
    "ecdsa",
    "crypto",
    "ethereum",
    "signing"
  ],
  "dependencies": {
    "ethers": "^6.10.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Usage Example

### Installation

```bash
npm install @your-org/vc-crypto-utils
```

### In Your Application

```typescript
import { CryptoUtils, VCSigningInput } from "@your-org/vc-crypto-utils";

// Generate a key pair
const keyPair = await CryptoUtils.generateKeyPair();

// Create user metadata hash
const userMetaData = { email: "user@example.com", name: "John Doe" };
const userMetaDataHash = CryptoUtils.hash(JSON.stringify(userMetaData));

// Create VC signing input
const vcInput: VCSigningInput = {
  userMetaDataHash,
  issuanceDate: new Date().toISOString(),
  expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

// Sign the VC
const result = await CryptoUtils.sign(vcInput, keyPair.privateKey);

// Verify the signature
const isValid = CryptoUtils.verify(
  result.signedMessageHash,
  result.signature,
  keyPair.publicKey
);

console.log("Signature valid:", isValid);
```

## Benefits

1. **Reusability**: Use across multiple projects
2. **Versioning**: Semantic versioning for updates
3. **Testing**: Dedicated test suite
4. **Documentation**: Comprehensive README
5. **Type Safety**: Full TypeScript support
6. **Tree Shaking**: Only import what you need
7. **Performance**: 100-1000x faster than RSA on mobile devices

## Publishing

```bash
# Build the package
npm run build

# Test before publishing
npm run test

# Publish to npm
npm publish --access public
```

## Version History

- **1.0.0**: Initial release with ECDSA signing for VCs
  - `generateKeyPair()`
  - `sign(vcInput, privateKey)`
  - `verify(hash, signature, publicKey)`
  - `hash(data)`
