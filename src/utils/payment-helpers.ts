/**
 * Payment helper utilities for demo/UI
 * Simplified payment handling with callbacks
 */

import {NetworkType} from "../types";
import type {PaymentRequirements} from "x402/types";
import {handleEvmPayment, handleSvmPayment} from "../services";
import {ethers} from "ethers";
import {PROD_BACK_URL} from "../types/common";
import {getWalletProviderForPayment} from "./wallet-discovery";

export interface PaymentCallbacks {
    onStart?: () => void;
    onSuccess?: (result: any) => void;
    onError?: (error: string) => void;
    onFinish?: () => void;
}

/**
 * Parse payment requirements from 402 response
 */
export function parsePaymentRequired(response: any): PaymentRequirements[] | null {
    if (response && typeof response === 'object') {
        // Direct x402Response format
        if ('x402Version' in response && 'accepts' in response) {
            return response.accepts;
        }
    }
    return null;
}

/**
 * Get supported network types from payment requirements
 */
export function getSupportedNetworkTypes(paymentRequirements: PaymentRequirements[]): NetworkType[] {
    if (!paymentRequirements || paymentRequirements.length === 0) {
        return [];
    }

    const networkTypes = new Set<NetworkType>();

    paymentRequirements.forEach(req => {
        const network = req.network.toLowerCase();

        if (network.includes('solana') || network.includes('svm')) {
            networkTypes.add(NetworkType.SOLANA);
        } else if (
            network.includes('ethereum') ||
            network.includes('base') ||
            network.includes('polygon') ||
            network.includes('arbitrum') ||
            network.includes('optimism') ||
            network.includes('sepolia')
        ) {
            networkTypes.add(NetworkType.EVM);
        }
    });

    return Array.from(networkTypes);
}

/**
 * Make payment with automatic chain handling
 *
 * This function handles all the chain-specific logic internally.
 * Business logic should be handled via callbacks.
 *
 * @param endpoint - API endpoint
 * @param networkType - Network type (from useWallet)
 * @param merchantId - @see our website to apply
 * @param additionalParams - Optional additional parameters to send with the request (default: {})
 * @param expectedAddress - Optional expected wallet address for validation
 * @returns Response from the payment
 *
 * @example
 * ```tsx
 * const response = await makePayment('/api/endpoint', networkType);
 * const data = await response.json();
 * ```
 *
 * @example
 * ```tsx
 * // With additional parameters and address validation
 * const response = await makePayment(
 *   '/api/endpoint',
 *   networkType,
 *   merchantId,
 *   { userId: '123', customField: 'value' },
 *   walletAddress  // Pass the expected address for validation
 * );
 * ```
 */
export async function makePayment(
    networkType: NetworkType,
    merchantId: string,
    endpoint: string = PROD_BACK_URL,
    additionalParams?: Record<string, any>,
    expectedAddress?: string,
): Promise<Response> {
    // 使用新变量而不是修改参数
    const fullEndpoint = `${endpoint}/${merchantId}`;
    let response: Response;

    // 准备请求配置，如果有额外参数则添加到 body 中
    const requestInit: RequestInit = additionalParams && Object.keys(additionalParams).length > 0
        ? {
            body: JSON.stringify(additionalParams),
            headers: {
                'Content-Type': 'application/json',
            },
        }
        : {};

    if (networkType === NetworkType.SOLANA || networkType === NetworkType.SVM) {
        // Solana payment - use the selected wallet provider
        const solana = getWalletProviderForPayment(networkType);
        
        if (!solana) {
            throw new Error('Please connect your Solana wallet first.');
        }

        if (!solana.isConnected) {
            await solana.connect();
        }

        // Validate address if provided
        const currentAddress = solana.publicKey?.toString();
        
        if (expectedAddress && currentAddress) {
            if (currentAddress !== expectedAddress) {
                throw new Error(
                    `Wallet account mismatch: the current wallet account is ${currentAddress.slice(0, 8)}...，` +
                    `But the desired account is ${expectedAddress.slice(0, 8)}.... Please switch to the correct account in your wallet.`
                );
            }
        }

        response = await handleSvmPayment(fullEndpoint, {
            wallet: solana,
            network: 'solana', // Will use backend's network configuration
        }, requestInit);
    } else if (networkType === NetworkType.EVM) {
        // EVM payment - use the selected wallet provider
        const ethereum = getWalletProviderForPayment(networkType);
        if (!ethereum) {
            throw new Error('Please connect the EVM wallet first');
        }

        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        const currentAddress = await signer.getAddress();

        // Validate address if provided
        if (expectedAddress && currentAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
            throw new Error(
                `Wallet account mismatch: the current wallet account is ${currentAddress.slice(0, 8)}...，` +
                `But the desired account is ${expectedAddress.slice(0, 8)}.... Please switch to the correct account in your wallet.`
            );
        }

        const wallet = {
            address: currentAddress,
            signTypedData: async (domain: any, types: any, message: any) => {
                return await signer.signTypedData(domain, types, message);
            },
            // Get current chain ID from wallet
            getChainId: async () => {
                const network = await provider.getNetwork();
                return `0x${network.chainId.toString(16)}`;
            },
            // Switch to a different chain
            switchChain: async (chainId: string) => {
                await ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId }],
                });
            },
        };

        // Use a placeholder network - handler will use backend's network configuration
        response = await handleEvmPayment(fullEndpoint, {
            wallet,
            network: 'base', // Will use backend's network configuration
        }, requestInit);
    } else {
        throw new Error(`Unsupported network types: ${networkType}`);
    }

    return response;
}

