/**
 * 签约农户统计详情页
 * @description 管理层查看签约农户的总体情况，使用服务端搜索和分页
 */

import { getCache, setCache } from '../../../utils/cache';
import { formatAmount, formatAcreage } from '../../../utils/format';

// 获取应用实例
const app = getApp();

// 等级文本映射
const GRADE_TEXT: Record<string, string> = {
  gold: '金牌',
  silver: '银牌',
  bronze: '铜牌'
};

// 每页条数
const PAGE_SIZE = 20;

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
    // 当前显示的列表
    displayList: [] as any[],
    // 分页
    page: 1,
    total: 0,
    hasMore: false,
    loading: false,
    // 页面加载中
    pageLoading: true,
    // 是否来自缓存
    fromCache: false,
    // 负责人选择弹窗
    showSalesmanPopup: false,
    // 搜索防抖定时器
    _searchTimer: 0 as any
  },

  onLoad() {
    this.loadSalesmanList();
    this.loadSummary();
    this.loadList(true);
  },

  onShow() {
    // 更新 tabbar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
  },

  onPullDownRefresh() {
    this.loadSummary();
    this.loadList(true);
  },

  /**
   * 获取用户ID
   */
  getUserId(): string {
    const globalData = (app.globalData as any) || {};
    const userInfo = globalData.currentUser || {};
    return userInfo.id || userInfo._id || '';
  },

  /**
   * 加载负责人列表（仅首次加载，用于筛选器）
   */
  async loadSalesmanList() {
    const cacheKey = 'cache_farmers_salesman_list';
    const cached = getCache<any[]>(cacheKey);
    if (cached) {
      this.setData({ salesmanList: cached });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'list',
          userId: this.getUserId(),
          page: 1,
          pageSize: 1000
        }
      });
      const result = res.result as any;
      if (result.success && result.data) {
        const salesmanMap = new Map<string, any>();
        (result.data.list || []).forEach((f: any) => {
          const name = f.salesmanName || f.manager;
          const id = f.salesmanId || f.managerId || name;
          if (name && !salesmanMap.has(id)) {
            salesmanMap.set(id, { salesmanId: id, salesmanName: name });
          }
        });
        const salesmanList = Array.from(salesmanMap.values());
        setCache(cacheKey, salesmanList);
        this.setData({ salesmanList });
      }
    } catch (e) {
      console.error('加载负责人列表失败:', e);
    }
  },

  /**
   * 加载汇总统计（使用 getStatusStats 后端聚合）
   */
  async loadSummary() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: {
          action: 'getStatusStats',
          userId: this.getUserId()
        }
      });

      const result = res.result as any;
      if (result.success && result.data) {
        const stats = result.data;
        const totalFarmers = stats.totalCount || 0;
        const totalAcreage = stats.totalAcreage || 0;
        const totalDeposit = stats.totalDeposit || 0;
        const gold = stats.gradeStats?.gold || 0;
        const silver = stats.gradeStats?.silver || 0;
        const bronze = stats.gradeStats?.bronze || 0;

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
        return;
      }
    } catch (e) {
      console.error('加载统计数据失败:', e);
    }

    // 降级：使用当前列表数据计算（loadList 完成后）
  },

  /**
   * 加载农户列表（服务端搜索 + 服务端分页）
   * @param reset 是否重置到第一页
   */
  async loadList(reset: boolean = false) {
    if (this.data.loading) return;

    const page = reset ? 1 : this.data.page;

    if (reset) {
      this.setData({ pageLoading: true, page: 1 });
    } else {
      this.setData({ loading: true });
    }

    try {
      const { searchKeyword, filterGrade } = this.data;

      const requestData: any = {
        action: 'list',
        userId: this.getUserId(),
        page,
        pageSize: PAGE_SIZE
      };

      // 服务端搜索
      if (searchKeyword.trim()) {
        requestData.keyword = searchKeyword.trim();
      }

      // 等级筛选
      if (filterGrade) {
        requestData.status = filterGrade;
      }

      const res = await wx.cloud.callFunction({
        name: 'farmer-manage',
        data: requestData
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const newItems = (result.data.list || []).map(formatFarmerForList);
        const total = result.data.total || 0;

        if (reset) {
          this.setData({
            displayList: newItems,
            total,
            page: 2,
            hasMore: newItems.length < total,
            pageLoading: false,
            fromCache: false
          });
        } else {
          const merged = [...this.data.displayList, ...newItems];
          this.setData({
            displayList: merged,
            total,
            page: page + 1,
            hasMore: merged.length < total,
            loading: false
          });
        }
      } else {
        console.error('获取农户列表失败:', result.message);
        if (reset) {
          this.setData({ displayList: [], total: 0, hasMore: false, pageLoading: false });
        } else {
          this.setData({ loading: false });
        }
      }
    } catch (error) {
      console.error('加载农户数据失败:', error);
      if (reset) {
        this.setData({ displayList: [], total: 0, hasMore: false, pageLoading: false });
      } else {
        this.setData({ loading: false });
      }
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }

    wx.stopPullDownRefresh();
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
    this.loadSummary();
    this.loadList(true);
  },

  /**
   * 搜索输入（300ms 防抖）
   */
  onSearchInput(e: any) {
    const value = e.detail.value;
    this.setData({ searchKeyword: value });

    // 清除之前的防抖定时器
    if (this.data._searchTimer) {
      clearTimeout(this.data._searchTimer);
    }

    // 设置新的防抖定时器
    const timer = setTimeout(() => {
      this.loadList(true);
    }, 300);

    this.setData({ _searchTimer: timer });
  },

  /**
   * 执行搜索（点击搜索按钮或键盘确认）
   */
  onSearch() {
    if (this.data._searchTimer) {
      clearTimeout(this.data._searchTimer);
    }
    this.loadList(true);
  },

  /**
   * 清除搜索
   */
  clearSearch() {
    if (this.data._searchTimer) {
      clearTimeout(this.data._searchTimer);
    }
    this.setData({ searchKeyword: '' });
    this.loadList(true);
  },

  /**
   * 设置等级筛选
   */
  setFilterGrade(e: any) {
    const grade = e.currentTarget.dataset.grade;
    this.setData({ filterGrade: grade });
    this.loadList(true);
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
    this.loadList(true);
  },

  /**
   * 加载更多（触底加载下一页）
   */
  loadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    this.loadList(false);
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
