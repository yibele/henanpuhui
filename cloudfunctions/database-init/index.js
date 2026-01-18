// 普惠农录 - 数据库初始化脚本
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 8个仓库数据
const WAREHOUSES = [
  { _id: 'w001', code: 'WH001', name: '梁寨', address: '梁寨镇', manager: '张三', phone: '13800001001', status: 'active' },
  { _id: 'w002', code: 'WH002', name: '沙竹王', address: '沙竹王镇', manager: '李四', phone: '13800001002', status: 'active' },
  { _id: 'w003', code: 'WH003', name: '郭营', address: '郭营镇', manager: '王五', phone: '13800001003', status: 'active' },
  { _id: 'w004', code: 'WH004', name: '沙堰', address: '沙堰镇', manager: '赵六', phone: '13800001004', status: 'active' },
  { _id: 'w005', code: 'WH005', name: '青华', address: '青华镇', manager: '孙七', phone: '13800001005', status: 'active' },
  { _id: 'w006', code: 'WH006', name: '赵楼', address: '赵楼镇', manager: '周八', phone: '13800001006', status: 'active' },
  { _id: 'w007', code: 'WH007', name: '彭桥', address: '彭桥镇', manager: '吴九', phone: '13800001007', status: 'active' },
  { _id: 'w008', code: 'WH008', name: '九龙', address: '九龙镇', manager: '郑十', phone: '13800001008', status: 'active' }
];

// 4个测试用户
const TEST_USERS = [
  {
    _id: 'u001',
    name: '张助理',
    phone: '13800001111',
    password: '123456',
    role: 'assistant',
    avatar: '',
    nickName: '张助理',
    warehouseId: '',
    warehouseName: '',
    status: 'active',
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: 'u002',
    name: '李仓管',
    phone: '13800002222',
    password: '123456',
    role: 'warehouse_manager',
    avatar: '',
    nickName: '李仓管',
    warehouseId: 'w001', // 绑定到"梁寨"仓库
    warehouseName: '梁寨',
    status: 'active',
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: 'u003',
    name: '王财务',
    phone: '13800003333',
    password: '123456',
    role: 'finance_admin',
    avatar: '',
    nickName: '王财务',
    warehouseId: '',
    warehouseName: '',
    status: 'active',
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: 'u004',
    name: '赵管理员',
    phone: '13900000000',
    password: 'admin123',
    role: 'admin',
    avatar: '',
    nickName: '赵管理员',
    warehouseId: '',
    warehouseName: '',
    status: 'active',
    createTime: new Date(),
    updateTime: new Date()
  }
];

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  console.log('========================================');
  console.log('普惠农录 - 数据库初始化开始');
  console.log('========================================');

  const results = {};

  // 1. 初始化仓库数据
  try {
    console.log('开始初始化仓库数据...');
    
    for (const warehouse of WAREHOUSES) {
      try {
        // 检查是否已存在
        const existRes = await db.collection('warehouses').doc(warehouse._id).get();
        
        if (existRes.data) {
          console.log(`⚠️  仓库 ${warehouse.name} 已存在，跳过`);
        } else {
          // 不存在则添加
          await db.collection('warehouses').add({
            data: {
              ...warehouse,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          });
          console.log(`✅ 仓库 ${warehouse.name} 初始化成功`);
        }
      } catch (error) {
        console.error(`❌ 仓库 ${warehouse.name} 初始化失败:`, error);
      }
    }
    
    results.warehouses = {
      success: true,
      message: '仓库数据初始化完成'
    };
    console.log('仓库数据初始化完成！');
    
  } catch (error) {
    console.error('❌ 仓库数据初始化失败:', error);
    results.warehouses = {
      success: false,
      error: error
    };
  }

  // 2. 初始化测试用户
  try {
    console.log('开始初始化测试用户...');
    
    for (const user of TEST_USERS) {
      try {
        // 检查手机号是否已存在
        const existRes = await db.collection('users').where({
          phone: user.phone
        }).get();
        
        if (existRes.data.length > 0) {
          console.log(`⚠️  用户 ${user.name} (${user.phone}) 已存在，跳过`);
        } else {
          // 不存在则添加
          await db.collection('users').add({
            data: user
          });
          console.log(`✅ 用户 ${user.name} (${user.phone}) 初始化成功`);
        }
      } catch (error) {
        console.error(`❌ 用户 ${user.name} 初始化失败:`, error);
      }
    }
    
    results.users = {
      success: true,
      message: '测试用户初始化完成'
    };
    console.log('测试用户初始化完成！');
    
  } catch (error) {
    console.error('❌ 测试用户初始化失败:', error);
    results.users = {
      success: false,
      error: error
    };
  }

  console.log('========================================');
  console.log('数据库初始化完成！');
  console.log('========================================');

  return {
    success: true,
    message: '数据库初始化完成',
    results: results
  };
};
