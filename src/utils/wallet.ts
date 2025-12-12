/**
 * Wallet utilities
 *
 * Generic wallet connection and management utilities
 * Framework-agnostic and chain-agnostic
 */

import {NetworkType} from "../types";

const WALLET_DISCONNECTED_KEY = 'wallet_manually_disconnected';
const WALLET_DISCONNECTED_NETWORKS_KEY = 'wallet_disconnected_networks'; // 记录每个网络的断开状态
const CONNECTED_NETWORK_TYPE_KEY = 'connected_network_type';
const WALLET_ADDRESSES_KEY = 'wallet_addresses_cache'; // 多网络钱包地址缓存
const CONNECTED_WALLET_IDS_KEY = 'connected_wallet_ids'; // 每个网络连接的钱包 ID

/**
 * Check if a wallet is installed for a specific network type
 */
export function isWalletInstalled(networkType: NetworkType): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  switch (networkType) {
    case NetworkType.EVM:
      return !!(window as any).ethereum;

    case NetworkType.SOLANA:
    case NetworkType.SVM:
      return !!(window as any).solana || !!(window as any).phantom;

    default:
      return false;
  }
}

/**
 * Get wallet provider for a network type
 */
export function getWalletProvider(networkType: NetworkType): any {
  if (typeof window === 'undefined') {
    return null;
  }

  switch (networkType) {
    case NetworkType.EVM:
      return (window as any).ethereum;

    case NetworkType.SOLANA:
    case NetworkType.SVM:
      return (window as any).solana || (window as any).phantom;

    default:
      return null;
  }
}

/**
 * Format wallet address for display (show first 6 and last 4 characters)
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get all disconnected networks
 */
function getDisconnectedNetworks(): Partial<Record<NetworkType, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const cached = localStorage.getItem(WALLET_DISCONNECTED_NETWORKS_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    return {};
  }
}

/**
 * Mark wallet as manually disconnected (for specific network)
 */
export function markWalletDisconnected(networkType?: NetworkType): void {
  if (typeof window !== 'undefined') {
    if (networkType) {
      // 标记特定网络为断开
      const disconnected = getDisconnectedNetworks();
      disconnected[networkType] = true;
      localStorage.setItem(WALLET_DISCONNECTED_NETWORKS_KEY, JSON.stringify(disconnected));
    } else {
      // 兼容旧版：全局断开
      localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
      localStorage.removeItem(CONNECTED_NETWORK_TYPE_KEY);
    }
  }
}

/**
 * Clear wallet disconnection flag (for specific network or all)
 */
export function clearWalletDisconnection(networkType?: NetworkType): void {
  if (typeof window !== 'undefined') {
    if (networkType) {
      // 清除特定网络的断开标记
      const disconnected = getDisconnectedNetworks();
      delete disconnected[networkType];
      localStorage.setItem(WALLET_DISCONNECTED_NETWORKS_KEY, JSON.stringify(disconnected));
    } else {
      // 兼容旧版：清除全局断开标记
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
    }
  }
}

/**
 * Check if user manually disconnected wallet (for specific network)
 */
export function isWalletManuallyDisconnected(networkType?: NetworkType): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  if (networkType) {
    // 检查特定网络是否断开
    const disconnected = getDisconnectedNetworks();
    return disconnected[networkType] === true;
  } else {
    // 兼容旧版：检查全局断开标记
    return localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
  }
}

/**
 * Save connected network type
 */
export function saveConnectedNetworkType(networkType: NetworkType): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONNECTED_NETWORK_TYPE_KEY, networkType);
  }
}

/**
 * Get saved network type
 */
export function getConnectedNetworkType(): NetworkType | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const type = localStorage.getItem(CONNECTED_NETWORK_TYPE_KEY);
  return type as NetworkType || null;
}

/**
 * Get wallet install URL
 */
export function getWalletInstallUrl(networkType: NetworkType): string {
  switch (networkType) {
    case NetworkType.EVM:
      return 'https://metamask.io/download/';
    case NetworkType.SOLANA:
    case NetworkType.SVM:
      return 'https://phantom.app/download';
    default:
      return '#';
  }
}

/**
 * Get wallet display name
 */
export function getWalletDisplayName(networkType: NetworkType): string {
  switch (networkType) {
    case NetworkType.EVM:
      return 'MetaMask';
    case NetworkType.SOLANA:
    case NetworkType.SVM:
      return 'Phantom';
    default:
      return 'Unknown Wallet';
  }
}

/**
 * Get all cached wallet addresses
 */
export function getAllWalletAddresses(): Partial<Record<NetworkType, string>> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const cached = localStorage.getItem(WALLET_ADDRESSES_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error('Failed to parse wallet addresses cache:', error);
    return {};
  }
}

/**
 * Save wallet address for a specific network
 */
export function saveWalletAddress(networkType: NetworkType, address: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const addresses = getAllWalletAddresses();
  addresses[networkType] = address;
  localStorage.setItem(WALLET_ADDRESSES_KEY, JSON.stringify(addresses));
}

/**
 * Get cached wallet address for a specific network
 */
export function getCachedWalletAddress(networkType: NetworkType): string | null {
  const addresses = getAllWalletAddresses();
  return addresses[networkType] || null;
}

/**
 * Remove wallet address for a specific network
 */
export function removeWalletAddress(networkType: NetworkType): void {
  if (typeof window === 'undefined') {
    return;
  }
  const addresses = getAllWalletAddresses();
  delete addresses[networkType];
  localStorage.setItem(WALLET_ADDRESSES_KEY, JSON.stringify(addresses));
}

/**
 * Clear all cached wallet addresses
 */
export function clearAllWalletAddresses(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WALLET_ADDRESSES_KEY);
  }
}

/**
 * Get all connected wallet IDs
 */
export function getAllConnectedWalletIds(): Partial<Record<NetworkType, string>> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const cached = localStorage.getItem(CONNECTED_WALLET_IDS_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error('Failed to parse connected wallet IDs:', error);
    return {};
  }
}

/**
 * Save connected wallet ID for a specific network
 */
export function saveConnectedWalletId(networkType: NetworkType, walletId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const walletIds = getAllConnectedWalletIds();
  walletIds[networkType] = walletId;
  localStorage.setItem(CONNECTED_WALLET_IDS_KEY, JSON.stringify(walletIds));
}

/**
 * Get connected wallet ID for a specific network
 */
export function getConnectedWalletId(networkType: NetworkType): string | null {
  const walletIds = getAllConnectedWalletIds();
  return walletIds[networkType] || null;
}

/**
 * Remove connected wallet ID for a specific network
 */
export function removeConnectedWalletId(networkType: NetworkType): void {
  if (typeof window === 'undefined') {
    return;
  }
  const walletIds = getAllConnectedWalletIds();
  delete walletIds[networkType];
  localStorage.setItem(CONNECTED_WALLET_IDS_KEY, JSON.stringify(walletIds));
}
