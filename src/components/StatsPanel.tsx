'use client';

import { DiaryStats } from '@/types';

interface StatsPanelProps {
  stats: DiaryStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const maxMonthCount = Math.max(...stats.monthly_data.map(d => d.count), 1);
  const maxWeekdayCount = Math.max(...stats.weekday_distribution.map(d => d.count), 1);
  const maxHourlyCount = Math.max(...stats.hourly_distribution.map(d => d.count), 1);
  const maxTagCount = Math.max(...stats.tag_stats.map(d => d.count), 1);

  // 时段颜色映射
  const hourColors: Record<string, string> = {
    '凌晨': 'from-indigo-400 to-indigo-600',
    '早晨': 'from-amber-400 to-amber-600',
    '上午': 'from-sky-400 to-sky-600',
    '下午': 'from-emerald-400 to-emerald-600',
    '晚上': 'from-violet-400 to-violet-600',
    '深夜': 'from-slate-400 to-slate-600',
  };

  // 星期颜色
  const weekdayColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500'
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>📊</span>
        数据统计
      </h3>

      {/* 基础统计卡片 */}
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

      {/* 近12个月记录 */}
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

      {/* 星期分布 */}
      {stats.weekday_distribution.some(d => d.count > 0) && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-3">📅 星期分布</h4>
          <div className="space-y-2">
            {stats.weekday_distribution.map((item, index) => (
              <div key={item.day} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-10">{item.day}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`${weekdayColors[index]} rounded-full h-full transition-all`}
                    style={{ width: `${(item.count / maxWeekdayCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 时段分布 */}
      {stats.hourly_distribution.some(d => d.count > 0) && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-3">⏰ 时段分布</h4>
          <div className="space-y-2">
            {stats.hourly_distribution.map((item) => (
              <div key={item.hour} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-10">{item.hour}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`bg-gradient-to-r ${hourColors[item.hour] || 'from-gray-400 to-gray-600'} rounded-full h-full transition-all`}
                    style={{ width: `${(item.count / maxHourlyCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 标签统计 */}
      {stats.tag_stats.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-600 mb-3">🏷️ 标签统计</h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {stats.tag_stats.map((item) => (
              <div 
                key={item.tag}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100"
              >
                <span className="text-sm text-gray-700">#{item.tag}</span>
                <span className="text-xs text-gray-400">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {stats.tag_stats.slice(0, 5).map((item) => (
              <div key={item.tag} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16 truncate">#{item.tag}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-teal-400 to-teal-600 rounded-full h-full transition-all"
                    style={{ width: `${(item.count / maxTagCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-6 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 日记本分布 */}
      <div className="space-y-3 mb-6">
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
