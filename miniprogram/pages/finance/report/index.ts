/**
 * 结算报表页面
 * 展示结算统计数据，支持日期筛选和分页
 */

const reportApp = getApp();

// 快捷日期选项
const DATE_SHORTCUTS = [
  { label: '今日', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '全部', value: 'all' }
];

// 每页条数
const PAGE_SIZE = 20;

Page({
  data: {
    // 统计数据
    summary: {
      totalCount: 0,
      totalAcquisitionAmount: 0,
      totalDeduction: 0,
      totalActualPayment: 0
    },

    // 格式化金额
    formatted: {
      totalAcquisitionAmount: '0',
      totalDeduction: '0',
      totalActualPayment: '0'
    },

    // 结算明细列表
    settlements: [] as any[],

    // 分页
    page: 1,
    total: 0,
    hasMore: true,

    // 日期筛选
    dateShortcuts: DATE_SHORTCUTS,
    activeShortcut: 'all',
    startDate: '',
    endDate: '',

    // 加载状态
    isLoading: false
  },

  onLoad() {
    this.loadData(true);
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 0 });
    }
  },

  onPullDownRefresh() {
    this.loadData(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadSettlements(false);
    }
  },

  /**
   * 加载数据（汇总 + 明细）
   */
  async loadData(reset: boolean = true) {
    await Promise.all([
      this.loadStatistics(),
      this.loadSettlements(reset)
    ]);
  },

  /**
   * 加载统计汇总
   */
  async loadStatistics() {
    try {
      const { startDate, endDate } = this.data;

      const res = await wx.cloud.callFunction({
        name: 'settlement-manage',
        data: {
          action: 'getStatistics',
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });

      const result = res.result as any;

      if (result && result.success && result.data) {
        const { summary } = result.data;

        this.setData({
          summary,
          formatted: {
            totalAcquisitionAmount: this.formatMoney(summary.totalAcquisitionAmount),
            totalDeduction: this.formatMoney(summary.totalDeduction),
            totalActualPayment: this.formatMoney(summary.totalActualPayment)
          }
        });
      }
    } catch (error: any) {
      console.error('加载统计数据失败:', error);
    }
  },

  /**
   * 加载结算明细列表（分页）
   */
  async loadSettlements(reset: boolean = true) {
    if (this.data.isLoading) return;

    const page = reset ? 1 : this.data.page;
    const { startDate, endDate } = this.data;

    this.setData({ isLoading: true });

    try {
      const userInfo = reportApp.globalData.userInfo;
      const res = await wx.cloud.callFunction({
        name: 'settlement-manage',
        data: {
          action: 'list',
          userId: userInfo?._id || '',
          page,
          pageSize: PAGE_SIZE,
          status: 'completed',  // 只查已完成的
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });

      const result = res.result as any;

      if (result && result.success) {
        const list = result.data?.list || [];

        // 格式化数据
        const formattedList = list.map((s: any) => ({
          ...s,
          formattedAmount: this.formatMoney(s.acquisitionAmount || 0),
          formattedActual: this.formatMoney(s.actualPayment || 0),
          formattedDeduction: this.formatMoney(s.totalDeduction || 0),
          paymentDateStr: this.formatFullDate(s.paymentTime || s.completeTime)
        }));

        this.setData({
          settlements: reset ? formattedList : [...this.data.settlements, ...formattedList],
          page: page + 1,
          total: result.data?.total || 0,
          hasMore: formattedList.length >= PAGE_SIZE,
          isLoading: false
        });
      } else {
        throw new Error(result?.message || '获取数据失败');
      }
    } catch (error: any) {
      console.error('加载结算明细失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 格式化金额
   */
  formatMoney(amount: number): string {
    if (!amount || amount === 0) return '0';
    if (amount >= 10000) {
      return (amount / 10000).toFixed(2) + '万';
    }
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * 格式化完整日期
   */
  formatFullDate(dateStr: string | Date): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 快捷日期选择
   */
  onShortcutTap(e: WechatMiniprogram.TouchEvent) {
    const value = e.currentTarget.dataset.value;
    const today = new Date();
    let startDate = '';
    let endDate = '';

    switch (value) {
      case 'today':
        startDate = this.formatDate(today);
        endDate = startDate;
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1);
        startDate = this.formatDate(weekStart);
        endDate = this.formatDate(today);
        break;
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = this.formatDate(monthStart);
        endDate = this.formatDate(today);
        break;
      case 'all':
        startDate = '';
        endDate = '';
        break;
    }

    this.setData({
      activeShortcut: value,
      startDate,
      endDate,
      settlements: [],
      page: 1,
      hasMore: true
    });

    this.loadData(true);
  },

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 查看结算详情
   */
  onSettlementTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/finance/detail/index?id=${id}`
    });
  }
});
