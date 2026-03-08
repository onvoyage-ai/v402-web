/**
 * @x402/sdk
 *
 * x402 Payment SDK for SVM (Solana) and EVM chains
 *
 * @example
 * ```typescript
 * import { handleSvmPayment, handleEvmPayment } from '@x402/sdk';
 *
 * // SVM payment
 * const response = await handleSvmPayment(endpoint, {
 *   wallet: window.solana,
 *   network: 'solana-devnet'
 * });
 *
 * // EVM payment
 * const response = await handleEvmPayment(endpoint, {
 *   wallet: { address, signTypedData },
 *   network: 'base-sepolia'
 * });
 * ```
 */

// ============================================
// Type exports
// ============================================
export type {
    // Common types
    WalletAdapter,
    EvmWalletAdapter,
    NetworkType,

    // SVM types
    SolanaNetwork,
    SolanaPaymentPayload,
    SvmClientConfig,
    CreateSvmPaymentHeaderParams,

    // EVM types
    EvmNetwork,
    EvmPaymentPayload,
    EvmClientConfig,
    CreateEvmPaymentHeaderParams,
    EvmNetworkConfig,

    // x402 protocol types (re-exported from x402/types)
    PaymentRequirements,
    x402Response,
    VerifyResponse,
    SettleResponse,
    SPLTokenAmount,
} from "./types";

export {
    // Enums and constants
    SolanaNetworkSchema,
    SolanaPaymentPayloadSchema,
    EvmNetworkSchema,
    EvmPaymentPayloadSchema,
} from "./types";

// ============================================
// Service exports
// ============================================

// SVM (Solana) services
export {
    // High-level API
    handleSvmPayment,
    createSvmPaymentFetch,

    // Low-level API
    createSvmPaymentHeader,
    getDefaultSolanaRpcUrl,
} from "./services/svm";

// EVM services
export {
    // High-level API
    handleEvmPayment,
    createEvmPaymentFetch,

    // Low-level API
    createEvmPaymentHeader,
    getChainIdFromNetwork,
} from "./services/evm";

// ============================================
// Utility exports
// ============================================
export {
    // Wallet utilities
    isWalletInstalled,
    getWalletProvider,
    formatAddress,
    getWalletInstallUrl,
    getWalletDisplayName,

    // Network utilities
    getNetworkType,
    isEvmNetwork,
    isSolanaNetwork,
    isSolanaAddress,
    isEvmAddress,
    getNetworkDisplayName,

    // General helpers
    toAtomicUnits,
    fromAtomicUnits,
    is402Response,

    // Payment helpers
    makePayment,
} from "./utils";

