/**
 * 收苗统计页面
 * @description 管理层查看收苗数据汇总，使用后端聚合统计
 */

import { getCache, setCache } from '../../../utils/cache';
import { formatWeight, formatAmount, formatNumber } from '../../../utils/format';

// 获取应用实例
const app = getApp();

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
    // 后端聚合数据（今日 + 累计）
    _todayData: null as any,
    _allData: null as any,
    // 仓库信息（用于库存容量显示）
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

  /**
   * 获取用户ID
   */
  getUserId(): string {
    const globalData = (app.globalData as any) || {};
    const userInfo = globalData.currentUser || {};
    return userInfo.id || userInfo._id || '';
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab });
    this.renderStats();
  },

  /**
   * 加载数据（后端聚合，不再全量拉取收购记录）
   * @param forceRefresh 是否强制刷新
   */
  async loadData(forceRefresh: boolean = false) {
    const cacheKey = 'cache_acquisition_stats_agg';

    // 先尝试从缓存加载
    if (!forceRefresh) {
      const cached = getCache<any>(cacheKey);
      if (cached) {
        this.setData({
          _todayData: cached.todayData,
          _allData: cached.allData,
          warehouseList: cached.warehouses,
          fromCache: true,
          pageLoading: false
        });
        this.renderStats();
        return;
      }
    }

    this.setData({ pageLoading: true, fromCache: false });

    try {
      const userId = this.getUserId();

      // 并行获取：今日聚合、累计聚合、仓库列表
      const [todayRes, allRes, warehouseRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'acquisition-manage',
          data: {
            action: 'getSummaryStats',
            dateRange: 'today',
            groupByWarehouse: true
          }
        }),
        wx.cloud.callFunction({
          name: 'acquisition-manage',
          data: {
            action: 'getSummaryStats',
            dateRange: 'all',
            groupByWarehouse: true
          }
        }),
        wx.cloud.callFunction({
          name: 'warehouse-manage',
          data: {
            action: 'list',
            userId
          }
        })
      ]);

      const todayResult = todayRes.result as any;
      const allResult = allRes.result as any;
      const warehouseResult = warehouseRes.result as any;

      const todayData = (todayResult && todayResult.success && todayResult.data) ? todayResult.data : null;
      const allData = (allResult && allResult.success && allResult.data) ? allResult.data : null;
      const warehouses = (warehouseResult && warehouseResult.success && warehouseResult.data) ? warehouseResult.data : [];

      // 保存到缓存
      setCache(cacheKey, { todayData, allData, warehouses });

      this.setData({
        _todayData: todayData,
        _allData: allData,
        warehouseList: warehouses,
        pageLoading: false,
        fromCache: false
      });

      this.setUpdateTime();
      this.renderStats();

      if (forceRefresh) {
        wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 });
      }
    } catch (error) {
      console.error('加载收购数据失败:', error);

      // 请求失败时尝试使用缓存
      const staleCache = getCache<any>(cacheKey);
      if (staleCache) {
        this.setData({
          _todayData: staleCache.todayData,
          _allData: staleCache.allData,
          warehouseList: staleCache.warehouses,
          fromCache: true,
          pageLoading: false
        });
        this.renderStats();
        wx.showToast({ title: '网络异常，显示缓存数据', icon: 'none' });
      } else {
        this.setData({
          warehouseStats: [],
          pageLoading: false
        });
      }
    }

    wx.stopPullDownRefresh();
  },

  /**
   * 根据当前 Tab 渲染统计数据（纯展示，数据来自后端聚合）
   */
  renderStats() {
    const { currentTab, warehouseList } = this.data;
    const statsData = currentTab === 0 ? this.data._todayData : this.data._allData;

    if (!statsData) {
      this.setData({
        currentStats: {
          totalWeight: '0',
          totalAmount: '0',
          avgPrice: '0',
          farmerCount: '0'
        },
        warehouseStats: []
      });
      return;
    }

    const totalWeight = statsData.totalWeight || 0;
    const totalAmount = statsData.totalAmount || 0;
    const avgPrice = totalWeight > 0 ? formatNumber(totalAmount / totalWeight, 2) : '0';
    const farmerCount = statsData.farmerCount || 0;

    // 构建仓库 Map（用于补充库存容量信息）
    const warehouseInfoMap = new Map<string, any>();
    warehouseList.forEach((w: any) => {
      const id = w._id || w.id || w.warehouseId;
      warehouseInfoMap.set(id, w);
    });

    // 使用后端按仓库分组的聚合数据
    const serverWarehouseStats: any[] = statsData.warehouseStats || [];

    const warehouseStats = serverWarehouseStats
      .map((ws: any) => {
        const warehouseId = ws.warehouseId;
        const warehouseInfo = warehouseInfoMap.get(warehouseId);
        const currentStock = warehouseInfo?.currentStock || warehouseInfo?.stats?.currentStock || 0;
        const capacityConfig = WAREHOUSE_CAPACITY[warehouseId] || { type: '中', capacity: 150000 };
        const usagePercent = Math.round((currentStock / capacityConfig.capacity) * 100);

        let capacityStatus = 'normal';
        if (usagePercent >= 95) {
          capacityStatus = 'full';
        } else if (usagePercent >= 80) {
          capacityStatus = 'warning';
        }

        const wAvgPrice = ws.weight > 0 ? formatNumber(ws.amount / ws.weight, 2) : '0';

        return {
          warehouseId,
          warehouseName: ws.warehouseName || warehouseInfo?.name || '未知仓库',
          weight: ws.weight || 0,
          amount: ws.amount || 0,
          weightKg: ws.weight || 0,
          formatWeight: formatWeight(ws.weight || 0),
          formatAmount: formatAmount(ws.amount || 0),
          avgPrice: wAvgPrice,
          percent: totalWeight > 0 ? Math.round(((ws.weight || 0) / totalWeight) * 100) : 0,
          warehouseType: capacityConfig.type,
          capacity: capacityConfig.capacity,
          formatCapacity: formatWeight(capacityConfig.capacity),
          currentStock,
          formatCurrentStock: formatWeight(currentStock),
          usagePercent,
          capacityStatus
        };
      })
      .sort((a, b) => b.weight - a.weight);

    this.setData({
      currentStats: {
        totalWeight: totalWeight + 'kg',
        totalAmount: formatAmount(totalAmount),
        avgPrice: avgPrice + '元/kg',
        farmerCount: farmerCount + '户'
      },
      warehouseStats
    });
  },

  // 跳转到仓库详情页
  goWarehouseDetail(e: any) {
    const warehouseId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/stats/warehouse-detail/index?id=${warehouseId}`
    });
  }
});
