/**
 * EVM specific types
 * Uses x402 official types as base
 */

import {z} from "zod";
import {ExactEvmPayloadSchema, type PaymentRequirements} from "x402/types";
import type {EvmWalletAdapter} from "./common";

// Re-export x402 EVM types
export type {PaymentRequirements};

/**
 * EVM network enum (common networks)
 */
export const EvmNetworkSchema = z.enum([
    "ethereum",
    "sepolia",
    "base",
    "base-sepolia",
    "polygon",
    "arbitrum",
    "xlayer",
    "xlayer-testnet",
]);

export type EvmNetwork = z.infer<typeof EvmNetworkSchema>;

/**
 * EVM payment payload schema (conforms to x402 spec)
 */
export const EvmPaymentPayloadSchema = z.object({
    x402Version: z.literal(1),
    scheme: z.literal("exact"),
    network: EvmNetworkSchema,
    payload: ExactEvmPayloadSchema,
});

export type EvmPaymentPayload = z.infer<typeof EvmPaymentPayloadSchema>;

/**
 * Configuration for EVM payment client
 */
export interface EvmClientConfig {
    wallet: EvmWalletAdapter;
    network: EvmNetwork;
    maxPaymentAmount?: bigint; // Maximum amount willing to pay (in atomic units)
}

/**
 * Configuration for creating EVM payment header
 */
export interface CreateEvmPaymentHeaderParams {
    wallet: EvmWalletAdapter;
    paymentRequirements: PaymentRequirements;
    x402Version: number;
    chainId: number;
}

/**
 * Network configuration for EVM chains
 */
export interface EvmNetworkConfig {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
}
