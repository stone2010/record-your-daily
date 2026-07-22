'use client';

import { useState, useEffect, useCallback } from 'react';
import { Diary, Notebook, DiaryStats, UserProfile as UserProfileType } from '@/types';
import localDB from '@/lib/localDatabase';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';
import { fullSync, getUserProfile, getSyncStatus } from '@/services/syncService';
import DiaryEditor from '@/components/DiaryEditor';
import VIPModal from '@/components/VIPModal';
import SyncButton from '@/components/SyncButton';
import DiaryCard from '@/components/DiaryCard';
import AuthModal from '@/components/AuthModal';
import NotebookSidebar from '@/components/NotebookSidebar';

type FilterType = 'all' | 'favorite' | 'pinned' | 'recent';

export default function HomePage() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showEditor, setShowEditor] = useState(false);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    loadLocalData();
    loadCloudData();
    setupShortcuts();
  }, []);

  const loadLocalData = async () => {
    try {
      const [localDiaries, localNotebooks, localStats, localTags] = await Promise.all([
        localDB.getAllDiaries(),
        localDB.getAllNotebooks(),
        localDB.getStats(),
        localDB.getTags(),
      ]);
      setDiaries(localDiaries);
      setNotebooks(localNotebooks);
      setStats(localStats);
      setTags(localTags);
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
        if (user?.email) setUserEmail(user.email);
      } catch {}
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
      } catch {}
    } catch (error) {
      console.error('加载云端数据失败:', error);
    }
  };

  const setupShortcuts = () => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateDiary();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowEditor(false);
        setShowSearch(false);
        setSelectedTag(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  };

  const handleLogin = () => setShowAuthModal(true);
  const handleRegister = () => setShowAuthModal(true);
  const handleAuthSuccess = () => {
    loadLocalData();
    loadCloudData();
  };

  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗？')) return;
    if (supabase) await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsVip(false);
    setUserEmail('');
    setUserId('');
    setUserProfile(null);
  };

  const handleCreateDiary = () => {
    setEditingDiary(null);
    setShowEditor(true);
  };

  const handleEditDiary = async (diary: Diary) => {
    await localDB.updateAccessTime(diary.id);
    setEditingDiary(diary);
    setShowEditor(true);
  };

  const handleSaveDiary = async (data: { title: string; content: string; tags?: string[] }) => {
    setIsSaving(true);
    try {
      const defaultNb = await localDB.getDefaultNotebook();
      const notebookId = editingDiary?.notebook_id || selectedNotebookId || defaultNb?.id;
      if (editingDiary) {
        await localDB.updateDiary(editingDiary.id, { ...data, notebook_id: notebookId });
      } else {
        await localDB.createDiary(data.title, data.content, userId || undefined, notebookId, data.tags || []);
      }
      const [updatedDiaries, updatedStats, updatedTags] = await Promise.all([
        localDB.getAllDiaries(),
        localDB.getStats(),
        localDB.getTags(),
      ]);
      setDiaries(updatedDiaries);
      setStats(updatedStats);
      setTags(updatedTags);
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
      const [updatedDiaries, updatedStats, updatedTags] = await Promise.all([
        localDB.getAllDiaries(),
        localDB.getStats(),
        localDB.getTags(),
      ]);
      setDiaries(updatedDiaries);
      setStats(updatedStats);
      setTags(updatedTags);
      const count = await localDB.countUnsynced();
      setPendingCount(count);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleTogglePin = async (id: string) => {
    const updated = await localDB.togglePin(id);
    setDiaries(prev => prev.map(d => d.id === id ? updated : d));
  };

  const handleToggleFavorite = async (id: string) => {
    const updated = await localDB.toggleFavorite(id);
    setDiaries(prev => prev.map(d => d.id === id ? updated : d));
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

  const handleReorderNotebooks = async (ids: string[]) => {
    await localDB.reorderNotebooks(ids);
    const updated = await localDB.getAllNotebooks();
    setNotebooks(updated);
  };

  const handleEditNotebook = async (id: string, updates: { name?: string; color?: string; icon?: string }) => {
    await localDB.updateNotebook(id, updates);
    const updated = await localDB.getAllNotebooks();
    setNotebooks(updated);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date === selectedDate ? null : date);
    setSelectedNotebookId(null);
    setSelectedTag(null);
    setFilterType('all');
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadLocalData();
      return;
    }
    const results = await localDB.searchDiaries(query);
    setDiaries(results);
  };

  const getFilteredDiaries = useCallback(() => {
    let result = [...diaries];
    
    if (selectedNotebookId) {
      result = result.filter(d => d.notebook_id === selectedNotebookId);
    }
    
    if (selectedDate) {
      result = result.filter(d => {
        const diaryDate = new Date(d.created_at).toISOString().split('T')[0];
        return diaryDate === selectedDate;
      });
    }
    
    if (selectedTag) {
      result = result.filter(d => d.tags?.includes(selectedTag));
    }
    
    if (filterType === 'favorite') {
      result = result.filter(d => d.is_favorite);
    } else if (filterType === 'pinned') {
      result = result.filter(d => d.is_pinned);
    } else if (filterType === 'recent') {
      result = [...result].sort((a, b) => {
        const aTime = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : new Date(a.created_at).getTime();
        const bTime = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : new Date(b.created_at).getTime();
        return bTime - aTime;
      });
    }
    
    return result;
  }, [diaries, selectedNotebookId, selectedDate, selectedTag, filterType]);

  const filteredDiaries = getFilteredDiaries();

  const getTitle = () => {
    if (selectedNotebookId) {
      const nb = notebooks.find(n => n.id === selectedNotebookId);
      return nb?.name || '日记本';
    }
    if (selectedDate) {
      return `${selectedDate} 的日记`;
    }
    if (selectedTag) {
      return `标签: ${selectedTag}`;
    }
    if (filterType === 'favorite') return '收藏的日记';
    if (filterType === 'pinned') return '置顶的日记';
    if (filterType === 'recent') return '最近访问';
    return '全部日记';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin border-t-blue-600" />
          <p className="text-gray-500 mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <NotebookSidebar
        notebooks={notebooks}
        selectedNotebookId={selectedNotebookId}
        onSelectNotebook={setSelectedNotebookId}
        onCreateNotebook={handleCreateNotebook}
        onDeleteNotebook={handleDeleteNotebook}
        onEditNotebook={handleEditNotebook}
        onReorder={handleReorderNotebooks}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 md:ml-60">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{getTitle()}</h1>
              
              {/* 搜索按钮 - 桌面端 */}
              <button
                onClick={() => setShowSearch(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                <span>🔍</span>
                <span>搜索...</span>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* 移动端搜索按钮 */}
              <button
                onClick={() => setShowSearch(true)}
                className="sm:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
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
                <button
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                  title={`${userProfile?.nickname || userEmail} (点击退出)`}
                >
                  {userProfile?.avatar || userEmail.charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                >
                  登录
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="p-3 sm:p-6">
          {/* 工具栏 */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
            <button
              onClick={handleCreateDiary}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-medium shadow-sm"
            >
              <span className="text-lg leading-none">+</span>
              <span>写日记</span>
            </button>

            {/* 筛选器 */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {[
                { key: 'all', label: '全部' },
                { key: 'favorite', label: '⭐' },
                { key: 'pinned', label: '📌' },
                { key: 'recent', label: '🕐' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilterType(f.key as FilterType); setSelectedTag(null); }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    filterType === f.key
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                  title={f.key === 'favorite' ? '收藏' : f.key === 'pinned' ? '置顶' : f.key === 'recent' ? '最近访问' : '全部'}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* 标签筛选 */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {tags.slice(0, 5).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTag === tag
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
                {tags.length > 5 && (
                  <span className="text-sm text-gray-400">+{tags.length - 5}</span>
                )}
              </div>
            )}
          </div>

          {/* 筛选状态 */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
            {selectedNotebookId && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                当前：{notebooks.find(n => n.id === selectedNotebookId)?.name}
                <button onClick={() => setSelectedNotebookId(null)} className="ml-2 text-blue-600">清除</button>
              </span>
            )}
            {selectedDate && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                日期：{selectedDate}
                <button onClick={() => setSelectedDate(null)} className="ml-2 text-blue-600">清除</button>
              </span>
            )}
            {selectedTag && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                标签：#{selectedTag}
                <button onClick={() => setSelectedTag(null)} className="ml-2 text-blue-600">清除</button>
              </span>
            )}
          </div>

          {/* 日记列表 */}
          {filteredDiaries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📝</div>
              <p className="text-gray-500 mb-2">没有找到日记</p>
              <p className="text-sm text-gray-400">点击上方按钮，写下第一篇日记</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDiaries.map((diary) => {
                const nb = notebooks.find(n => n.id === diary.notebook_id);
                return (
                  <DiaryCard
                    key={diary.id}
                    diary={diary}
                    notebook={nb}
                    onEdit={handleEditDiary}
                    onDelete={handleDeleteDiary}
                    onTogglePin={handleTogglePin}
                    onToggleFavorite={handleToggleFavorite}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* 搜索弹窗 */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12 sm:pt-24">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSearch(false)} />
          <div className="relative w-full max-w-xl mx-3 sm:mx-4">
            <div className="bg-white rounded-xl shadow-xl p-3 sm:p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索日记标题、内容或标签..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                autoFocus
              />
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-500">
                  找到 {diaries.length} 条结果
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 弹窗 */}
      {showEditor && (
        <DiaryEditor
          diary={editingDiary || undefined}
          mode={editingDiary ? 'edit' : 'create'}
          onSave={handleSaveDiary}
          onCancel={() => { setShowEditor(false); setEditingDiary(null); }}
          isSaving={isSaving}
          availableTags={tags}
        />
      )}

      <VIPModal isOpen={showVipModal} onClose={() => setShowVipModal(false)} userId={userId} onSuccess={() => { setShowVipModal(false); loadLocalData(); loadCloudData(); }} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  );
}