'use client';

import { useState } from 'react';
import { Notebook } from '@/types';

interface NotebookSidebarProps {
  notebooks: Notebook[];
  selectedNotebookId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string, color: string, icon: string) => void;
}

const NOTEBOOK_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

const NOTEBOOK_ICONS = ['📔', '📒', '📓', '📕', '📗', '📘', '📙', '💼', '✨', '💡', '🎯', '🌟'];

export default function NotebookSidebar({ notebooks, selectedNotebookId, onSelect, onCreate }: NotebookSidebarProps) {
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

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-100 h-screen flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span>📚</span>
            日记本
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-3 w-full py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-all text-sm font-medium"
          >
            + 新建日记本
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left mb-1 ${
              selectedNotebookId === null
                ? 'bg-primary-500 text-white shadow-md'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-xl">📝</span>
            <div className="flex-1">
              <div className="font-medium">全部日记</div>
            </div>
          </button>

          {notebooks.map((notebook) => (
            <button
              key={notebook.id}
              onClick={() => onSelect(notebook.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left mb-1 group ${
                selectedNotebookId === notebook.id
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-xl">{notebook.icon}</span>
              <div className="flex-1">
                <div className="font-medium truncate">{notebook.name}</div>
              </div>
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: notebook.color }}
              />
            </button>
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">新建日记本</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="日记本名称"
                  maxLength={20}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
                <div className="flex flex-wrap gap-2">
                  {NOTEBOOK_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
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
                      className={`w-10 h-10 text-xl rounded-lg transition-all ${
                        newIcon === icon ? 'ring-2 ring-primary-500 ring-offset-2 bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
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
