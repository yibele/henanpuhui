/**
 * Mock 数据
 * @description 用于开发阶段的模拟数据
 */

import type {
  User,
  Farmer,
  SeedRecord,
  PlantingGuidance,
  Acquisition,
  InventoryItem,
  Settlement,
  DashboardStats,
  TrendDataPoint,
  ChatMessage,
  UserRole
} from './types';

// ==================== 用户数据 ====================

export const MOCK_USER: User = {
  id: 'user_001',
  phone: '13800138000',
  name: '管理员',
  role: 'ADMIN' as UserRole,
  avatar: '',
  createTime: '2023-01-01'
};

// ==================== 农户数据 ====================

export const MOCK_FARMERS: Farmer[] = [
  {
    id: '1',
    customerCode: 'S001-13800138000',
    name: '张三',
    phone: '13800138000',
    idCard: '510100197001011234',
    address: {
      county: '新都区',
      township: '石板滩',
      town: '石板滩镇',
      village: '幸福村3组'
    },
    addressText: '新都区石板滩石板滩镇幸福村3组',
    acreage: 15.5,
    grade: 'gold',
    deposit: 5000,
    manager: '张三',
    contractDate: '2023-01-15',
    status: 'active',
    salesmanId: 'S001',
    salesmanName: '业务员小王',
    createTime: '2023-01-15'
  },
  {
    id: '2',
    customerCode: 'S001-13900139000',
    name: '李四',
    phone: '13900139000',
    idCard: '510100198205056789',
    address: {
      county: '新都区',
      township: '石板滩',
      town: '石板滩镇',
      village: '幸福村5组'
    },
    addressText: '新都区石板滩石板滩镇幸福村5组',
    acreage: 8.2,
    grade: 'silver',
    deposit: 2000,
    manager: '李四',
    contractDate: '2023-02-10',
    status: 'active',
    salesmanId: 'S001',
    salesmanName: '业务员小王',
    createTime: '2023-02-10'
  },
  {
    id: '3',
    customerCode: 'S001-13700137000',
    name: '王五',
    phone: '13700137000',
    idCard: '510100197809091122',
    address: {
      county: '新都区',
      township: '新繁',
      town: '新繁镇',
      village: '向阳村1组'
    },
    addressText: '新都区新繁新繁镇向阳村1组',
    acreage: 20.0,
    grade: 'gold',
    deposit: 8000,
    manager: '王五',
    contractDate: '2023-03-05',
    status: 'active',
    salesmanId: 'S001',
    salesmanName: '业务员小王',
    createTime: '2023-03-05'
  },
  {
    id: '4',
    customerCode: 'S002-13600136000',
    name: '赵六',
    phone: '13600136000',
    idCard: '510100198512121234',
    address: {
      county: '新都区',
      township: '新繁',
      town: '新繁镇',
      village: '向阳村2组'
    },
    addressText: '新都区新繁新繁镇向阳村2组',
    acreage: 5.0,
    grade: 'bronze',
    deposit: 1000,
    manager: '赵六',
    contractDate: '2023-03-12',
    status: 'pending',
    salesmanId: 'S002',
    salesmanName: '业务员小李',
    createTime: '2023-03-12'
  },
  {
    id: '5',
    customerCode: 'S002-13500135000',
    name: '钱七',
    phone: '13500135000',
    idCard: '510100199001011234',
    address: {
      county: '新都区',
      township: '大丰',
      town: '大丰街道',
      village: '光明村4组'
    },
    addressText: '新都区大丰大丰街道光明村4组',
    acreage: 12.3,
    grade: 'silver',
    deposit: 3000,
    manager: '钱七',
    contractDate: '2023-04-01',
    status: 'active',
    salesmanId: 'S002',
    salesmanName: '业务员小李',
    createTime: '2023-04-01'
  },
  {
    id: '6',
    customerCode: 'S002-13400134000',
    name: '孙八',
    phone: '13400134000',
    idCard: '510100198808081234',
    address: {
      county: '新都区',
      township: '大丰',
      town: '大丰街道',
      village: '光明村6组'
    },
    addressText: '新都区大丰大丰街道光明村6组',
    acreage: 6.8,
    grade: 'bronze',
    deposit: 500,
    manager: '孙八',
    contractDate: '2023-04-15',
    status: 'inactive',
    salesmanId: 'S002',
    salesmanName: '业务员小李',
    createTime: '2023-04-15'
  }
];

// ==================== 种苗发放数据 ====================

export const MOCK_SEED_RECORDS: SeedRecord[] = [
  {
    id: '101',
    farmerId: '1',
    farmerName: '张三',
    seedType: '优质稻谷A',
    quantity: 50,
    date: '2023-04-01',
    distributor: '管理员'
  },
  {
    id: '102',
    farmerId: '2',
    farmerName: '李四',
    seedType: '玉米B号',
    quantity: 20,
    date: '2023-04-02',
    distributor: '管理员'
  },
  {
    id: '103',
    farmerId: '3',
    farmerName: '王五',
    seedType: '优质稻谷A',
    quantity: 60,
    date: '2023-04-05',
    distributor: '管理员'
  },
  {
    id: '104',
    farmerId: '5',
    farmerName: '钱七',
    seedType: '土豆C系',
    quantity: 35,
    date: '2023-04-10',
    distributor: '管理员'
  }
];

// ==================== 种植指导数据 ====================

export const MOCK_GUIDANCE_RECORDS: PlantingGuidance[] = [
  {
    id: '201',
    farmerId: '1',
    farmerName: '张三',
    guidanceType: 'fertilizer',
    notes: '建议每亩施用尿素20kg，注意避开雨天。土壤湿度适中时效果最佳。',
    date: '2023-05-15',
    technician: '管理员'
  },
  {
    id: '202',
    farmerId: '3',
    farmerName: '王五',
    guidanceType: 'pesticide',
    notes: '发现早期稻飞虱，建议喷洒吡虫啉，注意防护措施，避免中午高温时段作业。',
    date: '2023-06-20',
    technician: '管理员'
  },
  {
    id: '203',
    farmerId: '2',
    farmerName: '李四',
    guidanceType: 'technical',
    notes: '玉米生长期管理：注意合理密植，每亩4000-4500株为宜，及时除草松土。',
    date: '2023-06-25',
    technician: '管理员'
  },
  {
    id: '204',
    farmerId: '5',
    farmerName: '钱七',
    guidanceType: 'fertilizer',
    notes: '土豆培土追肥建议：结合培土施用复合肥，每亩30kg，促进薯块膨大。',
    date: '2023-07-01',
    technician: '管理员'
  }
];

// ==================== 收购数据 ====================

export const MOCK_ACQUISITIONS: Acquisition[] = [
  {
    id: '301',
    farmerId: '1',
    farmerName: '张三',
    productType: '成熟稻谷',
    quantity: 5000,
    pricePerKg: 2.4,
    totalAmount: 12000,
    date: '2023-10-20',
    status: 'settled'
  },
  {
    id: '302',
    farmerId: '2',
    farmerName: '李四',
    productType: '干玉米',
    quantity: 3000,
    pricePerKg: 2.2,
    totalAmount: 6600,
    date: '2023-10-25',
    status: 'pending'
  },
  {
    id: '303',
    farmerId: '3',
    farmerName: '王五',
    productType: '成熟稻谷',
    quantity: 8000,
    pricePerKg: 2.4,
    totalAmount: 19200,
    date: '2023-10-28',
    status: 'pending'
  },
  {
    id: '304',
    farmerId: '5',
    farmerName: '钱七',
    productType: '油菜籽',
    quantity: 2000,
    pricePerKg: 5.5,
    totalAmount: 11000,
    date: '2023-11-01',
    status: 'pending'
  }
];

// ==================== 库存数据 ====================

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: '501',
    name: '优质稻谷A (种子)',
    category: 'seed',
    quantity: 450,
    unit: 'kg',
    location: '1号库 A区'
  },
  {
    id: '502',
    name: '玉米B号 (种子)',
    category: 'seed',
    quantity: 1180,
    unit: 'kg',
    location: '1号库 B区'
  },
  {
    id: '503',
    name: '土豆C系 (种子)',
    category: 'seed',
    quantity: 860,
    unit: 'kg',
    location: '1号库 C区'
  },
  {
    id: '504',
    name: '复合肥',
    category: 'fertilizer',
    quantity: 300,
    unit: '袋',
    location: '2号库 A区'
  },
  {
    id: '505',
    name: '尿素',
    category: 'fertilizer',
    quantity: 150,
    unit: '袋',
    location: '2号库 B区'
  },
  {
    id: '506',
    name: '收购稻谷 (成品)',
    category: 'crop',
    quantity: 15000,
    unit: 'kg',
    location: '3号粮仓'
  },
  {
    id: '507',
    name: '收购玉米 (成品)',
    category: 'crop',
    quantity: 8000,
    unit: 'kg',
    location: '4号粮仓'
  }
];

// ==================== 结算数据 ====================

export const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: '401',
    farmerId: '1',
    farmerName: '张三',
    totalAcquisitionAmount: 12000,
    deductions: 500,
    finalPayment: 11500,
    status: 'paid',
    date: '2023-11-01',
    relatedAcquisitionIds: ['301'],
    paymentTime: '2023-11-02',
    paymentMethod: '银行转账'
  },
  {
    id: '402',
    farmerId: '2',
    farmerName: '李四',
    totalAcquisitionAmount: 6600,
    deductions: 200,
    finalPayment: 6400,
    status: 'unpaid',
    date: '2023-11-05',
    relatedAcquisitionIds: ['302']
  },
  {
    id: '403',
    farmerId: '3',
    farmerName: '王五',
    totalAcquisitionAmount: 19200,
    deductions: 600,
    finalPayment: 18600,
    status: 'unpaid',
    date: '2023-11-08',
    relatedAcquisitionIds: ['303']
  },
  {
    id: '404',
    farmerId: '5',
    farmerName: '钱七',
    totalAcquisitionAmount: 11000,
    deductions: 350,
    finalPayment: 10650,
    status: 'unpaid',
    date: '2023-11-10',
    relatedAcquisitionIds: ['304']
  }
];

// ==================== 统计数据 ====================

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalFarmers: 6,
  activeContracts: 4,
  totalAcquisitions: 18000,
  pendingSettlements: 35650
};

export const MOCK_TREND_DATA: TrendDataPoint[] = [
  { month: '1月', acquisition: 4000, distribution: 240 },
  { month: '2月', acquisition: 3000, distribution: 130 },
  { month: '3月', acquisition: 2000, distribution: 980 },
  { month: '4月', acquisition: 2780, distribution: 390 },
  { month: '5月', acquisition: 1890, distribution: 480 },
  { month: '6月', acquisition: 2390, distribution: 380 }
];

// ==================== AI聊天数据 ====================

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
  {
    id: 'msg_001',
    role: 'assistant',
    content: '您好！我是普惠农户CRM智能助手，可以帮您查询农户信息、业务数据等。请问有什么可以帮您的？',
    timestamp: Date.now() - 60000
  }
];

export const MOCK_AI_SUGGESTIONS: string[] = [
  '查看本月收购汇总',
  '待结算农户有哪些',
  '最近的种植指导记录',
  '库存情况如何'
];

// ==================== 种苗品类选项 ====================

export const SEED_TYPE_OPTIONS = [
  { label: '优质稻谷A (水稻)', value: '优质稻谷A' },
  { label: '玉米B号 (旱地)', value: '玉米B号' },
  { label: '土豆C系 (高产)', value: '土豆C系' },
  { label: '油菜籽D型', value: '油菜籽D型' }
];

// ==================== 收购品类选项 ====================

export const PRODUCT_TYPE_OPTIONS = [
  { label: '成熟稻谷', value: '成熟稻谷' },
  { label: '干玉米', value: '干玉米' },
  { label: '油菜籽', value: '油菜籽' },
  { label: '土豆', value: '土豆' }
];

// ==================== 指导类型选项 ====================

export const GUIDANCE_TYPE_OPTIONS = [
  { label: '施肥指导', value: 'fertilizer' },
  { label: '病虫防治', value: 'pesticide' },
  { label: '技术指导', value: 'technical' },
  { label: '其他', value: 'other' }
];

