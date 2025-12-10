/**
 * 农户详情页面
 * @description 展示农户详细信息、作业操作、业务记录
 */

import { MOCK_FARMERS } from '../../../models/mock-data';
import type { Farmer } from '../../../models/types';
import { UserRole } from '../../../models/types';

// 获取应用实例
const app = getApp<IAppOption>();

// 获取今天日期
const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

Page({
  data: {
    // 农户ID
    farmerId: '',
    // 农户信息
    farmer: null as Farmer | null,
    // 当前用户（负责人）
    currentUser: '业务员',
    // 是否为管理层（管理层不显示作业操作）
    isFinanceAdmin: false,
    // 业务记录
    businessRecords: [] as any[],

    // ========== 发放种苗 ==========
    seedPopupVisible: false,
    seedForm: {
      date: getTodayDate(),
      quantity: '',
      price: '',
      amount: 0,
      receiver: '',
      location: ''
    },

    // ========== 发放化肥 ==========
    fertilizerPopupVisible: false,
    fertilizerForm: {
      date: getTodayDate(),
      name: '',
      quantity: '',
      price: '',
      amount: 0
    },

    // ========== 发放农药 ==========
    pesticidePopupVisible: false,
    pesticideForm: {
      date: getTodayDate(),
      name: '',
      quantity: '',
      price: '',
      amount: 0
    },

    // ========== 预付款 ==========
    advancePopupVisible: false,
    advanceForm: {
      date: getTodayDate(),
      amount: '',
      remark: ''
    },

    // ========== 追加购苗 ==========
    purchasePopupVisible: false,
    purchaseForm: {
      date: getTodayDate(),
      quantity: '',
      price: '',
      amount: 0
    },

    // ========== 查看合同 ==========
    contractPopupVisible: false,

    // ========== 定金管理 ==========
    depositPopupVisible: false,
    depositAction: '' as 'add' | 'reduce',
    depositInputValue: '',

    // ========== 面积管理 ==========
    acreagePopupVisible: false,
    acreageInputValue: ''
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ farmerId: id });
      this.loadFarmerDetail(id);
    }
    this.loadCurrentUser();
    this.checkUserRole();
  },

  /**
   * 加载当前用户信息
   */
  loadCurrentUser() {
    const userInfo = app.globalData.userInfo as any;
    if (userInfo) {
      this.setData({ currentUser: userInfo.nickName || '业务员' });
    }
  },

  /**
   * 检查用户角色（管理层不显示作业操作）
   */
  checkUserRole() {
    const userRole = app.globalData.userRole;
    const isFinanceAdmin = userRole === UserRole.FINANCE_ADMIN;
    this.setData({ isFinanceAdmin });
  },

  /**
   * 加载农户详情
   */
  loadFarmerDetail(id: string) {
    const farmer = MOCK_FARMERS.find(f => f.id === id);
    
    // 模拟业务记录数据
    const businessRecords: any[] = [];
    
    this.setData({ farmer, businessRecords });
  },

  /**
   * 拨打电话
   */
  onCallTap() {
    const { farmer } = this.data;
    if (farmer?.phone) {
      wx.makePhoneCall({ phoneNumber: farmer.phone });
    }
  },

  // ==================== 发放种苗 ====================

  onOpenSeedPopup() {
    this.setData({
      seedPopupVisible: true,
      seedForm: {
        date: getTodayDate(),
        quantity: '',
        price: '',
        amount: 0,
        receiver: this.data.farmer?.name || '',
        location: ''
      }
    });
  },

  onCloseSeedPopup() {
    this.setData({ seedPopupVisible: false });
  },

  onSeedDateChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'seedForm.date': e.detail.value });
  },

  onSeedQuantityInput(e: WechatMiniprogram.CustomEvent) {
    const quantity = e.detail.value.replace(/[^\d.]/g, '');
    const price = parseFloat(this.data.seedForm.price) || 0;
    const amount = (parseFloat(quantity) || 0) * price;
    this.setData({ 
      'seedForm.quantity': quantity,
      'seedForm.amount': Math.round(amount * 100) / 100
    });
  },

  onSeedPriceInput(e: WechatMiniprogram.CustomEvent) {
    const price = e.detail.value.replace(/[^\d.]/g, '');
    const quantity = parseFloat(this.data.seedForm.quantity) || 0;
    const amount = quantity * (parseFloat(price) || 0);
    this.setData({ 
      'seedForm.price': price,
      'seedForm.amount': Math.round(amount * 100) / 100
    });
  },

  onSeedReceiverInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'seedForm.receiver': e.detail.value });
  },

  onSeedLocationInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'seedForm.location': e.detail.value });
  },

  onSubmitSeed() {
    const { seedForm, currentUser, businessRecords } = this.data;
    
    if (!seedForm.quantity || !seedForm.price) {
      wx.showToast({ title: '请填写数量和单价', icon: 'none' });
      return;
    }

    // 添加记录
    const newRecord = {
      id: `seed_${Date.now()}`,
      type: 'seed',
      date: seedForm.date,
      name: '种苗发放',
      quantity: seedForm.quantity,
      unit: '株',
      price: seedForm.price,
      amount: seedForm.amount,
      receiver: seedForm.receiver,
      location: seedForm.location,
      operator: currentUser
    };

    this.setData({
      businessRecords: [newRecord, ...businessRecords],
      seedPopupVisible: false
    });

    wx.showToast({ title: '发放成功', icon: 'success' });
  },

  // ==================== 发放化肥 ====================

  onOpenFertilizerPopup() {
    this.setData({
      fertilizerPopupVisible: true,
      fertilizerForm: {
        date: getTodayDate(),
        name: '',
        quantity: '',
        price: '',
        amount: 0
      }
    });
  },

  onCloseFertilizerPopup() {
    this.setData({ fertilizerPopupVisible: false });
  },

  onFertilizerDateChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'fertilizerForm.date': e.detail.value });
  },

  onFertilizerNameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'fertilizerForm.name': e.detail.value });
  },

  onFertilizerQuantityInput(e: WechatMiniprogram.CustomEvent) {
    const quantity = e.detail.value.replace(/[^\d.]/g, '');
    const price = parseFloat(this.data.fertilizerForm.price) || 0;
    const amount = (parseFloat(quantity) || 0) * price;
    this.setData({ 
      'fertilizerForm.quantity': quantity,
      'fertilizerForm.amount': Math.round(amount * 100) / 100
    });
  },

  onFertilizerPriceInput(e: WechatMiniprogram.CustomEvent) {
    const price = e.detail.value.replace(/[^\d.]/g, '');
    const quantity = parseFloat(this.data.fertilizerForm.quantity) || 0;
    const amount = quantity * (parseFloat(price) || 0);
    this.setData({ 
      'fertilizerForm.price': price,
      'fertilizerForm.amount': Math.round(amount * 100) / 100
    });
  },

  onSubmitFertilizer() {
    const { fertilizerForm, currentUser, businessRecords } = this.data;
    
    if (!fertilizerForm.name || !fertilizerForm.quantity || !fertilizerForm.price) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    const newRecord = {
      id: `fertilizer_${Date.now()}`,
      type: 'fertilizer',
      date: fertilizerForm.date,
      name: fertilizerForm.name,
      quantity: fertilizerForm.quantity,
      unit: '袋',
      price: fertilizerForm.price,
      amount: fertilizerForm.amount,
      operator: currentUser
    };

    this.setData({
      businessRecords: [newRecord, ...businessRecords],
      fertilizerPopupVisible: false
    });

    wx.showToast({ title: '发放成功', icon: 'success' });
  },

  // ==================== 发放农药 ====================

  onOpenPesticidePopup() {
    this.setData({
      pesticidePopupVisible: true,
      pesticideForm: {
        date: getTodayDate(),
        name: '',
        quantity: '',
        price: '',
        amount: 0
      }
    });
  },

  onClosePesticidePopup() {
    this.setData({ pesticidePopupVisible: false });
  },

  onPesticideDateChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'pesticideForm.date': e.detail.value });
  },

  onPesticideNameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'pesticideForm.name': e.detail.value });
  },

  onPesticideQuantityInput(e: WechatMiniprogram.CustomEvent) {
    const quantity = e.detail.value.replace(/[^\d.]/g, '');
    const price = parseFloat(this.data.pesticideForm.price) || 0;
    const amount = (parseFloat(quantity) || 0) * price;
    this.setData({ 
      'pesticideForm.quantity': quantity,
      'pesticideForm.amount': Math.round(amount * 100) / 100
    });
  },

  onPesticidePriceInput(e: WechatMiniprogram.CustomEvent) {
    const price = e.detail.value.replace(/[^\d.]/g, '');
    const quantity = parseFloat(this.data.pesticideForm.quantity) || 0;
    const amount = quantity * (parseFloat(price) || 0);
    this.setData({ 
      'pesticideForm.price': price,
      'pesticideForm.amount': Math.round(amount * 100) / 100
    });
  },

  onSubmitPesticide() {
    const { pesticideForm, currentUser, businessRecords } = this.data;
    
    if (!pesticideForm.name || !pesticideForm.quantity || !pesticideForm.price) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    const newRecord = {
      id: `pesticide_${Date.now()}`,
      type: 'pesticide',
      date: pesticideForm.date,
      name: pesticideForm.name,
      quantity: pesticideForm.quantity,
      unit: '瓶',
      price: pesticideForm.price,
      amount: pesticideForm.amount,
      operator: currentUser
    };

    this.setData({
      businessRecords: [newRecord, ...businessRecords],
      pesticidePopupVisible: false
    });

    wx.showToast({ title: '发放成功', icon: 'success' });
  },

  // ==================== 预付款 ====================

  onOpenAdvancePopup() {
    this.setData({
      advancePopupVisible: true,
      advanceForm: {
        date: getTodayDate(),
        amount: '',
        remark: ''
      }
    });
  },

  onCloseAdvancePopup() {
    this.setData({ advancePopupVisible: false });
  },

  onAdvanceDateChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'advanceForm.date': e.detail.value });
  },

  onAdvanceAmountInput(e: WechatMiniprogram.CustomEvent) {
    const amount = e.detail.value.replace(/[^\d.]/g, '');
    this.setData({ 'advanceForm.amount': amount });
  },

  onAdvanceRemarkInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'advanceForm.remark': e.detail.value });
  },

  onSubmitAdvance() {
    const { advanceForm, currentUser, businessRecords } = this.data;
    
    if (!advanceForm.amount) {
      wx.showToast({ title: '请填写预付金额', icon: 'none' });
      return;
    }

    const newRecord = {
      id: `advance_${Date.now()}`,
      type: 'advance',
      date: advanceForm.date,
      name: '预付款',
      amount: parseFloat(advanceForm.amount),
      remark: advanceForm.remark,
      operator: currentUser
    };

    this.setData({
      businessRecords: [newRecord, ...businessRecords],
      advancePopupVisible: false
    });

    wx.showToast({ title: '预付成功', icon: 'success' });
  },

  // ==================== 追加购苗 ====================

  onOpenPurchasePopup() {
    this.setData({
      purchasePopupVisible: true,
      purchaseForm: {
        date: getTodayDate(),
        quantity: '',
        price: '',
        amount: 0
      }
    });
  },

  onClosePurchasePopup() {
    this.setData({ purchasePopupVisible: false });
  },

  onPurchaseDateChange(e: WechatMiniprogram.CustomEvent) {
    this.setData({ 'purchaseForm.date': e.detail.value });
  },

  onPurchaseQuantityInput(e: WechatMiniprogram.CustomEvent) {
    const quantity = e.detail.value.replace(/[^\d.]/g, '');
    const price = parseFloat(this.data.purchaseForm.price) || 0;
    const amount = (parseFloat(quantity) || 0) * price;
    this.setData({ 
      'purchaseForm.quantity': quantity,
      'purchaseForm.amount': Math.round(amount * 100) / 100
    });
  },

  onPurchasePriceInput(e: WechatMiniprogram.CustomEvent) {
    const price = e.detail.value.replace(/[^\d.]/g, '');
    const quantity = parseFloat(this.data.purchaseForm.quantity) || 0;
    const amount = quantity * (parseFloat(price) || 0);
    this.setData({ 
      'purchaseForm.price': price,
      'purchaseForm.amount': Math.round(amount * 100) / 100
    });
  },

  onSubmitPurchase() {
    const { purchaseForm, currentUser, businessRecords } = this.data;
    
    if (!purchaseForm.quantity || !purchaseForm.price) {
      wx.showToast({ title: '请填写数量和单价', icon: 'none' });
      return;
    }

    const newRecord = {
      id: `purchase_${Date.now()}`,
      type: 'purchase',
      date: purchaseForm.date,
      name: '追加购苗',
      quantity: purchaseForm.quantity,
      unit: '株',
      price: purchaseForm.price,
      amount: purchaseForm.amount,
      operator: currentUser
    };

    this.setData({
      businessRecords: [newRecord, ...businessRecords],
      purchasePopupVisible: false
    });

    wx.showToast({ title: '购买成功', icon: 'success' });
  },

  // ==================== 查看合同 ====================

  onViewContract() {
    this.setData({ contractPopupVisible: true });
  },

  onCloseContractPopup() {
    this.setData({ contractPopupVisible: false });
  },

  onPreviewContract(e: WechatMiniprogram.TouchEvent) {
    const { url } = e.currentTarget.dataset;
    const { farmer } = this.data;
    
    wx.previewImage({
      current: url,
      urls: farmer?.contractImages || []
    });
  },

  // ==================== 定金管理 ====================

  onOpenDepositPopup() {
    this.setData({
      depositPopupVisible: true,
      depositAction: 'add',
      depositInputValue: ''
    });
  },

  onCloseDepositPopup() {
    this.setData({ depositPopupVisible: false });
  },

  onDepositInputChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value.replace(/[^\d.]/g, '');
    this.setData({ depositInputValue: value });
  },

  onSubmitDeposit() {
    const { farmer, depositInputValue, currentUser, businessRecords } = this.data;
    if (!farmer) return;

    const amount = parseFloat(depositInputValue);
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    const newDeposit = (farmer.deposit || 0) + amount;

    // 记录业务往来
    const newRecord = {
      id: `deposit_${Date.now()}`,
      type: 'deposit',
      date: getTodayDate(),
      name: '追加定金',
      desc: `收款方式: 现金`,
      amount: amount,
      isIncome: true,
      operator: currentUser
    };

    this.setData({
      'farmer.deposit': newDeposit,
      businessRecords: [newRecord, ...businessRecords],
      depositPopupVisible: false
    });

    wx.showToast({ title: '定金已更新', icon: 'success' });
  },

  // ==================== 面积管理 ====================

  onOpenAcreagePopup() {
    this.setData({
      acreagePopupVisible: true,
      acreageInputValue: '' // 默认清空，让用户输入增加量
    });
  },

  onCloseAcreagePopup() {
    this.setData({ acreagePopupVisible: false });
  },

  onAcreageInputChange(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value.replace(/[^\d.]/g, '');
    this.setData({ acreageInputValue: value });
  },

  onSubmitAcreage() {
    const { farmer, acreageInputValue, currentUser, businessRecords } = this.data;
    if (!farmer) return;

    const addedAcreage = parseFloat(acreageInputValue);
    if (isNaN(addedAcreage) || addedAcreage <= 0) {
      wx.showToast({ title: '请输入有效面积', icon: 'none' });
      return;
    }

    const newAcreage = (farmer.acreage || 0) + addedAcreage;

    // 记录业务往来
    const newRecord = {
      id: `acreage_${Date.now()}`,
      type: 'acreage',
      date: getTodayDate(),
      name: '追加面积',
      desc: `从 ${farmer.acreage} 亩增加到 ${newAcreage} 亩`,
      quantity: addedAcreage,
      unit: '亩',
      operator: currentUser
    };

    this.setData({
      'farmer.acreage': newAcreage,
      businessRecords: [newRecord, ...businessRecords],
      acreagePopupVisible: false
    });

    wx.showToast({ title: '面积已更新', icon: 'success' });
  }
});
