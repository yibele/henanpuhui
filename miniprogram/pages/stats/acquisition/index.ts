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

// 仓库容量配置（与仓库详情页保持一致）
// 大仓库：一号、二号、三号（容量200吨）
// 中仓库：四号、五号、六号（容量150吨）
// 小仓库：七号、八号、九号、十号（容量100吨）
const WAREHOUSE_CAPACITY: Record<string, { type: string; capacity: number }> = {
  'wh1': { type: '大', capacity: 200000 },
  'wh2': { type: '大', capacity: 200000 },
  'wh3': { type: '大', capacity: 200000 },
  'wh4': { type: '中', capacity: 150000 },
  'wh5': { type: '中', capacity: 150000 },
  'wh6': { type: '中', capacity: 150000 },
  'wh7': { type: '小', capacity: 100000 },
  'wh8': { type: '小', capacity: 100000 },
  'wh9': { type: '小', capacity: 100000 },
  'wh10': { type: '小', capacity: 100000 }
};

// Mock 数据 - 今日收苗
const MOCK_TODAY = {
  totalWeight: 15800,      // 15.8吨
  totalAmount: 110600,     // 11.06万
  avgPrice: 7,             // 7元/kg
  farmerCount: 0,          // 今日不显示
  warehouses: [
    { warehouseId: 'wh1', warehouseName: '一号仓库', weight: 2100, amount: 14700, avgPrice: 7, currentStock: 142000 },
    { warehouseId: 'wh2', warehouseName: '二号仓库', weight: 1850, amount: 12950, avgPrice: 7, currentStock: 128000 },
    { warehouseId: 'wh3', warehouseName: '三号仓库', weight: 1720, amount: 12040, avgPrice: 7, currentStock: 118000 },
    { warehouseId: 'wh4', warehouseName: '四号仓库', weight: 1580, amount: 11060, avgPrice: 7, currentStock: 108000 },
    { warehouseId: 'wh5', warehouseName: '五号仓库', weight: 1450, amount: 10150, avgPrice: 7, currentStock: 98000 },
    { warehouseId: 'wh6', warehouseName: '六号仓库', weight: 1380, amount: 9660, avgPrice: 7, currentStock: 92000 },
    { warehouseId: 'wh7', warehouseName: '七号仓库', weight: 1250, amount: 8750, avgPrice: 7, currentStock: 88000 },
    { warehouseId: 'wh8', warehouseName: '八号仓库', weight: 1170, amount: 8190, avgPrice: 7, currentStock: 82000 },
    { warehouseId: 'wh9', warehouseName: '九号仓库', weight: 1680, amount: 11760, avgPrice: 7, currentStock: 78000 },
    { warehouseId: 'wh10', warehouseName: '十号仓库', weight: 1620, amount: 11340, avgPrice: 7, currentStock: 76000 }
  ]
};

// Mock 数据 - 累计收苗
const MOCK_TOTAL = {
  totalWeight: 1010000,    // 1010吨
  totalAmount: 7070000,    // 707万
  avgPrice: 7,             // 7元/kg
  farmerCount: 5680,       // 5680户农户
  warehouses: [
    { warehouseId: 'wh1', warehouseName: '一号仓库', weight: 142000, amount: 994000, avgPrice: 7, currentStock: 142000 },
    { warehouseId: 'wh2', warehouseName: '二号仓库', weight: 128000, amount: 896000, avgPrice: 7, currentStock: 128000 },
    { warehouseId: 'wh3', warehouseName: '三号仓库', weight: 118000, amount: 826000, avgPrice: 7, currentStock: 118000 },
    { warehouseId: 'wh4', warehouseName: '四号仓库', weight: 108000, amount: 756000, avgPrice: 7, currentStock: 108000 },
    { warehouseId: 'wh5', warehouseName: '五号仓库', weight: 98000, amount: 686000, avgPrice: 7, currentStock: 98000 },
    { warehouseId: 'wh6', warehouseName: '六号仓库', weight: 92000, amount: 644000, avgPrice: 7, currentStock: 92000 },
    { warehouseId: 'wh7', warehouseName: '七号仓库', weight: 88000, amount: 616000, avgPrice: 7, currentStock: 88000 },
    { warehouseId: 'wh8', warehouseName: '八号仓库', weight: 82000, amount: 574000, avgPrice: 7, currentStock: 82000 },
    { warehouseId: 'wh9', warehouseName: '九号仓库', weight: 78000, amount: 546000, avgPrice: 7, currentStock: 78000 },
    { warehouseId: 'wh10', warehouseName: '十号仓库', weight: 76000, amount: 532000, avgPrice: 7, currentStock: 76000 }
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

    // 格式化核心指标（甲方要求重量显示公斤）
    const currentStats = {
      totalWeight: rawData.totalWeight + 'kg',           // 总重量（公斤）
      totalAmount: formatAmount(rawData.totalAmount),    // 总金额
      avgPrice: rawData.avgPrice + '元/kg',              // 单价 = 总金额/总重量
      farmerCount: rawData.farmerCount + '户'            // 农户数
    };

    // 计算总重量用于百分比
    const totalWeight = rawData.warehouses.reduce((sum, w) => sum + w.weight, 0);

    // 格式化仓库数据（含容量信息）
    const warehouseStats = rawData.warehouses.map(w => {
      const capacityConfig = WAREHOUSE_CAPACITY[w.warehouseId];
      const usagePercent = Math.round((w.currentStock / capacityConfig.capacity) * 100);
      // 判断容量状态：>=80% 预警，>=95% 满仓
      let capacityStatus = 'normal';
      if (usagePercent >= 95) {
        capacityStatus = 'full';
      } else if (usagePercent >= 80) {
        capacityStatus = 'warning';
      }
      
      return {
        ...w,
        weightKg: w.weight,                              // 公斤数（甲方要求显示公斤）
        formatWeight: formatWeight(w.weight),            // 格式化重量（吨/kg）
        formatAmount: formatAmount(w.amount),            // 格式化金额
        percent: Math.round((w.weight / totalWeight) * 100),
        // 容量相关字段
        warehouseType: capacityConfig.type,
        capacity: capacityConfig.capacity,
        formatCapacity: formatWeight(capacityConfig.capacity),
        formatCurrentStock: formatWeight(w.currentStock),
        usagePercent,
        capacityStatus
      };
    });

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
  },

  // 跳转到仓库详情页
  goWarehouseDetail(e: any) {
    const warehouseId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/stats/warehouse-detail/index?id=${warehouseId}`
    });
  }
});

