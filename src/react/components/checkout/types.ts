import {NetworkType} from "../../../types";

/**
 * Checkout 组件通用类型定义
 */

export interface HeaderInfo {
    title?: string;
    subtitle?: string;
    tooltipText?: string;
}

export interface PaymentDetails {
    amount: string;
    currency: string;
    network: string;
}

/**
 * V402Checkout 组件 Props
 */
export interface V402CheckoutProps {
    checkoutId: string;
    headerInfo?: HeaderInfo;
    isModal?: boolean;
    onPaymentComplete?: (response: any) => void;
    additionalParams?: Record<string, any>;
    expectedNetwork?: NetworkType;
}

/**
 * V402CheckoutV2 组件 Props
 */
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

/**
 * Receipt 组件 Props
 */
export interface ReceiptProps {
    isLoading: boolean;
    isVisible: boolean;
    result: any;
    error: string | null;
    paymentDetails: PaymentDetails | null;
    address: string | null;
    onClose: () => void;
    primaryColor: string;
    checkoutId: string;
}

