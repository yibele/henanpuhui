// 普惠农录 - 首页统计数据云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

function getTodayYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action, userId } = event;

  try {
    // 验证 userId
    if (!userId) {
      return {
        success: false,
        code: 'INVALID_PARAM',
        message: '缺少用户ID'
      };
    }

    // 获取当前用户信息
    const userRes = await db.collection('users').doc(userId).get();

    if (!userRes.data) {
      return {
        success: false,
        code: 'USER_NOT_FOUND',
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 根据不同的角色和动作，返回不同的统计数据
    switch (action) {
      case 'getAssistantStats':
        return await getAssistantStats(currentUser);

      case 'getWarehouseStats':
        return await getWarehouseStats(currentUser);

      case 'getFinanceStats':
        return await getFinanceStats(currentUser);

      case 'getAdminDashboard':
        return await getAdminDashboard(currentUser);

      default:
        return {
          success: false,
          code: 'INVALID_ACTION',
          message: '无效的操作类型'
        };
    }
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return {
      success: false,
      code: 'GET_STATS_FAILED',
      message: error.message || '获取统计数据失败'
    };
  }
};

/**
 * 获取助理的统计数据
 */
async function getAssistantStats(user) {
  try {
    const userId = user._id;

    // 获取我录入的农户总数
    const farmersRes = await db.collection('farmers').where({
      createBy: userId,
      isDeleted: false
    }).count();

    // 获取农户详细列表（用于计算其他统计数据）
    const farmersList = await db.collection('farmers').where({
      createBy: userId,
      isDeleted: false
    }).get();

    const farmers = farmersList.data;

    // 计算总面积、应收款、欠款、定金
    let totalAcreage = 0;
    let totalReceivable = 0;
    let totalDebt = 0;
    let totalDeposit = 0;

    farmers.forEach(farmer => {
      totalAcreage += farmer.acreage || 0;
      totalReceivable += farmer.receivableAmount || 0;
      totalDebt += farmer.seedDebt || 0;
      totalDeposit += farmer.deposit || 0;
    });

    // 获取发苗记录统计
    const seedRecordsRes = await db.collection('seed_records').where({
      createBy: userId
    }).get();

    let totalDistributedAmount = 0;
    let totalDistributedQuantity = 0;
    seedRecordsRes.data.forEach(record => {
      totalDistributedAmount += record.amount || 0;
      totalDistributedQuantity += record.quantity || 0;
    });

    return {
      success: true,
      data: {
        farmerCount: farmersRes.total,
        totalAcreage: totalAcreage,
        totalReceivable: totalReceivable,
        totalDebt: totalDebt,
        totalDeposit: totalDeposit,
        totalDistributedAmount: totalDistributedAmount,
        seedRecordCount: seedRecordsRes.data.length,  // 发苗次数
        seedTotalQuantity: totalDistributedQuantity,   // 发苗总数量（株）
        farmers: farmers.slice(0, 10) // 返回最近10个农户
      }
    };
  } catch (error) {
    console.error('获取助理统计数据失败:', error);
    throw error;
  }
}

/**
 * 获取仓管的统计数据
 */
async function getWarehouseStats(user) {
  try {
    const warehouseId = user.warehouseId;

    if (!warehouseId) {
      return {
        success: false,
        code: 'NO_WAREHOUSE',
        message: '未绑定仓库'
      };
    }

    // 获取仓库信息
    const warehouseRes = await db.collection('warehouses').doc(warehouseId).get();

    if (!warehouseRes.data) {
      return {
        success: false,
        code: 'WAREHOUSE_NOT_FOUND',
        message: '仓库不存在'
      };
    }

    const warehouse = warehouseRes.data;

    const todayYmd = getTodayYmd();

    // 统一口径：收购入库以 acquisitions(acquisitionDate+netWeight) 为准，默认排除 deleted
    const todayAcquisitions = await queryAll(
      'acquisitions',
      { warehouseId, acquisitionDate: todayYmd, status: _.neq('deleted') },
      { orderByField: 'createTime', orderByDirection: 'desc', fields: { netWeight: true, weight: true, totalAmount: true, farmerId: true } }
    );

    const allAcquisitions = await queryAll(
      'acquisitions',
      { warehouseId, status: _.neq('deleted') },
      { orderByField: 'createTime', orderByDirection: 'desc', fields: { netWeight: true, weight: true, totalAmount: true, farmerId: true } }
    );

    let todayWeight = 0;
    let todayAmount = 0;
    const todayFarmerIds = new Set();
    todayAcquisitions.forEach(acq => {
      todayWeight += acq.netWeight || acq.weight || 0;
      todayAmount += acq.totalAmount || 0;
      if (acq.farmerId) todayFarmerIds.add(acq.farmerId);
    });

    let totalWeight = 0;
    let totalAmount = 0;
    const totalFarmerIds = new Set();
    allAcquisitions.forEach(acq => {
      totalWeight += acq.netWeight || acq.weight || 0;
      totalAmount += acq.totalAmount || 0;
      if (acq.farmerId) totalFarmerIds.add(acq.farmerId);
    });

    // 统一口径：出库/打包以 warehouse_daily 为准
    const allDaily = await queryAll(
      'warehouse_daily',
      { warehouseId },
      { orderByField: 'date', orderByDirection: 'desc', fields: { packCount: true, outWeight: true, outCount: true } }
    );

    let totalPack = 0;
    let totalOutWeight = 0;
    let totalOutCount = 0;
    allDaily.forEach(d => {
      totalPack += d.packCount || 0;
      totalOutWeight += d.outWeight || 0;
      totalOutCount += d.outCount || 0;
    });

    const stockWeight = Number((totalWeight - totalOutWeight).toFixed(2));
    const stockCount = totalPack - totalOutCount;

    return {
      success: true,
      data: {
        warehouse: {
          _id: warehouse._id,
          name: warehouse.name,
          code: warehouse.code,
          address: warehouse.address,
          manager: warehouse.manager,
          phone: warehouse.phone
        },
        today: {
          // 保持兼容：count=记录数，同时提供更明确字段
          count: todayAcquisitions.length,
          recordCount: todayAcquisitions.length,
          farmerCount: todayFarmerIds.size,
          weight: Number(todayWeight.toFixed(2)),
          amount: Number(todayAmount.toFixed(2))
        },
        total: {
          count: allAcquisitions.length,
          recordCount: allAcquisitions.length,
          farmerCount: totalFarmerIds.size,
          weight: Number(totalWeight.toFixed(2)),
          amount: Number(totalAmount.toFixed(2))
        },
        inventory: {
          // 兼容旧字段：count/weight 仍保留，但语义调整为“当前库存kg”
          count: stockWeight,
          weight: stockWeight,
          stockWeight,
          stockCount,
          totalPack,
          totalOutWeight: Number(totalOutWeight.toFixed(2)),
          totalOutCount
        }
      }
    };
  } catch (error) {
    console.error('获取仓管统计数据失败:', error);
    throw error;
  }
}

/**
 * 获取财务/管理层的统计数据
 */
async function getFinanceStats(user) {
  try {
    // 获取所有仓库
    const warehousesRes = await db.collection('warehouses').get();
    const warehouses = warehousesRes.data;

    // 获取待审核结算单
    const pendingSettlements = await db.collection('settlements').where(
      _.or([
        { auditStatus: 'pending' },
        { status: 'pending' }
      ])
    ).get();

    // 获取待支付结算单
    const approvedSettlements = await db.collection('settlements').where(
      _.and([
        _.or([{ auditStatus: 'approved' }, { status: 'approved' }]),
        _.or([{ paymentStatus: 'unpaid' }, { paymentStatus: 'paying' }])
      ])
    ).get();

    // 计算待支付总额
    let totalPendingAmount = 0;
    approvedSettlements.data.forEach(settlement => {
      totalPendingAmount += settlement.actualPayment || settlement.finalAmount || 0;
    });

    // 获取所有农户统计
    const farmersRes = await db.collection('farmers').where({
      isDeleted: false
    }).count();

    // 获取所有收购记录
    const acquisitionsRes = await db.collection('acquisitions').get();
    let totalAcquisitionAmount = 0;
    acquisitionsRes.data.forEach(acq => {
      totalAcquisitionAmount += acq.totalAmount || 0;
    });

    // 获取各仓库的统计数据
    const warehouseStats = [];
    for (const warehouse of warehouses) {
      const warehouseAcquisitions = await db.collection('acquisitions').where({
        warehouseId: warehouse._id
      }).get();

      let warehouseTotal = 0;
      let warehouseWeight = 0;
      warehouseAcquisitions.data.forEach(acq => {
        warehouseTotal += acq.totalAmount || 0;
        warehouseWeight += acq.weight || 0;
      });

      warehouseStats.push({
        warehouseId: warehouse._id,
        warehouseName: warehouse.name,
        acquisitionCount: warehouseAcquisitions.data.length,
        totalWeight: warehouseWeight,
        totalAmount: warehouseTotal
      });
    }

    return {
      success: true,
      data: {
        warehouses: warehouses,
        pendingSettlementCount: pendingSettlements.data.length,
        approvedSettlementCount: approvedSettlements.data.length,
        totalPendingAmount: totalPendingAmount,
        totalFarmers: farmersRes.total,
        totalAcquisitionAmount: totalAcquisitionAmount,
        warehouseStats: warehouseStats
      }
    };
  } catch (error) {
    console.error('获取财务统计数据失败:', error);
    throw error;
  }
}

/**
 * 获取管理员仪表盘数据（全面统计）
 * 包含：签约、发苗、收购、农资、预支款、结算、付款
 */
async function getAdminDashboard(user) {
  try {
    // 权限检查：只有管理员和财务可以访问
    if (!['admin', 'finance_admin'].includes(user.role)) {
      return {
        success: false,
        code: 'NO_PERMISSION',
        message: '无权限访问管理员仪表盘'
      };
    }

    // ========== 1. 签约统计 ==========
    const allFarmers = await queryAll('farmers', { isDeleted: false }, {
      fields: { acreage: true, deposit: true, seedTotal: true, receivableAmount: true, seedDebt: true, agriculturalDebt: true, advancePayment: true }
    });

    let farmerStats = {
      count: allFarmers.length,
      totalAcreage: 0,
      totalDeposit: 0,
      totalSeedTotal: 0,
      totalReceivable: 0,
      totalSeedDebt: 0,
      totalAgriculturalDebt: 0,
      totalAdvancePayment: 0
    };

    allFarmers.forEach(f => {
      farmerStats.totalAcreage += f.acreage || 0;
      farmerStats.totalDeposit += f.deposit || 0;
      farmerStats.totalSeedTotal += f.seedTotal || 0;
      farmerStats.totalReceivable += f.receivableAmount || 0;
      farmerStats.totalSeedDebt += f.seedDebt || 0;
      farmerStats.totalAgriculturalDebt += f.agriculturalDebt || 0;
      farmerStats.totalAdvancePayment += f.advancePayment || 0;
    });

    // ========== 2. 发苗统计 ==========
    const allSeedRecords = await queryAll('seed_records', {}, {
      fields: { quantity: true, amount: true }
    });

    let seedStats = {
      count: allSeedRecords.length,
      totalQuantity: 0,
      totalAmount: 0
    };

    allSeedRecords.forEach(r => {
      seedStats.totalQuantity += r.quantity || 0;
      seedStats.totalAmount += r.amount || 0;
    });

    // ========== 3. 收购统计 ==========
    const allAcquisitions = await queryAll('acquisitions', { status: _.neq('deleted') }, {
      fields: { netWeight: true, weight: true, totalAmount: true, amount: true }
    });

    let acquisitionStats = {
      count: allAcquisitions.length,
      totalWeight: 0,
      totalAmount: 0
    };

    allAcquisitions.forEach(a => {
      acquisitionStats.totalWeight += a.netWeight || a.weight || 0;
      acquisitionStats.totalAmount += a.totalAmount || a.amount || 0;
    });

    // ========== 4. 农资统计（化肥+农药） ==========
    const fertilizerRecords = await queryAll('business_records', { type: 'fertilizer' }, {
      fields: { totalAmount: true }
    });
    const pesticideRecords = await queryAll('business_records', { type: 'pesticide' }, {
      fields: { totalAmount: true }
    });

    let agriculturalStats = {
      fertilizerCount: fertilizerRecords.length,
      fertilizerAmount: 0,
      pesticideCount: pesticideRecords.length,
      pesticideAmount: 0,
      totalAmount: 0
    };

    fertilizerRecords.forEach(r => {
      agriculturalStats.fertilizerAmount += r.totalAmount || 0;
    });
    pesticideRecords.forEach(r => {
      agriculturalStats.pesticideAmount += r.totalAmount || 0;
    });
    agriculturalStats.totalAmount = agriculturalStats.fertilizerAmount + agriculturalStats.pesticideAmount;

    // ========== 5. 预支款统计 ==========
    const advanceRecords = await queryAll('business_records', { type: 'advance' }, {
      fields: { amount: true, totalAmount: true }
    });

    let advanceStats = {
      count: advanceRecords.length,
      totalAmount: 0
    };

    advanceRecords.forEach(r => {
      advanceStats.totalAmount += r.totalAmount || r.amount || 0;
    });

    // ========== 6. 结算统计 ==========
    const allSettlements = await queryAll('settlements', {}, {
      fields: { status: true, acquisitionAmount: true, totalDeduction: true, actualPayment: true, paymentMethod: true }
    });

    let settlementStats = {
      totalCount: allSettlements.length,
      pendingCount: 0,
      pendingAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      completedCount: 0,
      completedAmount: 0,
      rejectedCount: 0,
      totalAcquisitionAmount: 0,
      totalDeduction: 0,
      totalActualPayment: 0
    };

    // 付款方式统计
    let paymentMethodStats = {
      wechat: { count: 0, amount: 0 },
      alipay: { count: 0, amount: 0 },
      bank: { count: 0, amount: 0 },
      cash: { count: 0, amount: 0 }
    };

    allSettlements.forEach(s => {
      const amount = s.actualPayment || 0;
      settlementStats.totalAcquisitionAmount += s.acquisitionAmount || 0;
      settlementStats.totalDeduction += s.totalDeduction || 0;
      settlementStats.totalActualPayment += amount;

      switch (s.status) {
        case 'pending':
          settlementStats.pendingCount++;
          settlementStats.pendingAmount += amount;
          break;
        case 'approved':
          settlementStats.approvedCount++;
          settlementStats.approvedAmount += amount;
          break;
        case 'completed':
          settlementStats.completedCount++;
          settlementStats.completedAmount += amount;
          // 付款方式统计
          const method = s.paymentMethod || 'cash';
          if (paymentMethodStats[method]) {
            paymentMethodStats[method].count++;
            paymentMethodStats[method].amount += amount;
          }
          break;
        case 'rejected':
          settlementStats.rejectedCount++;
          break;
      }
    });

    // ========== 7. 仓库统计 ==========
    const warehousesRes = await db.collection('warehouses').where({ status: 'active' }).get();
    const warehouses = warehousesRes.data;

    const warehouseStats = [];
    for (const warehouse of warehouses) {
      const warehouseAcquisitions = await queryAll('acquisitions',
        { warehouseId: warehouse._id, status: _.neq('deleted') },
        { fields: { netWeight: true, weight: true, totalAmount: true, amount: true } }
      );

      let totalWeight = 0;
      let totalAmount = 0;
      warehouseAcquisitions.forEach(a => {
        totalWeight += a.netWeight || a.weight || 0;
        totalAmount += a.totalAmount || a.amount || 0;
      });

      warehouseStats.push({
        _id: warehouse._id,
        name: warehouse.name,
        code: warehouse.code,
        acquisitionCount: warehouseAcquisitions.length,
        totalWeight: Number(totalWeight.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2))
      });
    }

    return {
      success: true,
      data: {
        // 签约
        farmer: {
          count: farmerStats.count,
          totalAcreage: Number(farmerStats.totalAcreage.toFixed(2)),
          totalDeposit: Number(farmerStats.totalDeposit.toFixed(2)),
          totalSeedTotal: Number(farmerStats.totalSeedTotal.toFixed(2)),
          totalSeedDebt: Number(farmerStats.totalSeedDebt.toFixed(2)),
          totalAgriculturalDebt: Number(farmerStats.totalAgriculturalDebt.toFixed(2)),
          totalAdvancePayment: Number(farmerStats.totalAdvancePayment.toFixed(2))
        },
        // 发苗
        seed: {
          count: seedStats.count,
          totalQuantity: Number(seedStats.totalQuantity.toFixed(2)),
          totalAmount: Number(seedStats.totalAmount.toFixed(2))
        },
        // 收购
        acquisition: {
          count: acquisitionStats.count,
          totalWeight: Number(acquisitionStats.totalWeight.toFixed(2)),
          totalAmount: Number(acquisitionStats.totalAmount.toFixed(2))
        },
        // 农资
        agricultural: {
          fertilizerCount: agriculturalStats.fertilizerCount,
          fertilizerAmount: Number(agriculturalStats.fertilizerAmount.toFixed(2)),
          pesticideCount: agriculturalStats.pesticideCount,
          pesticideAmount: Number(agriculturalStats.pesticideAmount.toFixed(2)),
          totalAmount: Number(agriculturalStats.totalAmount.toFixed(2))
        },
        // 预支款
        advance: {
          count: advanceStats.count,
          totalAmount: Number(advanceStats.totalAmount.toFixed(2))
        },
        // 结算
        settlement: {
          totalCount: settlementStats.totalCount,
          pendingCount: settlementStats.pendingCount,
          pendingAmount: Number(settlementStats.pendingAmount.toFixed(2)),
          approvedCount: settlementStats.approvedCount,
          approvedAmount: Number(settlementStats.approvedAmount.toFixed(2)),
          completedCount: settlementStats.completedCount,
          completedAmount: Number(settlementStats.completedAmount.toFixed(2)),
          totalDeduction: Number(settlementStats.totalDeduction.toFixed(2))
        },
        // 付款方式
        paymentMethod: {
          wechat: { count: paymentMethodStats.wechat.count, amount: Number(paymentMethodStats.wechat.amount.toFixed(2)) },
          alipay: { count: paymentMethodStats.alipay.count, amount: Number(paymentMethodStats.alipay.amount.toFixed(2)) },
          bank: { count: paymentMethodStats.bank.count, amount: Number(paymentMethodStats.bank.amount.toFixed(2)) },
          cash: { count: paymentMethodStats.cash.count, amount: Number(paymentMethodStats.cash.amount.toFixed(2)) }
        },
        // 仓库
        warehouses: warehouseStats
      }
    };
  } catch (error) {
    console.error('获取管理员仪表盘数据失败:', error);
    throw error;
  }
}
