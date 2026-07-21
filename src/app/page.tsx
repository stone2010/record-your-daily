'use client';

import { useState, useEffect } from 'react';
import { Diary, Notebook, DiaryStats, UserProfile as UserProfileType } from '@/types';
import localDB from '@/lib/localDatabase';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';
import { fullSync, getUserProfile, isActiveVip, getSyncStatus } from '@/services/syncService';
import DiaryEditor from '@/components/DiaryEditor';
import VIPModal from '@/components/VIPModal';
import SyncButton from '@/components/SyncButton';
import DiaryCard from '@/components/DiaryCard';
import AuthModal from '@/components/AuthModal';
import UserProfileModal from '@/components/UserProfile';
import NotebookSidebar from '@/components/NotebookSidebar';
import CalendarView from '@/components/CalendarView';
import StatsPanel from '@/components/StatsPanel';

type ViewMode = 'list' | 'calendar' | 'stats';

export default function HomePage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showEditor, setShowEditor] = useState(false);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [localDiaries, localNotebooks, localStats] = await Promise.all([
        localDB.getAllDiaries(),
        localDB.getAllNotebooks(),
        localDB.getStats(),
      ]);
      setDiaries(localDiaries);
      setNotebooks(localNotebooks);
      setStats(localStats);

      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const uid = await getCurrentUserId();
      if (uid) {
        setIsLoggedIn(true);
        setUserId(uid);

        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }

        const profile = await getUserProfile();
        if (profile) {
          setUserProfile(profile);
        }

        const vipStatus = await isActiveVip();
        setIsVip(vipStatus);

        const syncStatus = await getSyncStatus();
        setPendingCount(syncStatus.pending_changes);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    loadInitialData();
  };

  const handleLogout = async () => {
    if (!supabase) return;
    if (!confirm('确定要退出登录吗？')) return;
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsVip(false);
    setUserEmail('');
    setUserId('');
    setUserProfile(null);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfileType>) => {
    if (!supabase || !userProfile) return;
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', userProfile.id);
      if (!error) {
        setUserProfile(prev => prev ? { ...prev, ...updates } : null);
        alert('资料更新成功！');
      }
    } catch (error) {
      console.error('更新资料失败:', error);
      alert('更新失败，请重试');
    }
  };

  const handleCreateDiary = () => {
    setEditingDiary(null);
    setShowEditor(true);
  };

  const handleEditDiary = (diary: Diary) => {
    setEditingDiary(diary);
    setShowEditor(true);
  };

  const handleSaveDiary = async (data: { title: string; content: string }) => {
    setIsSaving(true);
    try {
      const defaultNb = await localDB.getDefaultNotebook();
      const notebookId = editingDiary?.notebook_id || selectedNotebookId || defaultNb.id;

      if (editingDiary) {
        await localDB.updateDiary(editingDiary.id, { ...data, notebook_id: notebookId });
      } else {
        await localDB.createDiary(data.title, data.content, userId || undefined, notebookId);
      }

      const [updatedDiaries, updatedStats] = await Promise.all([
        localDB.getAllDiaries(),
        localDB.getStats(),
      ]);
      setDiaries(updatedDiaries);
      setStats(updatedStats);

      const count = await localDB.countUnsynced();
      setPendingCount(count);

      setShowEditor(false);
      setEditingDiary(null);
    } catch (error) {
      console.error('保存失败:', error);
      alert(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDiary = async (id: string) => {
    if (!confirm('确定要删除这篇日记吗？')) return;
    try {
      await localDB.deleteDiary(id);
      const [updatedDiaries, updatedStats] = await Promise.all([
        localDB.getAllDiaries(),
        localDB.getStats(),
      ]);
      setDiaries(updatedDiaries);
      setStats(updatedStats);
      const count = await localDB.countUnsynced();
      setPendingCount(count);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await fullSync();
      if (result.success) {
        alert(`同步成功！已同步 ${result.synced_count} 条日记`);
        const [updatedDiaries, updatedStats] = await Promise.all([
          localDB.getAllDiaries(),
          localDB.getStats(),
        ]);
        setDiaries(updatedDiaries);
        setStats(updatedStats);
        const count = await localDB.countUnsynced();
        setPendingCount(count);
      } else if (result.error === 'VIP_REQUIRED') {
        setShowVipModal(true);
      } else {
        alert(`同步失败: ${result.error}`);
      }
    } catch (error) {
      console.error('同步失败:', error);
      alert('同步失败，请重试');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateNotebook = async (name: string, color: string, icon: string) => {
    const nb = await localDB.createNotebook(name, color, icon, userId || undefined);
    setNotebooks(prev => [...prev, nb]);
  };

  const handleSelectNotebook = (id: string | null) => {
    setSelectedNotebookId(id);
    setSelectedDate(null);
    setMobileMenuOpen(false);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date === selectedDate ? null : date);
    setSelectedNotebookId(null);
  };

  const filteredDiaries = diaries.filter(diary => {
    if (selectedNotebookId && diary.notebook_id !== selectedNotebookId) return false;
    if (selectedDate) {
      const diaryDate = new Date(diary.created_at).toISOString().split('T')[0];
      return diaryDate === selectedDate;
    }
    return true;
  });

  const selectedNotebook = notebooks.find(n => n.id === selectedNotebookId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary-200 rounded-full animate-spin" />
            <div className="absolute inset-0 w-20 h-20 border-4 border-primary-500 rounded-full animate-spin border-t-transparent" />
          </div>
          <p className="text-gray-500 mt-4 text-lg">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {showSidebar && (
        <div className="hidden lg:flex">
          <NotebookSidebar
            notebooks={notebooks}
            selectedNotebookId={selectedNotebookId}
            onSelect={handleSelectNotebook}
            onCreate={handleCreateNotebook}
          />
        </div>
      )}

      <div className={`flex-1 ${showSidebar ? 'lg:ml-64' : ''}`}>
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <span className="text-xl">☰</span>
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📔</div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    我的日记
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📝 列表
                  </button>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      viewMode === 'calendar' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📅 日历
                  </button>
                  <button
                    onClick={() => setViewMode('stats')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      viewMode === 'stats' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📊 统计
                  </button>
                </div>

                <SyncButton
                  isVip={isVip}
                  isLoggedIn={isLoggedIn}
                  isSyncing={isSyncing}
                  pendingCount={pendingCount}
                  onSync={handleSync}
                  onShowVipModal={() => setShowVipModal(true)}
                  onLogin={handleLogin}
                />

                {isLoggedIn ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg hover:shadow-lg transition-all"
                    >
                      {userProfile?.avatar || userEmail.charAt(0).toUpperCase()}
                    </button>
                    <div className="hidden sm:block">
                      <div className="text-sm font-medium text-gray-800">
                        {userProfile?.nickname || userEmail}
                        {isVip && <span className="ml-1 text-amber-500">⭐</span>}
                      </div>
                      <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600">
                        退出
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleLogin}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      登录
                    </button>
                    <button
                      onClick={handleRegister}
                      className="text-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                    >
                      注册
                    </button>
                  </div>
                )}
              </div>
            </div>

            {selectedNotebook && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <span>{selectedNotebook.icon}</span>
                <span>{selectedNotebook.name}</span>
                <button onClick={() => setSelectedNotebookId(null)} className="text-primary-500 hover:text-primary-600">
                  清除筛选
                </button>
              </div>
            )}

            {selectedDate && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <span>📅</span>
                <span>{selectedDate}</span>
                <button onClick={() => setSelectedDate(null)} className="text-primary-500 hover:text-primary-600">
                  清除筛选
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {viewMode === 'list' && (
            <>
              {filteredDiaries.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-8xl mb-6">📝</div>
                  <h2 className="text-2xl font-bold text-gray-700 mb-2">还没有日记</h2>
                  <p className="text-gray-500 mb-8">点击下方按钮，写下你的第一篇日记</p>
                  <button
                    onClick={handleCreateDiary}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl text-lg font-medium"
                  >
                    写日记
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredDiaries.map((diary) => {
                    const nb = notebooks.find(n => n.id === diary.notebook_id);
                    return (
                      <DiaryCard
                        key={diary.id}
                        diary={diary}
                        notebook={nb}
                        onEdit={handleEditDiary}
                        onDelete={handleDeleteDiary}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {viewMode === 'calendar' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CalendarView
                  diaries={diaries}
                  onSelectDate={handleSelectDate}
                  selectedDate={selectedDate}
                />
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span>📅</span>
                    {selectedDate ? `${selectedDate} 的日记` : '选择日期查看'}
                  </h3>
                  {selectedDate && filteredDiaries.length > 0 ? (
                    <div className="space-y-3">
                      {filteredDiaries.map((diary) => (
                        <div
                          key={diary.id}
                          onClick={() => handleEditDiary(diary)}
                          className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                        >
                          <div className="font-medium text-gray-800">{diary.title}</div>
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">{diary.content}</div>
                          <div className="text-xs text-gray-400 mt-2">{new Date(diary.created_at).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : selectedDate ? (
                    <div className="text-center py-8 text-gray-400">
                      这一天没有日记
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      点击日历上的日期查看当天日记
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'stats' && stats && (
            <StatsPanel stats={stats} />
          )}
        </main>

        <button
          onClick={handleCreateDiary}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center text-2xl z-50 hover:scale-110"
          aria-label="新建日记"
        >
          +
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white h-full">
            <NotebookSidebar
              notebooks={notebooks}
              selectedNotebookId={selectedNotebookId}
              onSelect={handleSelectNotebook}
              onCreate={handleCreateNotebook}
            />
          </div>
        </div>
      )}

      {showEditor && (
        <DiaryEditor
          diary={editingDiary || undefined}
          mode={editingDiary ? 'edit' : 'create'}
          onSave={handleSaveDiary}
          onCancel={() => {
            setShowEditor(false);
            setEditingDiary(null);
          }}
          isSaving={isSaving}
        />
      )}

      <VIPModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        userId={userId}
        onSuccess={() => {
          setShowVipModal(false);
          loadInitialData();
        }}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      <UserProfileModal
        profile={userProfile}
        onUpdate={handleUpdateProfile}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
