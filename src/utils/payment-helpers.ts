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
 * // With additional parameters
 * const response = await makePayment(
 *   '/api/endpoint',
 *   networkType,
 *   merchantId,
 *   { userId: '123', customField: 'value' }
 * );
 * ```
 */
export async function makePayment(
    networkType: NetworkType,
    merchantId: string,
    endpoint: string = PROD_BACK_URL,
    additionalParams?: Record<string, any>,
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
            throw new Error('请先连接 Solana 钱包');
        }

        if (!solana.isConnected) {
            await solana.connect();
        }

        response = await handleSvmPayment(fullEndpoint, {
            wallet: solana,
            network: 'solana', // Will use backend's network configuration
        }, requestInit);
    } else if (networkType === NetworkType.EVM) {
        // EVM payment - use the selected wallet provider
        const ethereum = getWalletProviderForPayment(networkType);
        if (!ethereum) {
            throw new Error('请先连接 EVM 钱包');
        }

        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();

        const wallet = {
            address: await signer.getAddress(),
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
        throw new Error(`不支持的网络类型: ${networkType}`);
    }

    return response;
}

