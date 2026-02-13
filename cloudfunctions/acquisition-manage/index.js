/**
 * 收购管理云函数
 * 
 * 功能：
 * - createAcquisition: 创建收购记录（并自动生成结算单）
 * - getAcquisition: 获取收购详情
 * - listAcquisitions: 获取收购列表
 * - updateAcquisition: 更新收购记录（仅限审核驳回后）
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 引入精确计算工具
const { multiply, subtract, add, roundToFen } = require('./calc');

/**
 * 生成收购单号
 * 格式：ACQ_YYYYMMDD_XXXX
 */
function generateAcquisitionId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ACQ_${year}${month}${day}_${random}`;
}

/**
 * 生成结算单号
 * 格式：STL_YYYYMMDD_XXXX
 */
function generateSettlementId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `STL_${year}${month}${day}_${random}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析并规范化 YYYY-MM-DD（避免时区导致的日期偏移）
 */
function normalizeYmd(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(n => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function normalizeFarmerLookupValue(farmerId) {
  const value = String(farmerId || '').trim();
  return value || '';
}

async function findFarmerByAnyId(farmerId, options = {}) {
  const value = normalizeFarmerLookupValue(farmerId);
  if (!value) return null;

  const { onlyActive = false } = options;
  const activeOrLegacyStatus = _.or([
    { status: 'active' },
    { status: _.exists(false) },
    { status: '' },
    { status: null }
  ]);

  let whereByCode = { farmerId: value };
  if (onlyActive) whereByCode = _.and([whereByCode, activeOrLegacyStatus]);

  const res = await db.collection('farmers')
    .where(whereByCode)
    .limit(1)
    .get();
  if (res.data && res.data.length > 0) return res.data[0];

  return null;
}

function buildFarmerIdCandidates(farmer) {
  if (!farmer) return [];
  return Array.from(new Set([
    String(farmer.farmerId || '').trim()
  ].filter(Boolean)));
}

/**
 * 分批拉取全部数据（避免 get() 默认/上限返回导致统计不准）
 */
async function queryAll(collectionName, whereCondition, { orderByField, orderByDirection = 'desc', fields } = {}) {
  const MAX_LIMIT = 100;
  let all = [];
  let skip = 0;

  while (true) {
    let query = db.collection(collectionName).where(whereCondition);
    if (orderByField) query = query.orderBy(orderByField, orderByDirection);
    if (fields) query = query.field(fields);
    const res = await query.skip(skip).limit(MAX_LIMIT).get();
    all = all.concat(res.data || []);
    if (!res.data || res.data.length < MAX_LIMIT) break;
    skip += MAX_LIMIT;
  }

  return all;
}

/**
 * 创建收购记录
 * 核心业务流程：
 * 1. 创建收购记录
 * 2. 自动生成结算单
 * 3. 更新农户统计数据
 * 4. 更新仓库统计数据
 * 5. 发送通知给财务
 */
async function createAcquisition(event, context) {
  const { userId, data } = event;

  // 验证用户ID
  if (!userId) {
    return {
      success: false,
      message: '缺少用户ID'
    };
  }

  const {
    date: clientDate,
    farmerId,
    warehouseId: clientWarehouseId,
    grossWeight,
    tareWeight,
    moistureRate,
    unitPrice,
    remark
  } = data || {};

  // 数据验证
  const isEmpty = (val) => val === undefined || val === null || val === '';
  if (!farmerId || !clientWarehouseId || isEmpty(grossWeight) || isEmpty(tareWeight) || isEmpty(moistureRate) || isEmpty(unitPrice)) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }

  try {
    // 获取当前用户信息（仓库管理员）
    const userRes = await db.collection('users').doc(userId).get();

    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 权限检查：必须是仓库管理员
    if (currentUser.role !== 'warehouse_manager') {
      return {
        success: false,
        errMsg: '只有仓库管理员可以创建收购记录'
      };
    }

    if (!currentUser.warehouseId) {
      return {
        success: false,
        errMsg: '仓库管理员未绑定仓库'
      };
    }

    // 防呆：前端传的仓库与用户绑定仓库不一致时拒绝
    if (clientWarehouseId && currentUser.warehouseId && clientWarehouseId !== currentUser.warehouseId) {
      return {
        success: false,
        errMsg: '仓库信息不匹配'
      };
    }

    // 获取农户信息
    const farmerLookupValue = normalizeFarmerLookupValue(farmerId);
    if (!farmerLookupValue) {
      return {
        success: false,
        errMsg: '缺少农户ID'
      };
    }

    // 统一按业务编号 farmerId 查询
    const farmer = await findFarmerByAnyId(farmerLookupValue, { onlyActive: true });
    if (!farmer) {
      return {
        success: false,
        errMsg: '农户不存在或已停用'
      };
    }

    // 检查发苗是否完成
    if (!farmer.seedDistributionComplete) {
      return {
        success: false,
        errMsg: '该农户尚未完成发苗，无法创建收购记录'
      };
    }

    // 获取仓库信息
    const warehouseRes = await db.collection('warehouses')
      .where({ _id: currentUser.warehouseId })
      .get();

    if (warehouseRes.data.length === 0) {
      return {
        success: false,
        errMsg: '仓库不存在'
      };
    }

    const warehouse = warehouseRes.data[0];

    // 计算重量和金额
    const grossWeightNum = Number(grossWeight);
    const tareWeightNum = Number(tareWeight);
    const moistureRateNum = Number(moistureRate);
    const unitPriceNum = Number(unitPrice);

    if (!Number.isFinite(grossWeightNum) || grossWeightNum <= 0) {
      return { success: false, errMsg: '毛重不合法' };
    }
    if (!Number.isFinite(tareWeightNum) || tareWeightNum < 0) {
      return { success: false, errMsg: '皮重不合法' };
    }
    if (grossWeightNum < tareWeightNum) {
      return { success: false, errMsg: '毛重不能小于皮重' };
    }
    if (!Number.isFinite(moistureRateNum) || moistureRateNum < 0 || moistureRateNum > 100) {
      return { success: false, errMsg: '水杂率不合法' };
    }
    if (!Number.isFinite(unitPriceNum) || unitPriceNum <= 0) {
      return { success: false, errMsg: '单价不合法' };
    }

    // 使用精确计算：净重 = 毛重 - 皮重 - 水杂重量
    const baseWeight = subtract(grossWeightNum, tareWeightNum);
    const moistureRatio = multiply(moistureRateNum, 0.01);
    const computedMoistureWeight = roundToFen(multiply(baseWeight, moistureRatio));
    const computedNetWeight = roundToFen(subtract(baseWeight, computedMoistureWeight));
    const computedTotalAmount = roundToFen(multiply(computedNetWeight, unitPriceNum));

    if (!Number.isFinite(computedNetWeight) || computedNetWeight <= 0) {
      return { success: false, errMsg: '净重不合法' };
    }

    // 计算预估重量和差异（使用已发苗面积，而非签约面积）
    const distributedArea = farmer.stats?.totalSeedArea || 0;
    const estimatedWeightKg = multiply(distributedArea, 300); // 每亩 300kg
    const weightDifference = roundToFen(subtract(computedNetWeight, estimatedWeightKg));
    const weightDifferenceRate = estimatedWeightKg > 0
      ? Number((multiply(weightDifference, 100) / estimatedWeightKg).toFixed(2))
      : 0;
    const isAbnormal = estimatedWeightKg > 0 ? Math.abs(weightDifferenceRate) > 50 : false; // 差异率超过50%为异常

    // 生成收购单号
    const acquisitionId = generateAcquisitionId();
    const normalizedClientDate = normalizeYmd(clientDate);
    if (clientDate && !normalizedClientDate) {
      return { success: false, errMsg: '收购日期不合法' };
    }
    const acquisitionDate = normalizedClientDate || formatDate(new Date());
    const todayStr = formatDate(new Date());

    // 构造收购记录数据
    const acquisitionData = {
      acquisitionId,
      farmerId: farmer.farmerId,
      farmerDocId: farmer._id,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      farmerAcreage: farmer.acreage,
      warehouseId: currentUser.warehouseId,
      warehouseName: warehouse.name,
      estimatedWeight: estimatedWeightKg,
      grossWeight: grossWeightNum,
      tareWeight: tareWeightNum,
      moistureRate: moistureRateNum,
      moistureWeight: computedMoistureWeight,
      netWeight: computedNetWeight,
      unitPrice: unitPriceNum,
      totalAmount: computedTotalAmount,
      weightDifference: weightDifference,
      weightDifferenceRate: weightDifferenceRate,
      isAbnormal,
      remark: remark || '',
      photos: [],
      status: 'confirmed',
      auditRemark: '',
      correctionRemark: '',
      acquisitionDate,
      createTime: db.serverDate(),
      createBy: currentUser.name,
      createById: currentUser._id,
      confirmTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    // 生成结算单数据
    const settlementId = generateSettlementId();
    const settlementData = {
      settlementId,
      acquisitionId,

      // 农户信息
      farmerId: farmer.farmerId,
      farmerDocId: farmer._id,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      farmerBankAccount: farmer.bankAccount || '',
      farmerBankName: farmer.bankName || '',
      accountHolder: farmer.accountHolder || farmer.name,

      // 仓库信息
      warehouseId: currentUser.warehouseId,
      warehouseName: warehouse.name,

      // 收购信息
      acquisitionDate,
      acquisitionWeight: computedNetWeight,
      acquisitionPrice: unitPriceNum,
      acquisitionAmount: computedTotalAmount, // 收购货款
      // 兼容字段
      netWeight: computedNetWeight,
      unitPrice: unitPriceNum,
      grossAmount: computedTotalAmount,

      // 扣款明细（审核时才计算，初始为0）
      advanceDeduction: 0,      // 预付款扣除
      seedDeduction: 0,         // 种苗欠款扣除
      agriculturalDeduction: 0, // 农资欠款扣除
      totalDeduction: 0,        // 扣款合计
      actualPayment: 0,         // 实付金额（审核时计算）

      // 状态（三阶段：pending -> approved -> completed）
      status: 'pending',  // pending=待审核, approved=待付款, completed=已完成
      auditStatus: 'pending',
      paymentStatus: 'unpaid',

      // 审核信息（会计操作）
      auditorId: '',
      auditorName: '',
      auditTime: null,
      auditRemark: '',

      // 付款信息（出纳操作）
      cashierId: '',
      cashierName: '',
      paymentMethod: '',      // 付款方式：cash/wechat/bank
      paymentMethodName: '',  // 付款方式名称
      paymentTime: null,
      paymentRemark: '',

      // 时间戳
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      completeTime: null
    };

    // 农户统计更新数据
    const isFirstAcquisition = (farmer.stats?.totalAcquisitionCount || 0) === 0;
    const farmerUpdateData = {
      'stats.totalAcquisitionCount': _.inc(1),
      'stats.totalAcquisitionWeight': _.inc(computedNetWeight),
      'stats.totalAcquisitionAmount': _.inc(computedTotalAmount),
      lastAcquisitionTime: db.serverDate(),
      firstAcquisitionTime: isFirstAcquisition ? db.serverDate() : farmer.firstAcquisitionTime,
      updateTime: db.serverDate()
    };

    // 仓库统计更新数据
    const warehouseUpdates = {
      'stats.totalAcquisitionCount': _.inc(1),
      'stats.totalAcquisitionWeight': _.inc(computedNetWeight),
      'stats.totalAcquisitionAmount': _.inc(computedTotalAmount),
      'stats.currentStock': _.inc(computedNetWeight),
      statsUpdateTime: db.serverDate(),
      updateTime: db.serverDate()
    };
    // 只有业务日期=今天时，才更新"今日"统计
    if (acquisitionDate === todayStr) {
      warehouseUpdates['stats.todayAcquisitionCount'] = _.inc(1);
      warehouseUpdates['stats.todayAcquisitionWeight'] = _.inc(computedNetWeight);
      warehouseUpdates['stats.todayAcquisitionAmount'] = _.inc(computedTotalAmount);
    }

    // ==================== 事务操作开始 ====================
    // 核心的4个表操作必须在事务内，保证原子性
    const transaction = await db.startTransaction();
    let acquisitionResult;

    try {
      // 1. 插入收购记录
      acquisitionResult = await transaction.collection('acquisitions').add({
        data: acquisitionData
      });

      // 2. 生成结算单
      await transaction.collection('settlements').add({
        data: settlementData
      });

      // 3. 更新农户统计数据
      await transaction.collection('farmers')
        .doc(farmer._id)
        .update({
          data: farmerUpdateData
        });

      // 4. 更新仓库统计数据
      await transaction.collection('warehouses')
        .where({ _id: currentUser.warehouseId })
        .update({ data: warehouseUpdates });

      // 提交事务
      await transaction.commit();
    } catch (transactionError) {
      // 事务失败，回滚
      await transaction.rollback();
      console.error('收购事务失败:', transactionError);
      return {
        success: false,
        message: '收购记录创建失败，请重试'
      };
    }
    // ==================== 事务操作结束 ====================

    // 以下为非核心操作，事务成功后执行，失败不影响主流程
    try {
      // 5. 记录操作日志
      await db.collection('operation_logs').add({
        data: {
          userId: currentUser._id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'create_acquisition',
          module: 'acquisition',
          targetId: acquisitionId,
          targetName: `${farmer.name} - ${computedNetWeight}kg`,
          description: `创建收购记录：${farmer.name}，净重${computedNetWeight}kg`,
          before: {},
          after: acquisitionData,
          changes: [],
          createTime: db.serverDate()
        }
      });

      // 6. 写入业务往来记录
      await db.collection('business_records').add({
        data: {
          farmerId: farmer.farmerId,
          farmerDocId: farmer._id,
          farmerName: farmer.name,
          type: 'acquisition',
          name: '收购入库',
          date: acquisitionDate,
          amount: computedTotalAmount,
          quantity: computedNetWeight,
          unit: 'kg',
          unitPrice: unitPriceNum,
          desc: `净重${computedNetWeight}kg，单价¥${unitPriceNum}/kg，货款¥${computedTotalAmount}`,
          relatedId: acquisitionId,
          relatedType: 'acquisition',
          warehouseId: currentUser.warehouseId,
          warehouseName: warehouse.name,
          operator: currentUser.name,
          operatorId: currentUser._id,
          createTime: db.serverDate()
        }
      });
    } catch (nonCriticalError) {
      // 非核心操作失败，只记录日志，不影响主流程
      console.error('非核心操作失败（不影响收购记录）:', nonCriticalError);
    }

    return {
      success: true,
      data: {
        acquisitionId,
        settlementId,
        _id: acquisitionResult._id
      },
      message: '收购记录创建成功'
    };
  } catch (error) {
    console.error('创建收购记录失败:', error);
    return {
      success: false,
      errMsg: error.message || '创建收购记录失败'
    };
  }
}

/**
 * 获取收购详情
 */
async function getAcquisition(event) {
  const { acquisitionId } = event;

  if (!acquisitionId) {
    return {
      success: false,
      errMsg: '缺少收购ID'
    };
  }

  try {
    const result = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        errMsg: '收购记录不存在'
      };
    }

    return {
      success: true,
      data: result.data[0]
    };
  } catch (error) {
    console.error('获取收购详情失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取收购详情失败'
    };
  }
}

/**
 * 获取收购列表
 */
async function listAcquisitions(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    userId,
    page = 1,
    pageSize = 20,
    warehouseId = '',
    farmerId = '',
    keyword = '',
    dateRange = '',
    startDate = '',
    endDate = '',
    status = ''
  } = event;

  try {
    // 获取当前用户信息（优先使用userId，否则用_openid）
    let userRes;
    if (userId) {
      userRes = await db.collection('users').doc(userId).get();
      if (!userRes.data) {
        userRes = { data: [] };
      } else {
        userRes = { data: [userRes.data] };
      }
    } else {
      userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
    }

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 构建查询条件（统一口径：默认排除 deleted）
    const whereCondition = {};

    // 如果是仓库管理员，只能查看自己仓库的收购记录
    if (currentUser.role === 'warehouse_manager') {
      if (!currentUser.warehouseId) {
        return { success: false, errMsg: '仓库管理员未绑定仓库' };
      }
      whereCondition.warehouseId = currentUser.warehouseId;
    }

    // 如果指定了仓库ID
    if (warehouseId && currentUser.role !== 'warehouse_manager') {
      whereCondition.warehouseId = warehouseId;
    }

    // 如果指定了农户ID（统一按业务编号 farmerId）
    if (farmerId) {
      const targetFarmer = await findFarmerByAnyId(farmerId);
      if (targetFarmer) {
        whereCondition.farmerId = targetFarmer.farmerId;
      } else {
        whereCondition.farmerId = farmerId;
      }
    }

    // 统一过滤：默认排除 deleted，除非显式传入 status
    if (status) {
      whereCondition.status = status;
    } else {
      whereCondition.status = _.neq('deleted');
    }

    // 日期范围（优先使用明确 start/end；否则支持 dateRange=today/all）
    let effectiveStartDate = startDate;
    let effectiveEndDate = endDate;
    if (!effectiveStartDate && !effectiveEndDate && dateRange === 'today') {
      const todayStr = formatDate(new Date());
      effectiveStartDate = todayStr;
      effectiveEndDate = todayStr;
    }
    if (effectiveStartDate && effectiveEndDate) {
      whereCondition.acquisitionDate = _.gte(effectiveStartDate).and(_.lte(effectiveEndDate));
    } else if (effectiveStartDate) {
      whereCondition.acquisitionDate = _.gte(effectiveStartDate);
    } else if (effectiveEndDate) {
      whereCondition.acquisitionDate = _.lte(effectiveEndDate);
    }

    // 关键词搜索（农户姓名/手机号/农户ID/收购单号）
    const trimmedKeyword = String(keyword || '').trim();
    let finalWhere = whereCondition;
    if (trimmedKeyword) {
      const safe = trimmedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = db.RegExp({ regexp: safe, options: 'i' });
      finalWhere = _.and([
        whereCondition,
        _.or([
          { farmerName: reg },
          { farmerPhone: reg },
          { farmerId: reg },
          { acquisitionId: reg }
        ])
      ]);
    }

    // 查询总数
    const countResult = await db.collection('acquisitions')
      .where(finalWhere)
      .count();

    // 查询数据
    const result = await db.collection('acquisitions')
      .where(finalWhere)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: {
        list: result.data,
        total: countResult.total,
        page,
        pageSize,
        totalPages: Math.ceil(countResult.total / pageSize)
      }
    };
  } catch (error) {
    console.error('获取收购列表失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取收购列表失败'
    };
  }
}

/**
 * 更新收购记录（仅限审核驳回后）
 */
async function updateAcquisition(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    acquisitionId,
    correctionRemark,
    updateData
  } = event;

  if (!acquisitionId) {
    return {
      success: false,
      errMsg: '缺少收购ID'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 获取收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (acquisitionRes.data.length === 0) {
      return {
        success: false,
        errMsg: '收购记录不存在'
      };
    }

    const acquisition = acquisitionRes.data[0];

    // 权限检查：只有创建人或管理员可以修改
    if (acquisition.createById !== currentUser._id && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限修改该收购记录'
      };
    }

    // 状态检查：只有审核驳回的记录可以修改
    if (acquisition.status !== 'audit_rejected') {
      return {
        success: false,
        errMsg: '只有审核驳回的记录可以修改'
      };
    }

    // 禁止修改收购日期，防止跨日期统计错误
    if (updateData && updateData.acquisitionDate && updateData.acquisitionDate !== acquisition.acquisitionDate) {
      return {
        success: false,
        errMsg: '收购日期不允许修改'
      };
    }

    // ==========================================
    // 准备更新数据和差额计算
    // ==========================================

    // 1. 准备收购记录更新数据（排除收购日期字段）
    const { acquisitionDate, ...safeUpdateData } = updateData || {};
    const updates = {
      ...safeUpdateData,
      correctionRemark: correctionRemark || '',
      status: 'confirmed', // 修改后重新提交审核
      updateTime: db.serverDate()
    };

    // 2. 计算差额（使用精确计算）
    const oldNetWeight = acquisition.netWeight || 0;
    const oldTotalAmount = acquisition.totalAmount || 0;
    const newNetWeight = updateData.netWeight !== undefined ? updateData.netWeight : oldNetWeight;
    const newTotalAmount = updateData.totalAmount !== undefined ? updateData.totalAmount : oldTotalAmount;

    const diffWeight = roundToFen(subtract(newNetWeight, oldNetWeight));
    const diffAmount = roundToFen(subtract(newTotalAmount, oldTotalAmount));

    // ==========================================
    // 事务：同步更新 acquisitions、settlements、farmers、warehouses
    // ==========================================
    await db.runTransaction(async (t) => {
      // 0. 更新收购记录（必须在事务内，作为第一步）
      await t.collection('acquisitions')
        .where({ acquisitionId })
        .update({
          data: updates
        });


      if (diffWeight !== 0 || diffAmount !== 0) {
        // 2.1 查询并更新结算单
        const settlementRes = await t.collection('settlements')
          .where({ acquisitionId })
          .get();

        if (settlementRes.data.length > 0) {
          const settlement = settlementRes.data[0];
          // 重新计算应付金额（保持原有的扣款项）- 使用精确计算
          const totalDeduction = Number.isFinite(settlement.totalDeduction)
            ? settlement.totalDeduction
            : Number.isFinite(settlement.totalDeductions)
              ? settlement.totalDeductions
              : add(settlement.advanceDeduction || 0, settlement.seedDeduction || 0, settlement.agriculturalDeduction || 0, settlement.otherDeductions || 0);
          const newActualPayment = roundToFen(subtract(newTotalAmount, totalDeduction));

          const settlementUpdates = {
            acquisitionWeight: newNetWeight,
            acquisitionAmount: newTotalAmount,
            acquisitionPrice: updateData.unitPrice !== undefined ? updateData.unitPrice : settlement.acquisitionPrice,
            // 兼容字段
            netWeight: newNetWeight,
            grossAmount: newTotalAmount,
            unitPrice: updateData.unitPrice !== undefined ? updateData.unitPrice : settlement.unitPrice,
            actualPayment: newActualPayment,
            status: 'pending',
            auditStatus: 'pending',
            paymentStatus: 'unpaid',
            updateTime: db.serverDate()
          };

          await t.collection('settlements')
            .doc(settlement._id)
            .update({
              data: settlementUpdates
            });
        }

        // 2.2 查询并更新农户统计
        if (acquisition.farmerId) {
          const farmerRes = await t.collection('farmers')
            .where({ farmerId: acquisition.farmerId })
            .limit(1)
            .get();

          if (farmerRes.data.length > 0) {
            await t.collection('farmers')
              .doc(farmerRes.data[0]._id)
              .update({
                data: {
                  'stats.totalAcquisitionWeight': _.inc(diffWeight),
                  'stats.totalAcquisitionAmount': _.inc(diffAmount),
                  updateTime: db.serverDate()
                }
              });
          }
        }

        // 2.3 查询并更新仓库统计
        if (acquisition.warehouseId) {
          const warehouseRes = await t.collection('warehouses')
            .where({ _id: acquisition.warehouseId })
            .get();

          if (warehouseRes.data.length > 0) {
            const warehouseUpdates = {
              'stats.totalAcquisitionWeight': _.inc(diffWeight),
              'stats.totalAcquisitionAmount': _.inc(diffAmount),
              'stats.currentStock': _.inc(diffWeight),
              updateTime: db.serverDate()
            };

            // 如果是今天的记录，同时更新今日统计
            const todayStr = formatDate(new Date());
            if (acquisition.acquisitionDate === todayStr) {
              warehouseUpdates['stats.todayAcquisitionWeight'] = _.inc(diffWeight);
              warehouseUpdates['stats.todayAcquisitionAmount'] = _.inc(diffAmount);
            }

            await t.collection('warehouses')
              .doc(warehouseRes.data[0]._id)
              .update({
                data: warehouseUpdates
              });
          }
        }
      } else {
        // 如果金额没变，只更新结算单状态
        const settlementRes = await t.collection('settlements')
          .where({ acquisitionId })
          .get();

        if (settlementRes.data.length > 0) {
          await t.collection('settlements')
            .doc(settlementRes.data[0]._id)
            .update({
              data: {
                status: 'pending',
                auditStatus: 'pending',
                paymentStatus: 'unpaid',
                updateTime: db.serverDate()
              }
            });
        }
      }
    });

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: currentUser._id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update_acquisition',
        module: 'acquisition',
        targetId: acquisitionId,
        targetName: acquisition.farmerName,
        description: `修正收购记录：${acquisition.farmerName}`,
        before: acquisition,
        after: { ...acquisition, ...updates },
        changes: Object.keys(updates).map(key => ({
          field: key,
          oldValue: acquisition[key],
          newValue: updates[key]
        })),
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '收购记录更新成功'
    };
  } catch (error) {
    console.error('更新收购记录失败:', error);
    return {
      success: false,
      errMsg: error.message || '更新收购记录失败'
    };
  }
}

/**
 * 获取农户收购汇总（分仓库统计）
 */
async function getFarmerAcquisitionSummary(event) {
  const { farmerId } = event;

  if (!farmerId) {
    return {
      success: false,
      message: '缺少农户ID'
    };
  }

  try {
    const targetFarmer = await findFarmerByAnyId(farmerId);
    const farmerCode = targetFarmer?.farmerId || farmerId;

    // 获取该农户的所有收购记录
    const acquisitions = await queryAll(
      'acquisitions',
      { farmerId: farmerCode, status: _.neq('deleted') },
      { orderByField: 'createTime', orderByDirection: 'desc' }
    );

    if (acquisitions.length === 0) {
      return {
        success: true,
        data: {
          totalCount: 0,
          totalWeight: 0,
          totalAmount: 0,
          warehouseStats: [],
          recentRecords: []
        }
      };
    }

    // 按仓库分组统计
    const warehouseMap = {};
    let totalWeight = 0;
    let totalAmount = 0;

    acquisitions.forEach(acq => {
      const wId = acq.warehouseId;
      const wName = acq.warehouseName || '未知仓库';

      if (!warehouseMap[wId]) {
        warehouseMap[wId] = {
          warehouseId: wId,
          warehouseName: wName,
          count: 0,
          weight: 0,
          amount: 0
        };
      }

      warehouseMap[wId].count += 1;
      warehouseMap[wId].weight = add(warehouseMap[wId].weight, acq.netWeight || 0);
      warehouseMap[wId].amount = add(warehouseMap[wId].amount, acq.totalAmount || 0);

      totalWeight = add(totalWeight, acq.netWeight || 0);
      totalAmount = add(totalAmount, acq.totalAmount || 0);
    });

    const warehouseStats = Object.values(warehouseMap).map(w => ({
      ...w,
      weight: roundToFen(w.weight),
      amount: roundToFen(w.amount),
      amountWan: roundToFen(multiply(w.amount, 0.0001))
    }));

    // 获取最近5条记录
    const recentRecords = acquisitions.slice(0, 5).map(acq => ({
      acquisitionId: acq.acquisitionId,
      warehouseName: acq.warehouseName,
      netWeight: acq.netWeight || 0,
      unitPrice: acq.unitPrice,
      totalAmount: acq.totalAmount,
      acquisitionDate: acq.acquisitionDate,
      createTime: acq.createTime
    }));

    return {
      success: true,
      data: {
        totalCount: acquisitions.length,
        totalWeight: roundToFen(totalWeight),
        totalAmount: roundToFen(totalAmount),
        totalAmountWan: roundToFen(multiply(totalAmount, 0.0001)),
        warehouseStats,
        recentRecords
      }
    };
  } catch (error) {
    console.error('获取农户收购汇总失败:', error);
    return {
      success: false,
      message: error.message || '获取农户收购汇总失败'
    };
  }
}

/**
 * 删除收购记录（软删除，仅财务/管理员可操作）
 */
async function deleteAcquisition(event) {
  const { userId, acquisitionId, reason } = event;

  if (!userId || !acquisitionId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      message: '请填写删除原因（至少5个字）'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users').doc(userId).get();

    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 权限检查：只有财务和管理员可以删除
    if (!['finance_admin', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        message: '无权限删除收购记录'
      };
    }

    // 获取收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (acquisitionRes.data.length === 0) {
      return {
        success: false,
        message: '收购记录不存在'
      };
    }

    const acquisition = acquisitionRes.data[0];

    // 检查关联的结算单状态，已审核或已付款的不能删除
    const settlementCheckRes = await db.collection('settlements')
      .where({ acquisitionId })
      .get();

    if (settlementCheckRes.data.length > 0) {
      const settlement = settlementCheckRes.data[0];
      if (settlement.status === 'completed' || settlement.paymentStatus === 'paid') {
        return {
          success: false,
          message: '该收购记录已完成付款，无法删除'
        };
      }
      if (settlement.status === 'approved' || settlement.auditStatus === 'approved') {
        return {
          success: false,
          message: '该收购记录已进入付款流程，请先撤销审核/付款状态再删除'
        };
      }
    }

    // ==========================================
    // 核心删除流程（事务）：软删除 + 统计回滚
    // ==========================================
    const netWeight = acquisition.netWeight || 0;
    const totalAmount = acquisition.totalAmount || 0;
    await db.runTransaction(async (t) => {
      // 1. 软删除收购记录
      await t.collection('acquisitions')
        .where({ acquisitionId })
        .update({
          data: {
            status: 'deleted',
            deleteReason: reason.trim(),
            deleteBy: currentUser.name,
            deleteById: userId,
            deleteTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });

      // 2. 软删除关联结算单
      await t.collection('settlements')
        .where({ acquisitionId })
        .update({
          data: {
            status: 'deleted',
            deleteReason: reason.trim(),
            deleteBy: currentUser.name,
            deleteById: userId,
            deleteTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });

      // 3. 回滚农户统计
      if (acquisition.farmerId && netWeight > 0) {
        const farmer = await findFarmerByAnyId(acquisition.farmerId);
        if (farmer) {
          await t.collection('farmers')
            .doc(farmer._id)
            .update({
              data: {
                'stats.totalAcquisitionCount': _.inc(-1),
                'stats.totalAcquisitionWeight': _.inc(-netWeight),
                'stats.totalAcquisitionAmount': _.inc(-totalAmount),
                updateTime: db.serverDate()
              }
            });
        }
      }

      // 4. 回滚仓库统计
      if (acquisition.warehouseId && netWeight > 0) {
        const warehouseUpdates = {
          'stats.totalAcquisitionCount': _.inc(-1),
          'stats.totalAcquisitionWeight': _.inc(-netWeight),
          'stats.totalAcquisitionAmount': _.inc(-totalAmount),
          'stats.currentStock': _.inc(-netWeight),
          updateTime: db.serverDate()
        };

        // 如果是今天的记录，同时回滚今日统计
        const todayStr = formatDate(new Date());
        if (acquisition.acquisitionDate === todayStr) {
          warehouseUpdates['stats.todayAcquisitionCount'] = _.inc(-1);
          warehouseUpdates['stats.todayAcquisitionWeight'] = _.inc(-netWeight);
          warehouseUpdates['stats.todayAcquisitionAmount'] = _.inc(-totalAmount);
        }

        await t.collection('warehouses')
          .where({ _id: acquisition.warehouseId })
          .update({
            data: warehouseUpdates
          });
      }
    });

    // 记录修改日志（非核心操作，失败不影响主流程）
    try {
      await db.collection('modification_logs').add({
        data: {
          targetType: 'acquisition',
          targetId: acquisitionId,
          action: 'delete',
          beforeData: acquisition,
          afterData: null,
          reason: reason.trim(),
          operatorId: userId,
          operatorName: currentUser.name,
          createTime: db.serverDate()
        }
      });
    } catch (logErr) {
      console.error('删除收购记录日志写入失败（不影响主流程）:', logErr);
    }

    return {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    console.error('删除收购记录失败:', error);
    return {
      success: false,
      message: error.message || '删除收购记录失败'
    };
  }
}

/**
 * 财务修改收购记录
 */
async function financeUpdateAcquisition(event) {
  const { userId, acquisitionId, updateData, reason } = event;

  if (!userId || !acquisitionId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      message: '请填写修改原因（至少5个字）'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users').doc(userId).get();

    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 权限检查：只有财务和管理员可以修改
    if (!['finance_admin', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        message: '无权限修改收购记录'
      };
    }

    // 获取收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (acquisitionRes.data.length === 0) {
      return {
        success: false,
        message: '收购记录不存在'
      };
    }

    const acquisition = acquisitionRes.data[0];

    // 检查关键字段是否变更
    const oldNetWeight = acquisition.netWeight || 0;
    const oldTotalAmount = acquisition.totalAmount || 0;
    const oldUnitPrice = acquisition.unitPrice || 0;

    const newNetWeight = updateData.netWeight !== undefined ? updateData.netWeight : oldNetWeight;
    const newTotalAmount = updateData.totalAmount !== undefined ? updateData.totalAmount : oldTotalAmount;
    const newUnitPrice = updateData.unitPrice !== undefined ? updateData.unitPrice : oldUnitPrice;

    const hasWeightOrAmountChange = updateData.netWeight !== undefined ||
                                     updateData.totalAmount !== undefined ||
                                     updateData.unitPrice !== undefined;

    // 计算差额（使用精确计算）
    const diffWeight = roundToFen(subtract(newNetWeight, oldNetWeight));
    const diffAmount = roundToFen(subtract(newTotalAmount, oldTotalAmount));

    // 使用事务更新收购记录和关联数据
    await db.runTransaction(async (t) => {
      // 1. 更新收购记录
      await t.collection('acquisitions')
        .where({ acquisitionId })
        .update({
          data: {
            ...updateData,
            lastModifyReason: reason.trim(),
            lastModifyBy: currentUser.name,
            lastModifyById: userId,
            lastModifyTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });

      // 2. 如果金额/重量有变更，同步更新结算单和统计
      if (hasWeightOrAmountChange) {
        // 2.1 查询并更新结算单
        const settlementRes = await t.collection('settlements')
          .where({ acquisitionId })
          .get();

        if (settlementRes.data.length > 0) {
          const settlement = settlementRes.data[0];

          // 重新计算应付金额（保持原有的扣款项）- 使用精确计算
          const totalDeduction = Number.isFinite(settlement.totalDeduction)
            ? settlement.totalDeduction
            : Number.isFinite(settlement.totalDeductions)
              ? settlement.totalDeductions
              : add(settlement.advanceDeduction || 0, settlement.seedDeduction || 0, settlement.agriculturalDeduction || 0, settlement.otherDeductions || 0);
          const newActualPayment = roundToFen(subtract(newTotalAmount, totalDeduction));

          const settlementUpdates = {
            acquisitionWeight: newNetWeight,
            acquisitionAmount: newTotalAmount,
            acquisitionPrice: newUnitPrice,
            // 兼容字段
            netWeight: newNetWeight,
            grossAmount: newTotalAmount,
            unitPrice: newUnitPrice,
            actualPayment: newActualPayment,
            updateTime: db.serverDate()
          };

          await t.collection('settlements')
            .doc(settlement._id)
            .update({
              data: settlementUpdates
            });
        }

        // 2.2 更新农户统计（如果重量或金额有差异）
        if ((diffWeight !== 0 || diffAmount !== 0) && acquisition.farmerId) {
          const farmer = await findFarmerByAnyId(acquisition.farmerId);
          if (farmer) {
            await t.collection('farmers')
              .doc(farmer._id)
              .update({
                data: {
                  'stats.totalAcquisitionWeight': _.inc(diffWeight),
                  'stats.totalAcquisitionAmount': _.inc(diffAmount),
                  updateTime: db.serverDate()
                }
              });
          }
        }

        // 2.3 更新仓库统计（如果重量或金额有差异）
        if ((diffWeight !== 0 || diffAmount !== 0) && acquisition.warehouseId) {
          const warehouseRes = await t.collection('warehouses')
            .where({ _id: acquisition.warehouseId })
            .get();

          if (warehouseRes.data.length > 0) {
            const warehouseUpdates = {
              'stats.totalAcquisitionWeight': _.inc(diffWeight),
              'stats.totalAcquisitionAmount': _.inc(diffAmount),
              'stats.currentStock': _.inc(diffWeight),
              updateTime: db.serverDate()
            };

            // 如果是今天的记录，同时更新今日统计
            const todayStr = formatDate(new Date());
            if (acquisition.acquisitionDate === todayStr) {
              warehouseUpdates['stats.todayAcquisitionWeight'] = _.inc(diffWeight);
              warehouseUpdates['stats.todayAcquisitionAmount'] = _.inc(diffAmount);
            }

            await t.collection('warehouses')
              .doc(warehouseRes.data[0]._id)
              .update({
                data: warehouseUpdates
              });
          }
        }
      }
    });

    // 记录修改日志（非核心操作，失败不影响主流程）
    try {
      await db.collection('modification_logs').add({
        data: {
          targetType: 'acquisition',
          targetId: acquisitionId,
          action: 'update',
          beforeData: acquisition,
          afterData: { ...acquisition, ...updateData },
          reason: reason.trim(),
          operatorId: userId,
          operatorName: currentUser.name,
          createTime: db.serverDate()
        }
      });
    } catch (logErr) {
      console.error('修改日志写入失败（不影响主流程）:', logErr);
    }

    return {
      success: true,
      message: '修改成功'
    };
  } catch (error) {
    console.error('修改收购记录失败:', error);
    return {
      success: false,
      message: error.message || '修改收购记录失败'
    };
  }
}

// 主函数
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'create':
      return await createAcquisition(event, context);
    case 'get':
      return await getAcquisition(event);
    case 'list':
      return await listAcquisitions(event, context);
    case 'update':
      return await updateAcquisition(event, context);
    case 'getFarmerSummary':
      return await getFarmerAcquisitionSummary(event);
    case 'delete':
      return await deleteAcquisition(event);
    case 'financeUpdate':
      return await financeUpdateAcquisition(event);
    case 'getDetail':
      return await getAcquisitionDetail(event);
    case 'getSummaryStats':
      return await getAcquisitionSummaryStats(event);
    default:
      return {
        success: false,
        errMsg: '无效的操作类型'
      };
  }
};

/**
 * 获取收购汇总统计（聚合查询，不受分页限制）
 * 返回：总重量、总金额、均价、农户数、记录数
 * 可选返回：按仓库分组统计（groupByWarehouse=true）
 * 支持按日期筛选（today / all）
 */
async function getAcquisitionSummaryStats(event) {
  const {
    dateRange = 'all',
    groupByWarehouse = false,
    startDate = '',
    endDate = ''
  } = event;

  try {
    let matchCondition = { status: _.neq('deleted') };

    // 优先按明确日期范围筛选（YYYY-MM-DD）
    if (startDate && endDate) {
      matchCondition.acquisitionDate = _.gte(startDate).and(_.lte(endDate));
    } else if (startDate) {
      matchCondition.acquisitionDate = _.gte(startDate);
    } else if (endDate) {
      matchCondition.acquisitionDate = _.lte(endDate);
    } else if (dateRange === 'today') {
      const today = formatDate(new Date());
      matchCondition.acquisitionDate = today;
    }

    // 聚合统计：总重量、总金额
    const aggRes = await db.collection('acquisitions')
      .aggregate()
      .match(matchCondition)
      .group({
        _id: null,
        totalWeight: $.sum('$netWeight'),
        totalAmount: $.sum('$totalAmount'),
        recordCount: $.sum(1)
      })
      .end();

    const agg = aggRes.list[0] || {
      totalWeight: 0,
      totalAmount: 0,
      recordCount: 0
    };

    // 农户去重计数
    const farmerAggRes = await db.collection('acquisitions')
      .aggregate()
      .match(matchCondition)
      .group({
        _id: '$farmerId'
      })
      .group({
        _id: null,
        farmerCount: $.sum(1)
      })
      .end();

    const farmerCount = farmerAggRes.list[0]?.farmerCount || 0;

    const totalWeight = agg.totalWeight || 0;
    const totalAmount = agg.totalAmount || 0;
    const avgPrice = totalWeight > 0 ? Number((totalAmount / totalWeight).toFixed(2)) : 0;

    const result = {
      totalWeight,
      totalAmount,
      avgPrice,
      recordCount: agg.recordCount || 0,
      totalCount: agg.recordCount || 0,
      farmerCount
    };

    // 按仓库分组聚合
    if (groupByWarehouse) {
      const warehouseAggRes = await db.collection('acquisitions')
        .aggregate()
        .match(matchCondition)
        .group({
          _id: '$warehouseId',
          warehouseName: $.first('$warehouseName'),
          weight: $.sum('$netWeight'),
          amount: $.sum('$totalAmount'),
          recordCount: $.sum(1)
        })
        .sort({ weight: -1 })
        .end();

      result.warehouseStats = warehouseAggRes.list.map(item => ({
        warehouseId: item._id,
        warehouseName: item.warehouseName || '未知仓库',
        weight: item.weight || 0,
        amount: item.amount || 0,
        recordCount: item.recordCount || 0
      }));
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('获取收购汇总统计失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取收购汇总统计失败'
    };
  }
}

/**
 * 获取收购详情（通过 _id 或 acquisitionId）
 * 用于详情页面查看
 */
async function getAcquisitionDetail(event) {
  const { acquisitionId, userId } = event;

  if (!acquisitionId) {
    return {
      success: false,
      message: '缺少收购ID'
    };
  }

  try {
    let result;

    // 尝试通过 _id 查询
    try {
      result = await db.collection('acquisitions').doc(acquisitionId).get();
      if (result.data) {
        return {
          success: true,
          data: result.data
        };
      }
    } catch (e) {
      // _id 查询失败，尝试用 acquisitionId 业务编号查询
    }

    // 通过业务编号查询
    result = await db.collection('acquisitions')
      .where({ acquisitionId: acquisitionId })
      .get();

    if (result.data && result.data.length > 0) {
      return {
        success: true,
        data: result.data[0]
      };
    }

    return {
      success: false,
      message: '收购记录不存在'
    };
  } catch (error) {
    console.error('获取收购详情失败:', error);
    return {
      success: false,
      message: error.message || '获取收购详情失败'
    };
  }
}
