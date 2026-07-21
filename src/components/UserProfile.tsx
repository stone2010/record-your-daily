'use client';

import { useState } from 'react';
import { UserProfile as UserProfileType } from '@/types';

interface UserProfileProps {
  profile: UserProfileType | null;
  onUpdate: (updates: Partial<UserProfileType>) => void;
  onClose: () => void;
}

const AVATARS = ['👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🎨', '👩‍🎨', '🌟', '💫', '🎭', '🎨'];

export default function UserProfileModal({ profile, onUpdate, onClose }: UserProfileProps) {
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatar, setAvatar] = useState(profile?.avatar || AVATARS[0]);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate({ nickname, bio, avatar });
    setIsEditing(false);
  };

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-6 py-8">
          <div className="text-center">
            <div className="text-6xl mb-3">{avatar}</div>
            <h2 className="text-2xl font-bold text-white">{nickname || '未设置昵称'}</h2>
            <p className="text-white/70 text-sm mt-1">{profile.email}</p>
            <div className="mt-3 inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              {profile.is_vip ? (
                <>
                  <span className="text-yellow-300">⭐</span>
                  <span className="text-white text-xs">VIP会员</span>
                </>
              ) : (
                <>
                  <span className="text-gray-300">🌱</span>
                  <span className="text-white/80 text-xs">普通用户</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择头像</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      onClick={() => setAvatar(av)}
                      className={`w-10 h-10 text-2xl rounded-full transition-all ${
                        avatar === av ? 'ring-2 ring-primary-500 ring-offset-2 scale-110' : 'hover:scale-105 hover:bg-gray-100'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="请输入昵称"
                  maxLength={20}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">个人简介</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="简单介绍一下自己..."
                  maxLength={100}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {bio && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">{bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-indigo-600">{profile.created_at.substring(0, 10)}</div>
                  <div className="text-xs text-indigo-400">注册日期</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {profile.is_vip ? profile.vip_expire_at?.substring(0, 10) || '永久' : '未开通'}
                  </div>
                  <div className="text-xs text-purple-400">VIP到期</div>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
              >
                编辑资料
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
