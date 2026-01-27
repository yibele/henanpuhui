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
        quantity,         // 发放数量（万株）
        unitPrice,        // 单价（元/万株）
        amount,           // 金额（元）
        distributedArea,  // 已发放面积（亩）
        distributionDate, // 发放日期
        receiverName,     // 领取人
        receiveLocation,  // 领取地点
        managerName,      // 发苗负责人
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
        const area = parseFloat(distributedArea) || 0;

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
                distributedArea: area,   // 已发放面积

                // 领取信息
                receiverName: receiverName || farmer.name,
                receiveLocation: receiveLocation || '',
                managerName: managerName || userName || '',

                // 其他信息
                distributionDate: distributionDate || new Date().toISOString().split('T')[0],
                remark: remark || '',

                // 操作信息
                createTime: db.serverDate(),
                createBy: userId,
                createByName: userName || ''
            }
        });

        // 5. 更新农户统计（累计发放数量、金额和面积）
        const currentDistributed = farmer.stats?.totalSeedDistributed || 0;
        const currentAmount = farmer.stats?.totalSeedAmount || 0;
        const currentArea = farmer.stats?.totalSeedArea || 0;
        const currentCount = farmer.stats?.seedDistributionCount || 0;

        await db.collection('farmers').doc(farmerId).update({
            data: {
                'stats.totalSeedDistributed': currentDistributed + qty,
                'stats.totalSeedAmount': currentAmount + seedAmount,
                'stats.totalSeedArea': currentArea + area,  // 累加已发面积
                'stats.seedDistributionCount': currentCount + 1, // 累计发苗次数
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
                unit: '万株',
                unitPrice: price,
                totalAmount: seedAmount,
                distributedArea: area,  // 已发面积

                // 领取信息
                receiverName: receiverName || farmer.name,
                receiveLocation: receiveLocation || '',
                managerName: managerName || userName || '',

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
 * 获取单条记录详情
 */
async function getRecordDetail(event) {
    const { recordId } = event;

    if (!recordId) {
        return {
            success: false,
            message: '缺少记录ID'
        };
    }

    try {
        const res = await db.collection('seed_records').doc(recordId).get();

        if (res.data) {
            return {
                success: true,
                data: res.data
            };
        } else {
            return {
                success: false,
                message: '记录不存在'
            };
        }
    } catch (error) {
        console.error('获取记录详情失败:', error);
        return {
            success: false,
            message: error.message || '获取记录详情失败'
        };
    }
}

/**
 * 更新发放记录（同步更新农户统计）
 */
async function updateSeedRecord(event) {
    const { recordId, data } = event;

    if (!recordId || !data) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    try {
        // 1. 先获取原记录
        const oldRecord = await db.collection('seed_records').doc(recordId).get();
        if (!oldRecord.data) {
            return {
                success: false,
                message: '记录不存在'
            };
        }

        const old = oldRecord.data;
        const farmerId = old.farmerId;

        // 2. 计算差值
        const diffQuantity = (data.quantity || 0) - (old.quantity || 0);
        const diffAmount = (data.amount || 0) - (old.amount || 0);
        const diffArea = (data.distributedArea || 0) - (old.distributedArea || 0);

        // 3. 更新记录
        await db.collection('seed_records').doc(recordId).update({
            data: {
                quantity: data.quantity,
                unitPrice: data.unitPrice,
                amount: data.amount,
                distributedArea: data.distributedArea,
                distributionDate: data.distributionDate,
                receiverName: data.receiverName,
                receiveLocation: data.receiveLocation,
                managerName: data.managerName,
                remark: data.remark,
                updateTime: db.serverDate()
            }
        });

        // 4. 同步更新农户统计（如果有差值）
        if (diffQuantity !== 0 || diffAmount !== 0 || diffArea !== 0) {
            await db.collection('farmers').doc(farmerId).update({
                data: {
                    'stats.totalSeedDistributed': _.inc(diffQuantity),
                    'stats.totalSeedAmount': _.inc(diffAmount),
                    'stats.totalSeedArea': _.inc(diffArea),
                    updateTime: db.serverDate()
                }
            });
        }

        return {
            success: true,
            message: '更新成功'
        };

    } catch (error) {
        console.error('更新发放记录失败:', error);
        return {
            success: false,
            message: error.message || '更新发放记录失败'
        };
    }
}

/**
 * 删除发放记录（同步更新农户统计）
 */
async function deleteSeedRecord(event) {
    const { recordId } = event;

    if (!recordId) {
        return {
            success: false,
            message: '缺少记录ID'
        };
    }

    try {
        // 1. 先获取原记录
        const oldRecord = await db.collection('seed_records').doc(recordId).get();
        if (!oldRecord.data) {
            return {
                success: false,
                message: '记录不存在'
            };
        }

        const old = oldRecord.data;
        const farmerId = old.farmerId;
        const quantity = old.quantity || 0;
        const amount = old.amount || 0;
        const area = old.distributedArea || 0;

        // 2. 删除记录
        await db.collection('seed_records').doc(recordId).remove();

        // 3. 同步减少农户统计
        await db.collection('farmers').doc(farmerId).update({
            data: {
                'stats.totalSeedDistributed': _.inc(-quantity),
                'stats.totalSeedAmount': _.inc(-amount),
                'stats.totalSeedArea': _.inc(-area),
                'stats.seedDistributionCount': _.inc(-1),
                updateTime: db.serverDate()
            }
        });

        return {
            success: true,
            message: '删除成功'
        };

    } catch (error) {
        console.error('删除发放记录失败:', error);
        return {
            success: false,
            message: error.message || '删除发放记录失败'
        };
    }
}

/**
 * 获取所有农户的发苗统计
 * 返回 farmerId -> { recordCount, totalQuantity } 的映射
 */
async function getDistributionStats(event) {
    try {
        // 获取所有发苗记录
        const records = await db.collection('seed_records')
            .field({ farmerId: true, quantity: true })
            .limit(1000)  // 最多返回1000条
            .get();

        // 按农户分组统计
        const statsMap = {};
        records.data.forEach(record => {
            const farmerId = record.farmerId;
            if (!statsMap[farmerId]) {
                statsMap[farmerId] = {
                    recordCount: 0,
                    totalQuantity: 0
                };
            }
            statsMap[farmerId].recordCount += 1;
            statsMap[farmerId].totalQuantity += (record.quantity || 0);
        });

        return {
            success: true,
            data: statsMap
        };

    } catch (error) {
        console.error('获取发苗统计失败:', error);
        return {
            success: false,
            message: error.message || '获取发苗统计失败'
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

        case 'getDetail':
            return await getRecordDetail(event);

        case 'update':
            return await updateSeedRecord(event);

        case 'delete':
            return await deleteSeedRecord(event);

        case 'getDistributionStats':
            return await getDistributionStats(event);

        default:
            return {
                success: false,
                message: '无效的操作类型'
            };
    }
};
