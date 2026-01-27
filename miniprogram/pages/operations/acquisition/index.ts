/**
 * 收购记录页面
 * 仓库管理员查看和管理收购记录
 */

const app = getApp<IAppOption>();

type TabKey = 'today' | 'all';

// 格式化日期
function formatYmd(ts: any): string {
  try {
    const d = new Date(ts);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}月${day}日`;
  } catch {
    return '';
  }
}

// 格式化金额显示
function formatAmountDisplay(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2) + '万';
  }
  return amount.toFixed(0);
}

// 格式化重量（去掉多余小数）
function formatWeight(weight: number): string {
  if (weight >= 1000) {
    return weight.toFixed(0);
  }
  return weight.toFixed(1);
}

Page({
  data: {
    currentTab: 'today' as TabKey,
    keyword: '',

    list: [] as any[],
    page: 1,
    pageSize: 20,
    hasMore: false,

    loading: false,
    loadingMore: false,

    summary: {
      totalWeight: '0',
      totalAmountWan: '0',
      count: '0'
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
    this.reload();
  },

  reload() {
    this.setData({ page: 1, list: [] });
    this.loadData(false);
  },

  onPullDownRefresh() {
    this.reload();
    wx.stopPullDownRefresh();
  },

  // Tab 切换（适配 bindtap）
  onTabChange(e: WechatMiniprogram.TouchEvent) {
    const tab = e.currentTarget.dataset.tab as TabKey;
    if (tab === this.data.currentTab) return;

    this.setData({ currentTab: tab, page: 1, list: [] });
    this.loadData(false);
  },

  onKeywordChange(e: any) {
    this.setData({ keyword: e.detail?.value || '' });
  },

  onSearch() {
    this.setData({ page: 1, list: [] });
    this.loadData(false);
  },

  onClear() {
    this.setData({ keyword: '', page: 1, list: [] });
    this.loadData(false);
  },

  async loadData(isLoadMore: boolean) {
    const currentUser = app.globalData.currentUser;
    const userId = currentUser?.id || currentUser?._id;
    if (!userId) {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }

    const { currentTab, keyword, page, pageSize } = this.data;
    const dateRange = currentTab === 'today' ? 'today' : 'all';

    this.setData(isLoadMore ? { loadingMore: true } : { loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'acquisition-manage',
        data: {
          action: 'list',
          userId,
          dateRange,
          keyword,
          page,
          pageSize
        }
      });

      const result = res.result as any;
      if (!result?.success) {
        throw new Error(result?.errMsg || result?.message || '加载失败');
      }

      const rawList = result.data?.list || [];
      const total = result.data?.total || 0;

      // 格式化列表数据
      const mapped = rawList.map((item: any) => {
        const netWeight = Number(item.netWeight || item.weight || 0);
        const amount = Number(item.totalAmount || 0);
        const date = item.acquisitionDate || formatYmd(item.createTime);
        const phone = item.farmerPhone ? item.farmerPhone.slice(-4) : '';
        const subTitle = phone ? `${date} · 尾号${phone}` : date;

        return {
          ...item,
          netWeight: formatWeight(netWeight),
          amountDisplay: formatAmountDisplay(amount),
          amountRaw: amount,
          subTitle
        };
      });

      const newList = isLoadMore ? [...this.data.list, ...mapped] : mapped;
      const hasMore = newList.length < total && mapped.length === pageSize;

      // 计算汇总统计
      let totalWeight = 0;
      let totalAmount = 0;

      if (!isLoadMore) {
        // 使用后端返回的汇总数据（如果有）
        if (result.data?.summary) {
          totalWeight = result.data.summary.totalWeight || 0;
          totalAmount = result.data.summary.totalAmount || 0;
        } else {
          // 否则从列表计算
          newList.forEach((it: any) => {
            totalWeight += parseFloat(it.netWeight) || 0;
            totalAmount += it.amountRaw || 0;
          });
        }
      }

      this.setData({
        list: newList,
        hasMore,
        loading: false,
        loadingMore: false,
        summary: !isLoadMore ? {
          totalWeight: formatWeight(totalWeight),
          totalAmountWan: (totalAmount / 10000).toFixed(2),
          count: String(total)
        } : this.data.summary
      });
    } catch (e: any) {
      this.setData({ loading: false, loadingMore: false });
      wx.showToast({ title: e?.message || '加载失败', icon: 'none' });
    }
  },

  loadMore() {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 });
    this.loadData(true);
  },

  // 点击记录 - 跳转到只读详情页
  onRecordTap(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item;
    const id = item._id || item.acquisitionId;
    if (id) {
      wx.navigateTo({
        url: `/pages/operations/acquisition-detail/index?id=${id}`
      });
    }
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/operations/buy-add/index' });
  }
});
