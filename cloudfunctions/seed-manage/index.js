/**
 * 种苗发放管理云函数
 * 
 * 功能：
 * - distribute: 发放种苗
 * - list: 获取发放记录列表
 * - getByFarmer: 获取某农户的发放记录
 */

const cloud = require('wx-server-sdk');
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 生成发放记录编号
 * 格式：SEED_YYYYMMDD_XXXX
 */
function generateRecordId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `SEED_${year}${month}${day}_${random}`;
}

/**
 * 发放种苗
 */
async function distributeSeed(event) {
    const { userId, userName, farmerId, data } = event;

    if (!userId || !farmerId) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    const {
        quantity,        // 发放数量（株）
        unitPrice,       // 单价（元/株）
        amount,          // 金额（元）
        distributionDate, // 发放日期
        remark
    } = data;

    // 验证数量
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) {
        return {
            success: false,
            message: '请输入有效的发放数量'
        };
    }

    try {
        // 1. 获取农户信息
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

        // 2. 计算金额
        const price = parseFloat(unitPrice) || 0;
        const seedAmount = parseFloat(amount) || (qty * price);

        // 3. 生成记录编号
        const recordId = generateRecordId();

        // 4. 写入种苗发放记录表
        await db.collection('seed_records').add({
            data: {
                recordId,
                farmerId,
                farmerName: farmer.name,
                farmerPhone: farmer.phone,

                // 发放信息
                quantity: qty,
                unitPrice: price,
                amount: seedAmount,

                // 其他信息
                distributionDate: distributionDate || new Date().toISOString().split('T')[0],
                remark: remark || '',

                // 操作信息
                createTime: db.serverDate(),
                createBy: userId,
                createByName: userName || ''
            }
        });

        // 5. 更新农户统计（累计发放数量和金额）
        const currentDistributed = farmer.stats?.totalSeedDistributed || 0;
        const currentAmount = farmer.stats?.totalSeedAmount || 0;

        await db.collection('farmers').doc(farmerId).update({
            data: {
                'stats.totalSeedDistributed': currentDistributed + qty,
                'stats.totalSeedAmount': currentAmount + seedAmount,
                'stats.lastSeedDistributionDate': db.serverDate(),
                updateTime: db.serverDate()
            }
        });

        // 6. 同时写入业务记录表（便于统一展示）
        const bizRecordId = `BIZ_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        await db.collection('business_records').add({
            data: {
                recordId: bizRecordId,
                farmerId,
                farmerName: farmer.name,
                type: 'seed',

                // 发放内容
                quantity: qty,
                unit: '株',
                unitPrice: price,
                totalAmount: seedAmount,

                remark: remark || '',
                createTime: db.serverDate(),
                createBy: userId,
                createByName: userName || ''
            }
        });

        return {
            success: true,
            message: '发放成功',
            data: {
                recordId,
                quantity: qty,
                amount: seedAmount,
                totalDistributed: currentDistributed + qty
            }
        };

    } catch (error) {
        console.error('发放种苗失败:', error);
        return {
            success: false,
            message: error.message || '发放种苗失败'
        };
    }
}

/**
 * 获取农户的发放记录
 */
async function getSeedRecordsByFarmer(event) {
    const { farmerId, page = 1, pageSize = 20 } = event;

    if (!farmerId) {
        return {
            success: false,
            message: '缺少农户ID'
        };
    }

    try {
        const skip = (page - 1) * pageSize;

        // 获取总数
        const countRes = await db.collection('seed_records')
            .where({ farmerId })
            .count();

        // 获取列表
        const listRes = await db.collection('seed_records')
            .where({ farmerId })
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
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
        console.error('获取发放记录失败:', error);
        return {
            success: false,
            message: error.message || '获取发放记录失败'
        };
    }
}

/**
 * 获取发放记录列表（按操作人）
 */
async function listSeedRecords(event) {
    const { userId, page = 1, pageSize = 20, startDate, endDate } = event;

    try {
        const skip = (page - 1) * pageSize;

        // 构建查询条件
        let whereCondition = {};
        if (userId) {
            whereCondition.createBy = userId;
        }
        if (startDate && endDate) {
            whereCondition.createTime = _.gte(new Date(startDate)).and(_.lte(new Date(endDate)));
        }

        // 获取总数
        const countRes = await db.collection('seed_records')
            .where(whereCondition)
            .count();

        // 获取列表
        const listRes = await db.collection('seed_records')
            .where(whereCondition)
            .orderBy('createTime', 'desc')
            .skip(skip)
            .limit(pageSize)
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
        console.error('获取发放记录列表失败:', error);
        return {
            success: false,
            message: error.message || '获取发放记录列表失败'
        };
    }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
    const { action } = event;

    switch (action) {
        case 'distribute':
            return await distributeSeed(event);

        case 'getByFarmer':
            return await getSeedRecordsByFarmer(event);

        case 'list':
            return await listSeedRecords(event);

        default:
            return {
                success: false,
                message: '无效的操作类型'
            };
    }
};
