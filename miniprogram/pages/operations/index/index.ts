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
    // 首次加载：优先使用缓存
    this.loadData(false);
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
    // 页面显示时：使用缓存
    this.loadData(false);
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
