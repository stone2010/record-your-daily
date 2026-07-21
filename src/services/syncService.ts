import { Diary, UserProfile, SyncResponse } from '@/types';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';
import localDB from '@/lib/localDatabase';

// 限流配置
const SYNC_THROTTLE_MS = 10 * 1000; // 10秒

// 限流状态管理
let lastSyncTime = 0;
let syncInProgress = false;

/**
 * 检查同步限流
 */
function checkSyncThrottle(): { allowed: boolean; waitTime?: number } {
  const now = Date.now();
  const timeSinceLastSync = now - lastSyncTime;

  if (syncInProgress) {
    return { allowed: false, waitTime: 0 };
  }

  if (timeSinceLastSync < SYNC_THROTTLE_MS) {
    const waitTime = SYNC_THROTTLE_MS - timeSinceLastSync;
    return { allowed: false, waitTime };
  }

  return { allowed: true };
}

/**
 * 获取用户档案（包含VIP状态）
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('获取用户档案失败:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('获取用户档案异常:', error);
    return null;
  }
}

/**
 * 检查用户是否为活跃VIP
 */
export async function isActiveVip(): Promise<boolean> {
  const profile = await getUserProfile();
  
  if (!profile) {
    return false;
  }

  if (profile.is_banned) {
    return false;
  }

  if (!profile.is_vip) {
    return false;
  }

  // 检查VIP是否过期（如果有过期时间）
  if (profile.vip_expire_at) {
    const expireTime = new Date(profile.vip_expire_at).getTime();
    const now = Date.now();
    if (expireTime <= now) {
      return false;
    }
  }

  return true;
}

/**
 * 同步本地日记到云端（仅VIP可用）
 */
export async function syncToCloud(): Promise<SyncResponse> {
  // 1. 检查限流
  const throttleCheck = checkSyncThrottle();
  if (!throttleCheck.allowed) {
    return {
      success: false,
      synced_count: 0,
      error: throttleCheck.waitTime 
        ? `请等待${Math.ceil(throttleCheck.waitTime / 1000)}秒后重试`
        : '同步正在进行中',
    };
  }

  // 2. 检查登录状态
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      success: false,
      synced_count: 0,
      error: '请先登录',
    };
  }

  // 3. 检查VIP状态
  const isVip = await isActiveVip();
  if (!isVip) {
    return {
      success: false,
      synced_count: 0,
      error: 'VIP_REQUIRED', // 特殊错误码，前端用于弹出VIP订阅弹窗
    };
  }

  // 4. 检查用户是否被封禁
  const profile = await getUserProfile();
  if (profile?.is_banned) {
    return {
      success: false,
      synced_count: 0,
      error: '您的账号已被封禁，无法同步数据',
    };
  }

  // 5. 开始同步
  syncInProgress = true;
  lastSyncTime = Date.now();

  try {
    // 获取未同步的日记
    const unsyncedDiaries = await localDB.getUnsyncedDiaries();

    if (unsyncedDiaries.length === 0) {
      return {
        success: true,
        synced_count: 0,
      };
    }

    // 准备同步数据（添加用户ID）
    const diariesToSync = unsyncedDiaries.map((diary) => ({
      ...diary,
      user_id: userId,
    }));

    // 批量插入或更新到Supabase
    const { data, error } = await supabase
      .from('diaries')
      .upsert(diariesToSync, {
        onConflict: 'id',
      });

    if (error) {
      console.error('同步到云端失败:', error);
      return {
        success: false,
        synced_count: 0,
        error: `同步失败: ${error.message}`,
      };
    }

    // 标记本地日记为已同步
    const syncedIds = unsyncedDiaries.map((d) => d.id);
    await localDB.markAsSynced(syncedIds);

    // 更新最后同步时间
    const now = new Date().toISOString();
    await localDB.setLastSyncAt(now);

    return {
      success: true,
      synced_count: unsyncedDiaries.length,
    };
  } catch (error) {
    console.error('同步异常:', error);
    return {
      success: false,
      synced_count: 0,
      error: `同步异常: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * 从云端拉取日记到本地（仅VIP可用）
 */
export async function pullFromCloud(): Promise<SyncResponse> {
  // 1. 检查登录状态
  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      success: false,
      synced_count: 0,
      error: '请先登录',
    };
  }

  // 2. 检查VIP状态
  const isVip = await isActiveVip();
  if (!isVip) {
    return {
      success: false,
      synced_count: 0,
      error: 'VIP_REQUIRED',
    };
  }

  // 3. 检查用户是否被封禁
  const profile = await getUserProfile();
  if (profile?.is_banned) {
    return {
      success: false,
      synced_count: 0,
      error: '您的账号已被封禁',
    };
  }

  try {
    // 从Supabase获取所有日记
    const { data: serverDiaries, error } = await supabase
      .from('diaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('从云端拉取失败:', error);
      return {
        success: false,
        synced_count: 0,
        error: `拉取失败: ${error.message}`,
      };
    }

    if (!serverDiaries || serverDiaries.length === 0) {
      return {
        success: true,
        synced_count: 0,
      };
    }

    // 合并到本地数据库（保留本地更新的版本）
    await localDB.upsertDiaries(serverDiaries);

    // 更新最后同步时间
    const now = new Date().toISOString();
    await localDB.setLastSyncAt(now);

    return {
      success: true,
      synced_count: serverDiaries.length,
      server_diaries: serverDiaries,
    };
  } catch (error) {
    console.error('拉取异常:', error);
    return {
      success: false,
      synced_count: 0,
      error: `拉取异常: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 完整双向同步（先推后拉）
 */
export async function fullSync(): Promise<SyncResponse> {
  // 1. 先推送本地更改到云端
  const pushResult = await syncToCloud();
  
  if (!pushResult.success) {
    return pushResult;
  }

  // 2. 再从云端拉取最新数据
  const pullResult = await pullFromCloud();

  // 返回综合结果
  return {
    success: pullResult.success,
    synced_count: pushResult.synced_count + pullResult.synced_count,
    server_diaries: pullResult.server_diaries,
    error: pullResult.error,
  };
}

/**
 * 获取同步状态
 */
export async function getSyncStatus() {
  const lastSyncAt = await localDB.getLastSyncAt();
  const pendingChanges = await localDB.countUnsynced();

  return {
    last_sync_at: lastSyncAt,
    pending_changes: pendingChanges,
    is_syncing: syncInProgress,
  };
}

export default {
  syncToCloud,
  pullFromCloud,
  fullSync,
  getUserProfile,
  isActiveVip,
  getSyncStatus,
};