'use client';

import { DiaryStats } from '@/types';

interface StatsPanelProps {
  stats: DiaryStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const maxMonthCount = Math.max(...stats.monthly_data.map(d => d.count), 1);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>📊</span>
        数据统计
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{stats.total_count}</div>
          <div className="text-sm text-blue-500 mt-1">总日记数</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.this_month_count}</div>
          <div className="text-sm text-green-500 mt-1">本月日记</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-600">{stats.current_streak}</div>
          <div className="text-sm text-purple-500 mt-1">连续天数</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{stats.average_words}</div>
          <div className="text-sm text-amber-500 mt-1">平均字数</div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-600 mb-3">近12个月记录</h4>
        <div className="flex items-end justify-between h-32 gap-2">
          {stats.monthly_data.map((item) => (
            <div key={item.month} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-primary-500 rounded-t-lg transition-all hover:bg-primary-600"
                style={{ 
                  height: `${(item.count / maxMonthCount) * 100}%`,
                  minHeight: item.count > 0 ? '8px' : '0'
                }}
              />
              <span className="text-xs text-gray-500 mt-2">
                {item.month.substring(5)}
              </span>
              <span className="text-xs text-gray-600 font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-600">日记本分布</h4>
        {stats.top_notebooks.map((item) => (
          <div key={item.notebook_id} className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20 truncate">{item.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div 
                className="bg-primary-500 rounded-full h-full transition-all"
                style={{ width: `${(item.count / stats.total_count) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">{item.count}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-sm text-gray-500">最长连续记录</div>
            <div className="font-bold text-gray-800">{stats.longest_streak} 天</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">✍️</span>
          <div>
            <div className="text-sm text-gray-500">总字数</div>
            <div className="font-bold text-gray-800">{stats.total_words.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
