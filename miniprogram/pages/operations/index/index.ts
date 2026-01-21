/**
 * 发苗管理页面（助理）
 * @description 显示种苗发放记录列表，支持缓存和下拉刷新
 */

import { getCache, setCache, CacheKeys } from '../../../utils/cache';

// 获取应用实例
const app = getApp();

// 格式化数量
function formatQuantity(quantity: number): string {
  if (quantity >= 10000) {
    return (quantity / 10000).toFixed(1) + '万株';
  } else if (quantity >= 1000) {
    return (quantity / 1000).toFixed(1) + '千株';
  }
  return quantity + '株';
}

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万';
  }
  return '¥' + amount.toFixed(0);
}

Page({
  data: {
    // 视图模式: 'records'-发放记录, 'farmers'-农户进度
    viewMode: 'farmers',
    // 发苗状态筛选: all/pending/inProgress/completed
    farmerStatusFilter: 'all',
    // 发苗状态统计
    farmerStatusStats: {
      all: 0,
      pending: 0,      // 未发苗
      inProgress: 0,   // 发苗中
      completed: 0     // 已完成
    },
    // 农户列表（带发苗状态）
    farmers: [] as any[],
    filteredFarmers: [] as any[],
    // 发苗统计
    stats: {
      totalCount: '0',
      totalQuantity: '0',
      totalAmount: '0',
      farmerCount: '0'
    },
    // 种苗发放记录
    seedRecords: [] as any[],
    // 加载状态
    loading: true
  },

  onLoad() {
    // 首次加载：加载农户发苗状态
    this.loadFarmerStatus(false);
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
    // 页面显示时刷新数据
    this.loadFarmerStatus(false);
  },

  /**
   * 加载数据
   * @param forceRefresh 是否强制刷新
   */
  async loadData(forceRefresh: boolean = false) {
    // 先尝试从缓存加载
    if (!forceRefresh) {
      const cached = getCache<any>(CacheKeys.SEED_RECORDS);
      if (cached) {
        console.log('[operations-index] 从缓存加载数据');
        this.setData({
          seedRecords: cached.seedRecords,
          stats: cached.stats,
          loading: false
        });
        return;
      }
    }

    // 从服务器加载
    this.setData({ loading: true });

    try {
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      console.log('[operations-index] 从服务器加载数据, userId:', userId);

      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'list',
          userId,
          page: 1,
          pageSize: 100
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawRecords = result.data.list || [];

        const records = rawRecords.map((r: any) => ({
          id: r._id,
          recordId: r.recordId,
          farmerId: r.farmerId,
          farmerName: r.farmerName,
          phone: r.farmerPhone || '',
          quantity: r.quantity || 0,
          unitPrice: r.unitPrice || 0,
          amount: r.amount || 0,
          distributedArea: r.distributedArea || 0,
          receiverName: r.receiverName || '',
          receiveLocation: r.receiveLocation || '',
          managerName: r.createByName || r.managerName || '',
          date: r.distributionDate || (r.createTime ? new Date(r.createTime).toLocaleDateString('zh-CN') : '')
        }));

        const totalCount = records.length;
        const totalQuantity = records.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
        const totalAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        const farmerIds = new Set(records.map((r: any) => r.farmerId));

        const stats = {
          totalCount: totalCount.toString(),
          totalQuantity: formatQuantity(totalQuantity),
          totalAmount: formatAmount(totalAmount),
          farmerCount: farmerIds.size.toString()
        };

        // 保存到缓存
        setCache(CacheKeys.SEED_RECORDS, { seedRecords: records, stats });

        this.setData({
          seedRecords: records,
          stats,
          loading: false
        });

        if (forceRefresh) {
          wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 });
        }
      } else {
        console.error('获取发苗记录失败:', result.message);
        this.setData({
          seedRecords: [],
          stats: { totalCount: '0', totalQuantity: '0株', totalAmount: '¥0', farmerCount: '0' },
          loading: false
        });
      }
    } catch (error) {
      console.error('加载发苗记录失败:', error);

      // 请求失败时尝试使用缓存
      const staleCache = getCache<any>(CacheKeys.SEED_RECORDS);
      if (staleCache) {
        console.log('[operations-index] 请求失败，使用缓存');
        this.setData({
          seedRecords: staleCache.seedRecords,
          stats: staleCache.stats,
          loading: false
        });
        wx.showToast({ title: '网络异常，显示缓存数据', icon: 'none' });
      } else {
        this.setData({
          seedRecords: [],
          stats: { totalCount: '0', totalQuantity: '0株', totalAmount: '¥0', farmerCount: '0' },
          loading: false
        });
      }
    }
  },

  /**
   * 加载农户发苗状态
   */
  async loadFarmerStatus(forceRefresh: boolean = false) {
    this.setData({ loading: true });

    try {
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      // 1. 获取农户列表
      const farmerRes = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId,
          page: 1,
          pageSize: 1000
        }
      });

      const farmerResult = farmerRes.result as any;
      if (!farmerResult.success || !farmerResult.data) {
        this.setData({ loading: false });
        return;
      }

      // 2. 获取发苗统计
      const statsRes = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'getDistributionStats'
        }
      });

      const statsResult = statsRes.result as any;
      const seedStatsMap = statsResult.success ? statsResult.data : {};

      // 3. 格式化农户数据
      const rawFarmers = farmerResult.data.list || [];
      const farmers = rawFarmers.map((f: any) => {
        const farmerSeedStats = seedStatsMap[f._id];
        const seedDistributionComplete = f.seedDistributionComplete || false;

        let seedStatus = 'pending';
        let distributedQuantity = 0;

        if (seedDistributionComplete) {
          seedStatus = 'completed';
        } else if (farmerSeedStats && farmerSeedStats.recordCount > 0) {
          seedStatus = 'inProgress';
          distributedQuantity = farmerSeedStats.totalQuantity / 10000;  // 转万株
        }

        return {
          id: f._id,
          name: f.name,
          phone: f.phone,
          acreage: f.acreage || 0,
          seedTotal: f.seedTotal || 0,
          seedStatus,
          seedDistributionComplete,
          distributedQuantity,
          recordCount: farmerSeedStats?.recordCount || 0
        };
      });

      // 4. 计算状态统计
      const farmerStatusStats = {
        all: farmers.length,
        pending: farmers.filter((f: any) => f.seedStatus === 'pending').length,
        inProgress: farmers.filter((f: any) => f.seedStatus === 'inProgress').length,
        completed: farmers.filter((f: any) => f.seedStatus === 'completed').length
      };

      this.setData({ farmers, farmerStatusStats, loading: false });
      this.filterFarmers();

      if (forceRefresh) {
        wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 });
      }
    } catch (error) {
      console.error('加载农户发苗状态失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 筛选农户
   */
  filterFarmers() {
    const { farmers, farmerStatusFilter } = this.data;
    let filtered = [...farmers];

    if (farmerStatusFilter !== 'all') {
      filtered = filtered.filter(f => f.seedStatus === farmerStatusFilter);
    }

    this.setData({ filteredFarmers: filtered });
  },

  /**
   * 切换状态筛选
   */
  onStatusFilterChange(e: WechatMiniprogram.TouchEvent) {
    const status = e.currentTarget.dataset.status;
    this.setData({ farmerStatusFilter: status });
    this.filterFarmers();
  },

  /**
   * 点击农户 - 跳转到发苗页面
   */
  onFarmerTap(e: WechatMiniprogram.TouchEvent) {
    const farmer = e.currentTarget.dataset.farmer;
    wx.navigateTo({
      url: `/pages/operations/seed-add/index?farmerId=${farmer.id}`
    });
  },

  /**
   * 新增种苗发放
   */
  onAddSeed() {
    wx.navigateTo({
      url: '/pages/operations/seed-add/index'
    });
  },

  /**
   * 点击记录 - 跳转到编辑页面
   */
  onRecordTap(e: any) {
    const record = e.currentTarget.dataset.record;
    // 跳转到编辑页面，传递记录 ID
    wx.navigateTo({
      url: `/pages/operations/seed-add/index?recordId=${record.id}&mode=edit`
    });
  },

  /**
   * 下拉刷新 - 强制从服务器获取
   */
  onPullDownRefresh() {
    this.loadData(true);  // 强制刷新
    wx.stopPullDownRefresh();
  }
});
