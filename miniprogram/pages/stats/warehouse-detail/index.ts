/**
 * 仓库详情页面
 * @description 显示单个仓库的收苗明细记录
 */

import { MOCK_FARMERS, MOCK_SALESMAN_STATS } from '../../../models/mock-data';

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
  return '¥' + amount.toFixed(2);
}

// 仓库配置数据（含容量信息）
// 大仓库：一号、二号、三号（容量200吨）- 用于长期存储和调度汇总
// 中仓库：四号、五号、六号（容量150吨）- 常规收苗点
// 小仓库：七号、八号、九号、十号（容量100吨）- 临时收苗点，满仓后需调度到大仓库
interface WarehouseConfig {
  name: string;
  type: 'large' | 'medium' | 'small';  // 仓库类型
  capacity: number;                     // 最大容量（kg）
  currentStock: number;                 // 当前库存（kg）
  baseFarmerCount: number;              // 累计交苗农户数
}

const WAREHOUSE_CONFIG: Record<string, WarehouseConfig> = {
  'wh1': { name: '一号仓库', type: 'large', capacity: 200000, currentStock: 142000, baseFarmerCount: 820 },
  'wh2': { name: '二号仓库', type: 'large', capacity: 200000, currentStock: 128000, baseFarmerCount: 750 },
  'wh3': { name: '三号仓库', type: 'large', capacity: 200000, currentStock: 118000, baseFarmerCount: 680 },
  'wh4': { name: '四号仓库', type: 'medium', capacity: 150000, currentStock: 108000, baseFarmerCount: 620 },
  'wh5': { name: '五号仓库', type: 'medium', capacity: 150000, currentStock: 98000, baseFarmerCount: 560 },
  'wh6': { name: '六号仓库', type: 'medium', capacity: 150000, currentStock: 92000, baseFarmerCount: 520 },
  'wh7': { name: '七号仓库', type: 'small', capacity: 100000, currentStock: 88000, baseFarmerCount: 480 },
  'wh8': { name: '八号仓库', type: 'small', capacity: 100000, currentStock: 82000, baseFarmerCount: 450 },
  'wh9': { name: '九号仓库', type: 'small', capacity: 100000, currentStock: 78000, baseFarmerCount: 420 },
  'wh10': { name: '十号仓库', type: 'small', capacity: 100000, currentStock: 76000, baseFarmerCount: 380 }
};

// 仓库类型名称映射
const WAREHOUSE_TYPE_NAMES: Record<string, string> = {
  'large': '大型仓库',
  'medium': '中型仓库',
  'small': '小型仓库'
};

// 生成收苗记录
function generateAcquisitionRecords(warehouseId: string, count: number, isToday: boolean = false) {
  const operators = MOCK_SALESMAN_STATS.slice(0, 5);
  const records = [];
  const avgPrice = 7; // 7元/kg
  
  for (let i = 0; i < count; i++) {
    const farmer = MOCK_FARMERS[i % MOCK_FARMERS.length];
    const operator = operators[i % operators.length];
    const weight = Math.floor(Math.random() * 80) + 20; // 20-100kg
    const price = avgPrice;
    const amount = weight * price;
    
    // 随机付款状态
    const rand = Math.random();
    let paymentStatus = 'unpaid';
    let paymentStatusText = '待付款';
    
    if (rand < 0.7) {
      paymentStatus = 'paid';
      paymentStatusText = '已付款';
    } else if (rand < 0.85) {
      paymentStatus = 'partial';
      paymentStatusText = '部分付款';
    }
    
    // 生成日期和时间
    const month = isToday ? 12 : Math.floor(Math.random() * 12) + 1;
    const day = isToday ? 10 : Math.floor(Math.random() * 28) + 1;
    const hour = Math.floor(Math.random() * 10) + 7; // 7:00-17:00
    const minute = Math.floor(Math.random() * 60);
    
    records.push({
      id: `acq_${warehouseId}_${i + 1}`,
      farmerId: farmer.id,
      farmerName: farmer.name,
      phone: farmer.phone,
      warehouseId,
      weight,
      price,
      amount,
      paymentStatus,
      paymentStatusText,
      date: `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      operator: operator.salesmanName,
      operatorId: operator.salesmanId
    });
  }
  
  // 按日期倒序排列
  return records.sort((a, b) => {
    const dateA = a.date + a.time;
    const dateB = b.date + b.time;
    return dateB.localeCompare(dateA);
  });
}

Page({
  data: {
    // 仓库信息
    warehouseId: '',
    warehouseName: '',
    warehouseType: '',      // 仓库类型（大/中/小）
    updateTime: '',
    // 容量信息
    capacityInfo: {
      capacity: '0',        // 最大容量
      currentStock: '0',    // 当前库存
      available: '0',       // 剩余容量
      usagePercent: 0,      // 使用率百分比
      status: 'normal'      // 状态：normal/warning/full
    },
    // 当前Tab（0:今日, 1:累计）
    currentTab: 0,
    // 搜索关键词
    searchKeyword: '',
    // 汇总数据（仅显示收购相关：总重量、总金额、单价、农户数）
    summary: {
      totalWeight: '0',     // 收购总重量（公斤）
      totalAmount: '0',     // 总金额
      avgPrice: '0',        // 单价（元/kg）
      farmerCount: '0'      // 交苗农户数
    },
    // 所有记录
    allRecords: [] as any[],
    // 筛选后的列表
    filteredList: [] as any[],
    // 当前显示的列表（分页）
    displayList: [] as any[],
    // 分页
    pageSize: 20,
    hasMore: false,
    loading: false
  },

  onLoad(options: any) {
    const warehouseId = options.id || 'wh1';
    const config = WAREHOUSE_CONFIG[warehouseId] || WAREHOUSE_CONFIG['wh1'];
    
    // 计算容量使用情况
    const usagePercent = Math.round((config.currentStock / config.capacity) * 100);
    const available = config.capacity - config.currentStock;
    
    // 判断状态：>=90% 为满仓预警，>=95% 为接近满仓
    let status = 'normal';
    if (usagePercent >= 95) {
      status = 'full';
    } else if (usagePercent >= 80) {
      status = 'warning';
    }
    
    this.setData({
      warehouseId,
      warehouseName: config.name,
      warehouseType: WAREHOUSE_TYPE_NAMES[config.type],
      capacityInfo: {
        capacity: formatWeight(config.capacity),
        currentStock: formatWeight(config.currentStock),
        available: formatWeight(available),
        usagePercent,
        status
      }
    });
    
    this.setUpdateTime();
    this.generateData();
    this.loadData();
  },

  // 设置更新时间
  setUpdateTime() {
    const now = new Date();
    const time = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.setData({ updateTime: time });
  },

  // 生成Mock数据
  generateData() {
    const { warehouseId } = this.data;
    const config = WAREHOUSE_CONFIG[warehouseId] || WAREHOUSE_CONFIG['wh1'];
    
    // 生成今日和累计记录
    const todayRecords = generateAcquisitionRecords(warehouseId, 35, true);
    const totalRecords = generateAcquisitionRecords(warehouseId, config.baseFarmerCount, false);
    
    // 存储所有记录
    (this as any)._todayRecords = todayRecords;
    (this as any)._totalRecords = totalRecords;
  },

  // 加载数据
  loadData() {
    const { currentTab, warehouseId } = this.data;
    const config = WAREHOUSE_CONFIG[warehouseId] || WAREHOUSE_CONFIG['wh1'];
    
    // 获取记录
    const records = currentTab === 0 
      ? ((this as any)._todayRecords || [])
      : ((this as any)._totalRecords || []);
    
    // 计算汇总数据（仅收购相关：总重量、总金额、单价、农户数）
    const totalWeight = records.reduce((sum: number, r: any) => sum + r.weight, 0);
    const totalAmount = records.reduce((sum: number, r: any) => sum + r.amount, 0);
    
    // 格式化汇总（甲方要求显示公斤、单价）
    const weightKg = currentTab === 0 ? totalWeight : config.currentStock;
    const amountValue = currentTab === 0 ? totalAmount : config.currentStock * 7;
    const avgPrice = weightKg > 0 ? (amountValue / weightKg).toFixed(0) : '7';
    
    const summary = {
      totalWeight: weightKg + 'kg',                      // 收购总重量（公斤）
      totalAmount: formatAmount(amountValue),            // 总金额
      avgPrice: avgPrice + '元/kg',                      // 单价 = 总金额/总重量
      farmerCount: (currentTab === 0 ? records.length : config.baseFarmerCount) + '户'
    };
    
    this.setData({ 
      summary,
      allRecords: records
    });
    
    this.filterAndDisplayList();
  },

  // 筛选并显示列表
  filterAndDisplayList() {
    const { searchKeyword, allRecords } = this.data;
    
    // 搜索过滤
    let list = allRecords;
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      list = list.filter((r: any) => 
        r.farmerName.toLowerCase().includes(keyword) || 
        r.phone.includes(keyword)
      );
    }
    
    // 分页
    const pageSize = this.data.pageSize;
    const displayList = list.slice(0, pageSize);
    const hasMore = list.length > pageSize;
    
    this.setData({
      filteredList: list,
      displayList,
      hasMore
    });
  },

  // 切换Tab
  switchTab(e: any) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ 
      currentTab: tab,
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
    this.filterAndDisplayList();
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
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
  }
});

