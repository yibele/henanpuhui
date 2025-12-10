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
  SeedDistributionStats,
  FarmerSummaryStats,
  SalesmanFarmerStats,
  SettlementSummaryStats
} from './types';
import { UserRole } from './types';

// ==================== 用户数据 ====================

/** 业务员用户（默认测试账号） */
export const MOCK_USER_SALESMAN: User = {
  id: 'user_salesman_001',
  phone: '13800138001',
  name: '业务员小王',
  role: UserRole.SALESMAN,
  avatar: '',
  createTime: '2023-01-01'
};

/** 仓库管理员用户 */
export const MOCK_USER_WAREHOUSE: User = {
  id: 'user_warehouse_001',
  phone: '13800138002',
  name: '仓管老李',
  role: UserRole.WAREHOUSE_MANAGER,
  avatar: '',
  createTime: '2023-01-01'
};

/** 财务/管理层用户 */
export const MOCK_USER_FINANCE: User = {
  id: 'user_finance_001',
  phone: '13800138003',
  name: '财务张姐',
  role: UserRole.FINANCE_ADMIN,
  avatar: '',
  createTime: '2023-01-01'
};

/** 所有测试用户列表 */
export const MOCK_USERS: User[] = [
  MOCK_USER_SALESMAN,
  MOCK_USER_WAREHOUSE,
  MOCK_USER_FINANCE
];

/** 根据手机号获取用户 */
export function getMockUserByPhone(phone: string): User | null {
  // 手机号后缀映射到不同角色
  if (phone.endsWith('1') || phone.endsWith('4') || phone.endsWith('7')) {
    return { ...MOCK_USER_SALESMAN, phone };
  }
  if (phone.endsWith('2') || phone.endsWith('5') || phone.endsWith('8')) {
    return { ...MOCK_USER_WAREHOUSE, phone };
  }
  if (phone.endsWith('3') || phone.endsWith('6') || phone.endsWith('9') || phone.endsWith('0')) {
    return { ...MOCK_USER_FINANCE, phone };
  }
  return MOCK_USER_SALESMAN;
}

/** 兼容旧代码的默认用户（使用财务管理员，拥有最多权限） */
export const MOCK_USER: User = MOCK_USER_FINANCE;

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
    pricePerKg: 12,
    totalAmount: 600,
    paidAmount: 600,
    unpaidAmount: 0,
    date: '2024-12-09',
    distributor: '业务员小王',
    distributorId: 'S001'
  },
  {
    id: '102',
    farmerId: '2',
    farmerName: '李四',
    seedType: '玉米B号',
    quantity: 20,
    pricePerKg: 8,
    totalAmount: 160,
    paidAmount: 100,
    unpaidAmount: 60,
    date: '2024-12-09',
    distributor: '业务员小王',
    distributorId: 'S001'
  },
  {
    id: '103',
    farmerId: '3',
    farmerName: '王五',
    seedType: '优质稻谷A',
    quantity: 60,
    pricePerKg: 12,
    totalAmount: 720,
    paidAmount: 720,
    unpaidAmount: 0,
    date: '2024-12-08',
    distributor: '业务员小王',
    distributorId: 'S001'
  },
  {
    id: '104',
    farmerId: '5',
    farmerName: '钱七',
    seedType: '土豆C系',
    quantity: 35,
    pricePerKg: 15,
    totalAmount: 525,
    paidAmount: 300,
    unpaidAmount: 225,
    date: '2024-12-08',
    distributor: '业务员小李',
    distributorId: 'S002'
  },
  {
    id: '105',
    farmerId: '4',
    farmerName: '赵六',
    seedType: '玉米B号',
    quantity: 25,
    pricePerKg: 8,
    totalAmount: 200,
    paidAmount: 0,
    unpaidAmount: 200,
    date: '2024-11-20',
    distributor: '业务员小李',
    distributorId: 'S002'
  },
  {
    id: '106',
    farmerId: '6',
    farmerName: '孙八',
    seedType: '油菜籽D型',
    quantity: 18,
    pricePerKg: 20,
    totalAmount: 360,
    paidAmount: 360,
    unpaidAmount: 0,
    date: '2024-10-15',
    distributor: '业务员小李',
    distributorId: 'S002'
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

// ==================== 财务/管理层统计数据 ====================

/** 签约农户汇总统计 */
/** 全季度签约农户汇总 */
export const MOCK_FARMER_SUMMARY: FarmerSummaryStats = {
  totalFarmers: 7000,
  totalAcreage: 85600,
  totalDeposit: 28560000,
  gradeDistribution: {
    gold: 1260,
    silver: 2940,
    bronze: 2800,
    goldPercent: 18,
    silverPercent: 42,
    bronzePercent: 40
  }
};

/** 昨日新增签约农户汇总 */
export const MOCK_FARMER_SUMMARY_YESTERDAY: FarmerSummaryStats = {
  totalFarmers: 28,
  totalAcreage: 356,
  totalDeposit: 118000,
  gradeDistribution: {
    gold: 5,
    silver: 12,
    bronze: 11,
    goldPercent: 18,
    silverPercent: 43,
    bronzePercent: 39
  }
};

/** 按负责人统计的签约数据（20个业务员） */
export const MOCK_SALESMAN_STATS: SalesmanFarmerStats[] = [
  { salesmanId: 'S001', salesmanName: '王建国', farmerCount: 520, totalAcreage: 6240, totalDeposit: 2080000, gradeDistribution: { gold: 94, silver: 218, bronze: 208, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S002', salesmanName: '李明辉', farmerCount: 485, totalAcreage: 5820, totalDeposit: 1940000, gradeDistribution: { gold: 87, silver: 204, bronze: 194, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S003', salesmanName: '张伟东', farmerCount: 456, totalAcreage: 5472, totalDeposit: 1824000, gradeDistribution: { gold: 82, silver: 191, bronze: 183, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S004', salesmanName: '刘志强', farmerCount: 428, totalAcreage: 5136, totalDeposit: 1712000, gradeDistribution: { gold: 77, silver: 180, bronze: 171, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S005', salesmanName: '陈晓峰', farmerCount: 412, totalAcreage: 4944, totalDeposit: 1648000, gradeDistribution: { gold: 74, silver: 173, bronze: 165, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S006', salesmanName: '杨志军', farmerCount: 398, totalAcreage: 4776, totalDeposit: 1592000, gradeDistribution: { gold: 72, silver: 167, bronze: 159, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S007', salesmanName: '周文斌', farmerCount: 385, totalAcreage: 4620, totalDeposit: 1540000, gradeDistribution: { gold: 69, silver: 162, bronze: 154, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S008', salesmanName: '吴海涛', farmerCount: 372, totalAcreage: 4464, totalDeposit: 1488000, gradeDistribution: { gold: 67, silver: 156, bronze: 149, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S009', salesmanName: '郑国华', farmerCount: 358, totalAcreage: 4296, totalDeposit: 1432000, gradeDistribution: { gold: 64, silver: 150, bronze: 144, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S010', salesmanName: '黄德才', farmerCount: 345, totalAcreage: 4140, totalDeposit: 1380000, gradeDistribution: { gold: 62, silver: 145, bronze: 138, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S011', salesmanName: '赵立民', farmerCount: 332, totalAcreage: 3984, totalDeposit: 1328000, gradeDistribution: { gold: 60, silver: 139, bronze: 133, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S012', salesmanName: '孙宏伟', farmerCount: 318, totalAcreage: 3816, totalDeposit: 1272000, gradeDistribution: { gold: 57, silver: 134, bronze: 127, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S013', salesmanName: '马俊杰', farmerCount: 305, totalAcreage: 3660, totalDeposit: 1220000, gradeDistribution: { gold: 55, silver: 128, bronze: 122, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S014', salesmanName: '朱永康', farmerCount: 292, totalAcreage: 3504, totalDeposit: 1168000, gradeDistribution: { gold: 53, silver: 123, bronze: 116, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S015', salesmanName: '胡建军', farmerCount: 278, totalAcreage: 3336, totalDeposit: 1112000, gradeDistribution: { gold: 50, silver: 117, bronze: 111, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S016', salesmanName: '林国栋', farmerCount: 265, totalAcreage: 3180, totalDeposit: 1060000, gradeDistribution: { gold: 48, silver: 111, bronze: 106, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S017', salesmanName: '何志勇', farmerCount: 252, totalAcreage: 3024, totalDeposit: 1008000, gradeDistribution: { gold: 45, silver: 106, bronze: 101, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S018', salesmanName: '罗文华', farmerCount: 238, totalAcreage: 2856, totalDeposit: 952000, gradeDistribution: { gold: 43, silver: 100, bronze: 95, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S019', salesmanName: '郭振兴', farmerCount: 225, totalAcreage: 2700, totalDeposit: 900000, gradeDistribution: { gold: 41, silver: 95, bronze: 89, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } },
  { salesmanId: 'S020', salesmanName: '曹德明', farmerCount: 236, totalAcreage: 2832, totalDeposit: 944000, gradeDistribution: { gold: 42, silver: 99, bronze: 95, goldPercent: 18, silverPercent: 42, bronzePercent: 40 } }
];

/** 昨日新增 - 按负责人统计（20个业务员） */
export const MOCK_SALESMAN_STATS_YESTERDAY: SalesmanFarmerStats[] = [
  { salesmanId: 'S001', salesmanName: '王建国', farmerCount: 3, totalAcreage: 38, totalDeposit: 12000, gradeDistribution: { gold: 1, silver: 1, bronze: 1, goldPercent: 33, silverPercent: 33, bronzePercent: 34 } },
  { salesmanId: 'S002', salesmanName: '李明辉', farmerCount: 2, totalAcreage: 26, totalDeposit: 8000, gradeDistribution: { gold: 0, silver: 1, bronze: 1, goldPercent: 0, silverPercent: 50, bronzePercent: 50 } },
  { salesmanId: 'S003', salesmanName: '张伟东', farmerCount: 2, totalAcreage: 24, totalDeposit: 8000, gradeDistribution: { gold: 1, silver: 1, bronze: 0, goldPercent: 50, silverPercent: 50, bronzePercent: 0 } },
  { salesmanId: 'S004', salesmanName: '刘志强', farmerCount: 2, totalAcreage: 22, totalDeposit: 8000, gradeDistribution: { gold: 0, silver: 1, bronze: 1, goldPercent: 0, silverPercent: 50, bronzePercent: 50 } },
  { salesmanId: 'S005', salesmanName: '陈晓峰', farmerCount: 2, totalAcreage: 20, totalDeposit: 8000, gradeDistribution: { gold: 1, silver: 0, bronze: 1, goldPercent: 50, silverPercent: 0, bronzePercent: 50 } },
  { salesmanId: 'S006', salesmanName: '杨志军', farmerCount: 1, totalAcreage: 18, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 1, bronze: 0, goldPercent: 0, silverPercent: 100, bronzePercent: 0 } },
  { salesmanId: 'S007', salesmanName: '周文斌', farmerCount: 2, totalAcreage: 16, totalDeposit: 8000, gradeDistribution: { gold: 0, silver: 1, bronze: 1, goldPercent: 0, silverPercent: 50, bronzePercent: 50 } },
  { salesmanId: 'S008', salesmanName: '吴海涛', farmerCount: 1, totalAcreage: 14, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 0, bronze: 1, goldPercent: 0, silverPercent: 0, bronzePercent: 100 } },
  { salesmanId: 'S009', salesmanName: '郑国华', farmerCount: 2, totalAcreage: 18, totalDeposit: 8000, gradeDistribution: { gold: 1, silver: 1, bronze: 0, goldPercent: 50, silverPercent: 50, bronzePercent: 0 } },
  { salesmanId: 'S010', salesmanName: '黄德才', farmerCount: 1, totalAcreage: 12, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 1, bronze: 0, goldPercent: 0, silverPercent: 100, bronzePercent: 0 } },
  { salesmanId: 'S011', salesmanName: '赵立民', farmerCount: 1, totalAcreage: 14, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 0, bronze: 1, goldPercent: 0, silverPercent: 0, bronzePercent: 100 } },
  { salesmanId: 'S012', salesmanName: '孙宏伟', farmerCount: 1, totalAcreage: 16, totalDeposit: 4000, gradeDistribution: { gold: 1, silver: 0, bronze: 0, goldPercent: 100, silverPercent: 0, bronzePercent: 0 } },
  { salesmanId: 'S013', salesmanName: '马俊杰', farmerCount: 2, totalAcreage: 22, totalDeposit: 8000, gradeDistribution: { gold: 0, silver: 1, bronze: 1, goldPercent: 0, silverPercent: 50, bronzePercent: 50 } },
  { salesmanId: 'S014', salesmanName: '朱永康', farmerCount: 1, totalAcreage: 12, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 1, bronze: 0, goldPercent: 0, silverPercent: 100, bronzePercent: 0 } },
  { salesmanId: 'S015', salesmanName: '胡建军', farmerCount: 1, totalAcreage: 10, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 0, bronze: 1, goldPercent: 0, silverPercent: 0, bronzePercent: 100 } },
  { salesmanId: 'S016', salesmanName: '林国栋', farmerCount: 1, totalAcreage: 14, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 1, bronze: 0, goldPercent: 0, silverPercent: 100, bronzePercent: 0 } },
  { salesmanId: 'S017', salesmanName: '何志勇', farmerCount: 1, totalAcreage: 12, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 0, bronze: 1, goldPercent: 0, silverPercent: 0, bronzePercent: 100 } },
  { salesmanId: 'S018', salesmanName: '罗文华', farmerCount: 1, totalAcreage: 10, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 1, bronze: 0, goldPercent: 0, silverPercent: 100, bronzePercent: 0 } },
  { salesmanId: 'S019', salesmanName: '郭振兴', farmerCount: 0, totalAcreage: 0, totalDeposit: 0, gradeDistribution: { gold: 0, silver: 0, bronze: 0, goldPercent: 0, silverPercent: 0, bronzePercent: 0 } },
  { salesmanId: 'S020', salesmanName: '曹德明', farmerCount: 1, totalAcreage: 18, totalDeposit: 4000, gradeDistribution: { gold: 0, silver: 0, bronze: 1, goldPercent: 0, silverPercent: 0, bronzePercent: 100 } }
];

/** 种苗发放统计 - 昨日数据 */
export const MOCK_SEED_YESTERDAY: SeedDistributionStats = {
  totalQuantity: 8560,
  totalAmount: 102720,
  paidAmount: 95280,
  unpaidAmount: 7440,
  byType: [
    {
      seedType: '甜叶菊',
      quantity: 8560,
      totalAmount: 102720,
      pricePerKg: 12,
      paidAmount: 95280,
      unpaidAmount: 7440
    }
  ],
  distributedFarmerCount: 156,
  totalFarmerCount: 7000,
  distributionPercent: 2.2
};

/** 种苗发放统计 - 年度累计数据 */
export const MOCK_SEED_YEAR_TOTAL: SeedDistributionStats = {
  totalQuantity: 428000,
  totalAmount: 5136000,
  paidAmount: 4365600,
  unpaidAmount: 770400,
  byType: [
    {
      seedType: '甜叶菊',
      quantity: 428000,
      totalAmount: 5136000,
      pricePerKg: 12,
      paidAmount: 4365600,
      unpaidAmount: 770400
    }
  ],
  distributedFarmerCount: 5810,
  totalFarmerCount: 7000,
  distributionPercent: 83
};

/** 结算汇总统计 */
export const MOCK_SETTLEMENT_SUMMARY: SettlementSummaryStats = {
  settledFarmerCount: 4280,
  totalPayable: 12560000,
  totalPaid: 9850000,
  totalPending: 2710000,
  pendingFarmerCount: 1530
};

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

