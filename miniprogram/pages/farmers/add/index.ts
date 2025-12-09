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
      county: '',         // 县城
      township: '',       // 乡
      town: '',           // 镇
      village: '',        // 村
      acreage: '',        // 种植面积
      grade: 'silver',    // 农户等级，默认银牌
      deposit: ''         // 定金
    },
    // 合同照片
    contractImages: [] as string[],
    // 身份证照片
    idCardImages: [] as string[],
    // 提交中
    submitting: false,
    // 生成的客户编码预览
    customerCodePreview: '',
    // 负责人信息（自动绑定当前登录用户）
    managerId: '',
    managerName: '',
    managerPhone: ''
  },

  onLoad() {
    // 获取当前登录用户作为负责人
    this.loadManagerInfo();
  },

  /**
   * 获取负责人信息（当前登录用户）
   * 负责人就是当前登录的用户，自动绑定
   */
  loadManagerInfo() {
    // 从全局数据获取当前登录用户信息
    const userInfo = app.globalData.userInfo as any;
    
    if (userInfo) {
      // 有登录用户，使用登录用户信息
      this.setData({
        managerId: userInfo.salesmanId || 'S001',
        managerName: userInfo.nickName || '当前用户',
        managerPhone: userInfo.phone || ''
      });
    } else {
      // 没有登录用户信息，使用默认值（演示用）
      this.setData({
        managerId: 'S001',
        managerName: '业务员',
        managerPhone: ''
      });
    }
  },

  /**
   * 生成客户编码
   * 规则：负责人编号 + 农户手机号
   */
  generateCustomerCode(phone: string): string {
    const { managerId } = this.data;
    if (!phone || phone.length !== 11) return '';
    return `${managerId}-${phone}`;
  },

  /**
   * 更新客户编码预览
   */
  updateCustomerCodePreview() {
    const { phone } = this.data.form;
    const code = this.generateCustomerCode(phone);
    this.setData({ customerCodePreview: code });
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
    // 更新客户编码预览
    this.updateCustomerCodePreview();
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

  // ==================== 地址输入 ====================

  /**
   * 输入县城
   */
  onCountyInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.county': e.detail.value });
  },

  /**
   * 输入乡
   */
  onTownshipInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.township': e.detail.value });
  },

  /**
   * 输入镇
   */
  onTownInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.town': e.detail.value });
  },

  /**
   * 输入村
   */
  onVillageInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.village': e.detail.value });
  },

  // ==================== 照片处理 ====================

  /**
   * 拍摄/选择身份证照片
   */
  onChooseIdPhoto() {
    wx.chooseMedia({
      count: 2,  // 正反面
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const images = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          idCardImages: [...this.data.idCardImages, ...images].slice(0, 2)
        });
      }
    });
  },

  /**
   * 删除身份证照片
   */
  onDeleteIdPhoto(e: WechatMiniprogram.TouchEvent) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.idCardImages];
    images.splice(index, 1);
    this.setData({ idCardImages: images });
  },

  /**
   * 上传合同照片
   */
  onChooseContractPhoto() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const images = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          contractImages: [...this.data.contractImages, ...images]
        });
      }
    });
  },

  /**
   * 删除合同照片
   */
  onDeleteContractPhoto(e: WechatMiniprogram.TouchEvent) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.contractImages];
    images.splice(index, 1);
    this.setData({ contractImages: images });
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

    // 验证地址（至少填写县城和村）
    if (!form.county.trim()) {
      this.showToast('请输入县/区');
      return false;
    }
    if (!form.village.trim()) {
      this.showToast('请输入村/组');
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

    return true;
  },

  /**
   * 提交表单
   */
  async onSubmit() {
    if (!this.validateForm()) return;
    if (this.data.submitting) return;

    this.setData({ submitting: true });

    const { form, managerId, managerName, contractImages } = this.data;

    // 构建农户数据
    const farmerData = {
      id: `F${Date.now()}`,  // 临时ID，实际由后端生成
      customerCode: this.generateCustomerCode(form.phone),
      name: form.name.trim(),
      phone: form.phone.trim(),
      idCard: form.idCard.trim().toUpperCase(),
      address: {
        county: form.county.trim(),
        township: form.township.trim(),
        town: form.town.trim(),
        village: form.village.trim()
      },
      addressText: [form.county, form.township, form.town, form.village]
        .filter(s => s.trim())
        .join(''),
      acreage: parseFloat(form.acreage),
      grade: form.grade,
      deposit: parseFloat(form.deposit) || 0,
      manager: managerName,  // 自动绑定的负责人
      contractDate: new Date().toISOString().split('T')[0],
      status: 'active' as const,
      contractImages,
      salesmanId: managerId,
      salesmanName: managerName,
      createTime: new Date().toISOString()
    };

    console.log('提交农户数据:', farmerData);

    // TODO: 调用 API 提交数据
    // 这里模拟提交
    setTimeout(() => {
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
    }, 1000);
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
