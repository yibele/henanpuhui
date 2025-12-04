/**
 * 农事作业页面
 * @description 种苗发放、种植指导、收购管理、库存查询
 */

import { 
  MOCK_SEED_RECORDS, 
  MOCK_GUIDANCE_RECORDS, 
  MOCK_ACQUISITIONS, 
  MOCK_INVENTORY 
} from '../../../models/mock-data';

Page({
  data: {
    // 当前选中的 Tab
    activeTab: 0,
    // Tab 配置
    tabs: [
      { label: '种苗发放' },
      { label: '种植指导' },
      { label: '收购管理' },
      { label: '库存查询' }
    ],
    // 种苗发放记录
    seedRecords: [] as any[],
    // 种植指导记录
    guidanceRecords: [] as any[],
    // 收购记录
    acquisitions: [] as any[],
    // 库存列表
    inventory: [] as any[]
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 2 });
    }
    // 刷新数据
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    this.setData({
      seedRecords: MOCK_SEED_RECORDS,
      guidanceRecords: MOCK_GUIDANCE_RECORDS,
      acquisitions: MOCK_ACQUISITIONS,
      inventory: MOCK_INVENTORY
    });
  },

  /**
   * 切换 Tab
   */
  onTabChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ activeTab: e.detail.value });
  },

  /**
   * 新增种苗发放
   */
  onAddSeed() {
    wx.navigateTo({
      url: '/pages/operations/seed-add/index'
    });
  },

  /**
   * 新增种植指导
   */
  onAddGuidance() {
    wx.navigateTo({
      url: '/pages/operations/guide-add/index'
    });
  },

  /**
   * 新增收购记录
   */
  onAddAcquisition() {
    wx.navigateTo({
      url: '/pages/operations/buy-add/index'
    });
  },

  /**
   * 获取指导类型文本
   */
  getGuidanceTypeText(type: string): string {
    const map: Record<string, string> = {
      fertilizer: '施肥指导',
      pesticide: '病害防治',
      technical: '技术指导',
      other: '其他'
    };
    return map[type] || type;
  },

  /**
   * 获取库存类别图标颜色
   */
  getCategoryColor(category: string): string {
    const map: Record<string, string> = {
      seed: '#059669',
      fertilizer: '#3b82f6',
      crop: '#f97316',
      other: '#8b5cf6'
    };
    return map[category] || '#6b7280';
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});

