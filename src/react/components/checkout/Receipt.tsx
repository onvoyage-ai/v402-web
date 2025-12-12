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
                                                    checkoutId,
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
                    maxHeight: '80px',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    animation: 'receiptShake 0.12s ease-in-out infinite',
                    transition: baseTransition,
                };
            case 'visible':
                return {
                    opacity: 1,
                    transform: 'translateY(0)',
                    maxHeight: '500px',
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

                    {/* 内容区域 */}
                    <div
                        className="max-h-40 overflow-y-auto pr-1"
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
                        POWERED BY V402PAY
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============ 子组件 ============

const LoadingContent: React.FC<{ primaryColor: string }> = ({primaryColor}) => (
    <div className="text-center py-6">
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
);

const ErrorContent: React.FC<{ error: string }> = ({error}) => (
    <div className="text-center py-4">
        <div className="text-red-500 text-2xl mb-2">✗</div>
        <div className="text-red-600 font-semibold mb-2">PAYMENT FAILED</div>
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
                                                       }) => (
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
                    <span className="text-gray-500">TX Hash:</span>
                    <span className="font-semibold">{formatAddress(result.transactionHash)}</span>
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
);

const Barcode: React.FC = () => (
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
);

