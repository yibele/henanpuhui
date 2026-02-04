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

// 5个测试用户
const TEST_USERS = [
  {
    _id: 'u001',
    name: '张静',
    phone: '13800001111',
    password: '123456',
    role: 'assistant',
    avatar: '',
    nickName: '张静',
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
  },
  {
    _id: 'u005',
    name: '钱出纳',
    phone: '13800005555',
    password: '123456',
    role: 'cashier',
    avatar: '',
    nickName: '钱出纳',
    warehouseId: '',
    warehouseName: '',
    status: 'active',
    createTime: new Date(),
    updateTime: new Date()
  },
  // ========== 20个助理账号 ==========
  { _id: 'a001', name: '王建国', phone: '13811110001', password: '123456', role: 'assistant', avatar: '', nickName: '王建国', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a002', name: '李明辉', phone: '13811110002', password: '123456', role: 'assistant', avatar: '', nickName: '李明辉', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a003', name: '张伟东', phone: '13811110003', password: '123456', role: 'assistant', avatar: '', nickName: '张伟东', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a004', name: '刘志强', phone: '13811110004', password: '123456', role: 'assistant', avatar: '', nickName: '刘志强', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a005', name: '陈晓峰', phone: '13811110005', password: '123456', role: 'assistant', avatar: '', nickName: '陈晓峰', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a006', name: '赵军', phone: '13811110006', password: '123456', role: 'assistant', avatar: '', nickName: '赵军', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a007', name: '孙涛', phone: '13811110007', password: '123456', role: 'assistant', avatar: '', nickName: '孙涛', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a008', name: '周磊', phone: '13811110008', password: '123456', role: 'assistant', avatar: '', nickName: '周磊', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a009', name: '吴刚', phone: '13811110009', password: '123456', role: 'assistant', avatar: '', nickName: '吴刚', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a010', name: '郑浩', phone: '13811110010', password: '123456', role: 'assistant', avatar: '', nickName: '郑浩', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a011', name: '王伟', phone: '13811110011', password: '123456', role: 'assistant', avatar: '', nickName: '王伟', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a012', name: '李强', phone: '13811110012', password: '123456', role: 'assistant', avatar: '', nickName: '李强', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a013', name: '张明', phone: '13811110013', password: '123456', role: 'assistant', avatar: '', nickName: '张明', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a014', name: '刘洋', phone: '13811110014', password: '123456', role: 'assistant', avatar: '', nickName: '刘洋', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a015', name: '陈峰', phone: '13811110015', password: '123456', role: 'assistant', avatar: '', nickName: '陈峰', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a016', name: '赵强', phone: '13811110016', password: '123456', role: 'assistant', avatar: '', nickName: '赵强', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a017', name: '孙明', phone: '13811110017', password: '123456', role: 'assistant', avatar: '', nickName: '孙明', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a018', name: '周伟', phone: '13811110018', password: '123456', role: 'assistant', avatar: '', nickName: '周伟', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a019', name: '吴强', phone: '13811110019', password: '123456', role: 'assistant', avatar: '', nickName: '吴强', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() },
  { _id: 'a020', name: '郑明', phone: '13811110020', password: '123456', role: 'assistant', avatar: '', nickName: '郑明', warehouseId: '', warehouseName: '', status: 'active', createTime: new Date(), updateTime: new Date() }
];

// 测试农户（用于测试历史收购汇总）
const TEST_FARMER = {
  farmerId: 'F20260101_0001',
  name: '刘大山',
  phone: '15888888888',
  idCard: '410123199001011234',
  address: {
    county: '虞城县',
    township: '梁寨镇',
    village: '刘庄村'
  },
  addressText: '虞城县梁寨镇刘庄村',
  acreage: 50,
  grade: 'A',
  deposit: 5000,
  firstManager: '张助理',
  seedTotal: 50,
  seedUnitPrice: 0.15,
  receivableAmount: 7500,
  seedDebt: 2500,
  agriculturalDebt: 1000,
  advancePayment: 500,
  status: 'active',
  isDeleted: false,
  stats: {
    totalAcquisitionCount: 3,
    totalAcquisitionWeight: 4200,
    totalAcquisitionAmount: 37800,
    currentDebt: 2500
  },
  createBy: 'u001',
  createByName: '张助理',
  createTime: new Date('2026-01-10'),
  updateTime: new Date()
};

// 测试收购记录（3笔，分布在不同仓库）
const TEST_ACQUISITIONS = [
  {
    acquisitionId: 'ACQ_20260115_0001',
    farmerId: 'F20260101_0001',
    farmerName: '刘大山',
    farmerPhone: '15888888888',
    farmerAcreage: 50,
    warehouseId: 'w001',
    warehouseName: '梁寨',
    grossWeight: 1600,
    tareWeight: 100,
    moistureRate: 3,
    moistureWeight: 45,
    netWeight: 1455,
    unitPrice: 9,
    totalAmount: 13095,
    acquisitionDate: '2026-01-15',
    status: 'confirmed',
    createBy: '李仓管',
    createById: 'u002',
    createTime: new Date('2026-01-15 10:30:00'),
    updateTime: new Date('2026-01-15 10:30:00')
  },
  {
    acquisitionId: 'ACQ_20260116_0002',
    farmerId: 'F20260101_0001',
    farmerName: '刘大山',
    farmerPhone: '15888888888',
    farmerAcreage: 50,
    warehouseId: 'w002',
    warehouseName: '沙竹王',
    grossWeight: 1800,
    tareWeight: 100,
    moistureRate: 2.5,
    moistureWeight: 42.5,
    netWeight: 1657.5,
    unitPrice: 9,
    totalAmount: 14917.5,
    acquisitionDate: '2026-01-16',
    status: 'confirmed',
    createBy: '仓管员',
    createById: 'u002',
    createTime: new Date('2026-01-16 14:20:00'),
    updateTime: new Date('2026-01-16 14:20:00')
  },
  {
    acquisitionId: 'ACQ_20260118_0003',
    farmerId: 'F20260101_0001',
    farmerName: '刘大山',
    farmerPhone: '15888888888',
    farmerAcreage: 50,
    warehouseId: 'w001',
    warehouseName: '梁寨',
    grossWeight: 1200,
    tareWeight: 80,
    moistureRate: 2,
    moistureWeight: 22.4,
    netWeight: 1097.6,
    unitPrice: 9,
    totalAmount: 9878.4,
    acquisitionDate: '2026-01-18',
    status: 'confirmed',
    createBy: '李仓管',
    createById: 'u002',
    createTime: new Date('2026-01-18 09:15:00'),
    updateTime: new Date('2026-01-18 09:15:00')
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
  const { onlyWarehouses = false } = event || {};

  // 1. 初始化仓库数据
  try {
    console.log('开始初始化仓库数据...');

    for (const warehouse of WAREHOUSES) {
      try {
        // 使用 where 查询检查是否已存在（避免 doc.get 在不存在时报错）
        const existRes = await db.collection('warehouses').where({ _id: warehouse._id }).get();

        if (existRes.data && existRes.data.length > 0) {
          console.log(`⚠️  仓库 ${warehouse.name} 已存在，跳过`);
        } else {
          // 不存在则添加（使用 add 并指定 _id）
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

  if (onlyWarehouses) {
    console.log('仅初始化仓库，跳过用户/农户/收购初始化');
    return {
      success: true,
      message: '仅初始化仓库完成',
      results
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

  // 3. 初始化测试农户
  try {
    console.log('开始初始化测试农户...');

    const existRes = await db.collection('farmers').where({
      phone: TEST_FARMER.phone
    }).get();

    if (existRes.data.length > 0) {
      console.log(`⚠️  测试农户 ${TEST_FARMER.name} (${TEST_FARMER.phone}) 已存在，跳过`);
    } else {
      await db.collection('farmers').add({
        data: TEST_FARMER
      });
      console.log(`✅ 测试农户 ${TEST_FARMER.name} (${TEST_FARMER.phone}) 初始化成功`);
    }

    results.farmer = {
      success: true,
      message: '测试农户初始化完成'
    };

  } catch (error) {
    console.error('❌ 测试农户初始化失败:', error);
    results.farmer = {
      success: false,
      error: error
    };
  }

  // 4. 初始化测试收购记录
  try {
    console.log('开始初始化测试收购记录...');

    for (const acq of TEST_ACQUISITIONS) {
      try {
        const existRes = await db.collection('acquisitions').where({
          acquisitionId: acq.acquisitionId
        }).get();

        if (existRes.data.length > 0) {
          console.log(`⚠️  收购记录 ${acq.acquisitionId} 已存在，跳过`);
        } else {
          await db.collection('acquisitions').add({
            data: acq
          });
          console.log(`✅ 收购记录 ${acq.acquisitionId} 初始化成功`);
        }
      } catch (error) {
        console.error(`❌ 收购记录 ${acq.acquisitionId} 初始化失败:`, error);
      }
    }

    results.acquisitions = {
      success: true,
      message: '测试收购记录初始化完成'
    };
    console.log('测试收购记录初始化完成！');

  } catch (error) {
    console.error('❌ 测试收购记录初始化失败:', error);
    results.acquisitions = {
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
