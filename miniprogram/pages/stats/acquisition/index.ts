/**
 * 收苗统计页面
 * @description 管理层查看收苗数据汇总
 */

// 格式化重量
function formatWeight(weight: number): string {
  if (weight >= 1000) {
    return (weight / 1000).toFixed(2).replace(/\.?0+$/, '') + '吨';
  }
  return weight + 'kg';
}

// 格式化金额
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    return (amount / 10000).toFixed(2).replace(/\.?0+$/, '') + '万';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(2).replace(/\.?0+$/, '') + '千';
  }
  return '¥' + amount;
}

// Mock 数据 - 今日收苗
const MOCK_TODAY = {
  totalWeight: 12500,      // 12.5吨
  totalAmount: 87500,      // 8.75万
  avgPrice: 7,             // 7元/kg
  farmerCount: 0,          // 今日不显示
  warehouses: [
    { warehouseId: 'wh1', warehouseName: '一号仓库', weight: 2100, amount: 14700, avgPrice: 7 },
    { warehouseId: 'wh2', warehouseName: '二号仓库', weight: 1850, amount: 12950, avgPrice: 7 },
    { warehouseId: 'wh3', warehouseName: '三号仓库', weight: 1720, amount: 12040, avgPrice: 7 },
    { warehouseId: 'wh4', warehouseName: '四号仓库', weight: 1580, amount: 11060, avgPrice: 7 },
    { warehouseId: 'wh5', warehouseName: '五号仓库', weight: 1450, amount: 10150, avgPrice: 7 },
    { warehouseId: 'wh6', warehouseName: '六号仓库', weight: 1380, amount: 9660, avgPrice: 7 },
    { warehouseId: 'wh7', warehouseName: '七号仓库', weight: 1250, amount: 8750, avgPrice: 7 },
    { warehouseId: 'wh8', warehouseName: '八号仓库', weight: 1170, amount: 8190, avgPrice: 7 }
  ]
};

// Mock 数据 - 累计收苗
const MOCK_TOTAL = {
  totalWeight: 856000,     // 856吨
  totalAmount: 5992000,    // 599.2万
  avgPrice: 7,             // 7元/kg
  farmerCount: 4850,       // 4850户农户
  warehouses: [
    { warehouseId: 'wh1', warehouseName: '一号仓库', weight: 142000, amount: 994000, avgPrice: 7 },
    { warehouseId: 'wh2', warehouseName: '二号仓库', weight: 128000, amount: 896000, avgPrice: 7 },
    { warehouseId: 'wh3', warehouseName: '三号仓库', weight: 118000, amount: 826000, avgPrice: 7 },
    { warehouseId: 'wh4', warehouseName: '四号仓库', weight: 108000, amount: 756000, avgPrice: 7 },
    { warehouseId: 'wh5', warehouseName: '五号仓库', weight: 98000, amount: 686000, avgPrice: 7 },
    { warehouseId: 'wh6', warehouseName: '六号仓库', weight: 92000, amount: 644000, avgPrice: 7 },
    { warehouseId: 'wh7', warehouseName: '七号仓库', weight: 88000, amount: 616000, avgPrice: 7 },
    { warehouseId: 'wh8', warehouseName: '八号仓库', weight: 82000, amount: 574000, avgPrice: 7 }
  ]
};

// Mock 趋势数据
const MOCK_TREND = [
  { date: '12-04', value: 10.2 },
  { date: '12-05', value: 11.5 },
  { date: '12-06', value: 9.8 },
  { date: '12-07', value: 13.2 },
  { date: '12-08', value: 12.1 },
  { date: '12-09', value: 11.8 },
  { date: '12-10', value: 12.5 }
];

Page({
  data: {
    // 当前Tab（0:今日, 1:累计）
    currentTab: 0,
    // 更新时间
    updateTime: '',
    // 当前显示的统计数据
    currentStats: {
      totalWeight: '0',
      totalAmount: '0',
      avgPrice: '0',
      farmerCount: '0'
    },
    // 仓库统计列表
    warehouseStats: [] as any[],
    // 趋势数据
    trendData: [] as any[]
  },

  onLoad() {
    this.setUpdateTime();
    this.loadData();
  },

  onShow() {
    // 更新 tabbar 选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabBar();
    }
  },

  // 设置更新时间
  setUpdateTime() {
    const now = new Date();
    const time = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({ updateTime: time });
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab });
    this.loadData();
  },

  // 加载数据
  loadData() {
    const { currentTab } = this.data;
    const rawData = currentTab === 0 ? MOCK_TODAY : MOCK_TOTAL;

    // 格式化核心指标
    const currentStats = {
      totalWeight: formatWeight(rawData.totalWeight),
      totalAmount: formatAmount(rawData.totalAmount),
      avgPrice: rawData.avgPrice + '元/kg',
      farmerCount: rawData.farmerCount + '户'
    };

    // 计算总重量用于百分比
    const totalWeight = rawData.warehouses.reduce((sum, w) => sum + w.weight, 0);

    // 格式化仓库数据
    const warehouseStats = rawData.warehouses.map(w => ({
      ...w,
      formatWeight: formatWeight(w.weight),
      formatAmount: formatAmount(w.amount),
      percent: Math.round((w.weight / totalWeight) * 100)
    }));

    // 格式化趋势数据
    const maxValue = Math.max(...MOCK_TREND.map(t => t.value));
    const trendData = MOCK_TREND.map(t => ({
      ...t,
      label: t.date.split('-')[1] + '日',
      heightPercent: Math.round((t.value / maxValue) * 100)
    }));

    this.setData({
      currentStats,
      warehouseStats,
      trendData
    });
  }
});

