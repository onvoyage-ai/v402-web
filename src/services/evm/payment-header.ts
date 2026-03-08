/**
 * EVM Payment Header Builder
 *
 * Low-level API: Creates X-PAYMENT header for EVM transactions
 * Use this when you want to build the payment header yourself and handle fetch separately
 */

import { ethers } from "ethers";
import type { CreateEvmPaymentHeaderParams } from "../../types";
import { wrapPaymentError } from "../../utils";

/**
 * Network chain ID to display name mapping
 */
export const NETWORK_NAMES: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    8453: 'Base Mainnet',
    84532: 'Base Sepolia Testnet',
    137: 'Polygon Mainnet',
    42161: 'Arbitrum One',
    10: 'Optimism Mainnet',
    196: 'XLayer Mainnet',
    1952: 'XLayer Testnet',
};

/**
 * Create X-PAYMENT header for EVM payment (EIP-3009 format)
 *
 * @param params - Payment header parameters
 * @returns Base64-encoded X-PAYMENT header string
 *
 * @example
 * ```typescript
 * const paymentHeader = await createEvmPaymentHeader({
 *   wallet: metamaskWallet,
 *   paymentRequirements: requirements,
 *   x402Version: 1,
 *   chainId: 84532
 * });
 *
 * // Use the header in your own fetch
 * const response = await fetch(endpoint, {
 *   headers: {
 *     "X-PAYMENT": paymentHeader
 *   }
 * });
 * ```
 */
export async function createEvmPaymentHeader(
    params: CreateEvmPaymentHeaderParams
): Promise<string> {
    const { wallet, paymentRequirements, x402Version, chainId } = params;

    if (!paymentRequirements?.payTo) {
        throw new Error("Missing payTo in payment requirements");
    }

    if (!paymentRequirements?.asset) {
        throw new Error("Missing asset (token contract) in payment requirements");
    }

    // Verify current chain matches target chain (if wallet provides getChainId)
    if (wallet.getChainId) {
        try {
            const currentChainIdHex = await wallet.getChainId();
            const currentChainId = parseInt(currentChainIdHex, 16);

            if (currentChainId !== chainId) {
                const currentNetworkName = NETWORK_NAMES[currentChainId] || `Chain ${currentChainId}`;
                const targetNetworkName = NETWORK_NAMES[chainId] || `Chain ${chainId}`;

                throw new Error(
                    `Network mismatch: Your wallet is connected to ${currentNetworkName}, ` +
                    `but payment requires ${targetNetworkName}. Please switch your wallet to the correct network.`
                );
            }

            console.log(`✅ Chain ID verified: ${chainId}`);
        } catch (error: any) {
            // If it's our own error, re-throw with better handling
            if (error.message.includes('Network mismatch')) {
                throw wrapPaymentError(error);
            }
            // Otherwise just log and continue
            console.warn("Could not verify chainId:", error);
        }
    }

    // Get current timestamp (seconds)
    const now = Math.floor(Date.now() / 1000);

    // Generate nonce (random 32 bytes, EIP-3009 standard)
    const nonceBytes = ethers.randomBytes(32);
    const nonceBytes32 = ethers.hexlify(nonceBytes);

    // Build EIP-712 domain (using token contract address as verifyingContract)
    const domain = {
        name: (paymentRequirements as any).extra?.name || "USDC",
        version: (paymentRequirements as any).extra?.version || "2",
        chainId: chainId,
        verifyingContract: paymentRequirements.asset as `0x${string}`,
    };

    // Build EIP-712 types (EIP-3009 TransferWithAuthorization format)
    const types = {
        TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
        ],
    };

    // Build authorization object (for signing)
    const authorization = {
        from: wallet.address as `0x${string}`,
        to: paymentRequirements.payTo as `0x${string}`,
        value: paymentRequirements.maxAmountRequired,
        validAfter: "0", // Effective immediately
        validBefore: String(now + (paymentRequirements.maxTimeoutSeconds || 3600)),
        nonce: nonceBytes32,
    };

    // Sign typed data with error handling
    let signature: string;
    try {
        signature = await wallet.signTypedData(domain, types, authorization);
        console.log('✅ Signature created successfully');
    } catch (error: any) {
        console.error('❌ Failed to create signature:', error);
        throw wrapPaymentError(error);
    }

    // Build X-PAYMENT header
    const headerPayload = {
        x402_version: x402Version,
        x402Version: x402Version,
        scheme: paymentRequirements.scheme,
        network: paymentRequirements.network,
        payload: {
            signature,
            authorization: {
                from: authorization.from,
                to: authorization.to,
                value: String(authorization.value),
                valid_after: authorization.validAfter,
                validAfter: authorization.validAfter,
                valid_before: authorization.validBefore,
                validBefore: authorization.validBefore,
                nonce: authorization.nonce,
            },
        },
    };

    // Encode as base64
    const paymentHeader = btoa(JSON.stringify(headerPayload));

    return paymentHeader;
}

/**
 * Get chain ID from network name
 */
export function getChainIdFromNetwork(network: string): number {
    const chainIdMap: Record<string, number> = {
        'ethereum': 1,
        'sepolia': 11155111,
        'base': 8453,
        'base-sepolia': 84532,
        'polygon': 137,
        'arbitrum': 42161,
        'optimism': 10,
        'xlayer': 196,
        "xlayer-testnet": 1952,
    };

    const chainId = chainIdMap[network.toLowerCase()];
    if (!chainId) {
        throw new Error(`Unknown network: ${network}`);
    }

    return chainId;
}

