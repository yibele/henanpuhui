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
const $ = db.command.aggregate;

// 引入精确计算工具
const { multiply, add, subtract, roundToFen } = require('./calc');

/**
 * 通用四舍五入到2位小数（用于非金额字段如面积、数量）
 */
function roundTo2(val) {
  if (!Number.isFinite(val)) return 0;
  return Math.round(val * 100) / 100;
}

/**
 * 种苗欠款计算（甲方口径）
 * 规则：种苗欠款 = max(0, 累计发苗金额 - 定金)
 * 说明：定金仅抵扣一次，后续发苗自然体现在累计发苗金额里
 */
function calculateSeedDebtByDeposit(totalSeedAmount, deposit) {
    const total = Number.isFinite(totalSeedAmount) ? totalSeedAmount : 0;
    const downPayment = Number.isFinite(deposit) ? deposit : 0;
    return roundToFen(Math.max(0, subtract(total, downPayment)));
}

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

function normalizeFarmerLookupValue(farmerId) {
    const value = String(farmerId || '').trim();
    return value || '';
}

function buildActiveFarmerStatusCondition() {
    return _.or([
        { status: 'active' },
        { status: _.exists(false) },
        { status: '' },
        { status: null }
    ]);
}

async function findFarmerByAnyId(farmerId, options = {}) {
    const value = normalizeFarmerLookupValue(farmerId);
    if (!value) return null;

    const { onlyActive = false } = options;
    const activeStatus = buildActiveFarmerStatusCondition();

    let whereByCode = { farmerId: value };
    if (onlyActive) whereByCode = _.and([whereByCode, activeStatus]);

    const farmerRes = await db.collection('farmers')
        .where(whereByCode)
        .limit(1)
        .get();
    if (farmerRes.data.length > 0) return farmerRes.data[0];

    return null;
}

function buildFarmerIdCandidates(farmer) {
    if (!farmer) return [];
    return Array.from(new Set([
        String(farmer.farmerId || '').trim()
    ].filter(Boolean)));
}

/**
 * 发放种苗
 * 权限：助理/管理员/财务可对全量农户发苗
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
        // ==================== 权限检查开始 ====================

        // 1. 获取用户信息，验证角色
        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
            return {
                success: false,
                message: '用户不存在'
            };
        }

        const currentUser = userRes.data;

        // 2. 只有助理和管理员可以发放种苗
        if (!['assistant', 'admin', 'finance_admin'].includes(currentUser.role)) {
            return {
                success: false,
                message: `您当前角色（${currentUser.role}）无权限发放种苗`
            };
        }

        // ==================== 权限检查结束 ====================

        // 4. 获取农户信息（统一按业务编号 farmerId）
        const farmer = await findFarmerByAnyId(farmerId, { onlyActive: true });
        if (!farmer) {
            return {
                success: false,
                message: '农户不存在'
            };
        }
        const canonicalFarmerId = farmer.farmerId;
        const farmerDocId = farmer._id;

        // 2. 计算金额 - 使用精确计算
        const price = parseFloat(unitPrice) || 0;
        const seedAmount = parseFloat(amount) || multiply(qty, price);
        const area = parseFloat(distributedArea) || 0;

        // 3. 生成记录编号
        const recordId = generateRecordId();
        const bizRecordId = `BIZ_${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}_${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        // 4. 计算农户统计更新值 - 使用精确计算
        const currentDistributed = farmer.stats?.totalSeedDistributed || 0;
        const currentAmount = farmer.stats?.totalSeedAmount || 0;
        const currentArea = farmer.stats?.totalSeedArea || 0;
        const currentCount = farmer.stats?.seedDistributionCount || 0;
        const depositAmount = parseFloat(farmer.deposit) || 0;
        const newTotalSeedAmount = roundToFen(add(currentAmount, seedAmount));
        const newSeedDebt = calculateSeedDebtByDeposit(newTotalSeedAmount, depositAmount);

        // ==================== 事务操作开始 ====================
        const transaction = await db.startTransaction();

        try {
            // 5. 写入种苗发放记录表
            await transaction.collection('seed_records').add({
                data: {
                    recordId,
                    farmerId: canonicalFarmerId,
                    farmerDocId,
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

            // 6. 更新农户统计（累计发放数量、金额和面积）- 使用精确计算
            await transaction.collection('farmers').doc(farmerDocId).update({
                data: {
                    'stats.totalSeedDistributed': roundTo2(add(currentDistributed, qty)),
                    'stats.totalSeedAmount': newTotalSeedAmount,
                    'stats.totalSeedArea': roundTo2(add(currentArea, area)),  // 累加已发面积
                    'stats.seedDistributionCount': currentCount + 1, // 累计发苗次数
                    'stats.lastSeedDistributionDate': db.serverDate(),
                    seedDebt: newSeedDebt,
                    'stats.seedDebt': newSeedDebt,
                    updateTime: db.serverDate()
                }
            });

            // 7. 同时写入业务记录表（便于统一展示）
            await transaction.collection('business_records').add({
                data: {
                    recordId: bizRecordId,
                    farmerId: canonicalFarmerId,
                    farmerDocId,
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

            // 提交事务
            await transaction.commit();
        } catch (transactionError) {
            // 事务失败，回滚
            await transaction.rollback();
            console.error('发苗事务失败:', transactionError);
            throw transactionError;
        }
        // ==================== 事务操作结束 ====================

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
 * 权限：助理、管理员和财务均可查看全量农户记录
 */
async function getSeedRecordsByFarmer(event) {
    const { farmerId, page = 1, pageSize = 20, userId } = event;

    if (!farmerId || !userId) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    try {
        // ==================== 权限检查开始 ====================

        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
            return {
                success: false,
                message: '用户不存在'
            };
        }

        // ==================== 权限检查结束 ====================

        const farmer = await findFarmerByAnyId(farmerId);
        if (!farmer) {
            return {
                success: false,
                message: '农户不存在'
            };
        }

        const skip = (page - 1) * pageSize;
        const whereCondition = {
            farmerId: farmer.farmerId,
            status: _.neq('deleted')
        };

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
        console.error('获取发放记录失败:', error);
        return {
            success: false,
            message: error.message || '获取发放记录失败'
        };
    }
}

/**
 * 获取发放记录列表
 * 权限：助理只能查看自己的记录，管理员和财务可以查看所有记录
 */
async function listSeedRecords(event) {
    const { userId, page = 1, pageSize = 20, startDate, endDate, keyword } = event;

    if (!userId) {
        return {
            success: false,
            message: '缺少用户ID'
        };
    }

    try {
        // ==================== 权限检查开始 ====================

        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
            return {
                success: false,
                message: '用户不存在'
            };
        }

        const userRole = userRes.data.role;
        const allowedRoles = ['assistant', 'admin', 'finance_admin'];
        if (!allowedRoles.includes(userRole)) {
            return {
                success: true,
                data: {
                    list: [],
                    total: 0,
                    page,
                    pageSize
                }
            };
        }

        const skip = (page - 1) * pageSize;

        // 构建查询条件
        let whereCondition = {};

        // 助理只能查看自己创建的记录
        if (userRole === 'assistant') {
            whereCondition.createBy = userId;
        }
        // 管理员和财务不限制，可以查看所有记录
        // 仓库管理员和出纳不应该调用此接口，但如果不小心调用了，返回空列表

        // 关键字搜索（农户姓名或手机号）
        if (keyword && keyword.trim()) {
            const kw = keyword.trim();
            // 使用正则匹配农户姓名或手机号
            whereCondition = _.and([
                whereCondition,
                _.or([
                    { farmerName: db.RegExp({ regexp: kw, options: 'i' }) },
                    { farmerPhone: db.RegExp({ regexp: kw, options: 'i' }) }
                ])
            ]);
        }

        if (startDate && endDate) {
            whereCondition.createTime = _.gte(new Date(startDate)).and(_.lte(new Date(endDate)));
        }

        // ==================== 权限检查结束 ====================

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
 * 权限：助理只能查看自己创建的记录，管理员和财务可以查看所有记录
 */
async function getRecordDetail(event) {
    const { recordId, userId } = event;

    if (!recordId || !userId) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    try {
        // ==================== 权限检查开始 ====================

        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
            return {
                success: false,
                message: '用户不存在'
            };
        }
        const userRole = userRes.data.role;

        // 获取记录
        const res = await db.collection('seed_records').doc(recordId).get();

        if (!res.data) {
            return {
                success: false,
                message: '记录不存在'
            };
        }

        // 如果是助理，检查是否是自己创建的记录
        if (userRole === 'assistant' && res.data.createBy !== userId) {
            return {
                success: false,
                message: '无权限查看此记录'
            };
        }

        // ==================== 权限检查结束 ====================

        return {
            success: true,
            data: res.data
        };
    } catch (error) {
        console.error('获取记录详情失败:', error);
        return {
            success: false,
            message: error.message || '获取记录详情失败'
        };
    }
}

/**
 * 更新发放记录
 * 权限：助理可编辑全部记录；管理员可编辑全部记录；其他角色沿用原有校验
 */
async function updateSeedRecord(event) {
    const { recordId, data, userId } = event;

    if (!recordId || !data || !userId) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    try {
        // ==================== 权限检查开始 ====================

        // 1. 先获取原记录
        const oldRecord = await db.collection('seed_records').doc(recordId).get();
        if (!oldRecord.data) {
            return {
                success: false,
                message: '记录不存在'
            };
        }

        // 2. 检查权限
        const old = oldRecord.data;

        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
            return {
                success: false,
                message: '用户不存在'
            };
        }
        const currentUser = userRes.data;

        // 助理和管理员可编辑全部记录；其他角色仅可编辑自己创建的记录
        if (!['assistant', 'admin'].includes(currentUser.role) && old.createBy !== userId) {
            return {
                success: false,
                message: '无权限修改此记录'
            };
        }

        // ==================== 权限检查结束 ====================

        // 2. 计算差值 - 使用精确计算
        const diffQuantity = subtract((data.quantity || 0), (old.quantity || 0));
        const diffAmount = subtract((data.amount || 0), (old.amount || 0));
        const diffArea = subtract((data.distributedArea || 0), (old.distributedArea || 0));

        // 3. 获取农户信息（统一按业务编号 farmerId）
        const farmer = await findFarmerByAnyId(old.farmerId);
        if (!farmer) {
            return {
                success: false,
                message: '关联农户不存在'
            };
        }
        const canonicalFarmerId = farmer.farmerId || old.farmerId || '';
        const farmerDocId = farmer._id;

        // 4. 计算差值后更新农户汇总
        let farmerUpdateData = null;
        if (diffQuantity !== 0 || diffAmount !== 0 || diffArea !== 0) {
            const currentDistributed = farmer.stats?.totalSeedDistributed || 0;
            const currentAmount = farmer.stats?.totalSeedAmount || 0;
            const currentArea = farmer.stats?.totalSeedArea || 0;
            const depositAmount = parseFloat(farmer.deposit) || 0;
            const nextTotalSeedAmount = roundToFen(Math.max(0, add(currentAmount, diffAmount)));
            const newSeedDebt = calculateSeedDebtByDeposit(nextTotalSeedAmount, depositAmount);

            farmerUpdateData = {
                'stats.totalSeedDistributed': roundTo2(Math.max(0, add(currentDistributed, diffQuantity))),
                'stats.totalSeedAmount': nextTotalSeedAmount,
                'stats.totalSeedArea': roundTo2(Math.max(0, add(currentArea, diffArea))),
                seedDebt: newSeedDebt,
                'stats.seedDebt': newSeedDebt,
                updateTime: db.serverDate()
            };
        }

        // ==================== 事务操作开始 ====================
        const transaction = await db.startTransaction();

        try {
            // 5. 更新发苗记录，并顺带修正 farmerId 口径
            await transaction.collection('seed_records').doc(recordId).update({
                data: {
                    farmerId: canonicalFarmerId,
                    farmerDocId,
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

            // 5. 同步更新农户统计（如果有差值）
            if (farmerUpdateData && farmer) {
                await transaction.collection('farmers').doc(farmerDocId).update({
                    data: farmerUpdateData
                });
            }

            // 提交事务
            await transaction.commit();
        } catch (transactionError) {
            // 事务失败，回滚
            await transaction.rollback();
            console.error('更新发苗记录事务失败:', transactionError);
            throw transactionError;
        }
        // ==================== 事务操作结束 ====================

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
 * 删除发放记录
 * 权限：助理不可删除；管理员可删除全部；其他角色仅可删除自己创建的记录
 */
async function deleteSeedRecord(event) {
    const { recordId, userId } = event;

    if (!recordId || !userId) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    try {
        // ==================== 权限检查开始 ====================

        // 1. 先获取原记录
        const oldRecord = await db.collection('seed_records').doc(recordId).get();
        if (!oldRecord.data) {
            return {
                success: false,
                message: '记录不存在'
            };
        }

        // 2. 检查权限
        const old = oldRecord.data;

        const userRes = await db.collection('users').doc(userId).get();
        if (!userRes.data) {
            return {
                success: false,
                message: '用户不存在'
            };
        }
        const currentUser = userRes.data;

        // 助理不可删除任何记录
        if (currentUser.role === 'assistant') {
            return {
                success: false,
                message: '助理无权限删除发苗记录'
            };
        }

        // 管理员可删除全部；其他角色仅可删除自己创建的记录
        if (currentUser.role !== 'admin' && old.createBy !== userId) {
            return {
                success: false,
                message: '无权限删除此记录'
            };
        }

        // ==================== 权限检查结束 ====================

        const farmerId = old.farmerId;
        const quantity = old.quantity || 0;
        const amount = old.amount || 0;
        const area = old.distributedArea || 0;

        // 2. 获取农户信息，计算更新值
        const farmer = await findFarmerByAnyId(farmerId);
        if (!farmer) {
            return {
                success: false,
                message: '关联农户不存在'
            };
        }
        const farmerDocId = farmer._id;
        const currentDistributed = farmer.stats?.totalSeedDistributed || 0;
        const currentAmount = farmer.stats?.totalSeedAmount || 0;
        const currentArea = farmer.stats?.totalSeedArea || 0;
        const currentCount = farmer.stats?.seedDistributionCount || 0;
        const depositAmount = parseFloat(farmer.deposit) || 0;
        const nextTotalSeedAmount = roundToFen(Math.max(0, subtract(currentAmount, amount)));
        const newSeedDebt = calculateSeedDebtByDeposit(nextTotalSeedAmount, depositAmount);

        // ==================== 事务操作开始 ====================
        const transaction = await db.startTransaction();

        try {
            // 3. 软删除发苗记录
            await transaction.collection('seed_records').doc(recordId).update({
                data: {
                    status: 'deleted',
                    deleteBy: userId,
                    deleteByName: currentUser.name,
                    deleteTime: db.serverDate(),
                    updateTime: db.serverDate()
                }
            });

            // 4. 同步减少农户统计 - 使用精确计算
            await transaction.collection('farmers').doc(farmerDocId).update({
                data: {
                    'stats.totalSeedDistributed': roundTo2(Math.max(0, subtract(currentDistributed, quantity))),
                    'stats.totalSeedAmount': nextTotalSeedAmount,
                    'stats.totalSeedArea': roundTo2(Math.max(0, subtract(currentArea, area))),
                    'stats.seedDistributionCount': Math.max(0, currentCount - 1),
                    seedDebt: newSeedDebt,
                    'stats.seedDebt': newSeedDebt,
                    updateTime: db.serverDate()
                }
            });

            // 提交事务
            await transaction.commit();
        } catch (transactionError) {
            // 事务失败，回滚
            await transaction.rollback();
            console.error('删除发苗记录事务失败:', transactionError);
            throw transactionError;
        }
        // ==================== 事务操作结束 ====================

        // 在事务成功后（事务外），尝试清理关联的 business_records
        try {
            // 使用 seed record 的创建时间范围来定位关联的 business_record
            const seedRecord = old; // 已有的原记录
            await db.collection('business_records')
                .where({
                    farmerId: farmer.farmerId,
                    type: 'seed',
                    'quantity': seedRecord.quantity,
                    'totalAmount': seedRecord.amount
                })
                .update({
                    data: {
                        status: 'deleted',
                        deleteBy: userId,
                        deleteTime: db.serverDate(),
                        updateTime: db.serverDate()
                    }
                });
        } catch (e) {
            console.error('清理关联 business_records 失败（不影响主流程）:', e);
        }

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
        // 直接使用农户冗余统计字段，避免扫描 seed_records 明细
        const BATCH_SIZE = 100;
        let skip = 0;
        const allFarmers = [];

        const activeStatus = _.or([
            { status: 'active' },
            { status: _.exists(false) },
            { status: '' },
            { status: null }
        ]);

        while (true) {
            const batch = await db.collection('farmers')
                .where(activeStatus)
                .field({ farmerId: true, stats: true })
                .skip(skip)
                .limit(BATCH_SIZE)
                .get();

            const rows = batch.data || [];
            allFarmers.push(...rows);

            if (rows.length < BATCH_SIZE) {
                break;
            }
            skip += BATCH_SIZE;
        }

        // 转换为 farmerId -> { recordCount, totalQuantity } 映射
        const statsMap = {};
        allFarmers.forEach(farmer => {
            const stats = farmer.stats || {};
            const recordCount = stats.seedDistributionCount || 0;
            const totalQuantity = stats.totalSeedDistributed || 0;

            const key = String(farmer.farmerId || '').trim();
            if (!key) return;

            // key 使用业务农户ID（farmerId）
            statsMap[key] = {
                recordCount,
                totalQuantity
            };
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
 * 获取发苗汇总统计（聚合查询，不受分页限制）
 * 返回：总数量、总金额、总面积、农户数、记录数
 */
async function getSeedSummaryStats() {
    try {
        const matchCondition = { status: _.neq('deleted') };

        // 聚合统计：总数量、总金额、总面积
        const aggRes = await db.collection('seed_records')
            .aggregate()
            .match(matchCondition)
            .group({
                _id: null,
                totalQuantity: $.sum('$quantity'),
                totalAmount: $.sum('$amount'),
                totalArea: $.sum('$distributedArea'),
                recordCount: $.sum(1)
            })
            .end();

        const agg = aggRes.list[0] || {
            totalQuantity: 0,
            totalAmount: 0,
            totalArea: 0,
            recordCount: 0
        };

        // 农户去重计数
        const farmerAggRes = await db.collection('seed_records')
            .aggregate()
            .match(matchCondition)
            .group({
                _id: '$farmerId'
            })
            .group({
                _id: null,
                farmerCount: $.sum(1)
            })
            .end();

        const farmerCount = farmerAggRes.list[0]?.farmerCount || 0;

        return {
            success: true,
            data: {
                totalQuantity: agg.totalQuantity || 0,
                totalAmount: agg.totalAmount || 0,
                totalArea: agg.totalArea || 0,
                recordCount: agg.recordCount || 0,
                farmerCount
            }
        };
    } catch (error) {
        console.error('获取发苗汇总统计失败:', error);
        return {
            success: false,
            message: error.message || '获取发苗汇总统计失败'
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

        case 'getSummaryStats':
            return await getSeedSummaryStats();

        default:
            return {
                success: false,
                message: '无效的操作类型'
            };
    }
};
