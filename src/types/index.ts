// 日记数据结构
export interface Diary {
  id: string; // UUID
  user_id?: string; // Supabase 用户ID（可选，本地模式可能没有）
  title: string;
  content: string; // Markdown内容
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  is_deleted: boolean; // 软删除标记
  synced_at?: string; // 最后同步时间
  is_synced: boolean; // 是否已同步到云端
}

// 用户档案（对应Supabase profiles表）
export interface UserProfile {
  id: string; // Supabase auth.users ID
  email: string;
  is_vip: boolean;
  vip_expire_at?: string; // ISO timestamp
  is_banned: boolean;
  created_at: string;
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