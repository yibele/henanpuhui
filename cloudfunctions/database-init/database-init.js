/**
 * 普惠农录 - 数据库初始化脚本
 * 
 * 使用方法：
 * 1. 在云开发控制台的"云函数"中创建一个临时云函数
 * 2. 将此代码复制到云函数中
 * 3. 运行一次即可完成数据库初始化
 * 4. 初始化完成后可以删除此云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 初始化仓库数据
async function initWarehouses() {
  console.log('开始初始化仓库数据...');
  
  const warehouses = [
    {
      _id: 'WH_LZ',
      name: '梁寨',
      code: 'LZ',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市梁寨村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    },
    {
      _id: 'WH_SZW',
      name: '沙竹王',
      code: 'SZW',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市沙竹王村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    },
    {
      _id: 'WH_GY',
      name: '郭营',
      code: 'GY',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市郭营村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    },
    {
      _id: 'WH_SY',
      name: '沙堰',
      code: 'SY',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市沙堰村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    },
    {
      _id: 'WH_QH',
      name: '青华',
      code: 'QH',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市青华村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    },
    {
      _id: 'WH_ZL',
      name: '赵楼',
      code: 'ZL',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市赵楼村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    },
    {
      _id: 'WH_PQ',
      name: '彭桥',
      code: 'PQ',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市彭桥村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    },
    {
      _id: 'WH_JL',
      name: '九龙',
      code: 'JL',
      manager: '待分配',
      phone: '',
      address: '河南省新郑市九龙村',
      stats: {
        todayAcquisitionCount: 0,
        todayAcquisitionWeight: 0,
        todayAcquisitionAmount: 0,
        totalAcquisitionCount: 0,
        totalAcquisitionWeight: 0,
        totalAcquisitionAmount: 0,
        currentStock: 0,
        stockStatus: 'normal'
      },
      status: 'active',
      createTime: new Date(),
      updateTime: new Date(),
      statsUpdateTime: new Date()
    }
  ];

  try {
    // 批量插入仓库数据
    for (const warehouse of warehouses) {
      try {
        await db.collection('warehouses').add({
          data: warehouse
        });
        console.log(`✅ 仓库 ${warehouse.name} 初始化成功`);
      } catch (err) {
        if (err.errCode === -502002) {
          console.log(`⚠️  仓库 ${warehouse.name} 已存在，跳过`);
        } else {
          console.error(`❌ 仓库 ${warehouse.name} 初始化失败:`, err);
        }
      }
    }
    
    console.log('仓库数据初始化完成！');
    return { success: true, message: '仓库数据初始化完成' };
  } catch (error) {
    console.error('仓库数据初始化失败:', error);
    return { success: false, error };
  }
}

// 初始化管理员账号（示例）
async function initAdminUser() {
  console.log('开始初始化管理员账号...');
  
  const adminUser = {
    name: '系统管理员',
    phone: '13900000000',
    avatar: '',
    role: 'admin',
    warehouseId: '',
    warehouseName: '',
    status: 'active',
    createTime: new Date(),
    updateTime: new Date(),
    lastLoginTime: new Date()
  };

  try {
    // 检查是否已存在管理员
    const existingAdmin = await db.collection('users')
      .where({
        role: 'admin',
        phone: '13900000000'
      })
      .get();

    if (existingAdmin.data.length > 0) {
      console.log('⚠️  管理员账号已存在，跳过');
      return { success: true, message: '管理员账号已存在' };
    }

    await db.collection('users').add({
      data: adminUser
    });

    console.log('✅ 管理员账号初始化成功');
    return { success: true, message: '管理员账号初始化成功' };
  } catch (error) {
    console.error('❌ 管理员账号初始化失败:', error);
    return { success: false, error };
  }
}

// 创建数据库索引
async function createIndexes() {
  console.log('开始创建数据库索引...');
  
  const indexes = [
    // farmers 表索引
    {
      collection: 'farmers',
      name: 'farmerId_unique',
      keys: [{ name: 'farmerId', direction: '1' }],
      unique: true
    },
    {
      collection: 'farmers',
      name: 'phone_index',
      keys: [{ name: 'phone', direction: '1' }]
    },
    {
      collection: 'farmers',
      name: 'idCard_unique',
      keys: [{ name: 'idCard', direction: '1' }],
      unique: true
    },
    {
      collection: 'farmers',
      name: 'firstManagerId_index',
      keys: [{ name: 'firstManagerId', direction: '1' }]
    },
    
    // acquisitions 表索引
    {
      collection: 'acquisitions',
      name: 'acquisitionId_unique',
      keys: [{ name: 'acquisitionId', direction: '1' }],
      unique: true
    },
    {
      collection: 'acquisitions',
      name: 'farmerId_index',
      keys: [{ name: 'farmerId', direction: '1' }]
    },
    {
      collection: 'acquisitions',
      name: 'warehouseId_date_index',
      keys: [
        { name: 'warehouseId', direction: '1' },
        { name: 'acquisitionDate', direction: '-1' }
      ]
    },
    
    // settlements 表索引
    {
      collection: 'settlements',
      name: 'settlementId_unique',
      keys: [{ name: 'settlementId', direction: '1' }],
      unique: true
    },
    {
      collection: 'settlements',
      name: 'acquisitionId_unique',
      keys: [{ name: 'acquisitionId', direction: '1' }],
      unique: true
    },
    {
      collection: 'settlements',
      name: 'auditStatus_index',
      keys: [
        { name: 'auditStatus', direction: '1' },
        { name: 'createTime', direction: '-1' }
      ]
    },
    
    // users 表索引
    {
      collection: 'users',
      name: 'phone_index',
      keys: [{ name: 'phone', direction: '1' }]
    },
    {
      collection: 'users',
      name: 'role_index',
      keys: [{ name: 'role', direction: '1' }]
    }
  ];

  const results = [];
  for (const index of indexes) {
    try {
      // 注意：云数据库索引需要在控制台手动创建
      // 这里仅作为索引配置的文档记录
      console.log(`📝 索引配置: ${index.collection}.${index.name}`);
      results.push({
        collection: index.collection,
        name: index.name,
        status: 'documented'
      });
    } catch (error) {
      console.error(`❌ 索引配置失败: ${index.collection}.${index.name}`, error);
    }
  }

  console.log('索引配置记录完成（请在云开发控制台手动创建）');
  return { success: true, results };
}

// 主函数
exports.main = async (event, context) => {
  console.log('========================================');
  console.log('普惠农录 - 数据库初始化开始');
  console.log('========================================');

  const results = {
    warehouses: null,
    adminUser: null,
    indexes: null
  };

  // 1. 初始化仓库数据
  results.warehouses = await initWarehouses();
  
  // 2. 初始化管理员账号
  results.adminUser = await initAdminUser();
  
  // 3. 创建索引配置
  results.indexes = await createIndexes();

  console.log('========================================');
  console.log('数据库初始化完成！');
  console.log('========================================');
  console.log('结果汇总:', JSON.stringify(results, null, 2));

  return {
    success: true,
    message: '数据库初始化完成',
    results
  };
};
