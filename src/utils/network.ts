/**
 * Network utilities
 *
 * Helper functions for network detection and validation
 */

import {NetworkType} from "../types";

/**
 * Network type mapping
 */
const NETWORK_TYPE_MAP: Record<string, NetworkType> = {
    // EVM chains
    'ethereum': NetworkType.EVM,
    'eth': NetworkType.EVM,
    'base': NetworkType.EVM,
    'base-sepolia': NetworkType.EVM,
    'polygon': NetworkType.EVM,
    'arbitrum': NetworkType.EVM,
    'optimism': NetworkType.EVM,
    'bsc': NetworkType.EVM,
    'sepolia': NetworkType.EVM,
    'goerli': NetworkType.EVM,
    'xlayer': NetworkType.EVM,
    'xlayer-testnet': NetworkType.EVM,

    // Solana/SVM
    'solana': NetworkType.SOLANA,
    'solana-devnet': NetworkType.SOLANA,
    'solana-testnet': NetworkType.SOLANA,
    'solana-mainnet': NetworkType.SOLANA,
    'svm': NetworkType.SVM,
};

/**
 * Get network type from network name
 */
export function getNetworkType(network: string): NetworkType {
    const normalizedNetwork = network.toLowerCase().trim();
    return NETWORK_TYPE_MAP[normalizedNetwork] || NetworkType.UNKNOWN;
}

/**
 * Check if network is EVM-based
 */
export function isEvmNetwork(network: string): boolean {
    return getNetworkType(network) === NetworkType.EVM;
}

/**
 * Check if network is Solana-based
 */
export function isSolanaNetwork(network: string): boolean {
    const type = getNetworkType(network);
    return type === NetworkType.SOLANA || type === NetworkType.SVM;
}

/**
 * Validate Solana address format (base58)
 */
export function isSolanaAddress(address: string): boolean {
    // Solana addresses are base58 encoded, typically 32-44 characters
    // Should not start with 0x
    if (address.startsWith('0x')) {
        return false;
    }

    // Basic base58 character set check
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    return base58Regex.test(address) && address.length >= 32 && address.length <= 44;
}

/**
 * Validate EVM address format (0x-prefixed hex)
 */
export function isEvmAddress(address: string): boolean {
    // EVM addresses are 0x-prefixed, 42 characters total
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(network: string): string {
    const displayNames: Record<string, string> = {
        'evm': 'EVM',
        'ethereum': 'Ethereum',
        'sepolia': 'Sepolia Testnet',
        'base': 'Base',
        'base-sepolia': 'Base Sepolia',
        'polygon': 'Polygon',
        'arbitrum': 'Arbitrum',
        'optimism': 'Optimism',
        'solana': 'Solana',
        'solana-devnet': 'Solana Devnet',
        'solana-mainnet': 'Solana Mainnet',
    };

    return displayNames[network.toLowerCase()] || network;
}
