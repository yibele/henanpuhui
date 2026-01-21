/**
 * 批量创建测试农户数据
 * 运行方式：在云开发控制台创建云函数或直接在数据库中运行
 */

const cloud = require('wx-server-sdk');
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 生成农户编号
function generateFarmerId(index) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `FAR_${year}${month}${day}_${String(index).padStart(4, '0')}`;
}

// 随机生成手机号
function generatePhone(index) {
    const prefixes = ['138', '139', '150', '151', '152', '186', '187'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return prefix + String(10000000 + index).slice(-8);
}

// 随机生成身份证号
function generateIdCard(index) {
    const prefix = '41072519';  // 河南某地
    const year = 70 + Math.floor(Math.random() * 30);  // 1970-1999
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const suffix = String(1000 + index).slice(-4);
    return prefix + year + month + day + suffix;
}

// 姓氏列表
const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗', '郑'];
const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '华', '平'];

// 乡镇列表
const townships = ['城关镇', '东风镇', '西城镇', '南关镇', '北街镇', '青山镇', '绿水镇', '朝阳镇', '红旗镇', '新华镇'];
const villages = ['东村', '西村', '南村', '北村', '前村', '后村', '上村', '下村', '新村', '老村'];

// 生成测试农户数据
function generateTestFarmers(count, userId, userName) {
    const farmers = [];

    for (let i = 1; i <= count; i++) {
        // 随机面积 10-50 亩
        const acreage = Math.floor(Math.random() * 41) + 10;
        // 每亩 9.5 万株
        const seedTotal = acreage * 9.5;
        // 定金 5 万
        const deposit = 50000;
        // 应收金额（假设单价 0.1 元/株）
        const receivableAmount = seedTotal * 10000 * 0.1;

        const surname = surnames[Math.floor(Math.random() * surnames.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        const township = townships[Math.floor(Math.random() * townships.length)];
        const village = villages[Math.floor(Math.random() * villages.length)];

        farmers.push({
            farmerId: generateFarmerId(i),
            name: surname + name,
            phone: generatePhone(i),
            idCard: generateIdCard(i),

            // 地址
            address: {
                county: '示范县',
                township: township,
                village: village
            },
            addressText: `示范县${township}${village}`,

            // 签约信息
            acreage: acreage,
            seedTotal: seedTotal,           // 万株
            seedUnitPrice: 0.1,             // 元/株
            receivableAmount: receivableAmount,
            deposit: deposit,
            seedDebt: receivableAmount - deposit,

            // 等级
            grade: ['gold', 'silver', 'bronze'][Math.floor(Math.random() * 3)],

            // 负责人
            firstManager: userId,
            firstManagerName: userName,

            // 统计（初始为空）
            stats: {
                totalSeedDistributed: 0,
                seedDistributionCount: 0,
                totalSeedAmount: 0,
                totalSeedArea: 0
            },
            seedDistributionComplete: false,

            // 系统字段
            status: 'active',
            isDeleted: false,
            createTime: db.serverDate(),
            createBy: userId,
            createByName: userName,
            updateTime: db.serverDate()
        });
    }

    return farmers;
}

// 云函数入口
exports.main = async (event, context) => {
    const { userId, userName, count = 40 } = event;

    if (!userId) {
        return { success: false, message: '请提供 userId' };
    }

    try {
        const farmers = generateTestFarmers(count, userId, userName || '测试助理');

        // 分批插入（每批 20 条）
        const batchSize = 20;
        let inserted = 0;

        for (let i = 0; i < farmers.length; i += batchSize) {
            const batch = farmers.slice(i, i + batchSize);

            // 批量插入
            const tasks = batch.map(farmer => {
                return db.collection('farmers').add({ data: farmer });
            });

            await Promise.all(tasks);
            inserted += batch.length;
            console.log(`已插入 ${inserted}/${farmers.length} 条`);
        }

        return {
            success: true,
            message: `成功创建 ${inserted} 个测试农户`,
            data: { count: inserted }
        };

    } catch (error) {
        console.error('创建测试数据失败:', error);
        return {
            success: false,
            message: error.message || '创建测试数据失败'
        };
    }
};
