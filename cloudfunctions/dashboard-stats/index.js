// 普惠农录 - 首页统计数据云函数
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 获取今日收购记录
    const todayAcquisitions = await db.collection('acquisitions').where({
      warehouseId: warehouseId,
      createTime: _.gte(today).and(_.lt(tomorrow))
    }).get();

    // 计算今日统计
    let todayCount = todayAcquisitions.data.length;
    let todayWeight = 0;
    let todayAmount = 0;

    todayAcquisitions.data.forEach(acq => {
      todayWeight += acq.weight || 0;
      todayAmount += acq.totalAmount || 0;
    });

    // 获取累计收购记录
    const allAcquisitions = await db.collection('acquisitions').where({
      warehouseId: warehouseId
    }).get();

    let totalCount = allAcquisitions.data.length;
    let totalWeight = 0;
    let totalAmount = 0;

    allAcquisitions.data.forEach(acq => {
      totalWeight += acq.weight || 0;
      totalAmount += acq.totalAmount || 0;
    });

    // 获取库存统计（这里简化处理，实际应该从 inventory 表获取）
    const inventoryCount = warehouse.inventoryCount || 0;
    const inventoryWeight = warehouse.inventoryWeight || 0;

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
          count: todayCount,
          weight: todayWeight,
          amount: todayAmount
        },
        total: {
          count: totalCount,
          weight: totalWeight,
          amount: totalAmount
        },
        inventory: {
          count: inventoryCount,
          weight: inventoryWeight
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
    const pendingSettlements = await db.collection('settlements').where({
      auditStatus: 'pending'
    }).get();

    // 获取待支付结算单
    const approvedSettlements = await db.collection('settlements').where({
      auditStatus: 'approved',
      paymentStatus: 'unpaid'
    }).get();

    // 计算待支付总额
    let totalPendingAmount = 0;
    approvedSettlements.data.forEach(settlement => {
      totalPendingAmount += settlement.finalAmount || 0;
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
