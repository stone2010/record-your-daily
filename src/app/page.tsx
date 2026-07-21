'use client';

import { useState, useEffect } from 'react';
import { Diary } from '@/types';
import localDB from '@/lib/localDatabase';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';
import { fullSync, getUserProfile, isActiveVip, getSyncStatus } from '@/services/syncService';
import DiaryEditor from '@/components/DiaryEditor';
import VIPModal from '@/components/VIPModal';
import SyncButton from '@/components/SyncButton';
import DiaryCard from '@/components/DiaryCard';

export default function HomePage() {
  // 状态管理
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  // 编辑器状态
  const [showEditor, setShowEditor] = useState(false);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // VIP弹窗状态
  const [showVipModal, setShowVipModal] = useState(false);

  // 加载数据
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // 1. 加载本地日记
      const localDiaries = await localDB.getAllDiaries();
      setDiaries(localDiaries);

      // 2. 检查登录状态（仅当supabase配置时）
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      const uid = await getCurrentUserId();
      if (uid) {
        setIsLoggedIn(true);
        setUserId(uid);

        // 获取用户邮箱
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }

        // 3. 检查VIP状态
        const vipStatus = await isActiveVip();
        setIsVip(vipStatus);

        // 4. 获取同步状态
        const syncStatus = await getSyncStatus();
        setPendingCount(syncStatus.pending_changes);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!supabase) {
      alert('Supabase未配置，无法登录');
      return;
    }
    
    try {
      const email = prompt('请输入邮箱:');
      const password = prompt('请输入密码:');

      if (!email || !password) return;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(`登录失败: ${error.message}`);
        return;
      }

      await loadInitialData();
    } catch (error) {
      console.error('登录失败:', error);
      alert('登录失败，请重试');
    }
  };

  // 注册
  const handleRegister = async () => {
    if (!supabase) {
      alert('Supabase未配置，无法注册');
      return;
    }
    
    try {
      const email = prompt('请输入邮箱:');
      const password = prompt('请输入密码（至少6位）:');

      if (!email || !password) return;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        alert(`注册失败: ${error.message}`);
        return;
      }

      alert('注册成功！请检查邮箱完成验证。');
      await loadInitialData();
    } catch (error) {
      console.error('注册失败:', error);
      alert('注册失败，请重试');
    }
  };

  // 退出登录
  const handleLogout = async () => {
    if (!supabase) return;
    
    if (!confirm('确定要退出登录吗？')) return;

    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setIsVip(false);
    setUserEmail('');
    setUserId('');
  };

  // 创建日记
  const handleCreateDiary = () => {
    setEditingDiary(null);
    setShowEditor(true);
  };

  // 编辑日记
  const handleEditDiary = (diary: Diary) => {
    setEditingDiary(diary);
    setShowEditor(true);
  };

  // 保存日记
  const handleSaveDiary = async (data: { title: string; content: string }) => {
    setIsSaving(true);
    try {
      if (editingDiary) {
        // 更新日记
        await localDB.updateDiary(editingDiary.id, data);
      } else {
        // 创建日记
        await localDB.createDiary(data.title, data.content, userId || undefined);
      }

      // 刷新列表
      const updatedDiaries = await localDB.getAllDiaries();
      setDiaries(updatedDiaries);

      // 更新待同步数量
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

  // 删除日记
  const handleDeleteDiary = async (id: string) => {
    if (!confirm('确定要删除这篇日记吗？')) return;

    try {
      await localDB.deleteDiary(id);

      // 刷新列表
      const updatedDiaries = await localDB.getAllDiaries();
      setDiaries(updatedDiaries);

      // 更新待同步数量
      const count = await localDB.countUnsynced();
      setPendingCount(count);
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 同步
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await fullSync();

      if (result.success) {
        alert(`同步成功！已同步 ${result.synced_count} 条日记`);

        // 刷新数据
        const updatedDiaries = await localDB.getAllDiaries();
        setDiaries(updatedDiaries);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📔</div>
              <h1 className="text-xl font-bold text-gray-800">我的日记</h1>
            </div>

            <div className="flex items-center gap-3">
              {/* 同步按钮 */}
              <SyncButton
                isVip={isVip}
                isLoggedIn={isLoggedIn}
                isSyncing={isSyncing}
                pendingCount={pendingCount}
                onSync={handleSync}
                onShowVipModal={() => setShowVipModal(true)}
                onLogin={handleLogin}
              />

              {/* 用户菜单 */}
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 max-w-32 truncate">
                    {userEmail}
                    {isVip && <span className="ml-1 text-amber-500">⭐</span>}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogin}
                    className="text-sm text-primary-500 hover:text-primary-600"
                  >
                    登录
                  </button>
                  <button
                    onClick={handleRegister}
                    className="text-sm bg-primary-500 text-white px-3 py-1 rounded-lg hover:bg-primary-600"
                  >
                    注册
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {diaries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">还没有日记</h2>
            <p className="text-gray-500 mb-6">点击下方按钮，写下你的第一篇日记</p>
            <button
              onClick={handleCreateDiary}
              className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all shadow-sm"
            >
              写日记
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {diaries.map((diary) => (
              <DiaryCard
                key={diary.id}
                diary={diary}
                onEdit={handleEditDiary}
                onDelete={handleDeleteDiary}
              />
            ))}
          </div>
        )}
      </main>

      {/* 底部新建按钮 */}
      <button
        onClick={handleCreateDiary}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 text-white rounded-full shadow-lg hover:bg-primary-600 transition-all flex items-center justify-center text-2xl z-50"
        aria-label="新建日记"
      >
        +
      </button>

      {/* 日记编辑器 */}
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

      {/* VIP弹窗 */}
      <VIPModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        userId={userId}
        onSuccess={() => {
          setShowVipModal(false);
          loadInitialData();
        }}
      />
    </div>
  );
}