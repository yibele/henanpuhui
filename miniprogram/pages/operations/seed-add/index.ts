/**
 * 发放种苗页面
 * @description 助理录入种苗发放信息
 * 每个农户支持10次录入
 */

import { MOCK_FARMERS } from '../../../models/mock-data';
import type { Farmer } from '../../../models/types';

// 获取应用实例
const app = getApp<IAppOption>();

// 等级文本映射
const GRADE_TEXT: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

// 格式化农户数据
function formatFarmerForList(farmer: Farmer) {
  return {
    ...farmer,
    gradeText: GRADE_TEXT[farmer.grade] || '铜牌',
    addressText: farmer.addressText || [
      farmer.address?.county,
      farmer.address?.township,
      farmer.address?.town,
      farmer.address?.village
    ].filter(Boolean).join('') || '',
    // 模拟已发放次数（实际应从后端获取）
    seedRecordCount: Math.floor(Math.random() * 8)
  };
}

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
    // 该农户已发放次数
    recordCount: 0,
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
   * 加载农户列表
   */
  loadFarmers() {
    const farmers = MOCK_FARMERS
      .filter(f => f.status === 'active')
      .map(formatFarmerForList);
    
    this.setData({
      farmers,
      filteredFarmers: farmers
    });
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
    const recordCount = farmer.seedRecordCount || 0;
    
    this.setData({
      selectedFarmer: farmer,
      recordCount,
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
    const { form, selectedFarmer, recordCount } = this.data;
    
    // 检查必填字段
    const canSubmit = !!(
      selectedFarmer &&
      recordCount < 10 &&
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
    
    const { form, selectedFarmer, recordCount, calculatedAmount } = this.data;
    
    // 二次验证
    if (recordCount >= 10) {
      wx.showToast({ title: '该农户已达10次发放上限', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    // 构建发放记录数据
    const seedDistributeData = {
      id: `SD${Date.now()}`,
      farmerId: selectedFarmer.id,
      farmerName: selectedFarmer.name,
      farmerPhone: selectedFarmer.phone,
      distributeTime: form.distributeTime,
      quantity: parseInt(form.quantity),  // 株数（整数）
      unitPrice: parseFloat(form.unitPrice),  // 单价（元/株）
      amount: parseFloat(calculatedAmount),  // 已发放金额
      distributedArea: parseFloat(form.distributedArea),  // 已发放面积（亩）
      receiverName: form.receiverName.trim(),
      receiveLocation: form.receiveLocation.trim(),
      managerName: form.managerName.trim(),  // 发苗负责人（手动输入）
      recordIndex: recordCount + 1,  // 第几次发放
      createTime: new Date().toISOString()
    };

    console.log('提交发苗数据:', seedDistributeData);

    // TODO: 调用 API 提交数据
    setTimeout(() => {
      this.setData({ submitting: false });

      wx.showToast({
        title: '发放登记成功',
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
  }
});
