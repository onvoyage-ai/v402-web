/**
 * WalletConnect Component
 *
 * Pre-built wallet connection UI component with inline styles
 */

'use client';

import React, {useState} from 'react';
import {NetworkType} from '../../../types';
import {formatAddress, getNetworkDisplayName, WalletInfo} from '../../../utils';
import {useWallet} from '../../hooks/useWalletStore';
import {WalletSelectModal} from './WalletSelectModal';
import {
    buttonsContainerStyle,
    containerStyle,
    getAddressStyle,
    getConnectButtonStyle,
    getDisconnectButtonStyle,
    getErrorStyle,
    getHintStyle,
    getLabelStyle,
    getSectionStyle,
    getTitleStyle,
    walletActionsStyle,
    walletAddressStyle,
    walletOptionStyle,
} from '../../styles/inline-styles';

export interface WalletConnectProps {
  supportedNetworks?: NetworkType[];
  className?: string;
  onConnect?: (address: string, networkType: NetworkType) => void;
  onDisconnect?: () => void;
  /** 是否显示切换钱包按钮，默认为 true */
  showSwitchWallet?: boolean;
}

/**
 * Pre-built wallet connection component
 *
 * @example
 * ```tsx
 * import { WalletConnect } from '../react';
 *
 * function App() {
 *   return (
 *     <WalletConnect
 *       supportedNetworks={[NetworkType.SOLANA, NetworkType.EVM]}
 *       onConnect={(address, network) => console.log('Connected:', address)}
 *     />
 *   );
 * }
 * ```
 */
export function WalletConnect({
                                supportedNetworks = [NetworkType.SOLANA, NetworkType.EVM],
                                className = '',
                                onConnect,
                                onDisconnect,
                                showSwitchWallet = true,
                              }: WalletConnectProps) {
  const {address, networkType, isConnecting, error, connectWithWallet, disconnect} = useWallet();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [walletSelectOpen, setWalletSelectOpen] = useState(false);
  const [selectedNetworkType, setSelectedNetworkType] = useState<NetworkType | null>(null);

  const handleOpenWalletSelect = (network: NetworkType) => {
    setSelectedNetworkType(network);
    setWalletSelectOpen(true);
  };

  const handleWalletSelect = async (wallet: WalletInfo) => {
    setWalletSelectOpen(false);
    try {
      await connectWithWallet(wallet);
    } catch (err) {
      // Error is already set in hook
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    onDisconnect?.();
  };

  const handleSwitchWallet = () => {
    if (networkType) {
      // 打开钱包选择弹窗
      setSelectedNetworkType(networkType);
      setWalletSelectOpen(true);
    }
  };

  return (
      <>
        <div style={{ ...containerStyle, ...(className ? {} : {}) }} className={className}>
          {!address ? (
              <div style={getSectionStyle()}>
                <h3 style={getTitleStyle()}>Connect Wallet</h3>

                {supportedNetworks.length === 0 ? (
                    <p style={getHintStyle()}>Please install a supported wallet extension</p>
                ) : (
                    <div style={buttonsContainerStyle}>
                      {supportedNetworks.map((network) => (
                          <div key={network} style={walletOptionStyle}>
                            <button
                                style={getConnectButtonStyle(isConnecting, hoveredButton === network)}
                                onClick={() => handleOpenWalletSelect(network)}
                                disabled={isConnecting}
                                onMouseEnter={() => setHoveredButton(network)}
                                onMouseLeave={() => setHoveredButton(null)}
                            >
                              {isConnecting ? 'Connecting...' : getNetworkDisplayName(network)}
                            </button>
                          </div>
                      ))}
                    </div>
                )}

                {error && <p style={getErrorStyle()}>{error}</p>}

                <p style={getHintStyle()}>
                  Select a network to see available wallets
                </p>
              </div>
          ) : (
              <div style={getSectionStyle()}>
                <div style={walletAddressStyle}>
              <span style={getLabelStyle()}>
                Connected {networkType && `(${getNetworkDisplayName(networkType)})`}
              </span>
                  <span style={getAddressStyle()}>{formatAddress(address)}</span>
                </div>
                <div style={walletActionsStyle}>
                  {showSwitchWallet && (
                      <button
                          style={getConnectButtonStyle(isConnecting, hoveredButton === 'switch')}
                          onClick={handleSwitchWallet}
                          disabled={isConnecting}
                          onMouseEnter={() => setHoveredButton('switch')}
                          onMouseLeave={() => setHoveredButton(null)}
                      >
                        {isConnecting ? 'Switching...' : 'Switch Wallet'}
                      </button>
                  )}
                  <button
                      style={getDisconnectButtonStyle(hoveredButton === 'disconnect')}
                      onClick={handleDisconnect}
                      onMouseEnter={() => setHoveredButton('disconnect')}
                      onMouseLeave={() => setHoveredButton(null)}
                  >
                    Disconnect
                  </button>
                </div>
                <p style={getHintStyle()}>
                  Click "Switch Wallet" to change wallet or account
                </p>
              </div>
          )}
        </div>

        {/* Wallet Selection Modal */}
        {selectedNetworkType && (
            <WalletSelectModal
                isOpen={walletSelectOpen}
                networkType={selectedNetworkType}
                onSelect={handleWalletSelect}
                onClose={() => setWalletSelectOpen(false)}
            />
        )}
      </>
  );
}

