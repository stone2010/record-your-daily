'use client';

import { useState, useEffect } from 'react';
import { DiaryStats, UserProfile, Diary } from '@/types';
import localDB from '@/lib/localDatabase';
import CalendarView from './CalendarView';
import StatsPanel from './StatsPanel';
import HeatmapView from './HeatmapView';

interface SettingsPanelProps {
  diaries: Diary[];
  stats: DiaryStats | null;
  userProfile: UserProfile | null;
  isLoggedIn: boolean;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
  onLogin: () => void;
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
  onEditDiary: (diary: Diary) => void;
  filteredDiaries: Diary[];
}

type SettingsTab = 'home' | 'profile' | 'stats' | 'calendar' | 'heatmap' | 'about';

const AVATARS = ['👤', '😊', '😎', '🤗', '🦊', '🐱', '🐶', '🐼', '🌸', '🌙', '⭐', '🌈'];

interface MenuItem {
  key: SettingsTab;
  icon: string;
  title: string;
  desc: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'profile', icon: '👤', title: '个人资料', desc: '修改昵称、头像、个性签名' },
  { key: 'calendar', icon: '📅', title: '日历视图', desc: '按日期查看日记记录' },
  { key: 'heatmap', icon: '🔥', title: '热力日记', desc: '查看写作热力图' },
  { key: 'stats', icon: '📊', title: '数据统计', desc: '详细的写作数据分析' },
  { key: 'about', icon: 'ℹ️', title: '关于与设置', desc: '版本信息、数据管理' },
];

export default function SettingsPanel({
  diaries,
  stats,
  userProfile,
  isLoggedIn,
  onUpdateProfile,
  onLogout,
  onLogin,
  onSelectDate,
  selectedDate,
  onEditDiary,
  filteredDiaries,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('home');
  const [useDays, setUseDays] = useState(0);
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
    if (!firstUse) {
      await localDB.setSyncMeta('first_use_time', new Date().toISOString());
      setUseDays(1);
    } else {
      const days = Math.ceil(
        (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24)
      );
      setUseDays(Math.max(1, days));
    }
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

  const renderBackButton = () => (
    <button
      onClick={() => setActiveTab('home')}
      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
    >
      <span>←</span>
      <span className="font-medium">返回</span>
    </button>
  );

  if (activeTab === 'home') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">
              {isLoggedIn ? (userProfile?.avatar || '👤') : '👋'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {isLoggedIn ? (userProfile?.nickname || userProfile?.email || '用户') : '欢迎使用日记'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isLoggedIn ? `已使用 ${useDays} 天` : '登录后可同步数据到云端'}
              </p>
              <div className="flex gap-2 mt-3">
                {isLoggedIn ? (
                  <button
                    onClick={onLogout}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    退出登录
                  </button>
                ) : (
                  <button
                    onClick={onLogin}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    立即登录
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-xl mb-1">📝</div>
            <div className="text-xl font-semibold text-gray-900">{stats?.total_count || 0}</div>
            <div className="text-xs text-gray-500 mt-1">日记总数</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-xl mb-1">📖</div>
            <div className="text-xl font-semibold text-gray-900">
              {(stats?.total_words || 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">总字数</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-xl mb-1">🔥</div>
            <div className="text-xl font-semibold text-orange-500">{stats?.current_streak || 0}</div>
            <div className="text-xs text-gray-500 mt-1">连续天数</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-xl mb-1">⏱️</div>
            <div className="text-xl font-semibold text-blue-600">{useDays}</div>
            <div className="text-xs text-gray-500 mt-1">使用天数</div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 px-1">功能中心</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MENU_ITEMS.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:bg-gray-50 transition-colors flex items-center gap-4"
              >
                <div className="text-2xl">{item.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <span className="text-gray-400 text-lg">→</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pt-4">
          <p>日记本 v1.0 · 用心记录每一天</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'profile') {
    return (
      <div className="max-w-2xl mx-auto">
        {renderBackButton()}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">个人资料</h3>

          {!isLoggedIn ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🔒</div>
              <p className="text-gray-500 mb-3">登录后可编辑个人资料</p>
              <button
                onClick={onLogin}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                立即登录
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择头像</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(avatar => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`w-10 h-10 text-xl rounded-md transition-colors ${
                        selectedAvatar === avatar
                          ? 'bg-blue-100 ring-2 ring-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="给自己取个名字吧"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">个性签名</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  maxLength={100}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="写点什么介绍自己..."
                />
                <div className="text-right text-xs text-gray-400 mt-1">{bio.length}/100</div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存修改'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'calendar') {
    const selectedDayDiaries = selectedDate
      ? filteredDiaries.filter(d => !d.is_deleted)
      : [];

    return (
      <div className="max-w-5xl mx-auto">
        {renderBackButton()}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CalendarView
              diaries={diaries}
              onSelectDate={onSelectDate}
              selectedDate={selectedDate}
            />
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                {selectedDate ? `${selectedDate} 的日记` : '选择日期查看'}
              </h3>
              {selectedDate && selectedDayDiaries.length > 0 ? (
                <div className="space-y-2">
                  {selectedDayDiaries.map(diary => (
                    <div
                      key={diary.id}
                      onClick={() => onEditDiary(diary)}
                      className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-gray-900 text-sm">{diary.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{diary.content}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(diary.created_at).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              ) : selectedDate ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  这一天没有日记
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm">
                  点击日历上的日期查看当天日记
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'heatmap') {
    return (
      <div className="max-w-5xl mx-auto">
        {renderBackButton()}
        <HeatmapView
          diaries={diaries}
          onSelectDate={onSelectDate}
          selectedDate={selectedDate}
        />
      </div>
    );
  }

  if (activeTab === 'stats') {
    return (
      <div className="max-w-4xl mx-auto">
        {renderBackButton()}
        {stats && <StatsPanel stats={stats} />}
      </div>
    );
  }

  if (activeTab === 'about') {
    return (
      <div className="max-w-2xl mx-auto">
        {renderBackButton()}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">写作数据概览</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">本月日记</span>
                <span className="text-sm font-medium text-gray-900">{stats?.this_month_count || 0} 篇</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">本周日记</span>
                <span className="text-sm font-medium text-gray-900">{stats?.this_week_count || 0} 篇</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">今日日记</span>
                <span className="text-sm font-medium text-gray-900">{stats?.today_count || 0} 篇</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">平均字数</span>
                <span className="text-sm font-medium text-gray-900">{stats?.average_words || 0} 字/篇</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">最长连续</span>
                <span className="text-sm font-medium text-orange-500">{stats?.longest_streak || 0} 天</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">数据管理</h3>
            <div className="space-y-2">
              <button
                onClick={handleClearData}
                className="w-full py-2 px-3 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm"
              >
                🗑️ 清空所有本地数据
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 pt-4">
            <p>日记本 v1.0 · 用心记录每一天</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
