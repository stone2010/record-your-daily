'use client';

import { useState, useMemo } from 'react';
import { Diary } from '@/types';

interface MiniHeatmapProps {
  diaries: Diary[];
  onSelectDate: (date: string | null) => void;
  selectedDate: string | null;
}

interface DayData {
  date: string;
  count: number;
  words: number;
  level: number;
}

// 基于日记数量划分级别，让颜色对比更明显
function getDayLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 4;
  return 5;
}

function getLevelColor(level: number): string {
  const colors = [
    'bg-gray-200',
    'bg-emerald-300',
    'bg-emerald-400',
    'bg-emerald-500',
    'bg-emerald-600',
    'bg-emerald-700',
  ];
  return colors[level] || colors[0];
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function MiniHeatmap({ diaries, onSelectDate, selectedDate }: MiniHeatmapProps) {
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

  const weeks = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 83); // 最近12周
    startDate.setHours(0, 0, 0, 0);

    const firstSunday = new Date(startDate);
    firstSunday.setDate(startDate.getDate() - startDate.getDay());

    const weeks: DayData[][] = [];
    let currentWeek: DayData[] = [];

    const current = new Date(firstSunday);

    while (current <= today) {
      const dateStr = formatDate(current);
      const data = dayData[dateStr] || { count: 0, words: 0 };
      const level = getDayLevel(data.count);

      currentWeek.push({
        date: dateStr,
        count: data.count,
        words: data.words,
        level,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
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

    return weeks;
  }, [dayData]);

  const totalDays = Object.keys(dayData).length;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">🔥</span>
      <div className="flex gap-[2px]">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-[2px]">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={`w-[8px] h-[8px] sm:w-[6px] sm:h-[6px] rounded-[1px] transition-all ${
                  day.level === -1
                    ? 'bg-transparent'
                    : getLevelColor(day.level)
                } ${
                  selectedDate === day.date
                    ? 'ring-1 ring-offset-[1px] ring-indigo-500 scale-110'
                    : 'hover:scale-110'
                } cursor-pointer`}
                onClick={() => day.level >= 0 && onSelectDate(day.date === selectedDate ? null : day.date)}
                onMouseEnter={() => day.level >= 0 && setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              />
            ))}
          </div>
        ))}
      </div>
      <span className="text-xs text-gray-400">{totalDays}天</span>
      {hoveredDay && (
        <div className="absolute mt-8 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
          {hoveredDay.date}
          {hoveredDay.count > 0
            ? ` · ${hoveredDay.count}篇 · ${hoveredDay.words}字`
            : ' · 无'}
        </div>
      )}
    </div>
  );
}
