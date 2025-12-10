/**
 * 签约农户统计详情页
 * @description 管理层查看签约农户的总体情况和单独情况
 */

import { 
  MOCK_FARMER_SUMMARY, 
  MOCK_FARMER_SUMMARY_YESTERDAY,
  MOCK_SALESMAN_STATS
} from '../../../models/mock-data';

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2).replace(/\.?0+$/, '') + '万';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2).replace(/\.?0+$/, '') + '千';
  }
  return '¥' + amount;
}

// 格式化面积
function formatAcreage(acreage: number): string {
  if (acreage >= 10000) {
    return (acreage / 10000).toFixed(2).replace(/\.?0+$/, '') + '万亩';
  } else if (acreage >= 1000) {
    return (acreage / 1000).toFixed(2).replace(/\.?0+$/, '') + '千亩';
  }
  return acreage + '亩';
}

// 等级文本映射
const GRADE_TEXT: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

// Mock 农户列表（全年度）
const MOCK_FARMER_LIST = generateMockFarmers(200);

// 生成 Mock 农户数据
function generateMockFarmers(count: number) {
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', 
                 '郑伟', '王芳', '陈明', '刘洋', '杨丽', '黄强', '周婷', '吴军',
                 '赵敏', '钱龙', '孙凤', '李华', '王磊', '张静', '刘伟', '陈红'];
  const managers = MOCK_SALESMAN_STATS.map(s => s.salesmanName);
  const grades = ['gold', 'silver', 'bronze'];
  const gradeWeights = [0.18, 0.42, 0.40]; // 金银铜比例
  
  const farmers = [];
  for (let i = 0; i < count; i++) {
    // 根据权重随机选择等级
    const rand = Math.random();
    let grade = 'bronze';
    if (rand < gradeWeights[0]) {
      grade = 'gold';
    } else if (rand < gradeWeights[0] + gradeWeights[1]) {
      grade = 'silver';
    }
    
    const acreage = Math.floor(Math.random() * 30) + 5; // 5-35亩
    const deposit = acreage * 400; // 每亩400元定金
    
    farmers.push({
      id: `farmer_${i + 1}`,
      name: names[i % names.length] + (i >= names.length ? Math.floor(i / names.length) : ''),
      phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      grade,
      gradeText: GRADE_TEXT[grade],
      acreage,
      deposit,
      manager: managers[i % managers.length],
      contractDate: `2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
    });
  }
  return farmers;
}

// Mock 昨日新增农户
const MOCK_FARMER_LIST_YESTERDAY = generateMockFarmers(28).map((f, i) => ({
  ...f,
  id: `farmer_yesterday_${i + 1}`,
  contractDate: '2024-12-09'
}));

Page({
  data: {
    // 当前Tab（0:昨日, 1:全年）
    currentTab: 1,
    // 搜索关键词
    searchKeyword: '',
    // 筛选条件
    filterGrade: '',
    filterSalesman: '',
    filterSalesmanName: '',
    // 汇总数据
    summary: {
      totalFarmers: '0',
      totalAcreage: '0',
      totalDeposit: '0',
      gold: 0,
      silver: 0,
      bronze: 0,
      goldPercent: 0,
      silverPercent: 0,
      bronzePercent: 0
    },
    // 负责人列表
    salesmanList: [] as any[],
    // 筛选后的农户列表
    filteredList: [] as any[],
    // 当前显示的列表（分页）
    displayList: [] as any[],
    // 分页
    pageSize: 20,
    currentPage: 1,
    hasMore: false,
    loading: false,
    // 负责人选择弹窗
    showSalesmanPopup: false
  },

  onLoad() {
    this.initSalesmanList();
    this.loadData();
  },

  onShow() {
    // 更新 tabbar 选中状态
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
    const summaryData = currentTab === 0 ? MOCK_FARMER_SUMMARY_YESTERDAY : MOCK_FARMER_SUMMARY;
    
    // 格式化汇总数据
    const summary = {
      totalFarmers: summaryData.totalFarmers.toString(),
      totalAcreage: formatAcreage(summaryData.totalAcreage),
      totalDeposit: formatAmount(summaryData.totalDeposit),
      gold: summaryData.gradeDistribution.gold,
      silver: summaryData.gradeDistribution.silver,
      bronze: summaryData.gradeDistribution.bronze,
      goldPercent: summaryData.gradeDistribution.goldPercent,
      silverPercent: summaryData.gradeDistribution.silverPercent,
      bronzePercent: summaryData.gradeDistribution.bronzePercent
    };

    this.setData({ summary });
    this.filterAndDisplayList();
  },

  // 筛选并显示列表
  filterAndDisplayList() {
    const { currentTab, searchKeyword, filterGrade, filterSalesman } = this.data;
    
    // 选择数据源
    let list = currentTab === 0 ? MOCK_FARMER_LIST_YESTERDAY : MOCK_FARMER_LIST;
    
    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      list = list.filter(f => 
        f.name.toLowerCase().includes(keyword) || 
        f.phone.includes(keyword)
      );
    }
    
    // 等级过滤
    if (filterGrade) {
      list = list.filter(f => f.grade === filterGrade);
    }
    
    // 负责人过滤
    if (filterSalesman) {
      const salesmanName = this.data.filterSalesmanName;
      list = list.filter(f => f.manager === salesmanName);
    }
    
    // 重置分页
    const pageSize = this.data.pageSize;
    const displayList = list.slice(0, pageSize);
    const hasMore = list.length > pageSize;
    
    this.setData({
      filteredList: list,
      displayList,
      currentPage: 1,
      hasMore
    });
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ 
      currentTab: tab,
      searchKeyword: '',
      filterGrade: '',
      filterSalesman: '',
      filterSalesmanName: ''
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

  // 设置等级筛选
  setFilterGrade(e: any) {
    const grade = e.currentTarget.dataset.grade;
    this.setData({ filterGrade: grade });
    this.filterAndDisplayList();
  },

  // 显示负责人选择器
  showSalesmanPicker() {
    this.setData({ showSalesmanPopup: true });
  },

  // 关闭负责人选择器
  closeSalesmanPopup() {
    this.setData({ showSalesmanPopup: false });
  },

  // 负责人弹窗状态变化
  onSalesmanPopupChange(e: any) {
    this.setData({ showSalesmanPopup: e.detail.visible });
  },

  // 选择负责人
  selectSalesman(e: any) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      filterSalesman: id,
      filterSalesmanName: name,
      showSalesmanPopup: false
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

  // 跳转农户详情
  goFarmerDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/farmers/detail/index?id=${id}`
    });
  }
});

