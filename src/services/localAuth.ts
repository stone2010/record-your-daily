import { UserProfile } from '@/types';

const STORAGE_KEY = 'diary_local_users';
const SESSION_KEY = 'diary_local_session';

interface LocalUser {
  id: string;
  email: string;
  password: string;
  profile: UserProfile;
  created_at: string;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function getUsers(): LocalUser[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveUsers(users: LocalUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

function setSession(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, userId);
}

function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

function generateId(): string {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

export const localAuth = {
  async signUp(email: string, password: string, nickname?: string): Promise<{ user: UserProfile | null; error?: string }> {
    const users = getUsers();
    
    if (users.find(u => u.email === email)) {
      return { user: null, error: '该邮箱已被注册，请直接登录' };
    }

    const id = generateId();
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id,
      email,
      nickname: nickname || email.split('@')[0],
      avatar: '👤',
      bio: '',
      is_vip: true,
      is_banned: false,
      created_at: now,
    };

    const newUser: LocalUser = {
      id,
      email,
      password: hashPassword(password),
      profile,
      created_at: now,
    };

    users.push(newUser);
    saveUsers(users);
    setSession(id);

    return { user: profile };
  },

  async signIn(email: string, password: string): Promise<{ user: UserProfile | null; error?: string }> {
    const users = getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      return { user: null, error: '该邮箱尚未注册' };
    }

    if (user.password !== hashPassword(password)) {
      return { user: null, error: '邮箱或密码错误' };
    }

    if (user.profile.is_banned) {
      return { user: null, error: '账号已被封禁' };
    }

    setSession(user.id);
    return { user: user.profile };
  },

  async signOut(): Promise<void> {
    clearSession();
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const userId = getSession();
    if (!userId) return null;

    const users = getUsers();
    const user = users.find(u => u.id === userId);
    return user?.profile || null;
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const userId = getSession();
    if (!userId) return null;

    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;

    users[userIndex].profile = {
      ...users[userIndex].profile,
      ...updates,
    };
    saveUsers(users);

    return users[userIndex].profile;
  },

  isLocalMode(): boolean {
    const hasConfig = typeof window !== 'undefined' && window.__NEXT_DATA__?.props?.pageProps?.hasSupabase;
    return !hasConfig;
  },
};

export default localAuth;
