'use client';

import { useState, useEffect } from 'react';
import { DiaryStats, UserProfile } from '@/types';
import localDB from '@/lib/localDatabase';

interface SettingsPanelProps {
  stats: DiaryStats | null;
  userProfile: UserProfile | null;
  isLoggedIn: boolean;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
  onLogin: () => void;
}

const AVATARS = ['👤', '😊', '😎', '🤗', '🦊', '🐱', '🐶', '🐼', '🌸', '🌙', '⭐', '🌈'];

export default function SettingsPanel({
  stats,
  userProfile,
  isLoggedIn,
  onUpdateProfile,
  onLogout,
  onLogin,
}: SettingsPanelProps) {
  const [useDays, setUseDays] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setNickname(userProfile.nickname || '');
      setBio(userProfile.bio || '');
      setSelectedAvatar(userProfile.avatar || '👤');
    }
  }, [userProfile]);

  useEffect(() => {
    loadUsageStats();
  }, []);

  const loadUsageStats = async () => {
    const firstUse = await localDB.getSyncMeta('first_use_time');
    const totalSeconds = await localDB.getSyncMeta('total_use_seconds');
    
    if (!firstUse) {
      await localDB.setSyncMeta('first_use_time', new Date().toISOString());
      setUseDays(1);
    } else {
      const days = Math.ceil(
        (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24)
      );
      setUseDays(Math.max(1, days));
    }
    
    setTotalTime(parseInt(totalSeconds || '0', 10));
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor(((seconds % 3600) / 60));
    if (hours > 0) {
      return `${hours}小时${Math.round(mins)}分钟`;
    }
    return `${Math.round(mins)}分钟`;
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile({
        nickname: nickname.trim(),
        bio: bio.trim(),
        avatar: selectedAvatar,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearData = () => {
    if (!confirm('确定要清空所有本地数据吗？此操作不可恢复！')) return;
    if (!confirm('真的确定吗？所有日记都会消失！')) return;
    localDB.clearAllData();
    location.reload();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="text-7xl">
            {isLoggedIn ? (userProfile?.avatar || '👤') : '👋'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">
              {isLoggedIn ? (userProfile?.nickname || userProfile?.email || '用户') : '欢迎使用日记'}
            </h2>
            <p className="text-white/80 mt-1">
              {isLoggedIn
                ? `已使用 ${useDays} 天`
                : '登录后可同步数据到云端'}
            </p>
            <div className="flex gap-3 mt-4">
              {isLoggedIn ? (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm font-medium"
                >
                  退出登录
                </button>
              ) : (
                <button
                  onClick={onLogin}
                  className="px-4 py-2 bg-white text-purple-600 rounded-xl hover:bg-white/90 transition-all text-sm font-medium"
                >
                  立即登录
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
          <div className="text-3xl mb-1">📝</div>
          <div className="text-2xl font-bold text-gray-800">{stats?.total_count || 0}</div>
          <div className="text-xs text-gray-400 mt-1">日记总数</div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
          <div className="text-3xl mb-1">📖</div>
          <div className="text-2xl font-bold text-gray-800">
            {(stats?.total_words || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">总字数</div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
          <div className="text-3xl mb-1">🔥</div>
          <div className="text-2xl font-bold text-orange-500">{stats?.current_streak || 0}</div>
          <div className="text-xs text-gray-400 mt-1">连续天数</div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
          <div className="text-3xl mb-1">⏱️</div>
          <div className="text-2xl font-bold text-indigo-500">{useDays}</div>
          <div className="text-xs text-gray-400 mt-1">使用天数</div>
        </div>
      </div>

      {isLoggedIn && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
            <span>👤</span>
            个人资料
          </h3>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-3">选择头像</label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map(avatar => (
                  <button
                    key={avatar}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`w-10 h-10 text-2xl rounded-xl transition-all ${
                      selectedAvatar === avatar
                        ? 'bg-indigo-100 ring-2 ring-indigo-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                maxLength={20}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="给自己取个名字吧"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">个性签名</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={100}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="写点什么介绍自己..."
              />
              <div className="text-right text-xs text-gray-400 mt-1">{bio.length}/100</div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all font-medium disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span>📊</span>
          写作数据概览
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">本月日记</span>
            <span className="font-semibold text-gray-800">{stats?.this_month_count || 0} 篇</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">本周日记</span>
            <span className="font-semibold text-gray-800">{stats?.this_week_count || 0} 篇</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">今日日记</span>
            <span className="font-semibold text-gray-800">{stats?.today_count || 0} 篇</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">平均字数</span>
            <span className="font-semibold text-gray-800">{stats?.average_words || 0} 字/篇</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">最长连续</span>
            <span className="font-semibold text-orange-500">{stats?.longest_streak || 0} 天</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span>⚙️</span>
          其他设置
        </h3>
        <div className="space-y-3">
          <button
            onClick={handleClearData}
            className="w-full py-3 px-4 text-left text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm"
          >
            🗑️ 清空所有本地数据
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 pb-8">
        <p>日记本 v1.0 · 用心记录每一天</p>
        <p className="mt-1">数据存储在本地浏览器，登录后可同步至云端</p>
      </div>
    </div>
  );
}
