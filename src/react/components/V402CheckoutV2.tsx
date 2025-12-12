'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {usePaymentInfo} from "../hooks/usePaymentInfo";
import {usePageNetwork} from "../hooks/usePageNetwork";
import {usePayment} from "../hooks/usePayment";
import {PROD_BACK_URL} from "../../types/common";
import {NetworkType} from "../../types";
import {formatAddress, makePayment} from "../../utils";
import {WalletConnect} from './WalletConnect';
import {getNetworkIcon} from "../utils/CryptoIcons";

// ============ Types ============
interface HeaderInfo {
    title?: string;
    subtitle?: string;
    tooltipText?: string;
}

export interface V402CheckoutV2Props {
    checkoutId: string;
    headerInfo?: HeaderInfo;
    isModal?: boolean;
    onPaymentComplete?: (response: any) => void;
    additionalParams?: Record<string, any>;
    expectedNetwork?: NetworkType;
    /** 主题颜色，默认为绿色 #84cc16 */
    primaryColor?: string;
}

// ============ Toast 通知组件 ============
interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({message, type, onClose}) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

    return createPortal(
        <div
            className="fixed top-4 right-4 z-[99999] animate-slide-in-right"
            style={{
                animation: 'slideInRight 0.3s ease-out',
            }}
        >
            <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white font-mono text-sm"
                style={{backgroundColor: bgColor, minWidth: '280px'}}
            >
                <span className="text-lg">{icon}</span>
                <span className="flex-1">{message}</span>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                >
                    ×
                </button>
            </div>
        </div>,
        document.body
    );
};

// Toast 管理 Hook
const useToast = () => {
    const [toasts, setToasts] = useState<Array<{
        id: number;
        message: string;
        type: 'success' | 'error' | 'info'
    }>>([]);
    const toastIdRef = useRef(0);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, {id, message, type}]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const ToastContainer = () => (
        <>
            {toasts.map((toast, index) => (
                <div key={toast.id} style={{top: `${16 + index * 60}px`}} className="fixed right-4 z-[99999]">
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                </div>
            ))}
        </>
    );

    return {showToast, ToastContainer};
};

// ============ Receipt 发票组件 ============
interface ReceiptProps {
    isLoading: boolean;
    isVisible: boolean;
    result: any;
    error: string | null;
    paymentDetails: {
        amount: string;
        currency: string;
        network: string;
    } | null;
    address: string | null;
    onClose: () => void;
    primaryColor: string;
    checkoutId: string;
}

const Receipt: React.FC<ReceiptProps> = ({
                                             isLoading,
                                             isVisible,
                                             result,
                                             error,
                                             paymentDetails,
                                             address,
                                             onClose,
                                             primaryColor,
                                             checkoutId,
                                         }) => {
    const [animationState, setAnimationState] = useState<'hidden' | 'printing' | 'visible' | 'bounce'>('hidden');

    useEffect(() => {
        if (isLoading) {
            setAnimationState('printing');
        } else if (isVisible && (result || error)) {
            setAnimationState('visible');
            // 弹跳效果
            const timer = setTimeout(() => setAnimationState('bounce'), 50);
            return () => clearTimeout(timer);
        } else if (!isVisible) {
            setAnimationState('hidden');
        }
    }, [isLoading, isVisible, result, error]);

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const receiptId = result?.transactionHash?.slice(-8)?.toUpperCase() || checkoutId?.slice(-8)?.toUpperCase() || 'N/A';

    // 根据状态获取动画样式
    const getAnimationStyles = (): React.CSSProperties => {
        const baseTransition = animationState === 'bounce'
            ? 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

        switch (animationState) {
            case 'hidden':
                return {
                    opacity: 0,
                    transform: 'translateY(50px)',
                    maxHeight: 0,
                    marginBottom: 0,
                    overflow: 'hidden',
                    transition: baseTransition,
                };
            case 'printing':
                return {
                    opacity: 1,
                    transform: 'translateY(0)',
                    maxHeight: '80px', // 只露出一小部分
                    marginBottom: '8px',
                    overflow: 'hidden',
                    animation: 'receiptShake 0.12s ease-in-out infinite',
                    transition: baseTransition,
                };
            case 'visible':
                return {
                    opacity: 1,
                    transform: 'translateY(0)',
                    maxHeight: '500px', // 足够大的值
                    marginBottom: '8px',
                    overflow: 'visible',
                    transition: baseTransition,
                };
            case 'bounce':
                return {
                    opacity: 1,
                    transform: 'translateY(-8px)',
                    maxHeight: '500px',
                    marginBottom: '8px',
                    overflow: 'visible',
                    transition: baseTransition,
                };
            default:
                return {};
        }
    };

    // 处理弹跳动画回弹
    useEffect(() => {
        if (animationState === 'bounce') {
            const timer = setTimeout(() => setAnimationState('visible'), 150);
            return () => clearTimeout(timer);
        }
    }, [animationState]);

    if (animationState === 'hidden' && !isLoading) return null;

    return (
        <div
            className="w-full flex justify-center"
            style={getAnimationStyles()}
        >
            {/* 发票主体 */}
            <div
                className="relative bg-white rounded-sm shadow-2xl"
                style={{
                    width: '75%',
                    maxWidth: '280px',
                    backgroundImage: `
                        repeating-linear-gradient(
                            0deg,
                            transparent,
                            transparent 1px,
                            rgba(0,0,0,0.02) 1px,
                            rgba(0,0,0,0.02) 2px
                        )
                    `,
                }}
            >
                {/* 撕边效果 */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-3"
                    style={{
                        background: `linear-gradient(135deg, transparent 33.33%, white 33.33%, white 66.67%, transparent 66.67%),
                                     linear-gradient(-135deg, transparent 33.33%, white 33.33%, white 66.67%, transparent 66.67%)`,
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0',
                        transform: 'translateY(100%)',
                    }}
                />

                {/* 关闭按钮 - 只在完成后显示 */}
                {!isLoading && (result || error) && (
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-lg"
                    >
                        ×
                    </button>
                )}

                {/* 发票内容 */}
                <div className="p-4 font-mono text-sm">
                    {/* 标题 */}
                    <div className="text-center mb-3">
                        <div className="text-base font-bold tracking-wider text-gray-800">
                            V402 PAYMENT
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>ID: {receiptId}</span>
                            <span>{dateStr} {timeStr}</span>
                        </div>
                    </div>

                    {/* 虚线分隔 */}
                    <div className="border-t border-dashed border-gray-300 my-2"/>

                    {/* 内容区域 - 可滚动 */}
                    <div
                        className="max-h-40 overflow-y-auto pr-1"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#d1d5db transparent',
                        }}
                    >
                        {isLoading ? (
                            <div className="text-center py-6">
                                {/* Loading 动画 */}
                                <div
                                    className="inline-block w-8 h-8 border-2 border-gray-200 rounded-full mb-3"
                                    style={{
                                        borderTopColor: primaryColor,
                                        animation: 'spin 0.8s linear infinite',
                                    }}
                                />
                                <div className="text-gray-700 font-semibold text-sm">Processing Payment...</div>
                                <div className="text-gray-400 text-xs mt-1">Please wait</div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-4">
                                <div className="text-red-500 text-2xl mb-2">✗</div>
                                <div className="text-red-600 font-semibold mb-2">PAYMENT FAILED</div>
                                <div className="text-red-500 text-xs break-words px-2">{error}</div>
                            </div>
                        ) : result ? (
                            <div>
                                <div className="text-center mb-3">
                                    <div className="text-2xl mb-1" style={{color: primaryColor}}>✓</div>
                                    <div className="font-semibold" style={{color: primaryColor}}>
                                        PAYMENT SUCCESS
                                    </div>
                                </div>

                                {/* 支付详情 */}
                                <div className="space-y-1.5 text-xs">
                                    {paymentDetails && (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Amount:</span>
                                                <span
                                                    className="font-semibold">${paymentDetails.amount} {paymentDetails.currency}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Network:</span>
                                                <span className="font-semibold">{paymentDetails.network}</span>
                                            </div>
                                        </>
                                    )}
                                    {address && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">From:</span>
                                            <span className="font-semibold">{formatAddress(address)}</span>
                                        </div>
                                    )}
                                    {result.transactionHash && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">TX Hash:</span>
                                            <span
                                                className="font-semibold">{formatAddress(result.transactionHash)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* 虚线分隔 */}
                                <div className="border-t border-dashed border-gray-300 my-2"/>

                                {/* Response Data */}
                                <div className="text-xs">
                                    <div className="text-gray-500 mb-1">Response Data:</div>
                                    <pre
                                        className="bg-gray-50 p-2 rounded text-xs overflow-auto whitespace-pre-wrap break-words"
                                        style={{maxHeight: '60px'}}
                                    >
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* 虚线分隔 */}
                    <div className="border-t border-dashed border-gray-300 my-2"/>

                    {/* 底部条形码效果 */}
                    <div className="flex items-center justify-center gap-0.5 h-5 opacity-60">
                        {Array.from({length: 25}).map((_, i) => (
                            <div
                                key={i}
                                className="bg-gray-800"
                                style={{
                                    width: Math.random() > 0.5 ? '2px' : '1px',
                                    height: `${10 + Math.random() * 6}px`,
                                }}
                            />
                        ))}
                    </div>

                    <div className="text-center text-xs text-gray-400 mt-1 tracking-widest">
                        POWERED BY V402PAY
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============ Main Component ============
export default function V402CheckoutV2({
                                           checkoutId,
                                           headerInfo = {},
                                           isModal = false,
                                           onPaymentComplete,
                                           additionalParams = {},
                                           expectedNetwork,
                                           primaryColor = '#84cc16', // lime-500
                                       }: V402CheckoutV2Props) {
    const {
        title = 'V402PAY',
        subtitle = 'onvoyage.ai',
    } = headerInfo;

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
    const [paymentDetails, setPaymentDetails] = useState<{
        amount: string;
        currency: string;
        network: string;
    } | null>(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [screenText, setScreenText] = useState('AWAITING PAYMENT...');

    // Disconnect handler
    const handleDisconnect = () => {
        disconnect();
        setResult(null);
        setError(null);
        setShowReceipt(false);
        showToast('Wallet disconnected', 'info');
    };

    // Extract payment details
    useEffect(() => {
        if (paymentInfo && paymentInfo.length > 0) {
            const firstPayment = paymentInfo[0];
            const rawAmount = firstPayment.maxAmountRequired?.toString() || '0';
            const decimals = 6;
            const humanReadableAmount = (Number(rawAmount) / Math.pow(10, decimals)).toFixed(2);
            const network = firstPayment.network || 'Unknown';
            const currency = 'USDC';

            setPaymentDetails({
                amount: humanReadableAmount,
                currency,
                network,
            });

            // 更新屏幕文字
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

    // 显示发票当处理中或有结果
    useEffect(() => {
        if (isProcessing || result || error) {
            setShowReceipt(true);
        }
    }, [isProcessing, result, error]);

    // Payment handler
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

    // Close receipt
    const handleCloseReceipt = () => {
        setShowReceipt(false);
        setResult(null);
        setError(null);
    };

    // Check invalid checkout ID
    const hasInvalidCheckoutId = !fetchingPaymentInfo && (!paymentInfo || paymentInfo.length === 0);

    // Network icon
    const NetworkIcon = paymentDetails ? getNetworkIcon(paymentDetails.network) : null;

    // 状态文字
    const getStatusText = () => {
        if (hasInvalidCheckoutId) return 'ERROR';
        if (fetchingPaymentInfo) return 'LOADING';
        if (!address) return 'CONNECT';
        if (isProcessing) return 'PAYING';
        return 'READY';
    };

    // 连接状态
    const getConnectionStatus = () => {
        if (!address) return 'OFFLINE';
        return 'ONLINE';
    };

    return (
        <div className={isModal ? "bg-transparent" : "min-h-screen bg-gray-100 flex items-center justify-center p-4"}>
            <ToastContainer/>

            {/* Beeper 容器 - 使用 flex 布局，小票在上，付款机器在下 */}
            <div
                className="flex flex-col items-center"
                style={{
                    width: isModal ? '100%' : '400px',
                    maxWidth: '100%',
                }}
            >
                {/* 发票 - 在付款机器上方 */}
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

                {/* Beeper 主体 */}
                <div
                    className="relative rounded-3xl p-4 shadow-2xl w-full"
                    style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 20px 60px -10px ${primaryColor}66, 0 10px 30px -5px rgba(0,0,0,0.3)`,
                    }}
                >
                    {/* 顶部凹槽（出纸口） */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-3 rounded-b-xl"
                        style={{backgroundColor: 'rgba(0,0,0,0.4)'}}
                    />

                    {/* Header 区域 - 业务相关信息 */}
                    <div className="flex justify-between items-center mb-3 mt-2 px-2">
                        <div className="flex items-center gap-2">
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
                        <span className="text-xs font-mono font-semibold" style={{color: 'rgba(0,0,0,0.5)'}}>
                            {paymentDetails?.network || 'NETWORK'}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs font-mono" style={{color: 'rgba(0,0,0,0.6)'}}>
                                ●
                            </span>
                            <span className="text-xs font-bold" style={{color: 'rgba(0,0,0,0.7)'}}>
                                {getConnectionStatus()}
                            </span>
                        </div>
                    </div>

                    {/* 屏幕区域 */}
                    <div
                        className="rounded-xl p-4 mb-4"
                        style={{
                            backgroundColor: '#0a1a0a',
                            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
                            border: '3px solid rgba(0,0,0,0.3)',
                        }}
                    >
                        {/* 屏幕 Header */}
                        <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded border border-green-700"/>
                                <span className="text-xs font-mono" style={{color: '#22c55e80'}}>
                                    CHECKOUT
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <div className="w-1 h-2 rounded-sm"
                                     style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                                <div className="w-1 h-2 rounded-sm"
                                     style={{backgroundColor: address ? '#22c55e80' : '#22c55e30'}}/>
                                <div className="w-1 h-2 rounded-sm" style={{backgroundColor: '#22c55e80'}}/>
                            </div>
                        </div>

                        {/* 屏幕内容 */}
                        <div className="min-h-[140px]">
                            {hasInvalidCheckoutId ? (
                                <div className="text-center py-4">
                                    <div className="text-red-500 text-2xl mb-2">✗</div>
                                    <div className="text-red-500 font-mono text-sm mb-2">INVALID CHECKOUT ID</div>
                                    <div className="text-red-400 font-mono text-xs">
                                        Please check your checkout ID
                                    </div>
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
                                    <div className="font-mono text-sm" style={{color: '#22c55e'}}>
                                        LOADING...
                                    </div>
                                </div>
                            ) : !address ? (
                                <div>
                                    <div
                                        className="font-mono text-lg mb-4 tracking-wider"
                                        style={{
                                            color: '#f97316',
                                            textShadow: '0 0 10px #f9731640',
                                        }}
                                    >
                                        CONNECT WALLET...
                                    </div>
                                    <WalletConnect
                                        supportedNetworks={supportedNetworks}
                                        showSwitchWallet={false}
                                    />
                                </div>
                            ) : (
                                <div>
                                    {/* 主显示文字 */}
                                    <div
                                        className="font-mono text-lg mb-4 tracking-wider"
                                        style={{
                                            color: '#f97316',
                                            textShadow: '0 0 10px #f9731640',
                                        }}
                                    >
                                        {screenText}
                                    </div>

                                    {/* 支付信息网格 */}
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

                    {/* 按钮区域 */}
                    <div className="flex items-center justify-between px-2">
                        {/* 左侧功能按钮 */}
                        <div className="flex gap-3">
                            {/* 断开连接按钮 */}
                            <button
                                onClick={() => address && handleDisconnect()}
                                disabled={!address}
                                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
                                style={{
                                    backgroundColor: '#374151',
                                    boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.2)',
                                    opacity: address ? 1 : 0.5,
                                }}
                                title="Disconnect Wallet"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                                     strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>

                            {/* 清除结果按钮 */}
                            <button
                                onClick={handleCloseReceipt}
                                disabled={!showReceipt || isProcessing}
                                className="w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95"
                                style={{
                                    backgroundColor: '#374151',
                                    boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.2)',
                                    opacity: showReceipt && !isProcessing ? 1 : 0.5,
                                }}
                                title="Clear Receipt"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"
                                     strokeWidth="2">
                                    <path
                                        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
                                </svg>
                            </button>
                        </div>

                        {/* 中间装饰线 */}
                        <div className="flex flex-col gap-1 opacity-40">
                            <div className="w-8 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
                            <div className="w-8 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
                            <div className="w-8 h-0.5 rounded" style={{backgroundColor: 'rgba(0,0,0,0.3)'}}/>
                        </div>

                        {/* PAY 按钮 */}
                        <button
                            onClick={handlePayment}
                            disabled={isProcessing || !paymentDetails || !address || hasInvalidCheckoutId}
                            className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all active:scale-95"
                            style={{
                                backgroundColor: isProcessing || !paymentDetails || !address || hasInvalidCheckoutId
                                    ? '#9ca3af'
                                    : '#ea580c',
                                boxShadow: isProcessing || !paymentDetails || !address || hasInvalidCheckoutId
                                    ? 'none'
                                    : '0 4px 12px rgba(234,88,12,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)',
                                cursor: isProcessing || !paymentDetails || !address || hasInvalidCheckoutId
                                    ? 'not-allowed'
                                    : 'pointer',
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

                    {/* 底部品牌标识 */}
                    <div className="text-center mt-4 mb-1">
                        <div
                            className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-[0.2em]"
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                color: 'rgba(255,255,255,0.9)',
                            }}
                        >
                            {title}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS 动画 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    
                    @keyframes receiptShake {
                        0%, 100% { transform: rotate(-0.3deg); }
                        50% { transform: rotate(0.3deg); }
                    }
                    
                    @keyframes slideInRight {
                        from {
                            opacity: 0;
                            transform: translateX(100px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.4; }
                    }
                `
            }}/>
        </div>
    );
}
