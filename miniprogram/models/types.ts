/**
 * 普惠农户 CRM 数据类型定义
 * @description 定义系统中使用的所有数据结构
 */

// ==================== 用户相关 ====================

/** 用户角色枚举 */
export enum UserRole {
  ADMIN = 'ADMIN',   // 管理员
  STAFF = 'STAFF'    // 普通员工
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
  date: string;            // 发放日期
  distributor: string;     // 发放人
  remark?: string;         // 备注
}

/** 新增种苗发放参数 */
export interface AddSeedRecordParams {
  farmerId: string;
  seedType: string;
  quantity: number;
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
}

// ==================== 结算相关 ====================

/** 结算状态 */
export type SettlementStatus = 'paid' | 'unpaid';

/** 结算记录 */
export interface Settlement {
  id: string;              // 结算ID
  farmerId: string;        // 农户ID
  farmerName: string;      // 农户姓名
  totalAcquisitionAmount: number; // 收购总金额
  deductions: number;      // 扣款（种苗/肥料成本）
  finalPayment: number;    // 实际支付金额
  status: SettlementStatus; // 支付状态
  date: string;            // 结算日期
  relatedAcquisitionIds: string[]; // 关联的收购记录ID
  paymentTime?: string;    // 支付时间
  paymentMethod?: string;  // 支付方式
}

/** 更新结算参数 */
export interface UpdateSettlementParams {
  id: string;
  status?: SettlementStatus;
  paymentTime?: string;
  paymentMethod?: string;
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

/** 首页统计数据 */
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

