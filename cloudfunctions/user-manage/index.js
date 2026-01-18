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
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'login':
      return await login(event);
    
    case 'getUserInfo':
      return await getUserInfo(event);
    
    default:
      return {
        success: false,
        message: '无效的操作类型',
        code: 'INVALID_ACTION'
      };
  }
};
