/**
 * 种植指导页面
 * @description 登记种植指导记录
 */

import { MOCK_FARMERS, GUIDANCE_TYPE_OPTIONS } from '../../../models/mock-data';
import type { Farmer, GuidanceType } from '../../../models/types';

Page({
  data: {
    farmers: [] as Farmer[],
    filteredFarmers: [] as Farmer[],
    searchValue: '',
    selectedFarmer: null as Farmer | null,
    showFarmerPopup: false,
    guidanceTypes: GUIDANCE_TYPE_OPTIONS,
    selectedType: 'technical' as GuidanceType,
    notes: '',
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

  onTypeSelect(e: WechatMiniprogram.TouchEvent) {
    const { value } = e.currentTarget.dataset;
    this.setData({ selectedType: value });
  },

  onNotesInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ notes: e.detail.value });
  },

  onChoosePhoto() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: () => {
        wx.showToast({ title: '照片已选择', icon: 'success' });
      }
    });
  },

  async onSubmit() {
    const { selectedFarmer, notes } = this.data;
    if (!selectedFarmer) {
      this.showToast('请选择指导对象');
      return;
    }
    if (!notes.trim()) {
      this.showToast('请输入指导内容');
      return;
    }

    this.setData({ submitting: true });
    setTimeout(() => {
      this.setData({ submitting: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
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

