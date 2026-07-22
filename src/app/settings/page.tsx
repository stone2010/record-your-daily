'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Diary, Notebook, DiaryStats, UserProfile as UserProfileType } from '@/types';
import localDB from '@/lib/localDatabase';
import { supabase, getCurrentUserId } from '@/lib/supabaseClient';
import { getUserProfile, getSyncStatus } from '@/services/syncService';
import CalendarView from '@/components/CalendarView';
import HeatmapView from '@/components/HeatmapView';
import StatsPanel from '@/components/StatsPanel';
import AuthModal from '@/components/AuthModal';

type SettingsTab = 'stats' | 'calendar' | 'heatmap' | 'account' | 'import' | 'export' | 'shortcuts';

export default function SettingsPage() {
  const router = useRouter();
  
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [stats, setStats] = useState<DiaryStats | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('stats');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [exportFormat, setExportFormat] = useState<'json' | 'markdown'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'notebook' | 'tag'>('all');
  const [selectedExportNotebook, setSelectedExportNotebook] = useState<string | null>(null);
  const [selectedExportTag, setSelectedExportTag] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      
      if (supabase) {
        const uid = await getCurrentUserId();
        if (uid) {
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
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    loadData();
    setShowAuthModal(false);
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let exportDiaries = [...diaries];
      
      if (exportScope === 'notebook' && selectedExportNotebook) {
        exportDiaries = exportDiaries.filter(d => d.notebook_id === selectedExportNotebook);
      } else if (exportScope === 'tag' && selectedExportTag) {
        exportDiaries = exportDiaries.filter(d => d.tags?.includes(selectedExportTag));
      }
      
      if (exportDiaries.length === 0) {
        alert('没有符合条件的日记可导出');
        setIsExporting(false);
        return;
      }
      
      const data = await localDB.exportDiaries(exportFormat, exportDiaries);
      const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diaries-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert(`导出成功！共导出 ${exportDiaries.length} 篇日记`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json') && !file.name.endsWith('.md')) {
      alert('只支持 JSON 或 Markdown 格式的文件');
      return;
    }
    
    setImportFile(file);
    setImportPreview(null);
    setImportConfirm(false);
    setImportMessage('');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          const diaryCount = data.diaries?.length || data.length || 0;
          const notebookCount = data.notebooks?.length || 0;
          setImportPreview({
            format: 'json',
            diaryCount,
            notebookCount,
            preview: data.diaries?.slice(0, 3) || [],
          });
        } else {
          const lines = content.split('\n');
          const diaryTitles = lines.filter(line => line.startsWith('# '));
          setImportPreview({
            format: 'markdown',
            diaryCount: diaryTitles.length,
            notebookCount: 0,
            preview: diaryTitles.slice(0, 3),
          });
        }
      } catch {
        alert('文件格式不正确');
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile || !importConfirm) return;
    
    setIsImporting(true);
    try {
      const content = await importFile.text();
      const result = await localDB.importDiaries(content, importFile.name.endsWith('.json') ? 'json' : 'markdown');
      
      if (result.success) {
        setImportMessage(`✓ 导入成功！\n- 日记：${result.diaries_imported} 篇\n- 日记本：${result.notebooks_imported} 个`);
        await loadData();
        setImportFile(null);
        setImportPreview(null);
        setImportConfirm(false);
      } else {
        setImportMessage(`✗ 导入失败：${result.error}`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      setImportMessage(`✗ 导入失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearData = () => {
    if (!confirm('⚠️ 警告：确定要清空所有本地数据吗？此操作不可恢复！\n\n请确保您已经导出了重要数据！')) return;
    if (!confirm('再次确认：您确定要继续吗？所有日记和日记本都将被删除！')) return;
    
    localDB.clearAllData();
    location.href = '/';
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
    <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">设置</h1>
          </div>
          
          <nav className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {[
              { key: 'stats', icon: '📊', label: '统计' },
              { key: 'calendar', icon: '📅', label: '日历' },
              { key: 'heatmap', icon: '🔥', label: '热力图' },
              { key: 'account', icon: '👤', label: '账号' },
              { key: 'export', icon: '📤', label: '导出' },
              { key: 'import', icon: '📥', label: '导入' },
              { key: 'shortcuts', icon: '⌨️', label: '快捷键' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSettingsTab(tab.key as SettingsTab)}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-[56px] sm:min-w-[80px] ${
                  settingsTab === tab.key
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base sm:text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <main className="p-3 sm:p-6 max-w-3xl mx-auto">
          {settingsTab === 'stats' && stats && <StatsPanel stats={stats} />}
          
          {settingsTab === 'calendar' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
              <CalendarView
                diaries={diaries}
                onSelectDate={(date) => {
                  router.push('/');
                }}
                selectedDate={null}
              />
            </div>
          )}
          
          {settingsTab === 'heatmap' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6">
              <HeatmapView
                diaries={diaries}
                onSelectDate={(date) => {
                  router.push('/');
                }}
                selectedDate={null}
              />
            </div>
          )}
          
          {settingsTab === 'account' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">账号信息</h2>
                {isLoggedIn ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                        {userProfile?.avatar || userEmail.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{userProfile?.nickname || userEmail}</div>
                        <div className="text-sm text-gray-500">{userEmail}</div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">会员状态</span>
                        <span className={isVip ? 'text-amber-500 font-medium' : 'text-gray-400'}>
                          {isVip ? '⭐ VIP 会员' : '普通用户'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout} 
                      className="mt-4 px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">👋</div>
                    <p className="text-gray-500 mb-4">登录后可同步数据到云端，数据永不丢失</p>
                    <button 
                      onClick={() => setShowAuthModal(true)} 
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      登录 / 注册
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">数据概览</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-semibold text-gray-900">{stats?.total_count || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">日记总数</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-semibold text-gray-900">{(stats?.total_words || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">总字数</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-semibold text-orange-500">{stats?.current_streak || 0}</div>
                    <div className="text-xs text-gray-500 mt-1">连续天数</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl sm:text-2xl font-semibold text-blue-600">{notebooks.length}</div>
                    <div className="text-xs text-gray-500 mt-1">日记本</div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-red-800 mb-4">⚠️ 危险操作</h2>
                <p className="text-sm text-red-600 mb-4">请谨慎操作，此操作将永久删除所有本地数据！</p>
                <button 
                  onClick={handleClearData} 
                  className="px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                >
                  清空所有本地数据
                </button>
              </div>
            </div>
          )}
          
          {settingsTab === 'export' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">导出数据</h2>
                
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setExportFormat('json')}
                        className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                          exportFormat === 'json'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl sm:text-2xl">📄</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900 text-sm sm:text-base">JSON</div>
                          <div className="text-xs text-gray-500">完整数据，适合迁移</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setExportFormat('markdown')}
                        className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                          exportFormat === 'markdown'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl sm:text-2xl">📝</span>
                        <div className="text-left">
                          <div className="font-medium text-gray-900 text-sm sm:text-base">Markdown</div>
                          <div className="text-xs text-gray-500">易读格式，适合分享</div>
                        </div>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">导出范围</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => { setExportScope('all'); setSelectedExportNotebook(null); setSelectedExportTag(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          exportScope === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        全部日记
                      </button>
                      <button
                        onClick={() => { setExportScope('notebook'); setSelectedExportTag(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          exportScope === 'notebook'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        按日记本
                      </button>
                      <button
                        onClick={() => { setExportScope('tag'); setSelectedExportNotebook(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          exportScope === 'tag'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        按标签
                      </button>
                    </div>
                  </div>
                  
                  {exportScope === 'notebook' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">选择日记本</label>
                      <select
                        value={selectedExportNotebook || ''}
                        onChange={(e) => setSelectedExportNotebook(e.target.value || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">请选择日记本</option>
                        {notebooks.map(nb => (
                          <option key={nb.id} value={nb.id}>{nb.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {exportScope === 'tag' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">选择标签</label>
                      <select
                        value={selectedExportTag || ''}
                        onChange={(e) => setSelectedExportTag(e.target.value || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">请选择标签</option>
                        {tags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={handleExport}
                      disabled={isExporting || (exportScope !== 'all' && !selectedExportNotebook && !selectedExportTag)}
                      className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isExporting && (
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      开始导出
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">💡 导出提示</h3>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• JSON 格式包含所有数据字段，适合数据迁移或备份</li>
                  <li>• Markdown 格式只包含标题和内容，适合阅读和分享</li>
                  <li>• 建议定期导出备份，防止数据丢失</li>
                </ul>
              </div>
            </div>
          )}
          
          {settingsTab === 'import' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">导入数据</h2>
                
                {!importFile ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('import-file')?.click()}
                  >
                    <input
                      id="import-file"
                      type="file"
                      accept=".json,.md"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="text-4xl mb-4">📁</div>
                    <p className="text-gray-600 mb-2">点击或拖拽文件到此处</p>
                    <p className="text-sm text-gray-400">支持 JSON 和 Markdown 格式</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-green-50 rounded-lg p-4 flex items-center gap-3">
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <div className="font-medium text-gray-900">{importFile.name}</div>
                        <div className="text-sm text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                      <button
                        onClick={() => { setImportFile(null); setImportPreview(null); setImportConfirm(false); }}
                        className="ml-auto text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {importPreview && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">文件预览</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">格式</span>
                            <span className="font-medium">{importPreview.format.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">日记数量</span>
                            <span className="font-medium">{importPreview.diaryCount} 篇</span>
                          </div>
                          {importPreview.notebookCount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">日记本数量</span>
                              <span className="font-medium">{importPreview.notebookCount} 个</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {importMessage && (
                      <div className={`rounded-lg p-4 text-sm ${
                        importMessage.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {importMessage}
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          id="import-confirm"
                          checked={importConfirm}
                          onChange={(e) => setImportConfirm(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="import-confirm" className="text-sm text-gray-600">
                          我确认要导入这些数据，重复数据将自动跳过
                        </label>
                      </div>
                      <button
                        onClick={handleImport}
                        disabled={isImporting || !importConfirm}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isImporting && (
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        )}
                        开始导入
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">💡 导入提示</h3>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• JSON 格式需要是从本应用导出的文件</li>
                  <li>• Markdown 格式需要以 # 开头作为标题</li>
                  <li>• 导入时重复的日记（按标题和创建时间）将自动跳过</li>
                  <li>• 建议在导入前备份当前数据</li>
                </ul>
              </div>
            </div>
          )}
          
          {settingsTab === 'shortcuts' && (
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">快捷键</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">新建日记</div>
                      <div className="text-xs text-gray-500">创建一篇新日记</div>
                    </div>
                    <kbd className="px-3 py-1.5 bg-gray-200 rounded font-mono text-sm">Ctrl</kbd>
                    <span className="text-gray-400">+</span>
                    <kbd className="px-3 py-1.5 bg-gray-200 rounded font-mono text-sm">N</kbd>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">搜索</div>
                      <div className="text-xs text-gray-500">打开搜索框</div>
                    </div>
                    <kbd className="px-3 py-1.5 bg-gray-200 rounded font-mono text-sm">Ctrl</kbd>
                    <span className="text-gray-400">+</span>
                    <kbd className="px-3 py-1.5 bg-gray-200 rounded font-mono text-sm">F</kbd>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">关闭弹窗</div>
                      <div className="text-xs text-gray-500">关闭当前弹窗</div>
                    </div>
                    <kbd className="px-3 py-1.5 bg-gray-200 rounded font-mono text-sm">ESC</kbd>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">保存日记</div>
                      <div className="text-xs text-gray-500">在编辑器中保存</div>
                    </div>
                    <kbd className="px-3 py-1.5 bg-gray-200 rounded font-mono text-sm">Ctrl</kbd>
                    <span className="text-gray-400">+</span>
                    <kbd className="px-3 py-1.5 bg-gray-200 rounded font-mono text-sm">S</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />
    </div>
  );
}