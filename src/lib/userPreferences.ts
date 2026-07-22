'use client';

export interface UserPreferences {
  // 随手记模式：开启后写日记不需要标题
  quickMode: boolean;
  // 自动同步：保存后自动同步到云端
  autoSync: boolean;
  // 编辑器字体大小
  editorFontSize: 'small' | 'medium' | 'large';
  // 主题色
  themeColor: 'blue' | 'green' | 'purple' | 'orange' | 'pink';
  // 默认日记本ID
  defaultNotebookId: string | null;
  // 启动页
  startupPage: 'home' | 'editor';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  quickMode: false,
  autoSync: true,
  editorFontSize: 'medium',
  themeColor: 'blue',
  defaultNotebookId: null,
  startupPage: 'home',
};

const STORAGE_KEY = 'diary_user_preferences';

export function getPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    console.error('读取用户偏好失败');
  }
  return DEFAULT_PREFERENCES;
}

export function setPreferences(prefs: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.error('保存用户偏好失败');
  }
}

export function resetPreferences(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export { DEFAULT_PREFERENCES };
