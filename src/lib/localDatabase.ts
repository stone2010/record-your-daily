import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Diary, Notebook, DiaryStats } from '@/types';

interface DiaryDBSchema extends DBSchema {
  diaries: {
    key: string;
    value: Diary;
    indexes: {
      'by-created': string;
      'by-updated': string;
      'by-synced': number;
      'by-notebook': string;
      'by-user': string;
    };
  };
  notebooks: {
    key: string;
    value: Notebook;
    indexes: {
      'by-user': string;
      'by-order': number;
      'by-default': number;
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
const DB_VERSION = 3;

let dbInstance: IDBPDatabase<DiaryDBSchema> | null = null;

export const DATA_CONSTRAINTS = {
  MAX_CONTENT_LENGTH: 20000,
  MAX_TITLE_LENGTH: 200,
} as const;

const DEFAULT_NOTEBOOKS: Omit<Notebook, 'id' | 'created_at' | 'updated_at'>[] = [
  { name: '个人日记', color: '#3b82f6', icon: '📔', order: 1, is_default: true },
  { name: '工作记录', color: '#10b981', icon: '💼', order: 2, is_default: false },
  { name: '灵感笔记', color: '#f59e0b', icon: '✨', order: 3, is_default: false },
];

async function getDB(): Promise<IDBPDatabase<DiaryDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DiaryDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      if (db.objectStoreNames.contains('diaries')) {
        db.deleteObjectStore('diaries');
      }
      const diaryStore = db.createObjectStore('diaries', { keyPath: 'id' });
      diaryStore.createIndex('by-created', 'created_at');
      diaryStore.createIndex('by-updated', 'updated_at');
      diaryStore.createIndex('by-synced', 'is_synced');
      diaryStore.createIndex('by-notebook', 'notebook_id');
      diaryStore.createIndex('by-user', 'user_id');

      if (db.objectStoreNames.contains('notebooks')) {
        db.deleteObjectStore('notebooks');
      }
      const notebookStore = db.createObjectStore('notebooks', { keyPath: 'id' });
      notebookStore.createIndex('by-user', 'user_id');
      notebookStore.createIndex('by-order', 'order');
      notebookStore.createIndex('by-default', 'is_default');

      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

async function ensureDefaultNotebooks(): Promise<void> {
  const db = await getDB();
  const existingCount = await db.count('notebooks');
  if (existingCount === 0) {
    const now = new Date().toISOString();
    for (const nb of DEFAULT_NOTEBOOKS) {
      await db.add('notebooks', {
        ...nb,
        id: generateUUID(),
        created_at: now,
        updated_at: now,
      });
    }
  }
}

let ensureDefaultNotebooksPromise: Promise<void> | null = null;

async function ensureDefaultNotebooksOnce(): Promise<void> {
  if (ensureDefaultNotebooksPromise) {
    return ensureDefaultNotebooksPromise;
  }
  ensureDefaultNotebooksPromise = ensureDefaultNotebooks();
  try {
    await ensureDefaultNotebooksPromise;
  } catch (e) {
    ensureDefaultNotebooksPromise = null;
    throw e;
  }
}

export const localDB = {
  async createDiary(title: string, content: string, userId?: string, notebookId?: string, tags: string[] = []): Promise<Diary> {
    const validation = validateDiaryData(title, content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const db = await getDB();
    const now = new Date().toISOString();
    const diary: Diary = {
      id: generateUUID(),
      user_id: userId,
      notebook_id: notebookId,
      title: title.trim(),
      content,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      is_synced: false,
      is_pinned: false,
      is_favorite: false,
      tags,
      word_count: content.length,
      last_accessed_at: now,
    };

    await db.add('diaries', diary);
    return diary;
  },

  async updateDiary(id: string, updates: Partial<Pick<Diary, 'title' | 'content' | 'notebook_id' | 'is_pinned' | 'is_favorite' | 'tags'>>): Promise<Diary> {
    const db = await getDB();
    const existing = await db.get('diaries', id);

    if (!existing) {
      throw new Error('日记不存在');
    }
    if (existing.is_deleted) {
      throw new Error('无法修改已删除的日记');
    }

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
      notebook_id: updates.notebook_id ?? existing.notebook_id,
      is_pinned: updates.is_pinned ?? existing.is_pinned,
      is_favorite: updates.is_favorite ?? existing.is_favorite,
      tags: updates.tags ?? existing.tags,
      word_count: newContent.length,
      updated_at: new Date().toISOString(),
      is_synced: false,
    };

    await db.put('diaries', updatedDiary);
    return updatedDiary;
  },

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
      is_synced: false,
    };

    await db.put('diaries', deletedDiary);
  },

  async getDiary(id: string): Promise<Diary | undefined> {
    const db = await getDB();
    return await db.get('diaries', id);
  },

  async getAllDiaries(): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter((d) => !d.is_deleted).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async searchDiaries(query: string): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    const lowerQuery = query.toLowerCase().trim();
    return all.filter(d => {
      if (d.is_deleted) return false;
      return d.title.toLowerCase().includes(lowerQuery) ||
             d.content.toLowerCase().includes(lowerQuery) ||
             d.tags.some(t => t.toLowerCase().includes(lowerQuery));
    }).sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  async getFavoriteDiaries(): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter(d => !d.is_deleted && d.is_favorite).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getPinnedDiaries(): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter(d => !d.is_deleted && d.is_pinned).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getRecentDiaries(limit: number = 10): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter(d => !d.is_deleted).sort((a, b) => {
      const aTime = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : new Date(b.created_at).getTime();
      return bTime - aTime;
    }).slice(0, limit);
  },

  async togglePin(id: string): Promise<Diary> {
    const db = await getDB();
    const existing = await db.get('diaries', id);
    if (!existing) throw new Error('日记不存在');
    const updated: Diary = {
      ...existing,
      is_pinned: !existing.is_pinned,
      updated_at: new Date().toISOString(),
      is_synced: false,
    };
    await db.put('diaries', updated);
    return updated;
  },

  async toggleFavorite(id: string): Promise<Diary> {
    const db = await getDB();
    const existing = await db.get('diaries', id);
    if (!existing) throw new Error('日记不存在');
    const updated: Diary = {
      ...existing,
      is_favorite: !existing.is_favorite,
      updated_at: new Date().toISOString(),
      is_synced: false,
    };
    await db.put('diaries', updated);
    return updated;
  },

  async addTag(id: string, tag: string): Promise<Diary> {
    const db = await getDB();
    const existing = await db.get('diaries', id);
    if (!existing) throw new Error('日记不存在');
    const newTags = Array.from(new Set([...(existing.tags || []), tag.trim()]));
    const updated: Diary = {
      ...existing,
      tags: newTags,
      updated_at: new Date().toISOString(),
      is_synced: false,
    };
    await db.put('diaries', updated);
    return updated;
  },

  async removeTag(id: string, tag: string): Promise<Diary> {
    const db = await getDB();
    const existing = await db.get('diaries', id);
    if (!existing) throw new Error('日记不存在');
    const newTags = (existing.tags || []).filter(t => t !== tag);
    const updated: Diary = {
      ...existing,
      tags: newTags,
      updated_at: new Date().toISOString(),
      is_synced: false,
    };
    await db.put('diaries', updated);
    return updated;
  },

  async updateAccessTime(id: string): Promise<Diary> {
    const db = await getDB();
    const existing = await db.get('diaries', id);
    if (!existing) throw new Error('日记不存在');
    const updated: Diary = {
      ...existing,
      last_accessed_at: new Date().toISOString(),
    };
    await db.put('diaries', updated);
    return updated;
  },

  async reorderNotebooks(ids: string[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('notebooks', 'readwrite');
    for (let i = 0; i < ids.length; i++) {
      const nb = await tx.store.get(ids[i]);
      if (nb) {
        nb.order = i + 1;
        nb.updated_at = new Date().toISOString();
        await tx.store.put(nb);
      }
    }
    await tx.done;
  },

  async exportDiaries(format: 'json' | 'markdown', diaries?: Diary[]): Promise<string> {
    const db = await getDB();
    const all = diaries || (await db.getAll('diaries'));
    const filtered = all.filter(d => !d.is_deleted);
    
    if (format === 'json') {
      const notebooks = await db.getAll('notebooks');
      return JSON.stringify({ diaries: filtered, notebooks }, null, 2);
    } else {
      return filtered.map(d => {
        const tags = d.tags?.length ? `\n\n#tags: ${d.tags.join(', ')}` : '';
        return `# ${d.title}${tags}\n\n${d.content}\n\n---\n`;
      }).join('\n');
    }
  },

  async getTags(): Promise<string[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    const tags: Set<string> = new Set();
    all.forEach(d => {
      if (!d.is_deleted && d.tags) {
        d.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  },

  async getDiariesByTag(tag: string): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter(d => !d.is_deleted && d.tags?.includes(tag)).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getDiariesByNotebook(notebookId: string): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter((d) => !d.is_deleted && d.notebook_id === notebookId).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async importDiaries(content: string, format: 'json' | 'markdown'): Promise<{
    success: boolean;
    diaries_imported: number;
    notebooks_imported: number;
    error?: string;
  }> {
    const db = await getDB();
    let diariesImported = 0;
    let notebooksImported = 0;

    try {
      if (format === 'json') {
        const data = JSON.parse(content);
        const diaries = data.diaries || data;
        const notebooks = data.notebooks || [];

        for (const nb of notebooks) {
          const existing = await db.get('notebooks', nb.id);
          if (!existing) {
            await db.add('notebooks', {
              id: nb.id || generateUUID(),
              user_id: nb.user_id,
              name: nb.name,
              color: nb.color || '#3B82F6',
              icon: nb.icon || '📔',
              order: nb.order || 0,
              is_default: nb.is_default || false,
              created_at: nb.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            notebooksImported++;
          }
        }

        for (const d of diaries) {
          const existing = await db.get('diaries', d.id);
          if (!existing) {
            await db.add('diaries', {
              id: d.id || generateUUID(),
              user_id: d.user_id,
              notebook_id: d.notebook_id,
              title: d.title || '无标题',
              content: d.content || '',
              created_at: d.created_at || new Date().toISOString(),
              updated_at: d.updated_at || new Date().toISOString(),
              is_deleted: d.is_deleted || false,
              synced_at: d.synced_at,
              is_synced: d.is_synced || false,
              is_pinned: d.is_pinned || false,
              is_favorite: d.is_favorite || false,
              tags: d.tags || [],
              word_count: d.word_count || (d.content || '').length,
              last_accessed_at: d.last_accessed_at || new Date().toISOString(),
            });
            diariesImported++;
          }
        }
      } else {
        const lines = content.split('\n');
        let currentTitle = '';
        let currentContent = '';
        let inDiary = false;

        for (const line of lines) {
          if (line.startsWith('# ') && !line.startsWith('#tags:')) {
            if (inDiary && currentTitle) {
              const existing = await db.getAll('diaries');
              const duplicate = existing.find(d => 
                !d.is_deleted && d.title === currentTitle && d.content === currentContent.trim()
              );
              if (!duplicate) {
                await db.add('diaries', {
                  id: generateUUID(),
                  title: currentTitle,
                  content: currentContent.trim(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  is_deleted: false,
                  is_synced: false,
                  is_pinned: false,
                  is_favorite: false,
                  tags: [],
                  word_count: currentContent.trim().length,
                  last_accessed_at: new Date().toISOString(),
                });
                diariesImported++;
              }
            }
            currentTitle = line.substring(2);
            currentContent = '';
            inDiary = true;
          } else if (line === '---') {
            if (inDiary && currentTitle) {
              const existing = await db.getAll('diaries');
              const duplicate = existing.find(d => 
                !d.is_deleted && d.title === currentTitle && d.content === currentContent.trim()
              );
              if (!duplicate) {
                await db.add('diaries', {
                  id: generateUUID(),
                  title: currentTitle,
                  content: currentContent.trim(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  is_deleted: false,
                  is_synced: false,
                  is_pinned: false,
                  is_favorite: false,
                  tags: [],
                  word_count: currentContent.trim().length,
                  last_accessed_at: new Date().toISOString(),
                });
                diariesImported++;
              }
            }
            currentTitle = '';
            currentContent = '';
            inDiary = false;
          } else if (inDiary) {
            currentContent += line + '\n';
          }
        }

        if (inDiary && currentTitle) {
          const existing = await db.getAll('diaries');
          const duplicate = existing.find(d => 
            !d.is_deleted && d.title === currentTitle && d.content === currentContent.trim()
          );
          if (!duplicate) {
            await db.add('diaries', {
              id: generateUUID(),
              title: currentTitle,
              content: currentContent.trim(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false,
              is_synced: false,
              is_pinned: false,
              is_favorite: false,
              tags: [],
              word_count: currentContent.trim().length,
              last_accessed_at: new Date().toISOString(),
            });
            diariesImported++;
          }
        }
      }

      return { success: true, diaries_imported: diariesImported, notebooks_imported: notebooksImported };
    } catch (error) {
      console.error('导入失败:', error);
      return { 
        success: false, 
        diaries_imported: diariesImported, 
        notebooks_imported: notebooksImported,
        error: error instanceof Error ? error.message : '导入失败'
      };
    }
  },

  async getDiariesByDate(date: string): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter((d) => {
      if (d.is_deleted) return false;
      const diaryDate = new Date(d.created_at).toISOString().split('T')[0];
      return diaryDate === date;
    }).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getUnsyncedDiaries(): Promise<Diary[]> {
    const db = await getDB();
    const all = await db.getAll('diaries');
    return all.filter((d) => !d.is_synced);
  },

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

  async upsertDiaries(diaries: Diary[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('diaries', 'readwrite');

    await Promise.all(
      diaries.map(async (diary) => {
        const existing = await tx.store.get(diary.id);
        if (existing && new Date(existing.updated_at) > new Date(diary.updated_at)) {
          return;
        }
        await tx.store.put({
          ...diary,
          is_synced: true,
        });
      })
    );

    await tx.done;
  },

  async countUnsynced(): Promise<number> {
    const unsynced = await this.getUnsyncedDiaries();
    return unsynced.length;
  },

  // ==================== 日记本操作 ====================

  async getAllNotebooks(userId?: string): Promise<Notebook[]> {
    await ensureDefaultNotebooksOnce();
    const db = await getDB();
    const all = await db.getAll('notebooks');
    const filtered = userId ? all.filter(n => n.user_id === userId || !n.user_id) : all;
    return filtered.sort((a, b) => a.order - b.order);
  },

  async getNotebook(id: string): Promise<Notebook | undefined> {
    const db = await getDB();
    return await db.get('notebooks', id);
  },

  async getDefaultNotebook(): Promise<Notebook> {
    await ensureDefaultNotebooksOnce();
    const db = await getDB();
    const notebooks = await db.getAll('notebooks');
    const defaultNb = notebooks.find(n => n.is_default);
    if (defaultNb) return defaultNb;
    return notebooks[0];
  },

  async createNotebook(name: string, color: string, icon: string, userId?: string): Promise<Notebook> {
    const db = await getDB();
    const now = new Date().toISOString();
    const notebooks = await this.getAllNotebooks(userId);
    const newOrder = notebooks.length > 0 ? Math.max(...notebooks.map(n => n.order)) + 1 : 1;

    const notebook: Notebook = {
      id: generateUUID(),
      user_id: userId,
      name,
      color,
      icon,
      order: newOrder,
      is_default: false,
      created_at: now,
      updated_at: now,
    };

    await db.add('notebooks', notebook);
    return notebook;
  },

  async updateNotebook(id: string, updates: Partial<Pick<Notebook, 'name' | 'color' | 'icon' | 'order' | 'is_default'>>): Promise<Notebook> {
    const db = await getDB();
    const existing = await db.get('notebooks', id);

    if (!existing) {
      throw new Error('日记本不存在');
    }

    const updatedNotebook: Notebook = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.is_default) {
      const all = await db.getAll('notebooks');
      const tx = db.transaction('notebooks', 'readwrite');
      for (const nb of all) {
        if (nb.id !== id) {
          nb.is_default = false;
          nb.updated_at = new Date().toISOString();
          await tx.store.put(nb);
        }
      }
      await tx.store.put(updatedNotebook);
      await tx.done;
    } else {
      await db.put('notebooks', updatedNotebook);
    }

    return updatedNotebook;
  },

  async deleteNotebook(id: string): Promise<void> {
    const db = await getDB();
    const existing = await db.get('notebooks', id);

    if (!existing) {
      throw new Error('日记本不存在');
    }
    if (existing.is_default) {
      throw new Error('不能删除默认日记本');
    }

    const defaultNb = await this.getDefaultNotebook();
    const diaries = await db.getAll('diaries');
    const tx = db.transaction(['notebooks', 'diaries'], 'readwrite');

    await Promise.all(
      diaries.map(async (diary) => {
        if (diary.notebook_id === id) {
          diary.notebook_id = defaultNb.id;
          diary.is_synced = false;
          await tx.objectStore('diaries').put(diary);
        }
      })
    );

    await tx.objectStore('notebooks').delete(id);
    await tx.done;
  },

  // ==================== 统计操作 ====================

  async getStats(): Promise<DiaryStats> {
    const db = await getDB();
    const allDiaries = await db.getAll('diaries');
    const diaries = allDiaries.filter(d => !d.is_deleted);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStartStr = thisMonthStart.toISOString().split('T')[0];

    const todayCount = diaries.filter(d => d.created_at.startsWith(today)).length;
    const thisWeekCount = diaries.filter(d => d.created_at >= thisWeekStartStr).length;
    const thisMonthCount = diaries.filter(d => d.created_at >= thisMonthStartStr).length;
    const totalWords = diaries.reduce((sum, d) => sum + d.content.length, 0);
    const averageWords = diaries.length > 0 ? Math.round(totalWords / diaries.length) : 0;

    const dateCounts: Record<string, number> = {};
    for (const d of diaries) {
      const date = d.created_at.split('T')[0];
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    }

    const sortedDates = Object.keys(dateCounts).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate: string | null = null;

    for (const date of sortedDates) {
      if (!prevDate) {
        currentStreak = 1;
      } else {
        const prev = new Date(prevDate);
        const curr = new Date(date);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      prevDate = date;
    }

    const lastDate = sortedDates[sortedDates.length - 1];
    if (lastDate) {
      const last = new Date(lastDate);
      const todayDate = new Date(today);
      const diffDays = Math.round((todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        currentStreak = 0;
      }
    }

    const notebookCounts: Record<string, number> = {};
    const notebookNames: Record<string, string> = {};
    const notebooks = await this.getAllNotebooks();
    for (const nb of notebooks) {
      notebookNames[nb.id] = nb.name;
    }
    for (const d of diaries) {
      const nbId = d.notebook_id || 'default';
      notebookCounts[nbId] = (notebookCounts[nbId] || 0) + 1;
    }

    const topNotebooks = Object.entries(notebookCounts)
      .map(([id, count]) => ({
        notebook_id: id,
        name: notebookNames[id] || '默认',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const monthlyData: { month: string; count: number }[] = [];
    const monthlyCounts: Record<string, number> = {};
    for (const d of diaries) {
      const month = d.created_at.substring(0, 7);
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    }
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toISOString().substring(0, 7);
      monthlyData.push({ month, count: monthlyCounts[month] || 0 });
    }

    // 星期几分布
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const d of diaries) {
      const day = new Date(d.created_at).getDay();
      weekdayCounts[day]++;
    }
    const weekdayDistribution = weekdayNames.map((day, i) => ({ day, count: weekdayCounts[i] }));

    // 时段分布（6个时段）
    const hourRanges = [
      { label: '凌晨', start: 0, end: 6 },
      { label: '早晨', start: 6, end: 9 },
      { label: '上午', start: 9, end: 12 },
      { label: '下午', start: 12, end: 18 },
      { label: '晚上', start: 18, end: 22 },
      { label: '深夜', start: 22, end: 24 },
    ];
    const hourlyCounts = hourRanges.map(() => 0);
    for (const d of diaries) {
      const hour = new Date(d.created_at).getHours();
      for (let i = 0; i < hourRanges.length; i++) {
        if (hour >= hourRanges[i].start && hour < hourRanges[i].end) {
          hourlyCounts[i]++;
          break;
        }
      }
    }
    const hourlyDistribution = hourRanges.map((r, i) => ({ hour: r.label, count: hourlyCounts[i] }));

    // 标签统计
    const tagCounts: Record<string, number> = {};
    for (const d of diaries) {
      for (const tag of d.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
    const tagStats = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total_count: diaries.length,
      this_month_count: thisMonthCount,
      this_week_count: thisWeekCount,
      today_count: todayCount,
      total_words: totalWords,
      average_words: averageWords,
      longest_streak: longestStreak,
      current_streak: currentStreak,
      top_notebooks: topNotebooks,
      monthly_data: monthlyData,
      weekday_distribution: weekdayDistribution,
      hourly_distribution: hourlyDistribution,
      tag_stats: tagStats,
    };
  },

  // ==================== 同步元数据操作 ====================

  async setSyncMeta(key: string, value: string): Promise<void> {
    const db = await getDB();
    await db.put('sync_meta', { key, value });
  },

  async getSyncMeta(key: string): Promise<string | undefined> {
    const db = await getDB();
    const record = await db.get('sync_meta', key);
    return record?.value;
  },

  async getLastSyncAt(): Promise<string | null> {
    return await this.getSyncMeta('last_sync_at') || null;
  },

  async setLastSyncAt(timestamp: string): Promise<void> {
    await this.setSyncMeta('last_sync_at', timestamp);
  },

  async clearAllData(): Promise<void> {
    const db = await getDB();
    await db.clear('diaries');
    await db.clear('notebooks');
    await db.clear('sync_meta');
  },
};

export default localDB;
