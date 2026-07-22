// 日记数据结构
export interface Diary {
  id: string;
  user_id?: string;
  notebook_id?: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  synced_at?: string;
  is_synced: boolean;
  is_pinned: boolean;
  is_favorite: boolean;
  tags: string[];
  word_count: number;
  last_accessed_at?: string;
}

// 日记统计
export interface DiaryStats {
  total_count: number; // 总日记数
  this_month_count: number; // 本月日记数
  this_week_count: number; // 本周日记数
  today_count: number; // 今日日记数
  total_words: number; // 总字数
  average_words: number; // 平均字数
  longest_streak: number; // 最长连续天数
  current_streak: number; // 当前连续天数
  top_notebooks: { notebook_id: string; name: string; count: number }[]; // 日记本统计
  monthly_data: { month: string; count: number }[]; // 月度统计
  weekday_distribution: { day: string; count: number }[]; // 星期分布
  hourly_distribution: { hour: string; count: number }[]; // 时段分布
  tag_stats: { tag: string; count: number }[]; // 标签统计
}

// 用户档案（对应Supabase profiles表）
export interface UserProfile {
  id: string; // Supabase auth.users ID
  email: string;
  nickname?: string; // 用户昵称
  avatar?: string; // 头像URL或emoji
  bio?: string; // 个人简介
  is_vip: boolean;
  vip_expire_at?: string; // ISO timestamp
  is_banned: boolean;
  created_at: string;
}

// 日记本
export interface Notebook {
  id: string; // UUID
  user_id?: string; // 所属用户（可选）
  name: string; // 日记本名称
  color: string; // 颜色标识
  icon: string; // 图标（emoji）
  order: number; // 排序
  is_default: boolean; // 是否默认日记本
  created_at: string;
  updated_at: string;
}

// 同步状态
export interface SyncStatus {
  last_sync_at: string | null;
  pending_changes: number;
  is_syncing: boolean;
  error?: string;
}

// 小米支付商品配置
export interface PaymentProduct {
  code: string;
  price: number;
  name: string;
  description: string;
}

// 支付结果
export interface PaymentResult {
  status: 'PENDING_CALLBACK' | 'SUCCESS' | 'FAILED';
  orderId: string;
  error?: string;
}

// 应用状态
export interface AppState {
  user: UserProfile | null;
  diaries: Diary[];
  syncStatus: SyncStatus;
  isLoading: boolean;
}

// 编辑器模式
export type EditorMode = 'create' | 'edit';

// 日记表单数据
export interface DiaryFormData {
  title: string;
  content: string;
  tags?: string[];
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 同步请求
export interface SyncRequest {
  diaries: Diary[];
  last_sync_at?: string;
}

// 同步响应
export interface SyncResponse {
  success: boolean;
  synced_count: number;
  server_diaries?: Diary[];
  error?: string;
}