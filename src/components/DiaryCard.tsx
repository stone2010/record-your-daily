'use client';

import { Diary, Notebook } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DiaryCardProps {
  diary: Diary;
  notebook?: Notebook;
  onEdit: (diary: Diary) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export default function DiaryCard({ diary, notebook, onEdit, onDelete, onTogglePin, onToggleFavorite }: DiaryCardProps) {
  const formattedDate = format(new Date(diary.created_at), 'yyyy年MM月dd日 EEEE', {
    locale: zhCN,
  });

  const formattedTime = format(new Date(diary.created_at), 'HH:mm');

  const summary = diary.content.slice(0, 100).replace(/[#*`]/g, '');

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all p-6 border border-gray-100 group hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {notebook && (
              <>
                <span className="text-lg">{notebook.icon}</span>
                <span 
                  className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: notebook.color }}
                >
                  {notebook.name}
                </span>
              </>
            )}
          </div>
          <h3 className="font-semibold text-gray-800 text-lg mb-1 truncate">{diary.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{formattedDate}</span>
            <span>·</span>
            <span>{formattedTime}</span>
            {diary.is_synced && (
              <>
                <span>·</span>
                <span className="text-green-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  已同步
                </span>
              </>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onTogglePin && (
            <button
              onClick={() => onTogglePin(diary.id)}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-all ${
                diary.is_pinned ? 'text-amber-500' : 'text-gray-400'
              }`}
              aria-label={diary.is_pinned ? '取消置顶' : '置顶'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(diary.id)}
              className={`p-2 hover:bg-gray-100 rounded-lg transition-all ${
                diary.is_favorite ? 'text-red-500' : 'text-gray-400'
              }`}
              aria-label={diary.is_favorite ? '取消收藏' : '收藏'}
            >
              <svg className="w-5 h-5" fill={diary.is_favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => onEdit(diary)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            aria-label="编辑"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(diary.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            aria-label="删除"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容摘要 */}
      <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
        {summary || '无内容'}
      </p>

      {/* 字数统计 */}
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
        <span>{diary.content.length} 字</span>
      </div>
    </div>
  );
}