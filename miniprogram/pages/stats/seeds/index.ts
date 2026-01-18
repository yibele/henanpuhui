/**
 * 种苗发放统计详情页
 * @description 管理层查看种苗发放的详细情况
 */

// 获取应用实例
const app = getApp();

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
  if (quantity >= 10000) {
    return (quantity / 10000).toFixed(2) + '万株';
  } else if (quantity >= 1000) {
    return (quantity / 1000).toFixed(2) + '千株';
  }
  return quantity + '株';
}

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
    // 发放记录列表
    records: [] as any[],
    // 筛选后的记录列表
    filteredList: [] as any[],
    // 当前显示的列表（分页）
    displayList: [] as any[],
    // 分页
    pageSize: 20,
    currentPage: 1,
    hasMore: false,
    loading: false,
    // 加载中
    pageLoading: true
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
  },

  onPullDownRefresh() {
    this.loadData();
  },

  /**
   * 加载数据（从云函数获取）
   */
  async loadData() {
    this.setData({ pageLoading: true });

    try {
      // 获取当前用户信息
      const globalData = (app.globalData as any) || {};
      const userInfo = globalData.currentUser || {};
      const userId = userInfo.id || userInfo._id || '';

      console.log('[seeds-stats] 加载发苗记录, userId:', userId);

      // 调用云函数获取发苗记录
      const res = await wx.cloud.callFunction({
        name: 'seed-manage',
        data: {
          action: 'list',
          userId,  // 如果是助理，只显示自己的记录
          page: 1,
          pageSize: 500  // 获取尽量多的数据用于统计
        }
      });

      const result = res.result as any;

      if (result.success && result.data) {
        const rawRecords = result.data.list || [];

        // 格式化记录数据
        const records = rawRecords.map((r: any) => ({
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

        // 计算汇总数据
        const totalQuantity = records.reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
        const totalAmount = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
        const totalArea = records.reduce((sum: number, r: any) => sum + (r.distributedArea || 0), 0);

        // 统计涉及的农户数（去重）
        const farmerIds = new Set(records.map((r: any) => r.farmerId));

        const summary = {
          totalQuantity: formatQuantity(totalQuantity),
          totalAmount: formatAmount(totalAmount),
          farmerCount: farmerIds.size + '户',
          recordCount: records.length,
          totalArea: totalArea.toFixed(1) + '亩'
        };

        this.setData({
          records,
          summary,
          pageLoading: false
        });

        this.filterAndDisplayList();
      } else {
        console.error('获取发苗记录失败:', result.message);
        this.setData({
          records: [],
          filteredList: [],
          displayList: [],
          summary: { totalQuantity: '0', totalAmount: '0', farmerCount: '0户', recordCount: 0, totalArea: '0亩' },
          pageLoading: false
        });
      }
    } catch (error) {
      console.error('加载发苗记录失败:', error);
      this.setData({
        records: [],
        filteredList: [],
        displayList: [],
        summary: { totalQuantity: '0', totalAmount: '0', farmerCount: '0户', recordCount: 0, totalArea: '0亩' },
        pageLoading: false
      });
    }

    wx.stopPullDownRefresh();
  },

  /**
   * 筛选并显示列表
   */
  filterAndDisplayList() {
    const { records, searchKeyword, currentTab } = this.data;

    let list = [...records];

    // 如果是今日tab，只显示今天的记录
    if (currentTab === 0) {
      const today = new Date().toLocaleDateString('zh-CN');
      list = list.filter(r => r.date === today);
    }

    // 搜索过滤
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      list = list.filter(r =>
        (r.farmerName && r.farmerName.toLowerCase().includes(keyword)) ||
        (r.phone && r.phone.includes(keyword)) ||
        (r.managerName && r.managerName.toLowerCase().includes(keyword))
      );
    }

    // 按时间倒序
    list = list.sort((a, b) => {
      if (a.createTime && b.createTime) {
        return new Date(b.createTime).getTime() - new Date(a.createTime).getTime();
      }
      return 0;
    });

    // 分页
    const pageSize = this.data.pageSize;
    const displayList = list.slice(0, pageSize);
    const hasMore = list.length > pageSize;

    this.setData({
      filteredList: list,
      displayList,
      hasMore,
      currentPage: 1
    });
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
   * 加载更多
   */
  loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    const { filteredList, displayList, pageSize } = this.data;
    const nextStart = displayList.length;
    const moreItems = filteredList.slice(nextStart, nextStart + pageSize);

    setTimeout(() => {
      this.setData({
        displayList: [...displayList, ...moreItems],
        hasMore: nextStart + pageSize < filteredList.length,
        loading: false,
        currentPage: this.data.currentPage + 1
      });
    }, 300);
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
      content: `农户：${record.farmerName}\n数量：${record.quantity}株\n金额：¥${record.amount}\n面积：${record.distributedArea}亩\n领取人：${record.receiverName}\n日期：${record.date}`,
      showCancel: false
    });
  }
});
