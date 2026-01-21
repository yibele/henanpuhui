/**
 * 农户列表页面
 * @description 展示所有签约农户，支持缓存和下拉刷新
 */

import { getCache, setCache, CacheKeys } from '../../../utils/cache';

// 获取应用实例
const app = getApp();

// 等级文本映射
const GRADE_TEXT_MAP: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

Page({
  data: {
    // 搜索关键词
    searchValue: '',
    // 发苗状态筛选: all/pending/inProgress/completed
    seedStatusFilter: 'all',
    // 发苗状态统计
    seedStatusStats: {
      all: 0,
      pending: 0,      // 未发苗
      inProgress: 0,   // 发苗中
      completed: 0     // 已完成
    },
    // 农户列表
    farmers: [] as any[],
    // 筛选后的农户列表
    filteredFarmers: [] as any[],
    // 统计数据
    stats: {
      totalFarmers: 0 as any,
      totalAcreage: '0' as any,
      totalDeposit: '0' as any
    },
    // 加载状态
    loading: false
  },

  onLoad() {
    // 首次加载：优先使用缓存
    this.loadFarmers(false);
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 1 });
    }
    // 页面显示时：使用缓存
    this.loadFarmers(false);
  },

  /**
   * 加载农户列表
   * @param forceRefresh 是否强制刷新（忽略缓存）
   */
  async loadFarmers(forceRefresh: boolean = false) {
    // 先尝试从缓存加载
    if (!forceRefresh) {
      const cached = getCache<any>(CacheKeys.FARMER_LIST);
      if (cached) {
        console.log('[farmer-list] 从缓存加载数据');
        this.setData({
          farmers: cached.farmers,
          stats: cached.stats,
          loading: false
        });
        this.filterFarmers();
        return;
      }
    }

    // 从服务器加载
    this.setData({ loading: true });

    try {
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      console.log('[farmer-list] 从服务器加载数据, userId:', userId);

      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId,
          page: 1,
          pageSize: 1000  // 一次性加载所有农户（最多支持 1000 个）
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawFarmers = result.data.list || [];

        // 格式化农户基础数据
        const farmers = rawFarmers.map((f: any) => ({
          id: f._id,
          customerCode: f.farmerId,
          name: f.name,
          phone: f.phone,
          grade: f.grade || 'bronze',
          gradeText: GRADE_TEXT_MAP[f.grade] || '铜牌',
          acreage: f.acreage || 0,
          seedTotal: f.seedTotal || 0,
          deposit: f.deposit || 0,
          address: f.address || {},
          addressText: f.addressText || '',
          contractDate: f.createTime ? new Date(f.createTime).toLocaleDateString('zh-CN') : '',
          // 发苗状态字段
          seedDistributionComplete: f.seedDistributionComplete || false,
          seedStatus: 'pending',  // 默认未发苗，后面会更新
          distributedQuantity: 0
        }));

        // 查询每个农户的发苗记录来更新状态
        await this.loadFarmersSeedStatus(farmers);

        // 计算发苗状态统计
        const seedStatusStats = {
          all: farmers.length,
          pending: farmers.filter((f: any) => f.seedStatus === 'pending').length,
          inProgress: farmers.filter((f: any) => f.seedStatus === 'inProgress').length,
          completed: farmers.filter((f: any) => f.seedStatus === 'completed').length
        };

        // 计算统计数据
        const totalAcreage = farmers.reduce((sum: number, f: any) => sum + (f.acreage || 0), 0);
        const totalDeposit = farmers.reduce((sum: number, f: any) => sum + (f.deposit || 0), 0);

        const stats = {
          totalFarmers: farmers.length,
          totalAcreage: this.formatNumber(totalAcreage),
          totalDeposit: this.formatMoney(totalDeposit)
        };

        // 保存到缓存
        setCache(CacheKeys.FARMER_LIST, { farmers, stats, seedStatusStats });

        this.setData({ farmers, stats, seedStatusStats, loading: false });
        this.filterFarmers();

        if (forceRefresh) {
          wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 });
        }
      } else {
        console.error('获取农户列表失败:', result.message);
        this.setData({
          farmers: [],
          filteredFarmers: [],
          stats: { totalFarmers: 0, totalAcreage: '0', totalDeposit: '0' },
          loading: false
        });
      }
    } catch (error) {
      console.error('加载农户列表失败:', error);

      // 请求失败时尝试使用缓存
      const staleCache = getCache<any>(CacheKeys.FARMER_LIST);
      if (staleCache) {
        console.log('[farmer-list] 请求失败，使用缓存');
        this.setData({
          farmers: staleCache.farmers,
          stats: staleCache.stats,
          loading: false
        });
        this.filterFarmers();
        wx.showToast({ title: '网络异常，显示缓存数据', icon: 'none' });
      } else {
        this.setData({
          farmers: [],
          filteredFarmers: [],
          stats: { totalFarmers: 0, totalAcreage: '0', totalDeposit: '0' },
          loading: false
        });
      }
    }
  },

  /**
   * 格式化数字
   */
  formatNumber(num: number): string {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toFixed(1);
  },

  /**
   * 格式化金额
   */
  formatMoney(amount: number): string {
    if (amount >= 10000) {
      return (amount / 10000).toFixed(2) + '万';
    } else if (amount >= 1000) {
      return (amount / 10000).toFixed(2) + '万';
    }
    return amount.toString();
  },

  /**
   * 加载农户发苗状态
   * 查询 seed_records 集合获取每个农户的发苗情况
   */
  async loadFarmersSeedStatus(farmers: any[]) {
    try {
      // 获取所有农户的发苗记录统计
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'getDistributionStats'
        }
      });

      const result = res.result as any;
      if (result.success && result.data) {
        const statsMap = result.data;  // farmerId -> { recordCount, totalQuantity }

        // 更新每个农户的发苗状态
        farmers.forEach((farmer: any) => {
          const farmerStats = statsMap[farmer.id];
          if (farmer.seedDistributionComplete) {
            farmer.seedStatus = 'completed';
          } else if (farmerStats && farmerStats.recordCount > 0) {
            farmer.seedStatus = 'inProgress';
            farmer.distributedQuantity = farmerStats.totalQuantity / 10000;  // 转万株
          } else {
            farmer.seedStatus = 'pending';
          }
        });
      }
    } catch (error) {
      console.error('加载农户发苗状态失败:', error);
    }
  },

  /**
   * 筛选农户
   */
  filterFarmers() {
    const { farmers, searchValue, seedStatusFilter } = this.data;
    let filtered = [...farmers];

    // 发苗状态筛选
    if (seedStatusFilter !== 'all') {
      filtered = filtered.filter(f => f.seedStatus === seedStatusFilter);
    }

    // 关键词搜索
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      filtered = filtered.filter(f =>
        f.name.toLowerCase().includes(keyword) ||
        f.phone.includes(keyword) ||
        (f.customerCode && f.customerCode.toLowerCase().includes(keyword))
      );
    }

    this.setData({ filteredFarmers: filtered });
  },

  /**
   * 切换发苗状态筛选
   */
  onSeedStatusChange(e: WechatMiniprogram.TouchEvent) {
    const status = e.currentTarget.dataset.status;
    this.setData({ seedStatusFilter: status });
    this.filterFarmers();
  },

  /**
   * 搜索输入
   */
  onSearchChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ searchValue: e.detail.value });
    this.filterFarmers();
  },

  /**
   * 清除搜索
   */
  onSearchClear() {
    this.setData({ searchValue: '' });
    this.filterFarmers();
  },

  /**
   * 点击农户项
   */
  onFarmerTap(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/farmers/detail/index?id=${id}`
    });
  },

  /**
   * 新增农户
   */
  onAddFarmer() {
    wx.navigateTo({
      url: '/pages/farmers/add/index'
    });
  },

  /**
   * 下拉刷新 - 强制从服务器获取最新数据
   */
  onPullDownRefresh() {
    this.loadFarmers(true);  // 强制刷新
    wx.stopPullDownRefresh();
  }
});
