/**
 * 农户列表页面
 * @description 展示所有签约农户，使用服务端搜索和分页加载
 */

// 获取应用实例
const app = getApp();

// 等级文本映射
const GRADE_TEXT_MAP: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

// 搜索防抖定时器
let searchTimer: ReturnType<typeof setTimeout> | null = null;

Page({
  data: {
    // 搜索关键词
    searchValue: '',
    // 农户列表
    farmers: [] as any[],
    // 统计数据
    stats: {
      totalFarmers: 0 as any,
      totalAcreage: '0' as any,
      totalDeposit: '0' as any
    },
    // 分页状态
    currentPage: 1,
    hasMore: true,
    // 加载状态
    loading: false,
    loadingMore: false
  },

  onLoad() {
    this.loadFarmers(1, false);
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 1 });
    }
  },

  /**
   * 加载农户列表（服务端分页）
   */
  async loadFarmers(page: number = 1, append: boolean = false) {
    const globalData = (app.globalData as any) || {};
    const userInfo = globalData.currentUser || {};
    const userId = userInfo.id || userInfo._id || '';
    const { searchValue } = this.data;

    if (append) {
      this.setData({ loadingMore: true });
    } else {
      this.setData({ loading: true });
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId,
          keyword: searchValue || '',  // 服务端搜索
          page,
          pageSize: 20
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawFarmers = result.data.list || [];
        const total = result.data.total || 0;

        // 格式化农户数据
        const newFarmers = rawFarmers.map((f: any) => ({
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
          contractDate: f.createTime ? new Date(f.createTime).toLocaleDateString('zh-CN') : ''
        }));

        if (append) {
          // 追加模式
          const currentFarmers = this.data.farmers;
          this.setData({
            farmers: [...currentFarmers, ...newFarmers],
            currentPage: page,
            hasMore: newFarmers.length >= 20,
            loadingMore: false
          });
        } else {
          // 替换模式（首次加载或搜索）
          // 计算统计
          const totalAcreage = this.formatNumber(
            rawFarmers.reduce((sum: number, f: any) => sum + (f.acreage || 0), 0)
          );
          const totalDeposit = this.formatMoney(
            rawFarmers.reduce((sum: number, f: any) => sum + (f.deposit || 0), 0)
          );

          this.setData({
            farmers: newFarmers,
            stats: {
              totalFarmers: total,
              totalAcreage,
              totalDeposit
            },
            currentPage: page,
            hasMore: newFarmers.length >= 20,
            loading: false
          });
        }
      } else {
        this.setData({ loading: false, loadingMore: false });
      }
    } catch (error) {
      console.error('加载农户列表失败:', error);
      this.setData({ loading: false, loadingMore: false });
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
    }
    return amount.toString();
  },

  /**
   * 搜索输入（服务端搜索，带防抖）
   */
  onSearchChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    this.setData({ searchValue: value });

    // 清除之前的定时器
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // 防抖 300ms
    searchTimer = setTimeout(() => {
      this.loadFarmers(1, false);
    }, 300);
  },

  /**
   * 清除搜索
   */
  onSearchClear() {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    this.setData({ searchValue: '' });
    this.loadFarmers(1, false);
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
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadFarmers(1, false);
    wx.stopPullDownRefresh();
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    const { hasMore, loadingMore, currentPage } = this.data;
    if (hasMore && !loadingMore) {
      this.loadFarmers(currentPage + 1, true);
    }
  }
});
