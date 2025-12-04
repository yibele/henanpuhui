/**
 * 发放种苗页面
 * @description 登记种苗发放信息
 */

import { MOCK_FARMERS, SEED_TYPE_OPTIONS } from '../../../models/mock-data';
import type { Farmer } from '../../../models/types';

Page({
  data: {
    // 农户列表
    farmers: [] as Farmer[],
    // 筛选后的农户列表
    filteredFarmers: [] as Farmer[],
    // 搜索关键词
    searchValue: '',
    // 选中的农户
    selectedFarmer: null as Farmer | null,
    // 选择农户弹窗
    showFarmerPopup: false,
    // 种苗品类选项
    seedOptions: SEED_TYPE_OPTIONS.map(item => item.label),
    seedValues: SEED_TYPE_OPTIONS.map(item => item.value),
    // 选中的种苗索引
    seedIndex: 0,
    // 显示种苗选择器
    showSeedPicker: false,
    // 发放数量
    quantity: '',
    // 提交中
    submitting: false,
    // Toast
    toastVisible: false,
    toastMessage: ''
  },

  onLoad() {
    this.loadFarmers();
  },

  /**
   * 加载农户列表
   */
  loadFarmers() {
    const farmers = MOCK_FARMERS.filter(f => f.status === 'active');
    this.setData({
      farmers,
      filteredFarmers: farmers
    });
  },

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
    this.loadFarmers();
  },

  /**
   * 搜索农户
   */
  onSearchFarmer(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    this.setData({ searchValue: value });
    
    if (value) {
      const filtered = this.data.farmers.filter(f => 
        f.name.includes(value) || f.phone.includes(value)
      );
      this.setData({ filteredFarmers: filtered });
    } else {
      this.setData({ filteredFarmers: this.data.farmers });
    }
  },

  /**
   * 选中农户
   */
  onSelectFarmer(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset;
    const farmer = this.data.farmers.find(f => f.id === id);
    this.setData({
      selectedFarmer: farmer || null,
      showFarmerPopup: false,
      searchValue: ''
    });
  },

  /**
   * 显示种苗选择器
   */
  showSeedSelect() {
    this.setData({ showSeedPicker: true });
  },

  /**
   * 种苗选择确认
   */
  onSeedConfirm(e: WechatMiniprogram.CustomEvent) {
    const { value } = e.detail;
    this.setData({
      seedIndex: value[0],
      showSeedPicker: false
    });
  },

  /**
   * 种苗选择取消
   */
  onSeedCancel() {
    this.setData({ showSeedPicker: false });
  },

  /**
   * 输入数量
   */
  onQuantityInput(e: WechatMiniprogram.Input) {
    this.setData({ quantity: e.detail.value });
  },

  /**
   * 提交
   */
  async onSubmit() {
    const { selectedFarmer, seedIndex, seedValues, quantity } = this.data;

    // 验证
    if (!selectedFarmer) {
      this.showToast('请选择接收农户');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      this.showToast('请输入发放数量');
      return;
    }

    this.setData({ submitting: true });

    // TODO: 调用 API 提交数据
    setTimeout(() => {
      this.setData({ submitting: false });
      wx.showToast({
        title: '登记成功',
        icon: 'success'
      });
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

  onToastClose() {
    this.setData({ toastVisible: false });
  }
});

