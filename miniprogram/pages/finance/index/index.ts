/**
 * 结算管理页面（管理层视图）
 * @description 显示结算汇总、待审核、待支付、已完成等状态的结算记录
 * 支持分页加载，适应7000+农户的大数据量场景
 */

import { getSettlementsByPage, MOCK_SETTLEMENT_OVERVIEW } from '../../../models/mock-data';
import type { Settlement, SettlementOverviewStats } from '../../../models/types';

// 结算状态标签
const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '待支付',
  paying: '支付中',
  completed: '已完成'
};

// 状态对应的颜色类
const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  paying: 'blue',  // 支付中也用蓝色（合并到待支付）
  completed: 'green'
};

// 每页加载条数
const PAGE_SIZE = 20;

Page({
  data: {
    // 汇总统计
    overview: {} as SettlementOverviewStats,
    formattedOverview: {
      totalPayable: '',
      totalPaid: '',
      totalPending: '',
      totalPrepaid: ''
    },
    
    // Tab切换
    currentTab: 0,  // 0:全部 1:待审核 2:待支付 3:已完成
    tabs: ['全部', '待审核', '待支付', '已完成'],
    tabStatusMap: ['all', 'pending', 'approved', 'completed'],
    
    // 结算列表
    settlements: [] as any[],
    
    // 分页
    page: 1,
    total: 0,
    hasMore: true,
    isLoading: false,
    
    // 搜索
    searchValue: '',
    
    // 统计数量（各Tab的总数）
    counts: {
      all: 0,
      pending: 0,
      approved: 0,
      completed: 0
    }
  },

  onLoad() {
    this.loadOverview();
    this.loadSettlements(true);
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 4 });
    }
  },

  /**
   * 加载汇总统计
   */
  loadOverview() {
    const overview = MOCK_SETTLEMENT_OVERVIEW;
    const formattedOverview = {
      totalPayable: this.formatAmount(overview.totalPayable),
      totalPaid: this.formatAmount(overview.totalPaid),
      totalPending: this.formatAmount(overview.totalPending),
      totalPrepaid: this.formatAmount(overview.totalPrepaid)
    };
    
    // 计算各Tab的总数
    const allData = getSettlementsByPage(1, 9999, 'all', '');
    const pendingData = getSettlementsByPage(1, 9999, 'pending', '');
    const approvedData = getSettlementsByPage(1, 9999, 'approved', '');
    const completedData = getSettlementsByPage(1, 9999, 'completed', '');
    
    const counts = {
      all: allData.total,
      pending: pendingData.total,
      approved: approvedData.total,
      completed: completedData.total
    };
    
    this.setData({ overview, formattedOverview, counts });
  },

  /**
   * 加载结算列表（分页）
   */
  loadSettlements(reset: boolean = false) {
    if (this.data.isLoading) return;
    
    const page = reset ? 1 : this.data.page;
    const status = this.data.tabStatusMap[this.data.currentTab];
    const keyword = this.data.searchValue.trim();
    
    this.setData({ isLoading: true });
    
    // 模拟网络请求延迟
    setTimeout(() => {
      const result = getSettlementsByPage(page, PAGE_SIZE, status, keyword);
      
      // 格式化数据
      const formattedList = result.list.map(s => ({
        ...s,
        statusLabel: STATUS_LABELS[s.auditStatus] || '未知',
        statusColor: STATUS_COLORS[s.auditStatus] || 'gray',
        formattedPayable: this.formatAmount(s.finalPayment),
        formattedPaid: this.formatAmount(s.totalPaid),
        formattedRemaining: this.formatAmount(s.remainingPayment),
        formattedDeduction: this.formatAmount(s.totalDeduction),
        formattedAcquisition: this.formatAmount(s.totalAcquisitionAmount),
        paymentProgress: s.finalPayment > 0 
          ? Math.round((s.totalPaid / s.finalPayment) * 100) 
          : 0
      }));
      
      this.setData({
        settlements: reset ? formattedList : [...this.data.settlements, ...formattedList],
        page: page + 1,
        total: result.total,
        hasMore: result.hasMore,
        isLoading: false
      });
    }, 300);
  },

  /**
   * 格式化金额
   */
  formatAmount(amount: number): string {
    if (amount >= 100000000) {
      return (amount / 100000000).toFixed(2) + '亿';
    } else if (amount >= 10000) {
      return (amount / 10000).toFixed(2) + '万';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + '千';
    }
    return amount.toFixed(0);
  },

  /**
   * Tab切换
   */
  onTabChange(e: WechatMiniprogram.TouchEvent) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    if (tab === this.data.currentTab) return;
    
    this.setData({ 
      currentTab: tab,
      settlements: [],
      page: 1,
      hasMore: true
    });
    this.loadSettlements(true);
  },

  /**
   * 搜索输入
   */
  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchValue: e.detail.value });
  },

  /**
   * 搜索确认
   */
  onSearchConfirm() {
    this.setData({
      settlements: [],
      page: 1,
      hasMore: true
    });
    this.loadSettlements(true);
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    this.setData({ 
      searchValue: '',
      settlements: [],
      page: 1,
      hasMore: true
    });
    this.loadSettlements(true);
  },

  /**
   * 查看结算详情
   */
  onSettlementTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    // TODO: 跳转到详情页
    wx.showToast({
      title: '详情页开发中',
      icon: 'none'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadOverview();
    this.loadSettlements(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadSettlements(false);
    }
  }
});
