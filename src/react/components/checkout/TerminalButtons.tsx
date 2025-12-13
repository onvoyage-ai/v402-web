'use client';

import React from 'react';
import {TerminalButtonsProps} from "./types";

/**
 * TerminalButtons 组件
 * 终端底部按钮区域
 */
export const TerminalButtons: React.FC<TerminalButtonsProps> = ({
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                        </svg>
                    </>
                )}
            </button>
        </div>
    );
};

// ============ 子组件 ============

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

