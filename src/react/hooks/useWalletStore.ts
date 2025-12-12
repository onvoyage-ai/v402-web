/**
 * useWallet Hook (External Store)
 *
 * Uses useSyncExternalStore for optimal performance
 * No Provider needed!
 */

import {useSyncExternalStore} from 'react';
import {walletStore} from '../store/walletStore';
import {NetworkType} from '../../types';
import {WalletInfo} from '../../utils';

export interface UseWalletReturn {
    // State
    address: string | null;
    networkType: NetworkType | null;
    isConnecting: boolean;
    error: string | null;

    // Actions
    connect: (networkType: NetworkType, forceSelect?: boolean) => Promise<void>;
    connectWithWallet: (wallet: WalletInfo) => Promise<void>;
    switchNetwork: (networkType: NetworkType) => Promise<void>;
    ensureNetwork: (networkType: NetworkType) => Promise<void>;
    disconnect: () => Promise<void>;
    clearError: () => void;
}

/**
 * Hook for wallet connection
 * No Provider needed - uses external store
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { address, connect, disconnect } = useWallet();
 *
 *   return (
 *     <div>
 *       {address ? (
 *         <button onClick={disconnect}>Disconnect</button>
 *       ) : (
 *         <button onClick={() => connect(NetworkType.SOLANA)}>Connect</button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWallet(): UseWalletReturn {
    // Use React 18's useSyncExternalStore for optimal performance
    const state = useSyncExternalStore(
        (listener) => walletStore.subscribe(listener),
        () => walletStore.getState(),
        () => walletStore.getState() // Server snapshot
    );

    return {
        ...state,
        connect: (type: NetworkType, forceSelect?: boolean) => walletStore.connect(type, forceSelect),
        connectWithWallet: (wallet: WalletInfo) => walletStore.connectWithWallet(wallet),
        switchNetwork: (type: NetworkType) => walletStore.switchNetwork(type),
        ensureNetwork: (type: NetworkType) => walletStore.ensureNetwork(type),
        disconnect: () => walletStore.disconnect(),
        clearError: () => walletStore.clearError(),
    };
}

