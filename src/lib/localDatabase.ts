import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Diary } from '@/types';

// IndexedDB Schema定义
interface DiaryDBSchema extends DBSchema {
  diaries: {
    key: string; // id
    value: Diary;
    indexes: {
      'by-created': string; // created_at
      'by-updated': string; // updated_at
      'by-synced': number; // is_synced
    };
  };
  sync_meta: {
    key: string;
    value: {
      key: string;
      value: string;
    };
  };
}

const DB_NAME = 'diary-local-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<DiaryDBSchema> | null = null;

// 数据库配置常量
export const DATA_CONSTRAINTS = {
  MAX_CONTENT_LENGTH: 20000, // 单条日记最大20,000字符
  MAX_TITLE_LENGTH: 200, // 标题最大200字符
} as const;

// 初始化数据库
async function getDB(): Promise<IDBPDatabase<DiaryDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DiaryDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建日记表
      if (!db.objectStoreNames.contains('diaries')) {
        const diaryStore = db.createObjectStore('diaries', { keyPath: 'id' });
        diaryStore.createIndex('by-created', 'created_at');
        diaryStore.createIndex('by-updated', 'updated_at');
        diaryStore.createIndex('by-synced', 'is_synced');
      }

      // 创建同步元数据表
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 数据验证
function validateDiaryData(title: string, content: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: '标题不能为空' };
  }

  if (title.length > DATA_CONSTRAINTS.MAX_TITLE_LENGTH) {
    return { valid: false, error: `标题长度不能超过${DATA_CONSTRAINTS.MAX_TITLE_LENGTH}字符` };
  }

  if (content.length > DATA_CONSTRAINTS.MAX_CONTENT_LENGTH) {
    return { valid: false, error: `日记内容不能超过${DATA_CONSTRAINTS.MAX_CONTENT_LENGTH}字符` };
  }

  return { valid: true };
}

// ==================== 日记CRUD操作 ====================

export const localDB = {
  // 创建新日记
  async createDiary(title: string, content: string, userId?: string): Promise<Diary> {
    const validation = validateDiaryData(title, content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const db = await getDB();
    const now = new Date().toISOString();
    const diary: Diary = {
      id: generateUUID(),
      user_id: userId,
      title: title.trim(),
      content,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      is_synced: false,
    };

    await db.add('diaries', diary);
    return diary;
  },

  // 更新日记
  async updateDiary(id: string, updates: Partial<Pick<Diary, 'title' | 'content'>>): Promise<Diary> {
    const db = await getDB();
    const existing = await db.get('diaries', id);

    if (!existing) {
      throw new Error('日记不存在');
    }

    if (existing.is_deleted) {
      throw new Error('无法修改已删除的日记');
    }

    // 验证更新数据
    const newTitle = updates.title ?? existing.title;
    const newContent = updates.content ?? existing.content;
    const validation = validateDiaryData(newTitle, newContent);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const updatedDiary: Diary = {
      ...existing,
      title: newTitle.trim(),
      content: newContent,
      updated_at: new Date().toISOString(),
      is_synced: false, // 修改后需要重新同步
    };

    await db.put('diaries', updatedDiary);
    return updatedDiary;
  },

  // 软删除日记
  async deleteDiary(id: string): Promise<void> {
    const db = await getDB();
    const existing = await db.get('diaries', id);

    if (!existing) {
      throw new Error('日记不存在');
    }

    const deletedDiary: Diary = {
      ...existing,
      is_deleted: true,
      updated_at: new Date().toISOString(),
      is_synced: false, // 删除操作需要同步到云端
    };

    await db.put('diaries', deletedDiary);
  },

  // 获取单个日记
  async getDiary(id: string): Promise<Diary | undefined> {
    const db = await getDB();
    return await db.get('diaries', id);
  },

  // 获取所有日记（排除已删除）
  async getAllDiaries(): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter((d) => !d.is_deleted).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  // 获取未同步的日记
  async getUnsyncedDiaries(): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter((d) => !d.is_synced);
  },

  // 标记日记为已同步
  async markAsSynced(ids: string[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('diaries', 'readwrite');
    const now = new Date().toISOString();

    await Promise.all(
      ids.map(async (id) => {
        const diary = await tx.store.get(id);
        if (diary) {
          diary.is_synced = true;
          diary.synced_at = now;
          await tx.store.put(diary);
        }
      })
    );

    await tx.done;
  },

  // 批量插入或更新日记（从服务器同步）
  async upsertDiaries(diaries: Diary[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('diaries', 'readwrite');

    await Promise.all(
      diaries.map(async (diary) => {
        const existing = await tx.store.get(diary.id);
        
        // 如果本地存在且更新时间更晚，则保留本地版本
        if (existing && new Date(existing.updated_at) > new Date(diary.updated_at)) {
          return;
        }

        // 否则使用服务器版本
        await tx.store.put({
          ...diary,
          is_synced: true,
        });
      })
    );

    await tx.done;
  },

  // 统计未同步日记数量
  async countUnsynced(): Promise<number> {
    const unsynced = await this.getUnsyncedDiaries();
    return unsynced.length;
  },

  // ==================== 同步元数据操作 ====================

  // 设置同步元数据
  async setSyncMeta(key: string, value: string): Promise<void> {
    const db = await getDB();
    await db.put('sync_meta', { key, value });
  },

  // 获取同步元数据
  async getSyncMeta(key: string): Promise<string | undefined> {
    const db = await getDB();
    const record = await db.get('sync_meta', key);
    return record?.value;
  },

  // 获取最后同步时间
  async getLastSyncAt(): Promise<string | null> {
    return await this.getSyncMeta('last_sync_at') || null;
  },

  // 设置最后同步时间
  async setLastSyncAt(timestamp: string): Promise<void> {
    await this.setSyncMeta('last_sync_at', timestamp);
  },

  // 清空所有数据（谨慎使用）
  async clearAllData(): Promise<void> {
    const db = await getDB();
    await db.clear('diaries');
    await db.clear('sync_meta');
  },
};

export default localDB;