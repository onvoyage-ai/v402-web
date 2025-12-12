'use client';

import React, {useCallback, useRef, useState} from 'react';
import {Toast, ToastType} from '../components/ui/Toast';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

/**
 * Toast 管理 Hook
 * 提供显示 toast 通知的能力
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showToast, ToastContainer } = useToast();
 *
 *   return (
 *     <div>
 *       <button onClick={() => showToast('Success!', 'success')}>
 *         Show Toast
 *       </button>
 *       <ToastContainer />
 *     </div>
 *   );
 * }
 * ```
 */
export const useToast = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const toastIdRef = useRef(0);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, {id, message, type}]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const ToastContainer = () => (
        <>
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    style={{top: `${16 + index * 60}px`}}
                    className="fixed right-4 z-[99999]"
                >
                    {React.createElement(Toast, {
                        message: toast.message,
                        type: toast.type,
                        onClose: () => removeToast(toast.id),
                    })}
                </div>
            ))}
        </>
    );

    return {showToast, ToastContainer};
};

