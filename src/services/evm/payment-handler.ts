/**
 * EVM Payment Handler
 *
 * High-level API: Automatically handles the full payment flow
 * Use this for the simplest integration - just provide wallet and endpoint
 */

import type {EvmClientConfig} from "../../types";
import {EvmNetworkSchema} from "../../types";
import type {PaymentRequirements, x402Response} from "x402/types";
import {createEvmPaymentHeader, getChainIdFromNetwork} from "./payment-header";
import {
    IGNORED_402_ERRORS,
    PAYMENT_ERROR_MESSAGES,
    PaymentErrorCode,
    PaymentOperationError,
    wrapPaymentError,
} from "../../utils";

/**
 * Network ID to name mapping
 */
const NETWORK_NAMES: Record<number, string> = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    8453: 'Base Mainnet',
    84532: 'Base Sepolia Testnet',
    137: 'Polygon Mainnet',
    42161: 'Arbitrum One',
    10: 'Optimism Mainnet',
};

/**
 * Handle EVM payment with automatic x402 flow
 *
 * @param endpoint - API endpoint that requires x402 payment
 * @param config - EVM client configuration
 * @param requestInit - Optional fetch RequestInit options
 * @returns Response from the endpoint after successful payment
 *
 * @example
 * ```typescript
 * // Simple usage with MetaMask
 * const provider = new ethers.BrowserProvider(window.ethereum);
 * const signer = await provider.getSigner();
 *
 * const response = await handleEvmPayment(
 *   "https://api.example.com/protected",
 *   {
 *     wallet: {
 *       address: await signer.getAddress(),
 *       signTypedData: (domain, types, message) =>
 *         signer.signTypedData(domain, types, message)
 *     },
 *     network: "base-sepolia"
 *   }
 * );
 * ```
 */
export async function handleEvmPayment(
    endpoint: string,
    config: EvmClientConfig,
    requestInit?: RequestInit
): Promise<Response> {
    const { wallet, network, maxPaymentAmount } = config;

    // 1. Make initial request
    const initialResponse = await fetch(endpoint, {
        ...requestInit,
        method: requestInit?.method || "POST",
    });

    // If not 402, return as-is
    if (initialResponse.status !== 402) {
        return initialResponse;
    }

    // 2. Parse payment requirements from 402 response
    const rawResponse = await initialResponse.json() as x402Response;

    // 3. Check if backend returned an error (e.g., insufficient_funds after signature)
    // Skip errors that are part of normal 402 flow (initial request without X-PAYMENT)
    if (rawResponse.error && !IGNORED_402_ERRORS.includes(rawResponse.error as typeof IGNORED_402_ERRORS[number])) {
        console.error(`❌ Payment verification failed: ${rawResponse.error}`);
        const errorMessage = PAYMENT_ERROR_MESSAGES[rawResponse.error] ||
            `Payment failed: ${rawResponse.error}`;
        throw wrapPaymentError(new Error(errorMessage));
    }

    const x402Version: number = rawResponse.x402Version;
    const parsedPaymentRequirements: PaymentRequirements[] = rawResponse.accepts || [];

    // 4. Select suitable payment requirement for EVM
    const selectedRequirements = parsedPaymentRequirements.find(
        (req: PaymentRequirements) =>
            req.scheme === "exact" &&
            EvmNetworkSchema.safeParse(req.network.toLowerCase()).success
    );

    if (!selectedRequirements) {
        console.error(
            "❌ No suitable EVM payment requirements found. Available networks:",
            parsedPaymentRequirements.map((req) => req.network)
        );
        throw new Error("No suitable EVM payment requirements found");
    }

    // 5. Check amount against max value if specified
    if (maxPaymentAmount && maxPaymentAmount > BigInt(0)) {
        if (BigInt(selectedRequirements.maxAmountRequired) > maxPaymentAmount) {
            throw new Error(
                `Payment amount ${selectedRequirements.maxAmountRequired} exceeds maximum allowed ${maxPaymentAmount}`
            );
        }
    }

    // 6. Get target chain ID
    const targetChainId = getChainIdFromNetwork(selectedRequirements.network);

    // 7. Get current wallet chainId (if wallet provides it)
    let currentChainId: number | undefined;
    if (wallet.getChainId) {
        try {
            const chainIdHex = await wallet.getChainId();
            currentChainId = parseInt(chainIdHex, 16);
            console.log(`📍 Current wallet chain: ${currentChainId}`);
        } catch (error) {
            console.warn("⚠️ Failed to get current chainId:", error);
        }
    }

    // 8. Switch chain if needed
    // If we know current chainId and it doesn't match, we MUST switch
    if (currentChainId && currentChainId !== targetChainId) {
        if (!wallet.switchChain) {
            const currentNetworkName = NETWORK_NAMES[currentChainId] || `Chain ${currentChainId}`;
            const targetNetworkName = NETWORK_NAMES[targetChainId] || selectedRequirements.network;

            const error = new Error(
                `Network mismatch: Your wallet is connected to ${currentNetworkName}, ` +
                `but payment requires ${targetNetworkName}. Please switch to ${targetNetworkName} manually in your wallet.`
            );
            throw wrapPaymentError(error);
        }

        try {
            console.log(`🔄 Switching to chain ${targetChainId}...`);
            await wallet.switchChain(`0x${targetChainId.toString(16)}`);
            console.log(`✅ Successfully switched to chain ${targetChainId}`);
        } catch (error: any) {
            console.error('❌ Failed to switch chain:', error);

            const targetNetworkName = NETWORK_NAMES[targetChainId] || selectedRequirements.network;
            const wrappedError = wrapPaymentError(error);

            // Create new error with better message for network switch failure
            let finalError: PaymentOperationError;
            if (wrappedError.code === PaymentErrorCode.USER_REJECTED) {
                finalError = new PaymentOperationError({
                    code: wrappedError.code,
                    message: wrappedError.message,
                    userMessage: `You rejected the network switch request. Please switch to ${targetNetworkName} manually.`,
                    originalError: wrappedError.originalError,
                });
            } else {
                finalError = new PaymentOperationError({
                    code: PaymentErrorCode.NETWORK_SWITCH_FAILED,
                    message: wrappedError.message,
                    userMessage: `Failed to switch to ${targetNetworkName}. Please switch manually in your wallet.`,
                    originalError: wrappedError.originalError,
                });
            }

            throw finalError;
        }
    } else if (wallet.switchChain && !currentChainId) {
        // Try to switch even if we don't know current chain (best effort)
        try {
            console.log(`🔄 Attempting to switch to chain ${targetChainId}...`);
            await wallet.switchChain(`0x${targetChainId.toString(16)}`);
            console.log(`✅ Switch attempted successfully`);
        } catch (error) {
            console.warn("⚠️ Failed to switch chain (best effort):", error);
            // Continue anyway - wallet might already be on correct chain
        }
    }

    // 9. Create payment header with error handling
    let paymentHeader: string;
    try {
        paymentHeader = await createEvmPaymentHeader({
            wallet,
            paymentRequirements: selectedRequirements,
            x402Version,
            chainId: targetChainId,
        });
    } catch (error: any) {
        console.error('❌ Failed to create payment header:', error);
        throw wrapPaymentError(error);
    }

    // 10. Retry with payment header
    const newInit = {
        ...requestInit,
        method: requestInit?.method || "POST",
        headers: {
            ...(requestInit?.headers || {}),
            "X-PAYMENT": paymentHeader,
            "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
        },
    };

    const retryResponse = await fetch(endpoint, newInit);

    // 11. Check if retry still returned 402 with error (e.g., verification failed)
    if (retryResponse.status === 402) {
        try {
            const retryData = await retryResponse.json();

            if (retryData.error && !IGNORED_402_ERRORS.includes(retryData.error as typeof IGNORED_402_ERRORS[number])) {
                console.error(`❌ Payment verification failed: ${retryData.error}`);
                const errorMessage = PAYMENT_ERROR_MESSAGES[retryData.error] ||
                    `Payment failed: ${retryData.error}`;
                throw wrapPaymentError(new Error(errorMessage));
            }
        } catch (error: any) {
            // If error is already wrapped, re-throw it
            if (error instanceof PaymentOperationError) {
                throw error;
            }
            // Otherwise it's a JSON parse error, just return the response
            console.warn('⚠️ Could not parse retry 402 response:', error);
        }
    }

    return retryResponse;
}

/**
 * Create a custom fetch function that automatically handles x402 payments for EVM
 *
 * @example
 * ```typescript
 * const paymentFetch = createEvmPaymentFetch({
 *   wallet: myWallet,
 *   network: "base-sepolia",
 *   maxPaymentAmount: BigInt(1_000_000) // 1 USDC max
 * });
 *
 * // Use like regular fetch
 * const response = await paymentFetch("https://api.example.com/protected");
 * ```
 */
export function createEvmPaymentFetch(
    config: EvmClientConfig
): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const endpoint = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        return handleEvmPayment(endpoint, config, init);
    };
}
