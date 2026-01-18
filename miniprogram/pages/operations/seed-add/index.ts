/**
 * 发放种苗页面
 * @description 助理录入种苗发放信息
 * 每个农户支持10次录入
 */

// 获取应用实例
const app = getApp();

// 等级文本映射
const GRADE_TEXT: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

Page({
  data: {
    // 表单数据
    form: {
      distributeTime: '',     // 发放时间
      quantity: '',           // 发放数量（株）
      unitPrice: '',          // 单价（元/株）
      distributedArea: '',    // 已发放面积（亩）
      receiverName: '',       // 领取人
      receiveLocation: '',    // 领取地点
      managerName: ''         // 发苗负责人
    },
    // 计算的已发放金额
    calculatedAmount: '0.00',
    // 农户列表
    farmers: [] as any[],
    // 筛选后的农户列表
    filteredFarmers: [] as any[],
    // 搜索关键词
    searchValue: '',
    // 选中的农户
    selectedFarmer: null as any,
    // 选择农户弹窗
    showFarmerPopup: false,
    // 日期选择器
    showDatePicker: false,
    datePickerValue: Date.now(),
    // 提交中
    submitting: false,
    // 是否可提交
    canSubmit: false
  },

  onLoad() {
    this.loadFarmers();
    this.setDefaultTime();
  },

  /**
   * 加载农户列表（从云函数获取真实数据）
   */
  async loadFarmers() {
    wx.showLoading({ title: '加载中...' });

    try {
      // 获取当前用户信息
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      // 兼容 id 和 _id（登录时保存的是 id）
      const userId = userInfo.id || userInfo._id || '';

      console.log('[seed-add] 加载农户列表, userId:', userId, 'userInfo:', userInfo);

      if (!userId) {
        wx.hideLoading();
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }

      // 调用云函数获取农户列表
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId,  // 可以为空，云函数会返回所有农户
          page: 1,
          pageSize: 100  // 获取足够多的农户用于选择
        }
      });

      const result = res.result as any;
      wx.hideLoading();

      if (result.success && result.data) {
        const rawFarmers = result.data.list || [];

        // 格式化农户数据
        const farmers = rawFarmers.map((f: any) => ({
          id: f._id,
          farmerId: f.farmerId,
          name: f.name,
          phone: f.phone,
          grade: f.grade || 'bronze',
          gradeText: GRADE_TEXT[f.grade] || '铜牌',
          acreage: f.acreage || 0,
          address: f.address || {},
          addressText: f.addressText || [
            f.address?.county,
            f.address?.township,
            f.address?.village
          ].filter(Boolean).join('') || '',
          deposit: f.deposit || 0,
          seedTotal: f.seedTotal || 0,
          stats: f.stats || {},
          // 已发放次数
          seedRecordCount: f.stats?.seedDistributionCount || 0
        }));

        this.setData({
          farmers,
          filteredFarmers: farmers
        });
      } else {
        // 如果云函数失败，显示提示
        wx.showToast({ title: result.message || '获取农户失败', icon: 'none' });
        this.setData({
          farmers: [],
          filteredFarmers: []
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载农户列表失败:', error);
      wx.showToast({ title: '网络错误', icon: 'none' });
      this.setData({
        farmers: [],
        filteredFarmers: []
      });
    }
  },

  /**
   * 设置默认发放时间为当前时间
   */
  setDefaultTime() {
    const now = new Date();
    const timeStr = this.formatDateTime(now);
    this.setData({
      'form.distributeTime': timeStr,
      datePickerValue: now.getTime()
    });
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // ==================== 农户选择 ====================

  /**
   * 显示农户选择弹窗
   */
  showFarmerSelect() {
    this.setData({ showFarmerPopup: true });
  },

  /**
   * 关闭农户选择弹窗
   */
  closeFarmerPopup() {
    this.setData({
      showFarmerPopup: false,
      searchValue: ''
    });
    // 重置筛选
    this.setData({ filteredFarmers: this.data.farmers });
  },

  /**
   * 弹窗状态变化
   */
  onFarmerPopupChange(e: WechatMiniprogram.CustomEvent) {
    if (!e.detail.visible) {
      this.closeFarmerPopup();
    }
  },

  /**
   * 搜索农户
   */
  onSearchFarmer(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    this.setData({ searchValue: value });

    if (value) {
      const keyword = value.toLowerCase();
      const filtered = this.data.farmers.filter((f: any) =>
        f.name.toLowerCase().includes(keyword) ||
        f.phone.includes(value)
      );
      this.setData({ filteredFarmers: filtered });
    } else {
      this.setData({ filteredFarmers: this.data.farmers });
    }
  },

  /**
   * 清除搜索
   */
  clearSearch() {
    this.setData({
      searchValue: '',
      filteredFarmers: this.data.farmers
    });
  },

  /**
   * 选中农户
   */
  onSelectFarmer(e: WechatMiniprogram.TouchEvent) {
    const farmer = e.currentTarget.dataset.farmer;

    this.setData({
      selectedFarmer: farmer,
      showFarmerPopup: false,
      searchValue: '',
      // 自动填充领取人为农户姓名
      'form.receiverName': farmer.name
    });

    // 重置筛选列表
    this.setData({ filteredFarmers: this.data.farmers });

    // 检查是否可提交
    this.checkCanSubmit();
  },

  // ==================== 日期时间选择 ====================

  /**
   * 显示日期选择器
   */
  showDatePicker() {
    this.setData({ showDatePicker: true });
  },

  /**
   * 日期确认
   */
  onDateConfirm(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    const date = new Date(value);
    const timeStr = this.formatDateTime(date);

    this.setData({
      'form.distributeTime': timeStr,
      datePickerValue: value,
      showDatePicker: false
    });

    this.checkCanSubmit();
  },

  /**
   * 日期取消
   */
  onDateCancel() {
    this.setData({ showDatePicker: false });
  },

  // ==================== 表单输入 ====================

  /**
   * 输入发放数量（株）
   */
  onQuantityInput(e: WechatMiniprogram.CustomEvent) {
    // 只允许整数
    let value = e.detail.value.replace(/[^\d]/g, '');

    this.setData({ 'form.quantity': value });
    this.calculateAmount();
    this.checkCanSubmit();
  },

  /**
   * 输入单价（元/株）
   */
  onUnitPriceInput(e: WechatMiniprogram.CustomEvent) {
    let value = e.detail.value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    // 最多两位小数
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }

    this.setData({ 'form.unitPrice': value });
    this.calculateAmount();
    this.checkCanSubmit();
  },

  /**
   * 输入已发放面积（亩）
   */
  onDistributedAreaInput(e: WechatMiniprogram.CustomEvent) {
    let value = e.detail.value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    // 最多两位小数
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }

    this.setData({ 'form.distributedArea': value });
    this.checkCanSubmit();
  },

  /**
   * 输入领取人
   */
  onReceiverNameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.receiverName': e.detail.value });
    this.checkCanSubmit();
  },

  /**
   * 输入领取地点
   */
  onReceiveLocationInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.receiveLocation': e.detail.value });
    this.checkCanSubmit();
  },

  /**
   * 输入发苗负责人
   */
  onManagerNameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'form.managerName': e.detail.value });
    this.checkCanSubmit();
  },

  /**
   * 计算已发放金额
   * 已发放金额 = 发放数量（株）× 单价（元/株）
   */
  calculateAmount() {
    const { quantity, unitPrice } = this.data.form;
    const qty = parseInt(quantity) || 0;  // 株数为整数
    const price = parseFloat(unitPrice) || 0;
    const amount = (qty * price).toFixed(2);

    this.setData({ calculatedAmount: amount });
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { form, selectedFarmer } = this.data;

    // 检查必填字段
    const canSubmit = !!(
      selectedFarmer &&
      form.distributeTime &&
      form.quantity && parseInt(form.quantity) > 0 &&
      form.unitPrice && parseFloat(form.unitPrice) > 0 &&
      form.distributedArea && parseFloat(form.distributedArea) > 0 &&
      form.receiverName.trim() &&
      form.receiveLocation.trim() &&
      form.managerName.trim()  // 负责人必填
    );

    this.setData({ canSubmit });
  },

  // ==================== 提交 ====================

  /**
   * 提交表单
   */
  async onSubmit() {
    if (!this.data.canSubmit || this.data.submitting) return;

    const { form, selectedFarmer, calculatedAmount } = this.data;

    this.setData({ submitting: true });

    try {
      // 获取当前用户信息
      const userInfo = (app.globalData as any)?.currentUser || {};
      // 兼容 id 和 _id（登录时保存的是 id）
      const userId = userInfo.id || userInfo._id || '';
      const userName = userInfo.name || form.managerName;

      // 调用云函数提交数据
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'distribute',
          userId,
          userName,
          farmerId: selectedFarmer.id,
          data: {
            quantity: parseInt(form.quantity),           // 发放数量（株）
            unitPrice: parseFloat(form.unitPrice),       // 单价（元/株）
            amount: parseFloat(calculatedAmount),        // 已发放金额
            distributedArea: parseFloat(form.distributedArea),  // 已发放面积（亩）
            distributionDate: form.distributeTime.split(' ')[0], // 发放日期
            receiverName: form.receiverName.trim(),      // 领取人
            receiveLocation: form.receiveLocation.trim(), // 领取地点
            managerName: form.managerName.trim(),        // 发苗负责人
            remark: `领取人：${form.receiverName}，地点：${form.receiveLocation}`
          }
        }
      });

      const result = res.result as any;
      this.setData({ submitting: false });

      if (result.success) {
        wx.showToast({
          title: '发放登记成功',
          icon: 'success',
          duration: 1500
        });

        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: result.message || '发放失败', icon: 'none' });
      }
    } catch (error) {
      this.setData({ submitting: false });
      console.error('发放种苗失败:', error);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  }
});
