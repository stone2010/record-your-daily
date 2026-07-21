'use client';

import { useState } from 'react';
import { XIAOMI_PAY_CONFIG, triggerXiaomiPay } from '@/services/xiaomiPayment';

interface VIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess?: () => void;
}

export default function VIPModal({ isOpen, onClose, userId, onSuccess }: VIPModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('LIFETIME_VIP');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const products = Object.entries(XIAOMI_PAY_CONFIG.products).map(([key, product]) => ({
    key,
    ...product,
  }));

  const handlePayment = async () => {
    if (!userId) {
      alert('请先登录');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await triggerXiaomiPay(selectedProduct, userId);
      
      if (result.status === 'PENDING_CALLBACK') {
        // 在实际应用中，这里应该轮询查询订单状态
        // 或者等待服务端通过WebSocket推送支付结果
        alert(`支付请求已提交！订单号：${result.orderId}\n\n实际应用中，支付结果将由服务端异步通知确认。`);
        onSuccess?.();
      }
    } catch (error) {
      console.error('支付失败:', error);
      alert('支付失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* 头部 */}
        <div className="relative bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors p-1"
            aria-label="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⭐</span>
            <h2 className="text-2xl font-bold">解锁云同步</h2>
          </div>
          <p className="text-sm text-white/90">
            升级为VIP，享受跨设备云端同步
          </p>
        </div>

        {/* 功能列表 */}
        <div className="p-6 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">VIP专属权益</h3>
          <ul className="space-y-2">
            {[
              '云端数据备份，永不丢失',
              '多设备实时同步',
              '优先技术支持',
              '永久买断或按月订阅',
            ].map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* 商品选择 */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">选择方案</h3>
          <div className="space-y-3">
            {products.map((product) => (
              <button
                key={product.key}
                onClick={() => setSelectedProduct(product.key)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedProduct === product.key
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-600">￥{product.price}</p>
                    {product.key === 'LIFETIME_VIP' && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                        推荐
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 购买按钮 */}
          <button
            onClick={handlePayment}
            disabled={isProcessing || !userId}
            className="w-full mt-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                处理中...
              </>
            ) : (
              '立即开通'
            )}
          </button>

          {/* 说明 */}
          <p className="mt-4 text-xs text-gray-500 text-center">
            支付将通过小米应用内支付完成
            <br />
            付款后立即生效
          </p>
        </div>
      </div>
    </div>
  );
}