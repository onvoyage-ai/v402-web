/**
 * SVM (Solana) Payment Header Builder
 *
 * Low-level API: Creates X-PAYMENT header for Solana transactions
 * Use this when you want to build the payment header yourself and handle fetch separately
 *
 * Uses @solana/web3.js and @solana/spl-token packages
 */

import {ComputeBudgetProgram, Connection, PublicKey, TransactionMessage, VersionedTransaction,} from "@solana/web3.js";
import {
    createTransferCheckedInstruction,
    getAssociatedTokenAddressSync,
    getMint,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type {CreateSvmPaymentHeaderParams} from "../../types";
import {wrapPaymentError} from "../../utils";

/**
 * Create X-PAYMENT header for Solana payment
 *
 * @param params - Payment header parameters
 * @returns Base64-encoded X-PAYMENT header string
 *
 * @example
 * ```typescript
 * const paymentHeader = await createSvmPaymentHeader({
 *   wallet: phantomWallet,
 *   paymentRequirements: requirements,
 *   x402Version: 1,
 *   rpcUrl: "https://api.devnet.solana.com"
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
export async function createSvmPaymentHeader(
    params: CreateSvmPaymentHeaderParams
): Promise<string> {
    const { wallet, paymentRequirements, x402Version, rpcUrl } = params;

    // Create RPC connection
    const connection = new Connection(rpcUrl);

    // Extract fee payer from payment requirements
    const feePayer = (paymentRequirements as { extra?: { feePayer?: string } })?.extra?.feePayer;
    if (typeof feePayer !== "string" || !feePayer) {
        throw new Error("Missing facilitator feePayer in payment requirements (extra.feePayer).");
    }
    const feePayerPubkey = new PublicKey(feePayer);

    // Support both Anza wallet-adapter (publicKey) and custom implementations (address)
    const walletAddress = wallet?.publicKey?.toString() || wallet?.address;
    if (!walletAddress) {
        throw new Error("Missing connected Solana wallet address or publicKey");
    }
    const userPubkey = new PublicKey(walletAddress);

    if (!paymentRequirements?.payTo) {
        throw new Error("Missing payTo in payment requirements");
    }
    const destinationPubkey = new PublicKey(paymentRequirements.payTo);

    // SPL token or Token-2022
    if (!paymentRequirements.asset) {
        throw new Error("Missing token mint for SPL transfer");
    }
    const mintPubkey = new PublicKey(paymentRequirements.asset as string);

    // Determine program (token vs token-2022) by reading mint owner
    const mintAccountInfo = await connection.getAccountInfo(mintPubkey);
    if (!mintAccountInfo) {
        throw new Error(`Mint account ${mintPubkey.toBase58()} not found`);
    }

    const tokenProgramId = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

    // Fetch mint to get decimals
    const mint = await getMint(connection, mintPubkey, undefined, tokenProgramId);

    // Derive source and destination ATAs
    const sourceAta = getAssociatedTokenAddressSync(
        mintPubkey,
        userPubkey,
        false,
        tokenProgramId
    );

    const destinationAta = getAssociatedTokenAddressSync(
        mintPubkey,
        destinationPubkey,
        false,
        tokenProgramId
    );

    // Check if source ATA exists (user must already have token account)
    const sourceAtaInfo = await connection.getAccountInfo(sourceAta);
    if (!sourceAtaInfo) {
        throw new Error(
            `User does not have an Associated Token Account for ${paymentRequirements.asset}. Please create one first or ensure you have the required token.`
        );
    }

    // Check if destination ATA exists (receiver must already have token account)
    const destAtaInfo = await connection.getAccountInfo(destinationAta);
    if (!destAtaInfo) {
        throw new Error(
            `Destination does not have an Associated Token Account for ${paymentRequirements.asset}. The receiver must create their token account before receiving payments.`
        );
    }

    // Build instructions array
    // The facilitator REQUIRES ComputeBudget instructions in positions 0 and 1
    const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({
            units: 7_000, // Sufficient for SPL token transfer
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1, // Minimal price
        }),
        createTransferCheckedInstruction(
            sourceAta,
            mintPubkey,
            destinationAta,
            userPubkey,
            BigInt(paymentRequirements.maxAmountRequired),
            mint.decimals,
            [],
            tokenProgramId
        ),
    ];

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Build transaction message
    const messageV0 = new TransactionMessage({
        payerKey: feePayerPubkey,
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message();

    // Create versioned transaction
    const transaction = new VersionedTransaction(messageV0);

    // Sign with user's wallet
    if (typeof wallet?.signTransaction !== "function") {
        throw new Error("Connected wallet does not support signTransaction");
    }

    let signedTransaction: VersionedTransaction;
    try {
        // The wallet.signTransaction expects @solana/web3.js transaction format
        signedTransaction = await wallet.signTransaction(transaction);
        console.log('✅ Transaction signed successfully');
    } catch (error: any) {
        console.error('❌ Failed to sign transaction:', error);
        throw wrapPaymentError(error);
    }

    // Serialize the signed transaction to base64
    const serializedBytes = signedTransaction.serialize();
    // Convert Uint8Array to base64 string (browser-compatible)
    let binary = '';
    for (let i = 0; i < serializedBytes.length; i++) {
        binary += String.fromCharCode(serializedBytes[i]);
    }
    const serializedTransaction = btoa(binary);

    // Create payment payload matching x402 spec
    const paymentPayload = {
        x402Version: x402Version,
        scheme: paymentRequirements.scheme,
        network: paymentRequirements.network,
        payload: {
            transaction: serializedTransaction,
        },
    };

    // Encode payment payload as base64 for X-PAYMENT header
    const paymentHeader = btoa(JSON.stringify(paymentPayload));

    return paymentHeader;
}

/**
 * Helper: Get default RPC URL for Solana network
 */
export function getDefaultSolanaRpcUrl(network: string): string {
    const normalized = network.toLowerCase();

    if (normalized === "solana" || normalized === "solana-mainnet") {
        return "https://cathee-fu8ezd-fast-mainnet.helius-rpc.com";
    } else if (normalized === "solana-devnet") {
        return "https://api.devnet.solana.com";
    }

    throw new Error(`Unsupported Solana network: ${network}`);
}
