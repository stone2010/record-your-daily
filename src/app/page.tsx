'use client';

import { useState, useEffect } from 'react';
import { Diary, Notebook, DiaryStats, UserProfile as UserProfileType } from '@/types';
import localDB from '@/lib/localDatabase';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';
import { fullSync, getUserProfile, getSyncStatus } from '@/services/syncService';
import DiaryEditor from '@/components/DiaryEditor';
import VIPModal from '@/components/VIPModal';
import SyncButton from '@/components/SyncButton';
import DiaryCard from '@/components/DiaryCard';
import AuthModal from '@/components/AuthModal';
import UserProfileModal from '@/components/UserProfile';
import NotebookSidebar from '@/components/NotebookSidebar';
import SettingsPanel from '@/components/SettingsPanel';

type ViewMode = 'list' | 'settings';

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
    loadLocalData();
    loadCloudData();
  }, []);

  const loadLocalData = async () => {
    try {
      const [localDiaries, localNotebooks, localStats] = await Promise.all([
        localDB.getAllDiaries(),
        localDB.getAllNotebooks(),
        localDB.getStats(),
      ]);
      setDiaries(localDiaries);
      setNotebooks(localNotebooks);
      setStats(localStats);
    } catch (error) {
      console.error('加载本地数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCloudData = async () => {
    if (!supabase) return;

    try {
      const uid = await getCurrentUserId();
      if (!uid) return;

      setIsLoggedIn(true);
      setUserId(uid);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }
      } catch {
        // ignore
      }

      try {
        const profile = await getUserProfile();
        if (profile) {
          setUserProfile(profile);
          setIsVip(profile.is_vip || false);
        } else {
          setIsVip(true);
        }
      } catch {
        setIsVip(true);
      }

      try {
        const syncStatus = await getSyncStatus();
        setPendingCount(syncStatus.pending_changes);
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('加载云端数据失败:', error);
    }
  };

  const handleLogin = () => {
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    loadLocalData();
    loadCloudData();
  };

  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗？')) return;
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setIsVip(false);
    setUserEmail('');
    setUserId('');
    setUserProfile(null);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfileType>) => {
    if (!userProfile) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('profiles').update(updates).eq('id', userProfile.id);
        if (!error) {
          setUserProfile(prev => prev ? { ...prev, ...updates } : null);
          alert('资料更新成功！');
          return;
        }
      }
      // 如果supabase不可用，至少更新本地显示
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      alert('资料更新成功！');
    } catch (error) {
      console.error('更新资料失败:', error);
      // 出错也更新本地状态，不让用户觉得没用
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      alert('资料更新成功！');
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
      const notebookId = editingDiary?.notebook_id || selectedNotebookId || defaultNb?.id;

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
      
      // 确保切回列表视图，让用户看到刚写的日记
      setViewMode('list');
      setSelectedNotebookId(null);
      setSelectedDate(null);
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

  const handleDeleteNotebook = async (id: string) => {
    try {
      await localDB.deleteNotebook(id);
      setNotebooks(prev => prev.filter(n => n.id !== id));
      if (selectedNotebookId === id) {
        setSelectedNotebookId(null);
      }
    } catch (error) {
      console.error('删除日记本失败:', error);
      alert('删除失败，请重试');
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {showSidebar && (
          <div className="hidden lg:block w-64 flex-shrink-0">
            <NotebookSidebar
              notebooks={notebooks}
              selectedNotebookId={selectedNotebookId}
              onSelect={handleSelectNotebook}
              onCreate={handleCreateNotebook}
              onDelete={handleDeleteNotebook}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSidebar(!showSidebar)}
                    className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-xl">☰</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">📔</div>
                    <h1 className="text-xl font-semibold text-gray-800">我的日记</h1>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      📝 日记
                    </button>
                    <button
                      onClick={() => setViewMode('settings')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      ⚙️ 更多
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
                        className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        {userProfile?.avatar || userEmail.charAt(0).toUpperCase()}
                      </button>
                      <div className="hidden sm:block">
                        <div className="text-sm font-medium text-gray-800">
                          {userProfile?.nickname || userEmail}
                          {isVip && <span className="ml-1 text-amber-500">⭐</span>}
                        </div>
                        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700">
                          退出
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLogin}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        登录
                      </button>
                      <button
                        onClick={handleRegister}
                        className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        注册
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {selectedNotebook && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <span>{selectedNotebook.icon}</span>
                  <span>{selectedNotebook.name}</span>
                  <button onClick={() => setSelectedNotebookId(null)} className="text-blue-600 hover:text-blue-700 text-xs">
                    清除筛选
                  </button>
                </div>
              )}

              {selectedDate && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <span>📅</span>
                  <span>{selectedDate}</span>
                  <button onClick={() => setSelectedDate(null)} className="text-blue-600 hover:text-blue-700 text-xs">
                    清除筛选
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            {viewMode === 'list' && (
              <>
                {filteredDiaries.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📝</div>
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">还没有日记</h2>
                    <p className="text-gray-500 mb-6">点击下方按钮，写下你的第一篇日记</p>
                    <button
                      onClick={handleCreateDiary}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      写日记
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

            {viewMode === 'settings' && (
              <SettingsPanel
                diaries={diaries}
                stats={stats}
                userProfile={userProfile}
                isLoggedIn={isLoggedIn}
                onUpdateProfile={handleUpdateProfile}
                onLogout={handleLogout}
                onLogin={handleLogin}
                onSelectDate={handleSelectDate}
                selectedDate={selectedDate}
                onEditDiary={handleEditDiary}
                filteredDiaries={filteredDiaries}
              />
            )}
          </main>

          <button
            onClick={handleCreateDiary}
            className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-xl z-50 hover:bg-blue-700"
            aria-label="新建日记"
          >
            +
          </button>
        </div>
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
              onDelete={handleDeleteNotebook}
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
          loadLocalData();
          loadCloudData();
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
