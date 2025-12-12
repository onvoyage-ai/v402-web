'use client';

import React, {useEffect, useState} from 'react';
import {usePaymentInfo} from "../../hooks/usePaymentInfo";
import {usePageNetwork} from "../../hooks/usePageNetwork";
import {usePayment} from "../../hooks/usePayment";
import {PROD_BACK_URL} from "../../../types/common";
import {formatAddress, makePayment} from "../../../utils";
import {WalletConnect} from '../wallet/WalletConnect';
import {getNetworkIcon} from "../../utils/CryptoIcons";
import {AnimationStyles} from "../../styles/animations";
import {Receipt} from "./Receipt";
import {PaymentDetails, V402CheckoutV2Props} from "./types";

// Re-export types for external use
export type {V402CheckoutV2Props} from "./types";

// 生成随机8位ID
const generateRandomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length: 8}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * V402 Checkout V2 组件
 * 全新设计的支付终端风格界面
 */
export default function V402CheckoutV2({
                                           checkoutId,
                                           title = 'V402Pay Checkout',
                                           primaryColor = '#84cc16',
                                           brandName = 'V402PAY',
                                           receiptTitle = 'V402 PAYMENT',
                                           isModal = false,
                                           onPaymentComplete,
                                           additionalParams = {},
                                           expectedNetwork,
                                       }: V402CheckoutV2Props) {
    const endpoint = PROD_BACK_URL;

    // Hooks
    const {
        supportedNetworks,
        isLoading: fetchingPaymentInfo,
        paymentInfo
    } = usePaymentInfo(checkoutId, endpoint, additionalParams);

    const targetNetwork = expectedNetwork || supportedNetworks[0];

    const {address, networkType, disconnect, ensureNetwork} = usePageNetwork(
        targetNetwork,
        {autoSwitch: !!targetNetwork, switchOnMount: true}
    );

    const {isProcessing, setIsProcessing, result, setResult, error, setError} = usePayment();

    // State
    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);

    // 临时发票ID - 每次支付生成新的
    const [tempReceiptId, setTempReceiptId] = useState(() => generateRandomId());

    // ============ Handlers ============

    const handleDisconnect = () => {
        disconnect();
        setResult(null);
        setError(null);
        setShowReceipt(false);
    };

    const handlePayment = async () => {
        if (!networkType) return;

        // 每次支付生成新的临时发票ID
        setTempReceiptId(generateRandomId());
        setResult(null);
        setError(null);
        setIsProcessing(true);
        setShowReceipt(true);

        try {
            // Pass address for validation to ensure correct wallet is used
            const response = await makePayment(networkType, checkoutId, endpoint, additionalParams, address || undefined);
            const data = await response.json();
            setResult(data);

            if (onPaymentComplete) {
                onPaymentComplete(data);
            }
        } catch (err: any) {
            setError(err.message || 'Payment failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseReceipt = () => {
        setShowReceipt(false);
        setResult(null);
        setError(null);
    };

    // ============ Effects ============

    // Extract payment details from paymentInfo
    useEffect(() => {
        if (paymentInfo && paymentInfo.length > 0) {
            const firstPayment = paymentInfo[0];
            const rawAmount = firstPayment.maxAmountRequired?.toString() || '0';
            const decimals = 6;
            const humanReadableAmount = (Number(rawAmount) / Math.pow(10, decimals)).toFixed(2);
            const network = firstPayment.network || 'Unknown';
            const currency = 'USDC';

            setPaymentDetails({amount: humanReadableAmount, currency, network});
        }
    }, [paymentInfo]);

    // Network switch
    useEffect(() => {
        if (targetNetwork && !fetchingPaymentInfo && ensureNetwork) {
            ensureNetwork(targetNetwork).catch(err => {
                console.error('Failed to ensure network:', err);
            });
        }
    }, [targetNetwork, fetchingPaymentInfo]);

    // Show receipt when processing or has result
    useEffect(() => {
        if (isProcessing || result || error) {
            setShowReceipt(true);
        }
    }, [isProcessing, result, error]);

    // ============ Computed Values ============

    const hasInvalidCheckoutId = !fetchingPaymentInfo && (!paymentInfo || paymentInfo.length === 0);
    const NetworkIcon = paymentDetails ? getNetworkIcon(paymentDetails.network) : null;
    const screenText = paymentDetails ? `PAY $${paymentDetails.amount} ${paymentDetails.currency}` : 'AWAITING...';

    const getStatusText = () => {
        if (hasInvalidCheckoutId) return 'ERROR';
        if (fetchingPaymentInfo) return 'LOADING';
        if (!address) return 'CONNECT';
        if (isProcessing) return 'PAYING';
        return 'READY';
    };

    // ============ Render ============

    return (
        <div className={isModal ? "bg-transparent" : "min-h-screen bg-gray-100 flex items-center justify-center p-4"}>
            <div
                className="flex flex-col items-center"
                style={{width: isModal ? '100%' : '380px', maxWidth: '100%'}}
            >
                {/* Receipt */}
                <Receipt
                    isLoading={isProcessing}
                    isVisible={showReceipt}
                    result={result}
                    error={error}
                    paymentDetails={paymentDetails}
                    address={address}
                    onClose={handleCloseReceipt}
                    primaryColor={primaryColor}
                    receiptTitle={receiptTitle}
                    tempReceiptId={tempReceiptId}
                />

                {/* Terminal Body */}
                <div
                    className="relative rounded-2xl p-3 shadow-2xl w-full"
                    style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 16px 48px -8px ${primaryColor}66, 0 8px 24px -4px rgba(0,0,0,0.3)`,
                    }}
                >
                    {/* Paper Slot */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-2.5 rounded-b-lg"
                        style={{backgroundColor: 'rgba(0,0,0,0.4)'}}
                    />

                    {/* Header - 简化版 */}
                    <div className="flex justify-between items-center mb-2 mt-1 px-1">
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                    backgroundColor: address ? '#22c55e' : '#ef4444',
                                    animation: 'pulse 2s ease-in-out infinite',
                                }}
                            />
                            <span className="text-xs font-mono font-bold tracking-wider" style={{color: 'rgba(0,0,0,0.7)'}}>
                                {getStatusText()}
                            </span>
                        </div>
                        <span className="text-xs font-bold" style={{color: 'rgba(0,0,0,0.6)'}}>
                            {address ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>

                    {/* Screen */}
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
                                        className="text-xs font-mono truncate" 
                                        style={{color: '#22c55e80'}}
                                        title={title}
                                    >
                                        {title}
                                    </span>
                                ) : (
                                    <span className="text-xs font-mono" style={{color: '#22c55e80'}}>
                                        CHECKOUT
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-0.5 flex-shrink-0">
                                <div className="w-1 h-1.5 rounded-sm" style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                                <div className="w-1 h-1.5 rounded-sm" style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                                <div className="w-1 h-1.5 rounded-sm" style={{backgroundColor: '#22c55e80'}}/>
                            </div>
                        </div>

                        {/* Screen Content */}
                        <div className="min-h-[120px]">
                            {hasInvalidCheckoutId ? (
                                <div className="text-center py-3">
                                    <div className="text-red-500 text-xl mb-1">✗</div>
                                    <div className="text-red-500 font-mono text-sm mb-1">INVALID ID</div>
                                    <div className="text-red-400 font-mono text-xs">Check your checkout ID</div>
                                </div>
                            ) : fetchingPaymentInfo ? (
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
                            ) : !address ? (
                                <div>
                                    <div
                                        className="font-mono text-base mb-3 tracking-wider"
                                        style={{color: '#f97316', textShadow: '0 0 10px #f9731640'}}
                                    >
                                        CONNECT WALLET...
                                    </div>
                                    <WalletConnect supportedNetworks={supportedNetworks} showSwitchWallet={false}/>
                                </div>
                            ) : (
                                <div>
                                    <div
                                        className="font-mono text-base mb-3 tracking-wider"
                                        style={{color: '#f97316', textShadow: '0 0 10px #f9731640'}}
                                    >
                                        {screenText}
                                    </div>
                                    {paymentDetails && (
                                        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                                            <div>
                                                <div style={{color: '#22c55e60'}}>NETWORK</div>
                                                <div className="flex items-center gap-1" style={{color: '#22c55e'}}>
                                                    {NetworkIcon && <NetworkIcon width={12} height={12}/>}
                                                    {paymentDetails.network}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{color: '#22c55e60'}}>CURRENCY</div>
                                                <div style={{color: '#22c55e'}}>{paymentDetails.currency}</div>
                                            </div>
                                            <div>
                                                <div style={{color: '#22c55e60'}}>AMOUNT</div>
                                                <div style={{color: '#22c55e'}}>${paymentDetails.amount}</div>
                                            </div>
                                            <div>
                                                <div style={{color: '#22c55e60'}}>WALLET</div>
                                                <div style={{color: '#22c55e'}}>{formatAddress(address)}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
                    <TerminalButtons
                        address={address}
                        showReceipt={showReceipt}
                        isProcessing={isProcessing}
                        paymentDetails={paymentDetails}
                        hasInvalidCheckoutId={hasInvalidCheckoutId}
                        onDisconnect={handleDisconnect}
                        onClearReceipt={handleCloseReceipt}
                        onPayment={handlePayment}
                    />

                    {/* Brand - 可配置 */}
                    {brandName && (
                        <div className="text-center mt-3 mb-0.5">
                            <div
                                className="inline-block px-3 py-0.5 rounded-full text-xs font-bold tracking-[0.15em]"
                                style={{backgroundColor: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)'}}
                            >
                                {brandName}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnimationStyles/>
        </div>
    );
}

// ============ Sub Components ============

interface TerminalButtonsProps {
    address: string | null;
    showReceipt: boolean;
    isProcessing: boolean;
    paymentDetails: PaymentDetails | null;
    hasInvalidCheckoutId: boolean;
    onDisconnect: () => void;
    onClearReceipt: () => void;
    onPayment: () => void;
}

const TerminalButtons: React.FC<TerminalButtonsProps> = ({
                                                             address,
                                                             showReceipt,
                                                             isProcessing,
                                                             paymentDetails,
                                                             hasInvalidCheckoutId,
                                                             onDisconnect,
                                                             onClearReceipt,
                                                             onPayment,
                                                         }) => {
    const isPayDisabled = isProcessing || !paymentDetails || !address || hasInvalidCheckoutId;

    return (
        <div className="flex items-center justify-between px-1">
            {/* Left Buttons */}
            <div className="flex gap-2">
                <CircleButton
                    onClick={() => address && onDisconnect()}
                    disabled={!address}
                    title="Disconnect"
                    size="small"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </CircleButton>
                <CircleButton
                    onClick={onClearReceipt}
                    disabled={!showReceipt || isProcessing}
                    title="Clear"
                    size="small"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                    </svg>
                </CircleButton>
            </div>

            {/* Decorative Lines */}
            <div className="flex flex-col gap-0.5 opacity-40">
                <div className="w-6 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
                <div className="w-6 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
                <div className="w-6 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
            </div>

            {/* Pay Button */}
            <button
                onClick={onPayment}
                disabled={isPayDisabled}
                className="px-5 py-2.5 rounded-xl font-bold text-white flex items-center gap-2 transition-all active:scale-95"
                style={{
                    backgroundColor: isPayDisabled ? '#9ca3af' : '#ea580c',
                    boxShadow: isPayDisabled ? 'none' : '0 4px 12px rgba(234,88,12,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)',
                    cursor: isPayDisabled ? 'not-allowed' : 'pointer',
                }}
            >
                {isProcessing ? (
                    <>
                        <div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            style={{animation: 'spin 0.8s linear infinite'}}
                        />
                        <span className="font-mono tracking-wider text-sm">PAYING...</span>
                    </>
                ) : (
                    <>
                        <span className="font-mono tracking-wider text-sm">PAY</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                        </svg>
                    </>
                )}
            </button>
        </div>
    );
};

interface CircleButtonProps {
    onClick: () => void;
    disabled: boolean;
    title: string;
    size?: 'small' | 'normal';
    children: React.ReactNode;
}

const CircleButton: React.FC<CircleButtonProps> = ({onClick, disabled, title, size = 'normal', children}) => {
    const sizeClass = size === 'small' ? 'w-10 h-10' : 'w-12 h-12';
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${sizeClass} rounded-full flex items-center justify-center transition-transform active:scale-95`}
            style={{
                backgroundColor: '#374151',
                boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
                opacity: disabled ? 0.5 : 1,
            }}
            title={title}
        >
            {children}
        </button>
    );
};
