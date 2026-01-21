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
    currentUser: '助理',
    // 是否为管理层（管理层不显示作业操作）
    isFinanceAdmin: false,
    // 业务记录
    businessRecords: [] as any[],
    // 发苗统计
    seedStats: {
      totalQuantity: 0,      // 总发放数量（株）
      totalQuantityText: '0株',
      totalAmount: 0,        // 总金额
      totalArea: 0,          // 总发放面积
      recordCount: 0         // 发放次数
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

    // ========== 定金管理 ==========
    depositPopupVisible: false,
    depositAction: '' as 'add' | 'reduce',
    depositInputValue: '',

    // ========== 面积管理（追加签约信息） ==========
    acreagePopupVisible: false,
    acreageForm: {
      acreage: '',           // 追加面积
      seedTotal: '',         // 追加种苗（万株）
      seedUnitPrice: '',     // 种苗单价
      receivableAmount: 0,   // 追加应收款（自动计算）
      addDeposit: false,     // 是否追加定金
      deposit: '',           // 追加定金金额
      remark: ''             // 备注
    }
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
      this.setData({ currentUser: userInfo.nickName || '助理' });
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
  async loadFarmerDetail(id: string) {
    try {
      // 尝试从云函数获取农户详情
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'get',
          farmerId: id
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const farmerData = result.data;

        // 构造前端需要的数据结构
        const farmer = {
          id: farmerData._id || farmerData.farmerId,
          customerCode: farmerData.farmerId,
          name: farmerData.name,
          phone: farmerData.phone,
          idCard: farmerData.idCard,
          address: farmerData.address || {},
          addressText: farmerData.addressText || '',
          acreage: farmerData.acreage || 0,
          grade: farmerData.grade || 'bronze',
          deposit: farmerData.deposit || 0,
          manager: farmerData.firstManager || '',
          contractDate: farmerData.createTime ? new Date(farmerData.createTime).toLocaleDateString('zh-CN') : '',
          status: farmerData.status || 'active',
          contractImages: farmerData.contractImages || [],
          salesmanId: farmerData.createBy || '',
          salesmanName: farmerData.createByName || '',
          // 种苗签约信息
          seedTotal: farmerData.seedTotal || 0,           // 种苗合计（万株）
          receivableAmount: farmerData.receivableAmount || 0,  // 应收款（元）
          seedDebt: farmerData.seedDebt || 0,              // 种苗欠款（元）
          seedDistributionComplete: farmerData.seedDistributionComplete || false,  // 发苗完成状态
          // 农资信息
          fertilizerAmount: farmerData.fertilizerAmount || 0,   // 化肥金额
          pesticideAmount: farmerData.pesticideAmount || 0,     // 农药金额
          agriculturalDebt: farmerData.agriculturalDebt || 0    // 农资欠款
        };

        this.setData({ farmer });

        // 从数据库加载业务往来记录
        await this.loadBusinessRecords(farmerData._id || id, farmer);

        // 加载发苗统计
        await this.loadSeedStats(farmerData._id || id);
      } else {
        // 云函数失败，尝试从mock数据获取
        const mockFarmer = MOCK_FARMERS.find(f => f.id === id);
        if (mockFarmer) {
          const businessRecords = this.generateInitialRecords(mockFarmer);
          this.setData({ farmer: mockFarmer, businessRecords });
        } else {
          wx.showToast({ title: '农户信息不存在', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
        }
      }
    } catch (error) {
      console.error('加载农户详情失败:', error);

      // 云函数故障，回退到mock数据
      const mockFarmer = MOCK_FARMERS.find(f => f.id === id);
      if (mockFarmer) {
        const businessRecords = this.generateInitialRecords(mockFarmer);
        this.setData({ farmer: mockFarmer, businessRecords });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }
  },

  /**
   * 从数据库加载业务往来记录
   */
  async loadBusinessRecords(farmerId: string, farmer: any) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'getBusinessRecords',
          farmerId
        }
      });

      const result = res.result as any;
      let records: any[] = [];

      if (result.success && result.data) {
        // 格式化数据库返回的记录
        records = (result.data.list || []).map((r: any) => ({
          id: r._id,
          type: r.type,
          date: r.createTime ? new Date(r.createTime).toLocaleDateString('zh-CN') : '',
          name: this.getRecordTypeName(r.type),
          desc: this.buildRecordDesc(r),
          amount: r.totalAmount || r.amount || 0,
          operator: r.createByName || '系统'
        }));
      }

      // 添加签约记录作为最后一条（显示在最下面）
      const initialRecords = this.generateInitialRecords(farmer);
      const businessRecords = [...records, ...initialRecords];

      this.setData({ businessRecords });
    } catch (error) {
      console.error('加载业务记录失败:', error);
      // 失败时至少显示签约记录
      const businessRecords = this.generateInitialRecords(farmer);
      this.setData({ businessRecords });
    }
  },

  /**
   * 获取记录类型名称
   */
  getRecordTypeName(type: string): string {
    const typeNames: Record<string, string> = {
      'seed': '种苗发放',
      'fertilizer': '化肥发放',
      'pesticide': '农药发放',
      'advance': '预付款',
      'deposit': '追加定金',
      'addendum': '追加签约',
      'acreage': '追加面积',
      'contract': '农户签约'
    };
    return typeNames[type] || '业务记录';
  },

  /**
   * 构建记录描述
   */
  buildRecordDesc(record: any): string {
    switch (record.type) {
      case 'seed':
        return `发放 ${record.quantity || 0} ${record.unit || '株'}，金额 ¥${record.totalAmount || 0}`;
      case 'addendum':
        return `面积 +${record.addedAcreage || 0} 亩${record.addedDeposit ? `，定金 +¥${record.addedDeposit}` : ''}`;
      case 'advance':
        return `预付款 ¥${record.amount || 0}`;
      case 'deposit':
        return `追加定金 ¥${record.amount || 0}`;
      default:
        return record.remark || '';
    }
  },

  /**
   * 加载发苗统计数据
   */
  async loadSeedStats(farmerId: string) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'getByFarmer',
          farmerId
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const records = result.data.list || [];

        // 计算统计数据
        const totalQuantity = records.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
        const totalAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        const totalArea = records.reduce((sum: number, r: any) => sum + (r.distributedArea || 0), 0);

        // 格式化数量显示
        let totalQuantityText = totalQuantity + '株';
        if (totalQuantity >= 10000) {
          totalQuantityText = (totalQuantity / 10000).toFixed(1) + '万株';
        } else if (totalQuantity >= 1000) {
          totalQuantityText = (totalQuantity / 1000).toFixed(1) + '千株';
        }

        this.setData({
          seedStats: {
            totalQuantity,
            totalQuantityText,
            totalAmount: Math.round(totalAmount),
            totalArea: totalArea.toFixed(1),
            recordCount: records.length
          }
        });
      }
    } catch (error) {
      console.error('加载发苗统计失败:', error);
    }
  },

  /**
   * 生成初始业务记录（包含签约记录）
   */
  generateInitialRecords(farmer: any) {
    const records: any[] = [];

    // 签约记录
    if (farmer.contractDate) {
      records.push({
        id: 'contract_init',
        type: 'contract',
        date: farmer.contractDate,
        name: '农户签约',
        desc: `签约面积 ${farmer.acreage || 0} 亩，定金 ¥${farmer.deposit || 0}`,
        operator: farmer.salesmanName || farmer.manager || '系统'
      });
    }

    return records;
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

  /**
   * 发放种苗入口收敛：统一跳转到发苗登记页（支持完整字段与校验）
   */
  onGoSeedAdd() {
    const farmerId = this.data.farmer?.id || this.data.farmerId;
    if (!farmerId) {
      wx.showToast({ title: '农户信息缺失', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/operations/seed-add/index?farmerId=${encodeURIComponent(farmerId)}`
    });
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

  // ==================== 面积管理（追加签约信息） ====================

  onOpenAcreagePopup() {
    this.setData({
      acreagePopupVisible: true,
      acreageForm: {
        acreage: '',
        seedTotal: '',
        seedUnitPrice: '',
        receivableAmount: 0,
        addDeposit: false,
        deposit: '',
        remark: ''
      }
    });
  },

  onCloseAcreagePopup() {
    this.setData({ acreagePopupVisible: false });
  },

  /**
   * 追加面积表单输入
   */
  onAcreageFormInput(e: WechatMiniprogram.CustomEvent) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value.replace(/[^\d.]/g, '');

    const form = { ...this.data.acreageForm };
    (form as any)[field] = value;

    // 自动计算追加应收款 = 种苗数量 × 单价
    if (field === 'seedTotal' || field === 'seedUnitPrice') {
      const seedTotal = parseFloat(form.seedTotal) || 0;
      const seedUnitPrice = parseFloat(form.seedUnitPrice) || 0;
      form.receivableAmount = Math.round(seedTotal * seedUnitPrice * 100) / 100;
    }

    this.setData({ acreageForm: form });
  },

  /**
   * 切换是否追加定金
   */
  onToggleAddDeposit() {
    const form = { ...this.data.acreageForm };
    form.addDeposit = !form.addDeposit;
    if (!form.addDeposit) {
      form.deposit = '';
    }
    this.setData({ acreageForm: form });
  },

  /**
   * 提交追加签约信息
   */
  async onSubmitAcreage() {
    const { farmer, acreageForm, currentUser, businessRecords, farmerId } = this.data;
    if (!farmer) return;

    const addedAcreage = parseFloat(acreageForm.acreage);
    if (isNaN(addedAcreage) || addedAcreage <= 0) {
      wx.showToast({ title: '请输入追加面积', icon: 'none' });
      return;
    }

    // 准备数据
    const addedSeedTotal = parseFloat(acreageForm.seedTotal) || 0;
    const addedSeedUnitPrice = parseFloat(acreageForm.seedUnitPrice) || 0;
    const addedReceivable = acreageForm.receivableAmount || 0;
    const addedDeposit = acreageForm.addDeposit ? (parseFloat(acreageForm.deposit) || 0) : 0;

    wx.showLoading({ title: '保存中...' });

    try {
      // 获取当前用户信息
      const userInfo = app.globalData.currentUser as any;
      const userId = userInfo?.id || userInfo?._id || '';
      const userName = userInfo?.name || currentUser;

      // 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'addendum',
          userId,
          userName,
          farmerId: farmer.id || farmerId,
          data: {
            addedAcreage,
            addedSeedTotal,
            addedSeedUnitPrice,
            addedReceivable,
            addedDeposit,
            remark: acreageForm.remark
          }
        }
      });

      const result = res.result as any;
      wx.hideLoading();

      if (result.success) {
        // 构建描述信息
        let descParts: string[] = [];
        descParts.push(`面积 +${addedAcreage} 亩`);
        if (addedSeedTotal > 0) {
          descParts.push(`种苗 +${addedSeedTotal} 万株`);
        }
        if (addedDeposit > 0) {
          descParts.push(`定金 +¥${addedDeposit}`);
        }
        if (addedReceivable > 0) {
          descParts.push(`应收 +¥${addedReceivable}`);
        }

        // 更新本地数据
        const newRecord = {
          id: `acreage_${Date.now()}`,
          type: 'acreage',
          date: getTodayDate(),
          name: '追加签约',
          desc: descParts.join('，'),
          operator: currentUser,
          remark: acreageForm.remark
        };

        this.setData({
          'farmer.acreage': result.data.newAcreage,
          'farmer.deposit': result.data.newDeposit,
          businessRecords: [newRecord, ...businessRecords],
          acreagePopupVisible: false
        });

        wx.showToast({ title: '追加成功', icon: 'success' });
      } else {
        wx.showToast({ title: result.message || '追加失败', icon: 'none' });
      }
    } catch (error: any) {
      wx.hideLoading();
      console.error('追加签约失败:', error);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  }
});
