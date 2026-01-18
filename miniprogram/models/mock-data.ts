/**
 * Mock 数据 (重构版)
 * @description 用于开发阶段的模拟数据，已修复所有关联关系
 * 
 * ID 规范：
 * - User: USR_XXX (USR_S01~USR_S20 为业务员, USR_W01 为仓管, USR_F01 为财务)
 * - Farmer: FRM_XXX
 * - SeedRecord: SED_XXX
 * - PlantingGuidance: GUD_XXX
 * - Acquisition: ACQ_XXX
 * - Settlement: STL_XXX
 * - InventoryItem: INV_XXX
 * - InventoryLog: LOG_XXX
 */

import type {
  User,
  Farmer,
  SeedRecord,
  PlantingGuidance,
  Acquisition,
  InventoryItem,
  InventoryLog,
  Settlement,
  DashboardStats,
  TrendDataPoint,
  ChatMessage,
  SeedDistributionStats,
  FarmerSummaryStats,
  SalesmanFarmerStats,
  SettlementSummaryStats,
  SettlementOverviewStats,
  SeedTypeStats
} from './types';
import { UserRole, type Warehouse, type WarehouseStats } from './types';

// ==================== 辅助函数 ====================

/** 生成带前缀的ID */
function generateId(prefix: string, num: number, digits: number = 3): string {
  return `${prefix}_${String(num).padStart(digits, '0')}`;
}

// ==================== 用户数据 ====================

/** 业务员用户列表 (20人) */
export const MOCK_SALESMEN: User[] = [
  { id: 'USR_S01', phone: '13800000001', name: '王建国', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S02', phone: '13800000002', name: '李明辉', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S03', phone: '13800000003', name: '张伟东', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S04', phone: '13800000004', name: '刘志强', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S05', phone: '13800000005', name: '陈晓峰', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S06', phone: '13800000006', name: '杨志军', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S07', phone: '13800000007', name: '周文斌', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S08', phone: '13800000008', name: '吴海涛', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S09', phone: '13800000009', name: '郑国华', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S10', phone: '13800000010', name: '黄德才', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S11', phone: '13800000011', name: '赵立民', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S12', phone: '13800000012', name: '孙宏伟', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S13', phone: '13800000013', name: '马俊杰', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S14', phone: '13800000014', name: '朱永康', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S15', phone: '13800000015', name: '胡建军', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S16', phone: '13800000016', name: '林国栋', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S17', phone: '13800000017', name: '何志勇', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S18', phone: '13800000018', name: '罗文华', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S19', phone: '13800000019', name: '郭振兴', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' },
  { id: 'USR_S20', phone: '13800000020', name: '曹德明', role: UserRole.ASSISTANT, avatar: '', createTime: '2024-01-01' }
];

/** 仓库管理员用户 */
export const MOCK_USER_WAREHOUSE: User = {
  id: 'USR_W01',
  phone: '13800000101',
  name: '仓管老李',
  role: UserRole.WAREHOUSE_MANAGER,
  avatar: '',
  createTime: '2024-01-01'
};

/** 财务/管理层用户 */
export const MOCK_USER_FINANCE: User = {
  id: 'USR_F01',
  phone: '13800000102',
  name: '财务张姐',
  role: UserRole.FINANCE_ADMIN,
  avatar: '',
  createTime: '2024-01-01'
};

/** 所有用户列表 */
export const MOCK_USERS: User[] = [
  ...MOCK_SALESMEN,
  MOCK_USER_WAREHOUSE,
  MOCK_USER_FINANCE
];

/** 根据手机号获取用户（登录模拟） */
export function getMockUserByPhone(phone: string): User | null {
  // 手机号后缀映射到不同角色
  const lastDigit = phone.slice(-1);
  if (['1', '4', '7'].includes(lastDigit)) {
    return { ...MOCK_SALESMEN[0], phone };
  }
  if (['2', '5', '8'].includes(lastDigit)) {
    return { ...MOCK_USER_WAREHOUSE, phone };
  }
  return { ...MOCK_USER_FINANCE, phone };
}

/** 兼容旧代码的默认用户 */
export const MOCK_USER: User = MOCK_USER_FINANCE;
export const MOCK_USER_SALESMAN: User = MOCK_SALESMEN[0];

// ==================== 农户数据 ====================

/** 生成农户数据 */
function generateFarmers(): Farmer[] {
  const baseNames = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
    '郑伟', '王芳', '陈明', '刘洋', '杨丽', '黄强', '周婷', '吴军',
    '赵敏', '钱龙', '孙凤', '李华', '王磊', '张静', '刘伟', '陈红',
    '林涛', '何芳', '罗强', '郭明', '高华', '马丽', '梁军', '谢伟',
    '宋婷', '唐龙', '韩凤', '冯华', '董磊', '萧静', '程伟', '曹红',
    '袁涛', '邓芳', '许强', '傅明', '沈华', '曾丽', '彭军', '吕伟',
    '苏婷', '卢龙', '蒋凤', '蔡华', '贾磊', '丁静', '魏伟', '薛红'
  ];

  const townships = [
    { township: '石板滩', town: '石板滩镇', villages: ['幸福村', '和平村', '新民村', '团结村'] },
    { township: '新繁', town: '新繁镇', villages: ['向阳村', '光华村', '民主村', '建设村'] },
    { township: '大丰', town: '大丰街道', villages: ['光明村', '红星村', '胜利村', '前进村'] },
    { township: '清流', town: '清流镇', villages: ['清泉村', '龙泉村', '凤凰村', '金龙村'] },
    { township: '斑竹园', town: '斑竹园街道', villages: ['竹园村', '翠竹村', '青竹村', '紫竹村'] }
  ];

  const grades: Array<'gold' | 'silver' | 'bronze'> = ['gold', 'silver', 'bronze'];
  const gradeWeights = [0.18, 0.42, 0.40];

  const farmers: Farmer[] = [];

  for (let i = 0; i < 200; i++) {
    const rand = Math.random();
    let grade: 'gold' | 'silver' | 'bronze' = 'bronze';
    if (rand < gradeWeights[0]) {
      grade = 'gold';
    } else if (rand < gradeWeights[0] + gradeWeights[1]) {
      grade = 'silver';
    }

    const nameIndex = i % baseNames.length;
    const nameSuffix = i >= baseNames.length ? Math.floor(i / baseNames.length).toString() : '';
    const name = baseNames[nameIndex] + nameSuffix;

    const townshipInfo = townships[i % townships.length];
    const village = townshipInfo.villages[i % townshipInfo.villages.length];
    const group = (i % 10) + 1;

    // 分配业务员：使用 User ID
    const salesmanIndex = i % MOCK_SALESMEN.length;
    const salesman = MOCK_SALESMEN[salesmanIndex];

    const acreage = Math.round((Math.random() * 30 + 5) * 10) / 10;
    const deposit = Math.round(acreage * 400);

    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const phone = `138${String(10000000 + i).slice(-8)}`;

    const farmerId = generateId('FRM', i + 1);

    farmers.push({
      id: farmerId,
      customerCode: `${salesman.id}-${phone}`,
      name,
      phone,
      idCard: `510100${1970 + (i % 30)}${month}${day}${String(1000 + i).slice(-4)}`,
      address: {
        county: '新都区',
        township: townshipInfo.township,
        town: townshipInfo.town,
        village: `${village}${group}组`
      },
      addressText: `新都区${townshipInfo.township}${townshipInfo.town}${village}${group}组`,
      acreage,
      grade,
      deposit,
      manager: name,
      contractDate: `2024-${month}-${day}`,
      status: i % 10 === 0 ? 'pending' : 'active',
      salesmanId: salesman.id,
      salesmanName: salesman.name,
      createTime: `2024-${month}-${day}`
    });
  }

  return farmers;
}

export const MOCK_FARMERS: Farmer[] = generateFarmers();

// ==================== 库存数据 ====================

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'INV_001', name: '甜叶菊 (种苗)', category: 'seed', quantity: 50000, unit: 'kg', location: '1号库 A区' },
  { id: 'INV_002', name: '优质稻谷A (种子)', category: 'seed', quantity: 2000, unit: 'kg', location: '1号库 B区' },
  { id: 'INV_003', name: '玉米B号 (种子)', category: 'seed', quantity: 1500, unit: 'kg', location: '1号库 C区' },
  { id: 'INV_004', name: '复合肥', category: 'fertilizer', quantity: 500, unit: '袋', location: '2号库 A区' },
  { id: 'INV_005', name: '尿素', category: 'fertilizer', quantity: 300, unit: '袋', location: '2号库 B区' },
  { id: 'INV_006', name: '甜叶菊 (成品)', category: 'crop', quantity: 0, unit: 'kg', location: '3号粮仓' },
  { id: 'INV_007', name: '稻谷 (成品)', category: 'crop', quantity: 0, unit: 'kg', location: '4号粮仓' }
];

// ==================== 种苗发放数据 ====================

/** 生成种苗发放记录（关联真实农户和库存） */
function generateSeedRecords(): SeedRecord[] {
  const records: SeedRecord[] = [];
  const seedInventory = MOCK_INVENTORY[0]; // 甜叶菊种苗

  // 为前50个农户生成发放记录
  for (let i = 0; i < 50; i++) {
    const farmer = MOCK_FARMERS[i];
    const salesman = MOCK_SALESMEN.find(s => s.id === farmer.salesmanId) || MOCK_SALESMEN[0];

    // 根据种植面积计算发放量（每亩约5-8kg）
    const quantity = Math.round(farmer.acreage * (5 + Math.random() * 3));
    const pricePerKg = 12;
    const totalAmount = quantity * pricePerKg;
    const paidAmount = Math.random() > 0.3 ? totalAmount : Math.round(totalAmount * 0.6);

    const day = String((i % 28) + 1).padStart(2, '0');

    records.push({
      id: generateId('SED', i + 1),
      farmerId: farmer.id,
      farmerName: farmer.name,
      seedType: '甜叶菊',
      quantity,
      pricePerKg,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      date: `2024-12-${day}`,
      distributor: salesman.name,
      distributorId: salesman.id
    });
  }

  return records;
}

export const MOCK_SEED_RECORDS: SeedRecord[] = generateSeedRecords();

// ==================== 种植指导数据 ====================

/** 生成种植指导记录（关联真实农户） */
function generateGuidanceRecords(): PlantingGuidance[] {
  const guidanceTypes: Array<'fertilizer' | 'pesticide' | 'technical' | 'other'> =
    ['fertilizer', 'pesticide', 'technical', 'other'];

  const guidanceNotes: Record<string, string[]> = {
    fertilizer: [
      '建议每亩施用尿素20kg，注意避开雨天',
      '复合肥追肥建议，结合培土施用',
      '叶面肥喷施指导，促进叶片生长'
    ],
    pesticide: [
      '发现早期病虫害，建议喷洒吡虫啉',
      '蚜虫防治方案，注意防护措施',
      '白粉病预防，建议提前喷药'
    ],
    technical: [
      '种植密度指导：每亩建议种植数量',
      '灌溉管理：注意合理控水',
      '采收时机判断：观察叶片成熟度'
    ],
    other: [
      '田间管理综合指导',
      '气象灾害应对建议'
    ]
  };

  const records: PlantingGuidance[] = [];

  // 为前30个农户生成指导记录
  for (let i = 0; i < 30; i++) {
    const farmer = MOCK_FARMERS[i];
    const typeIndex = i % guidanceTypes.length;
    const type = guidanceTypes[typeIndex];
    const notes = guidanceNotes[type][i % guidanceNotes[type].length];

    const month = String((i % 6) + 5).padStart(2, '0'); // 5-10月
    const day = String((i % 28) + 1).padStart(2, '0');

    records.push({
      id: generateId('GUD', i + 1),
      farmerId: farmer.id,
      farmerName: farmer.name,
      guidanceType: type,
      notes,
      date: `2024-${month}-${day}`,
      technician: MOCK_SALESMEN[i % MOCK_SALESMEN.length].name
    });
  }

  return records;
}

export const MOCK_GUIDANCE_RECORDS: PlantingGuidance[] = generateGuidanceRecords();

// ==================== 收购数据 ====================

/** 生成收购记录（关联真实农户） */
function generateAcquisitions(): Acquisition[] {
  const records: Acquisition[] = [];

  // 为前40个农户生成收购记录（已发放种苗的农户才能有收购）
  for (let i = 0; i < 40; i++) {
    const farmer = MOCK_FARMERS[i];
    const seedRecord = MOCK_SEED_RECORDS.find(s => s.farmerId === farmer.id);

    if (!seedRecord) continue;

    // 根据种植面积计算收购量（每亩约200-400kg产量）
    const quantity = Math.round(farmer.acreage * (200 + Math.random() * 200));
    const pricePerKg = 2.4 + Math.random() * 0.4; // 2.4-2.8元/kg
    const totalAmount = Math.round(quantity * pricePerKg);

    const day = String((i % 28) + 1).padStart(2, '0');

    records.push({
      id: generateId('ACQ', i + 1),
      farmerId: farmer.id,
      farmerName: farmer.name,
      productType: '甜叶菊',
      quantity,
      pricePerKg: Math.round(pricePerKg * 100) / 100,
      totalAmount,
      date: `2024-10-${day}`,
      status: i < 25 ? 'settled' : 'pending' // 前25条已结算，后面待结算
    });
  }

  return records;
}

export const MOCK_ACQUISITIONS: Acquisition[] = generateAcquisitions();

// ==================== 库存变动记录 ====================

/** 生成库存变动记录（关联种苗发放和收购） */
function generateInventoryLogs(): InventoryLog[] {
  const logs: InventoryLog[] = [];
  let logIndex = 1;

  // 种苗发放 -> 出库记录
  MOCK_SEED_RECORDS.forEach(record => {
    logs.push({
      id: generateId('LOG', logIndex++),
      inventoryId: 'INV_001', // 甜叶菊种苗
      inventoryName: '甜叶菊 (种苗)',
      type: 'out',
      quantity: record.quantity,
      relatedType: 'seed',
      relatedId: record.id,
      operator: record.distributorId,
      operatorName: record.distributor,
      remark: `发放给农户 ${record.farmerName}`,
      createTime: `${record.date} 10:00:00`
    });
  });

  // 收购 -> 入库记录
  MOCK_ACQUISITIONS.forEach(record => {
    logs.push({
      id: generateId('LOG', logIndex++),
      inventoryId: 'INV_006', // 甜叶菊成品
      inventoryName: '甜叶菊 (成品)',
      type: 'in',
      quantity: record.quantity,
      relatedType: 'acquisition',
      relatedId: record.id,
      operator: MOCK_USER_WAREHOUSE.id,
      operatorName: MOCK_USER_WAREHOUSE.name,
      remark: `收购自农户 ${record.farmerName}`,
      createTime: `${record.date} 14:00:00`
    });
  });

  return logs;
}

export const MOCK_INVENTORY_LOGS: InventoryLog[] = generateInventoryLogs();

// ==================== 结算数据 ====================

/** 从收购记录生成结算数据（确保关联正确） */
function generateSettlements(): Settlement[] {
  const settlements: Settlement[] = [];

  // 按农户分组收购记录
  const acquisitionsByFarmer = new Map<string, Acquisition[]>();
  MOCK_ACQUISITIONS.forEach(acq => {
    const list = acquisitionsByFarmer.get(acq.farmerId) || [];
    list.push(acq);
    acquisitionsByFarmer.set(acq.farmerId, list);
  });

  let settlementIndex = 1;

  acquisitionsByFarmer.forEach((acquisitions, farmerId) => {
    const farmer = MOCK_FARMERS.find(f => f.id === farmerId);
    if (!farmer) return;

    // 计算收购总额
    const totalAcquisitionAmount = acquisitions.reduce((sum, a) => sum + a.totalAmount, 0);

    // 查找该农户的种苗欠款
    const seedRecord = MOCK_SEED_RECORDS.find(s => s.farmerId === farmerId);
    const seedDeduction = seedRecord?.unpaidAmount || 0;

    // 农资扣款（模拟）
    const fertilizerDeduction = Math.round(farmer.acreage * 50); // 每亩50元农资
    const otherDeduction = Math.round(Math.random() * 100);
    const totalDeduction = seedDeduction + fertilizerDeduction + otherDeduction;

    const finalPayment = totalAcquisitionAmount - totalDeduction;

    // 判断结算状态
    const allSettled = acquisitions.every(a => a.status === 'settled');
    let auditStatus: 'pending' | 'approved' | 'paying' | 'completed' = 'pending';
    let totalPaid = 0;
    let payments: any[] = [];

    if (allSettled) {
      auditStatus = 'completed';
      totalPaid = finalPayment;
      payments = [{
        id: `PAY_${settlementIndex}`,
        amount: finalPayment,
        paymentTime: '2024-11-15 10:00',
        paymentMethod: '银行转账',
        operator: MOCK_USER_FINANCE.name,
        remark: '结清'
      }];
    } else if (Math.random() > 0.5) {
      auditStatus = 'approved';
    }

    const relatedAcquisitionIds = acquisitions.map(a => a.id);
    const date = acquisitions[0].date;

    settlements.push({
      id: generateId('STL', settlementIndex++),
      farmerId: farmer.id,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      totalAcquisitionAmount,
      seedDeduction,
      fertilizerDeduction,
      otherDeduction,
      totalDeduction,
      calculatedPayment: finalPayment,
      adjustedPayment: finalPayment,
      finalPayment,
      prepayments: [],
      totalPrepaid: 0,
      payments,
      totalPaid,
      remainingPayment: finalPayment - totalPaid,
      auditStatus,
      auditor: auditStatus !== 'pending' ? MOCK_USER_FINANCE.name : undefined,
      auditTime: auditStatus !== 'pending' ? '2024-11-10 14:00' : undefined,
      date,
      relatedAcquisitionIds,
      createTime: `${date} 09:00`,
      status: totalPaid >= finalPayment ? 'paid' : 'unpaid',
      deductions: totalDeduction
    });
  });

  return settlements;
}

export const MOCK_SETTLEMENTS: Settlement[] = generateSettlements();

// ==================== 统计数据（从实际数据计算） ====================

/** 计算农户汇总统计 */
export function calculateFarmerSummary(): FarmerSummaryStats {
  const totalFarmers = MOCK_FARMERS.length;
  const totalAcreage = MOCK_FARMERS.reduce((sum, f) => sum + f.acreage, 0);
  const totalDeposit = MOCK_FARMERS.reduce((sum, f) => sum + f.deposit, 0);

  const goldCount = MOCK_FARMERS.filter(f => f.grade === 'gold').length;
  const silverCount = MOCK_FARMERS.filter(f => f.grade === 'silver').length;
  const bronzeCount = MOCK_FARMERS.filter(f => f.grade === 'bronze').length;

  return {
    totalFarmers,
    totalAcreage: Math.round(totalAcreage),
    totalDeposit: Math.round(totalDeposit),
    gradeDistribution: {
      gold: goldCount,
      silver: silverCount,
      bronze: bronzeCount,
      goldPercent: Math.round(goldCount / totalFarmers * 100),
      silverPercent: Math.round(silverCount / totalFarmers * 100),
      bronzePercent: Math.round(bronzeCount / totalFarmers * 100)
    }
  };
}

/** 计算按业务员统计的签约数据 */
export function calculateSalesmanStats(): SalesmanFarmerStats[] {
  return MOCK_SALESMEN.map(salesman => {
    const farmers = MOCK_FARMERS.filter(f => f.salesmanId === salesman.id);
    const totalAcreage = farmers.reduce((sum, f) => sum + f.acreage, 0);
    const totalDeposit = farmers.reduce((sum, f) => sum + f.deposit, 0);

    const goldCount = farmers.filter(f => f.grade === 'gold').length;
    const silverCount = farmers.filter(f => f.grade === 'silver').length;
    const bronzeCount = farmers.filter(f => f.grade === 'bronze').length;
    const total = farmers.length || 1;

    return {
      salesmanId: salesman.id,
      salesmanName: salesman.name,
      farmerCount: farmers.length,
      totalAcreage: Math.round(totalAcreage),
      totalDeposit: Math.round(totalDeposit),
      gradeDistribution: {
        gold: goldCount,
        silver: silverCount,
        bronze: bronzeCount,
        goldPercent: Math.round(goldCount / total * 100),
        silverPercent: Math.round(silverCount / total * 100),
        bronzePercent: Math.round(bronzeCount / total * 100)
      }
    };
  });
}

/** 计算种苗发放统计 */
export function calculateSeedStats(): SeedDistributionStats {
  const totalQuantity = MOCK_SEED_RECORDS.reduce((sum, r) => sum + r.quantity, 0);
  const totalAmount = MOCK_SEED_RECORDS.reduce((sum, r) => sum + r.totalAmount, 0);
  const paidAmount = MOCK_SEED_RECORDS.reduce((sum, r) => sum + r.paidAmount, 0);
  const unpaidAmount = MOCK_SEED_RECORDS.reduce((sum, r) => sum + r.unpaidAmount, 0);

  // 按品种统计
  const byTypeMap = new Map<string, SeedTypeStats>();
  MOCK_SEED_RECORDS.forEach(r => {
    const existing = byTypeMap.get(r.seedType) || {
      seedType: r.seedType,
      quantity: 0,
      totalAmount: 0,
      pricePerKg: r.pricePerKg,
      paidAmount: 0,
      unpaidAmount: 0
    };
    existing.quantity += r.quantity;
    existing.totalAmount += r.totalAmount;
    existing.paidAmount += r.paidAmount;
    existing.unpaidAmount += r.unpaidAmount;
    byTypeMap.set(r.seedType, existing);
  });

  const distributedFarmerIds = new Set(MOCK_SEED_RECORDS.map(r => r.farmerId));

  return {
    totalQuantity,
    totalAmount,
    paidAmount,
    unpaidAmount,
    byType: Array.from(byTypeMap.values()),
    distributedFarmerCount: distributedFarmerIds.size,
    totalFarmerCount: MOCK_FARMERS.length,
    distributionPercent: Math.round(distributedFarmerIds.size / MOCK_FARMERS.length * 100)
  };
}

/** 计算结算汇总统计 */
export function calculateSettlementSummary(): SettlementSummaryStats {
  const settledSettlements = MOCK_SETTLEMENTS.filter(s => s.auditStatus === 'completed');
  const pendingSettlements = MOCK_SETTLEMENTS.filter(s => s.auditStatus !== 'completed');

  return {
    settledFarmerCount: settledSettlements.length,
    totalPayable: MOCK_SETTLEMENTS.reduce((sum, s) => sum + s.finalPayment, 0),
    totalPaid: MOCK_SETTLEMENTS.reduce((sum, s) => sum + s.totalPaid, 0),
    totalPending: MOCK_SETTLEMENTS.reduce((sum, s) => sum + s.remainingPayment, 0),
    pendingFarmerCount: pendingSettlements.length
  };
}

/** 计算结算总览统计 */
export function calculateSettlementOverview(): SettlementOverviewStats {
  const summary = calculateSettlementSummary();

  return {
    totalFarmerCount: MOCK_FARMERS.length,
    settledFarmerCount: summary.settledFarmerCount,
    pendingAuditCount: MOCK_SETTLEMENTS.filter(s => s.auditStatus === 'pending').length,
    payingCount: MOCK_SETTLEMENTS.filter(s => s.auditStatus === 'paying').length,
    totalPayable: summary.totalPayable,
    totalPaid: summary.totalPaid,
    totalPending: summary.totalPending,
    totalPrepaid: MOCK_SETTLEMENTS.reduce((sum, s) => sum + s.totalPrepaid, 0)
  };
}

// 导出计算后的统计数据（保持向后兼容）
export const MOCK_FARMER_SUMMARY: FarmerSummaryStats = calculateFarmerSummary();
export const MOCK_SALESMAN_STATS: SalesmanFarmerStats[] = calculateSalesmanStats();
export const MOCK_SEED_YEAR_TOTAL: SeedDistributionStats = calculateSeedStats();
export const MOCK_SETTLEMENT_SUMMARY: SettlementSummaryStats = calculateSettlementSummary();
export const MOCK_SETTLEMENT_OVERVIEW: SettlementOverviewStats = calculateSettlementOverview();

// 昨日数据（模拟，实际应从时间筛选）
export const MOCK_FARMER_SUMMARY_YESTERDAY: FarmerSummaryStats = {
  totalFarmers: 3,
  totalAcreage: 45,
  totalDeposit: 18000,
  gradeDistribution: { gold: 1, silver: 1, bronze: 1, goldPercent: 33, silverPercent: 33, bronzePercent: 34 }
};

export const MOCK_SEED_YESTERDAY: SeedDistributionStats = {
  totalQuantity: 150,
  totalAmount: 1800,
  paidAmount: 1500,
  unpaidAmount: 300,
  byType: [{ seedType: '甜叶菊', quantity: 150, totalAmount: 1800, pricePerKg: 12, paidAmount: 1500, unpaidAmount: 300 }],
  distributedFarmerCount: 5,
  totalFarmerCount: MOCK_FARMERS.length,
  distributionPercent: 3
};

export const MOCK_SALESMAN_STATS_YESTERDAY: SalesmanFarmerStats[] = MOCK_SALESMEN.slice(0, 5).map((s, i) => ({
  salesmanId: s.id,
  salesmanName: s.name,
  farmerCount: i % 2 === 0 ? 1 : 0,
  totalAcreage: i % 2 === 0 ? 15 : 0,
  totalDeposit: i % 2 === 0 ? 6000 : 0,
  gradeDistribution: { gold: 0, silver: i % 2, bronze: i % 2 === 0 ? 1 : 0, goldPercent: 0, silverPercent: i % 2 * 50, bronzePercent: i % 2 === 0 ? 50 : 0 }
}));

// ==================== Dashboard 统计 ====================

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalFarmers: MOCK_FARMERS.length,
  activeContracts: MOCK_FARMERS.filter(f => f.status === 'active').length,
  totalAcquisitions: MOCK_ACQUISITIONS.reduce((sum, a) => sum + a.quantity, 0),
  pendingSettlements: MOCK_SETTLEMENTS.filter(s => s.auditStatus !== 'completed').reduce((sum, s) => sum + s.remainingPayment, 0)
};

export const MOCK_TREND_DATA: TrendDataPoint[] = [
  { month: '5月', acquisition: 0, distribution: 800 },
  { month: '6月', acquisition: 0, distribution: 1200 },
  { month: '7月', acquisition: 0, distribution: 500 },
  { month: '8月', acquisition: 2000, distribution: 0 },
  { month: '9月', acquisition: 8000, distribution: 0 },
  { month: '10月', acquisition: 15000, distribution: 0 }
];

// ==================== AI聊天数据 ====================

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
  {
    id: 'msg_001',
    role: 'assistant',
    content: '您好！我是普惠农录智能助手，可以帮您查询农户信息、业务数据等。请问有什么可以帮您的？',
    timestamp: Date.now() - 60000
  }
];

export const MOCK_AI_SUGGESTIONS: string[] = [
  '查看本月收购汇总',
  '待结算农户有哪些',
  '最近的种植指导记录',
  '库存情况如何'
];

// ==================== 选项数据 ====================

export const SEED_TYPE_OPTIONS = [
  { label: '甜叶菊 (主营)', value: '甜叶菊' },
  { label: '优质稻谷A (水稻)', value: '优质稻谷A' },
  { label: '玉米B号 (旱地)', value: '玉米B号' }
];

export const PRODUCT_TYPE_OPTIONS = [
  { label: '甜叶菊', value: '甜叶菊' },
  { label: '成熟稻谷', value: '成熟稻谷' },
  { label: '干玉米', value: '干玉米' }
];

export const GUIDANCE_TYPE_OPTIONS = [
  { label: '施肥指导', value: 'fertilizer' },
  { label: '病虫防治', value: 'pesticide' },
  { label: '技术指导', value: 'technical' },
  { label: '其他', value: 'other' }
];

// ==================== 分页查询函数 ====================

/**
 * 分页获取结算数据
 */
export function getSettlementsByPage(
  page: number,
  pageSize: number,
  status?: string,
  keyword?: string
): { list: Settlement[], total: number, hasMore: boolean } {
  let filtered = [...MOCK_SETTLEMENTS];

  if (status && status !== 'all') {
    if (status === 'approved') {
      filtered = filtered.filter(s => s.auditStatus === 'approved' || s.auditStatus === 'paying');
    } else {
      filtered = filtered.filter(s => s.auditStatus === status);
    }
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(s =>
      s.farmerName.toLowerCase().includes(kw) ||
      (s.farmerPhone && s.farmerPhone.includes(kw))
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const list = filtered.slice(start, end);
  const hasMore = end < total;

  return { list, total, hasMore };
}

/**
 * 验证数据关联完整性
 */
export function validateDataRelationships(): { valid: boolean, errors: string[] } {
  const errors: string[] = [];

  // 检查农户的业务员ID是否有效
  MOCK_FARMERS.forEach(farmer => {
    if (!MOCK_SALESMEN.find(s => s.id === farmer.salesmanId)) {
      errors.push(`Farmer ${farmer.id} has invalid salesmanId: ${farmer.salesmanId}`);
    }
  });

  // 检查种苗发放的农户ID是否有效
  MOCK_SEED_RECORDS.forEach(record => {
    if (!MOCK_FARMERS.find(f => f.id === record.farmerId)) {
      errors.push(`SeedRecord ${record.id} has invalid farmerId: ${record.farmerId}`);
    }
  });

  // 检查收购记录的农户ID是否有效
  MOCK_ACQUISITIONS.forEach(acq => {
    if (!MOCK_FARMERS.find(f => f.id === acq.farmerId)) {
      errors.push(`Acquisition ${acq.id} has invalid farmerId: ${acq.farmerId}`);
    }
  });

  // 检查结算的农户ID和收购ID是否有效
  MOCK_SETTLEMENTS.forEach(stl => {
    if (!MOCK_FARMERS.find(f => f.id === stl.farmerId)) {
      errors.push(`Settlement ${stl.id} has invalid farmerId: ${stl.farmerId}`);
    }
    stl.relatedAcquisitionIds.forEach(acqId => {
      if (!MOCK_ACQUISITIONS.find(a => a.id === acqId)) {
        errors.push(`Settlement ${stl.id} has invalid acquisitionId: ${acqId}`);
      }
    });
  });

  // 检查库存变动记录的关联
  MOCK_INVENTORY_LOGS.forEach(log => {
    if (!MOCK_INVENTORY.find(i => i.id === log.inventoryId)) {
      errors.push(`InventoryLog ${log.id} has invalid inventoryId: ${log.inventoryId}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// ==================== 仓库数据 ====================

/** 仓库列表 */
export const MOCK_WAREHOUSES: Warehouse[] = [
  { id: 'WH_LZ', name: '梁寨仓库', code: 'LZ', location: '梁寨镇', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' },
  { id: 'WH_SZW', name: '沙竹王仓库', code: 'SZW', location: '沙竹王村', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' },
  { id: 'WH_GY', name: '郭营仓库', code: 'GY', location: '郭营村', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' },
  { id: 'WH_SY', name: '沙堰仓库', code: 'SY', location: '沙堰镇', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' },
  { id: 'WH_QH', name: '青华仓库', code: 'QH', location: '青华村', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' },
  { id: 'WH_ZL', name: '赵楼仓库', code: 'ZL', location: '赵楼村', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' },
  { id: 'WH_PQ', name: '彭桥仓库', code: 'PQ', location: '彭桥村', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' },
  { id: 'WH_JL', name: '九龙仓库', code: 'JL', location: '九龙镇', managerId: 'USR_W01', managerName: '仓管老李', status: 'active', createTime: '2023-01-01' }
];

/** 仓库统计数据（按仓库ID索引）*/
export const MOCK_WAREHOUSE_STATS: Record<string, WarehouseStats> = {
  WH_LZ: {
    todayQuantity: 856.5,
    todayAmount: 15417.0,
    todayFarmerCount: 8,
    totalQuantity: 12580.3,
    totalAmount: 226445.4,
    totalFarmerCount: 125,
    currentStock: 2850.5,
    outStock: 9729.8
  },
  WH_SZW: {
    todayQuantity: 732.8,
    todayAmount: 13190.4,
    todayFarmerCount: 6,
    totalQuantity: 10245.6,
    totalAmount: 184420.8,
    totalFarmerCount: 98,
    currentStock: 1956.3,
    outStock: 8289.3
  },
  WH_GY: {
    todayQuantity: 625.2,
    todayAmount: 11253.6,
    todayFarmerCount: 5,
    totalQuantity: 8956.4,
    totalAmount: 161215.2,
    totalFarmerCount: 82,
    currentStock: 1685.2,
    outStock: 7271.2
  },
  WH_SY: {
    todayQuantity: 542.6,
    todayAmount: 9766.8,
    todayFarmerCount: 4,
    totalQuantity: 7854.2,
    totalAmount: 141375.6,
    totalFarmerCount: 71,
    currentStock: 1456.8,
    outStock: 6397.4
  },
  WH_QH: {
    todayQuantity: 698.4,
    todayAmount: 12571.2,
    todayFarmerCount: 7,
    totalQuantity: 9632.5,
    totalAmount: 173385.0,
    totalFarmerCount: 89,
    currentStock: 2145.6,
    outStock: 7486.9
  },
  WH_ZL: {
    todayQuantity: 512.3,
    todayAmount: 9221.4,
    todayFarmerCount: 4,
    totalQuantity: 7124.8,
    totalAmount: 128246.4,
    totalFarmerCount: 65,
    currentStock: 1324.5,
    outStock: 5800.3
  },
  WH_PQ: {
    todayQuantity: 789.6,
    todayAmount: 14212.8,
    todayFarmerCount: 9,
    totalQuantity: 11254.7,
    totalAmount: 202584.6,
    totalFarmerCount: 108,
    currentStock: 2654.3,
    outStock: 8600.4
  },
  WH_JL: {
    todayQuantity: 865.9,
    todayAmount: 15586.2,
    todayFarmerCount: 10,
    totalQuantity: 13458.6,
    totalAmount: 242254.8,
    totalFarmerCount: 132,
    currentStock: 3125.4,
    outStock: 10333.2
  }
};
