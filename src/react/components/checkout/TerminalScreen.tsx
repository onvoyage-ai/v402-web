'use client';

import React from 'react';
import {WalletConnect} from '../wallet/WalletConnect';
import {TerminalScreenProps} from "./types";

/**
 * TerminalScreen 组件
 * 终端屏幕显示区域，处理不同状态的渲染
 */
export const TerminalScreen: React.FC<TerminalScreenProps> = ({
    title,
    tooltipText,
    hasInvalidCheckoutId,
    fetchingPaymentInfo,
    address,
    paymentDetails,
    screenText,
    supportedNetworks,
}) => {
    return (
        <div
            className="rounded-xl p-3 mb-3"
            style={{
                backgroundColor: '#0a1a0a',
                boxShadow: 'inset 0 3px 16px rgba(0,0,0,0.5)',
                border: '3px solid rgba(0,0,0,0.3)',
            }}
        >
            {/* Screen Header with Title */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div className="w-2.5 h-2.5 rounded border border-green-700 flex-shrink-0"/>
                    {title ? (
                        <span
                            className="text-xs font-mono"
                            style={{color: '#22c55e80'}}
                            title={title}
                        >
                            {title.length > 26 ? `${title.slice(0, 13)}...${title.slice(-13)}` : title}
                        </span>
                    ) : (
                        <span className="text-xs font-mono" style={{color: '#22c55e80'}}>
                            CHECKOUT
                        </span>
                    )}
                </div>
                <div 
                    className="flex gap-0.5 flex-shrink-0 cursor-help" 
                    title={tooltipText}
                >
                    <div className="w-1 h-1.5 rounded-sm"
                         style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                    <div className="w-1 h-1.5 rounded-sm"
                         style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                    <div className="w-1 h-1.5 rounded-sm" style={{backgroundColor: '#22c55e80'}}/>
                </div>
            </div>

            {/* Screen Content */}
            <div className="min-h-[120px]">
                {hasInvalidCheckoutId ? (
                    <InvalidIdContent />
                ) : fetchingPaymentInfo ? (
                    <LoadingContent />
                ) : !address ? (
                    <ConnectWalletContent supportedNetworks={supportedNetworks} />
                ) : (
                    <PaymentInfoContent 
                        screenText={screenText} 
                        paymentDetails={paymentDetails} 
                        address={address} 
                    />
                )}
            </div>
        </div>
    );
};

// ============ 子组件 ============

const InvalidIdContent: React.FC = () => (
    <div className="text-center py-3">
        <div className="text-red-500 text-xl mb-1">✗</div>
        <div className="text-red-500 font-mono text-sm mb-1">INVALID ID</div>
        <div className="text-red-400 font-mono text-xs">Check your checkout ID</div>
    </div>
);

const LoadingContent: React.FC = () => (
    <div className="text-center py-4">
        <div
            className="inline-block w-5 h-5 border-2 rounded-full mb-2"
            style={{
                borderColor: '#22c55e40',
                borderTopColor: '#22c55e',
                animation: 'spin 1s linear infinite',
            }}
        />
        <div className="font-mono text-sm" style={{color: '#22c55e'}}>LOADING...</div>
    </div>
);

interface ConnectWalletContentProps {
    supportedNetworks: any[];
}

const ConnectWalletContent: React.FC<ConnectWalletContentProps> = ({supportedNetworks}) => (
    <div>
        <div
            className="font-mono text-base mb-3 tracking-wider"
            style={{color: '#f97316', textShadow: '0 0 10px #f9731640'}}
        >
            CONNECT WALLET...
        </div>
        <WalletConnect supportedNetworks={supportedNetworks} showSwitchWallet={false}/>
    </div>
);

interface PaymentInfoContentProps {
    screenText: string;
    paymentDetails: { amount: string; currency: string; network: string } | null;
    address: string;
}

const PaymentInfoContent: React.FC<PaymentInfoContentProps> = ({
    screenText,
    paymentDetails,
    address,
}) => (
    <div>
        <div
            className="font-mono text-base mb-3 tracking-wider"
            style={{color: '#f97316', textShadow: '0 0 10px #f9731640'}}
        >
            {screenText}
        </div>
        {paymentDetails && (
            <div className="text-xs font-mono">
                {/* 第一行: AMOUNT 和 CURRENCY */}
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <div>
                        <div style={{color: '#22c55e60'}}>AMOUNT</div>
                        <div style={{color: '#22c55e'}}>${paymentDetails.amount}</div>
                    </div>
                    <div>
                        <div style={{color: '#22c55e60'}}>CURRENCY</div>
                        <div style={{color: '#22c55e'}}>{paymentDetails.currency}</div>
                    </div>
                </div>
                {/* 第二行: WALLET 完整显示 */}
                <div>
                    <div style={{color: '#22c55e60'}}>WALLET</div>
                    <div style={{color: '#22c55e', wordBreak: 'break-all'}}>{address}</div>
                </div>
            </div>
        )}
    </div>
);

