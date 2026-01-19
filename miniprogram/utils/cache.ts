/**
 * 本地缓存工具类
 * 缓存永不过期，只有手动下拉刷新才会更新
 */

interface CacheData<T> {
    data: T;
    timestamp: number;  // 缓存时间戳
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

/**
 * 设置缓存（永不过期）
 * @param key 缓存键
 * @param data 缓存数据
 */
export function setCache<T>(key: string, data: T): void {
    const now = Date.now();
    const cacheData: CacheData<T> = {
        data,
        timestamp: now
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
 * @returns 缓存数据，如果不存在返回 null
 */
export function getCache<T>(key: string): T | null {
    try {
        const raw = wx.getStorageSync(key);
        if (!raw) return null;

        const cacheData: CacheData<T> = JSON.parse(raw);
        console.log(`[Cache] 读取缓存: ${key}`);
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
 * 检查缓存是否存在
 * @param key 缓存键
 * @returns 是否存在
 */
export function hasCache(key: string): boolean {
    try {
        const raw = wx.getStorageSync(key);
        return !!raw;
    } catch {
        return false;
    }
}
