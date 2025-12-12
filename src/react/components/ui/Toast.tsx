'use client';

import React, {useEffect} from 'react';
import {createPortal} from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

/**
 * Toast 通知组件
 * 使用 Portal 渲染到 document.body
 */
export const Toast: React.FC<ToastProps> = ({message, type, onClose}) => {
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

