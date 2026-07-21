import { supabase } from '@/lib/supabaseClient';
import { localAuth } from './localAuth';
import { UserProfile } from '@/types';

export type AuthMode = 'cloud' | 'local';

async function getAuthMode(): Promise<AuthMode> {
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) return 'cloud';
    } catch {
      // ignore
    }
  }
  
  const localUser = await localAuth.getCurrentUser();
  if (localUser) return 'local';
  
  return supabase ? 'cloud' : 'local';
}

async function getCloudProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      return {
        id: profile.id,
        email: profile.email || user.email || '',
        nickname: profile.nickname,
        avatar: profile.avatar,
        bio: profile.bio,
        is_vip: profile.is_vip || false,
        vip_expire_at: profile.vip_expire_at,
        is_banned: profile.is_banned || false,
        created_at: profile.created_at,
      };
    }

    return {
      id: user.id,
      email: user.email || '',
      is_vip: false,
      is_banned: false,
      created_at: user.created_at,
    };
  } catch (error) {
    console.error('[Auth] 获取云端Profile失败:', error);
    return null;
  }
}

export const authService = {
  async signUp(email: string, password: string, nickname?: string): Promise<{ user: UserProfile | null; error?: string }> {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nickname: nickname || email.split('@')[0],
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            return { user: null, error: '该邮箱已被注册，请直接登录' };
          }
          console.warn('[Auth] 云端注册失败，降级到本地:', error.message);
        } else if (data.user) {
          const profile = await getCloudProfile();
          if (profile) return { user: profile };
        }
      } catch (error) {
        console.warn('[Auth] 云端注册异常，降级到本地:', error);
      }
    }

    return localAuth.signUp(email, password, nickname);
  },

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error?: string }> {
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.warn('[Auth] 云端登录失败，尝试本地:', error.message);
        } else if (data.user) {
          const profile = await getCloudProfile();
          if (profile) {
            if (profile.is_banned) {
              await supabase.auth.signOut();
              return { user: null, error: '账号已被封禁' };
            }
            return { user: profile };
          }
        }
      } catch (error) {
        console.warn('[Auth] 云端登录异常，尝试本地:', error);
      }
    }

    return localAuth.signIn(email, password);
  },

  async signOut(): Promise<void> {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.warn('[Auth] 云端登出失败:', error);
      }
    }
    await localAuth.signOut();
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    if (supabase) {
      try {
        const profile = await getCloudProfile();
        if (profile) return profile;
      } catch (error) {
        console.warn('[Auth] 获取云端用户失败:', error);
      }
    }

    return localAuth.getCurrentUser();
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const mode = await getAuthMode();
    
    if (mode === 'cloud' && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .update({
              nickname: updates.nickname,
              avatar: updates.avatar,
              bio: updates.bio,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .select()
            .single();

          if (data) {
            return {
              id: data.id,
              email: data.email,
              nickname: data.nickname,
              avatar: data.avatar,
              bio: data.bio,
              is_vip: data.is_vip,
              vip_expire_at: data.vip_expire_at,
              is_banned: data.is_banned,
              created_at: data.created_at,
            };
          }
        }
      } catch (error) {
        console.warn('[Auth] 云端更新Profile失败:', error);
      }
    }

    return localAuth.updateProfile(updates);
  },

  async getAuthModeInfo(): Promise<{ mode: AuthMode; hasCloudConfig: boolean }> {
    const mode = await getAuthMode();
    return {
      mode,
      hasCloudConfig: !!supabase,
    };
  },
};

export default authService;
