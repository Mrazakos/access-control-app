# Quick Start Guide - Lock API Integration

## 🚀 Getting Started

### Prerequisites

- Lock device running on network: `http://192.168.0.17:3000/api/v1`
- Mobile device on same network
- Lock registered on blockchain (status: Active)

## 📱 Features

### 1️⃣ Setup Lock Device

**Location:** Devices Screen → Your Lock Card

**Steps:**

1. Create a lock (if not already created)
2. Wait for blockchain registration to complete (green "Active" status)
3. Tap **Setup Lock** button
4. ✅ Success! Button changes to **Reset Lock**

**What it does:**

- Sends lock ID and public key to lock device
- Lock device stores configuration
- Lock device starts listening to blockchain

---

### 2️⃣ Unlock with Credential

**Location:** Unlock Screen → Your Credential Card

**Steps:**

1. Find your access credential
2. Tap **Unlock** button
3. ✅ Success! Lock opens

**What it does:**

- Sends credential to lock device
- Lock verifies signature
- Lock checks revocation status
- Lock opens if valid

---

### 3️⃣ Reset Lock Configuration

**Location:** Devices Screen → Your Lock Card

**Steps:**

1. Tap **Reset Lock** button
2. Confirm reset
3. ✅ Button changes back to **Setup Lock**

**What it does:**

- Sends admin credential to lock
- Lock clears configuration
- Lock stops blockchain listener

---

## 🎯 Common Scenarios

### Scenario: New Lock Setup

```
1. Create lock in app          → Blockchain registration
2. Wait for "Active" status    → Lock ready
3. Tap "Setup Lock"           → Lock configured
4. Issue credentials          → Share with users
5. Users unlock              → Access granted!
```

### Scenario: User Unlocking Door

```
1. Receive credential QR      → Scan in app
2. Navigate to Unlock screen → See credential
3. Tap "Unlock" button       → Verification
4. Success message           → Door opens! 🎉
```

### Scenario: Reconfigure Lock

```
1. Tap "Reset Lock"          → Confirm reset
2. Tap "Setup Lock"          → Reconfigure
3. Issue new credentials     → Back online!
```

---

## ⚠️ Error Messages

### "Lock is not reachable"

**Cause:** Network connectivity issue
**Fix:**

- Check lock device is powered on
- Verify mobile device on same network
- Check base URL is correct

### "Credential has been revoked"

**Cause:** Lock owner revoked access
**Fix:** Request new credential from owner

### "Credential has expired"

**Cause:** Credential past expiration date
**Fix:** Request new credential with valid dates

### "Lock already configured"

**Cause:** Lock was already setup
**Fix:** Tap "Reset Lock" first, then "Setup Lock"

### "Verification failed"

**Cause:** Invalid credential or lock mismatch
**Fix:**

- Ensure credential is for this lock
- Check credential not expired/revoked
- Try refreshing credentials

---

## 💡 Tips

### For Lock Owners

- ✅ Always setup lock after blockchain registration
- ✅ Issue credentials with appropriate expiration dates
- ✅ Revoke credentials when access should be removed
- ✅ Reset and reconfigure if lock behavior is strange

### For Lock Users

- ✅ Keep credentials up to date (refresh screen)
- ✅ Check expiration dates before unlocking
- ✅ Delete expired credentials
- ✅ Request new credential if unlock fails

---

## 🔧 Configuration

### Change Lock API URL

**File:** `DevicesScreen.tsx` and `UnlockScreen.tsx`

```typescript
const lockApi = useLockApi({
  baseUrl: "http://YOUR_LOCK_IP:3000/api/v1",
});
```

### Change Request Timeout

```typescript
const lockApi = useLockApi({
  baseUrl: "http://192.168.0.17:3000/api/v1",
  timeout: 15000, // 15 seconds
});
```

---

## 🧪 Testing

### Test Setup

1. Create test lock
2. Wait for "Active" status
3. Click "Setup Lock"
4. Check lock device logs
5. Verify button changed to "Reset Lock"

### Test Unlock

1. Issue test credential (short expiry)
2. Share with test user
3. User scans QR code
4. User clicks "Unlock"
5. Verify lock opens
6. Check logs on both sides

### Test Reset

1. Click "Reset Lock"
2. Confirm action
3. Verify button changed to "Setup Lock"
4. Setup again to confirm

---

## 📊 Status Indicators

### Lock Card

- 🟢 **Active** - Lock registered, ready for setup
- 🟡 **Syncing** - Blockchain registration in progress
- ⚪ **Inactive** - Lock not yet registered
- 🔴 **Failed** - Registration failed (tap to retry)

### Lock Configuration

- 🔧 **Setup Lock** - Lock needs configuration
- 🔄 **Reset Lock** - Lock is configured

### Credentials

- ✅ **Valid** - Can unlock
- ⏰ **Expiring Soon** - Check expiration date
- 🔴 **Expired** - Cannot unlock, request new credential

---

## 🆘 Support

### Need Help?

1. Check error message
2. Review this guide
3. Check lock device logs
4. Verify network connectivity
5. Contact lock administrator

### Useful Info for Support

- Lock ID
- Error message
- Network configuration
- Credential expiration date
- Screenshots

---

## 📚 More Information

See full documentation:

- [Lock API Integration](./LOCK-API-INTEGRATION.md) - Complete API docs
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md) - Technical details

---

**Last Updated:** November 6, 2025
