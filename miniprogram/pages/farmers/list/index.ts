/**
 * 农户列表页面
 * @description 展示所有签约农户，支持搜索和状态筛选
 */

import { MOCK_FARMERS } from '../../../models/mock-data';
import type { Farmer, FarmerStatus } from '../../../models/types';

Page({
  data: {
    // 搜索关键词
    searchValue: '',
    // 当前筛选状态
    activeFilter: 'all' as 'all' | FarmerStatus,
    // 筛选标签
    filterTabs: [
      { value: 'all', label: '全部' },
      { value: 'active', label: '合作中' },
      { value: 'pending', label: '待签约' }
    ],
    // 农户列表
    farmers: [] as Farmer[],
    // 筛选后的农户列表
    filteredFarmers: [] as Farmer[]
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
    // 使用 Mock 数据
    const farmers = MOCK_FARMERS;
    this.setData({ farmers });
    this.filterFarmers();
  },

  /**
   * 筛选农户
   */
  filterFarmers() {
    const { farmers, searchValue, activeFilter } = this.data;
    
    let filtered = [...farmers];
    
    // 按搜索词筛选
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(keyword) || 
        f.phone.includes(keyword)
      );
    }
    
    // 按状态筛选
    if (activeFilter !== 'all') {
      filtered = filtered.filter(f => f.status === activeFilter);
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
   * 切换筛选标签
   */
  onFilterChange(e: WechatMiniprogram.TouchEvent) {
    const { value } = e.currentTarget.dataset;
    this.setData({ activeFilter: value });
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
   * 获取状态文本
   */
  getStatusText(status: FarmerStatus): string {
    const map = {
      active: '合作中',
      pending: '待签约',
      inactive: '已暂停'
    };
    return map[status] || status;
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadFarmers();
    wx.stopPullDownRefresh();
  }
});

