/**
 * 首页 Dashboard
 * @description 数据概览、快捷操作入口、业务趋势展示
 */

import { 
  MOCK_DASHBOARD_STATS, 
  MOCK_TREND_DATA,
  MOCK_FARMERS,
  MOCK_ACQUISITIONS,
  MOCK_SETTLEMENTS
} from '../../models/mock-data';

// 获取应用实例
const app = getApp<IAppOption>();

Page({
  data: {
    // 用户信息
    userName: '管理员',
    // 统计数据
    stats: {
      totalFarmers: 0,
      activeContracts: 0,
      totalAcquisitions: 0,
      pendingSettlements: 0
    },
    // 趋势数据（用于图表）
    trendData: [] as any[],
    // 快捷操作列表
    quickActions: [
      { icon: 'user-add', label: '录入农户', color: '#3b82f6', bgColor: '#dbeafe', page: '/pages/farmers/add/index' },
      { icon: 'color-invert', label: '发放种苗', color: '#059669', bgColor: '#d1fae5', page: '/pages/operations/seed-add/index' },
      { icon: 'scan', label: '扫码收购', color: '#f97316', bgColor: '#ffedd5', page: '/pages/operations/buy-add/index' },
      { icon: 'wallet', label: '结算支付', color: '#8b5cf6', bgColor: '#ede9fe', page: '/pages/finance/index/index' }
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
    // 获取用户名
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        userName: userInfo.nickName || userInfo.name || '管理员'
      });
    }
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

    this.setData({
      stats,
      trendData: MOCK_TREND_DATA
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
