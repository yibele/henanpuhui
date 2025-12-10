/**
 * 农户列表页面
 * @description 展示所有签约农户
 */

import { MOCK_FARMERS } from '../../../models/mock-data';
import type { Farmer } from '../../../models/types';

Page({
  data: {
    // 搜索关键词
    searchValue: '',
    // 农户列表
    farmers: [] as Farmer[],
    // 筛选后的农户列表
    filteredFarmers: [] as Farmer[],
    // 统计数据
    stats: {
      totalFarmers: 0,    // 签约农户数
      totalAcreage: 0,    // 总面积
      totalDeposit: 0     // 总定金
    }
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
   * 加载农户列表
   * TODO: 替换为实际 API 调用
   */
  loadFarmers() {
    // 等级文本映射
    const gradeTextMap: Record<string, string> = {
      gold: '金牌',
      silver: '银牌',
      bronze: '铜牌'
    };
    
    // 使用 Mock 数据，添加 gradeText 字段
    const farmers = MOCK_FARMERS.map(f => ({
      ...f,
      gradeText: gradeTextMap[f.grade] || '铜牌'
    }));
    
    // 计算统计数据
    const totalAcreage = farmers.reduce((sum, f) => sum + (f.acreage || 0), 0);
    const totalDeposit = farmers.reduce((sum, f) => sum + (f.deposit || 0), 0);
    
    const stats = {
      totalFarmers: farmers.length,
      totalAcreage: this.formatNumber(totalAcreage),      // 格式化面积
      totalDeposit: this.formatMoney(totalDeposit)        // 格式化金额为X.X万
    };
    
    this.setData({ farmers, stats });
    this.filterFarmers();
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
