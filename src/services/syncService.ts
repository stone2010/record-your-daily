import { Diary, UserProfile, SyncResponse } from '@/types';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';
import localDB from '@/lib/localDatabase';

const SYNC_THROTTLE_MS = 10 * 1000;

let lastSyncTime = 0;
let syncInProgress = false;

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

export async function getUserProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;

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

  if (profile.vip_expire_at) {
    const expireTime = new Date(profile.vip_expire_at).getTime();
    const now = Date.now();
    if (expireTime <= now) {
      return false;
    }
  }

  return true;
}

export async function syncToCloud(): Promise<SyncResponse> {
  if (!supabase) {
    return {
      success: false,
      synced_count: 0,
      error: 'Supabase未配置，请检查环境变量',
    };
  }

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

  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      success: false,
      synced_count: 0,
      error: '请先登录',
    };
  }

  const isVip = await isActiveVip();
  if (!isVip) {
    return {
      success: false,
      synced_count: 0,
      error: 'VIP_REQUIRED',
    };
  }

  const profile = await getUserProfile();
  if (profile?.is_banned) {
    return {
      success: false,
      synced_count: 0,
      error: '您的账号已被封禁，无法同步数据',
    };
  }

  syncInProgress = true;
  lastSyncTime = Date.now();

  try {
    const unsyncedDiaries = await localDB.getUnsyncedDiaries();

    if (unsyncedDiaries.length === 0) {
      return {
        success: true,
        synced_count: 0,
      };
    }

    const diariesToSync = unsyncedDiaries.map((diary) => ({
      ...diary,
      user_id: userId,
    }));

    const { error } = await supabase
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

    const syncedIds = unsyncedDiaries.map((d) => d.id);
    await localDB.markAsSynced(syncedIds);

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

export async function pullFromCloud(): Promise<SyncResponse> {
  if (!supabase) {
    return {
      success: false,
      synced_count: 0,
      error: 'Supabase未配置',
    };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      success: false,
      synced_count: 0,
      error: '请先登录',
    };
  }

  const isVip = await isActiveVip();
  if (!isVip) {
    return {
      success: false,
      synced_count: 0,
      error: 'VIP_REQUIRED',
    };
  }

  const profile = await getUserProfile();
  if (profile?.is_banned) {
    return {
      success: false,
      synced_count: 0,
      error: '您的账号已被封禁',
    };
  }

  try {
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

    await localDB.upsertDiaries(serverDiaries);

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

export async function fullSync(): Promise<SyncResponse> {
  const pushResult = await syncToCloud();
  
  if (!pushResult.success) {
    return pushResult;
  }

  const pullResult = await pullFromCloud();

  return {
    success: pullResult.success,
    synced_count: pushResult.synced_count + pullResult.synced_count,
    server_diaries: pullResult.server_diaries,
    error: pullResult.error,
  };
}

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