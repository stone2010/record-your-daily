'use client';

import { useState } from 'react';

interface SyncButtonProps {
  isVip: boolean;
  isLoggedIn: boolean;
  isSyncing: boolean;
  pendingCount: number;
  onSync: () => Promise<void>;
  onShowVipModal: () => void;
  onLogin: () => void;
}

export default function SyncButton({
  isVip,
  isLoggedIn,
  isSyncing,
  pendingCount,
  onSync,
  onShowVipModal,
  onLogin,
}: SyncButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = async () => {
    if (!isLoggedIn) {
      onLogin();
      return;
    }

    if (!isVip) {
      onShowVipModal();
      return;
    }

    await onSync();
  };

  const getButtonState = () => {
    if (isSyncing) {
      return {
        icon: (
          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ),
        text: '同步中',
        bgColor: 'bg-gray-400',
      };
    }

    if (!isLoggedIn) {
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        text: '登录同步',
        bgColor: 'bg-gray-500 hover:bg-gray-600',
      };
    }

    if (!isVip) {
      return {
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
        text: '解锁云同步',
        bgColor: 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600',
      };
    }

    return {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
      text: pendingCount > 0 ? `同步(${pendingCount})` : '已同步',
      bgColor: pendingCount > 0 ? 'bg-primary-500 hover:bg-primary-600' : 'bg-green-500 hover:bg-green-600',
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={isSyncing}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${buttonState.bgColor} text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
      >
        {buttonState.icon}
        <span className="text-sm font-medium">{buttonState.text}</span>
      </button>

      {/* 提示气泡 */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10 animate-fade-in">
          {!isLoggedIn && '登录后可开启云端同步'}
          {isLoggedIn && !isVip && '升级VIP解锁云同步功能'}
          {isLoggedIn && isVip && pendingCount > 0 && `${pendingCount}条日记待同步`}
          {isLoggedIn && isVip && pendingCount === 0 && '所有日记已同步至云端'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
        </div>
      )}
    </div>
  );
}