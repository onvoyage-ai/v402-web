/**
 * Wallet Discovery
 * 
 * Discovers installed wallets using:
 * - EIP-6963 for EVM wallets
 * - Direct detection for Solana wallets
 */

import { NetworkType } from '../types';
import { getConnectedWalletId, saveConnectedWalletId, removeConnectedWalletId } from './wallet';

// EIP-6963 types
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string; // Data URL
  rdns: string; // Reverse DNS identifier
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any; // EIP-1193 provider
}

export interface EIP6963AnnounceProviderEvent extends Event {
  detail: EIP6963ProviderDetail;
}

// Unified wallet info
export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  networkType: NetworkType;
  provider: any;
  installed: boolean;
}

// Known Solana wallets with their detection and icons
// Icons are base64 encoded or from reliable CDN sources
const SOLANA_WALLETS: Array<{
  id: string;
  name: string;
  icon: string;
  detect: () => any;
}> = [
  {
    id: 'phantom',
    name: 'Phantom',
    // Phantom official icon
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZD0iTTExMC41IDY0QzExMC41IDg5Ljk1NjggODkuMjAxIDExMSA2My41IDExMUg0MS41QzM2LjI1MzMgMTExIDMyIDEwNi43NDcgMzIgMTAxLjVWNTQuNUMzMiAzMS4wMjggNTEuMDI4IDEyIDc0LjUgMTJDOTcuOTcyIDEyIDExNyAzMS4wMjggMTE3IDU0LjVWNTUuNUMxMTcgNTguNTM3NiAxMTQuNTM4IDYxIDExMS41IDYxSDEwOS41QzEwNi40NjIgNjEgMTA0IDYzLjQ2MjQgMTA0IDY2LjVWNjhDMTA0IDcxLjg2NiAxMDcuMTM0IDc1IDExMSA3NUgxMTEuNUMxMTQuNTM4IDc1IDExNyA3Mi41Mzc2IDExNyA2OS41VjY0SDExMC41WiIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzEyOF8xMjgpIi8+CjxwYXRoIGQ9Ik00OC41IDY3QzUxLjUzNzYgNjcgNTQgNjQuNTM3NiA1NCA2MS41QzU0IDU4LjQ2MjQgNTEuNTM3NiA1NiA0OC41IDU2QzQ1LjQ2MjQgNTYgNDMgNTguNDYyNCA0MyA2MS41QzQzIDY0LjUzNzYgNDUuNDYyNCA2NyA0OC41IDY3WiIgZmlsbD0iIzFCMUIxQiIvPgo8cGF0aCBkPSJNNzMuNSA2N0M3Ni41Mzc2IDY3IDc5IDY0LjUzNzYgNzkgNjEuNUM3OSA1OC40NjI0IDc2LjUzNzYgNTYgNzMuNSA1NkM3MC40NjI0IDU2IDY4IDU4LjQ2MjQgNjggNjEuNUM2OCA2NC41Mzc2IDcwLjQ2MjQgNjcgNzMuNSA2N1oiIGZpbGw9IiMxQjFCMUIiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xMjhfMTI4IiB4MT0iMTE3IiB5MT0iMTIiIHgyPSIxMTciIHkyPSIxMTEiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGRkZGRiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRkZGRkYiIHN0b3Atb3BhY2l0eT0iMC44MiIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPg==',
    detect: () => (window as any).phantom?.solana,
  },
  {
    id: 'solflare',
    name: 'Solflare',
    // Solflare icon
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjYiIGZpbGw9IiNGQzZEMDEiLz4KPHBhdGggZD0iTTk2IDY0TDY0IDMyTDMyIDY0TDY0IDk2TDk2IDY0WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
    detect: () => (window as any).solflare,
  },
  {
    id: 'backpack',
    name: 'Backpack',
    // Backpack icon (red coral color)
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjYiIGZpbGw9IiNFMzM0MzAiLz4KPHBhdGggZD0iTTQwIDQ4SDg4VjgwQzg4IDg4LjgzNjYgODAuODM2NiA5NiA3MiA5Nkg1NkM0Ny4xNjM0IDk2IDQwIDg4LjgzNjYgNDAgODBWNDhaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNTIgMzJINzZWNDhINTJWMzJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=',
    detect: () => (window as any).backpack,
  },
  {
    id: 'okx-solana',
    name: 'OKX Wallet',
    // OKX icon
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjYiIGZpbGw9ImJsYWNrIi8+CjxyZWN0IHg9IjI0IiB5PSIyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0id2hpdGUiLz4KPHJlY3QgeD0iNTIiIHk9IjI0IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSI4MCIgeT0iMjQiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IndoaXRlIi8+CjxyZWN0IHg9IjI0IiB5PSI1MiIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0id2hpdGUiLz4KPHJlY3QgeD0iODAiIHk9IjUyIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSJ3aGl0ZSIvPgo8cmVjdCB4PSIyNCIgeT0iODAiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IndoaXRlIi8+CjxyZWN0IHg9IjUyIiB5PSI4MCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNCIgZmlsbD0id2hpdGUiLz4KPHJlY3QgeD0iODAiIHk9IjgwIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=',
    detect: () => (window as any).okxwallet?.solana,
  },
  {
    id: 'coinbase-solana',
    name: 'Coinbase Wallet',
    // Coinbase icon (blue)
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjYiIGZpbGw9IiMwMDUyRkYiLz4KPGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iMzYiIGZpbGw9IndoaXRlIi8+CjxyZWN0IHg9IjQ4IiB5PSI1NiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iIzAwNTJGRiIvPgo8L3N2Zz4=',
    detect: () => (window as any).coinbaseSolana,
  },
  {
    id: 'trust-solana',
    name: 'Trust Wallet',
    // Trust Wallet icon
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMjYiIGZpbGw9IiMwNTAwRkYiLz4KPHBhdGggZD0iTTY0IDI0QzY0IDI0IDk2IDQwIDk2IDY0Qzk2IDg4IDY0IDEwNCA2NCAxMDRDNjQgMTA0IDMyIDg4IDMyIDY0QzMyIDQwIDY0IDI0IDY0IDI0WiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSI2IiBmaWxsPSJub25lIi8+Cjwvc3ZnPg==',
    detect: () => (window as any).trustwallet?.solana,
  },
];

// Store for discovered EVM wallets
let evmWallets: Map<string, EIP6963ProviderDetail> = new Map();
let evmDiscoveryListeners: Set<() => void> = new Set();
let evmDiscoveryInitialized = false;

// Store for currently connected wallet (for payment signing)
let currentConnectedWallet: WalletInfo | null = null;

/**
 * Initialize EIP-6963 wallet discovery
 */
export function initEVMWalletDiscovery(): void {
  if (typeof window === 'undefined' || evmDiscoveryInitialized) return;
  evmDiscoveryInitialized = true;

  // Listen for wallet announcements
  window.addEventListener('eip6963:announceProvider', ((event: EIP6963AnnounceProviderEvent) => {
    const { info, provider } = event.detail;
    evmWallets.set(info.uuid, { info, provider });
    // Notify listeners
    evmDiscoveryListeners.forEach(listener => listener());
  }) as EventListener);

  // Request wallets to announce themselves
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/**
 * Get all discovered EVM wallets
 */
export function getEVMWallets(): WalletInfo[] {
  const wallets: WalletInfo[] = [];
  const detectedNames = new Set<string>();
  
  evmWallets.forEach((detail, uuid) => {
    // Skip if wallet name already exists (avoid duplicates)
    if (!detectedNames.has(detail.info.name)) {
      wallets.push({
        id: uuid,
        name: detail.info.name,
        icon: detail.info.icon,
        networkType: NetworkType.EVM,
        provider: detail.provider,
        installed: true,
      });
      detectedNames.add(detail.info.name);
    }
  });

  // Fallback: if no EIP-6963 wallets found, check for window.ethereum
  if (wallets.length === 0 && typeof window !== 'undefined' && (window as any).ethereum) {
    const ethereum = (window as any).ethereum;
    const walletName = ethereum.isMetaMask ? 'MetaMask' : 
          ethereum.isCoinbaseWallet ? 'Coinbase Wallet' : 
          ethereum.isOkxWallet ? 'OKX Wallet' : 'Browser Wallet';
    
    if (!detectedNames.has(walletName)) {
      wallets.push({
        id: 'injected',
        name: walletName,
        icon: '', // Will use first letter as avatar
        networkType: NetworkType.EVM,
        provider: ethereum,
        installed: true,
      });
    }
  }

  return wallets;
}

/**
 * Subscribe to EVM wallet discovery changes
 */
export function onEVMWalletsChanged(callback: () => void): () => void {
  evmDiscoveryListeners.add(callback);
  return () => {
    evmDiscoveryListeners.delete(callback);
  };
}

/**
 * Get all detected Solana wallets
 */
export function getSolanaWallets(): WalletInfo[] {
  if (typeof window === 'undefined') return [];

  const wallets: WalletInfo[] = [];
  const detectedProviders = new Set<any>();
  const detectedNames = new Set<string>();

  // First, detect known wallets from our list
  for (const wallet of SOLANA_WALLETS) {
    const provider = wallet.detect();
    if (provider && !detectedNames.has(wallet.name)) {
      wallets.push({
        id: wallet.id,
        name: wallet.name,
        icon: wallet.icon,
        networkType: NetworkType.SOLANA,
        provider,
        installed: true,
      });
      detectedProviders.add(provider);
      detectedNames.add(wallet.name);
    }
  }

  // Fallback: detect any other Solana wallet not in our known list
  // Check window.solana if it exists and wasn't already detected
  const windowSolana = (window as any).solana;
  if (windowSolana && !detectedProviders.has(windowSolana)) {
    // Try to get wallet name from provider
    const walletName = windowSolana.isPhantom ? 'Phantom' :
                       windowSolana.isSolflare ? 'Solflare' :
                       windowSolana.isBackpack ? 'Backpack' :
                       windowSolana.walletName || 'Solana Wallet';
    
    // Only add if name not already detected
    if (!detectedNames.has(walletName)) {
      wallets.push({
        id: 'solana-unknown',
        name: walletName,
        icon: '', // Will use first letter as avatar
        networkType: NetworkType.SOLANA,
        provider: windowSolana,
        installed: true,
      });
    }
  }

  return wallets;
}

/**
 * Get all wallets for a specific network type
 */
export function getWalletsForNetwork(networkType: NetworkType): WalletInfo[] {
  switch (networkType) {
    case NetworkType.EVM:
      return getEVMWallets();
    case NetworkType.SOLANA:
    case NetworkType.SVM:
      return getSolanaWallets();
    default:
      return [];
  }
}

/**
 * Get a specific wallet by ID
 */
export function getWalletById(id: string, networkType: NetworkType): WalletInfo | null {
  const wallets = getWalletsForNetwork(networkType);
  return wallets.find(w => w.id === id) || null;
}

/**
 * Get a specific wallet by name
 * More reliable than getWalletById for EVM wallets since EIP-6963 UUIDs may change
 */
export function getWalletByName(name: string, networkType: NetworkType): WalletInfo | null {
  const wallets = getWalletsForNetwork(networkType);
  return wallets.find(w => w.name === name) || null;
}

/**
 * Connect to a specific EVM wallet
 */
export async function connectEVMWallet(wallet: WalletInfo): Promise<string> {
  if (!wallet.provider) {
    throw new Error(`钱包 ${wallet.name} 不可用`);
  }

  const accounts = await wallet.provider.request({
    method: 'eth_requestAccounts',
    params: [],
  });

  if (!accounts || accounts.length === 0) {
    throw new Error('未能获取到钱包地址');
  }

  return accounts[0];
}

/**
 * Connect to a specific Solana wallet
 */
export async function connectSolanaWallet(wallet: WalletInfo): Promise<string> {
  if (!wallet.provider) {
    throw new Error(`钱包 ${wallet.name} 不可用`);
  }

  // Disconnect first if connected
  if (wallet.provider.isConnected) {
    try {
      await wallet.provider.disconnect();
    } catch (err) {
      console.warn('Failed to disconnect before connecting:', err);
    }
  }

  const response = await wallet.provider.connect();
  return response.publicKey.toString();
}

/**
 * Connect to a specific wallet
 */
export async function connectToWallet(wallet: WalletInfo): Promise<string> {
  let address: string;
  
  switch (wallet.networkType) {
    case NetworkType.EVM:
      address = await connectEVMWallet(wallet);
      break;
    case NetworkType.SOLANA:
    case NetworkType.SVM:
      address = await connectSolanaWallet(wallet);
      break;
    default:
      throw new Error('不支持的网络类型');
  }
  
  // Save the connected wallet for payment signing
  currentConnectedWallet = wallet;
  
  // Save wallet name to localStorage for persistence across page refreshes
  // Using name instead of ID because EIP-6963 UUIDs may change across page loads
  saveConnectedWalletId(wallet.networkType, wallet.name);
  
  return address;
}

/**
 * Get the currently connected wallet
 * Used by payment functions to get the correct provider
 */
export function getCurrentConnectedWallet(): WalletInfo | null {
  return currentConnectedWallet;
}

/**
 * Set the currently connected wallet
 * Called when connecting through other methods (e.g., direct connect)
 */
export function setCurrentConnectedWallet(wallet: WalletInfo | null): void {
  currentConnectedWallet = wallet;
}

/**
 * Clear the connected wallet
 * Called on disconnect
 */
export function clearConnectedWallet(networkType?: NetworkType): void {
  if (networkType) {
    // Clear wallet ID from localStorage
    removeConnectedWalletId(networkType);
  }
  currentConnectedWallet = null;
}

/**
 * Restore connected wallet from localStorage
 * Called when currentConnectedWallet is null but we have a saved wallet name
 */
function restoreConnectedWallet(networkType: NetworkType): WalletInfo | null {
  const savedWalletName = getConnectedWalletId(networkType);
  if (!savedWalletName) return null;
  
  // Find the wallet by name (more reliable than ID for EIP-6963 wallets)
  const wallet = getWalletByName(savedWalletName, networkType);
  if (wallet) {
    // Restore to memory
    currentConnectedWallet = wallet;
    console.log(`✅ Restored wallet provider: ${wallet.name}`);
    return wallet;
  }
  
  console.warn(`⚠️ Could not find wallet with name: ${savedWalletName}`);
  return null;
}

/**
 * Get the wallet provider for payment
 * Returns the provider from the currently connected wallet,
 * or falls back to default providers if not set
 */
export function getWalletProviderForPayment(networkType: NetworkType): any {
  // If we have a connected wallet of the matching type, use its provider
  if (currentConnectedWallet && currentConnectedWallet.networkType === networkType) {
    return currentConnectedWallet.provider;
  }
  
  // Try to restore from localStorage (e.g., after page refresh)
  const restoredWallet = restoreConnectedWallet(networkType);
  if (restoredWallet) {
    return restoredWallet.provider;
  }
  
  // Fallback to default providers
  if (typeof window === 'undefined') return null;
  
  switch (networkType) {
    case NetworkType.EVM:
      return (window as any).ethereum;
    case NetworkType.SOLANA:
    case NetworkType.SVM:
      return (window as any).phantom?.solana || (window as any).solana;
    default:
      return null;
  }
}

/**
 * Get the wallet provider for payment with address validation
 * Ensures the provider's current account matches the expected address
 * 
 * @param networkType - Network type
 * @param expectedAddress - The address we expect to use for payment
 * @returns The provider if valid, null if mismatch
 */
export async function getValidatedWalletProvider(
  networkType: NetworkType, 
  expectedAddress: string
): Promise<{ provider: any; isValid: boolean; currentAddress?: string }> {
  const provider = getWalletProviderForPayment(networkType);
  if (!provider) {
    return { provider: null, isValid: false };
  }
  
  // For EVM, check if the current account matches
  if (networkType === NetworkType.EVM) {
    try {
      const accounts = await provider.request({ method: 'eth_accounts', params: [] });
      const currentAddress = accounts?.[0];
      const isValid = currentAddress?.toLowerCase() === expectedAddress?.toLowerCase();
      
      if (!isValid) {
        console.warn(`⚠️ Account mismatch: expected ${expectedAddress}, got ${currentAddress}`);
      }
      
      return { provider, isValid, currentAddress };
    } catch (error) {
      console.error('Failed to get current account:', error);
      return { provider, isValid: false };
    }
  }
  
  // For Solana, check if connected and address matches
  if (networkType === NetworkType.SOLANA || networkType === NetworkType.SVM) {
    if (provider.isConnected && provider.publicKey) {
      const currentAddress = provider.publicKey.toString();
      const isValid = currentAddress === expectedAddress;
      
      if (!isValid) {
        console.warn(`⚠️ Account mismatch: expected ${expectedAddress}, got ${currentAddress}`);
      }
      
      return { provider, isValid, currentAddress };
    }
    return { provider, isValid: false };
  }
  
  return { provider, isValid: true };
}

// Initialize on import (browser only)
if (typeof window !== 'undefined') {
  initEVMWalletDiscovery();
}

