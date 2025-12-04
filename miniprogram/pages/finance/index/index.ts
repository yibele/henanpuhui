/**
 * 财务结算页面
 * @description 结算列表查看（只读）
 */

import { MOCK_SETTLEMENTS } from '../../../models/mock-data';
import type { Settlement } from '../../../models/types';

Page({
  data: {
    // 结算列表
    settlements: [] as Settlement[],
    // 统计数据
    totalPending: 0,
    totalPaid: 0
  },

  onLoad() {
    this.loadSettlements();
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ value: 3 });
    }
    // 刷新数据
    this.loadSettlements();
  },

  /**
   * 加载结算列表
   * TODO: 替换为实际 API 调用
   */
  loadSettlements() {
    const settlements = MOCK_SETTLEMENTS;
    
    // 计算统计数据
    const totalPending = settlements
      .filter(s => s.status === 'unpaid')
      .reduce((sum, s) => sum + s.finalPayment, 0);
    
    const totalPaid = settlements
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + s.finalPayment, 0);

    this.setData({
      settlements,
      totalPending,
      totalPaid
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadSettlements();
    wx.stopPullDownRefresh();
  }
});
