/**
 * 收购录入页面
 * @description 登记收购信息
 */

import { MOCK_FARMERS, PRODUCT_TYPE_OPTIONS } from '../../../models/mock-data';
import type { Farmer } from '../../../models/types';

Page({
  data: {
    farmers: [] as Farmer[],
    filteredFarmers: [] as Farmer[],
    searchValue: '',
    selectedFarmer: null as Farmer | null,
    showFarmerPopup: false,
    productOptions: PRODUCT_TYPE_OPTIONS.map(item => item.label),
    productValues: PRODUCT_TYPE_OPTIONS.map(item => item.value),
    productIndex: 0,
    showProductPicker: false,
    quantity: '',
    pricePerKg: '',
    submitting: false,
    toastVisible: false,
    toastMessage: ''
  },

  onLoad() {
    const farmers = MOCK_FARMERS.filter(f => f.status === 'active');
    this.setData({ farmers, filteredFarmers: farmers });
  },

  showFarmerSelect() {
    this.setData({ showFarmerPopup: true });
  },

  closeFarmerPopup() {
    this.setData({ showFarmerPopup: false, searchValue: '' });
    const farmers = MOCK_FARMERS.filter(f => f.status === 'active');
    this.setData({ filteredFarmers: farmers });
  },

  onSearchFarmer(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    this.setData({ searchValue: value });
    const filtered = value 
      ? this.data.farmers.filter(f => f.name.includes(value) || f.phone.includes(value))
      : this.data.farmers;
    this.setData({ filteredFarmers: filtered });
  },

  onSelectFarmer(e: WechatMiniprogram.TouchEvent) {
    const { id } = e.currentTarget.dataset;
    const farmer = this.data.farmers.find(f => f.id === id);
    this.setData({ selectedFarmer: farmer || null, showFarmerPopup: false, searchValue: '' });
  },

  showProductSelect() {
    this.setData({ showProductPicker: true });
  },

  onProductConfirm(e: WechatMiniprogram.CustomEvent) {
    this.setData({ productIndex: e.detail.value[0], showProductPicker: false });
  },

  onProductCancel() {
    this.setData({ showProductPicker: false });
  },

  onQuantityInput(e: WechatMiniprogram.Input) {
    this.setData({ quantity: e.detail.value });
  },

  onPriceInput(e: WechatMiniprogram.Input) {
    this.setData({ pricePerKg: e.detail.value });
  },

  // 计算总金额
  get totalAmount(): number {
    const q = Number(this.data.quantity) || 0;
    const p = Number(this.data.pricePerKg) || 0;
    return q * p;
  },

  async onSubmit() {
    const { selectedFarmer, quantity, pricePerKg } = this.data;
    if (!selectedFarmer) {
      this.showToast('请选择交售农户');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      this.showToast('请输入收购重量');
      return;
    }
    if (!pricePerKg || Number(pricePerKg) <= 0) {
      this.showToast('请输入收购单价');
      return;
    }

    this.setData({ submitting: true });
    setTimeout(() => {
      this.setData({ submitting: false });
      wx.showToast({ title: '录入成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    }, 1000);
  },

  onCancel() {
    wx.navigateBack();
  },

  showToast(message: string) {
    this.setData({ toastVisible: true, toastMessage: message });
  },

  onToastClose() {
    this.setData({ toastVisible: false });
  }
});

