/**
 * x402 Payment SDK - Utilities
 *
 * General-purpose utilities for wallet management, network detection, and helpers
 */

// Wallet utilities
export {
  isWalletInstalled,
  getWalletProvider,
  formatAddress,
  markWalletDisconnected,
  clearWalletDisconnection,
  isWalletManuallyDisconnected,
  saveConnectedNetworkType,
  getConnectedNetworkType,
  getWalletInstallUrl,
  getWalletDisplayName,
  // 多网络钱包缓存
  getAllWalletAddresses,
  saveWalletAddress,
  getCachedWalletAddress,
  removeWalletAddress,
  clearAllWalletAddresses,
  // 钱包 ID 缓存 (用于支付时恢复正确的 provider)
  getAllConnectedWalletIds,
  saveConnectedWalletId,
  getConnectedWalletId,
  removeConnectedWalletId,
} from "./wallet";

// Wallet connection utilities (for demo/UI)
export {
  connectWallet,
  disconnectWallet,
  getCurrentWallet,
  switchNetwork, // 新增：切换网络
  onAccountsChanged,
  onChainChanged,
  onWalletDisconnect,
} from "./wallet-connect";

// Wallet discovery (multi-wallet support)
export {
  initEVMWalletDiscovery,
  getEVMWallets,
  getSolanaWallets,
  getWalletsForNetwork,
  getWalletById,
  getWalletByName,
  connectToWallet,
  onEVMWalletsChanged,
  // Provider management for payments
  getCurrentConnectedWallet,
  setCurrentConnectedWallet,
  clearConnectedWallet,
  getWalletProviderForPayment,
  getValidatedWalletProvider,
  type WalletInfo,
  type EIP6963ProviderInfo,
  type EIP6963ProviderDetail,
} from "./wallet-discovery";

// Payment helpers (for demo/UI)
export {
    makePayment,
  parsePaymentRequired,
  getSupportedNetworkTypes,
  type PaymentCallbacks,
} from "./payment-helpers";

// Network utilities
export {
  getNetworkType,
  isEvmNetwork,
  isSolanaNetwork,
  isSolanaAddress,
  isEvmAddress,
  getNetworkDisplayName,
} from "./network";

// General helpers
export {
  toAtomicUnits,
  fromAtomicUnits,
  sleep,
  retryWithBackoff,
  is402Response,
} from "./helpers";

// Payment error handling
export {
  parsePaymentError,
  wrapPaymentError,
  PaymentOperationError,
  PaymentErrorCode,
  IGNORED_402_ERRORS,
  PAYMENT_ERROR_MESSAGES,
  type PaymentError,
} from "./payment-error-handler";
