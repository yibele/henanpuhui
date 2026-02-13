/**
 * 种苗发放统计详情页
 * @description 管理层查看种苗发放的详细情况，使用服务端搜索和分页
 */

import { getCache, setCache } from '../../../utils/cache';
import { formatAmount, formatSeedQuantity } from '../../../utils/format';

// 获取应用实例
const app = getApp();

// 每页条数
const PAGE_SIZE = 20;

Page({
  data: {
    // 当前Tab（0:今日, 1:全部）
    currentTab: 1,
    // 搜索关键词
    searchKeyword: '',
    // 汇总数据
    summary: {
      totalQuantity: '0',
      totalAmount: '0',
      farmerCount: '0',
      recordCount: 0,
      totalArea: '0'
    },
    // 当前显示的列表
    displayList: [] as any[],
    // 分页
    page: 1,
    total: 0,
    hasMore: false,
    loading: false,
    // 加载中
    pageLoading: true,
    // 是否来自缓存
    fromCache: false,
    // 搜索防抖定时器
    _searchTimer: 0 as any
  },

  onLoad() {
    this.loadSummary();
    this.loadList(true);
  },

  onShow() {
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
   * 加载汇总统计（后端聚合，不受分页影响）
   */
  async loadSummary() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: { action: 'getSummaryStats' }
      });

      const result = res.result as any;
      if (result.success && result.data) {
        const s = result.data;
        this.setData({
          summary: {
            totalQuantity: formatSeedQuantity(s.totalQuantity || 0),
            totalAmount: formatAmount(s.totalAmount || 0),
            farmerCount: (s.farmerCount || 0) + '户',
            recordCount: s.recordCount || 0,
            totalArea: (s.totalArea || 0).toFixed(1) + '亩'
          }
        });
      }
    } catch (e) {
      console.error('加载发苗统计失败:', e);
    }
  },

  /**
   * 加载发苗记录列表（服务端搜索 + 服务端分页）
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
      const { searchKeyword, currentTab } = this.data;

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

      // 今日筛选：传日期范围
      if (currentTab === 0) {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        requestData.startDate = dateStr;
        requestData.endDate = dateStr;
      }

      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: requestData
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawRecords = result.data.list || [];
        const newItems = rawRecords.map((r: any) => ({
          id: r._id,
          recordId: r.recordId,
          farmerId: r.farmerId,
          farmerName: r.farmerName,
          phone: r.farmerPhone,
          quantity: r.quantity || 0,
          unitPrice: r.unitPrice || 0,
          amount: r.amount || 0,
          distributedArea: r.distributedArea || 0,
          receiverName: r.receiverName || '',
          receiveLocation: r.receiveLocation || '',
          managerName: r.createByName || r.managerName || '',
          date: r.distributionDate || (r.createTime ? new Date(r.createTime).toLocaleDateString('zh-CN') : ''),
          createTime: r.createTime
        }));

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

        if (reset && this.data.displayList.length > 0) {
          wx.showToast({ title: '已刷新', icon: 'success', duration: 800 });
        }
      } else {
        console.error('获取发苗记录失败:', result.message);
        if (reset) {
          this.setData({ displayList: [], total: 0, hasMore: false, pageLoading: false });
        } else {
          this.setData({ loading: false });
        }
      }
    } catch (error) {
      console.error('加载发苗记录失败:', error);
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
      searchKeyword: ''
    });
    this.loadList(true);
  },

  /**
   * 搜索输入（300ms 防抖）
   */
  onSearchInput(e: any) {
    const value = e.detail.value;
    this.setData({ searchKeyword: value });

    if (this.data._searchTimer) {
      clearTimeout(this.data._searchTimer);
    }

    const timer = setTimeout(() => {
      this.loadList(true);
    }, 300);

    this.setData({ _searchTimer: timer });
  },

  /**
   * 执行搜索
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
   * 加载更多
   */
  loadMore() {
    if (this.data.loading || !this.data.hasMore) return;
    this.loadList(false);
  },

  /**
   * 跳转到发苗登记
   */
  goToSeedAdd() {
    wx.navigateTo({
      url: '/pages/operations/seed-add/index'
    });
  },

  /**
   * 查看记录详情
   */
  goRecordDetail(e: any) {
    const record = e.currentTarget.dataset.record;
    wx.showModal({
      title: '发苗详情',
      content: `农户：${record.farmerName}\n数量：${record.quantity}万株\n金额：¥${record.amount}\n面积：${record.distributedArea}亩\n领取人：${record.receiverName}\n日期：${record.date}`,
      showCancel: false
    });
  }
});
