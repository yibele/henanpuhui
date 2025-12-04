/**
 * 新增农户页面
 * @description 录入新农户签约信息
 */

Page({
  data: {
    // 表单数据
    form: {
      name: '',
      phone: '',
      address: '',
      acreage: '',
      idCard: '',
      bankAccount: ''
    },
    // 合同照片
    contractImages: [] as string[],
    // 提交中
    submitting: false,
    // Toast 控制
    toastVisible: false,
    toastMessage: ''
  },

  /**
   * 输入姓名
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
   * 输入地址
   */
  onAddressInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.address': e.detail.value });
  },

  /**
   * 输入面积
   */
  onAcreageInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.acreage': e.detail.value });
  },

  /**
   * 输入身份证号
   */
  onIdCardInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.idCard': e.detail.value });
  },

  /**
   * 输入银行卡号
   */
  onBankAccountInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.bankAccount': e.detail.value });
  },

  /**
   * 拍摄/选择身份证照片
   */
  onChooseIdPhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        console.log('身份证照片:', res.tempFiles[0].tempFilePath);
        wx.showToast({
          title: '已选择照片',
          icon: 'success'
        });
      }
    });
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

  /**
   * 验证表单
   */
  validateForm(): boolean {
    const { form } = this.data;
    
    if (!form.name.trim()) {
      this.showToast('请输入姓名');
      return false;
    }
    
    if (!form.phone.trim() || !/^1[3-9]\d{9}$/.test(form.phone)) {
      this.showToast('请输入正确的手机号');
      return false;
    }
    
    if (!form.address.trim()) {
      this.showToast('请输入地址');
      return false;
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

    // TODO: 调用 API 提交数据
    // 这里模拟提交
    setTimeout(() => {
      this.setData({ submitting: false });
      
      wx.showToast({
        title: '保存成功',
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
    this.setData({
      toastVisible: true,
      toastMessage: message
    });
  },

  /**
   * 关闭 Toast
   */
  onToastClose() {
    this.setData({ toastVisible: false });
  }
});

