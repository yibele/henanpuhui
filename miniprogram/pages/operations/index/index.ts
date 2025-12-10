/**
 * 发苗管理页面（业务员）
 * @description 显示种苗发放记录列表
 */

import { MOCK_SEED_RECORDS } from '../../../models/mock-data';

// 格式化数量
function formatQuantity(quantity: number): string {
  if (quantity >= 1000) {
    return (quantity / 1000).toFixed(1) + '吨';
  }
  return quantity + 'kg';
}

Page({
  data: {
    // 发苗统计
    stats: {
      totalCount: '0',
      totalQuantity: '0'
    },
    // 种苗发放记录
    seedRecords: [] as any[]
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
    // 刷新数据
    this.loadData();
  },

  /**
   * 加载数据
   */
  loadData() {
    const records = MOCK_SEED_RECORDS.map(r => ({
      ...r,
      // 计算金额（如果没有的话）
      amount: r.amount || (r.quantity * 12).toFixed(0)
    }));
    
    // 计算统计数据
    const totalCount = records.length;
    const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
    
    this.setData({
      seedRecords: records,
      stats: {
        totalCount: totalCount.toString(),
        totalQuantity: formatQuantity(totalQuantity)
      }
    });
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
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  }
});
