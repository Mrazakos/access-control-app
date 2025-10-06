sequenceDiagram
participant User as 👤 User (React Native App)
participant Blockchain as ⛓️ Blockchain (EVM)
participant LocalState as 📱 Local Storage / State

    %% Transaction initiation
    User->>LocalState: Create pendingRegistration<br/>(publicKey, timeoutId)
    User->>Blockchain: Submit registerLock() transaction
    Blockchain-->>User: Return txHash (pending state)

    %% Waiting for confirmation
    User->>Blockchain: Wait for transaction receipt
    Blockchain-->>User: Return transactionReceipt (includes logs)

    %% Receipt parsing
    User->>User: Parse transactionReceipt.logs[]
    User->>User: Find LockRegistered event in logs
    alt Event found & publicKey matches
        User->>LocalState: Update lock status = "active"<br/>Set lockId from event
        User->>LocalState: Clear timeout, set pendingRegistration = null
        User->>User: Show success (🎉)
    else Event missing or parsing failed
        User->>LocalState: Update lock status = "failed"
        User->>LocalState: Clear timeout
        User->>User: Show error (⚠️)
    end

    %% Receipt fetch error
    alt Receipt error
        User->>LocalState: Update lock status = "failed"
        User->>LocalState: Clear timeout
        User->>User: Show "Transaction failed"
    end
