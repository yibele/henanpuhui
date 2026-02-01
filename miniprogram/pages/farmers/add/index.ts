/**
 * 新增农户页面（签约农户）
 * @description 录入新农户签约信息
 */

// 获取应用实例
const app = getApp<IAppOption>();

Page({
  data: {
    // 表单数据
    form: {
      name: '',           // 农户姓名
      phone: '',          // 电话
      idCard: '',         // 身份证号
      county: '',         // 县/区
      township: '',       // 乡镇
      village: '',        // 村
      acreage: '',        // 种植面积
      grade: 'silver',    // 农户等级，默认银牌
      deposit: '',        // 定金
      seedTotal: '',      // 种苗合计（万株）
      seedUnitPrice: ''   // 单价（元/万株）
    },
    // 应收款（自动计算）
    receivableAmount: '0.00',
    // 负责人信息
    firstManager: '',   // 第一负责人
    secondManager: '',  // 第二负责人
    // 提交中
    submitting: false,
  },

  onLoad() {
    // no-op
  },

  // ==================== 基本信息输入 ====================

  /**
   * 输入农户姓名
   */
  onNameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.name': e.detail.value });
  },

  /**
   * 输入电话
   */
  onPhoneInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.phone': e.detail.value });
  },

  /**
   * 输入身份证号
   */
  onIdCardInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.idCard': e.detail.value });
  },

  // ==================== 签约信息输入 ====================

  /**
   * 输入种植面积（只允许数字和小数点）
   */
  onAcreageInput(e: WechatMiniprogram.CustomEvent) {
    // 过滤非数字字符，只保留数字和小数点
    let value = e.detail.value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    this.setData({ 'form.acreage': value });
  },

  /**
   * 种植面积减少（每次减1亩）
   */
  onAcreageMinus() {
    const current = parseFloat(this.data.form.acreage) || 0;
    if (current > 0) {
      const newValue = Math.max(0, current - 1);
      this.setData({ 'form.acreage': newValue.toString() });
    }
  },

  /**
   * 种植面积增加（每次加1亩）
   */
  onAcreagePlus() {
    const current = parseFloat(this.data.form.acreage) || 0;
    const newValue = current + 1;
    this.setData({ 'form.acreage': newValue.toString() });
  },

  /**
   * 点击选择农户等级
   */
  onGradeTap(e: WechatMiniprogram.TouchEvent) {
    const { grade } = e.currentTarget.dataset;
    this.setData({ 'form.grade': grade });
  },

  /**
   * 输入定金（只允许数字和小数点）
   */
  onDepositInput(e: WechatMiniprogram.CustomEvent) {
    // 过滤非数字字符，只保留数字和小数点
    let value = e.detail.value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    this.setData({ 'form.deposit': value });
  },

  /**
   * 定金减少（每次减100元）
   */
  onDepositMinus() {
    const current = parseFloat(this.data.form.deposit) || 0;
    if (current > 0) {
      const newValue = Math.max(0, current - 100);
      this.setData({ 'form.deposit': newValue.toString() });
    }
  },

  /**
   * 定金增加（每次加100元）
   */
  onDepositPlus() {
    const current = parseFloat(this.data.form.deposit) || 0;
    const newValue = current + 100;
    this.setData({ 'form.deposit': newValue.toString() });
  },

  /**
   * 输入种苗合计（万株，只允许数字和小数点）
   */
  onSeedTotalInput(e: WechatMiniprogram.CustomEvent) {
    // 过滤非数字字符，只保留数字和小数点
    let value = e.detail.value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    this.setData({ 'form.seedTotal': value }, () => {
      this.calculateReceivableAmount();
    });
  },

  /**
   * 种苗合计减少（每次减1万株）
   */
  onSeedTotalMinus() {
    const current = parseFloat(this.data.form.seedTotal) || 0;
    if (current > 0) {
      const newValue = Math.max(0, current - 1);
      this.setData({ 'form.seedTotal': newValue.toString() }, () => {
        this.calculateReceivableAmount();
      });
    }
  },

  /**
   * 种苗合计增加（每次加1万株）
   */
  onSeedTotalPlus() {
    const current = parseFloat(this.data.form.seedTotal) || 0;
    const newValue = current + 1;
    this.setData({ 'form.seedTotal': newValue.toString() }, () => {
      this.calculateReceivableAmount();
    });
  },

  /**
   * 输入单价（元/万株，只允许数字和小数点）
   */
  onSeedUnitPriceInput(e: WechatMiniprogram.CustomEvent) {
    // 过滤非数字字符，只保留数字和小数点
    let value = e.detail.value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    this.setData({ 'form.seedUnitPrice': value }, () => {
      this.calculateReceivableAmount();
    });
  },

  /**
   * 单价减少（每次减100元）
   */
  onSeedUnitPriceMinus() {
    const current = parseFloat(this.data.form.seedUnitPrice) || 0;
    if (current > 0) {
      const newValue = Math.max(0, current - 100);
      this.setData({ 'form.seedUnitPrice': newValue.toString() }, () => {
        this.calculateReceivableAmount();
      });
    }
  },

  /**
   * 单价增加（每次加100元）
   */
  onSeedUnitPricePlus() {
    const current = parseFloat(this.data.form.seedUnitPrice) || 0;
    const newValue = current + 100;
    this.setData({ 'form.seedUnitPrice': newValue.toString() }, () => {
      this.calculateReceivableAmount();
    });
  },

  /**
   * 计算应收款
   * 应收款 = 种苗合计（万株）× 单价（元/万株）
   */
  calculateReceivableAmount() {
    const seedTotal = parseFloat(this.data.form.seedTotal) || 0;
    const seedUnitPrice = parseFloat(this.data.form.seedUnitPrice) || 0;
    const receivable = seedTotal * seedUnitPrice;
    this.setData({
      receivableAmount: receivable.toFixed(2)
    });
  },

  // ==================== 地址输入 ====================

  /**
   * 输入县/区
   */
  onCountyInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.county': e.detail.value });
  },

  /**
   * 输入乡镇
   */
  onTownshipInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.township': e.detail.value });
  },

  /**
   * 输入村
   */
  onVillageInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.village': e.detail.value });
  },

  // ==================== 负责人信息输入 ====================

  /**
   * 输入第一负责人
   */
  onFirstManagerInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ firstManager: e.detail.value });
  },

  /**
   * 输入第二负责人
   */
  onSecondManagerInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ secondManager: e.detail.value });
  },

  // ==================== 表单验证和提交 ====================

  /**
   * 验证表单
   */
  validateForm(): boolean {
    const { form } = this.data;

    // 验证农户姓名
    if (!form.name.trim()) {
      this.showToast('请输入农户姓名');
      return false;
    }

    // 验证电话
    if (!form.phone.trim() || !/^1[3-9]\d{9}$/.test(form.phone)) {
      this.showToast('请输入正确的11位手机号');
      return false;
    }

    // 验证身份证号
    if (!form.idCard.trim() || !/^\d{17}[\dXx]$/.test(form.idCard)) {
      this.showToast('请输入正确的18位身份证号');
      return false;
    }

    // 验证种植面积
    const acreage = parseFloat(form.acreage);
    if (!form.acreage || isNaN(acreage) || acreage <= 0) {
      this.showToast('请输入正确的种植面积');
      return false;
    }

    // 验证地址（至少填写县/区和村）
    if (!form.county.trim()) {
      this.showToast('请输入县/区');
      return false;
    }
    if (!form.village.trim()) {
      this.showToast('请输入村');
      return false;
    }

    // 验证第一负责人（必填）
    if (!this.data.firstManager.trim()) {
      this.showToast('请输入第一负责人');
      return false;
    }

    // 验证定金（可以为0，但如果填了必须是有效数字）
    if (form.deposit) {
      const deposit = parseFloat(form.deposit);
      if (isNaN(deposit) || deposit < 0) {
        this.showToast('请输入正确的定金金额');
        return false;
      }
    }

    // 验证种苗合计（可以为0，但如果填了必须是有效数字）
    if (form.seedTotal) {
      const seedTotal = parseFloat(form.seedTotal);
      if (isNaN(seedTotal) || seedTotal < 0) {
        this.showToast('请输入正确的种苗合计（万株）');
        return false;
      }
    }

    // 验证单价（可以为0，但如果填了必须是有效数字）
    if (form.seedUnitPrice) {
      const seedUnitPrice = parseFloat(form.seedUnitPrice);
      if (isNaN(seedUnitPrice) || seedUnitPrice < 0) {
        this.showToast('请输入正确的单价');
        return false;
      }
    }

    return true;
  },

  /**
   * 提交表单
   */
  async onSubmit() {
    if (!this.validateForm()) return;
    if (this.data.submitting) return;

    this.setData({ submitting: true });

    const { form, firstManager, secondManager, receivableAmount } = this.data;

    try {
      // 获取当前用户ID
      const app = getApp<IAppOption>();
      const currentUser = app.globalData.currentUser;
      if (!currentUser || !currentUser.id) {
        throw new Error('用户信息不存在，请重新登录');
      }

      // 构建农户数据
      const farmerData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        idCard: form.idCard.trim().toUpperCase(),
        address: {
          county: form.county.trim(),
          township: form.township.trim(),
          village: form.village.trim()
        },
        acreage: parseFloat(form.acreage),
        grade: form.grade,
        deposit: parseFloat(form.deposit) || 0,
        seedTotal: parseFloat(form.seedTotal) || 0,  // 种苗合计（万株）
        seedUnitPrice: parseFloat(form.seedUnitPrice) || 0,  // 单价（元/万株）
        receivableAmount: parseFloat(receivableAmount) || 0,  // 应收款（元）
        seedDebt: 0,  // 种苗欠款：签约时为0，发苗后才计算
        firstManager: firstManager.trim(),  // 第一负责人
        secondManager: secondManager.trim() || ''  // 第二负责人（可选）
      };

      console.log('提交农户数据:', farmerData);

      // 调用云函数创建农户
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'create',
          userId: currentUser.id,
          data: farmerData
        }
      });

      if (!res.result || !(res.result as any).success) {
        throw new Error((res.result as any)?.message || '创建失败');
      }

      this.setData({ submitting: false });

      wx.showToast({
        title: '签约成功',
        icon: 'success',
        duration: 1500
      });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error: any) {
      console.error('创建农户失败:', error);
      this.setData({ submitting: false });
      
      wx.showModal({
        title: '签约失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });
    }
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 显示 Toast
   */
  showToast(message: string) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  }
});
