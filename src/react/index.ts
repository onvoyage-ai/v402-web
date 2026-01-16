/**
 * x402 Payment SDK - React Package
 *
 * Pre-built React hooks and components for easy integration
 *
 * ## Quick Start
 *
 * ```tsx
 * import { WalletConnect, PaymentButton, useWallet, usePayment } from '@x402/sdk/react';
 *
 * // No Provider needed! Just use the hooks directly
 * function App() {
 *   const { address } = useWallet();
 *
 *   return (
 *     <div>
 *       <WalletConnect />
 *       {address && <PaymentButton endpoint="/api/protected" />}
 *     </div>
 *   );
 * }
 * ```
 */

// Import styles - will be auto-loaded by modern bundlers (Next.js, Vite, etc.)
import './styles.css';

// ============================================
// Hooks
// ============================================

export {useWallet} from './hooks/useWalletStore';
export type {UseWalletReturn} from './hooks/useWalletStore';

export {usePageNetwork} from './hooks/usePageNetwork';
export type {UsePageNetworkOptions} from './hooks/usePageNetwork';

export {usePayment} from './hooks/usePayment';
export type {UsePaymentReturn} from './hooks/usePayment';

export {usePaymentInfo} from './hooks/usePaymentInfo';
export type {UsePaymentInfoReturn} from './hooks/usePaymentInfo';

export {useToast} from './hooks/useToast';

// ============================================
// Components - Wallet
// ============================================

export {WalletConnect} from './components/wallet/WalletConnect';
export type {WalletConnectProps} from './components/wallet/WalletConnect';

export {WalletSelectModal} from './components/wallet/WalletSelectModal';
export type {WalletSelectModalProps} from './components/wallet/WalletSelectModal';

// ============================================
// Components - Checkout
// ============================================

export {default as V402CheckoutV2} from './components/checkout/V402CheckoutV2';
export type {V402CheckoutV2Props} from './components/checkout/types';

// ============================================
// Components - UI (Internal, but exported for advanced use)
// ============================================

export {Toast} from './components/ui/Toast';
export type {ToastProps, ToastType} from './components/ui/Toast';

// ============================================
// Styles & Utilities
// ============================================

export {checkoutAnimations, AnimationStyles} from './styles/animations';
