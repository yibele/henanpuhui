/**
 * 结算管理页面（管理层视图）
 * @description 显示结算汇总、待审核、支付中、已完成等状态的结算记录
 */

import { MOCK_SETTLEMENTS, MOCK_SETTLEMENT_OVERVIEW } from '../../../models/mock-data';
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
  paying: 'purple',
  completed: 'green'
};

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
    
    // 结算列表
    allSettlements: [] as Settlement[],
    settlements: [] as Settlement[],
    
    // 搜索
    searchValue: '',
    
    // 统计数量
    counts: {
      all: 0,
      pending: 0,
      approved: 0,
      completed: 0
    }
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 4 });  // 结算在第5个位置
    }
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    // 加载汇总统计
    const overview = MOCK_SETTLEMENT_OVERVIEW;
    const formattedOverview = {
      totalPayable: this.formatAmount(overview.totalPayable),
      totalPaid: this.formatAmount(overview.totalPaid),
      totalPending: this.formatAmount(overview.totalPending),
      totalPrepaid: this.formatAmount(overview.totalPrepaid)
    };
    
    // 加载结算列表
    const allSettlements = MOCK_SETTLEMENTS.map(s => ({
      ...s,
      statusLabel: STATUS_LABELS[s.auditStatus] || '未知',
      statusColor: STATUS_COLORS[s.auditStatus] || 'gray',
      formattedPayable: this.formatAmount(s.finalPayment),
      formattedPaid: this.formatAmount(s.totalPaid),
      formattedRemaining: this.formatAmount(s.remainingPayment),
      formattedDeduction: this.formatAmount(s.totalDeduction),
      paymentProgress: s.finalPayment > 0 
        ? Math.round((s.totalPaid / s.finalPayment) * 100) 
        : 0
    }));
    
    // 统计各状态数量（支付中合并到待支付）
    const counts = {
      all: allSettlements.length,
      pending: allSettlements.filter(s => s.auditStatus === 'pending').length,
      approved: allSettlements.filter(s => s.auditStatus === 'approved' || s.auditStatus === 'paying').length,
      completed: allSettlements.filter(s => s.auditStatus === 'completed').length
    };

    this.setData({
      overview,
      formattedOverview,
      allSettlements,
      counts
    });
    
    // 根据当前Tab过滤
    this.filterByTab(this.data.currentTab);
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
    this.setData({ currentTab: tab });
    this.filterByTab(tab);
  },

  /**
   * 按Tab过滤结算列表
   */
  filterByTab(tab: number) {
    let settlements = [...this.data.allSettlements];
    const searchValue = this.data.searchValue.trim().toLowerCase();
    
    // 按状态过滤（支付中合并到待支付）
    if (tab === 1) {
      settlements = settlements.filter(s => s.auditStatus === 'pending');
    } else if (tab === 2) {
      settlements = settlements.filter(s => s.auditStatus === 'approved' || s.auditStatus === 'paying');
    } else if (tab === 3) {
      settlements = settlements.filter(s => s.auditStatus === 'completed');
    }
    
    // 按搜索关键词过滤
    if (searchValue) {
      settlements = settlements.filter(s => 
        s.farmerName.toLowerCase().includes(searchValue) ||
        (s.farmerPhone && s.farmerPhone.includes(searchValue))
      );
    }
    
    this.setData({ settlements });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchValue: e.detail.value });
    this.filterByTab(this.data.currentTab);
  },

  /**
   * 搜索确认
   */
  onSearchConfirm() {
    this.filterByTab(this.data.currentTab);
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    this.setData({ searchValue: '' });
    this.filterByTab(this.data.currentTab);
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
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
