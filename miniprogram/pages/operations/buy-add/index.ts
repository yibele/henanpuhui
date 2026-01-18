/**
 * 收购登记页面（仓库工作人员填写）
 * @description 登记收购信息：日期、仓库、农户、称重、金额、备注
 */

import { MOCK_FARMERS, MOCK_WAREHOUSES } from '../../../models/mock-data';
import type { Farmer, Warehouse } from '../../../models/types';

// 农户评级文本映射
const GRADE_TEXT_MAP: Record<string, string> = {
  A: 'A级',
  B: 'B级',
  C: 'C级'
};

Page({
  data: {
    // 仓库数据
    warehouses: [] as Warehouse[],
    selectedWarehouse: {} as Warehouse,
    showWarehousePopup: false,
    
    // 农户数据
    farmers: [] as Farmer[],
    filteredFarmers: [] as Farmer[],
    selectedFarmer: {} as Farmer,
    showFarmerPopup: false,
    searchValue: '',
    
    // 表单数据
    form: {
      date: '',           // 收购日期
      grossWeight: '',    // 手重（毛重）KG
      tareWeight: '',     // 皮重（容器重量）KG
      moistureRate: '',   // 水杂率 %
      unitPrice: '',      // 单价 元/KG
      remark: ''          // 备注
    },
    
    // 预估收购重量
    estimatedWeight: '0.00',
    
    // 日期选择
    showDatePicker: false,
    datePickerValue: 0,
    
    // 提交状态
    submitting: false,
    canSubmit: false
  },

  onLoad() {
    // 加载仓库列表
    this.setData({ warehouses: MOCK_WAREHOUSES });
    
    // 加载农户列表（只显示已签约的）
    const farmers = MOCK_FARMERS.filter(f => f.status === 'active').map(f => ({
      ...f,
      gradeText: GRADE_TEXT_MAP[f.grade] || f.grade,
      addressText: `${f.county}${f.township}${f.village}`
    }));
    this.setData({ farmers, filteredFarmers: farmers });
    
    // 设置默认日期为今天
    const today = this.formatDate(new Date());
    this.setData({ 
      'form.date': today,
      datePickerValue: Date.now()
    });
  },

  // ==================== 仓库选择 ====================
  
  showWarehouseSelect() {
    this.setData({ showWarehousePopup: true });
  },

  closeWarehousePopup() {
    this.setData({ showWarehousePopup: false });
  },

  onWarehousePopupChange(e: WechatMiniprogram.CustomEvent) {
    if (!e.detail.visible) {
      this.closeWarehousePopup();
    }
  },

  onSelectWarehouse(e: WechatMiniprogram.TouchEvent) {
    const warehouse = e.currentTarget.dataset.warehouse as Warehouse;
    this.setData({ 
      selectedWarehouse: warehouse,
      showWarehousePopup: false
    }, () => {
      this.checkCanSubmit();
    });
  },

  // ==================== 农户选择 ====================
  
  showFarmerSelect() {
    this.setData({ showFarmerPopup: true });
  },

  closeFarmerPopup() {
    this.setData({ 
      showFarmerPopup: false,
      searchValue: '',
      filteredFarmers: this.data.farmers
    });
  },

  onFarmerPopupChange(e: WechatMiniprogram.CustomEvent) {
    if (!e.detail.visible) {
      this.closeFarmerPopup();
    }
  },

  onSearchFarmer(e: WechatMiniprogram.Input) {
    const value = e.detail.value.trim();
    this.setData({ searchValue: value });
    
    const filtered = value 
      ? this.data.farmers.filter(f => 
          f.name.includes(value) || f.phone.includes(value)
        )
      : this.data.farmers;
    
    this.setData({ filteredFarmers: filtered });
  },

  clearSearch() {
    this.setData({ 
      searchValue: '',
      filteredFarmers: this.data.farmers
    });
  },

  onSelectFarmer(e: WechatMiniprogram.TouchEvent) {
    const farmer = e.currentTarget.dataset.farmer as Farmer;
    
    // 计算预估收购重量：种植面积 × 300 KG/亩
    const acreage = farmer.acreage || 0;
    const estimated = acreage * 300;
    
    this.setData({ 
      selectedFarmer: farmer,
      estimatedWeight: estimated.toFixed(2),
      showFarmerPopup: false,
      searchValue: '',
      filteredFarmers: this.data.farmers
    }, () => {
      this.checkCanSubmit();
    });
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
  
  // 手重（毛重）输入
  onGrossWeightInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    // 允许输入小数，最多保留2位
    const formattedValue = this.formatDecimal(value, 2);
    this.setData({ 'form.grossWeight': formattedValue }, () => {
      this.calculateWeights();
      this.checkCanSubmit();
    });
  },

  // 皮重（容器重量）输入
  onTareWeightInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    const formattedValue = this.formatDecimal(value, 2);
    this.setData({ 'form.tareWeight': formattedValue }, () => {
      this.calculateWeights();
      this.checkCanSubmit();
    });
  },

  // 水杂率输入
  onMoistureRateInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    // 水杂率最多保留1位小数，最大100
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

  // 单价输入
  onUnitPriceInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    const formattedValue = this.formatDecimal(value, 2);
    this.setData({ 'form.unitPrice': formattedValue }, () => {
      this.calculateAmount();
      this.checkCanSubmit();
    });
  },

  // 备注输入
  onRemarkInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    this.setData({ 'form.remark': value });
  },

  // ==================== 计算逻辑 ====================
  
  // 计算水杂和净重
  calculateWeights() {
    const { grossWeight, tareWeight, moistureRate } = this.data.form;
    
    const gross = parseFloat(grossWeight) || 0;
    const tare = parseFloat(tareWeight) || 0;
    const rate = parseFloat(moistureRate) || 0;
    
    // 水杂 = (手重 - 皮重) × 水杂率
    const netBeforeMoisture = gross - tare;
    const moisture = netBeforeMoisture * (rate / 100);
    
    // 净重 = 手重 - 皮重 - 水杂
    const net = gross - tare - moisture;
    
    // 更新页面数据
    this.setData({
      moistureWeight: moisture > 0 ? moisture.toFixed(2) : '0.00',
      netWeight: net > 0 ? net.toFixed(2) : '0.00'
    }, () => {
      this.calculateAmount();
    });
  },

  // 计算金额
  calculateAmount() {
    const netWeight = parseFloat((this.data as any).netWeight) || 0;
    const unitPrice = parseFloat(this.data.form.unitPrice) || 0;
    const amount = netWeight * unitPrice;
    // 转换为万元，保留4位小数
    const amountInWan = amount / 10000;
    
    this.setData({
      totalAmount: amount > 0 ? amount.toFixed(2) : '0.00',
      totalAmountWan: amountInWan > 0 ? amountInWan.toFixed(4) : '0.0000'
    });
  },

  // ==================== 辅助函数 ====================
  
  // 格式化小数
  formatDecimal(value: string, decimals: number): string {
    if (!value) return '';
    // 移除非数字和小数点的字符
    let cleaned = value.replace(/[^\d.]/g, '');
    // 只保留第一个小数点
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    // 限制小数位数
    if (parts.length === 2 && parts[1].length > decimals) {
      cleaned = parts[0] + '.' + parts[1].substring(0, decimals);
    }
    return cleaned;
  },

  // ==================== 表单验证和提交 ====================
  
  checkCanSubmit() {
    const { selectedWarehouse, selectedFarmer, form } = this.data;
    const netWeight = parseFloat((this.data as any).netWeight) || 0;
    
    const canSubmit = !!(
      form.date &&
      selectedWarehouse.id &&
      selectedFarmer.id &&
      form.grossWeight &&
      parseFloat(form.grossWeight) > 0 &&
      form.tareWeight &&
      parseFloat(form.tareWeight) >= 0 &&
      form.moistureRate &&
      parseFloat(form.moistureRate) >= 0 &&
      netWeight > 0 &&
      form.unitPrice &&
      parseFloat(form.unitPrice) > 0
    );
    
    this.setData({ canSubmit });
  },

  async onSubmit() {
    if (!this.data.canSubmit) return;
    
    const { selectedWarehouse, selectedFarmer, form } = this.data;
    const netWeight = parseFloat((this.data as any).netWeight) || 0;
    const totalAmount = parseFloat((this.data as any).totalAmount) || 0;
    const moistureWeight = parseFloat((this.data as any).moistureWeight) || 0;
    const estimatedWeight = parseFloat(this.data.estimatedWeight) || 0;
    
    // 构建收购数据
    const acquisitionData = {
      date: form.date,
      warehouseId: selectedWarehouse.id,
      farmerId: selectedFarmer.id,
      farmerAcreage: selectedFarmer.acreage,
      estimatedWeight: estimatedWeight,
      grossWeight: parseFloat(form.grossWeight),
      tareWeight: parseFloat(form.tareWeight),
      moistureRate: parseFloat(form.moistureRate),
      moistureWeight: moistureWeight,
      weight: netWeight,  // 实际净重
      unitPrice: parseFloat(form.unitPrice),
      totalAmount: totalAmount,
      productType: form.productType || '辣椒',
      remark: form.remark || ''
    };
    
    console.log('收购数据：', acquisitionData);
    
    try {
      // 显示提交中状态
      this.setData({ submitting: true });
      
      // 获取当前用户ID
      const app = getApp<IAppOption>();
      const currentUser = app.globalData.currentUser;
      if (!currentUser || !currentUser.id) {
        throw new Error('用户信息不存在，请重新登录');
      }
      
      // 调用云函数创建收购记录
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
