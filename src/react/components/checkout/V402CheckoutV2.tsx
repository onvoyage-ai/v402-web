'use client';

import React, {useEffect, useState} from 'react';
import {usePaymentInfo} from "../../hooks/usePaymentInfo";
import {usePageNetwork} from "../../hooks/usePageNetwork";
import {usePayment} from "../../hooks/usePayment";
import {useToast} from "../../hooks/useToast";
import {PROD_BACK_URL} from "../../../types/common";
import {formatAddress, makePayment} from "../../../utils";
import {WalletConnect} from '../wallet/WalletConnect';
import {getNetworkIcon} from "../../utils/CryptoIcons";
import {AnimationStyles} from "../../styles/animations";
import {Receipt} from "./Receipt";
import {PaymentDetails, V402CheckoutV2Props} from "./types";

// Re-export types for external use
export type {V402CheckoutV2Props} from "./types";

/**
 * V402 Checkout V2 组件
 * 全新设计的支付终端风格界面
 */
export default function V402CheckoutV2({
                                           checkoutId,
                                           headerInfo = {},
                                           isModal = false,
                                           onPaymentComplete,
                                           additionalParams = {},
                                           expectedNetwork,
                                           primaryColor = '#84cc16',
                                       }: V402CheckoutV2Props) {
    const {title = 'V402PAY'} = headerInfo;
    const endpoint = PROD_BACK_URL;
    const {showToast, ToastContainer} = useToast();

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
    const [screenText, setScreenText] = useState('AWAITING PAYMENT...');

    // ============ Handlers ============

    const handleDisconnect = () => {
        disconnect();
        setResult(null);
        setError(null);
        setShowReceipt(false);
        showToast('Wallet disconnected', 'info');
    };

    const handlePayment = async () => {
        if (!networkType) {
            showToast('Please connect your wallet first', 'error');
            return;
        }

        setResult(null);
        setError(null);
        setIsProcessing(true);
        setShowReceipt(true);

        try {
            const response = await makePayment(networkType, checkoutId, endpoint, additionalParams);
            const data = await response.json();
            setResult(data);
            showToast('Payment successful!', 'success');

            if (onPaymentComplete) {
                onPaymentComplete(data);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Payment failed';
            setError(errorMessage);
            showToast(errorMessage, 'error');
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
            setScreenText(`PAY $${humanReadableAmount} ${currency}`);
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

    const getStatusText = () => {
        if (hasInvalidCheckoutId) return 'ERROR';
        if (fetchingPaymentInfo) return 'LOADING';
        if (!address) return 'CONNECT';
        if (isProcessing) return 'PAYING';
        return 'READY';
    };

    const getConnectionStatus = () => {
        return address ? 'ONLINE' : 'OFFLINE';
    };

    // ============ Render ============

    return (
        <div className={isModal ? "bg-transparent" : "min-h-screen bg-gray-100 flex items-center justify-center p-4"}>
            <ToastContainer/>

            <div
                className="flex flex-col items-center"
                style={{width: isModal ? '100%' : '400px', maxWidth: '100%'}}
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
                    checkoutId={checkoutId}
                />

                {/* Terminal Body */}
                <div
                    className="relative rounded-3xl p-4 shadow-2xl w-full"
                    style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 20px 60px -10px ${primaryColor}66, 0 10px 30px -5px rgba(0,0,0,0.3)`,
                    }}
                >
                    {/* Paper Slot */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-3 rounded-b-xl"
                        style={{backgroundColor: 'rgba(0,0,0,0.4)'}}
                    />

                    {/* Header */}
                    <TerminalHeader
                        address={address}
                        statusText={getStatusText()}
                        network={paymentDetails?.network}
                        connectionStatus={getConnectionStatus()}
                    />

                    {/* Screen */}
                    <TerminalScreen
                        hasInvalidCheckoutId={hasInvalidCheckoutId}
                        fetchingPaymentInfo={fetchingPaymentInfo}
                        address={address}
                        screenText={screenText}
                        paymentDetails={paymentDetails}
                        supportedNetworks={supportedNetworks}
                        NetworkIcon={NetworkIcon}
                    />

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

                    {/* Brand */}
                    <div className="text-center mt-4 mb-1">
                        <div
                            className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-[0.2em]"
                            style={{backgroundColor: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)'}}
                        >
                            {title}
                        </div>
                    </div>
                </div>
            </div>

            <AnimationStyles/>
        </div>
    );
}

// ============ Sub Components ============

interface TerminalHeaderProps {
    address: string | null;
    statusText: string;
    network?: string;
    connectionStatus: string;
}

const TerminalHeader: React.FC<TerminalHeaderProps> = ({address, statusText, network, connectionStatus}) => (
    <div className="flex justify-between items-center mb-3 mt-2 px-2">
        <div className="flex items-center gap-2">
            <div
                className="w-2 h-2 rounded-full"
                style={{
                    backgroundColor: address ? '#22c55e' : '#ef4444',
                    animation: 'pulse 2s ease-in-out infinite',
                }}
            />
            <span className="text-xs font-mono font-bold tracking-wider" style={{color: 'rgba(0,0,0,0.7)'}}>
                {statusText}
            </span>
        </div>
        <span className="text-xs font-mono font-semibold" style={{color: 'rgba(0,0,0,0.5)'}}>
            {network || 'NETWORK'}
        </span>
        <div className="flex items-center gap-1">
            <span className="text-xs font-mono" style={{color: 'rgba(0,0,0,0.6)'}}>●</span>
            <span className="text-xs font-bold" style={{color: 'rgba(0,0,0,0.7)'}}>{connectionStatus}</span>
        </div>
    </div>
);

interface TerminalScreenProps {
    hasInvalidCheckoutId: boolean;
    fetchingPaymentInfo: boolean;
    address: string | null;
    screenText: string;
    paymentDetails: PaymentDetails | null;
    supportedNetworks: any[];
    NetworkIcon: React.FC<{ width?: number; height?: number }> | null;
}

const TerminalScreen: React.FC<TerminalScreenProps> = ({
                                                           hasInvalidCheckoutId,
                                                           fetchingPaymentInfo,
                                                           address,
                                                           screenText,
                                                           paymentDetails,
                                                           supportedNetworks,
                                                           NetworkIcon,
                                                       }) => (
    <div
        className="rounded-xl p-4 mb-4"
        style={{
            backgroundColor: '#0a1a0a',
            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
            border: '3px solid rgba(0,0,0,0.3)',
        }}
    >
        {/* Screen Header */}
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border border-green-700"/>
                <span className="text-xs font-mono" style={{color: '#22c55e80'}}>CHECKOUT</span>
            </div>
            <div className="flex gap-1">
                <div className="w-1 h-2 rounded-sm" style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                <div className="w-1 h-2 rounded-sm" style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                <div className="w-1 h-2 rounded-sm" style={{backgroundColor: '#22c55e80'}}/>
            </div>
        </div>

        {/* Screen Content */}
        <div className="min-h-[140px]">
            {hasInvalidCheckoutId ? (
                <div className="text-center py-4">
                    <div className="text-red-500 text-2xl mb-2">✗</div>
                    <div className="text-red-500 font-mono text-sm mb-2">INVALID CHECKOUT ID</div>
                    <div className="text-red-400 font-mono text-xs">Please check your checkout ID</div>
                </div>
            ) : fetchingPaymentInfo ? (
                <div className="text-center py-6">
                    <div
                        className="inline-block w-6 h-6 border-2 rounded-full mb-3"
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
                        className="font-mono text-lg mb-4 tracking-wider"
                        style={{color: '#f97316', textShadow: '0 0 10px #f9731640'}}
                    >
                        CONNECT WALLET...
                    </div>
                    <WalletConnect supportedNetworks={supportedNetworks} showSwitchWallet={false}/>
                </div>
            ) : (
                <div>
                    <div
                        className="font-mono text-lg mb-4 tracking-wider"
                        style={{color: '#f97316', textShadow: '0 0 10px #f9731640'}}
                    >
                        {screenText}
                    </div>
                    {paymentDetails && (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                            <div>
                                <div style={{color: '#22c55e60'}}>NETWORK</div>
                                <div className="flex items-center gap-1" style={{color: '#22c55e'}}>
                                    {NetworkIcon && <NetworkIcon width={14} height={14}/>}
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
);

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
        <div className="flex items-center justify-between px-2">
            {/* Left Buttons */}
            <div className="flex gap-3">
                <CircleButton
                    onClick={() => address && onDisconnect()}
                    disabled={!address}
                    title="Disconnect Wallet"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </CircleButton>
                <CircleButton
                    onClick={onClearReceipt}
                    disabled={!showReceipt || isProcessing}
                    title="Clear Receipt"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                    </svg>
                </CircleButton>
            </div>

            {/* Decorative Lines */}
            <div className="flex flex-col gap-1 opacity-40">
                <div className="w-8 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
                <div className="w-8 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
                <div className="w-8 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
            </div>

            {/* Pay Button */}
            <button
                onClick={onPayment}
                disabled={isPayDisabled}
                className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all active:scale-95"
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
                        <span className="font-mono tracking-wider">PAYING...</span>
                    </>
                ) : (
                    <>
                        <span className="font-mono tracking-wider">PAY</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2">
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
    children: React.ReactNode;
}

const CircleButton: React.FC<CircleButtonProps> = ({onClick, disabled, title, children}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
        style={{
            backgroundColor: '#374151',
            boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.2)',
            opacity: disabled ? 0.5 : 1,
        }}
        title={title}
    >
        {children}
    </button>
);

