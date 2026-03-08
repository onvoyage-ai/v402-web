'use client';

import React, {useEffect, useState} from 'react';
import {usePaymentInfo} from "../../hooks/usePaymentInfo";
import {usePageNetwork} from "../../hooks/usePageNetwork";
import {usePayment} from "../../hooks/usePayment";
import {PROD_BACK_URL} from "../../../types/common";
import {makePayment} from "../../../utils";
import {getNetworkIcon} from "../../utils/CryptoIcons";
import {AnimationStyles} from "../../styles/animations";
import {Receipt} from "./Receipt";
import {TerminalScreen} from "./TerminalScreen";
import {TerminalButtons} from "./TerminalButtons";
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
                                           headerInfo = {},
                                           primaryColor = '#84cc16',
                                           isModal = false,
                                           onPaymentComplete,
                                           additionalParams = {},
                                           expectedNetwork,
                                       }: V402CheckoutV2Props) {
    // 从 headerInfo 解构，设置默认值
    const {
        title = 'V402Pay Checkout',
        brandName = 'V402PAY',
        receiptTitle = 'V402 PAYMENT',
        tooltipText = 'V402Pay - Accept Crypto Payments Easier',
    } = headerInfo;
    const endpoint = "http://localhost:3000/api/pay";

    // Hooks
    const {
        supportedNetworks,
        isLoading: fetchingPaymentInfo,
        paymentInfo
    } = usePaymentInfo(checkoutId, endpoint, additionalParams);

    const targetNetwork = expectedNetwork || supportedNetworks[0];
    // 获取的targetNetwork打印一下
    console.log("Target Network:", targetNetwork);

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
                        boxShadow: `0 16px 48px -8px ${primaryColor}66, 0 8px 24px -4px rgba(0,0,0,0.3);padding-bottom: 0px`,
                    }}
                >
                    {/* Paper Slot */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-2.5 rounded-b-lg"
                        style={{backgroundColor: 'rgba(0,0,0,0.4)'}}
                    />

                    {/* Header */}
                    <div className="flex justify-between items-center mb-2 mt-1 px-1">
                        <div className="flex items-center gap-1.5">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                    backgroundColor: address ? '#22c55e' : '#ef4444',
                                    animation: 'pulse 2s ease-in-out infinite',
                                }}
                            />
                            <span className="text-xs font-mono font-bold tracking-wider"
                                  style={{color: 'rgba(0,0,0,0.7)'}}>
                                {getStatusText()}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {paymentDetails && NetworkIcon && (
                                <div className="flex items-center gap-1">
                                    <NetworkIcon width={12} height={12} style={{color: 'rgba(0,0,0,0.7)'}}/>
                                    <span className="text-xs font-mono font-bold" style={{color: 'rgba(0,0,0,0.7)'}}>
                                        {paymentDetails.network}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Screen */}
                    <TerminalScreen
                        title={title}
                        tooltipText={tooltipText}
                        hasInvalidCheckoutId={hasInvalidCheckoutId}
                        fetchingPaymentInfo={fetchingPaymentInfo}
                        address={address}
                        paymentDetails={paymentDetails}
                        screenText={screenText}
                        supportedNetworks={supportedNetworks}
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
                    {brandName && (
                        <div className="text-center mt-0 mb-0">
                            <div
                                className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-[0.2em]"
                                style={{
                                    backgroundColor: '#1a1a1a',
                                    color: '#9acd32',
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(0,0,0,0.5)',
                                    textShadow: '0 0 4px #9acd3280',
                                }}
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
