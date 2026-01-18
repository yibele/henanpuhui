/**
 * 农户列表页面
 * @description 展示所有签约农户
 */

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
    // 农户列表
    farmers: [] as any[],
    // 筛选后的农户列表
    filteredFarmers: [] as any[],
    // 统计数据
    stats: {
      totalFarmers: 0 as any,    // 签约农户数
      totalAcreage: '0' as any,  // 总面积（格式化后的字符串）
      totalDeposit: '0' as any   // 总定金（格式化后的字符串）
    },
    // 加载状态
    loading: false
  },

  onLoad() {
    this.loadFarmers();
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 1 });
    }
    // 刷新数据
    this.loadFarmers();
  },

  /**
   * 加载农户列表（从云函数获取真实数据）
   */
  async loadFarmers() {
    this.setData({ loading: true });

    try {
      // 获取当前用户信息
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      console.log('[farmer-list] 加载农户列表, userId:', userId);

      // 调用云函数获取农户列表
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId,
          page: 1,
          pageSize: 100  // 获取足够多的数据
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawFarmers = result.data.list || [];

        // 格式化农户数据
        const farmers = rawFarmers.map((f: any) => ({
          id: f._id,
          customerCode: f.farmerId,
          name: f.name,
          phone: f.phone,
          grade: f.grade || 'bronze',
          gradeText: GRADE_TEXT_MAP[f.grade] || '铜牌',
          acreage: f.acreage || 0,
          deposit: f.deposit || 0,
          address: f.address || {},
          addressText: f.addressText || '',
          contractDate: f.createTime ? new Date(f.createTime).toLocaleDateString('zh-CN') : ''
        }));

        // 计算统计数据
        const totalAcreage = farmers.reduce((sum: number, f: any) => sum + (f.acreage || 0), 0);
        const totalDeposit = farmers.reduce((sum: number, f: any) => sum + (f.deposit || 0), 0);

        const stats = {
          totalFarmers: farmers.length,
          totalAcreage: this.formatNumber(totalAcreage),
          totalDeposit: this.formatMoney(totalDeposit)
        };

        this.setData({ farmers, stats, loading: false });
        this.filterFarmers();
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
      this.setData({
        farmers: [],
        filteredFarmers: [],
        stats: { totalFarmers: 0, totalAcreage: '0', totalDeposit: '0' },
        loading: false
      });
    }
  },

  /**
   * 格式化数字（保留1位小数）
   */
  formatNumber(num: number): string {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toFixed(1);
  },

  /**
   * 格式化金额（显示为X.X万）
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
   * 筛选农户（仅按搜索词）
   */
  filterFarmers() {
    const { farmers, searchValue } = this.data;

    let filtered = [...farmers];

    // 按搜索词筛选（支持姓名、手机号、客户编码）
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
   * 点击农户项，查看详情
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
    this.loadFarmers();
    wx.stopPullDownRefresh();
  }
});
