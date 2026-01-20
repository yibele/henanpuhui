/**
 * 仓库收购明细页面
 * @description 显示单个仓库的收购记录（只读）
 */

const app = getApp<IAppOption>();

Page({
  data: {
    // 仓库信息
    warehouseId: '',
    warehouseName: '',
    updateTime: '',

    // 当前Tab（0:今日, 1:累计）
    currentTab: 0,

    // 搜索关键词
    searchKeyword: '',

    // 汇总数据
    summary: {
      totalWeight: '0',
      totalAmount: '0',
      count: '0'
    },

    // 记录列表
    list: [] as any[],

    // 分页
    page: 1,
    pageSize: 20,
    hasMore: false,
    loading: false
  },

  onLoad(options: any) {
    const warehouseId = options.id || '';
    const warehouseName = options.name || '仓库';

    this.setData({
      warehouseId,
      warehouseName
    });

    this.setUpdateTime();
    this.loadData();
  },

  // 设置更新时间
  setUpdateTime() {
    const now = new Date();
    const time = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({ updateTime: time });
  },

  // 加载数据
  async loadData() {
    const { warehouseId, currentTab, page, pageSize, searchKeyword } = this.data;

    if (!warehouseId) {
      wx.showToast({ title: '仓库ID不存在', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const currentUser = app.globalData.currentUser;

      // 获取今日日期
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const res = await wx.cloud.callFunction({
        name: 'acquisition-manage',
        data: {
          action: 'list',
          userId: currentUser?.id || currentUser?._id,
          warehouseId,
          dateRange: currentTab === 0 ? 'today' : 'all',
          startDate: currentTab === 0 ? today : undefined,
          endDate: currentTab === 0 ? today : undefined,
          keyword: searchKeyword,
          page: page === 1 ? 1 : page,
          pageSize
        }
      });

      const result = res.result as any;

      if (result.success) {
        const newList = result.data?.list || [];
        const total = result.data?.total || 0;

        // 计算汇总
        let totalWeight = 0;
        let totalAmount = 0;

        if (page === 1) {
          // 第一页时重新计算
          newList.forEach((item: any) => {
            totalWeight += item.netWeight || item.weight || 0;
            totalAmount += item.totalAmount || 0;
          });
        }

        this.setData({
          list: page === 1 ? newList : [...this.data.list, ...newList],
          summary: page === 1 ? {
            totalWeight: totalWeight.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            count: String(total)
          } : this.data.summary,
          hasMore: newList.length === pageSize,
          loading: false
        });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: result.errMsg || '加载失败', icon: 'none' });
      }
    } catch (error) {
      console.error('加载收购记录失败:', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({
      currentTab: tab,
      page: 1,
      list: [],
      searchKeyword: ''
    });
    this.loadData();
  },

  // 搜索输入
  onSearchInput(e: any) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 执行搜索
  onSearch() {
    this.setData({ page: 1, list: [] });
    this.loadData();
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '', page: 1, list: [] });
    this.loadData();
  },

  // 加载更多
  loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ page: this.data.page + 1 });
    this.loadData();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ page: 1, list: [] });
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
