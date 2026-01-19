/**
 * 收购登记页面（仓库工作人员填写）
 * @description 登记收购信息：日期、仓库、农户、称重、金额、备注
 */

// 农户评级文本映射
const GRADE_TEXT_MAP: Record<string, string> = {
  A: 'A级',
  B: 'B级',
  C: 'C级',
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

// 获取应用实例
const app = getApp();

Page({
  data: {
    // 仓库信息（从登录用户获取）
    warehouseInfo: {
      id: '',
      name: '',
      code: ''
    },

    // 农户搜索弹窗
    showFarmerPopup: false,
    searchPhone: '',
    searching: false,
    searchedOnce: false,
    searchResult: {} as any,
    selectedFarmer: {} as any,

    // 表单数据
    form: {
      date: '',           // 收购日期
      grossWeight: '',    // 毛重 KG
      tareWeight: '',     // 皮重 KG
      moistureRate: '',   // 水杂率 %
      unitPrice: '',      // 单价 元/KG
      remark: ''          // 备注
    },

    // 计算值
    moistureWeight: '0.00',
    netWeight: '0.00',
    totalAmount: '0.00',
    totalAmountWan: '0.0000',

    // 预估收购重量
    estimatedWeight: '0.00',

    // 日期选择
    showDatePicker: false,
    datePickerValue: 0,

    // 提交状态
    submitting: false,
    canSubmit: false,

    // 农户历史收购汇总
    farmerSummary: {
      totalCount: 0,
      totalWeight: 0,
      totalAmount: 0,
      totalAmountWan: 0,
      warehouseStats: [] as any[]
    }
  },

  onLoad() {
    // 从全局数据获取仓库管理员的仓库信息
    this.loadWarehouseInfo();

    // 设置默认日期为今天
    const today = this.formatDate(new Date());
    this.setData({
      'form.date': today,
      datePickerValue: Date.now()
    });
  },

  /**
   * 加载仓库管理员的仓库信息
   */
  loadWarehouseInfo() {
    const globalData = (app.globalData as any) || {};
    const currentUser = globalData.currentUser || {};

    // 仓库管理员的仓库信息保存在 currentUser 中
    if (currentUser.warehouseId && currentUser.warehouseName) {
      this.setData({
        warehouseInfo: {
          id: currentUser.warehouseId,
          name: currentUser.warehouseName,
          code: currentUser.warehouseCode || ''
        }
      });
    } else {
      wx.showToast({
        title: '未绑定仓库',
        icon: 'none'
      });
    }
  },

  // ==================== 农户搜索弹窗 ====================

  showFarmerSearch() {
    this.setData({
      showFarmerPopup: true,
      searchPhone: '',
      searchResult: {},
      searchedOnce: false
    });
  },

  closeFarmerPopup() {
    this.setData({ showFarmerPopup: false });
  },

  onFarmerPopupChange(e: WechatMiniprogram.CustomEvent) {
    if (!e.detail.visible) {
      this.closeFarmerPopup();
    }
  },

  onSearchPhoneChange(e: WechatMiniprogram.CustomEvent) {
    const value = String(e.detail.value || '').replace(/\D/g, '');
    this.setData({
      searchPhone: value.substring(0, 11),
      searchResult: {},
      searchedOnce: false
    });
  },

  /**
   * 搜索农户
   */
  async searchFarmer() {
    const phone = this.data.searchPhone;
    if (phone.length !== 11) {
      wx.showToast({
        title: '请输入11位手机号',
        icon: 'none'
      });
      return;
    }

    this.setData({ searching: true, searchedOnce: true });

    try {
      // 调用云函数搜索农户
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'searchByPhone',
          phone: phone
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const farmer = result.data;

        // 处理农户数据
        const processedFarmer = {
          id: farmer._id,
          name: farmer.name,
          phone: farmer.phone,
          grade: farmer.grade || 'C',
          gradeText: GRADE_TEXT_MAP[farmer.grade] || farmer.grade || 'C级',
          acreage: farmer.acreage || 0,
          addressText: `${farmer.county || ''}${farmer.township || ''}${farmer.village || ''}`
        };

        this.setData({
          searchResult: processedFarmer,
          searching: false
        });

      } else {
        this.setData({
          searchResult: {},
          searching: false
        });

        wx.showToast({
          title: result.message || '未找到该农户',
          icon: 'none'
        });
      }

    } catch (error: any) {
      console.error('搜索农户失败:', error);
      this.setData({
        searchResult: {},
        searching: false
      });

      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 确认选择农户
   */
  confirmSelectFarmer() {
    const farmer = this.data.searchResult;
    if (!farmer.id) return;

    // 计算预估收购重量：种植面积 × 300 KG/亩
    const estimated = (farmer.acreage || 0) * 300;

    this.setData({
      selectedFarmer: farmer,
      estimatedWeight: estimated.toFixed(2),
      showFarmerPopup: false,
      searchPhone: '',
      searchResult: {},
      searchedOnce: false
    });

    // 获取农户历史收购汇总
    this.loadFarmerSummary(farmer.id);

    this.checkCanSubmit();

    wx.showToast({
      title: '已选择农户',
      icon: 'success'
    });
  },

  /**
   * 加载农户历史收购汇总
   */
  async loadFarmerSummary(farmerId: string) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'acquisition-manage',
        data: {
          action: 'getFarmerSummary',
          farmerId: farmerId
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        this.setData({
          farmerSummary: result.data
        });
      }
    } catch (error) {
      console.error('获取农户收购汇总失败:', error);
    }
  },

  // ==================== 日期选择 ====================

  showDatePicker() {
    this.setData({ showDatePicker: true });
  },

  onDateConfirm(e: WechatMiniprogram.CustomEvent) {
    const timestamp = e.detail.value;
    const date = this.formatDate(new Date(timestamp));
    this.setData({
      'form.date': date,
      datePickerValue: timestamp,
      showDatePicker: false
    });
  },

  onDateCancel() {
    this.setData({ showDatePicker: false });
  },

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // ==================== 表单输入 ====================

  onGrossWeightInput(e: WechatMiniprogram.CustomEvent) {
    const value = String(e.detail.value || '');
    const formattedValue = this.formatDecimal(value, 2);
    this.setData({ 'form.grossWeight': formattedValue }, () => {
      this.calculateWeights();
      this.checkCanSubmit();
    });
  },

  onTareWeightInput(e: WechatMiniprogram.CustomEvent) {
    const value = String(e.detail.value || '');
    const formattedValue = this.formatDecimal(value, 2);
    this.setData({ 'form.tareWeight': formattedValue }, () => {
      this.calculateWeights();
      this.checkCanSubmit();
    });
  },

  onMoistureRateInput(e: WechatMiniprogram.CustomEvent) {
    const value = String(e.detail.value || '');
    let numValue = parseFloat(value);
    if (isNaN(numValue)) {
      this.setData({ 'form.moistureRate': '' }, () => {
        this.calculateWeights();
        this.checkCanSubmit();
      });
      return;
    }
    if (numValue > 100) numValue = 100;
    const formattedValue = numValue.toFixed(1).replace(/\.0$/, '');
    this.setData({ 'form.moistureRate': formattedValue }, () => {
      this.calculateWeights();
      this.checkCanSubmit();
    });
  },

  onUnitPriceInput(e: WechatMiniprogram.CustomEvent) {
    const value = String(e.detail.value || '');
    const formattedValue = this.formatDecimal(value, 2);
    this.setData({ 'form.unitPrice': formattedValue }, () => {
      this.calculateAmount();
      this.checkCanSubmit();
    });
  },

  onRemarkInput(e: WechatMiniprogram.CustomEvent) {
    const value = String(e.detail.value || '');
    this.setData({ 'form.remark': value });
  },

  // ==================== 计算逻辑 ====================

  calculateWeights() {
    const { grossWeight, tareWeight, moistureRate } = this.data.form;

    const gross = parseFloat(grossWeight) || 0;
    const tare = parseFloat(tareWeight) || 0;
    const rate = parseFloat(moistureRate) || 0;

    const netBeforeMoisture = gross - tare;
    const moisture = netBeforeMoisture * (rate / 100);
    const net = gross - tare - moisture;

    this.setData({
      moistureWeight: moisture > 0 ? moisture.toFixed(2) : '0.00',
      netWeight: net > 0 ? net.toFixed(2) : '0.00'
    }, () => {
      this.calculateAmount();
    });
  },

  calculateAmount() {
    const netWeight = parseFloat(this.data.netWeight) || 0;
    const unitPrice = parseFloat(this.data.form.unitPrice) || 0;
    const amount = netWeight * unitPrice;
    const amountInWan = amount / 10000;

    this.setData({
      totalAmount: amount > 0 ? amount.toFixed(2) : '0.00',
      totalAmountWan: amountInWan > 0 ? amountInWan.toFixed(4) : '0.0000'
    });
  },

  // ==================== 辅助函数 ====================

  formatDecimal(value: string, decimals: number): string {
    if (!value) return '';
    let cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > decimals) {
      cleaned = parts[0] + '.' + parts[1].substring(0, decimals);
    }
    return cleaned;
  },

  // ==================== 表单验证和提交 ====================

  checkCanSubmit() {
    const { warehouseInfo, selectedFarmer, form, netWeight } = this.data;
    const netWeightNum = parseFloat(netWeight) || 0;

    const canSubmit = !!(
      form.date &&
      warehouseInfo.id &&
      selectedFarmer.id &&
      form.grossWeight &&
      parseFloat(form.grossWeight) > 0 &&
      form.tareWeight &&
      parseFloat(form.tareWeight) >= 0 &&
      form.moistureRate &&
      parseFloat(form.moistureRate) >= 0 &&
      netWeightNum > 0 &&
      form.unitPrice &&
      parseFloat(form.unitPrice) > 0
    );

    this.setData({ canSubmit });
  },

  async onSubmit() {
    if (!this.data.canSubmit) return;

    const { warehouseInfo, selectedFarmer, form, netWeight, totalAmount, moistureWeight, estimatedWeight } = this.data;

    const acquisitionData = {
      date: form.date,
      warehouseId: warehouseInfo.id,
      warehouseName: warehouseInfo.name,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      farmerPhone: selectedFarmer.phone,
      farmerAcreage: selectedFarmer.acreage,
      estimatedWeight: parseFloat(estimatedWeight),
      grossWeight: parseFloat(form.grossWeight),
      tareWeight: parseFloat(form.tareWeight),
      moistureRate: parseFloat(form.moistureRate),
      moistureWeight: parseFloat(moistureWeight),
      weight: parseFloat(netWeight),
      unitPrice: parseFloat(form.unitPrice),
      totalAmount: parseFloat(totalAmount),
      remark: form.remark || ''
    };

    console.log('收购数据：', acquisitionData);

    try {
      this.setData({ submitting: true });

      const globalData = (app.globalData as any) || {};
      const currentUser = globalData.currentUser || {};
      if (!currentUser.id) {
        throw new Error('用户信息不存在，请重新登录');
      }

      const res = await wx.cloud.callFunction({
        name: 'acquisition-manage',
        data: {
          action: 'create',
          userId: currentUser.id,
          data: acquisitionData
        }
      });

      if (!res.result || !(res.result as any).success) {
        throw new Error((res.result as any)?.message || '收购登记失败');
      }

      this.setData({ submitting: false });

      wx.showToast({
        title: '收购登记成功',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (error: any) {
      console.error('收购登记失败:', error);
      this.setData({ submitting: false });

      wx.showModal({
        title: '收购登记失败',
        content: error.message || '请稍后重试',
        showCancel: false
      });
    }
  },

  onCancel() {
    wx.navigateBack();
  }
});
