/**
 * 普惠农录 数据类型定义
 * @description 定义系统中使用的所有数据结构
 */

// ==================== 用户相关 ====================

/** 用户角色枚举 - 与数据库存储值保持一致 */
export enum UserRole {
  ASSISTANT = 'assistant',                    // 业务员/助理：负责用户签约和种苗发放
  WAREHOUSE_MANAGER = 'warehouse_manager',    // 仓库管理员：负责收苗入库、出库管理
  FINANCE_ADMIN = 'finance_admin',            // 财务/管理层：系统总览、多维度查询、结算
  ADMIN = 'admin'                             // 超级管理员
}

/** 角色显示名称 */
export const UserRoleNames: Record<UserRole, string> = {
  [UserRole.ASSISTANT]: '助理',
  [UserRole.WAREHOUSE_MANAGER]: '仓库管理员',
  [UserRole.FINANCE_ADMIN]: '财务/管理层',
  [UserRole.ADMIN]: '管理员'
};

/** 权限类型枚举 */
export enum Permission {
  // 农户管理
  FARMER_CREATE = 'FARMER_CREATE',      // 新增农户
  FARMER_VIEW_OWN = 'FARMER_VIEW_OWN',  // 查看自己的农户
  FARMER_VIEW_ALL = 'FARMER_VIEW_ALL',  // 查看所有农户

  // 种苗发放
  SEED_DISTRIBUTE = 'SEED_DISTRIBUTE',  // 种苗发放操作
  SEED_VIEW = 'SEED_VIEW',              // 查看种苗发放记录

  // 种植指导
  GUIDE_CREATE = 'GUIDE_CREATE',        // 添加种植指导
  GUIDE_VIEW = 'GUIDE_VIEW',            // 查看种植指导记录

  // 收苗管理
  ACQUISITION_CREATE = 'ACQUISITION_CREATE',  // 收苗登记
  ACQUISITION_VIEW = 'ACQUISITION_VIEW',      // 查看收苗记录

  // 仓库管理
  INVENTORY_IN = 'INVENTORY_IN',        // 入库操作
  INVENTORY_OUT = 'INVENTORY_OUT',      // 出库操作
  INVENTORY_VIEW = 'INVENTORY_VIEW',    // 查看库存

  // 结算管理
  SETTLEMENT_VIEW = 'SETTLEMENT_VIEW',  // 查看结算列表
  SETTLEMENT_PAY = 'SETTLEMENT_PAY',    // 执行结算支付

  // 数据统计
  STATS_OWN = 'STATS_OWN',              // 查看自己的统计数据
  STATS_WAREHOUSE = 'STATS_WAREHOUSE',  // 查看仓库统计数据
  STATS_ALL = 'STATS_ALL',              // 查看全部统计数据
  QUERY_MULTI = 'QUERY_MULTI'           // 多维度查询
}

/** 用户信息 */
export interface User {
  id: string;              // 用户ID
  phone: string;           // 手机号
  name: string;            // 姓名
  role: UserRole;          // 角色
  avatar?: string;         // 头像URL
  createTime: string;      // 创建时间
}

/** 登录请求参数 */
export interface LoginParams {
  phone: string;           // 手机号
  code: string;            // 验证码
}

/** 登录响应 */
export interface LoginResponse {
  token: string;           // 访问令牌
  user: User;              // 用户信息
}

// ==================== 农户相关 ====================

/** 农户状态 */
export type FarmerStatus = 'active' | 'pending' | 'inactive';

/** 农户等级 */
export type FarmerGrade = 'gold' | 'silver' | 'bronze';

/** 四级地址结构 */
export interface FarmerAddress {
  county: string;          // 县城
  township: string;        // 乡
  town: string;            // 镇
  village: string;         // 村
}

/** 农户信息 */
export interface Farmer {
  id: string;              // 农户ID
  customerCode: string;    // 客户编码（业务员编号+农户手机号）
  name: string;            // 姓名
  phone: string;           // 联系电话
  idCard: string;          // 身份证号
  address: FarmerAddress;  // 种植地址（四级：县城/乡/镇/村）
  addressText?: string;    // 地址文本（便于显示）
  acreage: number;         // 种植面积（亩）
  grade: FarmerGrade;      // 农户等级（金牌/银牌/铜牌）
  deposit: number;         // 定金（元）
  manager: string;         // 种植户负责人
  contractDate: string;    // 签约日期
  status: FarmerStatus;    // 状态
  contractImages?: string[]; // 合同照片URL列表
  salesmanId?: string;     // 业务员ID
  salesmanName?: string;   // 业务员姓名
  createTime?: string;     // 创建时间
  updateTime?: string;     // 更新时间
}

/** 新增农户请求参数 */
export interface AddFarmerParams {
  name: string;
  phone: string;
  idCard: string;
  address: FarmerAddress;
  acreage: number;
  grade: FarmerGrade;
  deposit: number;
  manager: string;
  contractImages?: string[];
}

// ==================== 种苗发放相关 ====================

/** 种苗发放记录 */
export interface SeedRecord {
  id: string;              // 记录ID
  farmerId: string;        // 农户ID
  farmerName: string;      // 农户姓名
  seedType: string;        // 种苗品类
  quantity: number;        // 发放数量（kg）
  pricePerKg: number;      // 单价（元/kg）
  totalAmount: number;     // 总金额（元）
  paidAmount: number;      // 已收款金额（元）
  unpaidAmount: number;    // 欠款金额（元）
  date: string;            // 发放日期
  distributor: string;     // 发放人
  distributorId: string;   // 发放人ID（业务员ID）
  remark?: string;         // 备注
}

/** 新增种苗发放参数 */
export interface AddSeedRecordParams {
  farmerId: string;
  seedType: string;
  quantity: number;
  pricePerKg: number;
  paidAmount?: number;
  remark?: string;
}

// ==================== 种植指导相关 ====================

/** 指导类型 */
export type GuidanceType = 'fertilizer' | 'pesticide' | 'technical' | 'other';

/** 种植指导记录 */
export interface PlantingGuidance {
  id: string;              // 记录ID
  farmerId: string;        // 农户ID
  farmerName: string;      // 农户姓名
  guidanceType: GuidanceType; // 指导类型
  notes: string;           // 指导内容
  date: string;            // 指导日期
  technician: string;      // 技术员
  images?: string[];       // 现场照片
}

/** 新增种植指导参数 */
export interface AddGuidanceParams {
  farmerId: string;
  guidanceType: GuidanceType;
  notes: string;
  images?: string[];
}

// ==================== 收购相关 ====================

/** 收购状态 */
export type AcquisitionStatus = 'pending' | 'settled';

/** 收购记录 */
export interface Acquisition {
  id: string;              // 记录ID
  farmerId: string;        // 农户ID
  farmerName: string;      // 农户姓名
  productType: string;     // 收购品类
  quantity: number;        // 收购重量（kg）
  pricePerKg: number;      // 单价（元/kg）
  totalAmount: number;     // 总金额
  date: string;            // 收购日期
  status: AcquisitionStatus; // 结算状态
}

/** 新增收购记录参数 */
export interface AddAcquisitionParams {
  farmerId: string;
  productType: string;
  quantity: number;
  pricePerKg: number;
}

// ==================== 仓库相关 ====================

/** 仓库信息 */
export interface Warehouse {
  id: string;              // 仓库ID
  code: string;            // 仓库编码
  name: string;            // 仓库名称
  location: string;        // 仓库位置
  managerId: string;       // 仓库管理员ID
  managerName: string;     // 仓库管理员姓名
  status: 'active' | 'inactive';  // 状态
  createTime: string;      // 创建时间
}

/** 仓库统计数据 */
export interface WarehouseStats {
  // 今日收苗
  todayQuantity: number;   // 今日收苗数量（kg）
  todayAmount: number;     // 今日收苗金额（元）
  todayFarmerCount: number; // 今日收苗农户数
  // 累计数据
  totalQuantity: number;   // 累计收苗数量（kg）
  totalAmount: number;     // 累计收苗金额（元）
  totalFarmerCount: number; // 累计收苗农户数
  // 库存数据
  currentStock: number;    // 当前库存（kg）
  outStock: number;        // 已出库（kg）
}

// ==================== 库存相关 ====================

/** 库存类别 */
export type InventoryCategory = 'seed' | 'fertilizer' | 'crop' | 'other';

/** 库存项 */
export interface InventoryItem {
  id: string;              // 库存ID
  name: string;            // 物品名称
  category: InventoryCategory; // 类别
  quantity: number;        // 数量
  unit: string;            // 单位
  location: string;        // 存放位置
  warehouseId?: string;    // 所属仓库ID
  warehouseName?: string;  // 所属仓库名称
}

/** 库存变动类型 */
export type InventoryLogType = 'in' | 'out';

/** 库存变动关联业务类型 */
export type InventoryLogRelatedType = 'seed' | 'acquisition' | 'manual';

/** 库存变动记录 */
export interface InventoryLog {
  id: string;                      // 变动记录ID
  inventoryId: string;             // 关联库存项ID
  inventoryName: string;           // 库存项名称（冗余）
  type: InventoryLogType;          // 变动类型：in入库/out出库
  quantity: number;                // 变动数量
  relatedType: InventoryLogRelatedType; // 关联业务类型
  relatedId?: string;              // 关联业务ID（SeedRecord或Acquisition的ID）
  operator: string;                // 操作人ID
  operatorName: string;            // 操作人姓名（冗余）
  remark?: string;                 // 备注
  createTime: string;              // 创建时间
}

// ==================== 结算相关 ====================

/** 结算审核状态 */
export type SettlementAuditStatus =
  | 'pending'      // 待审核（待会计审核）
  | 'approved'     // 已审核（会计已通过，待支付）
  | 'paying'       // 支付中（出纳正在分批支付）
  | 'completed';   // 已完成（全部支付完成）

/** 支付状态（单笔支付） */
export type PaymentStatus = 'paid' | 'unpaid';

/** 单笔支付记录（支持分批支付，最多5笔） */
export interface PaymentRecord {
  id: string;              // 支付记录ID
  amount: number;          // 支付金额（元）
  paymentTime: string;     // 支付时间
  paymentMethod?: string;  // 支付方式
  operator: string;        // 操作人（出纳）
  remark?: string;         // 备注
}

/** 预付款记录 */
export interface PrepaymentRecord {
  id: string;              // 预付款ID
  amount: number;          // 预付金额（元）
  paymentTime: string;     // 支付时间
  operator: string;        // 操作人
  remark?: string;         // 备注
}

/** 结算记录 */
export interface Settlement {
  id: string;              // 结算ID
  farmerId: string;        // 农户ID
  farmerName: string;      // 农户姓名
  farmerPhone?: string;    // 农户电话

  // 金额计算
  totalAcquisitionAmount: number; // 收购总金额（元）
  seedDeduction: number;          // 种苗扣款（元）
  fertilizerDeduction: number;    // 农资扣款（元）
  otherDeduction: number;         // 其他扣款（元）
  totalDeduction: number;         // 扣款合计（元）
  calculatedPayment: number;      // 系统计算应付金额（元）
  adjustedPayment: number;        // 调整后应付金额（元，会计可调整）
  finalPayment: number;           // 最终应付金额（元）

  // 预付款
  prepayments: PrepaymentRecord[]; // 预付款记录
  totalPrepaid: number;           // 预付款合计（元）

  // 支付信息
  payments: PaymentRecord[];      // 支付记录（最多5笔分批支付）
  totalPaid: number;              // 已支付合计（元）
  remainingPayment: number;       // 待支付金额（元）

  // 审核信息
  auditStatus: SettlementAuditStatus; // 审核状态
  auditor?: string;               // 审核人（会计）
  auditTime?: string;             // 审核时间
  auditRemark?: string;           // 审核备注

  // 其他信息
  date: string;                   // 结算日期
  relatedAcquisitionIds: string[]; // 关联的收购记录ID
  createTime: string;             // 创建时间
  updateTime?: string;            // 更新时间

  // 旧字段兼容
  status?: PaymentStatus;         // 兼容旧版支付状态
  deductions?: number;            // 兼容旧版扣款字段
  paymentTime?: string;           // 兼容旧版支付时间
  paymentMethod?: string;         // 兼容旧版支付方式
}

/** 更新结算参数 */
export interface UpdateSettlementParams {
  id: string;
  adjustedPayment?: number;       // 调整后金额
  auditStatus?: SettlementAuditStatus;
  auditRemark?: string;
  paymentTime?: string;
  paymentMethod?: string;
}

/** 结算汇总统计（管理层视图） */
export interface SettlementOverviewStats {
  // 农户数量统计
  totalFarmerCount: number;       // 总农户数
  settledFarmerCount: number;     // 已结算农户数
  pendingAuditCount: number;      // 待审核数量
  payingCount: number;            // 支付中数量

  // 金额统计
  totalPayable: number;           // 应付款总额（元）
  totalPaid: number;              // 已付款总额（元）
  totalPending: number;           // 待付款总额（元）
  totalPrepaid: number;           // 预付款总额（元）
}

// ==================== AI助手相关 ====================

/** 聊天消息角色 */
export type ChatRole = 'user' | 'assistant';

/** 聊天消息 */
export interface ChatMessage {
  id: string;              // 消息ID
  role: ChatRole;          // 角色
  content: string;         // 内容
  timestamp: number;       // 时间戳
}

/** AI对话请求 */
export interface ChatRequest {
  message: string;         // 用户消息
  context?: ChatMessage[]; // 上下文消息
}

/** AI对话响应 */
export interface ChatResponse {
  message: string;         // AI回复
  suggestions?: string[];  // 建议问题
}

// ==================== 统计数据相关 ====================

/** 首页统计数据（旧版，保留兼容） */
export interface DashboardStats {
  totalFarmers: number;       // 总签约农户数
  activeContracts: number;    // 进行中合同数
  totalAcquisitions: number;  // 本月收购量（kg）
  pendingSettlements: number; // 待结算金额（元）
}

/** 趋势数据点 */
export interface TrendDataPoint {
  month: string;           // 月份
  acquisition: number;     // 收购量
  distribution: number;    // 发放量
}

// ==================== 财务/管理层统计类型 ====================

/** 签约农户汇总统计 */
export interface FarmerSummaryStats {
  totalFarmers: number;        // 签约农户总数（户）
  totalAcreage: number;        // 签约种植总面积（亩）
  totalDeposit: number;        // 定金总额（元）
  gradeDistribution: {         // 等级分布
    gold: number;              // 金牌农户数
    silver: number;            // 银牌农户数
    bronze: number;            // 铜牌农户数
    goldPercent: number;       // 金牌占比（%）
    silverPercent: number;     // 银牌占比（%）
    bronzePercent: number;     // 铜牌占比（%）
  };
}

/** 按负责人统计的签约数据 */
export interface SalesmanFarmerStats {
  salesmanId: string;          // 负责人ID
  salesmanName: string;        // 负责人姓名
  farmerCount: number;         // 签约农户数（户）
  totalAcreage: number;        // 种植面积（亩）
  totalDeposit: number;        // 定金总额（元）
  gradeDistribution: {         // 等级分布
    gold: number;
    silver: number;
    bronze: number;
    goldPercent: number;
    silverPercent: number;
    bronzePercent: number;
  };
}

/** 按品种统计的种苗数据 */
export interface SeedTypeStats {
  seedType: string;            // 品种名称
  quantity: number;            // 发放数量（kg）
  totalAmount: number;         // 总金额（元）
  pricePerKg: number;          // 单价（元/kg）
  paidAmount: number;          // 已收款（元）
  unpaidAmount: number;        // 欠款（元）
}

/** 种苗发放统计（昨日/累计通用） */
export interface SeedDistributionStats {
  totalQuantity: number;       // 发放总数量（kg）
  totalAmount: number;         // 总金额（元）
  paidAmount: number;          // 已收款金额（元）
  unpaidAmount: number;        // 欠款金额（元）
  byType: SeedTypeStats[];     // 按品种统计明细
  distributedFarmerCount: number;  // 已发放农户数
  totalFarmerCount: number;    // 签约农户总数
  distributionPercent: number; // 发放进度（%）
}

/** 收苗统计（今日/累计通用） */
export interface AcquisitionStats {
  totalQuantity: number;       // 收购总重量（kg）
  totalAmount: number;         // 总金额（元）
  avgPricePerKg: number;       // 平均单价（元/kg）
  farmerCount: number;         // 已卖叶子农户数
  byWarehouse: WarehouseAcquisitionStats[];  // 按仓库统计
}

/** 按仓库统计的收苗数据 */
export interface WarehouseAcquisitionStats {
  warehouseId: string;         // 仓库ID
  warehouseName: string;       // 仓库名称
  totalQuantity: number;       // 收购总重量（kg）
  totalAmount: number;         // 总金额（元）
  avgPricePerKg: number;       // 平均单价（元/kg）
}

/** 结算汇总统计 */
export interface SettlementSummaryStats {
  settledFarmerCount: number;  // 已结算农户数
  totalPayable: number;        // 应付款总额（元）
  totalPaid: number;           // 已付款总额（元）
  totalPending: number;        // 待付款总额（元）
  pendingFarmerCount: number;  // 待结算农户数
}

/** 财务/管理层首页完整统计 */
export interface FinanceAdminDashboard {
  // 签约农户汇总
  farmerSummary: FarmerSummaryStats;
  // 按负责人统计
  bySalesman: SalesmanFarmerStats[];
  // 种苗发放 - 昨日
  seedYesterday: SeedDistributionStats;
  // 种苗发放 - 年度累计
  seedYearTotal: SeedDistributionStats;
  // 收苗 - 今日
  acquisitionToday: AcquisitionStats;
  // 收苗 - 累计
  acquisitionTotal: AcquisitionStats;
  // 结算汇总
  settlementSummary: SettlementSummaryStats;
}

// ==================== 通用响应 ====================

/** API 通用响应结构 */
export interface ApiResponse<T = any> {
  code: number;            // 状态码，0 表示成功
  message: string;         // 提示信息
  data: T;                 // 响应数据
}

/** 分页参数 */
export interface PageParams {
  page: number;            // 页码，从 1 开始
  pageSize: number;        // 每页条数
}

/** 分页响应 */
export interface PageResponse<T> {
  list: T[];               // 数据列表
  total: number;           // 总条数
  page: number;            // 当前页码
  pageSize: number;        // 每页条数
}

