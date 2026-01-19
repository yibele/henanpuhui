/**
 * 本地缓存工具类
 * 支持带过期时间的缓存，用于减少网络请求
 */

interface CacheData<T> {
    data: T;
    timestamp: number;  // 缓存时间戳
    expireAt: number;   // 过期时间戳
}

// 缓存键名枚举
export const CacheKeys = {
    // 农户相关
    FARMER_LIST: 'cache_farmer_list',
    FARMER_DETAIL: 'cache_farmer_detail_',  // + farmerId

    // 发苗相关
    SEED_RECORDS: 'cache_seed_records',
    SEED_STATS: 'cache_seed_stats_',  // + farmerId

    // 用户信息
    USER_INFO: 'cache_user_info',
};

// 默认缓存时间：5分钟
const DEFAULT_EXPIRE_TIME = 5 * 60 * 1000;

/**
 * 设置缓存
 * @param key 缓存键
 * @param data 缓存数据
 * @param expireTime 过期时间（毫秒），默认5分钟
 */
export function setCache<T>(key: string, data: T, expireTime: number = DEFAULT_EXPIRE_TIME): void {
    const now = Date.now();
    const cacheData: CacheData<T> = {
        data,
        timestamp: now,
        expireAt: now + expireTime
    };

    try {
        wx.setStorageSync(key, JSON.stringify(cacheData));
        console.log(`[Cache] 写入缓存: ${key}`);
    } catch (error) {
        console.error(`[Cache] 写入缓存失败: ${key}`, error);
    }
}

/**
 * 获取缓存
 * @param key 缓存键
 * @param ignoreExpire 是否忽略过期时间（用于先显示旧数据再刷新）
 * @returns 缓存数据，如果不存在或已过期返回 null
 */
export function getCache<T>(key: string, ignoreExpire: boolean = false): T | null {
    try {
        const raw = wx.getStorageSync(key);
        if (!raw) return null;

        const cacheData: CacheData<T> = JSON.parse(raw);
        const now = Date.now();

        // 检查是否过期
        if (!ignoreExpire && now > cacheData.expireAt) {
            console.log(`[Cache] 缓存已过期: ${key}`);
            return null;
        }

        console.log(`[Cache] 读取缓存: ${key}, 剩余时间: ${Math.round((cacheData.expireAt - now) / 1000)}秒`);
        return cacheData.data;
    } catch (error) {
        console.error(`[Cache] 读取缓存失败: ${key}`, error);
        return null;
    }
}

/**
 * 删除缓存
 * @param key 缓存键
 */
export function removeCache(key: string): void {
    try {
        wx.removeStorageSync(key);
        console.log(`[Cache] 删除缓存: ${key}`);
    } catch (error) {
        console.error(`[Cache] 删除缓存失败: ${key}`, error);
    }
}

/**
 * 清除所有应用缓存（以 cache_ 开头的）
 */
export function clearAllCache(): void {
    try {
        const info = wx.getStorageInfoSync();
        const keys = info.keys.filter((key: string) => key.startsWith('cache_'));
        keys.forEach((key: string) => {
            wx.removeStorageSync(key);
        });
        console.log(`[Cache] 清除了 ${keys.length} 个缓存`);
    } catch (error) {
        console.error('[Cache] 清除缓存失败', error);
    }
}

/**
 * 检查缓存是否有效
 * @param key 缓存键
 * @returns 是否有效
 */
export function isCacheValid(key: string): boolean {
    try {
        const raw = wx.getStorageSync(key);
        if (!raw) return false;

        const cacheData: CacheData<any> = JSON.parse(raw);
        return Date.now() <= cacheData.expireAt;
    } catch {
        return false;
    }
}

/**
 * 带缓存的数据加载器
 * @param key 缓存键
 * @param fetcher 数据获取函数
 * @param options 选项
 */
export async function loadWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
        expireTime?: number;      // 缓存过期时间
        forceRefresh?: boolean;   // 是否强制刷新
        showStale?: boolean;      // 刷新时是否先显示旧数据
    } = {}
): Promise<{ data: T; fromCache: boolean }> {
    const { expireTime = DEFAULT_EXPIRE_TIME, forceRefresh = false, showStale = true } = options;

    // 如果不强制刷新，先尝试读取缓存
    if (!forceRefresh) {
        const cached = getCache<T>(key);
        if (cached !== null) {
            return { data: cached, fromCache: true };
        }
    }

    // 从服务器获取数据
    try {
        const data = await fetcher();
        setCache(key, data, expireTime);
        return { data, fromCache: false };
    } catch (error) {
        // 如果请求失败，尝试返回过期的缓存数据
        if (showStale) {
            const staleData = getCache<T>(key, true);  // 忽略过期时间
            if (staleData !== null) {
                console.log(`[Cache] 请求失败，使用过期缓存: ${key}`);
                return { data: staleData, fromCache: true };
            }
        }
        throw error;
    }
}
