/**
 * 农户管理云函数 - 使用 userId
 * 
 * 功能：
 * - create: 创建农户档案
 * - get: 获取农户详情
 * - list: 获取农户列表
 * - update: 更新农户信息
 * - delete: 删除农户（软删除）
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 引入精确计算工具
const { multiply, add, subtract, roundToFen } = require('./calc');

/**
 * 生成农户编号
 * 格式：PH10001 起步，全局自增（事务保证并发安全）
 */
async function generateFarmerId() {
  const counterId = 'farmer_id_global';
  const START_SEQ = 10001;

  const seq = await db.runTransaction(async (t) => {
    const res = await t.collection('id_counters')
      .where({ _id: counterId })
      .limit(1)
      .get();

    if (!res.data || res.data.length === 0) {
      await t.collection('id_counters').add({
        data: {
          _id: counterId,
          bizType: 'farmer',
          seq: START_SEQ,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      return START_SEQ;
    }

    const current = Number(res.data[0].seq || START_SEQ - 1);
    const next = current + 1;
    await t.collection('id_counters').doc(counterId).update({
      data: {
        seq: next,
        updateTime: db.serverDate()
      }
    });
    return next;
  });

  return `PH${seq}`;
}

function normalizeFarmerLookupValue(farmerId) {
  const value = String(farmerId || '').trim();
  return value || '';
}

async function findFarmerByAnyId(farmerId, extraWhere = {}) {
  const value = normalizeFarmerLookupValue(farmerId);
  if (!value) return null;

  let res = await db.collection('farmers')
    .where({ farmerId: value, ...extraWhere })
    .limit(1)
    .get();
  if (res.data && res.data.length > 0) return res.data[0];

  res = await db.collection('farmers')
    .where({ _id: value, ...extraWhere })
    .limit(1)
    .get();
  if (res.data && res.data.length > 0) return res.data[0];

  return null;
}

/**
 * 创建农户档案
 */
async function createFarmer(event) {
  const { userId, data } = event;

  // 验证用户ID
  if (!userId) {
    return {
      success: false,
      message: '缺少用户ID'
    };
  }

  const {
    name,
    phone,
    idCard,
    address,
    acreage,
    grade,
    deposit,
    firstManager,
    secondManager,
    seedTotal,
    seedUnitPrice,
    receivableAmount,
    seedDebt
  } = data;

  // 数据验证
  if (!name || !phone || !idCard || !address || !acreage || !firstManager) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }

  if (!address.county || !address.township || !address.village) {
    return {
      success: false,
      message: '种植地址不完整'
    };
  }

  try {
    // 检查手机号是否已存在
    const existingPhone = await db.collection('farmers')
      .where({ phone, isDeleted: false })
      .count();

    if (existingPhone.total > 0) {
      return {
        success: false,
        message: '该手机号已被注册'
      };
    }

    // 检查身份证号是否已存在
    const existingIdCard = await db.collection('farmers')
      .where({ idCard, isDeleted: false })
      .count();

    if (existingIdCard.total > 0) {
      return {
        success: false,
        message: '该身份证号已被注册'
      };
    }

    // 获取当前用户信息
    const userRes = await db.collection('users').doc(userId).get();

    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 生成农户编号
    const farmerId = await generateFarmerId();

    // 构造农户数据
    const farmerData = {
      farmerId,
      name,
      phone,
      idCard,
      address: {
        county: address.county,
        township: address.township,
        village: address.village
      },
      addressText: `${address.county}${address.township}${address.village}`,
      acreage: parseFloat(acreage) || 0,
      grade: grade || 'C',
      deposit: parseFloat(deposit) || 0,
      firstManager: firstManager,
      firstManagerId: '', // TODO: 如果需要关联到用户表
      secondManager: secondManager || '',
      secondManagerId: '',
      seedTotal: parseFloat(seedTotal) || 0,
      seedUnitPrice: parseFloat(seedUnitPrice) || 0,
      receivableAmount: parseFloat(receivableAmount) || 0,
      seedDebt: parseFloat(seedDebt) || 0,
      agriculturalDebt: 0,  // 农资款欠款
      agriculturalPaidAmount: 0, // 农资已付款
      advancePayment: 0,    // 预支款项
      stats: {
        // 发苗统计
        totalSeedDistributed: 0,
        totalSeedAmount: 0,
        totalSeedArea: 0,
        seedDistributionCount: 0,
        lastSeedDistributionDate: null,

        // 收购统计
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,

        // 结算/欠款统计
        totalPaidAmount: 0,
        seedDebt: parseFloat(seedDebt) || 0,
        agriculturalDebt: 0,
        agriculturalPaidAmount: 0,
        advancePayment: 0
      },
      status: 'active',
      isDeleted: false,
      createBy: userId,
      createByName: currentUser.name,
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    // 创建农户记录
    const result = await db.collection('farmers').add({
      data: farmerData
    });

    console.log('农户创建成功:', farmerId);

    return {
      success: true,
      message: '农户创建成功',
      data: {
        farmerId: farmerId,
        _id: result._id
      }
    };

  } catch (error) {
    console.error('创建农户失败:', error);
    return {
      success: false,
      message: error.message || '创建农户失败'
    };
  }
}

/**
 * 获取农户详情
 */
async function getFarmer(event) {
  const { farmerId } = event;

  if (!farmerId) {
    return {
      success: false,
      message: '缺少农户ID'
    };
  }

  try {
    const value = normalizeFarmerLookupValue(farmerId);
    if (!value) {
      return {
        success: false,
        message: '缺少农户ID'
      };
    }

    const farmer = await findFarmerByAnyId(value, { isDeleted: false });
    if (!farmer) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    return {
      success: true,
      data: farmer
    };

  } catch (error) {
    console.error('获取农户详情失败:', error);
    return {
      success: false,
      message: error.message || '获取农户详情失败'
    };
  }
}

/**
 * 获取农户列表
 */
async function listFarmers(event) {
  const { userId, page = 1, pageSize = 20, keyword = '', status = '', seedStatus = '' } = event;

  // userId 必填
  if (!userId) {
    return {
      success: false,
      message: '请先登录'
    };
  }

  try {
    // 构建基础查询条件
    let baseConditions = [{ isDeleted: false }];

    // 获取用户信息，校验登录状态
    try {
      const userRes = await db.collection('users').doc(userId).get();
      if (!userRes.data) {
        return {
          success: false,
          message: '用户不存在'
        };
      }
    } catch (userErr) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    // 关键词搜索（姓名或手机号）
    if (keyword && keyword.trim()) {
      const searchRegex = db.RegExp({
        regexp: keyword.trim(),
        options: 'i'
      });
      baseConditions.push(_.or([
        { name: searchRegex },
        { phone: searchRegex }
      ]));
    }

    // 普通状态筛选
    if (status) {
      baseConditions.push({ status: status });
    }

    // 发苗状态筛选
    if (seedStatus) {
      if (seedStatus === 'completed') {
        // 已完成：seedDistributionComplete = true
        baseConditions.push({ seedDistributionComplete: true });
      } else if (seedStatus === 'inProgress') {
        // 发苗中：未完成 且 有发苗记录
        baseConditions.push({ seedDistributionComplete: _.neq(true) });
        baseConditions.push({ 'stats.seedDistributionCount': _.gt(0) });
      } else if (seedStatus === 'pending') {
        // 未发苗：未完成 且 无发苗记录
        baseConditions.push({ seedDistributionComplete: _.neq(true) });
        baseConditions.push(_.or([
          { 'stats.seedDistributionCount': _.exists(false) },
          { 'stats.seedDistributionCount': 0 },
          { 'stats.seedDistributionCount': _.lte(0) }
        ]));
      }
    }

    // 组合查询条件
    const queryCondition = _.and(baseConditions);

    // 查询总数
    const countResult = await db.collection('farmers')
      .where(queryCondition)
      .count();

    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * pageSize;
    const result = await db.collection('farmers')
      .where(queryCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: {
        list: result.data,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };

  } catch (error) {
    console.error('获取农户列表失败:', error);
    return {
      success: false,
      message: error.message || '获取农户列表失败'
    };
  }
}

/**
 * 更新农户信息
 */
async function updateFarmer(event) {
  const { userId, farmerId, data } = event;

  if (!userId || !farmerId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    // 检查农户是否存在
    const farmerRes = await db.collection('farmers')
      .where({
        _id: farmerId,
        isDeleted: false
      })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];

    // 权限检查：只有创建者或管理员可以修改
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;
    if (currentUser.role === 'assistant' && farmer.createBy !== userId) {
      // 助理可跨农户执行“发苗完成标记”相关更新，其他字段仍受限
      const allowedFields = new Set([
        'seedDistributionComplete',
        'seedDistributionCompleteTime',
        'seedDistributionCompleteBy',
        'seedDistributionCompleteByName'
      ]);
      const updateKeys = Object.keys(data || {});
      const isOnlySeedProgressUpdate = updateKeys.length > 0 && updateKeys.every((key) => allowedFields.has(key));

      if (!isOnlySeedProgressUpdate) {
        return {
          success: false,
          message: '无权修改此农户信息'
        };
      }
    }

    // 更新数据
    const updateData = {
      ...data,
      updateTime: db.serverDate()
    };

    await db.collection('farmers')
      .doc(farmerId)
      .update({
        data: updateData
      });

    // 同步冗余字段到关联表（非核心操作，失败不影响主流程）
    const nameChanged = updateData.name && updateData.name !== farmer.name;
    const phoneChanged = updateData.phone && updateData.phone !== farmer.phone;

    if (nameChanged || phoneChanged) {
      const syncUpdates = {};
      if (nameChanged) syncUpdates.farmerName = updateData.name;
      if (phoneChanged) syncUpdates.farmerPhone = updateData.phone;
      syncUpdates.updateTime = db.serverDate();

      try {
        const farmerIdValue = farmer.farmerId;
        await Promise.all([
          db.collection('acquisitions').where({ farmerId: farmerIdValue }).update({ data: syncUpdates }),
          db.collection('settlements').where({ farmerId: farmerIdValue }).update({ data: syncUpdates }),
          db.collection('seed_records').where({ farmerId: farmerIdValue }).update({ data: syncUpdates }),
          db.collection('business_records').where({ farmerId: farmerId }).update({ data: syncUpdates })
        ]);
      } catch (syncError) {
        console.error('同步冗余字段失败（不影响主流程）:', syncError);
      }
    }

    return {
      success: true,
      message: '更新成功'
    };

  } catch (error) {
    console.error('更新农户失败:', error);
    return {
      success: false,
      message: error.message || '更新农户失败'
    };
  }
}

/**
 * 删除农户（软删除）
 */
async function deleteFarmer(event) {
  const { userId, farmerId } = event;

  if (!userId || !farmerId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    // 检查农户是否存在
    const farmerRes = await db.collection('farmers')
      .where({
        _id: farmerId,
        isDeleted: false
      })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];

    // 权限检查
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;
    if (currentUser.role === 'assistant' && farmer.createBy !== userId) {
      return {
        success: false,
        message: '无权删除此农户'
      };
    }

    // 检查是否有未完成的结算单
    const pendingSettlements = await db.collection('settlements')
      .where({
        farmerId: farmer.farmerId,
        status: _.and(_.neq('completed'), _.neq('deleted'))
      })
      .count();

    if (pendingSettlements.total > 0) {
      return {
        success: false,
        message: `该农户还有 ${pendingSettlements.total} 笔未完成的结算单，请先处理后再删除`
      };
    }

    // 检查是否有未结清欠款
    const seedDebt = farmer.seedDebt || farmer.stats?.seedDebt || 0;
    const agriculturalDebt = farmer.agriculturalDebt || farmer.stats?.agriculturalDebt || 0;
    const totalDebt = seedDebt + agriculturalDebt;
    if (totalDebt > 0) {
      return {
        success: false,
        message: `该农户还有 ¥${totalDebt.toFixed(2)} 未结清欠款，请先处理后再删除`
      };
    }

    // 软删除
    await db.collection('farmers')
      .doc(farmerId)
      .update({
        data: {
          isDeleted: true,
          deleteTime: db.serverDate(),
          deleteBy: userId
        }
      });

    return {
      success: true,
      message: '删除成功'
    };

  } catch (error) {
    console.error('删除农户失败:', error);
    return {
      success: false,
      message: error.message || '删除农户失败'
    };
  }
}

/**
 * 追加签约信息
 * 更新农户累计值 + 写入业务记录表
 */
async function addFarmerAddendum(event) {
  const { userId, userName, farmerId, data } = event;

  if (!userId || !farmerId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  const {
    addedAcreage,        // 追加面积
    addedSeedTotal,      // 追加种苗（万株）
    addedSeedUnitPrice,  // 种苗单价
    addedReceivable,     // 追加应收款
    addedDeposit,        // 追加定金
    remark
  } = data;

  // 验证追加面积
  const acreage = parseFloat(addedAcreage) || 0;
  if (acreage <= 0) {
    return {
      success: false,
      message: '请输入有效的追加面积'
    };
  }

  try {
    // 1. 获取当前农户信息
    const farmerRes = await db.collection('farmers')
      .where({ _id: farmerId, isDeleted: false })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];

    // 2. 计算新的累计值 - 使用精确计算
    const seedTotal = parseFloat(addedSeedTotal) || 0;
    const seedUnitPrice = parseFloat(addedSeedUnitPrice) || 0;
    const receivable = parseFloat(addedReceivable) || multiply(seedTotal, seedUnitPrice);
    const deposit = parseFloat(addedDeposit) || 0;

    const newAcreage = roundToFen(add(farmer.acreage || 0, acreage));
    const newSeedTotal = roundToFen(add(farmer.seedTotal || 0, seedTotal));
    const newReceivable = roundToFen(add(farmer.receivableAmount || 0, receivable));
    const newDeposit = roundToFen(add(farmer.deposit || 0, deposit));
    // 定金独立管理，不影响种苗欠款（种苗欠款 = 累计发苗金额 - 结算已扣，定金在合同结束时单独退还）

    // 3. 生成业务记录编号
    const now = new Date();
    const recordId = `BIZ_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // ==================== 事务操作开始 ====================
    const transaction = await db.startTransaction();

    try {
      // 4. 更新农户主表
      await transaction.collection('farmers').doc(farmerId).update({
        data: {
          acreage: newAcreage,
          seedTotal: newSeedTotal,
          receivableAmount: newReceivable,
          deposit: newDeposit,
          updateTime: db.serverDate()
        }
      });

      // 5. 写入业务记录表
      await transaction.collection('business_records').add({
        data: {
          recordId,
          farmerId,
          farmerName: farmer.name,
          type: 'addendum',

          // 追加内容
          addedAcreage: acreage,
          addedSeedTotal: seedTotal,
          addedSeedUnitPrice: seedUnitPrice,
          addedReceivable: receivable,
          addedDeposit: deposit,

          // 追加后的快照
          snapshotAcreage: newAcreage,
          snapshotSeedTotal: newSeedTotal,
          snapshotReceivable: newReceivable,
          snapshotDeposit: newDeposit,

          remark: remark || '',
          createTime: db.serverDate(),
          createBy: userId,
          createByName: userName || ''
        }
      });

      // 提交事务
      await transaction.commit();
    } catch (transactionError) {
      // 事务失败，回滚
      await transaction.rollback();
      console.error('追加签约事务失败:', transactionError);
      throw transactionError;
    }
    // ==================== 事务操作结束 ====================

    return {
      success: true,
      message: '追加成功',
      data: {
        newAcreage,
        newSeedTotal,
        newReceivable,
        newDeposit
      }
    };

  } catch (error) {
    console.error('追加签约失败:', error);
    return {
      success: false,
      message: error.message || '追加签约失败'
    };
  }
}

/**
 * 预支款登记
 * 记录预付给农户的现金，结算时从货款中扣除
 */
async function addAdvancePayment(event) {
  const { userId, userName, farmerId, data } = event;

  if (!userId || !farmerId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  const { amount, remark, paymentDate } = data;

  // 验证金额
  const paymentAmount = parseFloat(amount) || 0;
  if (paymentAmount <= 0) {
    return {
      success: false,
      message: '请输入有效的预支金额'
    };
  }

  try {
    // 1. 获取当前农户信息
    const farmerRes = await db.collection('farmers')
      .where({ _id: farmerId, isDeleted: false })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];

    // 2. 计算新的预支款余额 - 使用精确计算
    const currentAdvance = farmer.advancePayment || 0;
    const newAdvancePayment = roundToFen(add(currentAdvance, paymentAmount));

    // 3. 生成业务记录编号
    const now = new Date();
    const recordId = `ADV_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // ==================== 事务操作开始 ====================
    const transaction = await db.startTransaction();

    try {
      // 4. 更新农户主表的预支款字段
      await transaction.collection('farmers').doc(farmerId).update({
        data: {
          advancePayment: newAdvancePayment,
          updateTime: db.serverDate()
        }
      });

      // 5. 写入业务记录表
      await transaction.collection('business_records').add({
        data: {
          recordId,
          farmerId,
          farmerName: farmer.name,
          type: 'advance',  // 预支款类型

          // 预支款信息
          amount: paymentAmount,
          paymentDate: paymentDate || now.toISOString().split('T')[0],

          // 余额快照（记录此次操作后的余额）
          snapshotAdvancePayment: newAdvancePayment,

          remark: remark || '',
          createTime: db.serverDate(),
          createBy: userId,
          createByName: userName || ''
        }
      });

      // 提交事务
      await transaction.commit();
    } catch (transactionError) {
      // 事务失败，回滚
      await transaction.rollback();
      console.error('预支款登记事务失败:', transactionError);
      throw transactionError;
    }
    // ==================== 事务操作结束 ====================

    // 非核心操作：记录操作日志（事务外，失败不影响主流程）
    try {
      await db.collection('operation_logs').add({
        data: {
          userId,
          userName: userName || '',
          userRole: 'assistant',
          action: 'add_advance_payment',
          module: 'farmer',
          targetId: farmerId,
          targetName: farmer.name,
          description: `预支款 ¥${paymentAmount}，累计预支 ¥${newAdvancePayment}`,
          before: { advancePayment: currentAdvance },
          after: { advancePayment: newAdvancePayment },
          createTime: db.serverDate()
        }
      });
    } catch (logError) {
      console.error('预支款操作日志写入失败（不影响主流程）:', logError);
    }

    return {
      success: true,
      message: '预支款登记成功',
      data: {
        amount: paymentAmount,
        newAdvancePayment: newAdvancePayment
      }
    };

  } catch (error) {
    console.error('预支款登记失败:', error);
    return {
      success: false,
      message: error.message || '预支款登记失败'
    };
  }
}

/**
 * 获取农户发苗状态统计
 * 返回各状态的农户数量：all, pending, inProgress, completed
 * 以及聚合统计：totalAcreage, totalSeedTotal, totalSeedDistributed
 */
async function getFarmerStatusStats(event) {
  const { userId } = event;

  if (!userId) {
    return {
      success: false,
      message: '请先登录'
    };
  }

  try {
    // 构建基础查询条件
    let baseCondition = { isDeleted: false };
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    // 统计总数
    const allCount = await db.collection('farmers')
      .where(baseCondition)
      .count();

    // 统计已完成
    const completedCount = await db.collection('farmers')
      .where(_.and([
        baseCondition,
        { seedDistributionComplete: true }
      ]))
      .count();

    // 统计发苗中（未完成 且 有发苗记录）
    const inProgressCount = await db.collection('farmers')
      .where(_.and([
        baseCondition,
        { seedDistributionComplete: _.neq(true) },
        { 'stats.seedDistributionCount': _.gt(0) }
      ]))
      .count();

    // 统计未发苗（未完成 且 无发苗记录）
    const pendingCount = allCount.total - completedCount.total - inProgressCount.total;

    // 聚合统计：总签约面积、签约种苗、总定金
    let totalAcreage = 0;
    let totalSeedTotal = 0;
    let totalDeposit = 0;

    // 获取所有农户数据进行聚合（分批获取避免超限）
    const batchSize = 100;
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const farmersRes = await db.collection('farmers')
        .where(baseCondition)
        .field({
          acreage: true,
          seedTotal: true,
          deposit: true
        })
        .skip(skip)
        .limit(batchSize)
        .get();

      if (farmersRes.data.length === 0) {
        hasMore = false;
      } else {
        farmersRes.data.forEach(farmer => {
          totalAcreage += (farmer.acreage || 0);
          totalSeedTotal += (farmer.seedTotal || 0);
          totalDeposit += (farmer.deposit || 0);
        });
        skip += batchSize;
        if (farmersRes.data.length < batchSize) {
          hasMore = false;
        }
      }
    }

    // 已发种苗从 seed_records 实时聚合（与 dashboard 口径一致）
    const seedAggRes = await db.collection('seed_records')
      .aggregate()
      .match({ status: _.neq('deleted') })
      .group({
        _id: null,
        totalDistributed: $.sum('$quantity')
      })
      .end();
    const totalSeedDistributed = seedAggRes.list[0]?.totalDistributed || 0;

    return {
      success: true,
      data: {
        all: allCount.total,
        pending: Math.max(0, pendingCount),
        inProgress: inProgressCount.total,
        completed: completedCount.total,
        totalAcreage: Number(totalAcreage.toFixed(2)),
        totalSeedTotal: Number(totalSeedTotal.toFixed(2)),
        totalSeedDistributed: Number(totalSeedDistributed.toFixed(2)),
        totalDeposit: Number(totalDeposit.toFixed(2))
      }
    };

  } catch (error) {
    console.error('获取农户状态统计失败:', error);
    return {
      success: false,
      message: error.message || '获取农户状态统计失败'
    };
  }
}

/**
 * 农资发放登记（化肥/农药）
 * 记录发放给农户的农资，结算时从货款中扣除
 * @param {string} type - 类型：fertilizer(化肥) / pesticide(农药)
 * @param {string} name - 名称
 * @param {string} category - 种类
 * @param {number} quantity - 数量/重量
 * @param {string} unit - 单位
 * @param {number} unitPrice - 单价
 * @param {number} amount - 金额（自动计算）
 * @param {number} paidAmount - 已支付金额
 * @param {string} remark - 备注
 */
async function addAgriculturalSupply(event) {
  const { userId, userName, farmerId, data } = event;

  if (!userId || !farmerId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  const {
    type,         // fertilizer 或 pesticide
    name,         // 名称（如：复合肥、尿素、吡虫啉等）
    category,     // 种类
    quantity,     // 数量/重量
    unit,         // 单位（袋、瓶、kg等）
    unitPrice,    // 单价
    amount,       // 金额
    paidAmount,   // 已支付金额
    supplyDate,   // 发放日期
    remark        // 备注
  } = data;

  // 验证类型
  if (!type || !['fertilizer', 'pesticide'].includes(type)) {
    return {
      success: false,
      message: '请选择正确的农资类型'
    };
  }

  // 验证名称
  if (!name || !name.trim()) {
    return {
      success: false,
      message: '请输入农资名称'
    };
  }

  // 验证数量
  const qty = parseFloat(quantity) || 0;
  if (qty <= 0) {
    return {
      success: false,
      message: '请输入有效的数量'
    };
  }

  // 验证单价
  const price = parseFloat(unitPrice) || 0;
  if (price <= 0) {
    return {
      success: false,
      message: '请输入有效的单价'
    };
  }

  // 计算金额 - 使用精确计算
  const totalAmount = parseFloat(amount) || multiply(qty, price);
  const paid = roundToFen(parseFloat(paidAmount) || 0);

  if (paid < 0) {
    return {
      success: false,
      message: '已支付金额不能小于0'
    };
  }
  if (paid > totalAmount) {
    return {
      success: false,
      message: '已支付金额不能大于农资金额'
    };
  }
  const unpaid = roundToFen(subtract(totalAmount, paid));

  try {
    // 1. 获取当前农户信息
    const farmerRes = await db.collection('farmers')
      .where({ _id: farmerId, isDeleted: false })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];

    // 2. 计算新的农资欠款 - 使用精确计算
    const currentAgriDebt = farmer.agriculturalDebt || 0;
    const currentAgriPaid = farmer.agriculturalPaidAmount || 0;
    const currentFertilizer = farmer.fertilizerAmount || 0;
    const currentPesticide = farmer.pesticideAmount || 0;

    // 农资欠款 = 农资款 - 已支付款（按每笔增量累加）
    const newAgriDebt = roundToFen(add(currentAgriDebt, unpaid));
    const newAgriPaid = roundToFen(add(currentAgriPaid, paid));

    // 根据类型更新对应金额
    const updateData = {
      agriculturalDebt: newAgriDebt,
      agriculturalPaidAmount: newAgriPaid,
      'stats.agriculturalDebt': newAgriDebt,
      'stats.agriculturalPaidAmount': newAgriPaid,
      updateTime: db.serverDate()
    };

    if (type === 'fertilizer') {
      updateData.fertilizerAmount = roundToFen(add(currentFertilizer, totalAmount));
    } else {
      updateData.pesticideAmount = roundToFen(add(currentPesticide, totalAmount));
    }

    // 3. 生成业务记录编号
    const now = new Date();
    const prefix = type === 'fertilizer' ? 'FER' : 'PES';
    const recordId = `${prefix}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    const typeName = type === 'fertilizer' ? '化肥' : '农药';

    // ==================== 事务操作开始 ====================
    const transaction = await db.startTransaction();

    try {
      // 4. 更新农户主表
      await transaction.collection('farmers').doc(farmerId).update({
        data: updateData
      });

      // 5. 写入业务记录表
      await transaction.collection('business_records').add({
        data: {
          recordId,
          farmerId,
          farmerName: farmer.name,
          type,  // fertilizer 或 pesticide

          // 农资信息
          name: name.trim(),
          category: category || '',
          quantity: qty,
          unit: unit || (type === 'fertilizer' ? '袋' : '瓶'),
          unitPrice: price,
          totalAmount: totalAmount,
          paidAmount: paid,
          unpaidAmount: unpaid,
          supplyDate: supplyDate || now.toISOString().split('T')[0],

          // 余额快照
          snapshotAgriDebt: newAgriDebt,
          snapshotAgriPaid: newAgriPaid,
          snapshotFertilizer: type === 'fertilizer' ? (currentFertilizer + totalAmount) : currentFertilizer,
          snapshotPesticide: type === 'pesticide' ? (currentPesticide + totalAmount) : currentPesticide,

          remark: remark || '',
          createTime: db.serverDate(),
          createBy: userId,
          createByName: userName || ''
        }
      });

      // 提交事务
      await transaction.commit();
    } catch (transactionError) {
      // 事务失败，回滚
      await transaction.rollback();
      console.error('农资发放事务失败:', transactionError);
      throw transactionError;
    }
    // ==================== 事务操作结束 ====================

    // 非核心操作：记录操作日志（事务外，失败不影响主流程）
    try {
      await db.collection('operation_logs').add({
        data: {
          userId,
          userName: userName || '',
          userRole: 'assistant',
          action: 'add_agricultural_supply',
          module: 'farmer',
          targetId: farmerId,
          targetName: farmer.name,
          description: `发放${typeName}：${name}，${qty}${unit || ''}，金额 ¥${totalAmount}，已付 ¥${paid}，欠款 ¥${unpaid}，农资欠款累计 ¥${newAgriDebt}`,
          before: { agriculturalDebt: currentAgriDebt, agriculturalPaidAmount: currentAgriPaid },
          after: { agriculturalDebt: newAgriDebt, agriculturalPaidAmount: newAgriPaid },
          createTime: db.serverDate()
        }
      });
    } catch (logError) {
      console.error('农资发放操作日志写入失败（不影响主流程）:', logError);
    }

    return {
      success: true,
      message: `${typeName}发放成功`,
      data: {
        recordId,
        name,
        quantity: qty,
        unitPrice: price,
        totalAmount,
        paidAmount: paid,
        unpaidAmount: unpaid,
        newAgriDebt,
        newAgriPaid,
        newFertilizerAmount: type === 'fertilizer' ? (currentFertilizer + totalAmount) : currentFertilizer,
        newPesticideAmount: type === 'pesticide' ? (currentPesticide + totalAmount) : currentPesticide
      }
    };

  } catch (error) {
    console.error('农资发放失败:', error);
    return {
      success: false,
      message: error.message || '农资发放失败'
    };
  }
}

/**
 * 定金处理（退还/扣除）—— 出纳/管理员操作
 * depositStatus: 'returned'=已退还（农户履约）, 'forfeited'=已扣除（农户违约）
 *
 * @param {string} event.data.handleType - 'return' 退还 | 'forfeit' 扣除
 * @param {string} event.data.paymentMethod - 退还方式（仅退还时有意义）：cash/wechat/bank
 * @param {string} event.data.reason - 扣除原因（仅扣除时必填）
 * @param {string} event.data.remark - 备注
 */
async function handleDeposit(event) {
  const { userId, userName, farmerId, data } = event;

  if (!userId || !farmerId) {
    return { success: false, message: '缺少必要参数' };
  }

  const {
    handleType,      // 'return' 退还 | 'forfeit' 扣除
    paymentMethod,   // 退还方式：cash/wechat/bank（退还时用）
    reason,          // 扣除原因（扣除时必填）
    remark
  } = data || {};

  const isReturn = handleType === 'return';
  const isForfeit = handleType === 'forfeit';

  if (!isReturn && !isForfeit) {
    return { success: false, message: '无效的操作类型，请指定 return 或 forfeit' };
  }

  if (isForfeit && !reason) {
    return { success: false, message: '扣除定金时必须填写原因' };
  }

  try {
    // 1. 权限检查：只有出纳和管理员可操作
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return { success: false, message: '用户不存在' };
    }
    const currentUser = userRes.data;
    if (!['cashier', 'admin'].includes(currentUser.role)) {
      return { success: false, message: '无权限操作，请使用出纳或管理员账号' };
    }

    // 2. 获取农户信息
    const farmerRes = await db.collection('farmers')
      .where({ _id: farmerId, isDeleted: false })
      .get();
    if (farmerRes.data.length === 0) {
      return { success: false, message: '农户不存在' };
    }
    const farmer = farmerRes.data[0];

    const depositAmount = farmer.deposit || 0;
    if (depositAmount <= 0) {
      return { success: false, message: '该农户无定金可处理' };
    }

    // 检查是否已处理（兼容旧字段 depositReturned）
    if (farmer.depositStatus === 'returned' || farmer.depositStatus === 'forfeited' || farmer.depositReturned) {
      const statusText = (farmer.depositStatus === 'forfeited') ? '已扣除' : '已退还';
      return { success: false, message: `该农户定金${statusText}，请勿重复操作` };
    }

    // 付款方式名称映射
    const methodNames = {
      'cash': '现金',
      'wechat': '微信转账',
      'bank': '银行转账'
    };

    const actionLabel = isReturn ? '退还' : '扣除';
    const bizType = isReturn ? 'deposit_return' : 'deposit_forfeit';
    const bizName = isReturn ? '定金退还' : '定金扣除';
    const depositStatus = isReturn ? 'returned' : 'forfeited';
    const descText = isReturn
      ? `退还定金¥${depositAmount}，${methodNames[paymentMethod] || '现金'}`
      : `扣除定金¥${depositAmount}，原因：${reason}`;

    // 3. 生成业务记录编号
    const now = new Date();
    const recordId = `BIZ_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // 4. 事务操作
    const transaction = await db.startTransaction();
    try {
      // 更新农户：标记定金状态
      const farmerUpdate = {
        depositStatus,
        depositHandleAmount: depositAmount,
        depositHandleTime: db.serverDate(),
        depositHandleBy: userId,
        depositHandleByName: currentUser.name,
        // 兼容旧字段
        depositReturned: isReturn,
        depositReturnedAmount: isReturn ? depositAmount : 0,
        updateTime: db.serverDate()
      };
      if (isReturn) {
        farmerUpdate.depositReturnMethod = paymentMethod || 'cash';
      }
      if (isForfeit) {
        farmerUpdate.depositForfeitReason = reason;
      }

      await transaction.collection('farmers').doc(farmerId).update({
        data: farmerUpdate
      });

      // 写入业务往来记录
      await transaction.collection('business_records').add({
        data: {
          recordId,
          farmerId,
          farmerName: farmer.name,
          type: bizType,
          name: bizName,
          date: now.toISOString().split('T')[0],
          amount: depositAmount,
          desc: descText,
          paymentMethod: isReturn ? (paymentMethod || 'cash') : '',
          forfeitReason: isForfeit ? reason : '',
          remark: remark || '',
          createTime: db.serverDate(),
          createBy: userId,
          createByName: currentUser.name
        }
      });

      await transaction.commit();
    } catch (transactionError) {
      await transaction.rollback();
      console.error(`定金${actionLabel}事务失败:`, transactionError);
      throw transactionError;
    }

    // 5. 记录操作日志（事务外，失败不影响主流程）
    try {
      await db.collection('operation_logs').add({
        data: {
          userId: currentUser._id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: isReturn ? 'return_deposit' : 'forfeit_deposit',
          module: 'farmer',
          targetId: farmerId,
          targetName: farmer.name,
          description: `${actionLabel}定金：${farmer.name}，金额¥${depositAmount}${isForfeit ? '，原因：' + reason : ''}`,
          createTime: db.serverDate()
        }
      });
    } catch (logError) {
      console.error(`定金${actionLabel}日志写入失败（不影响主流程）:`, logError);
    }

    return {
      success: true,
      message: `定金${actionLabel}成功`,
      data: {
        farmerName: farmer.name,
        depositAmount,
        depositStatus
      }
    };

  } catch (error) {
    console.error(`定金处理失败:`, error);
    return {
      success: false,
      message: error.message || '定金处理失败'
    };
  }
}

/**
 * 批量导入农户
 * 仅 admin 可操作，直接写入 farmers 集合，跳过身份证重复的记录
 * 导入完成后更新 id_counters 计数器
 */
async function batchImportFarmers(event) {
  const { userId, farmers } = event;

  if (!userId) {
    return { success: false, message: '缺少用户ID' };
  }

  if (!Array.isArray(farmers) || farmers.length === 0) {
    return { success: false, message: '没有要导入的数据' };
  }

  if (farmers.length > 50) {
    return { success: false, message: '每批最多导入50条' };
  }

  try {
    // 权限检查：仅 admin
    const userRes = await db.collection('users').doc(userId).get();
    if (!userRes.data) {
      return { success: false, message: '用户不存在' };
    }
    if (userRes.data.role !== 'admin') {
      return { success: false, message: '仅管理员可执行批量导入' };
    }

    const currentUser = userRes.data;
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // 预加载所有涉及的助理信息，避免重复查询
    const assistantIds = [...new Set(farmers.map(f => f.assistantId).filter(Boolean))];
    const assistantMap = {};
    for (const aid of assistantIds) {
      try {
        const aRes = await db.collection('users').doc(aid).get();
        if (aRes.data) {
          assistantMap[aid] = aRes.data;
        }
      } catch (e) {
        console.warn('助理ID不存在:', aid);
      }
    }

    for (const item of farmers) {
      try {
        // 检查身份证是否已存在
        const existing = await db.collection('farmers')
          .where({ idCard: item.idCard, isDeleted: false })
          .count();

        if (existing.total > 0) {
          skipped++;
          continue;
        }

        // 根据 assistantId 确定 createBy
        const assistant = item.assistantId ? assistantMap[item.assistantId] : null;
        const createBy = assistant ? assistant._id : userId;
        const createByName = assistant ? assistant.name : currentUser.name;

        const farmerData = {
          farmerId: item.farmerId,
          name: item.name,
          phone: item.phone || '',
          idCard: item.idCard,
          address: {
            county: item.address?.county || '',
            township: item.address?.township || '',
            village: item.address?.village || '',
          },
          addressText: `${item.address?.county || ''}${item.address?.township || ''}${item.address?.village || ''}`,
          acreage: parseFloat(item.acreage) || 0,
          grade: 'C',
          deposit: 0,
          firstManager: item.firstManager || '',
          firstManagerId: '',
          secondManager: item.secondManager || '',
          secondManagerId: '',
          seedTotal: 0,
          seedUnitPrice: 0,
          receivableAmount: 0,
          seedDebt: 0,
          agriculturalDebt: 0,
          agriculturalPaidAmount: 0,
          advancePayment: 0,
          stats: {
            totalSeedDistributed: 0,
            totalSeedAmount: 0,
            totalSeedArea: 0,
            seedDistributionCount: 0,
            lastSeedDistributionDate: null,
            totalAcquisitionCount: 0,
            totalAcquisitionWeight: 0,
            totalAcquisitionAmount: 0,
            totalPaidAmount: 0,
            seedDebt: 0,
            agriculturalDebt: 0,
            agriculturalPaidAmount: 0,
            advancePayment: 0,
          },
          status: 'active',
          isDeleted: false,
          createBy,
          createByName,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
        };

        await db.collection('farmers').add({ data: farmerData });
        imported++;
      } catch (itemError) {
        console.error('导入单条农户失败:', item.farmerId, itemError);
        errors++;
      }
    }

    // 更新 id_counters：找到所有 PH 编号中最大的序号
    try {
      let maxSeq = 0;
      for (const item of farmers) {
        const id = item.farmerId || '';
        if (id.startsWith('PH')) {
          const num = parseInt(id.substring(2), 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }

      if (maxSeq > 0) {
        const counterId = 'farmer_id_global';
        const counterRes = await db.collection('id_counters')
          .where({ _id: counterId })
          .limit(1)
          .get();

        if (counterRes.data && counterRes.data.length > 0) {
          const currentSeq = counterRes.data[0].seq || 0;
          if (maxSeq > currentSeq) {
            await db.collection('id_counters').doc(counterId).update({
              data: { seq: maxSeq, updateTime: db.serverDate() },
            });
          }
        } else {
          await db.collection('id_counters').add({
            data: {
              _id: counterId,
              bizType: 'farmer',
              seq: maxSeq,
              createTime: db.serverDate(),
              updateTime: db.serverDate(),
            },
          });
        }
      }
    } catch (counterError) {
      console.error('更新计数器失败（不影响导入结果）:', counterError);
    }

    console.log(`批量导入完成: imported=${imported}, skipped=${skipped}, errors=${errors}`);

    return {
      success: true,
      message: `导入完成：成功${imported}条，跳过${skipped}条，失败${errors}条`,
      data: { imported, skipped, errors },
    };
  } catch (error) {
    console.error('批量导入农户失败:', error);
    return { success: false, message: error.message || '批量导入失败' };
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'create':
      return await createFarmer(event);

    case 'get':
      return await getFarmer(event);

    case 'list':
      return await listFarmers(event);

    case 'update':
      return await updateFarmer(event);

    case 'delete':
      return await deleteFarmer(event);

    case 'addendum':
      return await addFarmerAddendum(event);

    case 'getBusinessRecords':
      return await getBusinessRecords(event);

    case 'searchByPhone':
      return await searchFarmerByPhone(event);

    case 'getStatusStats':
      return await getFarmerStatusStats(event);

    case 'advancePayment':
      return await addAdvancePayment(event);

    case 'addAgriculturalSupply':
      return await addAgriculturalSupply(event);

    case 'returnDeposit':
    case 'forfeitDeposit':
    case 'handleDeposit':
      return await handleDeposit(event);

    case 'batchImport':
      return await batchImportFarmers(event);

    default:
      return {
        success: false,
        message: '无效的操作类型'
      };
  }
};

/**
 * 获取农户的业务往来记录
 * 只查 business_records 表（所有操作都已写入这张表）
 */
async function getBusinessRecords(event) {
  const { farmerId, page = 1, pageSize = 50 } = event;

  if (!farmerId) {
    return {
      success: false,
      message: '缺少农户ID'
    };
  }

  try {
    // 统一口径：business_records.farmerId 仅按农户文档 _id 查询
    let farmerDocId = farmerId;
    const farmer = await findFarmerByAnyId(farmerId);
    if (farmer && farmer._id) {
      farmerDocId = farmer._id;
    }

    // 只查 business_records 表
    const skip = (page - 1) * pageSize;

    const countRes = await db.collection('business_records')
      .where({ farmerId: farmerDocId })
      .count();

    const listRes = await db.collection('business_records')
      .where({ farmerId: farmerDocId })
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: {
        list: listRes.data || [],
        total: countRes.total || 0,
        page,
        pageSize
      }
    };

  } catch (error) {
    console.error('获取业务记录失败:', error);
    return {
      success: false,
      message: error.message || '获取业务记录失败'
    };
  }
}

/**
 * 通过手机号搜索农户
 */
async function searchFarmerByPhone(event) {
  const { phone } = event;

  if (!phone) {
    return {
      success: false,
      message: '请输入手机号'
    };
  }

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      success: false,
      message: '请输入正确的手机号'
    };
  }

  try {
    const result = await db.collection('farmers')
      .where({
        phone: phone,
        isDeleted: false
      })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        message: '未找到该手机号对应的农户'
      };
    }

    const farmer = result.data[0];

    return {
      success: true,
      data: {
        _id: farmer._id,
        farmerId: farmer.farmerId,
        name: farmer.name,
        phone: farmer.phone,
        grade: farmer.grade || 'C',
        acreage: farmer.acreage || 0,
        seedTotal: farmer.seedTotal || 0,
        seedDebt: farmer.seedDebt || 0,
        seedDistributionComplete: farmer.seedDistributionComplete || false,
        stats: farmer.stats || {},
        county: farmer.address?.county || farmer.county || '',
        township: farmer.address?.township || farmer.township || '',
        village: farmer.address?.village || farmer.village || '',
        addressText: farmer.addressText || `${farmer.address?.county || ''}${farmer.address?.township || ''}${farmer.address?.village || ''}`,
        deposit: farmer.deposit || 0,
        status: farmer.status
      }
    };

  } catch (error) {
    console.error('搜索农户失败:', error);
    return {
      success: false,
      message: error.message || '搜索农户失败'
    };
  }
}
