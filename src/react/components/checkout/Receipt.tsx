'use client';

import React, {useEffect, useState} from 'react';
import {formatAddress} from "../../../utils";
import {ReceiptProps} from "./types";

type AnimationState = 'hidden' | 'printing' | 'visible' | 'bounce';

/**
 * Receipt 发票组件
 * 显示支付结果的收据样式组件，带有打印动画效果
 */
export const Receipt: React.FC<ReceiptProps> = ({
                                                    isLoading,
                                                    isVisible,
                                                    result,
                                                    error,
                                                    paymentDetails,
                                                    address,
                                                    onClose,
                                                    primaryColor,
                                                    receiptTitle,
                                                    tempReceiptId,
                                                }) => {
    const [animationState, setAnimationState] = useState<AnimationState>('hidden');

    // 控制动画状态
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

    // 处理弹跳动画回弹
    useEffect(() => {
        if (animationState === 'bounce') {
            const timer = setTimeout(() => setAnimationState('visible'), 150);
            return () => clearTimeout(timer);
        }
    }, [animationState]);

    // 格式化日期时间
    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // ID 逻辑：Loading 时用临时 ID，成功后用 txHash 后8位
    const receiptId = result?.transactionHash 
        ? result.transactionHash.slice(-8).toUpperCase() 
        : tempReceiptId;

    // 根据状态获取外层动画样式
    const getAnimationStyles = (): React.CSSProperties => {
        const baseTransition = animationState === 'bounce'
            ? 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
            : 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

        switch (animationState) {
            case 'hidden':
                return {
                    opacity: 0,
                    transform: 'translateY(50px)',
                    marginBottom: 0,
                    transition: baseTransition,
                };
            case 'printing':
                return {
                    opacity: 1,
                    transform: 'translateY(0)',
                    marginBottom: '-4px', // 负边距让小票贴着机器，还没撕开的感觉
                    animation: 'receiptShake 0.12s ease-in-out infinite',
                    transition: baseTransition,
                };
            case 'visible':
                return {
                    opacity: 1,
                    transform: 'translateY(0)',
                    marginBottom: '8px',
                    transition: baseTransition,
                };
            case 'bounce':
                return {
                    opacity: 1,
                    transform: 'translateY(-8px)',
                    marginBottom: '8px',
                    transition: baseTransition,
                };
            default:
                return {};
        }
    };

    // 根据状态获取内容区域高度样式
    const getContentStyles = (): React.CSSProperties => {
        const baseTransition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        
        switch (animationState) {
            case 'hidden':
                return {
                    maxHeight: 0,
                    overflow: 'hidden',
                    transition: baseTransition,
                };
            case 'printing':
                return {
                    maxHeight: '80px',
                    overflow: 'hidden',
                    transition: baseTransition,
                };
            case 'visible':
            case 'bounce':
                return {
                    maxHeight: '600px',
                    overflow: 'visible',
                    transition: baseTransition,
                };
            default:
                return {};
        }
    };

    if (animationState === 'hidden' && !isLoading) return null;

    return (
        <div
            className="w-full flex justify-center"
            style={getAnimationStyles()}
        >
            {/* 发票主体 */}
            <div
                className="relative bg-white shadow-2xl"
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
                {/* 顶部锯齿效果 */}
                <div
                    className="absolute top-0 left-0 right-0"
                    style={{
                        height: '8px',
                        transform: 'translateY(-100%)',
                        background: `radial-gradient(circle at 50% 100%, white 5px, transparent 5px)`,
                        backgroundSize: '12px 8px',
                        backgroundPosition: '6px 0',
                        backgroundRepeat: 'repeat-x',
                    }}
                />
                {/* 顶部白色填充条 */}
                <div
                    className="absolute left-0 right-0 bg-white"
                    style={{
                        height: '4px',
                        top: '-4px',
                    }}
                />

                {/* 底部锯齿效果 - 只在小票撕下来后显示（非loading状态） */}
                {!isLoading && (
                    <>
                        <div
                            className="absolute bottom-0 left-0 right-0"
                            style={{
                                height: '8px',
                                transform: 'translateY(100%)',
                                background: `radial-gradient(circle at 50% 0%, white 5px, transparent 5px)`,
                                backgroundSize: '12px 8px',
                                backgroundPosition: '6px 0',
                                backgroundRepeat: 'repeat-x',
                            }}
                        />
                        {/* 底部白色填充条 */}
                        <div
                            className="absolute left-0 right-0 bg-white"
                            style={{
                                height: '4px',
                                bottom: '-4px',
                            }}
                        />
                    </>
                )}

                {/* 关闭按钮 - 只在完成后显示 */}
                {!isLoading && (result || error) && (
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors bg-transparent border-none outline-none p-0 cursor-pointer"
                        style={{ background: 'none', border: 'none' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                )}

                {/* 发票内容 - 应用高度动画 */}
                <div className="p-4 font-mono text-sm" style={getContentStyles()}>
                    {/* 标题 */}
                    <div className="text-center mb-3">
                        <div className="text-base font-bold tracking-wider text-gray-800">
                            {receiptTitle}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>ID: {receiptId}</span>
                            <span>{dateStr} {timeStr}</span>
                        </div>
                    </div>

                    {/* 虚线分隔 */}
                    <div className="border-t border-dashed border-gray-300 my-2"/>

                    {/* 内容区域 */}
                    <div
                        className="max-h-64 overflow-y-auto pr-1"
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#d1d5db transparent',
                        }}
                    >
                        {isLoading ? (
                            <LoadingContent primaryColor={primaryColor}/>
                        ) : error ? (
                            <ErrorContent error={error}/>
                        ) : result ? (
                            <SuccessContent
                                result={result}
                                paymentDetails={paymentDetails}
                                address={address}
                                primaryColor={primaryColor}
                            />
                        ) : null}
                    </div>

                    {/* 虚线分隔 */}
                    <div className="border-t border-dashed border-gray-300 my-2"/>

                    {/* 底部条形码效果 */}
                    <Barcode/>

                    <div className="text-center text-xs text-gray-400 mt-1 tracking-widest">
                        POWERED BY{' '}
                        <a 
                            href="https://v402pay.onvoyage.ai" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700 underline transition-colors"
                        >
                            V402PAY
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============ 子组件 ============

const LoadingContent: React.FC<{ primaryColor: string }> = ({primaryColor}) => (
    <div className="text-center py-4">
        <div
            className="inline-block w-8 h-8 border-2 border-gray-200 rounded-full mb-2"
            style={{
                borderTopColor: primaryColor,
                animation: 'spin 0.8s linear infinite',
            }}
        />
        <div className="text-gray-700 font-semibold text-sm">Processing...</div>
        <div className="text-gray-400 text-xs mt-1">Please wait</div>
    </div>
);

const ErrorContent: React.FC<{ error: string }> = ({error}) => (
    <div className="text-center py-3">
        <div className="text-red-500 text-2xl mb-2">✗</div>
        <div className="text-red-600 font-semibold mb-1 text-sm">FAILED</div>
        <div className="text-red-500 text-xs break-words px-2">{error}</div>
    </div>
);

interface SuccessContentProps {
    result: any;
    paymentDetails: { amount: string; currency: string; network: string } | null;
    address: string | null;
    primaryColor: string;
}

const SuccessContent: React.FC<SuccessContentProps> = ({
                                                           result,
                                                           paymentDetails,
                                                           address,
                                                           primaryColor,
                                                       }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div>
            <div className="text-center mb-2">
                <div className="text-2xl mb-1" style={{color: primaryColor}}>✓</div>
                <div className="font-semibold text-sm" style={{color: primaryColor}}>
                    SUCCESS
                </div>
            </div>

            {/* 支付详情 */}
            <div className="space-y-1 text-xs">
                {paymentDetails && (
                    <>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Amount:</span>
                            <span className="font-semibold">${paymentDetails.amount} {paymentDetails.currency}</span>
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
                        <span className="text-gray-500">TX:</span>
                        <span className="font-semibold">{formatAddress(result.transactionHash)}</span>
                    </div>
                )}
            </div>

            {/* 虚线分隔 */}
            <div className="border-t border-dashed border-gray-300 my-2"/>

            {/* Response Data */}
            <div className="text-xs">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500">Response:</span>
                    <button
                        onClick={handleCopy}
                        className="text-gray-300 hover:text-gray-500 transition-colors flex items-center gap-1 bg-transparent border-none outline-none p-0 cursor-pointer"
                        style={{ background: 'none', border: 'none' }}
                    >
                        {copied ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                        ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2"/>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                            </svg>
                        )}
                    </button>
                </div>
                <pre
                    className="bg-gray-50 p-2 rounded text-xs overflow-auto whitespace-pre-wrap break-words"
                    style={{maxHeight: '80px', fontSize: '10px'}}
                >
                    {JSON.stringify(result, null, 2)}
                </pre>
            </div>
        </div>
    );
};

// 条形码组件 - 使用固定模式避免 hydration 问题
const Barcode: React.FC = () => {
    // 使用固定的模式，避免 SSR/CSR 不匹配
    const pattern = [2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1];
    const heights = [10, 12, 11, 13, 10, 14, 11, 12, 13, 10, 11, 14, 12, 10, 13, 11, 12, 14, 10, 11];
    
    return (
        <div className="flex items-center justify-center gap-0.5 h-4 opacity-60">
            {pattern.map((width, i) => (
                <div
                    key={i}
                    className="bg-gray-800"
                    style={{
                        width: `${width}px`,
                        height: `${heights[i]}px`,
                    }}
                />
            ))}
        </div>
    );
};
