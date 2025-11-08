# Lock API Integration Documentation

This document explains how to use the Lock API integration features for configuring locks and verifying credentials.

## Overview

The mobile app now supports direct communication with physical lock devices through their REST API. This enables:

1. **Lock Configuration** - Initialize and reset lock devices with blockchain credentials
2. **Credential Verification** - Unlock doors by verifying credentials directly with the lock

## Architecture

### Services

#### `LockApiService.ts`

Core service for communicating with lock REST APIs.

**Features:**

- Configuration endpoints (`init`, `status`, `reset`)
- Verification endpoint (`verify`)
- Health check
- Error handling and logging

**Usage:**

```typescript
import { createLockApiService } from "./services/LockApiService";

const lockApi = createLockApiService("http://192.168.0.17:3000/api/v1");

// Initialize a lock
const response = await lockApi.initializeLock(lockId, publicKey);

// Verify a credential
const verificationResult = await lockApi.verifyCredential(credential);
```

#### `useLockApi` Hook

React hook that wraps `LockApiService` with state management.

**Features:**

- Loading states
- Error handling
- Auto health checks
- Dynamic base URL updates

**Usage:**

```typescript
import { useLockApi } from "./hooks/useLockApi";

const { isLoading, error, initializeLock, verifyCredential, checkHealth } =
  useLockApi({ baseUrl: "http://192.168.0.17:3000/api/v1" });
```

## Features

### 1. Lock Configuration (DevicesScreen)

#### Setup Lock

When you create a lock on the blockchain, you need to configure the physical lock device with its credentials.

**Steps:**

1. Navigate to the Devices screen
2. Find your lock in the list
3. Click the **Setup Lock** button
4. The app will send the lock's ID and public key to the lock device
5. Once successful, the button changes to **Reset Lock**

**What happens:**

- POST `/api/v1/config/init` with `{ lockId, publicKey }`
- The lock device stores its configuration
- The lock device starts listening for blockchain events

#### Reset Lock

Reset a lock's configuration to allow reconfiguration.

**Requirements:**

- Admin-level access credential
- Lock must be in "configured" state

**Steps:**

1. Click the **Reset Lock** button
2. Confirm the action
3. The lock device will be reset and ready for setup again

**What happens:**

- POST `/api/v1/config/reset` with admin credential
- The lock device clears its configuration
- The lock device stops blockchain listener

### 2. Credential Verification (UnlockScreen)

#### Unlock with Credential

Use your access credentials to unlock doors.

**Steps:**

1. Navigate to the Unlock screen
2. Select a credential from your list
3. Click the **Unlock** button
4. The app sends your credential to the lock for verification
5. If verified, the lock opens! 🎉

**What happens:**

- POST `/api/v1/verify` with the full verifiable credential
- The lock device:
  1. Validates the credential signature
  2. Checks if it's revoked on blockchain
  3. Verifies it hasn't expired
  4. Confirms the lock ID matches
- Returns verification result
- Lock actuates if verification succeeds

#### Credential States

- ✅ **Valid** - Green indicator, can be used to unlock
- 🔴 **Expired** - Red indicator, cannot be used
- 🚫 **Revoked** - Detected during verification, access denied

## API Endpoints

### Configuration Endpoints

#### POST `/api/v1/config/init`

Initialize lock configuration.

**Request:**

```json
{
  "lockId": 1,
  "publicKey": "0x04abc..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Lock initialized successfully",
  "lockId": 1,
  "timestamp": "2025-11-06T12:00:00.000Z"
}
```

**Security:** Protected by `ConfigGuard` - can only be called once

---

#### GET `/api/v1/config/status`

Get current lock configuration status.

**Response:**

```json
{
  "isConfigured": true,
  "lockId": 1,
  "publicKey": "0x04abc...",
  "timestamp": "2025-11-06T12:00:00.000Z"
}
```

---

#### POST `/api/v1/config/reset`

Reset lock configuration.

**Request:**

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "id": "vc:admin-credential",
  "type": ["VerifiableCredential"],
  "credentialSubject": {
    "accessLevel": "admin",
    "permissions": ["reset"]
  },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "proofValue": "0x..."
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Lock configuration reset. You can now call /init again.",
  "timestamp": "2025-11-06T12:00:00.000Z"
}
```

**Security:** Requires admin-level Verifiable Credential

---

### Verification Endpoint

#### POST `/api/v1/verify`

Verify a verifiable credential and unlock.

**Request:**

```json
{
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "id": "vc:123e4567-e89b-12d3-a456-426614174000",
  "type": ["VerifiableCredential", "LockAccessCredential"],
  "issuer": {
    "id": "did:lock:1",
    "name": "Main Entrance"
  },
  "credentialSubject": {
    "id": "did:user:abc123",
    "userMetaDataHash": "0x...",
    "lock": {
      "id": "1",
      "name": "Main Entrance"
    },
    "accessLevel": "standard",
    "permissions": ["unlock"]
  },
  "issuanceDate": "2025-11-06T12:00:00.000Z",
  "validUntil": "2025-12-06T12:00:00.000Z",
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2025-11-06T12:00:00.000Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:lock:1#keys-1",
    "proofValue": "0x..."
  },
  "lockId": 1,
  "lockNickname": "Main Entrance"
}
```

**Response:**

```json
{
  "verified": true,
  "credentialId": "vc:123e4567-e89b-12d3-a456-426614174000",
  "lockId": 1,
  "isRevoked": false,
  "timestamp": "2025-11-06T12:00:00.000Z"
}
```

**Security:** Requires valid Verifiable Credential with standard access level

---

## Configuration

### Base URL

The default lock API base URL is configured in the components:

```typescript
const lockApi = useLockApi({
  baseUrl: "http://192.168.0.17:3000/api/v1",
});
```

**To change the base URL:**

1. Update the `baseUrl` in `DevicesScreen.tsx`
2. Update the `baseUrl` in `UnlockScreen.tsx`

Or create a centralized configuration file:

```typescript
// src/config/lockApi.ts
export const LOCK_API_CONFIG = {
  baseUrl: process.env.LOCK_API_URL || "http://192.168.0.17:3000/api/v1",
  timeout: 10000,
};
```

### Timeout

Default timeout is 10 seconds. Configure it when creating the service:

```typescript
const lockApi = useLockApi({
  baseUrl: "http://192.168.0.17:3000/api/v1",
  timeout: 15000, // 15 seconds
});
```

## Error Handling

### Common Errors

#### Network Errors

- **Error:** `Failed to initialize lock: Network request failed`
- **Solution:** Check that:
  - The lock device is powered on
  - The mobile device is on the same network
  - The base URL is correct
  - The lock's API server is running

#### Configuration Errors

- **Error:** `Lock is already configured`
- **Solution:** Use the Reset button first, then Setup again

#### Verification Errors

- **Error:** `No signature found in credential proof`
- **Solution:** Ensure the credential has a valid `proof.proofValue`

- **Error:** `This credential has been revoked`
- **Solution:** The credential owner has revoked access. Request a new credential.

- **Error:** `This credential has expired`
- **Solution:** Request a new credential with a valid expiration date.

## Security Considerations

### Network Security

- The lock API should be on a **private network** (not exposed to internet)
- Use **HTTPS** in production environments
- Consider implementing **VPN** for remote access

### Credential Security

- Credentials contain signatures that cannot be forged
- Revoked credentials are checked on-chain before unlock
- Expired credentials are rejected automatically
- The lock never stores user credentials, only verifies them

### Access Control

- **Setup endpoint** - Protected by guard, can only be called once
- **Reset endpoint** - Requires admin-level credential
- **Verify endpoint** - Requires valid credential with standard access

## Testing

### Test Lock Setup

1. Create a lock in the app
2. Wait for blockchain registration to complete (status: Active)
3. Click "Setup Lock"
4. Check lock device logs for initialization confirmation
5. Button should change to "Reset Lock"

### Test Credential Verification

1. Issue a credential to another user
2. Share the QR code
3. Recipient scans the QR code
4. Recipient clicks "Unlock"
5. Check lock device logs for verification details
6. Lock should actuate if verification succeeds

### Health Check

The service automatically performs a health check when initialized:

```typescript
const { isHealthy, checkHealth } = useLockApi({ baseUrl: "..." });

// Manual health check
await checkHealth();
console.log("Lock API reachable:", isHealthy);
```

## Future Enhancements

### Planned Features

1. **Dynamic Lock Discovery** - Auto-detect locks on the network
2. **Multi-Lock Support** - Configure base URLs per lock
3. **Offline Queue** - Queue unlock requests when offline
4. **Analytics** - Track unlock success rates
5. **Push Notifications** - Alert on successful/failed unlock attempts

### API Extensions

1. **Bulk Operations** - Initialize multiple locks
2. **Audit Logs** - Retrieve unlock history
3. **Lock Status** - Get real-time lock state (locked/unlocked)
4. **Battery Status** - Monitor lock battery levels

## Troubleshooting

### Lock Not Responding

1. Check network connectivity
2. Verify the base URL is correct
3. Run health check: `await checkHealth()`
4. Check lock device logs

### Verification Failures

1. Ensure credential is not expired
2. Check if credential is revoked
3. Verify lock ID matches
4. Confirm lock is configured

### Setup Failures

1. Ensure lock is not already configured
2. Check lock has blockchain connectivity
3. Verify wallet is connected
4. Confirm lock is registered on blockchain

## Support

For issues or questions:

1. Check the lock device logs
2. Review this documentation
3. Check the mobile app console logs
4. Contact the lock administrator

## Example Workflow

### Complete Setup and Unlock Flow

```typescript
// 1. Create and register lock (DevicesScreen)
const lock = await createAndRegisterLock({
  name: "Main Entrance",
  description: "Front door",
  location: "Building A",
});

// 2. Wait for blockchain registration
// Status will change to "active"

// 3. Setup lock device (DevicesScreen)
await lockApi.initializeLock(lock.id, lock.address);
// Button changes to "Reset Lock"

// 4. Issue credential (VerifiableCredentialsScreen)
const credential = await issueCredential({
  lockId: lock.id,
  lockNickname: lock.name,
  userMetaData: { name: "John Doe", email: "john@example.com" },
  pubk: lock.address,
  privK: lock.privateKey,
  validUntil: "2025-12-31T23:59:59.000Z",
});

// 5. Share QR code with user
// User scans QR code

// 6. User unlocks (UnlockScreen)
const result = await lockApi.verifyCredential(credential);
if (result.verified) {
  console.log("🎉 Lock opened!");
}
```

---

**Last Updated:** November 6, 2025
**Version:** 1.0.0
