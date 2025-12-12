/**
 * Wallet Store (External Store)
 *
 * Lightweight state management without Context Provider
 * Uses singleton pattern + event emitter for reactivity
 */

import {NetworkType} from '../../types';
import {
  connectWallet as connectWalletUtil,
  disconnectWallet as disconnectWalletUtil,
  isWalletManuallyDisconnected,
  markWalletDisconnected,
  onAccountsChanged,
  onChainChanged,
  onWalletDisconnect,
  removeWalletAddress,
  saveWalletAddress,
  switchNetwork as switchNetworkUtil,
  connectToWallet,
  WalletInfo,
  clearWalletDisconnection,
  saveConnectedNetworkType,
  clearConnectedWallet,
  setCurrentConnectedWallet,
  getWalletsForNetwork,
} from '../../utils';

type Listener = () => void;

interface WalletState {
  address: string | null;
  networkType: NetworkType | null;
  isConnecting: boolean;
  error: string | null;
}

class WalletStore {
  private state: WalletState = {
    address: null,
    networkType: null,
    isConnecting: false,
    error: null,
  };

  private listeners = new Set<Listener>();
  private initialized = false;

  // Initialize store (call once)
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // 不自动重连，让 usePageNetwork 来决定需要哪个网络
    // 这样可以确保每个页面都使用正确的网络类型

    // Listen for account changes (EVM only)
    onAccountsChanged((accounts) => {
      // 只有当前激活的网络是EVM时才处理账户变化
      if (this.state.networkType === NetworkType.EVM) {
        if (accounts.length === 0) {
          this.setState({address: null});
        } else if (!isWalletManuallyDisconnected(NetworkType.EVM)) {
          this.setState({address: accounts[0]});
          saveWalletAddress(NetworkType.EVM, accounts[0]);
        }
      }
    });

    // Listen for network/chain changes (EVM only)
    onChainChanged(() => {
      // 只有当前激活的网络是EVM时才处理链变化
      if (this.state.networkType === NetworkType.EVM) {
        // 用户在钱包中切换了链，清除当前连接
        this.handleDisconnect(NetworkType.EVM, 'Chain changed. Please reconnect your wallet.');
      }
    });

    // Listen for wallet disconnect (SVM only)
    onWalletDisconnect(() => {
      // 只有当前激活的网络是SVM时才处理断开
      const svmTypes = [NetworkType.SOLANA, NetworkType.SVM];
      if (this.state.networkType && svmTypes.includes(this.state.networkType)) {
        this.handleDisconnect(this.state.networkType);
      }
    });
  }


  // Get current state
  getState(): WalletState {
    return this.state;
  }

  // Update state and notify listeners
  private setState(partial: Partial<WalletState>) {
    this.state = {...this.state, ...partial};
    this.notifyListeners();
  }

  // Subscribe to state changes
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // Handle wallet disconnect (internal helper)
  private handleDisconnect(networkType: NetworkType, error?: string) {
    removeWalletAddress(networkType);
    markWalletDisconnected(networkType);

    // 清除当前网络类型缓存
    if (typeof window !== 'undefined') {
      localStorage.removeItem('connected_network_type');
    }

    this.setState({
      address: null,
      networkType: null,
      error: error || null,
    });
  }

  // Connect wallet
  // @param forceSelect - 强制弹出钱包选择界面，用于切换账户
  async connect(type: NetworkType, forceSelect: boolean = false): Promise<void> {
    // 保存当前网络的地址到缓存（如果正在切换网络）
    if (this.state.address && this.state.networkType && this.state.networkType !== type) {
      saveWalletAddress(this.state.networkType, this.state.address);
    }

    this.setState({isConnecting: true, error: null});

    try {
      const walletAddress = await connectWalletUtil(type, forceSelect);

      // Try to set the default wallet provider for this network type
      // This ensures payment functions use the correct provider
      const wallets = getWalletsForNetwork(type);
      if (wallets.length > 0) {
        // Use the first available wallet as default
        setCurrentConnectedWallet(wallets[0]);
      }

      this.setState({
        address: walletAddress,
        networkType: type,
        isConnecting: false,
      });
    } catch (err: any) {
      this.setState({
        error: err.message || 'Failed to connect wallet',
        isConnecting: false,
      });
      throw err;
    }
  }

  // Connect to a specific wallet (from wallet discovery)
  async connectWithWallet(wallet: WalletInfo): Promise<void> {
    // 保存当前网络的地址到缓存（如果正在切换网络）
    if (this.state.address && this.state.networkType && this.state.networkType !== wallet.networkType) {
      saveWalletAddress(this.state.networkType, this.state.address);
    }

    this.setState({isConnecting: true, error: null});

    try {
      const walletAddress = await connectToWallet(wallet);

      // Save connection state
      clearWalletDisconnection(wallet.networkType);
      saveConnectedNetworkType(wallet.networkType);
      saveWalletAddress(wallet.networkType, walletAddress);

      this.setState({
        address: walletAddress,
        networkType: wallet.networkType,
        isConnecting: false,
      });
    } catch (err: any) {
      this.setState({
        error: err.message || 'Failed to connect wallet',
        isConnecting: false,
      });
      throw err;
    }
  }

  // Switch network (use cached wallet if available)
  async switchNetwork(type: NetworkType): Promise<void> {
    // 保存当前网络的地址到缓存
    if (this.state.address && this.state.networkType) {
      saveWalletAddress(this.state.networkType, this.state.address);
    }

    this.setState({isConnecting: true, error: null});

    try {
      // 尝试使用缓存的钱包地址切换
      const address = await switchNetworkUtil(type);

      if (address) {
        // 成功使用缓存的钱包切换
        this.setState({
          address,
          networkType: type,
          isConnecting: false,
        });
      } else {
        // 没有缓存的钱包，需要连接
        this.setState({
          address: null,
          networkType: type,
          isConnecting: true,
        });
        await this.connect(type);
      }
    } catch (err: any) {
      this.setState({
        error: err.message || 'Failed to switch network',
        isConnecting: false,
      });
      throw err;
    }
  }

  // Disconnect wallet
  async disconnect(): Promise<void> {
    const currentNetwork = this.state.networkType;

    // Clear the connected wallet provider
    clearConnectedWallet();

    if (currentNetwork) {
      // 先调用真正的钱包断开方法
      try {
        await disconnectWalletUtil(currentNetwork);
      } catch (err) {
        console.warn('Failed to disconnect wallet provider:', err);
      }
      // 清除当前网络的缓存并标记为手动断开
      this.handleDisconnect(currentNetwork);
    } else {
      // 即使没有当前网络，也要清理状态
      this.setState({
        address: null,
        networkType: null,
        error: null,
      });
    }
  }

  // Clear error
  clearError(): void {
    this.setState({error: null});
  }

  // Ensure network matches expected type (for page-specific network requirements)
  async ensureNetwork(expectedNetwork: NetworkType): Promise<void> {
    // 如果用户手动断开了该网络，不自动重连
    if (isWalletManuallyDisconnected(expectedNetwork)) {
      return;
    }

    // 如果当前网络已经匹配，直接返回
    if (this.state.networkType === expectedNetwork && this.state.address) {
      return;
    }

    // 如果当前网络不匹配，尝试切换
    if (this.state.networkType !== expectedNetwork) {
      await this.switchNetwork(expectedNetwork);
    } else if (!this.state.address) {
      // 网络匹配但没有地址，需要连接
      await this.connect(expectedNetwork);
    }
  }
}

// Singleton instance
export const walletStore = new WalletStore();

// Initialize on import (browser only)
if (typeof window !== 'undefined') {
  walletStore.init();
}

