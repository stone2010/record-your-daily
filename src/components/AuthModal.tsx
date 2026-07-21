'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register';

const PASSWORD_MIN_LENGTH = 6;

function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return { valid: false, error: '请输入邮箱地址' };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, error: '请输入有效的邮箱地址' };
  }
  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; error?: string; strength: 'weak' | 'medium' | 'strong' } {
  if (!password) {
    return { valid: false, error: '请输入密码', strength: 'weak' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `密码长度至少${PASSWORD_MIN_LENGTH}位`, strength: 'weak' };
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (password.length >= 8) strength = 'medium';
  if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
    strength = 'strong';
  }
  
  return { valid: true, strength };
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; general?: string }>({});
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      const result = validateEmail(value);
      if (result.valid) {
        setErrors(prev => ({ ...prev, email: undefined }));
      }
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const result = validatePassword(value);
    setPasswordStrength(result.strength);
    
    if (errors.password) {
      if (result.valid) {
        setErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (errors.confirmPassword) {
      if (value === password) {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      newErrors.email = emailResult.error;
    }
    
    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) {
      newErrors.password = passwordResult.error;
    }
    
    if (mode === 'register') {
      if (confirmPassword !== password) {
        newErrors.confirmPassword = '两次输入的密码不一致';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors(prev => ({ ...prev, general: undefined }));
    
    if (!supabase) {
      setErrors(prev => ({ ...prev, general: '认证服务未配置' }));
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('confirm your email')) {
          setErrors(prev => ({ ...prev, general: '请先验证邮箱地址，检查邮箱收件箱' }));
        } else {
          setErrors(prev => ({ ...prev, general: '邮箱或密码错误' }));
        }
        return;
      }

      if (data.user?.email_confirmed_at) {
        onSuccess();
        onClose();
      } else {
        setErrors(prev => ({ ...prev, general: '请先验证邮箱地址，检查邮箱收件箱' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: '登录失败，请重试' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors(prev => ({ ...prev, general: undefined }));
    
    if (!supabase) {
      setErrors(prev => ({ ...prev, general: '认证服务未配置' }));
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors(prev => ({ ...prev, general: '该邮箱已被注册，请直接登录' }));
        } else {
          setErrors(prev => ({ ...prev, general: '注册失败: ' + error.message }));
        }
        return;
      }

      if (data.user) {
        alert('注册成功！请检查邮箱完成验证后登录。');
        setMode('login');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: '注册失败，请重试' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8">
          <h2 className="text-2xl font-bold text-white text-center">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h2>
          <p className="text-white/80 text-center mt-2 text-sm">
            {mode === 'login' ? '请登录您的账号' : '开启您的日记之旅'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{errors.general}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱地址</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="请输入邮箱"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.email 
                    ? 'border-red-300 bg-red-50 text-red-700 placeholder-red-300' 
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-900'
                }`}
                autoComplete="username"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder={`至少${PASSWORD_MIN_LENGTH}位字符`}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.password 
                    ? 'border-red-300 bg-red-50 text-red-700 placeholder-red-300' 
                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-900'
                }`}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
            {mode === 'register' && password && !errors.password && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>密码强度</span>
                  <span className={
                    passwordStrength === 'weak' ? 'text-red-500' :
                    passwordStrength === 'medium' ? 'text-yellow-500' : 'text-green-500'
                  }>
                    {passwordStrength === 'weak' ? '弱' : passwordStrength === 'medium' ? '中' : '强'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      passwordStrength === 'weak' ? 'bg-red-400' :
                      passwordStrength === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`}
                    style={{ 
                      width: passwordStrength === 'weak' ? '33%' : 
                              passwordStrength === 'medium' ? '66%' : '100%' 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">确认密码</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔑</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="请再次输入密码"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.confirmPassword 
                      ? 'border-red-300 bg-red-50 text-red-700 placeholder-red-300' 
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-900'
                  }`}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{mode === 'login' ? '登录中...' : '注册中...'}</span>
              </>
            ) : (
              <span>{mode === 'login' ? '登录' : '注册'}</span>
            )}
          </button>

          <div className="text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>
                还没有账号？{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrors({});
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-primary-500 hover:text-primary-600 font-medium"
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrors({});
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-primary-500 hover:text-primary-600 font-medium"
                >
                  立即登录
                </button>
              </>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="flex items-center gap-1">
              <span>🔒</span>
              <span>密码使用 AES-256 加密存储，安全可靠</span>
            </p>
            <p className="flex items-center gap-1">
              <span>📧</span>
              <span>注册后请验证邮箱，确保账号安全</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
