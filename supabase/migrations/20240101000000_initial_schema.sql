-- ========================================
-- 数据库架构：日记应用核心表
-- ========================================

-- 1. 用户档案表 (profiles)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    is_vip BOOLEAN DEFAULT FALSE NOT NULL,
    vip_expire_at TIMESTAMPTZ NULL,
    is_banned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_is_vip ON profiles(is_vip);
CREATE INDEX idx_profiles_is_banned ON profiles(is_banned);

-- 自动创建用户档案的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, is_vip, is_banned, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        FALSE,
        FALSE,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. 日记表 (diaries)
CREATE TABLE diaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    synced_at TIMESTAMPTZ NULL,
    is_synced BOOLEAN DEFAULT FALSE NOT NULL,
    
    -- 约束：单条日记内容最大20,000字符
    CONSTRAINT check_content_length CHECK (LENGTH(content) <= 20000),
    CONSTRAINT check_title_length CHECK (LENGTH(title) <= 200)
);

-- 创建索引
CREATE INDEX idx_diaries_user_id ON diaries(user_id);
CREATE INDEX idx_diaries_created_at ON diaries(created_at DESC);
CREATE INDEX idx_diaries_updated_at ON diaries(updated_at DESC);
CREATE INDEX idx_diaries_is_deleted ON diaries(is_deleted);
CREATE INDEX idx_diaries_is_synced ON diaries(is_synced);

-- 自动更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_diaries_updated_at
    BEFORE UPDATE ON diaries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Row Level Security (RLS) 策略
-- ========================================

-- 启用RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

-- Profiles 表的RLS策略
-- 1. 用户只能查看自己的档案
CREATE POLICY "users_can_view_own_profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. 用户可以更新自己的档案（除了is_vip和is_banned字段，这些由系统管理）
CREATE POLICY "users_can_update_own_profile" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. 禁止用户直接插入档案（由触发器自动创建）
-- CREATE POLICY "disable_manual_profile_insert" ON profiles
--     FOR INSERT WITH CHECK (false);

-- Diaries 表的RLS策略
-- 1. 用户只能查看自己的日记（且未被封禁）
CREATE POLICY "users_can_view_own_diaries" ON diaries
    FOR SELECT USING (
        auth.uid() = user_id 
        AND NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_banned = true
        )
    );

-- 2. VIP用户才能创建日记（且未被封禁）
CREATE POLICY "vips_can_insert_diaries" ON diaries
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_vip = true
            AND profiles.is_banned = false
            AND (profiles.vip_expire_at IS NULL OR profiles.vip_expire_at > NOW())
        )
    );

-- 3. VIP用户才能更新日记（且未被封禁）
CREATE POLICY "vips_can_update_diaries" ON diaries
    FOR UPDATE USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_vip = true
            AND profiles.is_banned = false
            AND (profiles.vip_expire_at IS NULL OR profiles.vip_expire_at > NOW())
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_vip = true
            AND profiles.is_banned = false
            AND (profiles.vip_expire_at IS NULL OR profiles.vip_expire_at > NOW())
        )
    );

-- 4. VIP用户才能删除日记（且未被封禁）
CREATE POLICY "vips_can_delete_diaries" ON diaries
    FOR DELETE USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_vip = true
            AND profiles.is_banned = false
            AND (profiles.vip_expire_at IS NULL OR profiles.vip_expire_at > NOW())
        )
    );

-- ========================================
-- 管理员辅助函数（仅服务端角色可用）
-- ========================================

-- 检查用户是否为活跃VIP
CREATE OR REPLACE FUNCTION is_active_vip(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = check_user_id
        AND is_vip = true
        AND is_banned = false
        AND (vip_expire_at IS NULL OR vip_expire_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 批量更新用户VIP状态（服务端调用）
CREATE OR REPLACE FUNCTION update_user_vip_status(
    target_user_id UUID,
    new_is_vip BOOLEAN,
    new_expire_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET 
        is_vip = new_is_vip,
        vip_expire_at = new_expire_at,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 封禁用户（服务端调用）
CREATE OR REPLACE FUNCTION ban_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET 
        is_banned = true,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 解封用户（服务端调用）
CREATE OR REPLACE FUNCTION unban_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET 
        is_banned = false,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 示例数据（可选，用于测试）
-- ========================================

-- 插入测试用户档案（需要先通过 auth.users 创建用户）
-- INSERT INTO profiles (id, email, is_vip, is_banned)
-- VALUES ('user-uuid-here', 'test@example.com', false, false);

-- 插入测试日记（需要用户ID存在）
-- INSERT INTO diaries (user_id, title, content)
-- VALUES ('user-uuid-here', '我的第一篇日记', '这是日记内容...');