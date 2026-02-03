/**
 * 用户管理云函数 - 手机号+密码登录
 * 
 * 功能：
 * - login: 手机号+密码登录
 * - getUserInfo: 获取当前用户信息
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 用户登录 - 手机号+密码
 */
async function login(event) {
  const { phone, password } = event;

  try {
    // 1. 验证输入
    if (!phone || !password) {
      return {
        success: false,
        message: '请输入手机号和密码',
        code: 'INVALID_INPUT'
      };
    }

    // 2. 查找用户
    const userRes = await db.collection('users')
      .where({
        phone: phone,
        status: _.neq('banned')
      })
      .get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        message: '手机号不存在',
        code: 'USER_NOT_FOUND'
      };
    }

    const user = userRes.data[0];

    // 3. 验证密码
    if (user.password !== password) {
      return {
        success: false,
        message: '密码错误',
        code: 'WRONG_PASSWORD'
      };
    }

    // 4. 检查账号状态
    if (user.status === 'inactive') {
      return {
        success: false,
        message: '账号已被停用，请联系管理员',
        code: 'ACCOUNT_INACTIVE'
      };
    }

    // 5. 更新最后登录时间
    await db.collection('users')
      .doc(user._id)
      .update({
        data: {
          lastLoginTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    // 6. 如果是仓库管理员，获取仓库信息
    let warehouseInfo = null;
    if (user.role === 'warehouse_manager' && user.warehouseId) {
      const warehouseRes = await db.collection('warehouses')
        .doc(user.warehouseId)
        .get();
      
      if (warehouseRes.data) {
        warehouseInfo = {
          id: warehouseRes.data._id,
          name: warehouseRes.data.name,
          code: warehouseRes.data.code,
          address: warehouseRes.data.address
        };
      }
    }

    // 7. 返回用户信息（不返回密码）
    return {
      success: true,
      message: '登录成功',
      data: {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar || '',
        nickName: user.nickName || user.name,
        warehouseId: user.warehouseId || '',
        warehouseName: user.warehouseName || '',
        warehouseInfo: warehouseInfo,
        status: user.status
      }
    };

  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      message: error.message || '登录失败，请稍后重试',
      code: 'LOGIN_FAILED'
    };
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(event) {
  const { userId } = event;

  try {
    if (!userId) {
      return {
        success: false,
        message: '缺少用户ID',
        code: 'INVALID_INPUT'
      };
    }

    const userRes = await db.collection('users')
      .doc(userId)
      .get();

    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      };
    }

    const user = userRes.data;

    // 如果是仓库管理员，获取仓库信息
    let warehouseInfo = null;
    if (user.role === 'warehouse_manager' && user.warehouseId) {
      const warehouseRes = await db.collection('warehouses')
        .doc(user.warehouseId)
        .get();
      
      if (warehouseRes.data) {
        warehouseInfo = {
          id: warehouseRes.data._id,
          name: warehouseRes.data.name,
          code: warehouseRes.data.code,
          address: warehouseRes.data.address
        };
      }
    }

    return {
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar || '',
        nickName: user.nickName || user.name,
        warehouseId: user.warehouseId || '',
        warehouseName: user.warehouseName || '',
        warehouseInfo: warehouseInfo,
        status: user.status
      }
    };

  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      message: error.message || '获取用户信息失败',
      code: 'GET_USER_FAILED'
    };
  }
}

/**
 * 获取用户列表（管理员专用）
 */
async function listUsers(event) {
  const { userId, page = 1, pageSize = 20, keyword = '', role = '' } = event;

  try {
    // 验证权限
    const adminRes = await db.collection('users').doc(userId).get();
    if (!adminRes.data || adminRes.data.role !== 'admin') {
      return {
        success: false,
        message: '无权限查看用户列表',
        code: 'NO_PERMISSION'
      };
    }

    // 构建查询条件
    let whereCondition = {};

    if (role) {
      whereCondition.role = role;
    }

    // 关键词搜索
    if (keyword) {
      const searchRegex = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
      whereCondition = _.and([
        whereCondition,
        _.or([
          { name: searchRegex },
          { phone: searchRegex }
        ])
      ]);
    }

    // 查询总数
    const countRes = await db.collection('users')
      .where(whereCondition)
      .count();

    // 查询数据
    const listRes = await db.collection('users')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({
        _id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        warehouseId: true,
        warehouseName: true,
        createTime: true,
        lastLoginTime: true
      })
      .get();

    return {
      success: true,
      data: {
        list: listRes.data,
        total: countRes.total,
        page,
        pageSize
      }
    };
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return {
      success: false,
      message: error.message || '获取用户列表失败',
      code: 'LIST_FAILED'
    };
  }
}

/**
 * 创建用户（管理员专用）
 */
async function createUser(event) {
  const { userId, data } = event;

  try {
    // 验证权限
    const adminRes = await db.collection('users').doc(userId).get();
    if (!adminRes.data || adminRes.data.role !== 'admin') {
      return {
        success: false,
        message: '无权限创建用户',
        code: 'NO_PERMISSION'
      };
    }

    const { name, phone, password, role, warehouseId, warehouseName } = data;

    // 验证必填字段
    if (!name || !phone || !password || !role) {
      return {
        success: false,
        message: '请填写完整信息',
        code: 'INVALID_INPUT'
      };
    }

    // 检查手机号是否已存在
    const existRes = await db.collection('users')
      .where({ phone })
      .count();

    if (existRes.total > 0) {
      return {
        success: false,
        message: '该手机号已被注册',
        code: 'PHONE_EXISTS'
      };
    }

    // 创建用户
    const result = await db.collection('users').add({
      data: {
        name,
        phone,
        password,
        role,
        status: 'active',
        warehouseId: warehouseId || '',
        warehouseName: warehouseName || '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '创建成功',
      data: { userId: result._id }
    };
  } catch (error) {
    console.error('创建用户失败:', error);
    return {
      success: false,
      message: error.message || '创建用户失败',
      code: 'CREATE_FAILED'
    };
  }
}

/**
 * 更新用户（管理员专用）
 */
async function updateUser(event) {
  const { userId, targetUserId, data } = event;

  try {
    // 验证权限
    const adminRes = await db.collection('users').doc(userId).get();
    if (!adminRes.data || adminRes.data.role !== 'admin') {
      return {
        success: false,
        message: '无权限修改用户',
        code: 'NO_PERMISSION'
      };
    }

    const { name, role, status, warehouseId, warehouseName, password } = data;

    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    };

    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (warehouseId !== undefined) updateData.warehouseId = warehouseId;
    if (warehouseName !== undefined) updateData.warehouseName = warehouseName;
    if (password) updateData.password = password;

    await db.collection('users')
      .doc(targetUserId)
      .update({ data: updateData });

    return {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    console.error('更新用户失败:', error);
    return {
      success: false,
      message: error.message || '更新用户失败',
      code: 'UPDATE_FAILED'
    };
  }
}

/**
 * 删除用户（管理员专用）
 */
async function deleteUser(event) {
  const { userId, targetUserId } = event;

  try {
    // 验证权限
    const adminRes = await db.collection('users').doc(userId).get();
    if (!adminRes.data || adminRes.data.role !== 'admin') {
      return {
        success: false,
        message: '无权限删除用户',
        code: 'NO_PERMISSION'
      };
    }

    // 不能删除自己
    if (userId === targetUserId) {
      return {
        success: false,
        message: '不能删除当前登录账号',
        code: 'CANNOT_DELETE_SELF'
      };
    }

    await db.collection('users').doc(targetUserId).remove();

    return {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    console.error('删除用户失败:', error);
    return {
      success: false,
      message: error.message || '删除用户失败',
      code: 'DELETE_FAILED'
    };
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'login':
      return await login(event);

    case 'getUserInfo':
      return await getUserInfo(event);

    case 'list':
      return await listUsers(event);

    case 'create':
      return await createUser(event);

    case 'update':
      return await updateUser(event);

    case 'delete':
      return await deleteUser(event);

    default:
      return {
        success: false,
        message: '无效的操作类型',
        code: 'INVALID_ACTION'
      };
  }
};
