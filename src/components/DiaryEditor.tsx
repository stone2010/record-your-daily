'use client';

import { useState, useEffect, useCallback } from 'react';
import { Diary, DiaryFormData, EditorMode } from '@/types';
import { DATA_CONSTRAINTS } from '@/lib/localDatabase';

interface DiaryEditorProps {
  diary?: Diary;
  mode: EditorMode;
  onSave: (data: DiaryFormData) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  availableTags?: string[];
}

export default function DiaryEditor({
  diary,
  mode,
  onSave,
  onCancel,
  isSaving = false,
  availableTags = [],
}: DiaryEditorProps) {
  const [title, setTitle] = useState(diary?.title || '');
  const [content, setContent] = useState(diary?.content || '');
  const [tags, setTags] = useState<string[]>(diary?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [titleError, setTitleError] = useState<string>('');
  const [contentError, setContentError] = useState<string>('');
  const [charCount, setCharCount] = useState(0);

  // 更新字符计数
  useEffect(() => {
    setCharCount(content.length);
  }, [content]);

  // 验证标题
  const validateTitle = (value: string): boolean => {
    if (!value || value.trim().length === 0) {
      setTitleError('标题不能为空');
      return false;
    }
    if (value.length > DATA_CONSTRAINTS.MAX_TITLE_LENGTH) {
      setTitleError(`标题长度不能超过${DATA_CONSTRAINTS.MAX_TITLE_LENGTH}字符`);
      return false;
    }
    setTitleError('');
    return true;
  };

  // 验证内容
  const validateContent = (value: string): boolean => {
    if (value.length > DATA_CONSTRAINTS.MAX_CONTENT_LENGTH) {
      setContentError(`日记内容不能超过${DATA_CONSTRAINTS.MAX_CONTENT_LENGTH}字符`);
      return false;
    }
    setContentError('');
    return true;
  };

  // 处理标题变化
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    validateTitle(value);
  };

  // 处理内容变化
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    validateContent(value);
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isTitleValid = validateTitle(title);
    const isContentValid = validateContent(content);

    if (!isTitleValid || !isContentValid) {
      return;
    }

    await onSave({ title: title.trim(), content, tags });
  };

  // 快捷键支持
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(e as any);
      }
      // Esc 取消
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [title, content]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">
            {mode === 'create' ? '✍️ 新建日记' : '📝 编辑日记'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            aria-label="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* 标题输入 */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                标题
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={handleTitleChange}
                onKeyDown={handleKeyDown}
                placeholder="给这篇日记起个名字..."
                className={`w-full px-4 py-3 rounded-lg border transition-all focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  titleError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                autoFocus
                maxLength={DATA_CONSTRAINTS.MAX_TITLE_LENGTH}
                disabled={isSaving}
              />
              {titleError && (
                <p className="mt-1 text-sm text-red-600">{titleError}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                {title.length} / {DATA_CONSTRAINTS.MAX_TITLE_LENGTH}
              </p>
            </div>

            {/* 标签选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((_, i) => i !== index))}
                      className="hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTag.trim() && !tags.includes(newTag.trim())) {
                        e.preventDefault();
                        setTags([...tags, newTag.trim()]);
                        setNewTag('');
                      }
                    }}
                    placeholder="输入标签..."
                    className="px-3 py-1 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                  />
                </div>
              </div>
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {availableTags.filter(t => !tags.includes(t)).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setTags([...tags, tag])}
                      className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 内容输入 */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  内容 (支持Markdown格式)
                </label>
                <span className={`text-xs font-medium ${
                  charCount > DATA_CONSTRAINTS.MAX_CONTENT_LENGTH * 0.9 ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {charCount.toLocaleString()} / {DATA_CONSTRAINTS.MAX_CONTENT_LENGTH.toLocaleString()}
                </span>
              </div>
              <textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="写下你的心情、灵感或记录..."
                className={`flex-1 w-full px-4 py-3 rounded-lg border transition-all resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono ${
                  contentError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ minHeight: '300px' }}
                disabled={isSaving}
              />
              {contentError && (
                <p className="mt-1 text-sm text-red-600">{contentError}</p>
              )}
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>💡 支持Markdown语法</span>
                <span className="hidden sm:inline">Ctrl+S 保存</span>
                <span className="hidden sm:inline">Esc 取消</span>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving || titleError !== '' || contentError !== ''}
              className="px-6 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {mode === 'create' ? '创建' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}