'use client';

import React from 'react';

/**
 * CSS 动画定义
 * 用于 checkout 组件的各种动画效果
 */

export const checkoutAnimations = `
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
`;

/**
 * 动画样式组件
 * 用于注入 CSS 动画到页面
 */
export const AnimationStyles = () => (
    <style dangerouslySetInnerHTML={{__html: checkoutAnimations}}/>
);

