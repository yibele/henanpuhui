/**
 * 结算管理页面
 * @description 根据角色显示不同视图：
 *   - 会计(finance_admin): 待审核、已审核、全部
 *   - 出纳(cashier): 待付款、已付款、全部
 *   - 管理员(admin): 全部视图
 */

// 获取应用实例
const financeIndexApp = getApp();

// 结算状态标签
const STATUS_LABELS: Record<string, string> = {
  pending: '待审核',
  approved: '待付款',
  completed: '已完成',
  rejected: '已驳回'
};

// 状态对应的颜色类
const STATUS_COLORS: Record<string, string> = {
  pending: 'orange',
  approved: 'blue',
  completed: 'green',
  rejected: 'red'
};

// 每页加载条数
const PAGE_SIZE = 20;

Page({
  data: {
    // 当前用户角色
    userRole: '' as string,
    roleLabel: '' as string,

    // Tab配置（根据角色动态设置）
    currentTab: 0,
    tabs: [] as string[],
    tabStatusMap: [] as string[],

    // 结算列表
    settlements: [] as any[],

    // 分页
    page: 1,
    total: 0,
    hasMore: true,
    isLoading: false,

    // 搜索
    searchValue: '',

    // 统计数量
    counts: {
      all: 0,
      pending: 0,
      approved: 0,
      completed: 0
    },

    // 汇总统计
    overview: {
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      completedCount: 0,
      completedAmount: 0
    },
    formattedOverview: {
      pendingAmount: '0',
      approvedAmount: '0',
      completedAmount: '0'
    }
  },

  onLoad() {
    this.initRoleConfig();
    this.loadOverview();
    this.loadSettlements(true);
  },

  onShow() {
    // 更新 TabBar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      const tabIndex = this.data.userRole === 'cashier' ? 1 : 1;
      this.getTabBar().setData({ value: tabIndex });
    }

    // 刷新数据，确保显示最新状态
    this.loadOverview();
    this.loadSettlements(true);
  },

  /**
   * 根据角色初始化Tab配置
   */
  initRoleConfig() {
    const userRole = financeIndexApp.globalData?.userRole || 'finance_admin';
    let tabs: string[] = [];
    let tabStatusMap: string[] = [];
    let roleLabel = '';

    if (userRole === 'cashier') {
      // 出纳视图：待付款、已付款
      tabs = ['待付款', '已付款'];
      tabStatusMap = ['approved', 'completed'];
      roleLabel = '出纳';
    } else if (userRole === 'finance_admin') {
      // 会计视图：待审核、待付款、已完成
      tabs = ['待审核', '待付款', '已完成'];
      tabStatusMap = ['pending', 'approved', 'completed'];
      roleLabel = '会计';
    } else {
      // 管理员视图：待审核、待付款、已完成、全部
      tabs = ['待审核', '待付款', '已完成', '全部'];
      tabStatusMap = ['pending', 'approved', 'completed', 'all'];
      roleLabel = '管理员';
    }

    this.setData({
      userRole,
      roleLabel,
      tabs,
      tabStatusMap,
      currentTab: 0  // 默认显示第一个Tab
    });
  },

  /**
   * 加载汇总统计
   */
  async loadOverview() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'settlement-manage',
        data: {
          action: 'getCashierStats'  // 复用出纳统计接口
        }
      });

      const result = res.result as any;
      if (result && result.success) {
        const data = result.data || {};

        this.setData({
          overview: {
            pendingCount: data.pendingCount || 0,
            pendingAmount: data.pendingAmount || 0,
            approvedCount: data.pendingCount || 0,  // approved就是待付款
            approvedAmount: data.pendingAmount || 0,
            completedCount: data.totalPaidCount || 0,
            completedAmount: data.totalPaidAmount || 0
          },
          formattedOverview: {
            pendingAmount: this.formatAmount(data.pendingAmount || 0),
            approvedAmount: this.formatAmount(data.pendingAmount || 0),
            completedAmount: this.formatAmount(data.totalPaidAmount || 0)
          },
          counts: {
            all: (data.pendingCount || 0) + (data.totalPaidCount || 0),
            pending: 0,  // 待获取
            approved: data.pendingCount || 0,
            completed: data.totalPaidCount || 0
          }
        });
      }
    } catch (error) {
      console.error('加载汇总统计失败:', error);
    }
  },

  /**
   * 加载结算列表（分页）
   */
  async loadSettlements(reset: boolean = false) {
    if (this.data.isLoading) return;

    const page = reset ? 1 : this.data.page;
    const status = this.data.tabStatusMap[this.data.currentTab];
    const keyword = this.data.searchValue.trim();

    this.setData({ isLoading: true });

    try {
      const userInfo = financeIndexApp.globalData.userInfo;
      const res = await wx.cloud.callFunction({
        name: 'settlement-manage',
        data: {
          action: 'list',
          userId: userInfo?._id || '',
          page,
          pageSize: PAGE_SIZE,
          status: status === 'all' ? '' : status,
          keyword
        }
      });

      const result = res.result as any;

      if (result && result.success) {
        const list = result.data?.list || [];

        // 格式化数据
        const formattedList = list.map((s: any) => ({
          ...s,
          statusLabel: STATUS_LABELS[s.status] || '未知',
          statusColor: STATUS_COLORS[s.status] || 'gray',
          formattedAmount: this.formatAmount(s.acquisitionAmount || 0),
          formattedActual: this.formatAmount(s.actualPayment || 0),
          formattedDeduction: this.formatAmount(s.totalDeduction || 0),
          createTimeStr: this.formatDate(s.createTime)
        }));

        this.setData({
          settlements: reset ? formattedList : [...this.data.settlements, ...formattedList],
          page: page + 1,
          total: result.data?.total || 0,
          hasMore: formattedList.length >= PAGE_SIZE,
          isLoading: false
        });
      } else {
        throw new Error(result?.message || '获取数据失败');
      }
    } catch (error: any) {
      console.error('加载结算列表失败:', error);
      this.setData({ isLoading: false });

      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 格式化金额
   */
  formatAmount(amount: number): string {
    if (!amount || amount === 0) return '0';
    if (amount >= 100000000) {
      return (amount / 100000000).toFixed(2) + '亿';
    } else if (amount >= 10000) {
      return (amount / 10000).toFixed(2) + '万';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + '千';
    }
    return amount.toFixed(2);
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr: string | Date): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  },

  /**
   * Tab切换
   */
  onTabChange(e: WechatMiniprogram.TouchEvent) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    if (tab === this.data.currentTab) return;

    this.setData({
      currentTab: tab,
      settlements: [],
      page: 1,
      hasMore: true
    });
    this.loadSettlements(true);
  },

  /**
   * 搜索输入
   */
  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchValue: e.detail.value });
  },

  /**
   * 搜索确认
   */
  onSearchConfirm() {
    this.setData({
      settlements: [],
      page: 1,
      hasMore: true
    });
    this.loadSettlements(true);
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    this.setData({
      searchValue: '',
      settlements: [],
      page: 1,
      hasMore: true
    });
    this.loadSettlements(true);
  },

  /**
   * 查看结算详情
   */
  onSettlementTap(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/finance/detail/index?id=${id}`
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadOverview();
    this.loadSettlements(true);
    wx.stopPullDownRefresh();
  },

  /**
   * 触底加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadSettlements(false);
    }
  },

  /**
   * 跳转到结算报表
   */
  goToReport() {
    wx.navigateTo({
      url: '/pages/finance/report/index'
    });
  }
});
