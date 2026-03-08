/**
 * x402 Payment SDK - Type Definitions
 *
 * This package provides TypeScript types for the x402 payment protocol,
 * supporting both SVM (Solana) and EVM (Ethereum) chains.
 *
 * Architecture:
 * - Maximizes use of official x402/types
 * - Minimal custom types for SDK-specific needs
 * - Framework-agnostic wallet adapters
 */

// ============================================
// Re-export x402 official types
// ============================================
export type {
  // Protocol types
  PaymentRequirements,
  x402Response,
  VerifyResponse,
  SettleResponse,
  SupportedPaymentKind,
  SupportedPaymentKindsResponse,
  ErrorReasons,

  // Token types
  SPLTokenAmount,

  // Middleware & server config
  PaymentMiddlewareConfig,
  RouteConfig,
} from "x402/types";

export {
  // Schemas
  PaymentRequirementsSchema,
  x402ResponseSchema,
  VerifyResponseSchema,
  SettleResponseSchema,
  SupportedPaymentKindSchema,
  SupportedPaymentKindsResponseSchema,

  // Constants
  SupportedSVMNetworks,
  SvmNetworkToChainId,
} from "x402/types";

// ============================================
// Common types
// ============================================
export type {
  WalletAdapter,
  EvmWalletAdapter,
} from "./common";

export {
  NetworkType,
} from "./common";

// ============================================
// SVM (Solana) specific types
// ============================================
export type {
  SolanaNetwork,
  SolanaPaymentPayload,
  SvmClientConfig,
  CreateSvmPaymentHeaderParams,
} from "./svm";

export {
  SolanaNetworkSchema,
  SolanaPaymentPayloadSchema,
} from "./svm";

// ============================================
// EVM specific types
// ============================================
export type {
  EvmNetwork,
  EvmPaymentPayload,
  EvmClientConfig,
  CreateEvmPaymentHeaderParams,
  EvmNetworkConfig,
} from "./evm";

export {
  EvmNetworkSchema,
  EvmPaymentPayloadSchema,
} from "./evm";
