/**
 * Payment Error Handler
 *
 * Centralized error handling for wallet and payment operations
 * Provides user-friendly error messages for common issues
 */

/**
 * Error messages that should be ignored during 402 flow
 * These are part of normal payment flow (initial request without X-PAYMENT)
 */
export const IGNORED_402_ERRORS = [
  'X-PAYMENT header is required',
  'missing X-PAYMENT header',
  'payment_required',
] as const;

/**
 * Map backend error codes to user-friendly messages
 */
export const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  'insufficient_funds': 'Insufficient balance to complete this payment',
  'invalid_signature': 'Invalid payment signature',
  'expired': 'Payment authorization has expired',
  'already_used': 'This payment has already been used',
  'network_mismatch': 'Payment network does not match',
  'invalid_payment': 'Invalid payment data',
  'verification_failed': 'Payment verification failed',
  'invalid_network': 'The selected network is not supported by the payment server. Please try a different network.',
  'invalid_exact_svm_payload_transaction_simulation_failed': 'Transaction simulation failed due to insufficient balance. Please check your wallet balance carefully and ensure you have enough funds to cover the payment and transaction fees.',
};

export interface PaymentError {
  code: string;
  message: string;
  userMessage: string;
  originalError?: any;
}

/**
 * Error codes for payment operations
 */
export enum PaymentErrorCode {
  // User action errors
  USER_REJECTED = 'USER_REJECTED',
  USER_CANCELLED = 'USER_CANCELLED',

  // Network errors
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  NETWORK_SWITCH_FAILED = 'NETWORK_SWITCH_FAILED',
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',

  // Chain ID errors
  CHAIN_ID_MISMATCH = 'CHAIN_ID_MISMATCH',
  CHAIN_ID_UNAVAILABLE = 'CHAIN_ID_UNAVAILABLE',

  // Wallet errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_LOCKED = 'WALLET_LOCKED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',

  // Payment requirement errors
  INVALID_PAYMENT_REQUIREMENTS = 'INVALID_PAYMENT_REQUIREMENTS',
  AMOUNT_EXCEEDED = 'AMOUNT_EXCEEDED',

  // Generic errors
  SIGNATURE_FAILED = 'SIGNATURE_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Parse and classify error from wallet operations
 */
export function parsePaymentError(error: any): PaymentError {
  // Handle null/undefined
  if (!error) {
    return {
      code: PaymentErrorCode.UNKNOWN_ERROR,
      message: 'Unknown error occurred',
      userMessage: 'An unknown error occurred. Please try again.',
      originalError: error,
    };
  }

  const errorMessage = error.message || error.toString();
  const errorCode = error.code;

  // 1. User rejected/cancelled actions
  if (
    errorCode === 4001 ||
    errorCode === 'ACTION_REJECTED' ||
    errorMessage.includes('User rejected') ||
    errorMessage.includes('user rejected') ||
    errorMessage.includes('User denied') ||
    errorMessage.includes('user denied') ||
    errorMessage.includes('ethers-user-denied')
  ) {
    return {
      code: PaymentErrorCode.USER_REJECTED,
      message: 'User rejected the transaction',
      userMessage: 'You rejected the signature request. Please try again if you want to proceed.',
      originalError: error,
    };
  }

  // 2. Chain ID mismatch
  if (
    errorMessage.includes('chainId') &&
    (errorMessage.includes('must match') || errorMessage.includes('does not match'))
  ) {
    // Extract chain IDs from error message if possible
    const match = errorMessage.match(/chainId.*?"(\d+)".*?active.*?"(\d+)"/i) ||
      errorMessage.match(/chain (\d+).*?chain (\d+)/i);

    if (match) {
      const [, requestedChain, activeChain] = match;
      return {
        code: PaymentErrorCode.CHAIN_ID_MISMATCH,
        message: `Network mismatch (wallet is on different chain): Requested ${requestedChain}, but wallet is on ${activeChain}`,
        userMessage: `Your wallet is on the wrong network. Please switch to the correct network and try again.`,
        originalError: error,
      };
    }

    return {
      code: PaymentErrorCode.CHAIN_ID_MISMATCH,
      message: 'Network mismatch (wallet selected network does not match)',
      userMessage: 'Your wallet is on the wrong network. Please switch to the correct network.',
      originalError: error,
    };
  }

  // 3. Network mismatch (general)
  if (
    errorMessage.includes('Network mismatch') ||
    errorMessage.includes('Wrong network') ||
    errorMessage.includes('Incorrect network')
  ) {
    return {
      code: PaymentErrorCode.NETWORK_MISMATCH,
      message: errorMessage,
      userMessage: 'Please switch your wallet to the correct network.',
      originalError: error,
    };
  }

  // 4. Wallet locked
  if (
    errorMessage.includes('locked') ||
    errorMessage.includes('Wallet is locked')
  ) {
    return {
      code: PaymentErrorCode.WALLET_LOCKED,
      message: 'Wallet is locked',
      userMessage: 'Please unlock your wallet and try again.',
      originalError: error,
    };
  }

  // 5. Insufficient balance/funds
  if (
    errorMessage.includes('insufficient') &&
    (errorMessage.includes('balance') || errorMessage.includes('funds'))
  ) {
    return {
      code: PaymentErrorCode.INSUFFICIENT_BALANCE,
      message: 'Insufficient balance',
      userMessage: 'You don\'t have enough balance to complete this payment.',
      originalError: error,
    };
  }

  // 6. Network switch failed
  if (
    errorMessage.includes('Failed to switch') ||
    errorMessage.includes('switch chain')
  ) {
    return {
      code: PaymentErrorCode.NETWORK_SWITCH_FAILED,
      message: errorMessage,
      userMessage: 'Failed to switch network. Please switch manually in your wallet.',
      originalError: error,
    };
  }

  // 7. Wallet not connected
  if (
    errorMessage.includes('not connected') ||
    errorMessage.includes('No wallet') ||
    errorMessage.includes('Connect wallet')
  ) {
    return {
      code: PaymentErrorCode.WALLET_NOT_CONNECTED,
      message: 'Wallet not connected',
      userMessage: 'Please connect your wallet first.',
      originalError: error,
    };
  }

  // 8. Invalid payment requirements
  if (
    errorMessage.includes('No suitable') ||
    errorMessage.includes('payment requirements') ||
    errorMessage.includes('Missing payTo') ||
    errorMessage.includes('Missing asset')
  ) {
    return {
      code: PaymentErrorCode.INVALID_PAYMENT_REQUIREMENTS,
      message: errorMessage,
      userMessage: 'Invalid payment configuration. Please contact support.',
      originalError: error,
    };
  }

  // 9. Amount exceeded
  if (errorMessage.includes('exceeds maximum')) {
    return {
      code: PaymentErrorCode.AMOUNT_EXCEEDED,
      message: errorMessage,
      userMessage: 'Payment amount exceeds the maximum allowed.',
      originalError: error,
    };
  }

  // 10. Generic signature failure
  if (
    errorMessage.includes('signature') ||
    errorMessage.includes('sign') ||
    errorCode === 'UNKNOWN_ERROR'
  ) {
    return {
      code: PaymentErrorCode.SIGNATURE_FAILED,
      message: errorMessage,
      userMessage: 'Failed to sign the transaction. Please try again.',
      originalError: error,
    };
  }

  // Default: Unknown error
  return {
    code: PaymentErrorCode.UNKNOWN_ERROR,
    message: errorMessage,
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    originalError: error,
  };
}

/**
 * Create a user-friendly error with detailed information
 */
export class PaymentOperationError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly originalError?: any;

  constructor(paymentError: PaymentError) {
    super(paymentError.message);
    this.name = 'PaymentOperationError';
    this.code = paymentError.code;
    this.userMessage = paymentError.userMessage;
    this.originalError = paymentError.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentOperationError);
    }
  }

  /**
   * Get a formatted error message for logging
   */
  toLogString(): string {
    return `[${this.code}] ${this.message} | User Message: ${this.userMessage}`;
  }
}

/**
 * Wrap an error with payment error handling
 */
export function wrapPaymentError(error: any): PaymentOperationError {
  const parsedError = parsePaymentError(error);
  return new PaymentOperationError(parsedError);
}

