/**
 * 种苗发放统计详情页
 * @description 管理层查看种苗发放的详细情况
 */

import { 
  MOCK_SEED_YESTERDAY,
  MOCK_SEED_YEAR_TOTAL,
  MOCK_SALESMAN_STATS,
  MOCK_FARMERS
} from '../../../models/mock-data';

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2) + '千';
  }
  return '¥' + amount.toFixed(2);
}

// 格式化数量
function formatQuantity(quantity: number): string {
  if (quantity >= 1000) {
    return (quantity / 1000).toFixed(2) + '吨';
  }
  return quantity + 'kg';
}

// 生成种苗发放记录
function generateSeedRecords(count: number, isYesterday: boolean = false) {
  const salesmen = MOCK_SALESMAN_STATS.slice(0, 10);
  const records = [];
  
  for (let i = 0; i < count; i++) {
    const farmer = MOCK_FARMERS[i % MOCK_FARMERS.length];
    const salesman = salesmen[i % salesmen.length];
    const quantity = Math.floor(Math.random() * 100) + 20; // 20-120kg
    const pricePerKg = 12; // 甜叶菊单价
    const totalAmount = quantity * pricePerKg;
    
    // 随机收款状态
    const rand = Math.random();
    let paidAmount = 0;
    let paymentStatus = 'unpaid';
    let paymentStatusText = '未收款';
    
    if (rand < 0.6) {
      paidAmount = totalAmount;
      paymentStatus = 'paid';
      paymentStatusText = '已收款';
    } else if (rand < 0.85) {
      paidAmount = Math.floor(totalAmount * 0.5);
      paymentStatus = 'partial';
      paymentStatusText = '部分收款';
    }
    
    const month = isYesterday ? 12 : Math.floor(Math.random() * 12) + 1;
    const day = isYesterday ? 9 : Math.floor(Math.random() * 28) + 1;
    
    records.push({
      id: `seed_${isYesterday ? 'y' : 'a'}_${i + 1}`,
      farmerId: farmer.id,
      farmerName: farmer.name,
      phone: farmer.phone,
      seedType: '甜叶菊',
      quantity,
      pricePerKg,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      paymentStatus,
      paymentStatusText,
      date: `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      distributor: salesman.salesmanName,
      distributorId: salesman.salesmanId
    });
  }
  
  return records;
}

// Mock 数据
const MOCK_SEED_RECORDS_YESTERDAY = generateSeedRecords(156, true);
const MOCK_SEED_RECORDS_YEAR = generateSeedRecords(5810, false);

Page({
  data: {
    // 当前Tab（0:昨日, 1:全年）
    currentTab: 1,
    // 搜索关键词
    searchKeyword: '',
    // 筛选条件
    filterSalesman: '',
    filterSalesmanName: '',
    filterPayment: '',
    filterPaymentName: '',
    // 汇总数据
    summary: {
      totalQuantity: '0',
      totalAmount: '0',
      farmerCount: '0',
      paidAmount: '0',
      unpaidAmount: '0',
      progressPercent: 0,
      distributedFarmers: 0,
      totalFarmers: 0
    },
    // 负责人列表
    salesmanList: [] as any[],
    // 筛选后的记录列表
    filteredList: [] as any[],
    // 当前显示的列表（分页）
    displayList: [] as any[],
    // 分页
    pageSize: 20,
    hasMore: false,
    loading: false,
    // 弹窗
    showSalesmanPopup: false,
    showPaymentPopup: false
  },

  onLoad() {
    this.initSalesmanList();
    this.loadData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
  },

  // 初始化负责人列表
  initSalesmanList() {
    this.setData({
      salesmanList: MOCK_SALESMAN_STATS
    });
  },

  // 加载数据
  loadData() {
    const { currentTab } = this.data;
    const summaryData = currentTab === 0 ? MOCK_SEED_YESTERDAY : MOCK_SEED_YEAR_TOTAL;
    
    // 格式化汇总数据
    const summary = {
      totalQuantity: formatQuantity(summaryData.totalQuantity),
      totalAmount: formatAmount(summaryData.totalAmount),
      farmerCount: (summaryData.distributedFarmerCount || (currentTab === 0 ? 156 : 5810)) + '户',
      paidAmount: formatAmount(summaryData.paidAmount),
      unpaidAmount: formatAmount(summaryData.unpaidAmount),
      progressPercent: summaryData.distributionPercent || 83,
      distributedFarmers: summaryData.distributedFarmerCount || 5810,
      totalFarmers: summaryData.totalFarmerCount || 7000
    };

    this.setData({ summary });
    this.filterAndDisplayList();
  },

  // 筛选并显示列表
  filterAndDisplayList() {
    const { currentTab, searchKeyword, filterSalesman, filterPayment } = this.data;
    
    // 选择数据源
    let list = currentTab === 0 ? MOCK_SEED_RECORDS_YESTERDAY : MOCK_SEED_RECORDS_YEAR;
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      list = list.filter(r => 
        r.farmerName.toLowerCase().includes(keyword) || 
        r.phone.includes(keyword)
      );
    }
    
    // 负责人过滤
    if (filterSalesman) {
      list = list.filter(r => r.distributorId === filterSalesman);
    }
    
    // 收款状态过滤
    if (filterPayment) {
      list = list.filter(r => r.paymentStatus === filterPayment);
    }
    
    // 按日期倒序
    list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    
    // 分页
    const pageSize = this.data.pageSize;
    const displayList = list.slice(0, pageSize);
    const hasMore = list.length > pageSize;
    
    this.setData({
      filteredList: list,
      displayList,
      hasMore
    });
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ 
      currentTab: tab,
      searchKeyword: '',
      filterSalesman: '',
      filterSalesmanName: '',
      filterPayment: '',
      filterPaymentName: ''
    });
    this.loadData();
  },

  // 搜索输入
  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 执行搜索
  onSearch() {
    this.filterAndDisplayList();
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.filterAndDisplayList();
  },

  // 显示负责人选择器
  showSalesmanPicker() {
    this.setData({ showSalesmanPopup: true });
  },

  closeSalesmanPopup() {
    this.setData({ showSalesmanPopup: false });
  },

  onSalesmanPopupChange(e: any) {
    this.setData({ showSalesmanPopup: e.detail.visible });
  },

  selectSalesman(e: any) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      filterSalesman: id,
      filterSalesmanName: name,
      showSalesmanPopup: false
    });
    this.filterAndDisplayList();
  },

  // 显示收款状态选择器
  showPaymentPicker() {
    this.setData({ showPaymentPopup: true });
  },

  closePaymentPopup() {
    this.setData({ showPaymentPopup: false });
  },

  onPaymentPopupChange(e: any) {
    this.setData({ showPaymentPopup: e.detail.visible });
  },

  selectPayment(e: any) {
    const { status, name } = e.currentTarget.dataset;
    this.setData({
      filterPayment: status,
      filterPaymentName: name,
      showPaymentPopup: false
    });
    this.filterAndDisplayList();
  },

  // 加载更多
  loadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({ loading: true });
    
    const { filteredList, displayList, pageSize } = this.data;
    const nextPage = displayList.length;
    const moreItems = filteredList.slice(nextPage, nextPage + pageSize);
    
    setTimeout(() => {
      this.setData({
        displayList: [...displayList, ...moreItems],
        hasMore: nextPage + pageSize < filteredList.length,
        loading: false
      });
    }, 300);
  },

  // 查看记录详情
  goRecordDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '详情页开发中',
      icon: 'none'
    });
  }
});

