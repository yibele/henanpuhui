/**
 * 收苗统计页面
 * @description 管理层查看收苗数据汇总，使用云函数真实数据
 */

import { getCache, setCache } from '../../../utils/cache';

// 获取应用实例
const app = getApp();

// 格式化重量
function formatWeight(weight: number): string {
  if (weight >= 1000) {
    return (weight / 1000).toFixed(2).replace(/\.?0+$/, '') + '吨';
  }
  return weight + 'kg';
}

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2).replace(/\.?0+$/, '') + '万';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2).replace(/\.?0+$/, '') + '千';
  }
  return '¥' + amount;
}

// 仓库容量配置
const WAREHOUSE_CAPACITY: Record<string, { type: string; capacity: number }> = {
  'wh1': { type: '大', capacity: 200000 },
  'wh2': { type: '大', capacity: 200000 },
  'wh3': { type: '大', capacity: 200000 },
  'wh4': { type: '中', capacity: 150000 },
  'wh5': { type: '中', capacity: 150000 },
  'wh6': { type: '中', capacity: 150000 },
  'wh7': { type: '小', capacity: 100000 },
  'wh8': { type: '小', capacity: 100000 },
  'wh9': { type: '小', capacity: 100000 },
  'wh10': { type: '小', capacity: 100000 }
};

Page({
  data: {
    // 当前Tab（0:今日, 1:累计）
    currentTab: 0,
    // 更新时间
    updateTime: '',
    // 当前显示的统计数据
    currentStats: {
      totalWeight: '0',
      totalAmount: '0',
      avgPrice: '0',
      farmerCount: '0'
    },
    // 仓库统计列表
    warehouseStats: [] as any[],
    // 趋势数据
    trendData: [] as any[],
    // 全部收购记录
    allRecords: [] as any[],
    // 仓库信息
    warehouseList: [] as any[],
    // 页面加载中
    pageLoading: true,
    // 是否来自缓存
    fromCache: false
  },

  onLoad() {
    this.setUpdateTime();
    this.loadData(false);
  },

  onShow() {
    // 更新 tabbar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
  },

  onPullDownRefresh() {
    this.loadData(true);
  },

  // 设置更新时间
  setUpdateTime() {
    const now = new Date();
    const time = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({ updateTime: time });
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab });
    this.calculateStats();
  },

  /**
   * 加载数据
   * @param forceRefresh 是否强制刷新
   */
  async loadData(forceRefresh: boolean = false) {
    const cacheKey = 'cache_acquisition_stats_all';

    // 先尝试从缓存加载
    if (!forceRefresh) {
      const cached = getCache<any>(cacheKey);
      if (cached) {
        console.log('[acquisition-stats] 从缓存加载数据');
        this.setData({
          allRecords: cached.records,
          warehouseList: cached.warehouses,
          fromCache: true,
          pageLoading: false
        });
        this.calculateStats();
        return;
      }
    }

    // 从服务器加载
    this.setData({ pageLoading: true, fromCache: false });

    try {
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      console.log('[acquisition-stats] 从服务器加载数据');

      // 并行获取收购记录和仓库信息
      const [acquisitionRes, warehouseRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'acquisition-manage',
          data: {
            action: 'list',
            userId,
            page: 1,
            pageSize: 1000
          }
        }),
        wx.cloud.callFunction({
          name: 'warehouse-manage',
          data: {
            action: 'getWarehouseList',
            userId
          }
        })
      ]);

      const acquisitionResult = acquisitionRes.result as any;
      const warehouseResult = warehouseRes.result as any;

      let records: any[] = [];
      let warehouses: any[] = [];

      if (acquisitionResult.success && acquisitionResult.data) {
        records = acquisitionResult.data.list || [];
      }

      if (warehouseResult.success && warehouseResult.data) {
        warehouses = warehouseResult.data || [];
      }

      // 保存到缓存
      setCache(cacheKey, { records, warehouses });

      this.setData({
        allRecords: records,
        warehouseList: warehouses,
        pageLoading: false,
        fromCache: false
      });

      this.calculateStats();

      if (forceRefresh) {
        wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 });
      }
    } catch (error) {
      console.error('加载收购数据失败:', error);

      // 请求失败时尝试使用缓存
      const staleCache = getCache<any>(cacheKey);
      if (staleCache) {
        console.log('[acquisition-stats] 请求失败，使用缓存');
        this.setData({
          allRecords: staleCache.records,
          warehouseList: staleCache.warehouses,
          fromCache: true,
          pageLoading: false
        });
        this.calculateStats();
        wx.showToast({ title: '网络异常，显示缓存数据', icon: 'none' });
      } else {
        this.setData({
          allRecords: [],
          warehouseList: [],
          warehouseStats: [],
          pageLoading: false
        });
      }
    }

    wx.stopPullDownRefresh();
  },

  /**
   * 计算统计数据
   */
  calculateStats() {
    const { allRecords, warehouseList, currentTab } = this.data;

    // 筛选数据（今日 or 全部）
    let records = [...allRecords];
    if (currentTab === 0) {
      const today = new Date().toLocaleDateString('zh-CN');
      records = records.filter(r => {
        const recordDate = r.acquisitionDate || (r.createTime ? new Date(r.createTime).toLocaleDateString('zh-CN') : '');
        return recordDate === today;
      });
    }

    // 计算总量
    const totalWeight = records.reduce((sum, r) => sum + (r.weight || r.quantity || 0), 0);
    const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const avgPrice = totalWeight > 0 ? (totalAmount / totalWeight).toFixed(2) : '0';

    // 农户数（去重）
    const farmerIds = new Set(records.map(r => r.farmerId));
    const farmerCount = farmerIds.size;

    // 按仓库分组统计
    const warehouseMap = new Map<string, any>();

    // 初始化仓库数据
    warehouseList.forEach((w: any) => {
      const warehouseId = w._id || w.id || w.warehouseId;
      warehouseMap.set(warehouseId, {
        warehouseId,
        warehouseName: w.name || w.warehouseName,
        weight: 0,
        amount: 0,
        currentStock: w.currentStock || 0
      });
    });

    // 累计每个仓库的数据
    records.forEach(r => {
      const warehouseId = r.warehouseId;
      if (warehouseMap.has(warehouseId)) {
        const wData = warehouseMap.get(warehouseId);
        wData.weight += (r.weight || r.quantity || 0);
        wData.amount += (r.amount || 0);
      } else {
        // 如果仓库不在列表中，创建一个
        warehouseMap.set(warehouseId, {
          warehouseId,
          warehouseName: r.warehouseName || '未知仓库',
          weight: r.weight || r.quantity || 0,
          amount: r.amount || 0,
          currentStock: 0
        });
      }
    });

    // 格式化仓库统计数据
    const warehouseStats = Array.from(warehouseMap.values())
      .filter(w => w.weight > 0 || w.currentStock > 0)
      .map(w => {
        const capacityConfig = WAREHOUSE_CAPACITY[w.warehouseId] || { type: '中', capacity: 150000 };
        const usagePercent = Math.round((w.currentStock / capacityConfig.capacity) * 100);

        let capacityStatus = 'normal';
        if (usagePercent >= 95) {
          capacityStatus = 'full';
        } else if (usagePercent >= 80) {
          capacityStatus = 'warning';
        }

        const avgPrice = w.weight > 0 ? (w.amount / w.weight).toFixed(2) : '0';

        return {
          ...w,
          weightKg: w.weight,
          formatWeight: formatWeight(w.weight),
          formatAmount: formatAmount(w.amount),
          avgPrice,
          percent: totalWeight > 0 ? Math.round((w.weight / totalWeight) * 100) : 0,
          warehouseType: capacityConfig.type,
          capacity: capacityConfig.capacity,
          formatCapacity: formatWeight(capacityConfig.capacity),
          formatCurrentStock: formatWeight(w.currentStock),
          usagePercent,
          capacityStatus
        };
      })
      .sort((a, b) => b.weight - a.weight);

    // 计算趋势数据（最近7天）
    const trendData = this.calculateTrendData(allRecords);

    this.setData({
      currentStats: {
        totalWeight: totalWeight + 'kg',
        totalAmount: formatAmount(totalAmount),
        avgPrice: avgPrice + '元/kg',
        farmerCount: farmerCount + '户'
      },
      warehouseStats,
      trendData
    });
  },

  /**
   * 计算趋势数据（最近7天）
   */
  calculateTrendData(allRecords: any[]) {
    const days = 7;
    const trendMap = new Map<string, number>();

    // 初始化最近7天
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')}`;
      trendMap.set(dateStr, 0);
    }

    // 统计每天的收购量
    allRecords.forEach(r => {
      let recordDate: Date;
      if (r.acquisitionDate) {
        recordDate = new Date(r.acquisitionDate);
      } else if (r.createTime) {
        recordDate = new Date(r.createTime);
      } else {
        return;
      }

      const dateStr = `${recordDate.getMonth() + 1}-${String(recordDate.getDate()).padStart(2, '0')}`;
      if (trendMap.has(dateStr)) {
        const weight = r.weight || r.quantity || 0;
        trendMap.set(dateStr, (trendMap.get(dateStr) || 0) + weight);
      }
    });

    // 转换为数组并计算高度
    const trendArray = Array.from(trendMap.entries()).map(([date, value]) => ({
      date,
      value: value / 1000, // 转为吨
      label: date.split('-')[1] + '日'
    }));

    const maxValue = Math.max(...trendArray.map(t => t.value), 1);
    return trendArray.map(t => ({
      ...t,
      heightPercent: Math.round((t.value / maxValue) * 100)
    }));
  },

  // 跳转到仓库详情页
  goWarehouseDetail(e: any) {
    const warehouseId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/stats/warehouse-detail/index?id=${warehouseId}`
    });
  }
});
