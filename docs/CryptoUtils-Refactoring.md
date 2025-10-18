# CryptoUtils VC Signing Logic Refactoring

**Date**: October 18, 2025  
**Branch**: 19-clean-up-cryptoutils-vc-sgining-logic-so-it-can-be-put-in-a-separate-module

## Overview

This refactoring cleans up the CryptoUtils signing logic to make it modular and ready for extraction into a separate npm module.

## Changes Made

### 1. Type Reorganization (`src/types/types.ts`)

#### New Types Added:

- **`VCSigningInput`**: Standardized input for VC signing operations

  ```typescript
  interface VCSigningInput {
    userMetaDataHash: string;
    issuanceDate: string;
    expirationDate?: string;
  }
  ```

- **`SigningResult`**: Type-safe return value for signing operations
  ```typescript
  interface SigningResult {
    signature: string;
    signedMessageHash: string;
  }
  ```

#### Type Organization:

Types are now organized into two sections for future module extraction:

**Crypto-Related Types** (ready for module extraction):

- `KeyPair`
- `Hash`
- `Address`
- `VCSigningInput`
- `SigningResult`

**Application-Specific Types**:

- `VerifiableCredential`
- `UserMetaData`

#### Changes to Existing Types:

- **`UserMetaData`**: Removed `timeStamp` field as it's not needed for VC signing

### 2. CryptoUtils Refactoring (`src/utils/CryptoUtils.ts`)

#### Updated `sign()` Method:

**Before**:

```typescript
static async sign(
  data: string | object,
  privateKey: string
): Promise<Partial<VerifiableCredential>>
```

**After**:

```typescript
static async sign(
  vcInput: VCSigningInput,
  privateKey: string
): Promise<SigningResult>
```

#### Benefits:

- ✅ Type-safe input validation
- ✅ Clear contract for VC signing
- ✅ No application-specific types in crypto module
- ✅ Returns dedicated `SigningResult` type instead of partial VC
- ✅ Better documentation and maintainability

#### Updated Test Function:

The test now uses the new `VCSigningInput` type and demonstrates proper usage:

```typescript
const testVCInput: VCSigningInput = {
  userMetaDataHash: userMetaDataHash,
  issuanceDate: new Date().toISOString(),
  expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};
const signResult = await this.sign(testVCInput, keyPair.privateKey);
```

### 3. Hook Updates (`src/hooks/useVerifiableCredentials.ts`)

Updated `issueCredential()` to use the new types:

**Before**:

```typescript
const message = JSON.stringify({
  userDataHash: userDataHash,
  expirationDate: request.expirationDate || null,
});
const vc = await CryptoUtils.sign(message, request.privK);
```

**After**:

```typescript
const vcInput: VCSigningInput = {
  userMetaDataHash: userMetaDataHash,
  issuanceDate: issuanceDate,
  expirationDate: request.expirationDate,
};
const signingResult = await CryptoUtils.sign(vcInput, request.privK);
```

### 4. Screen Updates (`src/screens/VerifiableCredentialsScreen.tsx`)

Removed `timeStamp` from `UserMetaData` creation:

**Before**:

```typescript
const userMetaData: UserMetaData = {
  email: formData.email.trim(),
  name: formData.name.trim(),
  timeStamp: new Date(),
};
```

**After**:

```typescript
const userMetaData: UserMetaData = {
  email: formData.email.trim(),
  name: formData.name.trim(),
};
```

## Benefits for Future Module Extraction

### 1. Clear Separation of Concerns

- Crypto types are grouped together under "CRYPTO-RELATED TYPES" section
- No application-specific types in crypto functions
- Clean boundaries between crypto utilities and application logic

### 2. Type Safety

- Strongly typed inputs and outputs
- No more `Partial<>` types or optional chaining
- Clear contracts for all crypto operations

### 3. Modularity

- `CryptoUtils` only depends on:
  - `ethers` (external dependency)
  - Crypto-related types (can be extracted together)
- No dependencies on application-specific types

### 4. Documentation

- Better JSDoc comments explaining the purpose of each type
- Clear naming conventions
- Organized structure for easy understanding

## Migration Path to NPM Module

When ready to extract to a separate module:

1. **Create new package** with these files:

   ```
   @your-org/vc-crypto-utils/
   ├── src/
   │   ├── types.ts      (KeyPair, Hash, Address, VCSigningInput, SigningResult)
   │   ├── CryptoUtils.ts
   │   └── index.ts
   ├── package.json
   └── tsconfig.json
   ```

2. **Dependencies**:

   ```json
   {
     "dependencies": {
       "ethers": "^6.x.x"
     }
   }
   ```

3. **In your app**:
   ```typescript
   import { CryptoUtils, VCSigningInput } from "@your-org/vc-crypto-utils";
   ```

## Testing

All existing functionality remains intact:

- ✅ No compilation errors
- ✅ VC signing works with new types
- ✅ Verification logic unchanged
- ✅ Test function updated and working

## Next Steps

To complete the module extraction:

1. Create a separate npm package structure
2. Add comprehensive unit tests for the crypto module
3. Add README and documentation
4. Publish to npm registry
5. Update this app to use the published module
