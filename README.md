# 我的日记 - 本地优先的轻量级日记应用

一款离线优先的日记/随手记Web应用，支持Markdown编辑，VIP用户可解锁云端同步功能。

## ✨ 核心特性

### 🎯 产品定位
- **本地优先**：所有数据默认存储在本地IndexedDB，无需联网即可使用
- **离线可用**：完全支持离线编辑和查看，不依赖网络连接
- **云端同步**：VIP付费用户可解锁跨设备云端同步功能
- **移动端适配**：响应式设计，完美适配手机、平板和桌面设备

### 📝 核心功能
- **Markdown编辑器**：支持Markdown格式的日记编辑
- **本地存储**：所有日记数据存储在IndexedDB，离线可用
- **数据防护**：
  - 单条日记最大20,000字符限制
  - 同步按钮10秒限流保护
- **云端同步**（VIP功能）：
  - 增量同步，只同步变更数据
  - 双向同步，保持多设备数据一致
- **用户认证**：基于Supabase Auth的邮箱密码登录
- **VIP订阅**：小米应用内支付集成（占位符）

## 🏗️ 技术架构

### 前端技术栈
- **框架**：Next.js 14 (App Router)
- **UI库**：React 18
- **样式**：Tailwind CSS
- **语言**：TypeScript 5
- **本地存储**：IndexedDB (通过 idb 库)
- **Markdown**：react-markdown (可扩展)

### 后端技术栈
- **BaaS**：Supabase
  - PostgreSQL 数据库
  - Auth 认证服务
  - RLS 行级安全策略
- **支付**：小米应用内支付SDK（占位符）

### 项目结构
```
/workspace
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 主页面
│   │   ├── layout.tsx         # 根布局
│   │   ├── globals.css        # 全局样式
│   │   └── api/               # API路由
│   │       ├── payment/       # 支付回调
│   │       └── sync/          # 同步接口
│   ├── components/            # React组件
│   │   ├── DiaryEditor.tsx    # 日记编辑器
│   │   ├── DiaryCard.tsx      # 日记卡片
│   │   ├── SyncButton.tsx     # 同步按钮
│   │   └── VIPModal.tsx       # VIP订阅弹窗
│   ├── lib/                   # 核心库
│   │   ├── localDatabase.ts   # IndexedDB封装
│   │   └── supabaseClient.ts  # Supabase客户端
│   ├── services/              # 业务服务
│   │   ├── syncService.ts     # 同步服务
│   │   └── xiaomiPayment.ts   # 小米支付SDK
│   └── types/                 # TypeScript类型定义
├── supabase/
│   └── migrations/            # 数据库迁移文件
├── public/
│   ├── manifest.json          # PWA配置
│   └── icons/                 # 应用图标
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── .env.example              # 环境变量示例
```

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env.local` 并填写以下配置：

```env
# Supabase 配置（替换为你的实际值）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# 小米支付配置（占位符）
NEXT_PUBLIC_XIAOMI_APP_ID=YOUR_XIAOMI_APP_ID_HERE
XIAOMI_APP_KEY=YOUR_XIAOMI_APP_KEY_HERE
XIAOMI_MERCHANT_ID=YOUR_MERCHANT_ID_HERE
XIAOMI_CALLBACK_URL=https://your-domain.com/api/payment/xiaomi/callback
```

### 3. 初始化数据库
在Supabase控制台的SQL编辑器中执行：
```sql
-- 执行 supabase/migrations/20240101000000_initial_schema.sql
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

### 5. 构建生产版本
```bash
npm run build
npm start
```

## 📊 数据库架构

### 用户档案表 (profiles)
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,              -- 关联 auth.users.id
    email TEXT NOT NULL UNIQUE,       -- 用户邮箱
    is_vip BOOLEAN DEFAULT FALSE,     -- VIP状态
    vip_expire_at TIMESTAMPTZ,        -- VIP过期时间
    is_banned BOOLEAN DEFAULT FALSE,  -- 是否封禁
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### 日记表 (diaries)
```sql
CREATE TABLE diaries (
    id UUID PRIMARY KEY,              -- 日记ID
    user_id UUID REFERENCES profiles(id),
    title TEXT NOT NULL,              -- 标题
    content TEXT NOT NULL,            -- 内容（Markdown）
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE, -- 软删除标记
    is_synced BOOLEAN DEFAULT FALSE,  -- 是否已同步
    synced_at TIMESTAMPTZ,
    
    CONSTRAINT check_content_length CHECK (LENGTH(content) <= 20000)
);
```

### RLS策略
- **profiles表**：用户只能查看和更新自己的档案
- **diaries表**：
  - 所有用户可以查看自己的日记（未被封禁）
  - 仅VIP用户可以创建、更新、删除日记
  - 被封禁用户无法进行任何操作

## 🔐 安全策略

### 前端安全
- ✅ 客户端数据验证（20,000字符限制）
- ✅ 同步按钮限流（10秒间隔）
- ✅ VIP状态客户端检查

### 后端安全
- ✅ Supabase RLS行级安全策略
- ✅ JWT Token认证
- ✅ VIP状态服务端验证
- ✅ 用户封禁检查
- ✅ 数据格式验证

### 支付安全
- ⚠️ 小米支付SDK集成（占位符）
- ⚠️ 服务端签名验证（待实现）
- ⚠️ 订单防重复处理（待实现）

## 💰 VIP订阅方案

### 商品配置
- **按月订阅**：3元/月，云同步功能
- **永久买断**：9.9元，永久享受云同步

### 支付流程
1. 用户点击"解锁云同步"按钮
2. 弹出VIP订阅弹窗，选择套餐
3. 调起小米应用内支付
4. 服务端接收支付回调
5. 更新用户VIP状态
6. 客户端刷新用户信息

## 📱 PWA支持

### 功能特性
- ✅ 离线可用
- ✅ 添加到主屏幕
- ✅ 推送通知（待实现）
- ✅ 后台同步（待实现）

### 安装PWA
1. 在Chrome浏览器中打开应用
2. 点击地址栏右侧的"安装"按钮
3. 或者在菜单中选择"安装应用"

## 🚧 部署说明

### Vercel部署（推荐）
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 环境变量配置
在Vercel控制台设置以下环境变量：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_XIAOMI_APP_ID`
- `XIAOMI_APP_KEY`
- `XIAOMI_MERCHANT_ID`
- `XIAOMI_CALLBACK_URL`

## 🎨 自定义主题

修改 `tailwind.config.js` 中的颜色配置：

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#ef7a1e', // 主色调
        600: '#df5f10', // 悬停色
        // ...
      },
    },
  },
}
```

## 📝 待实现功能

### 高优先级
- [ ] 完善小米支付集成（真实签名验证）
- [ ] 支付订单防重复处理
- [ ] Markdown实时预览
- [ ] 图片上传支持

### 中优先级
- [ ] 日记分类和标签
- [ ] 全文搜索功能
- [ ] 数据导出功能
- [ ] 主题切换（明暗模式）

### 低优先级
- [ ] 协作编辑功能
- [ ] 日记分享功能
- [ ] 推送通知
- [ ] 桌面端应用（Electron）

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发流程
1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交Pull Request

## 📄 许可证

本项目仅供学习和参考使用。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React框架
- [Supabase](https://supabase.com/) - BaaS平台
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [小米开发者平台](https://dev.mi.com/) - 支付SDK

---

**⚠️ 注意：** 本项目中的小米支付SDK集成为占位符实现，所有密钥和接口均为示例。实际部署前需要：
1. 在小米开发者后台申请真实的应用ID和密钥
2. 实现服务端签名验证
3. 完善订单处理逻辑
4. 通过小米应用审核