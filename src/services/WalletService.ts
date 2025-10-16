export interface WalletConnection {
  isConnected: boolean;
  address: string | null;
  provider: any | null;
}

export interface SignMessageResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export class WalletService {
  private static instance: WalletService;
  private currentConnection: WalletConnection | null = null;

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Update the current connection state (called by the hook)
   */
  updateConnection(connection: WalletConnection): void {
    this.currentConnection = connection;
  }

  /**
   * Get current wallet connection status
   */
  getConnection(): WalletConnection {
    return (
      this.currentConnection || {
        isConnected: false,
        address: null,
        provider: null,
      }
    );
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    const connection = this.getConnection();
    return connection.isConnected && !!connection.address;
  }

  /**
   * Get connected wallet address
   */
  getWalletAddress(): string | null {
    const connection = this.getConnection();
    return connection.address;
  }

  /**
   * Get truncated wallet address for display
   */
  getDisplayAddress(): string {
    const address = this.getWalletAddress();
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Sign a message with the connected wallet
   */
  async signMessage(message: string): Promise<SignMessageResult> {
    const connection = this.getConnection();

    if (
      !connection.isConnected ||
      !connection.provider ||
      !connection.address
    ) {
      return {
        success: false,
        error: "Wallet not connected",
      };
    }

    try {
      // Convert message to hex format (required by most wallets)
      const messageHex = `0x${Buffer.from(message, "utf8").toString("hex")}`;

      // Sign the message using personal_sign method
      const signature = await connection.provider.request({
        method: "personal_sign",
        params: [messageHex, connection.address],
      });

      return {
        success: true,
        signature,
      };
    } catch (error) {
      console.error("Wallet signing error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to sign message",
      };
    }
  }

  /**
   * Create and sign an unlock message with timestamp
   */
  async createUnlockSignature(): Promise<SignMessageResult> {
    const address = this.getWalletAddress();
    if (!address) {
      return {
        success: false,
        error: "No wallet connected",
      };
    }

    const timestamp = Date.now();
    const unlockMessage = `Unlock request from ${address} at ${timestamp}`;

    return await this.signMessage(unlockMessage);
  }

  /**
   * Get wallet connection status for UI display
   */
  getConnectionStatus(): {
    status: "connected" | "disconnected";
    address: string;
    displayAddress: string;
  } {
    const isConnected = this.isWalletConnected();
    const address = this.getWalletAddress() || "";

    return {
      status: isConnected ? "connected" : "disconnected",
      address,
      displayAddress: this.getDisplayAddress(),
    };
  }

  /**
   * Format wallet address for different display contexts
   */
  formatAddress(
    address: string | null,
    format: "short" | "medium" | "full" = "short"
  ): string {
    if (!address) return "Not connected";

    switch (format) {
      case "short":
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
      case "medium":
        return `${address.slice(0, 10)}...${address.slice(-6)}`;
      case "full":
        return address;
      default:
        return address;
    }
  }
}
