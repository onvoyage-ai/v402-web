'use client';

import React, {useEffect, useState} from 'react';
import {Button, Card, Divider, message, Spin, Tooltip, Typography} from 'antd';
import {
    DisconnectOutlined,
    InfoCircleOutlined,
    LinkOutlined,
    LoadingOutlined,
    LockOutlined,
    SafetyOutlined
} from '@ant-design/icons';
import {usePaymentInfo} from "../../hooks/usePaymentInfo";
import {usePageNetwork} from "../../hooks/usePageNetwork";
import {usePayment} from "../../hooks/usePayment";
import {PROD_BACK_URL} from "../../../types/common";
import {formatAddress, makePayment} from "../../../utils";
import {WalletConnect} from '../wallet/WalletConnect';
import {NetworkType} from "../../../types";
import {getNetworkIcon} from "../../utils/CryptoIcons";

const {Title, Text} = Typography;

interface HeaderInfo {
    title?: string;      // 标题
    subtitle?: string;   // 副标题/网站名
    tooltipText?: string; // 备注/提示文本
}

export interface V402CheckoutProps {
    checkoutId: string;
    headerInfo?: HeaderInfo; // header 配置信息
    isModal?: boolean; // 是否在模态框中显示
    onPaymentComplete?: (response: any) => void; // 支付完成后的回调函数
    additionalParams?: Record<string, any>; // 额外的入参,会透传给checkout配置的回调
    expectedNetwork?: NetworkType; // 期望的网络类型
}

// 使用 antd 的 message 组件
const notify = {
    success: (title: string, msg: string) => {
        message.success(`${title}: ${msg}`);
    },
    error: (title: string, msg: string) => {
        message.error(`${title}: ${msg}`);
    },
    info: (title: string, msg: string) => {
        message.info(`${title}: ${msg}`);
    }
};

export default function V402Checkout({
                                         checkoutId,
                                         headerInfo = {},
                                         isModal = false,
                                         onPaymentComplete,
                                         additionalParams = {},
                                         expectedNetwork,
                                     }: V402CheckoutProps) {
    // 解构 headerInfo，并设置默认值
    const {
        title = 'V402Pay - Make x402Pay Easier',
        subtitle = 'onvoyage.ai',
        tooltipText = 'V402Pay - Accept Crypto Payments Easier'
    } = headerInfo;
    // 默认prod
    const endpoint = PROD_BACK_URL;

    // 获取支付信息以确定期望的网络
    const {
        supportedNetworks,
        isLoading: fetchingPaymentInfo,
        paymentInfo
    } = usePaymentInfo(checkoutId, endpoint, additionalParams);

    // 确定实际期望的网络（优先使用 prop，否则使用第一个支持的网络）
    const targetNetwork = expectedNetwork || supportedNetworks[0];

    // 使用 usePageNetwork 自动管理网络切换
    const {address, networkType, disconnect, ensureNetwork} = usePageNetwork(
        targetNetwork,
        {autoSwitch: !!targetNetwork, switchOnMount: true}
    );

    const {isProcessing, setIsProcessing, result, setResult, error, setError} = usePayment();

    // Payment details state
    const [paymentDetails, setPaymentDetails] = useState<{
        amount: string;
        currency: string;
        network: string;
    } | null>(null);

    // Handle disconnect
    const handleDisconnect = () => {
        disconnect();
        setResult(null);
        setError(null);
        notify.info('Wallet Disconnected', 'Your wallet has been disconnected successfully.');
    };


    // Extract payment details from paymentInfo
    useEffect(() => {
        if (paymentInfo && paymentInfo.length > 0) {
            const firstPayment = paymentInfo[0];

            // 从后端获取金额
            const rawAmount = firstPayment.maxAmountRequired?.toString() || '0';
            // USDC 使用 6 位小数
            const decimals = 6;
            const humanReadableAmount = (Number(rawAmount) / Math.pow(10, decimals)).toFixed(2);

            // 从后端获取网络
            const network = firstPayment.network || 'Unknown';

            // 币种：后端没有提供币种名称字段，asset 是代币合约地址
            // 使用默认值 USDC，后续可由后端添加 currency 字段
            const currency = 'USDC';

            setPaymentDetails({
                amount: humanReadableAmount,
                currency: currency,
                network: network,
            });
        }
    }, [paymentInfo]);

    // 当支持的网络改变时，确保切换到正确的网络
    useEffect(() => {
        if (targetNetwork && !fetchingPaymentInfo && ensureNetwork) {
            ensureNetwork(targetNetwork).catch(err => {
                console.error('Failed to ensure network:', err);
            });
        }
    }, [targetNetwork, fetchingPaymentInfo]);

    // Handle payment
    const handlePayment = async () => {
        if (!networkType) {
            notify.error('Wallet Not Connected', 'Please connect your wallet first.');
            return;
        }

        // 清除之前的结果，开始新的支付流程
        setResult(null);
        setError(null);
        setIsProcessing(true);

        try {
            const response = await makePayment(networkType, checkoutId, endpoint, additionalParams);
            const data = await response.json();
            setResult(data);
            notify.success('Payment Successful!', 'Your payment has been processed successfully.');

            // 透传 response 数据给父组件
            if (onPaymentComplete) {
                onPaymentComplete(data);
            }
        } catch (err: any) {
            const errorMessage = err.message || 'Payment failed';
            setError(errorMessage);
            notify.error('Payment Failed', errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    // Get network icon and color based on network name
    const getNetworkColor = (network: string) => {
        if (network.toLowerCase().includes('solana')) return '#14F195';
        if (network.toLowerCase().includes('evm') || network.toLowerCase().includes('base')) return '#0052FF';
        return '#8c8c8c';
    };

    const NetworkIcon = paymentDetails ? getNetworkIcon(paymentDetails.network) : null;
    const networkColor = paymentDetails ? getNetworkColor(paymentDetails.network) : '#8c8c8c';
    const loadingColor = '#8c8c8c'; // 灰色用于加载状态
    // Check if checkout ID is invalid (no payment info after loading)
    const hasInvalidCheckoutId = !fetchingPaymentInfo && (!paymentInfo || paymentInfo.length === 0);

    return (
        <div
            className={isModal ? "bg-white" : "h-screen bg-white flex items-center justify-center p-4 overflow-hidden"}>
            <div
                className="flex gap-4 items-center justify-center"
                style={{
                    maxWidth: (isProcessing || result || error) ? '1200px' : '480px',
                    transition: 'max-width 0.4s ease-in-out',
                    width: '100%',
                }}
            >
                {/* Payment Card */}
                <Card
                    className="flex-shrink-0"
                    style={{
                        border: isModal ? 'none' : '1px solid #e8e8e8',
                        borderRadius: isModal ? '0' : '16px',
                        boxShadow: isModal ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.06)',
                        maxHeight: isModal ? 'calc(100vh - 100px)' : 'calc(100vh - 32px)',
                        overflow: 'auto',
                        width: isModal ? '100%' : '480px',
                        transition: 'all 0.4s ease-in-out',
                        transform: (result || error) ? 'translateX(0)' : 'translateX(0)',
                    }}
                    styles={{body: {padding: isModal ? '0px' : '32px 24px'}}}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{
                                background: hasInvalidCheckoutId ? '#ff4d4f' : (paymentDetails ? networkColor : loadingColor),
                                transition: 'background 0.3s ease'
                            }}
                        >
                            {hasInvalidCheckoutId ? (
                                <span style={{fontSize: '20px', color: 'white', fontWeight: 'bold'}}>✗</span>
                            ) : paymentDetails && NetworkIcon ? (
                                <NetworkIcon width={24} height={24}/>
                            ) : (
                                <LoadingOutlined style={{fontSize: '20px', color: 'white'}} spin/>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <Title level={4} style={{margin: 0, fontSize: '18px', fontWeight: 600}}>
                                    {title || 'Echo Payment OnVoyage'}
                                </Title>
                                {!hasInvalidCheckoutId && (
                                    <Tooltip
                                        title={tooltipText}
                                        placement="top"
                                    >
                                        <InfoCircleOutlined
                                            style={{fontSize: '14px', color: '#8c8c8c', cursor: 'help'}}/>
                                    </Tooltip>
                                )}
                            </div>
                            <Text style={{fontSize: '13px', color: '#8c8c8c'}}>{subtitle}</Text>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="text-center mb-5">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                            <LockOutlined style={{fontSize: '20px', color: '#595959'}}/>
                        </div>
                        <Title level={3} style={{margin: '0 0 6px 0', fontSize: '20px', fontWeight: 600}}>
                            Payment Required
                        </Title>
                        <Text style={{fontSize: '13px', color: '#8c8c8c'}}>
                            Pay {paymentDetails ? `$${paymentDetails.amount} ${paymentDetails.currency}` : 'the required amount'} to
                            access
                        </Text>
                    </div>

                    {/* Error state - Invalid checkout ID */}
                    {hasInvalidCheckoutId && (
                        <div className="text-center py-6">
                            <div
                                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                                    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                <span style={{fontSize: '32px', color: 'white'}}>!</span>
                            </div>
                            <Title level={4}
                                   style={{margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600, color: '#262626'}}>
                                Invalid Checkout ID
                            </Title>
                            <Text style={{fontSize: '14px', color: '#8c8c8c', display: 'block', marginBottom: '16px'}}>
                                The checkout ID you provided is invalid or has expired.
                            </Text>
                            <div
                                style={{
                                    background: '#fef2f2',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid #fee2e2',
                                    marginTop: '16px'
                                }}
                            >
                                <Text style={{
                                    fontSize: '13px',
                                    color: '#dc2626',
                                    lineHeight: '1.6',
                                    fontWeight: 500
                                }}>
                                    Failed to load payment information. Please check your checkout ID.
                                </Text>
                            </div>
                        </div>
                    )}

                    {/* Loading state */}
                    {!hasInvalidCheckoutId && fetchingPaymentInfo && (
                        <div className="text-center py-6">
                            <Text style={{color: '#8c8c8c'}}>Loading payment information...</Text>
                        </div>
                    )}

                    {/* Wallet connection */}
                    {!hasInvalidCheckoutId && !fetchingPaymentInfo && !address && (
                        <div>
                            <WalletConnect supportedNetworks={supportedNetworks}/>
                        </div>
                    )}

                    {/* Connected wallet */}
                    {!hasInvalidCheckoutId && address && (
                        <>
                            {/* Wallet Card */}
                            <div
                                className="bg-gray-50 rounded-lg p-3 mb-4"
                                style={{border: '1px solid #f0f0f0'}}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div
                                            className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-sm font-semibold">
                                            {address.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Text style={{
                                                display: 'block',
                                                fontSize: '12px',
                                                color: '#8c8c8c',
                                                marginBottom: '2px'
                                            }}>
                                                Connected Wallet
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    fontFamily: 'Monaco, monospace',
                                                }}
                                            >
                                                {formatAddress(address)}
                                            </Text>
                                        </div>
                                    </div>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<DisconnectOutlined/>}
                                        onClick={handleDisconnect}
                                        style={{color: '#ff4d4f'}}
                                    />
                                </div>
                            </div>

                            {/* Payment Details */}
                            {paymentDetails && (
                                <div className="bg-gray-50 rounded-lg p-3 mb-4" style={{border: '1px solid #f0f0f0'}}>
                                    <div className="flex justify-between items-center mb-2">
                                        <Text style={{fontSize: '13px', color: '#8c8c8c'}}>Payment Amount</Text>
                                        <Text style={{fontSize: '18px', fontWeight: 600}}>
                                            ${paymentDetails.amount}
                                        </Text>
                                    </div>
                                    <Divider style={{margin: '6px 0'}}/>
                                    <div className="flex justify-between items-center mb-2">
                                        <Text style={{fontSize: '13px', color: '#8c8c8c'}}>Currency</Text>
                                        <Text style={{fontSize: '14px', fontWeight: 500}}>
                                            {paymentDetails.currency}
                                        </Text>
                                    </div>
                                    <Divider style={{margin: '6px 0'}}/>
                                    <div className="flex justify-between items-center mb-2">
                                        <Text style={{fontSize: '13px', color: '#8c8c8c'}}>Network</Text>
                                        <Text style={{fontSize: '14px', fontWeight: 500}}>
                                            {paymentDetails.network}
                                        </Text>
                                    </div>
                                    <Divider style={{margin: '6px 0'}}/>
                                    <div className="flex justify-between items-start">
                                        <Text style={{fontSize: '13px', color: '#8c8c8c'}}>Wallet Address</Text>
                                        <Text style={{
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            fontFamily: 'Monaco, monospace',
                                            wordBreak: 'break-all',
                                            textAlign: 'right',
                                            maxWidth: '60%',
                                            lineHeight: 1.4
                                        }}>
                                            {address}
                                        </Text>
                                    </div>
                                </div>
                            )}

                            {/* Security Notice */}
                            <div
                                className="flex items-center justify-center gap-2 mb-3 p-2 rounded-lg"
                                style={{background: '#f6ffed', border: '1px solid #d9f7be'}}
                            >
                                <SafetyOutlined style={{color: '#52c41a', fontSize: '13px'}}/>
                                <Text style={{fontSize: '12px', color: '#52c41a', fontWeight: 500}}>
                                    Secure payment powered by v402pay
                                </Text>
                            </div>

                            {/* Payment Button */}
                            <Button
                                type="primary"
                                size="large"
                                onClick={handlePayment}
                                disabled={isProcessing || !paymentDetails}
                                loading={isProcessing}
                                block
                                style={{
                                    height: '44px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    ...(!isProcessing && paymentDetails && {
                                        background: '#1a1a1a',
                                        borderColor: '#1a1a1a',
                                    }),
                                    marginBottom: '10px',
                                }}
                            >
                                {isProcessing
                                    ? 'Processing...'
                                    : !paymentDetails
                                        ? 'Loading...'
                                        : `Pay $${paymentDetails.amount} ${paymentDetails.currency}`}
                            </Button>

                            {/* Footer Link */}
                            <div className="text-center">
                                <Text style={{fontSize: '13px', color: '#8c8c8c'}}>
                                    Don't have USDC?{' '}
                                </Text>
                                <a
                                    href="https://faucet.circle.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1"
                                >
                                    Get it here <LinkOutlined style={{fontSize: '12px'}}/>
                                </a>
                            </div>

                            {/* 模态框模式下的成功/失败反馈 */}
                            {isModal && result && (
                                <div className="mt-4 p-4 rounded-lg"
                                     style={{background: '#f6ffed', border: '1px solid #b7eb8f'}}>
                                    <div className="text-center">
                                        <span style={{fontSize: '20px'}}>✓</span>
                                        <Text style={{
                                            fontSize: '14px',
                                            color: '#52c41a',
                                            fontWeight: 600,
                                            marginLeft: '8px'
                                        }}>
                                            Payment Successful!
                                        </Text>
                                    </div>
                                </div>
                            )}

                            {isModal && error && (
                                <div className="mt-4 p-4 rounded-lg"
                                     style={{background: '#fff2f0', border: '1px solid #ffccc7'}}>
                                    <div className="text-center mb-3">
                                        <span style={{fontSize: '20px'}}>✗</span>
                                        <Text style={{
                                            fontSize: '14px',
                                            color: '#ff4d4f',
                                            fontWeight: 600,
                                            marginLeft: '8px',
                                            display: 'block',
                                            marginTop: '4px'
                                        }}>
                                            Payment Failed
                                        </Text>
                                    </div>
                                    <Text style={{
                                        fontSize: '13px',
                                        color: '#ff4d4f',
                                        display: 'block',
                                        textAlign: 'center'
                                    }}>
                                        {error}
                                    </Text>
                                </div>
                            )}
                        </>
                    )}

                </Card>

                {/* Result Card - 在模态框模式下隐藏 */}
                {!isModal && (isProcessing || result || error) && (
                    <Card
                        title={
                            <div className="flex items-center gap-2">
                                {isProcessing && !result && !error ? (
                                    <>
                                        <LoadingOutlined style={{color: '#14b8a6', fontSize: '16px'}}/>
                                        <Text strong style={{fontSize: '16px', color: '#262626'}}>Processing
                                            Payment</Text>
                                    </>
                                ) : result ? (
                                    <>
                                        <span style={{color: '#52c41a', fontSize: '18px'}}>✓</span>
                                        <Text strong style={{fontSize: '16px', color: '#262626'}}>Payment
                                            Successful</Text>
                                    </>
                                ) : (
                                    <>
                                        <span style={{color: '#ff4d4f', fontSize: '18px'}}>✗</span>
                                        <Text strong style={{fontSize: '16px', color: '#262626'}}>Payment Failed</Text>
                                    </>
                                )}
                            </div>
                        }
                        extra={
                            !isProcessing && (
                                <Button
                                    type="text"
                                    size="small"
                                    onClick={() => {
                                        setResult(null);
                                        setError(null);
                                    }}
                                >
                                    Close
                                </Button>
                            )
                        }
                        style={{
                            border: '1px solid #e8e8e8',
                            borderRadius: '16px',
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
                            maxHeight: 'calc(100vh - 32px)',
                            width: '480px',
                            animation: 'slideInRight 0.4s ease-out',
                        }}
                        styles={{
                            body: {
                                padding: '24px',
                                maxHeight: 'calc(100vh - 120px)',
                                overflow: 'auto',
                            }
                        }}
                    >
                        {/* Loading State */}
                        {isProcessing && !result && !error && (
                            <div className="text-center py-10">
                                <div className="relative inline-block">
                                    <div
                                        className="absolute inset-0 rounded-full blur-xl opacity-40"
                                        style={{
                                            background: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
                                            animation: 'pulse 2s ease-in-out infinite'
                                        }}
                                    />
                                    <Spin
                                        indicator={<LoadingOutlined style={{fontSize: 56, color: '#14b8a6'}}/>}
                                    />
                                </div>
                                <div className="mt-6">
                                    <Text strong style={{fontSize: '18px', color: '#262626', letterSpacing: '-0.02em'}}>
                                        Verifying Payment
                                    </Text>
                                </div>
                                <div className="mt-2 mb-6">
                                    <Text style={{fontSize: '14px', color: '#8c8c8c', lineHeight: '1.6'}}>
                                        Please wait while we confirm your transaction
                                    </Text>
                                </div>
                                <div
                                    className="mt-4 p-4 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%)',
                                        border: '1px solid #ccfbf1'
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <span style={{fontSize: '16px'}}>⏱️</span>
                                        <Text style={{fontSize: '13px', color: '#0f766e', fontWeight: 500}}>
                                            This may take a few moments
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success State */}
                        {result && (
                            <div>
                                <div className="text-center mb-6">
                                    <div
                                        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                        style={{
                                            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                                        }}
                                    >
                                        <span style={{fontSize: '32px', color: 'white'}}>✓</span>
                                    </div>
                                    <div>
                                        <Text strong style={{
                                            fontSize: '20px',
                                            color: '#262626',
                                            display: 'block',
                                            marginBottom: '8px'
                                        }}>
                                            Payment Successful!
                                        </Text>
                                        <Text style={{fontSize: '14px', color: '#8c8c8c'}}>
                                            Your transaction has been confirmed
                                        </Text>
                                    </div>
                                </div>
                                <Divider style={{margin: '20px 0', borderColor: '#f0f0f0'}}>
                                    <Text style={{fontSize: '12px', color: '#8c8c8c', fontWeight: 500}}>RESPONSE
                                        DATA</Text>
                                </Divider>
                                <pre
                                    style={{
                                        background: '#fafafa',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        lineHeight: '1.8',
                                        overflow: 'auto',
                                        margin: 0,
                                        fontFamily: 'Monaco, Courier New, monospace',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        border: '1px solid #e8e8e8',
                                        color: '#262626'
                                    }}
                                >
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div>
                                <div className="text-center mb-6">
                                    <div
                                        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                        style={{
                                            background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                                            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)'
                                        }}
                                    >
                                        <span style={{fontSize: '32px', color: 'white'}}>✗</span>
                                    </div>
                                    <div>
                                        <Text strong style={{
                                            fontSize: '20px',
                                            color: '#262626',
                                            display: 'block',
                                            marginBottom: '8px'
                                        }}>
                                            Payment Failed
                                        </Text>
                                        <Text style={{fontSize: '14px', color: '#8c8c8c'}}>
                                            Something went wrong with your transaction
                                        </Text>
                                    </div>
                                </div>
                                <Divider style={{margin: '20px 0', borderColor: '#f0f0f0'}}>
                                    <Text style={{fontSize: '12px', color: '#8c8c8c', fontWeight: 500}}>ERROR
                                        DETAILS</Text>
                                </Divider>
                                <div
                                    style={{
                                        background: '#fef2f2',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid #fee2e2',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: '14px',
                                        color: '#dc2626',
                                        lineHeight: '1.6',
                                        fontWeight: 500
                                    }}>
                                        {error}
                                    </Text>
                                </div>
                                <div className="mt-4 text-center">
                                    <Button
                                        size="large"
                                        onClick={handlePayment}
                                        style={{
                                            height: '44px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            borderRadius: '8px',
                                            background: '#1a1a1a',
                                            borderColor: '#1a1a1a',
                                            color: 'white',
                                            paddingLeft: '32px',
                                            paddingRight: '32px',
                                        }}
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
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
                        0%, 100% {
                            transform: scale(1);
                            opacity: 0.4;
                        }
                        50% {
                            transform: scale(1.1);
                            opacity: 0.6;
                        }
                    }
                `
            }}/>
        </div>
    );
}

