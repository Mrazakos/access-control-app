# Contract Integration Guide - Simplified Wagmi Approach

This guide explains how to use the **simplified wagmi-only approach** for contract integration with your Access Control mobile app. No separate service layer needed!

## Why This Approach is Better

Instead of creating a separate `ContractService` with viem and ethers dependencies, we use **pure wagmi hooks** directly in the `useLockService` hook. This is:

✅ **Simpler** - Everything in one place, no extra abstractions  
✅ **More React-like** - Uses React hooks pattern you're familiar with  
✅ **Better caching** - wagmi handles caching, refetching, and error states automatically  
✅ **Fewer dependencies** - No need for ethers or additional viem setup  
✅ **Type-safe** - Still uses your TypeChain generated types

## How It Works

### The Magic: Two Types of Operations

#### 1. **Reactive Reads** (using `useReadContract` hooks)

These automatically fetch data when the component mounts and refetch when needed:

```typescript
// These hooks run automatically and provide reactive data
const { data: totalLocks, refetch: refetchTotalLocks } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: AccessControl__factory.abi,
  functionName: "getTotalLocks",
});

const { data: isPaused, refetch: refetchPaused } = useReadContract({
  address: CONTRACT_ADDRESS,
  abi: AccessControl__factory.abi,
  functionName: "paused",
});
```

**Benefits:**

- Data is **automatically cached** by wagmi
- **Automatically refetches** when wallet changes or chain changes
- Provides **loading states** and **error handling**
- Data is **always up-to-date**

#### 2. **Write Operations** (using `useWriteContract`)

For transactions that change blockchain state:

```typescript
const { writeContract, isPending, error } = useWriteContract();

// Simple contract calls - no service layer needed!
await writeContract({
  address: CONTRACT_ADDRESS,
  abi: AccessControl__factory.abi,
  functionName: "registerLock",
  args: [publicKey],
});
```

## What You Get from `useLockService`

### Local Operations (unchanged)

```typescript
const {
  locks, // Array of locally stored locks
  createLock, // Create lock locally
  updateLock, // Update lock locally
  deleteLock, // Delete lock locally
  isLoading, // Loading state for local operations
  error, // Error state
} = useLockService();
```

### Blockchain Write Operations

```typescript
const {
  registerLockOnChain, // Register lock on blockchain
  revokeSignatureOnChain, // Revoke single signature
  batchRevokeSignatures, // Revoke multiple signatures
  transferLockOwnership, // Transfer lock to new owner
  isTransactionPending, // Is any transaction pending?
  transactionHash, // Hash of last transaction
  transactionError, // Transaction error message
} = useLockService();
```

### Blockchain Read Operations

```typescript
const {
  // REACTIVE DATA (automatically updates)
  totalLocksOnChain, // number | undefined - Total locks on chain
  isContractPaused, // boolean | undefined - Is contract paused?
  refetchContractData, // () => void - Manually refetch data

  // DYNAMIC FUNCTIONS (call when needed)
  getLockInfoOnChain, // (lockId) => Promise<LockInfo | null>
  getTotalLocksOnChain, // () => Promise<number>
  isSignatureRevokedOnChain, // (lockId, signature) => Promise<boolean>
  checkContractPaused, // () => Promise<boolean>
} = useLockService();
```

## Setup

1. **Environment Configuration**
   Copy `.env.example` to `.env` and update the contract address:

   ```bash
   EXPO_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   ```

2. **Configuration**
   - RPC: Your local hardhat node at `http://192.168.0.17:8545`
   - Default contract address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

## Usage Examples

### 1. Display Live Contract Data

```typescript
import { useLockService } from "../hooks/useLockService";

const ContractStats = () => {
  const { totalLocksOnChain, isContractPaused, refetchContractData } =
    useLockService();

  return (
    <View>
      <Text>Total Locks: {totalLocksOnChain ?? "Loading..."}</Text>
      <Text>Contract Status: {isContractPaused ? "Paused" : "Active"}</Text>
      <TouchableOpacity onPress={refetchContractData}>
        <Text>Refresh Data</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 2. Create and Register a Lock

```typescript
const CreateLockFlow = () => {
  const { createLock, registerLockOnChain, isTransactionPending } =
    useLockService();
  const { address } = useAccount();

  const handleCreateAndRegister = async () => {
    try {
      // 1. Create lock locally (generates key pair)
      const newLock = await createLock({
        name: "My Smart Lock",
        owner: address,
      });

      // 2. Register on blockchain
      await registerLockOnChain({
        publicKey: newLock.publicKey,
        owner: address,
      });

      Alert.alert("Success", "Lock created and registered!");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleCreateAndRegister}
      disabled={isTransactionPending}
    >
      <Text>
        {isTransactionPending ? "Creating..." : "Create & Register Lock"}
      </Text>
    </TouchableOpacity>
  );
};
```

### 3. Transaction Status Handling

```typescript
const TransactionStatus = () => {
  const { isTransactionPending, transactionHash, transactionError } =
    useLockService();

  if (isTransactionPending) {
    return <ActivityIndicator />;
  }

  if (transactionError) {
    return <Text style={{ color: "red" }}>Error: {transactionError}</Text>;
  }

  if (transactionHash) {
    return <Text>Transaction: {transactionHash}</Text>;
  }

  return null;
};
```

### 4. Dynamic Data Fetching

```typescript
const LockDetails = ({ lockId }: { lockId: number }) => {
  const { getLockInfoOnChain } = useLockService();
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);

  useEffect(() => {
    const fetchLockInfo = async () => {
      const info = await getLockInfoOnChain(lockId);
      setLockInfo(info);
    };
    fetchLockInfo();
  }, [lockId]);

  if (!lockInfo) return <Text>Loading...</Text>;

  return (
    <View>
      <Text>Lock ID: {lockInfo.lockId}</Text>
      <Text>Owner: {lockInfo.owner}</Text>
      <Text>Revoked Count: {lockInfo.revokedCount}</Text>
    </View>
  );
};
```

## Key Concepts Explained

### Reactive vs Dynamic Reads

**Reactive Reads** (`totalLocksOnChain`, `isContractPaused`):

- ✅ Automatically fetch when component mounts
- ✅ Automatically refetch when wallet/chain changes
- ✅ Cached by wagmi
- ✅ Always up-to-date
- ❌ Can't pass dynamic parameters

**Dynamic Reads** (`getLockInfoOnChain(lockId)`):

- ✅ Call with any parameters you need
- ✅ Call when you need the data
- ❌ Not automatically cached
- ❌ You manage when to call

### Transaction Lifecycle

1. **Call write function** → `isTransactionPending = true`
2. **Transaction submitted** → `transactionHash` is set
3. **Transaction confirmed** → `isTransactionPending = false`
4. **Reactive data updates** → `totalLocksOnChain` etc. automatically refetch

### Error Handling

- `error` - Local storage errors
- `transactionError` - Blockchain transaction errors
- Wagmi read hooks have their own error states

## Benefits of This Approach

### ✅ What You Gain

1. **Simplicity** - No extra service layer to maintain
2. **React Integration** - Uses standard React patterns
3. **Automatic Caching** - wagmi handles all caching for you
4. **Type Safety** - Full TypeScript support with TypeChain
5. **Better UX** - Reactive data keeps UI in sync
6. **Less Code** - ~50% less code than service approach

### ⚠️ What to Remember

1. **Reactive data might be `undefined`** during initial load
2. **Dynamic reads aren't cached** - call wisely
3. **Always handle transaction states** for good UX

## Migration from Service Approach

If you had the old `ContractService` approach:

```typescript
// OLD - Service approach
const contractService = ContractService.getInstance();
const lockInfo = await contractService.getLockInfo(1);

// NEW - Direct wagmi approach
const { getLockInfoOnChain } = useLockService();
const lockInfo = await getLockInfoOnChain(1);
```

The new approach is much simpler and more React-native! 🚀
