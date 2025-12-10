/**
 * 结算详情页面（管理层只读视图）
 * @description 展示结算完整信息，管理层只能查看，不能操作
 * 
 * 说明：
 * - 会计审核、出纳支付等操作功能属于财务权限
 * - 管理层只有查看权限
 */

import { MOCK_SETTLEMENTS } from '../../../models/mock-data';
import type { Settlement } from '../../../models/types';

// 状态标签映射
const STATUS_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  pending: { label: '待审核', color: 'orange', desc: '等待会计审核确认' },
  approved: { label: '待支付', color: 'blue', desc: '会计已审核，等待出纳支付' },
  paying: { label: '支付中', color: 'blue', desc: '正在分批支付中' },
  completed: { label: '已完成', color: 'green', desc: '结算已完成' }
};

Page({
  data: {
    // 结算数据
    settlement: null as Settlement | null,
    statusConfig: {} as { label: string; color: string; desc: string },
    
    // 格式化后的金额
    formatted: {
      totalAcquisition: '',
      seedDeduction: '',
      fertilizerDeduction: '',
      otherDeduction: '',
      totalDeduction: '',
      calculatedPayment: '',
      adjustedPayment: '',
      finalPayment: '',
      totalPrepaid: '',
      totalPaid: '',
      remainingPayment: ''
    },
    
    // 支付进度
    paymentProgress: 0
  },

  onLoad(options: { id?: string }) {
    const { id } = options;
    if (id) {
      this.loadSettlement(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  /**
   * 加载结算详情
   */
  loadSettlement(id: string) {
    // 从mock数据查找
    const settlement = MOCK_SETTLEMENTS.find(s => s.id === id);
    
    if (!settlement) {
      wx.showToast({ title: '记录不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    
    const statusConfig = STATUS_CONFIG[settlement.auditStatus] || STATUS_CONFIG.pending;
    
    // 格式化金额
    const formatted = {
      totalAcquisition: this.formatMoney(settlement.totalAcquisitionAmount),
      seedDeduction: this.formatMoney(settlement.seedDeduction),
      fertilizerDeduction: this.formatMoney(settlement.fertilizerDeduction),
      otherDeduction: this.formatMoney(settlement.otherDeduction),
      totalDeduction: this.formatMoney(settlement.totalDeduction),
      calculatedPayment: this.formatMoney(settlement.calculatedPayment),
      adjustedPayment: this.formatMoney(settlement.adjustedPayment),
      finalPayment: this.formatMoney(settlement.finalPayment),
      totalPrepaid: this.formatMoney(settlement.totalPrepaid),
      totalPaid: this.formatMoney(settlement.totalPaid),
      remainingPayment: this.formatMoney(settlement.remainingPayment)
    };
    
    // 计算支付进度
    const paymentProgress = settlement.finalPayment > 0 
      ? Math.round((settlement.totalPaid / settlement.finalPayment) * 100) 
      : 0;
    
    this.setData({
      settlement,
      statusConfig,
      formatted,
      paymentProgress
    });
  },

  /**
   * 格式化金额（带千分位）
   */
  formatMoney(amount: number): string {
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * 返回列表
   */
  onBack() {
    wx.navigateBack();
  }
});
