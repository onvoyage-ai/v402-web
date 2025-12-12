/**
 * WalletSelectModal Component
 *
 * Modal for selecting a wallet to connect
 * Uses Portal to render outside parent container (avoids clipping)
 */

'use client';

import React, {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {NetworkType} from '../../types';
import {
    getWalletsForNetwork,
    initEVMWalletDiscovery,
    onEVMWalletsChanged,
    WalletInfo,
} from '../../utils/wallet-discovery';
import {getNetworkDisplayName} from '../../utils';

export interface WalletSelectModalProps {
    isOpen: boolean;
    networkType: NetworkType;
    onSelect: (wallet: WalletInfo) => void;
    onClose: () => void;
}

// Inline styles - compact version
const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
};

const modalStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    maxWidth: '320px',
    width: '90%',
    maxHeight: '70vh',
    overflow: 'auto',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
};

const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
};

const titleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: 0,
};

const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    padding: '2px 6px',
    lineHeight: 1,
    borderRadius: '4px',
};

const subtitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
    marginBottom: '12px',
};

const walletListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
};

const getWalletItemStyle = (isHovered: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: isHovered ? '#f5f5f5' : '#ffffff',
    borderColor: isHovered ? '#d0d0d0' : '#e5e5e5',
});

const walletIconStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    objectFit: 'contain',
    backgroundColor: '#f5f5f5',
};

// Generate a consistent color based on wallet name
const getAvatarColor = (name: string): string => {
    const colors = [
        '#6366f1', // indigo
        '#8b5cf6', // violet
        '#ec4899', // pink
        '#f43f5e', // rose
        '#f97316', // orange
        '#eab308', // yellow
        '#22c55e', // green
        '#14b8a6', // teal
        '#06b6d4', // cyan
        '#3b82f6', // blue
    ];
    // Use first char code to pick a consistent color
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
};

const getWalletIconPlaceholderStyle = (walletName: string): React.CSSProperties => ({
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: getAvatarColor(walletName),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
});

const walletNameStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1a1a1a',
};

const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '24px 12px',
    color: '#666',
};

const emptyTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '6px',
    color: '#1a1a1a',
};

const emptyDescStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#888',
};

// Wallet item component with icon fallback
function WalletItem({
                        wallet,
                        isHovered,
                        onSelect,
                        onHover
                    }: {
    wallet: WalletInfo;
    isHovered: boolean;
    onSelect: () => void;
    onHover: (hovered: boolean) => void;
}) {
    const [iconError, setIconError] = useState(false);

    return (
        <div
            style={getWalletItemStyle(isHovered)}
            onClick={onSelect}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
        >
            {wallet.icon && !iconError ? (
                <img
                    src={wallet.icon}
                    alt={wallet.name}
                    style={walletIconStyle}
                    onError={() => setIconError(true)}
                />
            ) : (
                <div style={getWalletIconPlaceholderStyle(wallet.name)}>
                    {wallet.name.charAt(0).toUpperCase()}
                </div>
            )}
            <span style={walletNameStyle}>{wallet.name}</span>
        </div>
    );
}

export function WalletSelectModal({
                                      isOpen,
                                      networkType,
                                      onSelect,
                                      onClose,
                                  }: WalletSelectModalProps) {
    const [wallets, setWallets] = useState<WalletInfo[]>([]);
    const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Handle client-side mounting for Portal
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        // Initialize EVM discovery
        initEVMWalletDiscovery();

        // Get initial wallets
        const updateWallets = () => {
            setWallets(getWalletsForNetwork(networkType));
        };

        updateWallets();

        // Listen for EVM wallet changes
        const unsubscribe = onEVMWalletsChanged(updateWallets);

        // Re-fetch after a short delay to catch late announcements
        const timer = setTimeout(updateWallets, 500);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, [isOpen, networkType]);

    if (!isOpen || !mounted) return null;

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const networkName = getNetworkDisplayName(networkType);

    const modalContent = (
        <div style={overlayStyle} onClick={handleOverlayClick}>
            <div style={modalStyle}>
                <div style={headerStyle}>
                    <h3 style={titleStyle}>Select Wallet</h3>
                    <button style={closeButtonStyle} onClick={onClose}>
                        ×
                    </button>
                </div>

                <p style={subtitleStyle}>
                    Connect a {networkName} wallet
                </p>

                {wallets.length > 0 ? (
                    <div style={walletListStyle}>
                        {wallets.map((wallet) => (
                            <WalletItem
                                key={wallet.id}
                                wallet={wallet}
                                isHovered={hoveredWallet === wallet.id}
                                onSelect={() => onSelect(wallet)}
                                onHover={(hovered) => setHoveredWallet(hovered ? wallet.id : null)}
                            />
                        ))}
                    </div>
                ) : (
                    <div style={emptyStateStyle}>
                        <p style={emptyTitleStyle}>No wallets found</p>
                        <p style={emptyDescStyle}>
                            Please install a {networkName} wallet extension.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    // Use Portal to render outside parent container
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
}
