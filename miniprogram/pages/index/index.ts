/**
 * 首页 Dashboard
 * @description 数据概览、快捷操作入口、业务趋势展示
 */

import { 
  MOCK_FARMERS,
  MOCK_ACQUISITIONS,
  MOCK_SETTLEMENTS,
  MOCK_USER_SALESMAN,
  MOCK_USER_WAREHOUSE,
  MOCK_USER_FINANCE,
  MOCK_SEED_YESTERDAY,
  MOCK_SEED_YEAR_TOTAL,
  MOCK_FARMER_SUMMARY,
  MOCK_FARMER_SUMMARY_YESTERDAY,
  MOCK_SALESMAN_STATS,
  MOCK_SALESMAN_STATS_YESTERDAY
} from '../../models/mock-data';
import { UserRole, UserRoleNames } from '../../models/types';
import type { SeedDistributionStats, FarmerSummaryStats, SalesmanFarmerStats } from '../../models/types';

// 获取应用实例
const app = getApp<IAppOption>();

// 角色列表（用于测试切换）
const ROLE_LIST = [
  { role: UserRole.SALESMAN, user: MOCK_USER_SALESMAN },
  { role: UserRole.WAREHOUSE_MANAGER, user: MOCK_USER_WAREHOUSE },
  { role: UserRole.FINANCE_ADMIN, user: MOCK_USER_FINANCE }
];

Page({
  data: {
    // 用户信息
    userName: '管理员',
    // 当前角色信息（测试用）
    currentRoleName: '财务/管理层',
    currentRoleKey: 'finance',
    // 核心指标Tab（0:昨日, 1:全季度）
    overviewTab: 1,
    // 当前显示的核心指标
    currentOverview: {
      farmers: '0',
      acreage: '0',
      deposit: '0'
    },
    // 统计数据
    stats: {
      totalFarmers: 0,
      activeContracts: 0,
      totalAcquisitions: 0,
      pendingSettlements: 0
    },
    // 签约农户汇总
    farmerSummary: null as FarmerSummaryStats | null,
    // 格式化后的定金总额
    formatDeposit: '0',
    // 格式化后的种植面积
    formatAcreage: '0',
    // 种苗发放统计 - 昨日
    seedYesterday: null as SeedDistributionStats | null,
    // 种苗发放统计 - 年度累计
    seedYearTotal: null as SeedDistributionStats | null,
    // 格式化后的发苗数据
    seedYesterdayFormat: {
      quantity: '0',
      amount: '0',
      paid: '0',
      unpaid: '0'
    },
    seedYearFormat: {
      quantity: '0',
      amount: '0',
      paid: '0',
      unpaid: '0'
    },
    // 发苗统计当前Tab（0:昨日, 1:年度累计）
    seedStatsTab: 0,
    // 趋势图Tab（0:日, 1:周, 2:月）
    trendTab: 0,
    // 当前趋势数据
    currentTrendData: [] as any[],
    // 负责人统计数据
    salesmanStats: [] as any[],
    // 显示的负责人列表（默认5个）
    displaySalesmanList: [] as any[],
    // 是否展开全部负责人
    salesmanExpanded: false,
    // 快捷操作列表（统一绿色系）
    quickActions: [
      { icon: 'user-add', label: '录入农户', color: '#059669', bgColor: '#f0fdf4', page: '/pages/farmers/add/index' },
      { icon: 'tree', label: '发放种苗', color: '#059669', bgColor: '#f0fdf4', page: '/pages/operations/seed-add/index' },
      { icon: 'cart', label: '收苗登记', color: '#059669', bgColor: '#f0fdf4', page: '/pages/operations/buy-add/index' },
      { icon: 'wallet', label: '结算支付', color: '#059669', bgColor: '#f0fdf4', page: '/pages/finance/index/index' }
    ],
    // 当前时间问候语
    greeting: '下午好'
  },

  onLoad() {
    // 检查登录状态
    this.checkLogin();
    // 设置问候语
    this.setGreeting();
    // 加载数据
    this.loadDashboardData();
  },

  onShow() {
    // 每次页面显示时更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 0 });
    }
    // 刷新数据
    this.loadDashboardData();
  },

  /**
   * 检查登录状态
   */
  checkLogin() {
    if (!app.globalData.isLoggedIn) {
      wx.redirectTo({
        url: '/pages/login/index'
      });
      return;
    }
    // 获取用户名和角色
    const userInfo = app.globalData.userInfo;
    const userRole = app.globalData.userRole;
    if (userInfo) {
      this.setData({
        userName: userInfo.name || '用户'
      });
    }
    // 更新角色显示
    this.updateRoleDisplay(userRole);
  },

  /**
   * 更新角色显示信息
   */
  updateRoleDisplay(role: UserRole | null) {
    if (!role) return;
    
    const roleKeyMap: Record<UserRole, string> = {
      [UserRole.SALESMAN]: 'salesman',
      [UserRole.WAREHOUSE_MANAGER]: 'warehouse',
      [UserRole.FINANCE_ADMIN]: 'finance'
    };
    
    this.setData({
      currentRoleName: UserRoleNames[role],
      currentRoleKey: roleKeyMap[role]
    });
  },

  /**
   * 切换角色（测试用）
   */
  onSwitchRole() {
    const currentRole = app.globalData.userRole;
    const currentIndex = ROLE_LIST.findIndex(item => item.role === currentRole);
    const nextIndex = (currentIndex + 1) % ROLE_LIST.length;
    const nextRoleItem = ROLE_LIST[nextIndex];
    
    // 更新全局状态
    const token = app.globalData.token;
    app.setLoginStatus(token, nextRoleItem.user);
    
    // 更新页面显示
    this.setData({
      userName: nextRoleItem.user.name
    });
    this.updateRoleDisplay(nextRoleItem.role);
    
    // 刷新底部导航栏
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
    
    // 提示用户
    wx.showToast({
      title: `已切换为：${UserRoleNames[nextRoleItem.role]}`,
      icon: 'none',
      duration: 1500
    });
  },

  /**
   * 设置问候语
   */
  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '你好';
    if (hour >= 5 && hour < 12) {
      greeting = '早上好';
    } else if (hour >= 12 && hour < 14) {
      greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好';
    } else if (hour >= 18 && hour < 22) {
      greeting = '晚上好';
    } else {
      greeting = '夜深了';
    }
    this.setData({ greeting });
  },

  /**
   * 格式化金额显示
   * @param amount 金额（元）
   * @param withSymbol 是否带¥符号
   * @returns 格式化后的字符串，如 1.95万
   */
  formatAmount(amount: number, withSymbol: boolean = false): string {
    let result = '';
    if (amount >= 100000000) {
      result = (amount / 100000000).toFixed(2).replace(/\.?0+$/, '') + '亿';
    } else if (amount >= 10000) {
      result = (amount / 10000).toFixed(2).replace(/\.?0+$/, '') + '万';
    } else if (amount >= 1000) {
      result = (amount / 1000).toFixed(1).replace(/\.?0+$/, '') + '千';
    } else {
      result = amount.toString();
    }
    return withSymbol ? '¥' + result : result;
  },

  /**
   * 格式化数量显示（kg/吨）
   * @param quantity 数量（kg）
   * @returns 格式化后的字符串
   */
  formatQuantity(quantity: number): string {
    if (quantity >= 10000) {
      return (quantity / 1000).toFixed(1).replace(/\.?0+$/, '') + '吨';
    } else if (quantity >= 1000) {
      return (quantity / 1000).toFixed(2).replace(/\.?0+$/, '') + '吨';
    }
    return quantity + 'kg';
  },

  /**
   * 格式化面积显示（亩）
   * @param acreage 面积（亩）
   * @returns 格式化后的字符串，如 8.56万
   */
  formatAcreage(acreage: number): string {
    if (acreage >= 10000) {
      return (acreage / 10000).toFixed(2).replace(/\.?0+$/, '') + '万';
    } else if (acreage >= 1000) {
      return (acreage / 1000).toFixed(2).replace(/\.?0+$/, '') + '千';
    }
    return acreage.toString();
  },

  /**
   * 加载仪表盘数据
   * TODO: 替换为实际 API 调用
   */
  loadDashboardData() {
    // 使用 Mock 数据计算统计信息
    const farmers = MOCK_FARMERS;
    const acquisitions = MOCK_ACQUISITIONS;
    const settlements = MOCK_SETTLEMENTS;

    const stats = {
      totalFarmers: farmers.length,
      activeContracts: farmers.filter(f => f.status === 'active').length,
      totalAcquisitions: acquisitions.reduce((sum, a) => sum + a.quantity, 0),
      pendingSettlements: settlements
        .filter(s => s.status === 'unpaid')
        .reduce((sum, s) => sum + s.finalPayment, 0)
    };

    // 格式化定金总额和种植面积
    const formatDeposit = this.formatAmount(MOCK_FARMER_SUMMARY.totalDeposit);
    const formatAcreage = this.formatAcreage(MOCK_FARMER_SUMMARY.totalAcreage);

    // 格式化昨日发苗数据
    const seedYesterdayFormat = {
      quantity: this.formatQuantity(MOCK_SEED_YESTERDAY.totalQuantity),
      amount: this.formatAmount(MOCK_SEED_YESTERDAY.totalAmount),
      paid: this.formatAmount(MOCK_SEED_YESTERDAY.paidAmount),
      unpaid: this.formatAmount(MOCK_SEED_YESTERDAY.unpaidAmount)
    };

    // 格式化年度发苗数据
    const seedYearFormat = {
      quantity: this.formatQuantity(MOCK_SEED_YEAR_TOTAL.totalQuantity),
      amount: this.formatAmount(MOCK_SEED_YEAR_TOTAL.totalAmount),
      paid: this.formatAmount(MOCK_SEED_YEAR_TOTAL.paidAmount),
      unpaid: this.formatAmount(MOCK_SEED_YEAR_TOTAL.unpaidAmount)
    };

    // 生成趋势数据
    const currentTrendData = this.generateTrendData(0);

    // 处理负责人统计数据（按农户数排序）
    const salesmanStats = this.processSalesmanStats(MOCK_SALESMAN_STATS);
    const displaySalesmanList = salesmanStats.slice(0, 5);

    // 计算当前核心指标（根据 tab）
    const currentOverview = this.getOverviewData(this.data.overviewTab);

    this.setData({
      stats,
      // 加载发苗统计数据
      farmerSummary: MOCK_FARMER_SUMMARY,
      formatDeposit,
      formatAcreage,
      seedYesterday: MOCK_SEED_YESTERDAY,
      seedYearTotal: MOCK_SEED_YEAR_TOTAL,
      seedYesterdayFormat,
      seedYearFormat,
      currentTrendData,
      salesmanStats,
      displaySalesmanList,
      salesmanExpanded: false,
      currentOverview
    });
  },

  /**
   * 获取核心指标数据
   * @param tab 0:昨日, 1:全季度
   */
  getOverviewData(tab: number) {
    const summary = tab === 0 ? MOCK_FARMER_SUMMARY_YESTERDAY : MOCK_FARMER_SUMMARY;
    return {
      farmers: summary.totalFarmers.toString(),
      acreage: this.formatAcreage(summary.totalAcreage),
      deposit: this.formatAmount(summary.totalDeposit)
    };
  },

  /**
   * 获取当前 Tab 对应的农户汇总数据
   */
  getCurrentFarmerSummary(tab: number) {
    return tab === 0 ? MOCK_FARMER_SUMMARY_YESTERDAY : MOCK_FARMER_SUMMARY;
  },

  /**
   * 获取当前 Tab 对应的负责人统计数据
   */
  getCurrentSalesmanStats(tab: number) {
    const rawStats = tab === 0 ? MOCK_SALESMAN_STATS_YESTERDAY : MOCK_SALESMAN_STATS;
    return this.processSalesmanStats(rawStats);
  },

  /**
   * 切换核心指标 Tab
   */
  switchOverviewTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    const currentOverview = this.getOverviewData(tab);
    const farmerSummary = this.getCurrentFarmerSummary(tab);
    const salesmanStats = this.getCurrentSalesmanStats(tab);
    // 昨日数据过滤掉0户的负责人
    const filteredStats = tab === 0 
      ? salesmanStats.filter((s: any) => s.farmerCount > 0) 
      : salesmanStats;
    const displaySalesmanList = filteredStats.slice(0, 5);

    this.setData({
      overviewTab: tab,
      currentOverview,
      farmerSummary,
      salesmanStats: filteredStats,
      displaySalesmanList,
      salesmanExpanded: false
    });
  },

  /**
   * 处理负责人统计数据
   */
  processSalesmanStats(stats: SalesmanFarmerStats[]) {
    // 按农户数降序排序
    const sorted = [...stats].sort((a, b) => b.farmerCount - a.farmerCount);
    
    // 格式化数据
    return sorted.map((item, index) => ({
      ...item,
      rank: index + 1,
      formatAcreage: this.formatAcreage(item.totalAcreage),
      formatDeposit: this.formatAmount(item.totalDeposit)
    }));
  },

  /**
   * 展开/收起负责人列表
   */
  toggleSalesmanExpand() {
    const { salesmanExpanded, salesmanStats } = this.data;
    this.setData({
      salesmanExpanded: !salesmanExpanded,
      displaySalesmanList: salesmanExpanded ? salesmanStats.slice(0, 5) : salesmanStats
    });
  },

  /**
   * 跳转负责人详情页
   */
  goSalesmanDetail() {
    // TODO: 二级页面待开发
    wx.showToast({
      title: '详情页开发中',
      icon: 'none'
    });
  },

  /**
   * 生成趋势数据
   * @param tabIndex 0:日 1:周 2:月
   */
  generateTrendData(tabIndex: number) {
    // 模拟数据 - 签约农户和种苗发放
    const dayData = [
      { label: '12/5', contract: 85, seed: 120 },
      { label: '12/6', contract: 92, seed: 145 },
      { label: '12/7', contract: 78, seed: 98 },
      { label: '12/8', contract: 110, seed: 156 },
      { label: '12/9', contract: 156, seed: 189 },
      { label: '12/10', contract: 125, seed: 168 }
    ];
    
    const weekData = [
      { label: '第1周', contract: 420, seed: 580 },
      { label: '第2周', contract: 385, seed: 520 },
      { label: '第3周', contract: 510, seed: 680 },
      { label: '第4周', contract: 465, seed: 620 }
    ];
    
    const monthData = [
      { label: '7月', contract: 1850, seed: 2400 },
      { label: '8月', contract: 2100, seed: 2800 },
      { label: '9月', contract: 1680, seed: 2200 },
      { label: '10月', contract: 1920, seed: 2500 },
      { label: '11月', contract: 2280, seed: 3000 },
      { label: '12月', contract: 1170, seed: 1500 }
    ];

    const dataSource = tabIndex === 0 ? dayData : tabIndex === 1 ? weekData : monthData;
    
    // 计算最大值用于归一化高度
    const maxContract = Math.max(...dataSource.map(d => d.contract));
    const maxSeed = Math.max(...dataSource.map(d => d.seed));
    const maxValue = Math.max(maxContract, maxSeed);
    
    return dataSource.map(item => ({
      label: item.label,
      contract: item.contract,
      seed: item.seed,
      contractHeight: Math.round((item.contract / maxValue) * 120),
      seedHeight: Math.round((item.seed / maxValue) * 120)
    }));
  },

  /**
   * 切换趋势图Tab
   */
  onTrendTabChange(e: WechatMiniprogram.TouchEvent) {
    const value = e.currentTarget.dataset.value;
    const currentTrendData = this.generateTrendData(value);
    this.setData({
      trendTab: value,
      currentTrendData
    });
  },

  /**
   * 切换发苗统计Tab
   */
  onSeedStatsTabChange(e: WechatMiniprogram.TouchEvent) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      seedStatsTab: value
    });
  },

  /**
   * 点击快捷操作
   */
  onQuickActionTap(e: WechatMiniprogram.TouchEvent) {
    const { page } = e.currentTarget.dataset;
    if (page) {
      // 判断是否是 tabBar 页面
      const tabBarPages = [
        '/pages/index/index',
        '/pages/farmers/list/index',
        '/pages/operations/index/index',
        '/pages/finance/index/index',
        '/pages/ai/index/index'
      ];
      
      if (tabBarPages.includes(page)) {
        wx.switchTab({ url: page });
      } else {
        wx.navigateTo({ url: page });
      }
    }
  },

  /**
   * 点击统计项跳转
   */
  onStatTap(e: WechatMiniprogram.TouchEvent) {
    const { type } = e.currentTarget.dataset;
    switch (type) {
      case 'farmers':
        wx.switchTab({ url: '/pages/farmers/list/index' });
        break;
      case 'contracts':
        wx.switchTab({ url: '/pages/farmers/list/index' });
        break;
      case 'acquisitions':
        wx.switchTab({ url: '/pages/operations/index/index' });
        break;
      case 'settlements':
        wx.switchTab({ url: '/pages/finance/index/index' });
        break;
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadDashboardData();
    wx.stopPullDownRefresh();
  },

  /**
   * 扫码功能
   */
  onScanTap() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res);
        // TODO: 处理扫码结果
        wx.showToast({
          title: '扫码成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('扫码失败:', err);
      }
    });
  }
});
