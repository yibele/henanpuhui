/**
 * 结算详情页面
 * @description 完整的结算流程：会计审核 -> 出纳支付
 * 
 * 流程说明：
 * 1. 待审核(pending)：会计查看计算结果，可调整金额，填写备注，确认审核
 * 2. 待支付(approved)：出纳根据审核金额安排支付，支持最多5笔分批支付
 * 3. 已完成(completed)：所有款项已支付完成
 */

import { MOCK_SETTLEMENTS } from '../../../models/mock-data';
import type { Settlement, PaymentRecord, PrepaymentRecord } from '../../../models/types';

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
    
    // 会计审核相关
    canAudit: false,           // 是否可以审核
    adjustAmount: 0,           // 调整后金额
    auditRemark: '',           // 审核备注
    showAuditDialog: false,    // 审核确认弹窗
    
    // 预付款相关
    showPrepayDialog: false,   // 添加预付款弹窗
    newPrepayAmount: '',       // 新预付款金额
    newPrepayRemark: '',       // 新预付款备注
    
    // 支付相关
    canPay: false,             // 是否可以支付
    showPayDialog: false,      // 添加支付弹窗
    newPayAmount: '',          // 新支付金额
    newPayRemark: '',          // 新支付备注
    maxPayments: 5,            // 最大支付笔数
    
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
    
    // 判断权限
    const canAudit = settlement.auditStatus === 'pending';
    const canPay = (settlement.auditStatus === 'approved' || settlement.auditStatus === 'paying') 
                   && settlement.payments.length < 5 
                   && settlement.remainingPayment > 0;
    
    this.setData({
      settlement,
      statusConfig,
      formatted,
      adjustAmount: settlement.adjustedPayment,
      canAudit,
      canPay,
      paymentProgress
    });
  },

  /**
   * 格式化金额（带千分位）
   */
  formatMoney(amount: number): string {
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // ==================== 会计审核功能 ====================

  /**
   * 调整金额输入
   */
  onAdjustAmountChange(e: WechatMiniprogram.Input) {
    const value = parseFloat(e.detail.value) || 0;
    this.setData({ adjustAmount: value });
  },

  /**
   * 审核备注输入
   */
  onAuditRemarkChange(e: WechatMiniprogram.Input) {
    this.setData({ auditRemark: e.detail.value });
  },

  /**
   * 点击审核通过
   */
  onAuditApprove() {
    if (!this.data.settlement) return;
    
    const { adjustAmount, settlement } = this.data;
    
    // 验证调整金额
    if (adjustAmount <= 0) {
      wx.showToast({ title: '金额必须大于0', icon: 'none' });
      return;
    }
    
    if (adjustAmount > settlement.calculatedPayment * 1.1) {
      wx.showToast({ title: '调整金额不能超过计算金额的110%', icon: 'none' });
      return;
    }
    
    this.setData({ showAuditDialog: true });
  },

  /**
   * 确认审核
   */
  onConfirmAudit() {
    const { settlement, adjustAmount, auditRemark } = this.data;
    if (!settlement) return;
    
    // 模拟提交审核
    wx.showLoading({ title: '提交中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 更新本地数据（实际应该调用API）
      const updatedSettlement = {
        ...settlement,
        adjustedPayment: adjustAmount,
        finalPayment: adjustAmount,
        remainingPayment: adjustAmount - settlement.totalPaid,
        auditStatus: 'approved' as const,
        auditor: '当前用户',
        auditTime: new Date().toLocaleString(),
        auditRemark: auditRemark || '审核通过'
      };
      
      this.setData({ 
        showAuditDialog: false,
        settlement: updatedSettlement,
        statusConfig: STATUS_CONFIG.approved,
        canAudit: false,
        canPay: true,
        formatted: {
          ...this.data.formatted,
          adjustedPayment: this.formatMoney(adjustAmount),
          finalPayment: this.formatMoney(adjustAmount),
          remainingPayment: this.formatMoney(adjustAmount - settlement.totalPaid)
        }
      });
      
      wx.showToast({ title: '审核成功', icon: 'success' });
    }, 500);
  },

  /**
   * 取消审核弹窗
   */
  onCancelAudit() {
    this.setData({ showAuditDialog: false });
  },

  // ==================== 预付款功能 ====================

  /**
   * 打开添加预付款弹窗
   */
  onAddPrepayment() {
    this.setData({ 
      showPrepayDialog: true,
      newPrepayAmount: '',
      newPrepayRemark: ''
    });
  },

  /**
   * 预付款金额输入
   */
  onPrepayAmountChange(e: WechatMiniprogram.Input) {
    this.setData({ newPrepayAmount: e.detail.value });
  },

  /**
   * 预付款备注输入
   */
  onPrepayRemarkChange(e: WechatMiniprogram.Input) {
    this.setData({ newPrepayRemark: e.detail.value });
  },

  /**
   * 确认添加预付款
   */
  onConfirmPrepay() {
    const { settlement, newPrepayAmount, newPrepayRemark } = this.data;
    if (!settlement) return;
    
    const amount = parseFloat(newPrepayAmount);
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '提交中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 添加预付款记录
      const newPrepayment: PrepaymentRecord = {
        id: `pre_${Date.now()}`,
        amount,
        paymentTime: new Date().toLocaleString(),
        operator: '当前用户',
        remark: newPrepayRemark || '预付款'
      };
      
      const newTotalPrepaid = settlement.totalPrepaid + amount;
      
      const updatedSettlement = {
        ...settlement,
        prepayments: [...settlement.prepayments, newPrepayment],
        totalPrepaid: newTotalPrepaid
      };
      
      this.setData({
        showPrepayDialog: false,
        settlement: updatedSettlement,
        formatted: {
          ...this.data.formatted,
          totalPrepaid: this.formatMoney(newTotalPrepaid)
        }
      });
      
      wx.showToast({ title: '添加成功', icon: 'success' });
    }, 500);
  },

  /**
   * 取消预付款弹窗
   */
  onCancelPrepay() {
    this.setData({ showPrepayDialog: false });
  },

  // ==================== 支付功能 ====================

  /**
   * 打开添加支付弹窗
   */
  onAddPayment() {
    const { settlement } = this.data;
    if (!settlement) return;
    
    if (settlement.payments.length >= 5) {
      wx.showToast({ title: '最多支持5笔分批支付', icon: 'none' });
      return;
    }
    
    this.setData({ 
      showPayDialog: true,
      newPayAmount: settlement.remainingPayment.toString(),  // 默认填充剩余金额
      newPayRemark: `第${settlement.payments.length + 1}笔支付`
    });
  },

  /**
   * 支付金额输入
   */
  onPayAmountChange(e: WechatMiniprogram.Input) {
    this.setData({ newPayAmount: e.detail.value });
  },

  /**
   * 支付备注输入
   */
  onPayRemarkChange(e: WechatMiniprogram.Input) {
    this.setData({ newPayRemark: e.detail.value });
  },

  /**
   * 确认添加支付
   */
  onConfirmPay() {
    const { settlement, newPayAmount, newPayRemark } = this.data;
    if (!settlement) return;
    
    const amount = parseFloat(newPayAmount);
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    
    if (amount > settlement.remainingPayment) {
      wx.showToast({ title: '支付金额不能超过待付金额', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '提交中...' });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 添加支付记录
      const newPayment: PaymentRecord = {
        id: `pay_${Date.now()}`,
        amount,
        paymentTime: new Date().toLocaleString(),
        paymentMethod: '银行转账',
        operator: '当前用户',
        remark: newPayRemark || ''
      };
      
      const newTotalPaid = settlement.totalPaid + amount;
      const newRemaining = settlement.finalPayment - newTotalPaid;
      const isCompleted = newRemaining <= 0;
      
      const updatedSettlement = {
        ...settlement,
        payments: [...settlement.payments, newPayment],
        totalPaid: newTotalPaid,
        remainingPayment: newRemaining,
        auditStatus: isCompleted ? 'completed' as const : 'paying' as const
      };
      
      const paymentProgress = Math.round((newTotalPaid / settlement.finalPayment) * 100);
      
      this.setData({
        showPayDialog: false,
        settlement: updatedSettlement,
        statusConfig: isCompleted ? STATUS_CONFIG.completed : STATUS_CONFIG.paying,
        canPay: !isCompleted && updatedSettlement.payments.length < 5,
        paymentProgress,
        formatted: {
          ...this.data.formatted,
          totalPaid: this.formatMoney(newTotalPaid),
          remainingPayment: this.formatMoney(newRemaining)
        }
      });
      
      wx.showToast({ 
        title: isCompleted ? '结算完成' : '支付成功', 
        icon: 'success' 
      });
    }, 500);
  },

  /**
   * 取消支付弹窗
   */
  onCancelPay() {
    this.setData({ showPayDialog: false });
  },

  /**
   * 返回列表
   */
  onBack() {
    wx.navigateBack();
  }
});

