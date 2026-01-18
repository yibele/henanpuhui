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
  const { userId, page = 1, pageSize = 20, keyword = '', status = '' } = event;

  if (!userId) {
    return {
      success: false,
      message: '缺少用户ID'
    };
  }

  try {
    // 获取用户信息，判断权限
    const userRes = await db.collection('users').doc(userId).get();
    
    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 构建查询条件
    let queryCondition = {
      isDeleted: false
    };

    // 如果是助理，只能看自己创建的农户
    if (currentUser.role === 'assistant') {
      queryCondition.createBy = userId;
    }

    // 如果有关键词搜索
    if (keyword) {
      // TODO: 使用正则表达式搜索姓名或手机号
    }

    // 如果有状态筛选
    if (status) {
      queryCondition.status = status;
    }

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
    
    default:
      return {
        success: false,
        message: '无效的操作类型'
      };
  }
};
