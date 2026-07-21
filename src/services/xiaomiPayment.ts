/**
 * 小米应用内支付SDK集成模块
 * 
 * ⚠️ 注意：本模块为占位符实现，所有密钥和接口均为示例
 * 上线前需要替换为真实的小米支付配置和SDK调用
 */

import { PaymentProduct, PaymentResult } from '@/types';

// ==================== 小米支付配置 ====================

/**
 * 小米应用内支付参数配置
 * ⚠️ 切勿硬编码真实秘钥！上线前在小米开发者后台获取真实配置
 */
export const XIAOMI_PAY_CONFIG = {
  appId: process.env.NEXT_PUBLIC_XIAOMI_APP_ID || 'YOUR_XIAOMI_APP_ID_HERE',        // 占位符
  appKey: process.env.XIAOMI_APP_KEY || 'YOUR_XIAOMI_APP_KEY_HERE',                // 占位符（仅服务端使用）
  merchantId: process.env.XIAOMI_MERCHANT_ID || 'YOUR_MERCHANT_ID_HERE',           // 占位符
  callbackUrl: process.env.XIAOMI_CALLBACK_URL || 'YOUR_SERVER_CALLBACK_URL',      // 占位符：服务端接收小米异步通知的地址
  
  // 商品列表配置
  products: {
    MONTHLY_VIP: {
      code: 'vip_monthly_3rmb',
      price: 3.00,
      name: '云同步按月订阅',
      description: '解锁云端同步功能，按月订阅',
    },
    LIFETIME_VIP: {
      code: 'vip_lifetime_9rmb',
      price: 9.90,
      name: '云同步永久买断',
      description: '一次购买，永久享受云端同步功能',
    },
  } as Record<string, PaymentProduct>,
};

// ==================== 客户端支付接口 ====================

/**
 * 调起小米应用内支付
 * 
 * ⚠️ 这是占位符实现
 * 实际打包为Android应用后，需要替换为小米SDK原生桥接方法
 * 
 * 参考小米支付SDK文档：MiCommPayService.pay()
 * 
 * @param productCode 商品代码
 * @param userId 用户ID
 * @returns 支付结果（注意：最终成功由服务端异步回调确认）
 */
export async function triggerXiaomiPay(productCode: string, userId: string): Promise<PaymentResult> {
  console.log(`[小米支付模拟] 正在发起支付，商品代码: ${productCode}, 用户ID: ${userId}`);
  
  // 验证商品代码
  const product = XIAOMI_PAY_CONFIG.products[productCode];
  if (!product) {
    return {
      status: 'FAILED',
      orderId: '',
      error: '无效的商品代码',
    };
  }

  // 构建支付参数
  const payParams = {
    appId: XIAOMI_PAY_CONFIG.appId,
    cpOrderId: `ORDER_${Date.now()}_${userId}`, // 商户生成唯一订单号
    productCode: productCode,
    userInfo: userId,
  };

  // ⚠️ 模拟支付流程
  // TODO: 打包为原生应用后，在此处替换为 Android 原生 Bridge 调起
  // 示例代码（仅作参考）：
  // if (window.MiPayBridge && window.MiPayBridge.pay) {
  //   window.MiPayBridge.pay(JSON.stringify(payParams));
  // }

  // 当前环境为Web占位状态
  alert(`已触发小米支付 SDK 接口（环境占位状态）
  
商品：${product.name}
价格：￥${product.price}
订单号：${payParams.cpOrderId}

实际打包后，此接口将调起官方支付弹窗。`);

  return {
    status: 'PENDING_CALLBACK', // 注意：支付成功必须由服务端异步回调确认！
    orderId: payParams.cpOrderId,
  };
}

/**
 * 查询订单状态（客户端轮询）
 * 
 * ⚠️ 此方法仅用于客户端轮询查询订单状态
 * 最终支付成功必须由服务端接收小米的异步通知来确认
 * 
 * @param orderId 订单号
 * @returns 订单状态
 */
export async function queryOrderStatus(orderId: string): Promise<PaymentResult> {
  console.log(`[小米支付模拟] 查询订单状态: ${orderId}`);

  // TODO: 实际实现需要调用服务端API查询订单状态
  // 示例代码（仅作参考）：
  // const response = await fetch(`/api/payment/query?orderId=${orderId}`);
  // const data = await response.json();
  // return data;

  return {
    status: 'PENDING_CALLBACK',
    orderId: orderId,
  };
}

// ==================== 服务端支付接口 ====================

/**
 * 服务端：验证小米支付签名
 * 
 * ⚠️ 此函数应在服务端API路由中调用，用于验证小米回调的签名
 * 防止伪造支付成功通知
 * 
 * @param callbackData 小米回调数据
 * @returns 验证结果
 */
export async function verifyXiaomiPaymentSignature(callbackData: any): Promise<boolean> {
  console.log('[小米支付模拟] 验证支付签名:', callbackData);

  // TODO: 实际实现需要使用小米提供的签名验证算法
  // 参考：https://dev.mi.com/console/doc/detail?pId=1485
  
  return true; // 占位符：始终返回true
}

/**
 * 服务端：处理小米支付成功回调
 * 
 * ⚠️ 此函数应在服务端API路由中调用
 * 
 * @param callbackData 小米回调数据
 * @returns 处理结果
 */
export async function handleXiaomiPaymentCallback(callbackData: {
  appId: string;
  cpOrderId: string;
  uid: string;
  productCode: string;
  orderStatus: string; // 'SUCCESS' | 'FAIL'
  signature: string;
}): Promise<{ success: boolean; error?: string }> {
  console.log('[小米支付模拟] 处理支付回调:', callbackData);

  // 1. 验证签名
  const isSignatureValid = await verifyXiaomiPaymentSignature(callbackData);
  if (!isSignatureValid) {
    return {
      success: false,
      error: '签名验证失败',
    };
  }

  // 2. 检查订单状态
  if (callbackData.orderStatus !== 'SUCCESS') {
    return {
      success: false,
      error: '支付失败',
    };
  }

  // 3. 验证商品代码
  const product = XIAOMI_PAY_CONFIG.products[callbackData.productCode];
  if (!product) {
    return {
      success: false,
      error: '无效的商品代码',
    };
  }

  // 4. 更新用户VIP状态（需要调用数据库）
  // TODO: 实际实现需要：
  // - 检查订单是否已处理（防重复）
  // - 更新 profiles 表的 is_vip 和 vip_expire_at 字段
  // - 记录支付流水
  
  console.log(`[小米支付模拟] 支付成功，应为用户 ${callbackData.uid} 激活VIP权限`);
  
  // 示例：调用Supabase更新VIP状态
  // await supabase.rpc('update_user_vip_status', {
  //   target_user_id: callbackData.uid,
  //   new_is_vip: true,
  //   new_expire_at: product.code.includes('monthly') 
  //     ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
  //     : null, // 永久VIP无过期时间
  // });

  return {
    success: true,
  };
}

/**
 * 生成订单号（服务端使用）
 * 
 * @param userId 用户ID
 * @returns 唯一订单号
 */
export function generateOrderId(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `ORDER_${timestamp}_${userId}_${random}`;
}

// ==================== 类型定义 ====================

declare global {
  interface Window {
    MiPayBridge?: {
      pay: (paramsJson: string) => void;
      query: (orderId: string) => void;
    };
  }
}

export default {
  XIAOMI_PAY_CONFIG,
  triggerXiaomiPay,
  queryOrderStatus,
  verifyXiaomiPaymentSignature,
  handleXiaomiPaymentCallback,
  generateOrderId,
};