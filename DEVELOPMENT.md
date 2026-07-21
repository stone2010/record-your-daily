# 开发指南

## 环境准备

### 必需软件
- Node.js 18+
- npm 或 yarn
- Git

### 推荐工具
- VS Code
- Chrome DevTools
- Supabase CLI

## Supabase配置

### 1. 创建Supabase项目
1. 访问 https://supabase.com
2. 创建新项目
3. 记录项目的 URL 和 API Key

### 2. 执行数据库迁移
在Supabase控制台的SQL编辑器中执行：
```sql
-- 复制 supabase/migrations/20240101000000_initial_schema.sql 的内容
```

### 3. 配置认证
在Authentication设置中：
- 启用邮箱密码登录
- 配置邮件模板
- 设置Site URL和Redirect URLs

### 4. 获取API密钥
在Settings > API中：
- `anon` `public` key → NEXT_PUBLIC_SUPABASE_ANON_KEY
- `service_role` `secret` key → SUPABASE_SERVICE_ROLE_KEY（⚠️ 服务端专用，不要暴露）

## 本地开发

### 安装依赖
```bash
npm install
```

### 配置环境变量
创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 启动开发服务器
```bash
npm run dev
```

### 测试用户流程
1. 打开浏览器访问 http://localhost:3000
2. 点击"注册"按钮创建账户
3. 检查邮箱完成验证
4. 登录并测试日记功能

## 数据库管理

### 查看数据
在Supabase控制台：
1. 进入Table Editor
2. 查看 `profiles` 和 `diaries` 表

### 手动设置VIP状态（测试用）
```sql
-- 设置用户为VIP
UPDATE profiles 
SET is_vip = true, vip_expire_at = NOW() + INTERVAL '30 days'
WHERE email = 'test@example.com';

-- 设置为永久VIP
UPDATE profiles 
SET is_vip = true, vip_expire_at = NULL
WHERE email = 'test@example.com';

-- 撤销VIP
UPDATE profiles 
SET is_vip = false, vip_expire_at = NULL
WHERE email = 'test@example.com';
```

### 查看同步状态
```sql
-- 查看用户的日记同步状态
SELECT id, title, is_synced, synced_at, updated_at
FROM diaries
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

## 调试技巧

### 查看IndexedDB数据
Chrome DevTools > Application > IndexedDB > diary-local-db

### 查看Supabase Auth状态
```javascript
// 在浏览器控制台执行
const { data: { user } } = await supabase.auth.getUser();
console.log('当前用户:', user);
```

### 手动触发同步
```javascript
// 在浏览器控制台执行
const result = await fullSync();
console.log('同步结果:', result);
```

### 清空本地数据
```javascript
// ⚠️ 警告：这将删除所有本地日记！
await localDB.clearAllData();
```

## 常见问题

### Q: 登录后没有创建profile记录？
A: 检查Supabase的触发器是否正确创建。可以手动创建：
```sql
INSERT INTO profiles (id, email, is_vip, is_banned, created_at, updated_at)
VALUES (
    'user-uuid',
    'user@example.com',
    false,
    false,
    NOW(),
    NOW()
);
```

### Q: 同步失败返回"VIP_REQUIRED"？
A: 检查用户的VIP状态：
```sql
SELECT * FROM profiles WHERE id = 'user-uuid';
```

### Q: RLS策略导致无法访问数据？
A: 临时禁用RLS进行测试：
```sql
-- ⚠️ 仅用于测试！
ALTER TABLE diaries DISABLE ROW LEVEL SECURITY;
```

### Q: 支付回调无法触发？
A: 本地开发环境无法接收小米支付回调。需要：
1. 使用ngrok等工具创建公网URL
2. 或部署到线上环境测试

## 性能优化

### 前端优化
- 使用 `React.memo` 优化组件
- 使用 `useCallback` 避免重复渲染
- 图片懒加载
- 代码分割

### 数据库优化
- 创建合适的索引
- 使用分页查询
- 避免查询过多数据

### 网络优化
- 使用CDN加速静态资源
- 启用Gzip压缩
- 使用HTTP/2

## 测试

### 单元测试（待添加）
```bash
npm run test
```

### E2E测试（待添加）
```bash
npm run test:e2e
```

## 部署

### Vercel（推荐）
```bash
vercel --prod
```

### Docker（可选）
```bash
docker build -t diary-app .
docker run -p 3000:3000 diary-app
```

## 安全检查清单

部署前请确认：
- [ ] 所有API密钥使用环境变量
- [ ] Supabase RLS策略已启用
- [ ] Service Role Key仅用于服务端
- [ ] 用户输入已做验证和清理
- [ ] HTTPS已启用
- [ ] CORS配置正确
- [ ] 支付签名验证已实现