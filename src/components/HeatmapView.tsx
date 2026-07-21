'use client';

import { useState, useMemo } from 'react';
import { Diary } from '@/types';

interface HeatmapViewProps {
  diaries: Diary[];
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

interface DayData {
  date: string;
  count: number;
  words: number;
  level: number;
}

function getDayLevel(words: number): number {
  if (words === 0) return 0;
  if (words < 100) return 1;
  if (words < 300) return 2;
  if (words < 500) return 3;
  if (words < 1000) return 4;
  return 5;
}

function getLevelColor(level: number): string {
  const colors = [
    'bg-gray-100',
    'bg-green-200',
    'bg-green-300',
    'bg-green-400',
    'bg-green-500',
    'bg-green-600',
  ];
  return colors[level] || colors[0];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function HeatmapView({ diaries, onSelectDate, selectedDate }: HeatmapViewProps) {
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  const dayData = useMemo(() => {
    const map: Record<string, { count: number; words: number }> = {};
    
    for (const d of diaries) {
      if (d.is_deleted) continue;
      const date = d.created_at.split('T')[0];
      if (!map[date]) {
        map[date] = { count: 0, words: 0 };
      }
      map[date].count += 1;
      map[date].words += d.content.length;
    }

    return map;
  }, [diaries]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);
    startDate.setHours(0, 0, 0, 0);

    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDate.getDay());

    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];
    const monthLabels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const current = new Date(firstSunday);
    let weekIndex = 0;

    while (current <= today) {
      const dateStr = formatDate(current);
      const data = dayData[dateStr] || { count: 0, words: 0 };
      const level = getDayLevel(data.words);

      const month = current.getMonth();
      if (month !== lastMonth && currentWeek.length === 0) {
        monthLabels.push({
          month: current.toLocaleDateString('zh-CN', { month: 'short' }),
          weekIndex,
        });
        lastMonth = month;
      }

      currentWeek.push({
        date: dateStr,
        count: data.count,
        words: data.words,
        level,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
        weekIndex++;
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        const dateStr = formatDate(current);
        currentWeek.push({
          date: dateStr,
          count: 0,
          words: 0,
          level: -1,
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(currentWeek);
    }

    return { weeks, monthLabels };
  }, [dayData]);

  const weekDayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  const totalDays = Object.keys(dayData).length;
  const totalWords = Object.values(dayData).reduce((sum, d) => sum + d.words, 0);
  const maxStreak = useMemo(() => {
    const dates = Object.keys(dayData).sort();
    let max = 0;
    let current = 0;
    let prev: string | null = null;

    for (const date of dates) {
      if (!prev) {
        current = 1;
      } else {
        const prevDate = new Date(prev);
        const currDate = new Date(date);
        const diff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          current++;
        } else {
          max = Math.max(max, current);
          current = 1;
        }
      }
      max = Math.max(max, current);
      prev = date;
    }

    return max;
  }, [dayData]);

  const selectedDayData = selectedDate ? dayData[selectedDate] : null;
  const selectedDiaries = selectedDate
    ? diaries.filter(d => !d.is_deleted && d.created_at.startsWith(selectedDate))
    : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span>🔥</span>
            热力日记
            <span className="text-sm font-normal text-gray-400">过去一年</span>
          </h2>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalDays}</div>
              <div className="text-xs">写作天数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{maxStreak}</div>
              <div className="text-xs">最长连续</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalWords.toLocaleString()}</div>
              <div className="text-xs">总字数</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="inline-block min-w-full">
            <div className="flex mb-1 ml-8">
              {monthLabels.map((m, i) => (
                <div
                  key={i}
                  className="text-xs text-gray-400"
                  style={{ marginLeft: i === 0 ? 0 : 'auto', width: `${100 / weeks.length}%`, textAlign: 'left' }}
                >
                  {m.month}
                </div>
              ))}
            </div>

            <div className="flex gap-[3px]">
              <div className="flex flex-col gap-[3px] w-6 text-xs text-gray-400 pr-2">
                {weekDayLabels.map((day, i) => (
                  <div key={i} className="h-[11px] flex items-center justify-end">
                    {i % 2 === 1 ? day : ''}
                  </div>
                ))}
              </div>

              <div className="flex gap-[3px]">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIdx) => (
                      <div
                        key={dayIdx}
                        className={`w-[11px] h-[11px] rounded-sm cursor-pointer transition-all ${
                          day.level === -1
                            ? 'bg-transparent'
                            : getLevelColor(day.level)
                        } ${
                          selectedDate === day.date
                            ? 'ring-2 ring-offset-1 ring-indigo-500'
                            : ''
                        } hover:ring-2 hover:ring-offset-1 hover:ring-indigo-400`}
                        onClick={() => day.level >= 0 && onSelectDate(day.date)}
                        onMouseEnter={() => day.level >= 0 && setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-400">
              <span>少</span>
              {[0, 1, 2, 3, 4, 5].map(level => (
                <div
                  key={level}
                  className={`w-[11px] h-[11px] rounded-sm ${getLevelColor(level)}`}
                />
              ))}
              <span>多</span>
            </div>
          </div>
        </div>

        {hoveredDay && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm">
            <div className="font-medium text-gray-700">{hoveredDay.date}</div>
            <div className="text-gray-500 mt-1">
              {hoveredDay.count > 0
                ? `${hoveredDay.count} 篇日记 · ${hoveredDay.words} 字`
                : '这一天没有写日记'}
            </div>
          </div>
        )}
      </div>

      {selectedDate && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📅</span>
            {selectedDate} 的记录
          </h3>

          {selectedDayData && selectedDayData.count > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                  <div className="text-sm text-gray-500 mb-1">日记数量</div>
                  <div className="text-2xl font-bold text-indigo-600">{selectedDayData.count} 篇</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                  <div className="text-sm text-gray-500 mb-1">总字数</div>
                  <div className="text-2xl font-bold text-green-600">{selectedDayData.words} 字</div>
                </div>
              </div>

              <div className="space-y-3">
                {selectedDiaries.map(diary => (
                  <div
                    key={diary.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
                    onClick={() => {
                      const event = new CustomEvent('edit-diary', { detail: diary });
                      window.dispatchEvent(event);
                    }}
                  >
                    <div className="font-medium text-gray-800">{diary.title}</div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">{diary.content}</div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                      <span>{new Date(diary.created_at).toLocaleTimeString()}</span>
                      <span>{diary.content.length} 字</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              这一天没有写日记
            </div>
          )}
        </div>
      )}
    </div>
  );
}
