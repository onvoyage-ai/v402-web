/**
 * Common types for x402 SDK
 * Framework-agnostic types that work across different wallet implementations
 */

import {VersionedTransaction} from "@solana/web3.js";

/**
 * Generic wallet adapter interface - works with any wallet provider
 * Compatible with Anza wallet-adapter, Privy, and custom implementations
 */
export interface WalletAdapter {
    // Anza wallet-adapter standard
    publicKey?: { toString(): string };

    // Alternative property (e.g., Privy or custom wallets)
    address?: string;

    // Transaction signing - required for payment authorization
    signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>;
}

/**
 * EVM wallet adapter interface
 */
export interface EvmWalletAdapter {
    address: string;
    signTypedData: (
        domain: any,
        types: any,
        message: any
    ) => Promise<string>;
    switchChain?: (chainId: string) => Promise<void>;
    getChainId?: () => Promise<string>; // Returns hex format like "0x14a34"
}

/**
 * Network type enum - for wallet detection
 */
export enum NetworkType {
    EVM = 'evm',
    SOLANA = 'solana',
    SVM = 'svm', // Alias for Solana
    UNKNOWN = 'unknown'
}

// 在构建时会被 tsup 的 define 替换
declare const __PROD_BACK_URL__: string;
export const PROD_BACK_URL = typeof __PROD_BACK_URL__ !== 'undefined' 
    ? __PROD_BACK_URL__ 
    : "https://v402pay.onvoyage.ai/api/pay";

