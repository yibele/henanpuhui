/**
 * 签约农户统计详情页
 * @description 管理层查看签约农户的总体情况和单独情况，使用云函数真实数据
 */

import { getCache, setCache } from '../../../utils/cache';

// 获取应用实例
const app = getApp();

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

// 转换农户数据为列表格式
function formatFarmerForList(farmer: any) {
  return {
    id: farmer._id || farmer.id,
    name: farmer.name,
    phone: farmer.phone,
    grade: farmer.grade || 'bronze',
    gradeText: GRADE_TEXT[farmer.grade] || '铜牌',
    acreage: farmer.acreage || 0,
    deposit: farmer.deposit || 0,
    manager: farmer.salesmanName || farmer.manager || '未分配',
    contractDate: farmer.contractDate || (farmer.createTime ? new Date(farmer.createTime).toLocaleDateString('zh-CN') : ''),
    addressText: farmer.addressText || ''
  };
}

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
    // 全部农户数据（从云函数获取）
    allFarmers: [] as any[],
    // 筛选后的农户列表
    filteredList: [] as any[],
    // 当前显示的列表（分页）
    displayList: [] as any[],
    // 分页
    pageSize: 20,
    currentPage: 1,
    hasMore: false,
    loading: false,
    // 页面加载中
    pageLoading: true,
    // 是否来自缓存
    fromCache: false,
    // 负责人选择弹窗
    showSalesmanPopup: false
  },

  onLoad() {
    this.loadData(false);
  },

  onShow() {
    // 更新 tabbar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
  },

  onPullDownRefresh() {
    // 下拉刷新：强制从服务器获取
    this.loadData(true);
  },

  /**
   * 加载数据
   * @param forceRefresh 是否强制刷新
   */
  async loadData(forceRefresh: boolean = false) {
    const cacheKey = 'cache_farmers_stats_all';

    // 先尝试从缓存加载
    if (!forceRefresh) {
      const cached = getCache<any>(cacheKey);
      if (cached) {
        console.log('[farmers-stats] 从缓存加载数据');
        this.setData({
          allFarmers: cached.farmers,
          salesmanList: cached.salesmanList,
          fromCache: true,
          pageLoading: false
        });
        this.calculateSummary();
        this.filterAndDisplayList();
        return;
      }
    }

    // 从服务器加载
    this.setData({ pageLoading: true, fromCache: false });

    try {
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      console.log('[farmers-stats] 从服务器加载数据, userId:', userId);

      // 调用云函数获取农户列表
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId,
          page: 1,
          pageSize: 1000 // 获取全部
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawFarmers = result.data.list || [];
        const farmers = rawFarmers.map(formatFarmerForList);

        // 提取负责人列表
        const salesmanMap = new Map<string, any>();
        rawFarmers.forEach((f: any) => {
          const name = f.salesmanName || f.manager;
          const id = f.salesmanId || f.managerId || name;
          if (name && !salesmanMap.has(id)) {
            salesmanMap.set(id, {
              salesmanId: id,
              salesmanName: name
            });
          }
        });
        const salesmanList = Array.from(salesmanMap.values());

        // 保存到缓存
        setCache(cacheKey, { farmers, salesmanList });

        this.setData({
          allFarmers: farmers,
          salesmanList,
          pageLoading: false,
          fromCache: false
        });

        this.calculateSummary();
        this.filterAndDisplayList();

        if (forceRefresh) {
          wx.showToast({ title: '已刷新', icon: 'success', duration: 1000 });
        }
      } else {
        console.error('获取农户列表失败:', result.message);
        this.setData({
          allFarmers: [],
          salesmanList: [],
          filteredList: [],
          displayList: [],
          pageLoading: false
        });
      }
    } catch (error) {
      console.error('加载农户数据失败:', error);

      // 请求失败时尝试使用缓存
      const staleCache = getCache<any>(cacheKey);
      if (staleCache) {
        console.log('[farmers-stats] 请求失败，使用缓存');
        this.setData({
          allFarmers: staleCache.farmers,
          salesmanList: staleCache.salesmanList,
          fromCache: true,
          pageLoading: false
        });
        this.calculateSummary();
        this.filterAndDisplayList();
        wx.showToast({ title: '网络异常，显示缓存数据', icon: 'none' });
      } else {
        this.setData({
          allFarmers: [],
          salesmanList: [],
          filteredList: [],
          displayList: [],
          pageLoading: false
        });
      }
    }

    wx.stopPullDownRefresh();
  },

  /**
   * 计算汇总数据
   */
  calculateSummary() {
    const { allFarmers, currentTab } = this.data;

    // 如果是昨日tab，筛选昨日数据
    let farmers = allFarmers;
    if (currentTab === 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('zh-CN');
      farmers = allFarmers.filter(f => f.contractDate === yesterdayStr);
    }

    const totalFarmers = farmers.length;
    const totalAcreage = farmers.reduce((sum, f) => sum + (f.acreage || 0), 0);
    const totalDeposit = farmers.reduce((sum, f) => sum + (f.deposit || 0), 0);

    // 等级统计
    const gold = farmers.filter(f => f.grade === 'gold').length;
    const silver = farmers.filter(f => f.grade === 'silver').length;
    const bronze = farmers.filter(f => f.grade === 'bronze').length;

    const total = gold + silver + bronze || 1;
    const goldPercent = Math.round(gold / total * 100);
    const silverPercent = Math.round(silver / total * 100);
    const bronzePercent = 100 - goldPercent - silverPercent;

    this.setData({
      summary: {
        totalFarmers: totalFarmers.toString(),
        totalAcreage: formatAcreage(totalAcreage),
        totalDeposit: formatAmount(totalDeposit),
        gold,
        silver,
        bronze,
        goldPercent,
        silverPercent,
        bronzePercent
      }
    });
  },

  /**
   * 筛选并显示列表
   */
  filterAndDisplayList() {
    const { allFarmers, currentTab, searchKeyword, filterGrade, filterSalesman, filterSalesmanName } = this.data;

    // 如果是昨日tab，筛选昨日数据
    let list = [...allFarmers];
    if (currentTab === 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('zh-CN');
      list = list.filter(f => f.contractDate === yesterdayStr);
    }

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
      list = list.filter(f => f.manager === filterSalesmanName);
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

  /**
   * 切换Tab
   */
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({
      currentTab: tab,
      searchKeyword: '',
      filterGrade: '',
      filterSalesman: '',
      filterSalesmanName: ''
    });
    this.calculateSummary();
    this.filterAndDisplayList();
  },

  /**
   * 搜索输入
   */
  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value });
  },

  /**
   * 执行搜索
   */
  onSearch() {
    this.filterAndDisplayList();
  },

  /**
   * 清除搜索
   */
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.filterAndDisplayList();
  },

  /**
   * 设置等级筛选
   */
  setFilterGrade(e: any) {
    const grade = e.currentTarget.dataset.grade;
    this.setData({ filterGrade: grade });
    this.filterAndDisplayList();
  },

  /**
   * 显示负责人选择器
   */
  showSalesmanPicker() {
    this.setData({ showSalesmanPopup: true });
  },

  /**
   * 关闭负责人选择器
   */
  closeSalesmanPopup() {
    this.setData({ showSalesmanPopup: false });
  },

  /**
   * 负责人弹窗状态变化
   */
  onSalesmanPopupChange(e: any) {
    this.setData({ showSalesmanPopup: e.detail.visible });
  },

  /**
   * 选择负责人
   */
  selectSalesman(e: any) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      filterSalesman: id,
      filterSalesmanName: name,
      showSalesmanPopup: false
    });
    this.filterAndDisplayList();
  },

  /**
   * 加载更多
   */
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

  /**
   * 跳转农户详情
   */
  goFarmerDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/farmers/detail/index?id=${id}`
    });
  }
});
