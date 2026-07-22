'use client';

import { useState } from 'react';
import { Notebook } from '@/types';

interface NotebookSidebarProps {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, color: string, icon: string) => void;
  onDelete: (id: string) => void;
}

const NOTEBOOK_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

const NOTEBOOK_ICONS = ['📔', '📒', '📓', '📕', '📗', '📘', '📙', '💼', '✨', '💡', '🎯', '🌟'];

export default function NotebookSidebar({ notebooks, selectedNotebookId, onSelect, onCreate, onDelete }: NotebookSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(NOTEBOOK_COLORS[0]);
  const [newIcon, setNewIcon] = useState(NOTEBOOK_ICONS[0]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newColor, newIcon);
    setNewName('');
    setShowCreateModal(false);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除日记本"${name}"吗？\n\n注意：该日记本下的日记不会被删除，会保留在"全部日记"中。`)) return;
    onDelete(id);
  };

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <span>📚</span>
            日记本
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 w-full py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            + 新建日记本
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left mb-1 ${
              selectedNotebookId === null
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-lg">📝</span>
            <div className="flex-1">
              <div className="text-sm font-medium">全部日记</div>
            </div>
          </button>

          {notebooks.map((notebook) => (
            <div
              key={notebook.id}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer text-left mb-1 ${
                selectedNotebookId === notebook.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              onClick={() => onSelect(notebook.id)}
            >
              <span className="text-lg">{notebook.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{notebook.name}</div>
              </div>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: notebook.color }}
              />
              {!notebook.is_default && (
                <button
                  onClick={(e) => handleDelete(notebook.id, notebook.name, e)}
                  className="opacity-0 group-hover:opacity-100 absolute right-2 p-1 text-gray-400 hover:text-red-500 transition-all"
                  title="删除日记本"
                >
                  <span className="text-xs">🗑️</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400">
            共 {notebooks.length} 个日记本
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          
          <div className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-sm mx-4 p-5">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              <div className="flex gap-3 mt-5">
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
