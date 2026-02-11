/**
 * 测试数据生成器 - 完整版
 * 批量生成农户、发苗记录、业务记录、收购记录等完整关联数据
 *
 * 使用方法：
 * 1. 上传此云函数
 * 2. 在云开发控制台调用，传入参数：
 *    - action: 'generate' 生成数据 / 'clean' 清理测试数据
 *    - count: 要生成的农户数量（默认100，最大500每批）
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// ==================== 模拟数据配置 ====================

// 姓氏库
const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧', '程'];

// 名字库
const NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '国强', '建国', '建华', '文华', '志强', '永强', '海燕'];

// 县区
const COUNTIES = ['虞城县', '夏邑县', '永城市', '柘城县', '睢县', '民权县', '宁陵县', '商丘市'];

// 乡镇
const TOWNSHIPS = ['城关镇', '李老庄乡', '利民镇', '站集乡', '杜集镇', '谷熟镇', '郑集乡', '界沟镇', '芒种桥乡', '张集镇', '大侯乡', '刘店乡', '镇里固乡', '古王集乡', '稍岗镇'];

// 村
const VILLAGES = ['东村', '西村', '南村', '北村', '前村', '后村', '新村', '老村', '上村', '下村', '大庄', '小庄', '高庄', '李庄', '王庄', '张庄', '刘庄', '陈庄', '杨庄', '赵庄'];

// 等级分布（A/B/C）
const GRADES = ['A', 'B', 'C'];
const GRADE_WEIGHTS = [0.15, 0.35, 0.5]; // 15%A级, 35%B级, 50%C级

// 仓库ID（对应database-init中的8个仓库）
const WAREHOUSE_IDS = ['w001', 'w002', 'w003', 'w004', 'w005', 'w006', 'w007', 'w008'];
const WAREHOUSE_NAMES = ['梁寨', '沙竹王', '郭营', '沙堰', '青华', '赵楼', '彭桥', '九龙'];

// ==================== 工具函数 ====================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function randomPick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomPickWeighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generatePhone() {
  const prefixes = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188'];
  return randomPick(prefixes) + String(randomInt(10000000, 99999999));
}

function generateIdCard() {
  const areaCode = '411400'; // 商丘市区号
  const year = randomInt(1960, 2000);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  const seq = String(randomInt(1, 999)).padStart(3, '0');
  const checkCode = String(randomInt(0, 9));
  return `${areaCode}${year}${month}${day}${seq}${checkCode}`;
}

function generateFarmerId(index) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(index).padStart(5, '0');
  return `TEST_${year}${month}${day}_${seq}`;
}

function generateName() {
  return randomPick(SURNAMES) + randomPick(NAMES) + (Math.random() > 0.7 ? randomPick(NAMES).charAt(0) : '');
}

function generateFarmerOnlyId(batchTag, index) {
  const seq = String(index).padStart(4, '0');
  return `TEST_SIGN_${batchTag}_${seq}`;
}

// 生成过去N天内的随机日期
function randomDate(daysAgo) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - randomInt(0, daysAgo) * 24 * 60 * 60 * 1000);
  return pastDate;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 生成记录编号
function generateRecordId(prefix, index) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(index).padStart(4, '0');
  const rand = String(randomInt(1000, 9999));
  return `${prefix}_${year}${month}${day}_${seq}_${rand}`;
}

// ==================== 数据生成 ====================

/**
 * 生成完整的农户及关联数据
 */
function generateFullFarmerData(index, assistantId, assistantName) {
  const grade = randomPickWeighted(GRADES, GRADE_WEIGHTS);
  const acreage = randomFloat(3, 80, 1);  // 3-80亩
  const seedTotal = randomFloat(acreage * 0.8, acreage * 1.2, 1);  // 种苗数量（万株）
  const seedUnitPrice = randomInt(800, 1500);  // 单价 800-1500元/万株
  const receivableAmount = parseFloat((seedTotal * seedUnitPrice).toFixed(2));
  const deposit = randomInt(1, 10) * 500;  // 500-5000元定金

  const county = randomPick(COUNTIES);
  const township = randomPick(TOWNSHIPS);
  const village = randomPick(VILLAGES);

  // 创建时间（过去60天内）
  const createTime = randomDate(60);

  // ========== 发苗状态决策 ==========
  // 20%未发苗, 50%发苗中, 30%已完成
  const seedStatusRandom = Math.random();
  const seedDistributionComplete = seedStatusRandom > 0.7;
  const hasSeedRecords = seedStatusRandom > 0.2;

  // ========== 发苗记录 ==========
  const seedRecords = [];
  let totalSeedDistributed = 0;
  let totalSeedAmount = 0;
  let totalSeedArea = 0;

  if (hasSeedRecords) {
    const seedRecordCount = seedDistributionComplete ? randomInt(2, 5) : randomInt(1, 3);

    for (let i = 0; i < seedRecordCount; i++) {
      // 每次发苗的数量
      let quantity;
      if (seedDistributionComplete && i === seedRecordCount - 1) {
        // 最后一次补齐
        quantity = parseFloat((seedTotal - totalSeedDistributed).toFixed(2));
      } else {
        quantity = randomFloat(seedTotal * 0.1, seedTotal * 0.4, 2);
      }

      if (quantity <= 0) continue;

      const amount = parseFloat((quantity * seedUnitPrice).toFixed(2));
      const area = parseFloat((quantity / seedTotal * acreage).toFixed(1));

      totalSeedDistributed += quantity;
      totalSeedAmount += amount;
      totalSeedArea += area;

      seedRecords.push({
        recordId: generateRecordId('SEED', index * 10 + i),
        quantity,
        unitPrice: seedUnitPrice,
        amount,
        distributedArea: area,
        distributionDate: formatDate(randomDate(45)),
        receiverName: '', // 稍后填充
        receiveLocation: `${township}${village}`,
        managerName: assistantName,
        remark: i === 0 ? '首次发苗' : `第${i + 1}次发苗`,
        createTime: randomDate(45)
      });
    }
  }

  // 确保数值不超过总量
  totalSeedDistributed = Math.min(totalSeedDistributed, seedTotal);
  totalSeedArea = Math.min(totalSeedArea, acreage);

  // ========== 业务记录（化肥、农药、预支款） ==========
  const businessRecords = [];
  let agriculturalDebt = 0;
  let advancePayment = 0;

  // 60%的农户有化肥记录
  if (Math.random() > 0.4) {
    const fertilizerCount = randomInt(1, 3);
    for (let i = 0; i < fertilizerCount; i++) {
      const quantity = randomInt(5, 30);
      const unitPrice = randomInt(100, 200);
      const totalAmount = quantity * unitPrice;
      agriculturalDebt += totalAmount;

      businessRecords.push({
        recordId: generateRecordId('BIZ', index * 100 + i),
        type: 'fertilizer',
        itemName: randomPick(['复合肥', '尿素', '磷肥', '钾肥', '有机肥']),
        quantity,
        unit: '袋',
        unitPrice,
        totalAmount,
        remark: '',
        createTime: randomDate(40)
      });
    }
  }

  // 40%的农户有农药记录
  if (Math.random() > 0.6) {
    const pesticideCount = randomInt(1, 2);
    for (let i = 0; i < pesticideCount; i++) {
      const quantity = randomInt(2, 10);
      const unitPrice = randomInt(30, 80);
      const totalAmount = quantity * unitPrice;
      agriculturalDebt += totalAmount;

      businessRecords.push({
        recordId: generateRecordId('BIZ', index * 100 + 50 + i),
        type: 'pesticide',
        itemName: randomPick(['除草剂', '杀虫剂', '杀菌剂', '叶面肥']),
        quantity,
        unit: '瓶',
        unitPrice,
        totalAmount,
        remark: '',
        createTime: randomDate(35)
      });
    }
  }

  // 30%的农户有预支款
  if (Math.random() > 0.7) {
    const amount = randomInt(1, 10) * 200;
    advancePayment = amount;

    businessRecords.push({
      recordId: generateRecordId('BIZ', index * 100 + 80),
      type: 'advance',
      amount,
      totalAmount: amount,
      paymentMethod: randomPick(['cash', 'wechat', 'transfer']),
      remark: '生活费预支',
      createTime: randomDate(30)
    });
  }

  // ========== 收购记录 ==========
  const acquisitionRecords = [];
  let totalAcquisitionCount = 0;
  let totalAcquisitionWeight = 0;
  let totalAcquisitionAmount = 0;

  // 40%的农户有收购记录（收购季）
  if (Math.random() > 0.6) {
    const acquisitionCount = randomInt(1, 5);
    const warehouseIndex = randomInt(0, WAREHOUSE_IDS.length - 1);

    for (let i = 0; i < acquisitionCount; i++) {
      const grossWeight = randomInt(500, 3000);
      const tareWeight = randomInt(50, 150);
      const moistureRate = randomFloat(1.5, 5, 1);
      const rawWeight = grossWeight - tareWeight;
      const moistureWeight = parseFloat((rawWeight * moistureRate / 100).toFixed(2));
      const netWeight = parseFloat((rawWeight - moistureWeight).toFixed(2));
      const unitPrice = randomFloat(8, 12, 1);
      const totalAmount = parseFloat((netWeight * unitPrice).toFixed(2));

      totalAcquisitionCount++;
      totalAcquisitionWeight += netWeight;
      totalAcquisitionAmount += totalAmount;

      acquisitionRecords.push({
        acquisitionId: generateRecordId('ACQ', index * 10 + i),
        warehouseId: WAREHOUSE_IDS[warehouseIndex],
        warehouseName: WAREHOUSE_NAMES[warehouseIndex],
        grossWeight,
        tareWeight,
        moistureRate,
        moistureWeight,
        netWeight,
        unitPrice,
        totalAmount,
        acquisitionDate: formatDate(randomDate(20)),
        status: 'confirmed',
        createTime: randomDate(20)
      });
    }
  }

  // ========== 计算欠款 ==========
  const seedDebt = Math.max(0, parseFloat((totalSeedAmount - deposit).toFixed(2)));

  // ========== 返回完整数据 ==========
  const farmerId = generateFarmerId(index);
  const farmerName = generateName();
  const farmerPhone = generatePhone();

  return {
    farmer: {
      farmerId,
      name: farmerName,
      phone: farmerPhone,
      idCard: generateIdCard(),
      address: { county, township, village },
      addressText: `${county}${township}${village}`,
      acreage,
      grade,
      deposit,
      firstManager: assistantName,
      firstManagerId: assistantId,
      secondManager: '',
      secondManagerId: '',
      seedTotal,
      seedUnitPrice,
      receivableAmount,
      seedDebt,
      agriculturalDebt,
      advancePayment,
      seedDistributionComplete,
      seedDistributionCompleteTime: seedDistributionComplete ? randomDate(30) : null,
      // 统计字段
      stats: {
        seedDistributionCount: seedRecords.length,
        totalSeedDistributed: parseFloat(totalSeedDistributed.toFixed(2)),
        totalSeedArea: parseFloat(totalSeedArea.toFixed(1)),
        totalSeedAmount: parseFloat(totalSeedAmount.toFixed(2)),
        totalAcquisitionCount,
        totalAcquisitionWeight: parseFloat(totalAcquisitionWeight.toFixed(2)),
        totalAcquisitionAmount: parseFloat(totalAcquisitionAmount.toFixed(2)),
        lastSeedDistributionDate: seedRecords.length > 0 ? seedRecords[seedRecords.length - 1].createTime : null
      },
      status: 'active',
      isDeleted: false,
      isTestData: true,
      createBy: assistantId,
      createByName: assistantName,
      createTime,
      updateTime: new Date()
    },
    seedRecords: seedRecords.map(r => ({
      ...r,
      farmerId,
      farmerName,
      farmerPhone,
      receiverName: farmerName,
      createBy: assistantId,
      createByName: assistantName,
      isTestData: true
    })),
    businessRecords: businessRecords.map(r => ({
      ...r,
      farmerId,
      farmerName,
      createBy: assistantId,
      createByName: assistantName,
      isTestData: true
    })),
    acquisitionRecords: acquisitionRecords.map(r => ({
      ...r,
      farmerId,
      farmerName,
      farmerPhone,
      farmerAcreage: acreage,
      createBy: 'warehouse_manager',
      createByName: '仓管员',
      isTestData: true
    }))
  };
}

/**
 * 仅生成签单农户（不包含发苗/收购/业务记录）
 */
function generateFarmerOnlyData(index, assistantId, assistantName, batchTag) {
  const grade = randomPickWeighted(GRADES, GRADE_WEIGHTS);
  const acreage = randomFloat(3, 80, 1);
  const seedTotal = randomFloat(acreage * 0.8, acreage * 1.2, 1);
  const seedUnitPrice = randomInt(800, 1500);
  const receivableAmount = parseFloat((seedTotal * seedUnitPrice).toFixed(2));
  const deposit = randomInt(1, 10) * 500;

  const county = randomPick(COUNTIES);
  const township = randomPick(TOWNSHIPS);
  const village = randomPick(VILLAGES);
  const createTime = randomDate(30);

  return {
    farmerId: generateFarmerOnlyId(batchTag, index),
    name: generateName(),
    phone: generatePhone(),
    idCard: generateIdCard(),
    address: { county, township, village },
    addressText: `${county}${township}${village}`,
    acreage,
    grade,
    deposit,
    firstManager: assistantName,
    firstManagerId: assistantId,
    secondManager: '',
    secondManagerId: '',
    seedTotal,
    seedUnitPrice,
    receivableAmount,
    seedDebt: 0,
    agriculturalDebt: 0,
    advancePayment: 0,
    seedDistributionComplete: false,
    seedDistributionCompleteTime: null,
    stats: {
      seedDistributionCount: 0,
      totalSeedDistributed: 0,
      totalSeedArea: 0,
      totalSeedAmount: 0,
      totalAcquisitionCount: 0,
      totalAcquisitionWeight: 0,
      totalAcquisitionAmount: 0,
      totalPaidAmount: 0,
      currentDebt: 0
    },
    status: 'active',
    isDeleted: false,
    isTestData: true,
    createBy: assistantId,
    createByName: assistantName,
    createTime,
    updateTime: new Date()
  };
}

/**
 * 批量插入数据
 */
async function batchInsert(collection, dataList) {
  if (!dataList || dataList.length === 0) return 0;

  let inserted = 0;
  for (const item of dataList) {
    try {
      await db.collection(collection).add({ data: item });
      inserted++;
    } catch (e) {
      console.error(`插入 ${collection} 失败:`, e.message);
    }
  }
  return inserted;
}

/**
 * 获取助理账号
 */
async function getAssistants() {
  const res = await db.collection('users').where({
    role: 'assistant'
  }).limit(20).get();

  if (res.data.length > 0) {
    return res.data.map(u => ({
      id: u._id,
      name: u.name || '助理'
    }));
  }

  // 如果没有助理，返回模拟的
  return [
    { id: 'u001', name: '张静' },
    { id: 'a001', name: '王建国' },
    { id: 'a002', name: '李明辉' }
  ];
}

async function ensureAssistantUser(name, phone, password = '123456') {
  const existed = await db.collection('users').where({ phone }).limit(1).get();
  if (existed.data && existed.data.length > 0) {
    return existed.data[0];
  }

  const now = new Date();
  const addRes = await db.collection('users').add({
    data: {
      name,
      phone,
      password,
      role: 'assistant',
      avatar: '',
      nickName: name,
      warehouseId: '',
      warehouseName: '',
      status: 'active',
      createTime: now,
      updateTime: now,
      isTestData: true
    }
  });

  const userRes = await db.collection('users').doc(addRes._id).get();
  return userRes.data;
}

async function createFarmersForAssistant(assistant, count, batchTag) {
  let inserted = 0;
  for (let i = 0; i < count; i++) {
    const farmerData = generateFarmerOnlyData(i + 1, assistant._id, assistant.name, `${batchTag}_${assistant._id.slice(-4)}`);
    try {
      await db.collection('farmers').add({ data: farmerData });
      inserted++;
    } catch (e) {
      console.error(`为助理 ${assistant.name} 生成农户失败:`, e.message);
    }
  }
  return inserted;
}

// ==================== 主函数 ====================

exports.main = async (event) => {
  const { action = 'generate', count = 100 } = event;

  try {
    if (action === 'createAssistantsAndFarmers') {
      const {
        assistantCount = 2,
        farmersPerAssistant = 20,
        basePhone = '13977000',
        password = '123456'
      } = event;

      const ac = Math.max(1, Math.min(parseInt(assistantCount) || 2, 5));
      const fpa = Math.max(1, Math.min(parseInt(farmersPerAssistant) || 20, 200));
      const batchTag = Date.now().toString().slice(-8);

      const assistants = [];
      for (let i = 0; i < ac; i++) {
        const seq = String(i + 1).padStart(3, '0');
        const phone = `${basePhone}${seq}`.slice(0, 11);
        const name = `测试助理${i + 1}`;
        const user = await ensureAssistantUser(name, phone, password);
        assistants.push(user);
      }

      const results = [];
      for (const assistant of assistants) {
        const created = await createFarmersForAssistant(assistant, fpa, batchTag);
        results.push({
          assistantId: assistant._id,
          assistantName: assistant.name,
          phone: assistant.phone,
          createdFarmers: created
        });
      }

      return {
        success: true,
        message: '助理与签单农户生成完成',
        data: {
          assistantCount: assistants.length,
          farmersPerAssistant: fpa,
          batchTag,
          results
        }
      };

    } else if (action === 'generateFarmersOnly') {
      const farmerCount = Math.min(parseInt(count) || 20, 500);
      const batchTag = Date.now().toString().slice(-8);
      console.log(`开始生成 ${farmerCount} 条签单农户（仅农户主档）...`);

      const assistants = await getAssistants();
      let totalFarmers = 0;

      for (let i = 0; i < farmerCount; i++) {
        const assistant = assistants[i % assistants.length];
        const farmerData = generateFarmerOnlyData(i + 1, assistant.id, assistant.name, batchTag);
        try {
          await db.collection('farmers').add({ data: farmerData });
          totalFarmers++;
        } catch (e) {
          console.error(`生成签单农户 ${i + 1} 失败:`, e.message);
        }
      }

      return {
        success: true,
        message: `签单农户生成完成`,
        data: {
          farmers: totalFarmers,
          batchTag
        }
      };

    } else if (action === 'generate') {
      const farmerCount = Math.min(parseInt(count) || 100, 500);  // 每批最多500条

      console.log(`开始生成 ${farmerCount} 条完整测试数据...`);

      // 获取助理列表
      const assistants = await getAssistants();
      console.log(`找到 ${assistants.length} 个助理账号`);

      let totalFarmers = 0;
      let totalSeeds = 0;
      let totalBusiness = 0;
      let totalAcquisitions = 0;

      // 生成完整数据
      for (let i = 0; i < farmerCount; i++) {
        const assistant = assistants[i % assistants.length];
        const fullData = generateFullFarmerData(i + 1, assistant.id, assistant.name);

        // 插入农户
        try {
          await db.collection('farmers').add({ data: fullData.farmer });
          totalFarmers++;

          // 获取农户的数据库ID
          const farmerRes = await db.collection('farmers').where({
            farmerId: fullData.farmer.farmerId
          }).get();

          if (farmerRes.data.length > 0) {
            const farmerDbId = farmerRes.data[0]._id;

            // 更新关联记录的farmerId为数据库ID
            for (const record of fullData.seedRecords) {
              record.farmerId = farmerDbId;
              await db.collection('seed_records').add({ data: record });
              totalSeeds++;
            }

            for (const record of fullData.businessRecords) {
              record.farmerId = farmerDbId;
              await db.collection('business_records').add({ data: record });
              totalBusiness++;
            }

            for (const record of fullData.acquisitionRecords) {
              record.farmerId = farmerDbId;
              await db.collection('acquisitions').add({ data: record });
              totalAcquisitions++;
            }
          }
        } catch (e) {
          console.error(`生成农户 ${i + 1} 失败:`, e.message);
        }

        // 每50条输出一次进度
        if ((i + 1) % 50 === 0) {
          console.log(`已处理 ${i + 1}/${farmerCount} 条...`);
        }
      }

      return {
        success: true,
        message: `测试数据生成完成`,
        data: {
          farmers: totalFarmers,
          seedRecords: totalSeeds,
          businessRecords: totalBusiness,
          acquisitions: totalAcquisitions,
          assistantCount: assistants.length
        }
      };

    } else if (action === 'clean') {
      console.log('开始清理测试数据...');

      const collections = ['farmers', 'seed_records', 'business_records', 'acquisitions', 'settlements'];
      const results = {};

      for (const collection of collections) {
        let deleted = 0;
        let hasMore = true;

        while (hasMore) {
          const res = await db.collection(collection).where({
            isTestData: true
          }).limit(100).get();

          if (res.data.length === 0) {
            hasMore = false;
            break;
          }

          for (const doc of res.data) {
            try {
              await db.collection(collection).doc(doc._id).remove();
              deleted++;
            } catch (e) {
              console.error(`删除 ${collection} 失败:`, e.message);
            }
          }
        }

        results[collection] = deleted;
        console.log(`${collection}: 删除 ${deleted} 条`);
      }

      return {
        success: true,
        message: '测试数据清理完成',
        data: results
      };

    } else if (action === 'stats') {
      // 查看当前测试数据统计
      const collections = ['farmers', 'seed_records', 'business_records', 'acquisitions', 'settlements'];
      const stats = {};

      for (const collection of collections) {
        const res = await db.collection(collection).where({
          isTestData: true
        }).count();
        stats[collection] = res.total;
      }

      return {
        success: true,
        message: '测试数据统计',
        data: stats
      };

    } else if (action === 'cleanOld') {
      // 清理旧的测试数据（通过 farmerId 前缀 TEST_ 识别）
      console.log('开始清理旧测试数据（TEST_前缀）...');

      const results = {};

      // 1. 先找出所有旧测试农户的ID
      let oldFarmerIds = [];
      let hasMore = true;
      let skip = 0;

      while (hasMore) {
        const res = await db.collection('farmers')
          .where({
            farmerId: db.RegExp({ regexp: '^TEST_', options: 'i' })
          })
          .skip(skip)
          .limit(100)
          .field({ _id: true, farmerId: true })
          .get();

        if (res.data.length === 0) {
          hasMore = false;
        } else {
          oldFarmerIds = oldFarmerIds.concat(res.data.map(f => f._id));
          skip += 100;
        }
      }

      console.log(`找到 ${oldFarmerIds.length} 个旧测试农户`);

      // 2. 删除关联的记录
      const relatedCollections = ['seed_records', 'business_records', 'acquisitions', 'settlements'];

      for (const collection of relatedCollections) {
        let deleted = 0;
        for (const farmerId of oldFarmerIds) {
          try {
            // 查找并删除该农户的所有记录
            let subHasMore = true;
            while (subHasMore) {
              const records = await db.collection(collection)
                .where({ farmerId })
                .limit(50)
                .get();

              if (records.data.length === 0) {
                subHasMore = false;
              } else {
                for (const doc of records.data) {
                  await db.collection(collection).doc(doc._id).remove();
                  deleted++;
                }
              }
            }
          } catch (e) {
            // 忽略单条删除错误
          }
        }
        results[collection] = deleted;
        console.log(`${collection}: 删除 ${deleted} 条`);
      }

      // 3. 删除农户
      let farmerDeleted = 0;
      for (const farmerId of oldFarmerIds) {
        try {
          await db.collection('farmers').doc(farmerId).remove();
          farmerDeleted++;
        } catch (e) {
          // 忽略
        }
      }
      results.farmers = farmerDeleted;
      console.log(`farmers: 删除 ${farmerDeleted} 条`);

      return {
        success: true,
        message: '旧测试数据清理完成',
        data: results
      };

    } else if (action === 'cleanAll') {
      // 危险操作：清空所有数据（仅用于测试环境）
      const { confirm } = event;
      if (confirm !== 'YES_DELETE_ALL') {
        return {
          success: false,
          message: '危险操作！需要传入 confirm: "YES_DELETE_ALL" 确认'
        };
      }

      console.log('开始清空所有数据...');

      const collections = ['farmers', 'seed_records', 'business_records', 'acquisitions', 'settlements'];
      const results = {};

      for (const collection of collections) {
        let deleted = 0;
        let hasMore = true;

        while (hasMore) {
          const res = await db.collection(collection).limit(100).get();

          if (res.data.length === 0) {
            hasMore = false;
            break;
          }

          for (const doc of res.data) {
            try {
              await db.collection(collection).doc(doc._id).remove();
              deleted++;
            } catch (e) {
              console.error(`删除 ${collection} 失败:`, e.message);
            }
          }
        }

        results[collection] = deleted;
        console.log(`${collection}: 删除 ${deleted} 条`);
      }

      return {
        success: true,
        message: '所有数据已清空',
        data: results
      };

    } else {
      return {
        success: false,
        message: '未知操作，请使用 action: "createAssistantsAndFarmers" / "generateFarmersOnly" / "generate" / "clean" / "stats"'
      };
    }

  } catch (error) {
    console.error('操作失败:', error);
    return {
      success: false,
      message: error.message || '操作失败'
    };
  }
};
