import {NetworkType} from "../../../types";

/**
 * Checkout 组件通用类型定义
 */

export interface HeaderInfo {
    /** 商品/服务标题，显示在屏幕顶部 */
    title?: string;
    /** 品牌名称，传空字符串则不显示品牌区域 */
    brandName?: string;
    /** 发票标题，默认为 "V402 PAYMENT" */
    receiptTitle?: string;
    /** 悬浮在三个小点上显示的提示文本 */
    tooltipText?: string;
}

export interface PaymentDetails {
    amount: string;
    currency: string;
    network: string;
}

/**
 * V402CheckoutV2 组件 Props
 */
export interface V402CheckoutV2Props {
    /** Checkout ID */
    checkoutId: string;
    /** 头部信息配置 */
    headerInfo?: HeaderInfo;
    /** 主题颜色，默认为绿色 #84cc16 */
    primaryColor?: string;
    /** 是否作为 Modal 使用 */
    isModal?: boolean;
    /** 支付完成回调 */
    onPaymentComplete?: (response: any) => void;
    /** 额外参数，会透传给 checkout 配置的回调 */
    additionalParams?: Record<string, any>;
    /** 期望的网络类型 */
    expectedNetwork?: NetworkType;
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
    /** 发票标题 */
    receiptTitle: string;
    /** Loading 时显示的临时 ID */
    tempReceiptId: string;
}

/**
 * TerminalScreen 组件 Props
 */
export interface TerminalScreenProps {
    title?: string;
    tooltipText?: string;
    hasInvalidCheckoutId: boolean;
    fetchingPaymentInfo: boolean;
    address: string | null;
    paymentDetails: PaymentDetails | null;
    screenText: string;
    supportedNetworks: NetworkType[];
}

/**
 * TerminalButtons 组件 Props
 */
export interface TerminalButtonsProps {
    address: string | null;
    showReceipt: boolean;
    isProcessing: boolean;
    paymentDetails: PaymentDetails | null;
    hasInvalidCheckoutId: boolean;
    onDisconnect: () => void;
    onClearReceipt: () => void;
    onPayment: () => void;
}
