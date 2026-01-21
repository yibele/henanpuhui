/**
 * 发放种苗页面
 * @description 助理录入/编辑种苗发放信息
 */

// 获取应用实例
const app = getApp();

// 等级文本映射
const GRADE_TEXT: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

// 搜索防抖定时器
let searchTimer: ReturnType<typeof setTimeout> | null = null;

Page({
  data: {
    // 编辑模式相关
    isEditMode: false,          // 是否为编辑模式
    recordId: '',               // 编辑的记录 ID
    pageTitle: '种苗发放登记',  // 页面标题
    submitBtnText: '确认发放',  // 提交按钮文字

    // 表单数据
    form: {
      distributeTime: '',     // 发放时间
      quantity: '',           // 发放数量（株）
      unitPrice: '',          // 单价（元/株）
      distributedArea: '',    // 本次发放面积（亩）
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
    // 面积统计
    areaStats: {
      totalArea: 0,           // 签约总面积
      distributedArea: 0,     // 已发放面积
      remainingArea: 0,       // 剩余可发放面积
      currentArea: 0          // 本次发放面积
    },
    // 种苗数量统计（万株）
    seedStats: {
      contractedQuantity: 0,   // 签约种苗数（万株）
      distributedQuantity: 0,  // 已发放数量（万株）
      remainingQuantity: 0     // 剩余数量（万株）
    },
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

  onLoad(options: any) {
    const { recordId, mode, farmerId } = options || {};

    if (mode === 'edit' && recordId) {
      // 编辑模式
      this.setData({
        isEditMode: true,
        recordId,
        pageTitle: '编辑发苗记录',
        submitBtnText: '保存修改'
      });
      // 设置导航栏标题
      wx.setNavigationBarTitle({ title: '编辑发苗记录' });
      // 加载记录详情
      this.loadRecordDetail(recordId);
    } else {
      // 新增模式
      this.setDefaultTime();
      this.loadFarmers().then(() => {
        if (farmerId) {
          this.preselectFarmer(String(farmerId));
        }
      });
    }
  },

  /**
   * 预选农户（从农户详情页跳转过来）
   */
  async preselectFarmer(farmerId: string) {
    const farmer = this.data.farmers.find((f: any) => f.id === farmerId);
    if (!farmer) return;
    await this.applySelectedFarmer(farmer);
  },

  /**
   * 统一的“选中农户”逻辑（供点击选择/预选复用）
   */
  async applySelectedFarmer(farmer: any) {
    this.setData({
      selectedFarmer: farmer,
      showFarmerPopup: false,
      searchValue: '',
      // 自动填充领取人为农户姓名
      'form.receiverName': farmer.name,
      // 初始化面积统计
      'areaStats.totalArea': farmer.acreage || 0,
      'areaStats.distributedArea': 0,
      'areaStats.remainingArea': farmer.acreage || 0,
      'areaStats.currentArea': 0,
      // 初始化种苗统计（万株）
      'seedStats.contractedQuantity': farmer.seedTotal || 0,
      'seedStats.distributedQuantity': 0,
      'seedStats.remainingQuantity': farmer.seedTotal || 0
    });

    // 重置筛选列表
    this.setData({ filteredFarmers: this.data.farmers });

    // 加载该农户的已发放面积
    await this.loadFarmerDistributedArea(farmer.id);

    // 检查是否可提交
    this.checkCanSubmit();
  },

  /**
   * 加载记录详情（编辑模式）
   */
  async loadRecordDetail(recordId: string) {
    wx.showLoading({ title: '加载中...' });

    try {
      // 调用云函数获取记录详情
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'getDetail',
          recordId
        }
      });

      const result = res.result as any;
      wx.hideLoading();

      if (result.success && result.data) {
        const record = result.data;

        // 调试日志：打印云函数返回的数据
        console.log('[seed-add] 编辑模式 - 记录详情:', record);

        // 加载农户列表
        await this.loadFarmers();

        // 查找对应农户
        const farmer = this.data.farmers.find((f: any) => f.id === record.farmerId);

        // 填充表单数据
        const formData = {
          selectedFarmer: farmer || {
            id: record.farmerId,
            name: record.farmerName,
            phone: record.farmerPhone || '',
            acreage: 0
          },
          'form.distributeTime': record.distributionDate || '',
          'form.quantity': String(record.quantity || ''),
          'form.unitPrice': String(record.unitPrice || ''),
          'form.distributedArea': String(record.distributedArea || ''),
          'form.receiverName': record.receiverName || '',
          'form.receiveLocation': record.receiveLocation || '',
          'form.managerName': record.managerName || record.createByName || '',
          calculatedAmount: (record.amount || 0).toFixed(2)
        };

        console.log('[seed-add] 回填数据:', formData);
        this.setData(formData);

        // 加载面积统计
        if (farmer) {
          this.setData({
            'areaStats.totalArea': farmer.acreage || 0
          });
          await this.loadFarmerDistributedArea(farmer.id);
        }

        this.checkCanSubmit();
      } else {
        wx.showToast({ title: result.message || '加载失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载记录详情失败:', error);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
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
          seedRecordCount: f.stats?.seedDistributionCount || 0,
          // 发苗完成状态
          seedDistributionComplete: f.seedDistributionComplete || false
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
   * 搜索农户（服务端搜索，带防抖）
   */
  onSearchFarmer(e: WechatMiniprogram.CustomEvent) {
    const value = e.detail.value;
    this.setData({ searchValue: value });

    // 清除之前的定时器
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // 如果输入为空，清空列表
    if (!value || !value.trim()) {
      this.setData({ filteredFarmers: [] });
      return;
    }

    // 防抖 300ms 后执行搜索
    searchTimer = setTimeout(() => {
      this.searchFarmersFromServer(value.trim());
    }, 300);
  },

  /**
   * 从服务端搜索农户
   */
  async searchFarmersFromServer(keyword: string) {
    if (!keyword) {
      this.setData({ filteredFarmers: [] });
      return;
    }

    try {
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId,
          keyword,  // 服务端搜索
          page: 1,
          pageSize: 20  // 搜索结果最多显示20条
        }
      });

      const result = res.result as any;
      if (result.success && result.data) {
        const rawFarmers = result.data.list || [];
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
          seedRecordCount: f.stats?.seedDistributionCount || 0,
          seedDistributionComplete: f.seedDistributionComplete || false
        }));
        this.setData({ filteredFarmers: farmers });
      }
    } catch (error) {
      console.error('搜索农户失败:', error);
    }
  },

  /**
   * 清除搜索
   */
  clearSearch() {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    this.setData({
      searchValue: '',
      filteredFarmers: []
    });
  },

  /**
   * 选中农户
   */
  async onSelectFarmer(e: WechatMiniprogram.TouchEvent) {
    const farmer = e.currentTarget.dataset.farmer;
    await this.applySelectedFarmer(farmer);
  },

  /**
   * 加载农户已发放面积和数量
   */
  async loadFarmerDistributedArea(farmerId: string) {
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
        // 计算已发放面积和数量总和 - 数据库存储的已经是万株
        const distributedArea = records.reduce((sum: number, r: any) => sum + (r.distributedArea || 0), 0);
        const distributedQuantity = records.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);

        const totalArea = this.data.areaStats.totalArea;
        const remainingArea = Math.max(0, totalArea - distributedArea);

        const contractedQuantity = this.data.seedStats.contractedQuantity;
        const remainingQuantity = Math.max(0, Math.round((contractedQuantity - distributedQuantity) * 100) / 100);

        this.setData({
          'areaStats.distributedArea': distributedArea,
          'areaStats.remainingArea': remainingArea,
          'seedStats.distributedQuantity': distributedQuantity,
          'seedStats.remainingQuantity': remainingQuantity
        });

        console.log('[seed-add] 统计:', {
          totalArea, distributedArea, remainingArea,
          contractedQuantity, distributedQuantity, remainingQuantity
        });
      }
    } catch (error) {
      console.error('加载已发放数据失败:', error);
    }
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
   * 输入本次发放面积（亩）
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

    const currentArea = parseFloat(value) || 0;

    this.setData({
      'form.distributedArea': value,
      'areaStats.currentArea': currentArea
    });
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

    const { form, selectedFarmer, calculatedAmount, isEditMode, recordId, areaStats } = this.data;

    // 面积超发警告检查
    const currentArea = parseFloat(form.distributedArea) || 0;
    const totalAfterSubmit = areaStats.distributedArea + currentArea;

    if (!isEditMode && totalAfterSubmit > areaStats.totalArea) {
      // 新增模式下检查是否超发
      const overAmount = (totalAfterSubmit - areaStats.totalArea).toFixed(2);
      const confirmed = await new Promise<boolean>((resolve) => {
        wx.showModal({
          title: '面积超发警告',
          content: `本次发放后总面积（${totalAfterSubmit.toFixed(2)}亩）将超过签约面积（${areaStats.totalArea}亩）${overAmount}亩，是否继续？`,
          confirmText: '继续发放',
          cancelText: '取消',
          success: (res) => resolve(res.confirm)
        });
      });

      if (!confirmed) return;
    }

    this.setData({ submitting: true });

    try {
      // 获取当前用户信息
      const userInfo = (app.globalData as any)?.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';
      const userName = userInfo.name || form.managerName;

      // 构建数据
      const submitData = {
        quantity: parseInt(form.quantity),
        unitPrice: parseFloat(form.unitPrice),
        amount: parseFloat(calculatedAmount),
        distributedArea: parseFloat(form.distributedArea),
        distributionDate: form.distributeTime.split(' ')[0],
        receiverName: form.receiverName.trim(),
        receiveLocation: form.receiveLocation.trim(),
        managerName: form.managerName.trim(),
        remark: `领取人：${form.receiverName}，地点：${form.receiveLocation}`
      };

      let res;

      if (isEditMode) {
        // 编辑模式：调用更新接口
        res = await wx.cloud.callFunction({
          name: 'seed-manage',
          data: {
            action: 'update',
            recordId,
            data: submitData
          }
        });
      } else {
        // 新增模式：调用发放接口
        res = await wx.cloud.callFunction({
          name: 'seed-manage',
          data: {
            action: 'distribute',
            userId,
            userName,
            farmerId: selectedFarmer.id,
            data: submitData
          }
        });
      }

      const result = res.result as any;
      this.setData({ submitting: false });

      if (result.success) {
        wx.showToast({
          title: isEditMode ? '修改成功' : '发放登记成功',
          icon: 'success',
          duration: 1500
        });

        // 新增模式下询问是否标记发苗完成
        if (!isEditMode) {
          setTimeout(async () => {
            const markComplete = await new Promise<boolean>((resolve) => {
              wx.showModal({
                title: '标记发苗完成',
                content: `是否标记"${selectedFarmer.name}"的发苗工作已完成？\n\n标记后将不再向该农户发放种苗。`,
                confirmText: '标记完成',
                cancelText: '继续发苗',
                success: (res) => resolve(res.confirm)
              });
            });

            if (markComplete) {
              await this.markFarmerSeedComplete(selectedFarmer.id);
            }

            wx.navigateBack();
          }, 1600);
        } else {
          // 编辑模式直接返回
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      } else {
        wx.showToast({ title: result.message || '操作失败', icon: 'none' });
      }
    } catch (error) {
      this.setData({ submitting: false });
      console.error('提交失败:', error);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  },

  /**
   * 删除记录（仅编辑模式可用）
   */
  async onDelete() {
    if (!this.data.isEditMode || !this.data.recordId) return;

    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定要删除这条发苗记录吗？',
        confirmText: '删除',
        confirmColor: '#e53935',
        cancelText: '取消',
        success: (res) => resolve(res.confirm)
      });
    });

    if (!confirmed) return;

    wx.showLoading({ title: '删除中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'delete',
          recordId: this.data.recordId
        }
      });

      wx.hideLoading();
      const result = res.result as any;

      if (result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: result.message || '删除失败', icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除失败:', error);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  /**
   * 标记农户发苗完成
   */
  async markFarmerSeedComplete(farmerId: string) {
    try {
      const userInfo = (app.globalData as any)?.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';
      const userName = userInfo.name || '系统';

      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'update',
          userId,
          farmerId,
          data: {
            seedDistributionComplete: true,
            seedDistributionCompleteTime: new Date(),
            seedDistributionCompleteBy: userId,
            seedDistributionCompleteByName: userName
          }
        }
      });

      const result = res.result as any;
      if (result.success) {
        wx.showToast({ title: '已标记完成', icon: 'success' });
      }
    } catch (error) {
      console.error('标记发苗完成失败:', error);
    }
  },

  /**
   * 直接标记农户发苗完成（不需要发苗，直接标记）
   */
  async onMarkSeedComplete() {
    const { selectedFarmer } = this.data;
    if (!selectedFarmer) {
      wx.showToast({ title: '请先选择农户', icon: 'none' });
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      wx.showModal({
        title: '标记发苗完成',
        content: `确认将"${selectedFarmer.name}"的发苗工作标记为已完成？\n\n标记后将不再向该农户发放种苗。`,
        confirmText: '确认完成',
        cancelText: '取消',
        success: (res) => resolve(res.confirm)
      });
    });

    if (!confirmed) return;

    wx.showLoading({ title: '处理中...' });

    try {
      await this.markFarmerSeedComplete(selectedFarmer.id);
      wx.hideLoading();

      // 更新农户完成状态
      this.setData({
        'selectedFarmer.seedDistributionComplete': true
      });

      wx.showToast({ title: '已标记完成', icon: 'success' });

      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      console.error('标记完成失败:', error);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  }
});
