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

/**
 * 生成农户编号
 * 格式：FAR_YYYYMMDD_XXXX
 */
function generateFarmerId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `FAR_${year}${month}${day}_${random}`;
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
    const farmerId = generateFarmerId();

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
      advancePayment: 0,    // 预支款项
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
    const result = await db.collection('farmers')
      .where({
        _id: farmerId,
        isDeleted: false
      })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    return {
      success: true,
      data: result.data[0]
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

  // userId 必填（助理只能看自己的农户）
  if (!userId) {
    return {
      success: false,
      message: '请先登录'
    };
  }

  try {
    // 构建基础查询条件
    let baseConditions = [{ isDeleted: false }];

    // 获取用户信息，判断权限
    try {
      const userRes = await db.collection('users').doc(userId).get();

      if (userRes.data) {
        const currentUser = userRes.data;

        // 如果是助理，只能看自己创建的农户
        if (currentUser.role === 'assistant') {
          baseConditions.push({ createBy: userId });
        }
        // 管理员、财务可以看所有农户
      }
    } catch (userErr) {
      // 用户不存在，按助理处理（只看自己创建的）
      baseConditions.push({ createBy: userId });
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
      return {
        success: false,
        message: '无权修改此农户信息'
      };
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

    // 2. 计算新的累计值
    const seedTotal = parseFloat(addedSeedTotal) || 0;
    const seedUnitPrice = parseFloat(addedSeedUnitPrice) || 0;
    const receivable = parseFloat(addedReceivable) || (seedTotal * seedUnitPrice);
    const deposit = parseFloat(addedDeposit) || 0;

    const newAcreage = (farmer.acreage || 0) + acreage;
    const newSeedTotal = (farmer.seedTotal || 0) + seedTotal;
    const newReceivable = (farmer.receivableAmount || 0) + receivable;
    const newDeposit = (farmer.deposit || 0) + deposit;
    // 种苗欠款为剩余欠款：追加定金后减少欠款余额
    const currentSeedDebt = Number.isFinite(farmer.seedDebt)
      ? farmer.seedDebt
      : Math.max(0, (farmer.stats?.totalSeedAmount || 0) - (farmer.deposit || 0));
    const newSeedDebt = Math.max(0, currentSeedDebt - deposit);

    // 3. 更新农户主表
    await db.collection('farmers').doc(farmerId).update({
      data: {
        acreage: newAcreage,
        seedTotal: newSeedTotal,
        receivableAmount: newReceivable,
        deposit: newDeposit,
        seedDebt: newSeedDebt,  // 同步更新种苗欠款
        'stats.seedDebt': newSeedDebt,
        updateTime: db.serverDate()
      }
    });

    // 4. 生成业务记录编号
    const now = new Date();
    const recordId = `BIZ_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // 5. 写入业务记录表
    await db.collection('business_records').add({
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

    // 2. 计算新的预支款余额
    const currentAdvance = farmer.advancePayment || 0;
    const newAdvancePayment = currentAdvance + paymentAmount;

    // 3. 更新农户主表的预支款字段
    await db.collection('farmers').doc(farmerId).update({
      data: {
        advancePayment: newAdvancePayment,
        updateTime: db.serverDate()
      }
    });

    // 4. 生成业务记录编号
    const now = new Date();
    const recordId = `ADV_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // 5. 写入业务记录表
    await db.collection('business_records').add({
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

    // 6. 记录操作日志
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

    // 获取用户信息，判断权限
    try {
      const userRes = await db.collection('users').doc(userId).get();
      if (userRes.data && userRes.data.role === 'assistant') {
        baseCondition.createBy = userId;
      }
    } catch (userErr) {
      baseCondition.createBy = userId;
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

    return {
      success: true,
      data: {
        all: allCount.total,
        pending: Math.max(0, pendingCount),
        inProgress: inProgressCount.total,
        completed: completedCount.total
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

  // 计算金额
  const totalAmount = parseFloat(amount) || (qty * price);

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

    // 2. 计算新的农资欠款
    const currentAgriDebt = farmer.agriculturalDebt || 0;
    const currentFertilizer = farmer.fertilizerAmount || 0;
    const currentPesticide = farmer.pesticideAmount || 0;

    const newAgriDebt = currentAgriDebt + totalAmount;

    // 根据类型更新对应金额
    const updateData = {
      agriculturalDebt: newAgriDebt,
      updateTime: db.serverDate()
    };

    if (type === 'fertilizer') {
      updateData.fertilizerAmount = currentFertilizer + totalAmount;
    } else {
      updateData.pesticideAmount = currentPesticide + totalAmount;
    }

    // 3. 更新农户主表
    await db.collection('farmers').doc(farmerId).update({
      data: updateData
    });

    // 4. 生成业务记录编号
    const now = new Date();
    const prefix = type === 'fertilizer' ? 'FER' : 'PES';
    const recordId = `${prefix}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // 5. 写入业务记录表
    await db.collection('business_records').add({
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
        supplyDate: supplyDate || now.toISOString().split('T')[0],

        // 余额快照
        snapshotAgriDebt: newAgriDebt,
        snapshotFertilizer: type === 'fertilizer' ? (currentFertilizer + totalAmount) : currentFertilizer,
        snapshotPesticide: type === 'pesticide' ? (currentPesticide + totalAmount) : currentPesticide,

        remark: remark || '',
        createTime: db.serverDate(),
        createBy: userId,
        createByName: userName || ''
      }
    });

    // 6. 记录操作日志
    const typeName = type === 'fertilizer' ? '化肥' : '农药';
    await db.collection('operation_logs').add({
      data: {
        userId,
        userName: userName || '',
        userRole: 'assistant',
        action: 'add_agricultural_supply',
        module: 'farmer',
        targetId: farmerId,
        targetName: farmer.name,
        description: `发放${typeName}：${name}，${qty}${unit || ''}，金额 ¥${totalAmount}，农资欠款累计 ¥${newAgriDebt}`,
        before: { agriculturalDebt: currentAgriDebt },
        after: { agriculturalDebt: newAgriDebt },
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: `${typeName}发放成功`,
      data: {
        recordId,
        name,
        quantity: qty,
        unitPrice: price,
        totalAmount,
        newAgriDebt,
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

    default:
      return {
        success: false,
        message: '无效的操作类型'
      };
  }
};

/**
 * 获取农户的业务往来记录
 * 合并查询 business_records、acquisitions、settlements
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
    // 1. 查询 business_records 集合
    const businessRes = await db.collection('business_records')
      .where({ farmerId })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get();

    // 2. 查询 acquisitions 集合（收购记录）
    const acquisitionRes = await db.collection('acquisitions')
      .where({ farmerId })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get();

    // 3. 查询 settlements 集合（结算记录）
    const settlementRes = await db.collection('settlements')
      .where({ farmerId })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get();

    // 合并所有记录
    let allRecords = [];

    // 处理 business_records
    if (businessRes.data && businessRes.data.length > 0) {
      allRecords = allRecords.concat(businessRes.data.map(r => ({
        ...r,
        _source: 'business_records'
      })));
    }

    // 处理 acquisitions（收购记录）
    if (acquisitionRes.data && acquisitionRes.data.length > 0) {
      const acquisitionRecords = acquisitionRes.data.map(r => ({
        _id: r._id,
        type: 'acquisition',
        farmerId: r.farmerId,
        farmerName: r.farmerName,
        amount: r.totalAmount || 0,
        weight: r.totalWeight || 0,
        desc: `收购 ${r.totalWeight || 0}kg，¥${r.totalAmount || 0}`,
        createTime: r.createTime,
        createByName: r.operatorName || r.createByName || '仓管',
        warehouseName: r.warehouseName,
        _source: 'acquisitions'
      }));
      allRecords = allRecords.concat(acquisitionRecords);
    }

    // 处理 settlements（结算记录）
    if (settlementRes.data && settlementRes.data.length > 0) {
      const settlementRecords = settlementRes.data.map(r => {
        let type = 'settlement';
        let desc = `货款¥${r.acquisitionAmount || 0}`;
        let operator = '系统';

        if (r.status === 'completed' || r.paymentStatus === 'paid') {
          type = 'payment';
          desc = `实付¥${r.actualPayment || 0}（货款¥${r.acquisitionAmount || 0}，扣款¥${r.totalDeduction || 0}）`;
          operator = r.cashierName || '出纳';
        } else if (r.status === 'approved') {
          type = 'settlement_audit';
          desc = `审核通过，待付¥${r.actualPayment || 0}`;
          operator = r.auditorName || '会计';
        } else if (r.status === 'pending') {
          type = 'settlement';
          desc = `待审核，货款¥${r.acquisitionAmount || 0}`;
          operator = '系统';
        }

        return {
          _id: r._id,
          type,
          farmerId: r.farmerId,
          farmerName: r.farmerName,
          amount: r.actualPayment || r.acquisitionAmount || 0,
          grossAmount: r.acquisitionAmount || 0,
          deduction: r.totalDeduction || 0,
          desc,
          status: r.status,
          createTime: r.paymentTime || r.auditTime || r.createTime,
          createByName: operator,
          _source: 'settlements'
        };
      });
      allRecords = allRecords.concat(settlementRecords);
    }

    // 按时间倒序排序
    allRecords.sort((a, b) => {
      const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
      const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
      return timeB - timeA;
    });

    // 分页
    const skip = (page - 1) * pageSize;
    const pagedRecords = allRecords.slice(skip, skip + pageSize);

    return {
      success: true,
      data: {
        list: pagedRecords,
        total: allRecords.length,
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
