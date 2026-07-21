'use client';

import { useState } from 'react';
import { Diary } from '@/types';

interface CalendarViewProps {
  diaries: Diary[];
  onSelectDate: (date: string) => void;
  selectedDate: string | null;
}

export default function CalendarView({ diaries, onSelectDate, selectedDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDay = firstDayOfMonth.getDay();

  const diaryDates = new Set(diaries.map(d => d.created_at.substring(0, 10)));

  const getDiaryCountForDate = (date: string): number => {
    return diaries.filter(d => d.created_at.startsWith(date)).length;
  };

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateKey = (day: number): string => {
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
  };

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPrevMonth}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all"
        >
          <span className="text-xl">◀</span>
        </button>
        
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-800">
            {year}年 {monthNames[month]}
          </h3>
          <button
            onClick={goToToday}
            className="text-sm text-primary-500 hover:text-primary-600 font-medium"
          >
            今天
          </button>
        </div>
        
        <button
          onClick={goToNextMonth}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all"
        >
          <span className="text-xl">▶</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-14" />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = formatDateKey(day);
          const hasDiary = diaryDates.has(dateKey);
          const diaryCount = getDiaryCountForDate(dateKey);
          const isToday = dateKey === today;
          const isSelected = selectedDate === dateKey;

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateKey)}
              className={`relative h-14 rounded-xl transition-all ${
                isSelected
                  ? 'bg-primary-500 text-white shadow-md'
                  : isToday
                  ? 'bg-primary-50 text-primary-600 font-bold'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="block text-center">{day}</span>
              {hasDiary && (
                <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center ${
                  isSelected ? 'text-white' : 'text-primary-500'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-primary-500'
                  }`} />
                  {diaryCount > 1 && (
                    <span className="text-xs ml-0.5">{diaryCount}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-50 rounded-lg border border-primary-200" />
          <span>今天</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-500 rounded-lg" />
          <span>已选中</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
          <span>有日记</span>
        </div>
      </div>
    </div>
  );
}
