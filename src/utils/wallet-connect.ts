/**
 * Wallet connection utilities for demo/UI
 * Higher-level helpers built on top of base wallet utilities
 */

import {NetworkType} from "../types";
import {
  clearWalletDisconnection,
  getCachedWalletAddress,
  getConnectedNetworkType as getStoredNetworkType,
  markWalletDisconnected,
  removeWalletAddress,
  saveConnectedNetworkType,
  saveWalletAddress
} from "./wallet";

/**
 * Connect wallet and return address
 * @param forceSelect - Force wallet selection UI to appear (for switching accounts)
 */
export async function connectWallet(networkType: NetworkType, forceSelect: boolean = false): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Please use in browser environment');
  }

  let address: string;

  switch (networkType) {
    case NetworkType.EVM: {
      if (!(window as any).ethereum) {
        throw new Error('Please install MetaMask or another Ethereum wallet');
      }
      const ethereum = (window as any).ethereum;
      
      if (forceSelect) {
        // Force account selection UI
        try {
          const permissions = await ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }],
          });
          // Get account from permissions result
          const accountsPermission = permissions?.find(
            (p: any) => p.parentCapability === 'eth_accounts'
          );
          if (accountsPermission?.caveats?.[0]?.value?.length > 0) {
            address = accountsPermission.caveats[0].value[0];
            break;
          }
        } catch (err: any) {
          // User cancelled permission request
          if (err.code === 4001) {
            throw new Error('User cancelled wallet connection');
          }
          // If wallet doesn't support wallet_requestPermissions, continue with normal method
          console.warn('wallet_requestPermissions failed, falling back to eth_requestAccounts');
        }
      }
      
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
        params: [],
      });
      if (!accounts || accounts.length === 0) {
        throw new Error('Failed to get wallet address');
      }
      address = accounts[0];
      break;
    }

    case NetworkType.SOLANA:
    case NetworkType.SVM: {
      // Detect available Solana wallets
      const phantom = (window as any).phantom?.solana || (window as any).solana;
      const solflare = (window as any).solflare;
      
      // Prefer Phantom
      let solana = phantom;
      
      // If forceSelect and multiple wallets available, consider switching
      // Currently simple handling: if Phantom unavailable, try Solflare
      if (!solana && solflare?.isSolflare) {
        solana = solflare;
      }
      
      if (!solana) {
        throw new Error('Please install Phantom or another Solana wallet');
      }
      
      // If force select, fully disconnect first
      if (forceSelect) {
        try {
          // Disconnect all possible wallet connections
          if (phantom?.isConnected) {
            await phantom.disconnect();
          }
          if (solflare?.isConnected) {
            await solflare.disconnect();
          }
          // Wait briefly for wallet to complete disconnection
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.warn('Failed to disconnect Solana wallet:', err);
        }
      } else if (solana.isConnected) {
        // In non-force mode, disconnect if already connected
        try {
          await solana.disconnect();
        } catch (err) {
          console.warn('Failed to disconnect Solana wallet:', err);
        }
      }
      
      // Connect wallet - Phantom will show confirmation dialog
      const response = await solana.connect();
      address = response.publicKey.toString();
      break;
    }

    default:
      throw new Error('Unsupported network type');
  }

  // Save connection state
  clearWalletDisconnection(networkType); // Clear disconnection flag for this network
  saveConnectedNetworkType(networkType);
  // Cache wallet address for multi-network switching
  saveWalletAddress(networkType, address);

  return address;
}

/**
 * Disconnect all Solana wallets
 */
async function disconnectAllSolanaWallets(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const phantom = (window as any).phantom?.solana || (window as any).solana;
  const solflare = (window as any).solflare;
  
  const disconnectPromises: Promise<void>[] = [];
  
  if (phantom?.isConnected) {
    disconnectPromises.push(
      phantom.disconnect().catch((err: any) => 
        console.warn('Failed to disconnect Phantom:', err)
      )
    );
  }
  
  if (solflare?.isConnected) {
    disconnectPromises.push(
      solflare.disconnect().catch((err: any) => 
        console.warn('Failed to disconnect Solflare:', err)
      )
    );
  }
  
  await Promise.all(disconnectPromises);
}

/**
 * Disconnect wallet
 * @param networkType - Optional, specify network type to disconnect. If not specified, disconnects current network
 * @param clearAll - Whether to clear all network caches, default false
 */
export async function disconnectWallet(networkType?: NetworkType, clearAll: boolean = false): Promise<void> {
  const targetNetwork = networkType || getStoredNetworkType();
  
  // Actually disconnect wallet
  if (targetNetwork && typeof window !== 'undefined') {
    try {
      switch (targetNetwork) {
        case NetworkType.SOLANA:
        case NetworkType.SVM: {
          await disconnectAllSolanaWallets();
          break;
        }
        // EVM wallets (like MetaMask) don't have a real disconnect API
        // Only clear local state, will request permissions again on next connection
        case NetworkType.EVM:
        default:
          break;
      }
    } catch (err) {
      console.warn('Failed to disconnect wallet:', err);
    }
  }
  
  if (clearAll) {
    // Clear all network wallet caches
    const { clearAllWalletAddresses } = require('./wallet');
    clearAllWalletAddresses();
    markWalletDisconnected();
    
    // Disconnect all wallet types
    await disconnectAllSolanaWallets();
  } else if (networkType) {
    // Only clear specified network cache
    removeWalletAddress(networkType);
    // Don't call markWalletDisconnected() to avoid affecting other networks
  } else {
    // Clear current connected network cache
    if (targetNetwork) {
      removeWalletAddress(targetNetwork);
    }
    // Don't call markWalletDisconnected() to avoid affecting other networks
  }
}

/**
 * Get current wallet address
 * Reads from cache first, cache is saved when user explicitly connects, should be trusted
 * Note: This function does not auto-update cache, cache updates should only happen on explicit connection
 */
export async function getCurrentWallet(networkType?: NetworkType): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const type = networkType || getStoredNetworkType();
  if (!type) {
    return null;
  }

  // Read from cache - cache contains user's explicitly selected wallet address
  const cachedAddress = getCachedWalletAddress(type);
  
  // For EVM wallets, return cached address directly
  // Because eth_accounts returns MetaMask's currently selected account,
  // not the account user selected to connect in the app
  // Cached address is saved on explicit connection, should be trusted
  if (type === NetworkType.EVM) {
    if (cachedAddress) {
      return cachedAddress;
    }
    // When no cache, check wallet's current state
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts',
          params: [],
        });
        return accounts && accounts.length > 0 ? accounts[0] : null;
      } catch (error) {
        console.error('Failed to get EVM accounts:', error);
        return null;
      }
    }
    return null;
  }
  
  // For Solana wallets, need to verify connection status
  if (type === NetworkType.SOLANA || type === NetworkType.SVM) {
    const solana = (window as any).solana;
    if (!solana || !solana.isConnected) {
      return cachedAddress;
    }
    return solana.publicKey?.toString() || cachedAddress;
  }

  return cachedAddress;
}

/**
 * Listen for account changes (EVM only)
 */
export function onAccountsChanged(
    callback: (accounts: string[]) => void
): () => void {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return () => {
    };
  }

  const ethereum = (window as any).ethereum;
  const handler = (accounts: string[]) => {
    callback(accounts);
  };

  ethereum.on('accountsChanged', handler);

  return () => {
    ethereum.removeListener?.('accountsChanged', handler);
  };
}

/**
 * Listen for chain/network changes (EVM only)
 */
export function onChainChanged(
    callback: (chainId: string) => void
): () => void {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    return () => {
    };
  }

  const ethereum = (window as any).ethereum;
  const handler = (chainId: string) => {
    console.log('🔄 Chain changed to:', chainId);
    callback(chainId);
  };

  ethereum.on('chainChanged', handler);

  return () => {
    ethereum.removeListener?.('chainChanged', handler);
  };
}

/**
 * Listen for wallet disconnect (Solana only)
 */
export function onWalletDisconnect(
    callback: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {
    };
  }

  const solana = (window as any).solana;
  if (!solana) {
    return () => {
    };
  }

  const handler = () => {
    console.log('🔌 Solana wallet disconnected');
    callback();
  };

  solana.on('disconnect', handler);

  return () => {
    solana.removeListener?.('disconnect', handler);
  };
}

/**
 * Switch to specified network
 * If network has cached wallet address, switch directly
 * If no cache, need to connect wallet
 */
export async function switchNetwork(networkType: NetworkType): Promise<string | null> {
  const cachedAddress = getCachedWalletAddress(networkType);
  
  if (cachedAddress) {
    // If cached address exists, switch network type directly
    saveConnectedNetworkType(networkType);
    clearWalletDisconnection(networkType); // Clear disconnection flag for this network
    
    // Verify wallet is still connected
    const currentAddress = await getCurrentWallet(networkType);
    if (currentAddress) {
      return currentAddress;
    }
  }
  
  // If no cache or verification failed, return null to indicate reconnection needed
  return null;
}

