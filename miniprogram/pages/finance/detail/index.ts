/**
 * 结算详情页面
 * @description 根据角色显示不同操作：
 *   - 会计: 查看详情 + 审核操作
 *   - 出纳: 查看详情 + 确认付款操作
 *   - 管理员: 只读查看
 */

// 获取应用实例
const financeDetailApp = getApp();

// 状态标签映射
const STATUS_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  pending: { label: '待审核', color: 'orange', desc: '等待会计审核确认金额' },
  approved: { label: '待付款', color: 'blue', desc: '会计已审核，等待出纳付款' },
  completed: { label: '已完成', color: 'green', desc: '结算已完成' },
  rejected: { label: '已驳回', color: 'red', desc: '审核未通过' }
};

// 付款方式选项
const PAYMENT_METHODS = [
  { value: 'wechat', label: '微信转账' },
  { value: 'bank', label: '银行转账' },
  { value: 'cash', label: '现金' }
];

Page({
  data: {
    // 结算单详情
    settlement: null as any,
    // 收购记录
    acquisition: null as any,
    // 农户信息（签约、欠款）
    farmer: null as any,
    // 状态配置
    statusConfig: {} as any,
    // 当前用户角色
    userRole: '' as string,

    // 格式化后的金额
    formatted: {
      acquisitionAmount: '',
      advanceDeduction: '',
      seedDeduction: '',
      agriculturalDeduction: '',
      totalDeduction: '',
      actualPayment: '',
      // 签约信息
      deposit: '',
      // 发苗统计
      totalSeedDistributed: '',
      totalSeedAmount: '',
      seedDebt: '',
      // 农资欠款
      fertilizerAmount: '',
      pesticideAmount: '',
      agriculturalDebt: '',
      // 预支款
      advancePayment: '',
      // 欠款合计
      totalDebt: ''
    },

    // 操作权限
    canAudit: false,      // 可以审核（会计）
    canPay: false,        // 可以付款（出纳）

    // 审核弹窗
    showAuditDialog: false,
    auditRemark: '',

    // 付款弹窗
    showPayDialog: false,
    paymentMethod: 'wechat',
    paymentMethods: PAYMENT_METHODS,
    paymentRemark: '',

    // 加载状态
    isLoading: false,
    isSubmitting: false
  },

  onLoad(options: { id?: string }) {
    const { id } = options;
    if (id) {
      this.initRole();
      this.loadSettlement(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  /**
   * 初始化角色权限
   */
  initRole() {
    const userRole = financeDetailApp.globalData?.userRole || '';

    this.setData({
      userRole,
      canAudit: userRole === 'finance_admin' || userRole === 'admin',
      canPay: userRole === 'cashier' || userRole === 'admin'
    });
  },

  /**
   * 加载结算详情
   */
  async loadSettlement(id: string) {
    this.setData({ isLoading: true });

    try {
      const userInfo = financeDetailApp.globalData.userInfo;
      const res = await wx.cloud.callFunction({
        name: 'settlement-manage',
        data: {
          action: 'getDetail',
          userId: userInfo?._id || '',
          settlementId: id
        }
      });

      const result = res.result as any;

      if (result && result.success && result.data) {
        // 云函数返回 { settlement, acquisition, farmer } 结构
        const settlement = result.data.settlement || result.data;
        const acquisition = result.data.acquisition;
        const farmer = result.data.farmer;

        const statusConfig = STATUS_CONFIG[settlement.status] || STATUS_CONFIG.pending;

        // 默认金额从 settlement 读取；待审核状态使用预览扣款覆盖显示
        const acquisitionAmount = settlement.acquisitionAmount || settlement.grossAmount || 0;
        const seedDeduction = settlement.seedDeduction || 0;
        const agriculturalDeduction = settlement.agriculturalDeduction || 0;
        const advanceDeduction = settlement.advanceDeduction || 0;
        const totalDeduction = settlement.totalDeduction || settlement.totalDeductions || 0;
        const actualPayment = settlement.actualPayment || 0;

        // 农户欠款余额（直接读取，仅用于待审核时展示参考）
        const deposit = farmer?.deposit || 0;
        const totalSeedAmount = farmer?.stats?.totalSeedAmount || 0;
        const seedDebtAmount = farmer?.seedDebt || 0;
        const agriculturalDebtAmount = farmer?.agriculturalDebt || 0;
        const advancePaymentAmount = farmer?.advancePayment || 0;
        const totalDebtAmount = seedDebtAmount + agriculturalDebtAmount + advancePaymentAmount;

        // 格式化金额（默认使用结算单数据）
        const formatted = {
          acquisitionAmount: this.formatMoney(acquisitionAmount),
          advanceDeduction: this.formatMoney(advanceDeduction),
          seedDeduction: this.formatMoney(seedDeduction),
          agriculturalDeduction: this.formatMoney(agriculturalDeduction),
          totalDeduction: this.formatMoney(totalDeduction),
          actualPayment: this.formatMoney(actualPayment),
          // 农户签约信息
          deposit: this.formatMoney(farmer?.deposit || 0),
          // 发苗统计（基于实际发苗计算）
          totalSeedDistributed: this.formatNumber(farmer?.stats?.totalSeedDistributed || 0),
          totalSeedAmount: this.formatMoney(farmer?.stats?.totalSeedAmount || 0),
          // 种苗欠款
          seedDebt: this.formatMoney(seedDebtAmount),
          // 农资欠款
          fertilizerAmount: this.formatMoney(farmer?.fertilizerAmount || 0),
          pesticideAmount: this.formatMoney(farmer?.pesticideAmount || 0),
          agriculturalDebt: this.formatMoney(agriculturalDebtAmount),
          // 预支款
          advancePayment: this.formatMoney(advancePaymentAmount),
          // 欠款合计
          totalDebt: this.formatMoney(totalDebtAmount)
        };

        // 待审核时，预览扣款计算，展示给会计参考
        if (this.data.canAudit && settlement.status === 'pending') {
          try {
            const previewRes = await wx.cloud.callFunction({
              name: 'settlement-manage',
              data: {
                action: 'previewDeduction',
                settlementId: settlement.settlementId
              }
            });

            const previewResult = previewRes.result as any;
            if (previewResult?.success && previewResult?.data) {
              const preview = previewResult.data;
              formatted.advanceDeduction = this.formatMoney(preview.deductions?.advanceDeduction || 0);
              formatted.seedDeduction = this.formatMoney(preview.deductions?.seedDeduction || 0);
              formatted.agriculturalDeduction = this.formatMoney(preview.deductions?.agriculturalDeduction || 0);
              formatted.totalDeduction = this.formatMoney(preview.deductions?.totalDeduction || 0);
              formatted.actualPayment = this.formatMoney(preview.actualPayment || 0);
            }
          } catch (previewError) {
            console.warn('预览扣款计算失败:', previewError);
          }
        }

        this.setData({
          settlement,
          acquisition,
          farmer,
          statusConfig,
          formatted,
          isLoading: false
        });
      } else {
        throw new Error(result?.message || result?.errMsg || '获取详情失败');
      }
    } catch (error: any) {
      console.error('加载结算详情失败:', error);
      this.setData({ isLoading: false });

      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 格式化金额（带千分位）
   */
  formatMoney(amount: number): string {
    if (!amount || amount === 0) return '0.00';
    return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /**
   * 格式化数字（带千分位，无小数）
   */
  formatNumber(num: number): string {
    if (!num || num === 0) return '0';
    return num.toLocaleString('zh-CN');
  },

  // ==================== 审核操作 ====================

  /**
   * 打开审核弹窗
   */
  onAuditTap() {
    this.setData({ showAuditDialog: true, auditRemark: '' });
  },

  /**
   * 关闭审核弹窗
   */
  closeAuditDialog() {
    this.setData({ showAuditDialog: false });
  },

  /**
   * 审核备注输入
   */
  onAuditRemarkInput(e: WechatMiniprogram.Input) {
    this.setData({ auditRemark: e.detail.value });
  },

  /**
   * 确认审核通过
   */
  async confirmAuditApprove() {
    if (this.data.isSubmitting) return;

    const { auditRemark } = this.data;

    wx.showModal({
      title: '确认审核',
      content: '确定审核通过此结算单？系统将自动计算扣款并更新农户欠款余额。',
      success: async (res) => {
        if (res.confirm) {
          await this.submitAudit(true, auditRemark);
        }
      }
    });
  },

  /**
   * 驳回审核
   */
  async confirmAuditReject() {
    const { auditRemark } = this.data;

    if (!auditRemark.trim()) {
      wx.showToast({ title: '请填写驳回原因', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认驳回',
      content: '确定驳回此结算单？',
      success: async (res) => {
        if (res.confirm) {
          await this.submitAudit(false, auditRemark);
        }
      }
    });
  },

  /**
   * 提交审核
   */
  async submitAudit(approved: boolean, remark: string) {
    this.setData({ isSubmitting: true });

    try {
      const userInfo = financeDetailApp.globalData.userInfo;
      const res = await wx.cloud.callFunction({
        name: 'settlement-manage',
        data: {
          action: 'audit',
          userId: userInfo?._id || '',
          settlementId: this.data.settlement.settlementId,
          approved,
          auditRemark: remark
        }
      });

      const result = res.result as any;

      if (result && result.success) {
        wx.showToast({
          title: approved ? '审核通过' : '已驳回',
          icon: 'success'
        });

        this.setData({ showAuditDialog: false, isSubmitting: false });

        // 刷新数据
        setTimeout(() => {
          this.loadSettlement(this.data.settlement.settlementId);
        }, 1000);
      } else {
        throw new Error(result?.message || '操作失败');
      }
    } catch (error: any) {
      console.error('审核失败:', error);
      this.setData({ isSubmitting: false });

      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // ==================== 付款操作 ====================

  /**
   * 打开付款弹窗
   */
  onPayTap() {
    this.setData({
      showPayDialog: true,
      paymentMethod: 'wechat',
      paymentRemark: ''
    });
  },

  /**
   * 关闭付款弹窗
   */
  closePayDialog() {
    this.setData({ showPayDialog: false });
  },

  /**
   * 选择付款方式
   */
  onPaymentMethodChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ paymentMethod: e.detail.value });
  },

  /**
   * 付款备注输入
   */
  onPaymentRemarkInput(e: WechatMiniprogram.Input) {
    this.setData({ paymentRemark: e.detail.value });
  },

  /**
   * 确认付款
   */
  async confirmPayment() {
    if (this.data.isSubmitting) return;

    const { paymentMethod } = this.data;
    const methodLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || '';

    wx.showModal({
      title: '确认付款',
      content: `确认已通过「${methodLabel}」完成付款 ¥${this.data.formatted.actualPayment}？`,
      success: async (res) => {
        if (res.confirm) {
          await this.submitPayment();
        }
      }
    });
  },

  /**
   * 提交付款确认
   */
  async submitPayment() {
    this.setData({ isSubmitting: true });

    try {
      const userInfo = financeDetailApp.globalData.userInfo;
      const res = await wx.cloud.callFunction({
        name: 'settlement-manage',
        data: {
          action: 'completePayment',
          userId: userInfo?._id || '',
          settlementId: this.data.settlement.settlementId,
          paymentMethod: this.data.paymentMethod,
          paymentRemark: this.data.paymentRemark
        }
      });

      const result = res.result as any;

      if (result && result.success) {
        wx.showToast({
          title: '付款成功',
          icon: 'success'
        });

        this.setData({ showPayDialog: false, isSubmitting: false });

        // 刷新数据
        setTimeout(() => {
          this.loadSettlement(this.data.settlement.settlementId);
        }, 1000);
      } else {
        throw new Error(result?.message || '操作失败');
      }
    } catch (error: any) {
      console.error('付款确认失败:', error);
      this.setData({ isSubmitting: false });

      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 返回列表
   */
  onBack() {
    wx.navigateBack();
  }
});
