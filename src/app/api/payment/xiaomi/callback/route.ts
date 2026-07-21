import { NextRequest, NextResponse } from 'next/server';
import { handleXiaomiPaymentCallback } from '@/services/xiaomiPayment';

/**
 * 小米支付回调接口
 * 
 * ⚠️ 这是一个占位符实现
 * 实际部署时需要：
 * 1. 使用真实的Supabase Service Role Key（而非Anon Key）
 * 2. 实现签名验证
 * 3. 添加防重复处理逻辑
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[小米支付回调] 接收到回调数据:', body);

    // 验证必要字段
    const { appId, cpOrderId, uid, productCode, orderStatus, signature } = body;

    if (!appId || !cpOrderId || !uid || !productCode || !orderStatus || !signature) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 处理支付回调
    const result = await handleXiaomiPaymentCallback({
      appId,
      cpOrderId,
      uid,
      productCode,
      orderStatus,
      signature,
    });

    if (result.success) {
      console.log(`[小米支付回调] 订单 ${cpOrderId} 处理成功`);
      
      // ⚠️ 实际实现需要：
      // 1. 更新Supabase profiles表，设置is_vip=true
      // 2. 根据商品类型设置vip_expire_at（月订阅=30天后，永久=null）
      // 3. 记录支付流水到payments表
      // 4. 发送邮件通知用户

      // 返回小米要求的成功响应
      return NextResponse.json({
        errcode: 200,
        errMsg: 'success',
      });
    } else {
      console.error(`[小米支付回调] 订单 ${cpOrderId} 处理失败:`, result.error);
      
      return NextResponse.json({
        errcode: 500,
        errMsg: result.error || '处理失败',
      });
    }
  } catch (error) {
    console.error('[小米支付回调] 处理异常:', error);
    
    return NextResponse.json(
      { errcode: 500, errMsg: '服务器内部错误' },
      { status: 500 }
    );
  }
}