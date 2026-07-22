'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Notebook } from '@/types';

interface NotebookSidebarProps {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string | null) => void;
  onCreateNotebook: (name: string, color: string, icon: string) => void;
  onDeleteNotebook: (id: string) => void;
  onEditNotebook: (id: string, updates: { name?: string; color?: string; icon?: string }) => void;
  onReorder: (ids: string[]) => void;
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NOTEBOOK_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

const NOTEBOOK_ICONS = ['📔', '📒', '📓', '📕', '📗', '📘', '📙', '💼', '✨', '💡', '🎯', '🌟'];

export default function NotebookSidebar({
  notebooks,
  selectedNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  onEditNotebook,
  onReorder,
  isLoggedIn,
  onLogin,
  onLogout,
  isMobileOpen = false,
  onMobileClose,
}: NotebookSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(NOTEBOOK_COLORS[0]);
  const [newIcon, setNewIcon] = useState(NOTEBOOK_ICONS[0]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(NOTEBOOK_COLORS[0]);
  const [editIcon, setEditIcon] = useState(NOTEBOOK_ICONS[0]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateNotebook(newName.trim(), newColor, newIcon);
    setNewName('');
    setShowCreateModal(false);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除日记本"${name}"吗？\n\n日记不会被删除，会保留在"全部日记"中。`)) return;
    onDeleteNotebook(id);
  };

  const handleStartEdit = (notebook: Notebook) => {
    setEditingId(notebook.id);
    setEditName(notebook.name);
    setEditColor(notebook.color);
    setEditIcon(notebook.icon);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    onEditNotebook(id, { name: editName.trim(), color: editColor, icon: editIcon });
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleMoveUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const index = notebooks.findIndex(n => n.id === id);
    if (index <= 0) return;
    const newOrder = [...notebooks];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onReorder(newOrder.map(n => n.id));
  };

  const handleMoveDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const index = notebooks.findIndex(n => n.id === id);
    if (index >= notebooks.length - 1) return;
    const newOrder = [...notebooks];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder.map(n => n.id));
  };

  const handleSelectNotebook = (id: string | null) => {
    onSelectNotebook(id);
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileClose} />
      )}

      {/* 侧边栏 */}
      <aside className={`w-60 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 md:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📔</span>
            <span className="font-semibold text-gray-900">我的日记</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => handleSelectNotebook(null)}
            className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
              !selectedNotebookId
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">📝</span>
            <span className="text-sm">全部日记</span>
          </button>

          <div className="mt-4 mb-1 px-3 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">日记本</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-gray-400 hover:text-blue-600 text-sm"
              title="新建日记本"
            >
              +
            </button>
          </div>
          
          {notebooks.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-400">暂无日记本</div>
          ) : (
            notebooks.map((notebook, index) => (
              <div key={notebook.id}>
                {editingId === notebook.id ? (
                  <div className="px-4 py-3 bg-gray-50">
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-2">
                        {NOTEBOOK_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditColor(color)}
                            className={`w-6 h-6 rounded-full transition-transform ${
                              editColor === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {NOTEBOOK_ICONS.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => setEditIcon(icon)}
                            className={`w-7 h-7 text-sm rounded transition-colors ${
                              editIcon === icon ? 'ring-2 ring-blue-500 ring-offset-1 bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(notebook.id)}
                          className="flex-1 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleSelectNotebook(notebook.id)}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
                      selectedNotebookId === notebook.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{notebook.icon}</span>
                    <span className="text-sm truncate flex-1">{notebook.name}</span>
                    <div className="flex items-center gap-1">
                      {index > 0 && (
                        <button
                          onClick={(e) => handleMoveUp(notebook.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                          title="上移"
                        >
                          ↑
                        </button>
                      )}
                      {index < notebooks.length - 1 && (
                        <button
                          onClick={(e) => handleMoveDown(notebook.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                          title="下移"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: notebook.color }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(notebook); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                      title="编辑"
                    >
                      ✏️
                    </button>
                    {!notebook.is_default && (
                      <button
                        onClick={(e) => handleDelete(notebook.id, notebook.name, e)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        title="删除"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </nav>

        <div className="border-t border-gray-100 p-3 space-y-2">
          <Link
            href="/settings"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>⚙️</span>
            <span className="text-sm">设置与统计</span>
          </Link>
          
          {isLoggedIn ? (
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              退出登录
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              登录 / 注册
            </button>
          )}
        </div>
      </aside>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">新建日记本</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="日记本名称"
                  maxLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {NOTEBOOK_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">图标</label>
                <div className="flex flex-wrap gap-2">
                  {NOTEBOOK_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewIcon(icon)}
                      className={`w-9 h-9 text-lg rounded-md transition-colors ${
                        newIcon === icon ? 'ring-2 ring-blue-500 ring-offset-1 bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}