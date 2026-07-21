import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error(
    '[Supabase配置错误] SUPABASE_SERVICE_ROLE_KEY 未配置',
    '\n此密钥必须配置在服务端环境变量中，且绝对不能暴露给前端'
  );
}

const adminClientOptions: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  adminClientOptions
);

export async function POST(request: NextRequest) {
  try {
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('[同步API] Token验证失败:', authError);
      return NextResponse.json(
        { success: false, error: '无效的访问令牌' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[同步API] 用户档案不存在:', profileError);
      return NextResponse.json(
        { success: false, error: '用户档案不存在' },
        { status: 404 }
      );
    }

    if (profile.is_banned) {
      return NextResponse.json(
        { success: false, error: '您的账号已被封禁' },
        { status: 403 }
      );
    }

    if (!profile.is_vip) {
      return NextResponse.json(
        { success: false, error: 'VIP_REQUIRED' },
        { status: 403 }
      );
    }

    if (profile.vip_expire_at && new Date(profile.vip_expire_at) <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'VIP已过期，请续费' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { diaries, last_sync_at } = body;

    if (!diaries || !Array.isArray(diaries)) {
      return NextResponse.json(
        { success: false, error: '无效的请求数据' },
        { status: 400 }
      );
    }

    for (const diary of diaries) {
      if (!diary.id || !diary.title || !diary.content) {
        return NextResponse.json(
          { success: false, error: '日记数据格式错误' },
          { status: 400 }
        );
      }

      if (diary.content.length > 20000) {
        return NextResponse.json(
          { success: false, error: '日记内容超过限制' },
          { status: 400 }
        );
      }
    }

    const diariesWithUserId = diaries.map((diary: any) => ({
      ...diary,
      user_id: user.id,
    }));

    const { error } = await supabaseAdmin
      .from('diaries')
      .upsert(diariesWithUserId, {
        onConflict: 'id',
      });

    if (error) {
      console.error('[同步API] 数据库操作失败:', error);
      return NextResponse.json(
        { success: false, error: `同步失败: ${error.message}` },
        { status: 500 }
      );
    }

    let serverDiaries: any[] = [];
    if (last_sync_at) {
      const { data: serverData } = await supabaseAdmin
        .from('diaries')
        .select('*')
        .eq('user_id', user.id)
        .gt('updated_at', last_sync_at);

      serverDiaries = serverData || [];
    }

    return NextResponse.json({
      success: true,
      synced_count: diaries.length,
      server_diaries: serverDiaries,
    });
  } catch (error) {
    console.error('[同步API] 异常:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}