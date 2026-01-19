/**
 * 仓库管理云函数
 * 
 * 功能：
 * - list: 获取所有仓库列表（含库存统计）
 * - getDetail: 获取单个仓库详情
 * - addLog: 添加仓库日志（打包/出库）
 * - getLogs: 获取仓库日志列表
 * - getTodayStats: 获取今日统计
 */

const cloud = require('wx-server-sdk');
cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 获取今日日期字符串
 */
function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取所有仓库列表
 */
async function listWarehouses(event) {
    const { userId } = event;

    try {
        // 获取当前用户信息
        let currentUser = null;
        if (userId) {
            const userRes = await db.collection('users').doc(userId).get();
            currentUser = userRes.data;
        }

        // 获取所有仓库
        const warehousesRes = await db.collection('warehouses')
            .where({ status: 'active' })
            .orderBy('code', 'asc')
            .get();

        const warehouses = warehousesRes.data;
        const today = getTodayDate();

        // 为每个仓库计算今日统计
        const result = await Promise.all(warehouses.map(async (warehouse) => {
            // 获取今日收购数据
            const todayAcquisitions = await db.collection('acquisitions')
                .where({
                    warehouseId: warehouse._id,
                    acquisitionDate: today,
                    status: _.neq('deleted')
                })
                .get();

            let todayAcquisitionWeight = 0;
            todayAcquisitions.data.forEach(acq => {
                todayAcquisitionWeight += acq.netWeight || acq.weight || 0;
            });

            // 获取今日日志数据
            const todayLogs = await db.collection('warehouse_logs')
                .where({
                    warehouseId: warehouse._id,
                    date: today
                })
                .get();

            let todayPackCount = 0;
            let todayOutboundWeight = 0;
            let todayOutboundCount = 0;

            todayLogs.data.forEach(log => {
                todayPackCount += log.packCount || 0;
                todayOutboundWeight += log.outboundWeight || 0;
                todayOutboundCount += log.outboundCount || 0;
            });

            // 计算库存
            const stats = warehouse.stats || {};
            const stockWeight = (stats.totalAcquisitionWeight || 0) - (stats.totalOutboundWeight || 0);
            const stockCount = (stats.totalPackCount || 0) - (stats.totalOutboundCount || 0);

            return {
                _id: warehouse._id,
                code: warehouse.code,
                name: warehouse.name,
                address: warehouse.address,
                manager: warehouse.manager,
                phone: warehouse.phone,
                isMyWarehouse: currentUser && currentUser.warehouseId === warehouse._id,
                today: {
                    acquisitionWeight: Number(todayAcquisitionWeight.toFixed(2)),
                    packCount: todayPackCount,
                    outboundWeight: Number(todayOutboundWeight.toFixed(2)),
                    outboundCount: todayOutboundCount
                },
                total: {
                    acquisitionWeight: stats.totalAcquisitionWeight || 0,
                    packCount: stats.totalPackCount || 0,
                    outboundWeight: stats.totalOutboundWeight || 0,
                    outboundCount: stats.totalOutboundCount || 0
                },
                stock: {
                    weight: Number(stockWeight.toFixed(2)),
                    count: stockCount
                }
            };
        }));

        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error('获取仓库列表失败:', error);
        return {
            success: false,
            message: error.message || '获取仓库列表失败'
        };
    }
}

/**
 * 获取仓库详情
 */
async function getWarehouseDetail(event) {
    const { warehouseId } = event;

    if (!warehouseId) {
        return {
            success: false,
            message: '缺少仓库ID'
        };
    }

    try {
        const warehouseRes = await db.collection('warehouses').doc(warehouseId).get();

        if (!warehouseRes.data) {
            return {
                success: false,
                message: '仓库不存在'
            };
        }

        const warehouse = warehouseRes.data;
        const today = getTodayDate();

        // 获取今日收购数据
        const todayAcquisitions = await db.collection('acquisitions')
            .where({
                warehouseId: warehouseId,
                acquisitionDate: today,
                status: _.neq('deleted')
            })
            .get();

        let todayAcquisitionWeight = 0;
        let todayAcquisitionCount = todayAcquisitions.data.length;
        todayAcquisitions.data.forEach(acq => {
            todayAcquisitionWeight += acq.netWeight || acq.weight || 0;
        });

        // 获取今日日志数据
        const todayLogs = await db.collection('warehouse_logs')
            .where({
                warehouseId: warehouseId,
                date: today
            })
            .get();

        let todayPackCount = 0;
        let todayOutboundWeight = 0;
        let todayOutboundCount = 0;

        todayLogs.data.forEach(log => {
            todayPackCount += log.packCount || 0;
            todayOutboundWeight += log.outboundWeight || 0;
            todayOutboundCount += log.outboundCount || 0;
        });

        // 计算库存
        const stats = warehouse.stats || {};
        const stockWeight = (stats.totalAcquisitionWeight || 0) - (stats.totalOutboundWeight || 0);
        const stockCount = (stats.totalPackCount || 0) - (stats.totalOutboundCount || 0);

        return {
            success: true,
            data: {
                warehouse: {
                    _id: warehouse._id,
                    code: warehouse.code,
                    name: warehouse.name,
                    address: warehouse.address,
                    manager: warehouse.manager,
                    phone: warehouse.phone
                },
                today: {
                    acquisitionWeight: Number(todayAcquisitionWeight.toFixed(2)),
                    acquisitionCount: todayAcquisitionCount,
                    packCount: todayPackCount,
                    outboundWeight: Number(todayOutboundWeight.toFixed(2)),
                    outboundCount: todayOutboundCount
                },
                total: {
                    acquisitionWeight: stats.totalAcquisitionWeight || 0,
                    acquisitionCount: stats.totalAcquisitionCount || 0,
                    packCount: stats.totalPackCount || 0,
                    outboundWeight: stats.totalOutboundWeight || 0,
                    outboundCount: stats.totalOutboundCount || 0
                },
                stock: {
                    weight: Number(stockWeight.toFixed(2)),
                    count: stockCount
                }
            }
        };
    } catch (error) {
        console.error('获取仓库详情失败:', error);
        return {
            success: false,
            message: error.message || '获取仓库详情失败'
        };
    }
}

/**
 * 添加仓库日志（打包/出库）
 */
async function addWarehouseLog(event) {
    const { userId, warehouseId, type, packCount, outboundWeight, outboundCount, remark } = event;

    if (!userId || !warehouseId) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    if (!type || !['pack', 'outbound'].includes(type)) {
        return {
            success: false,
            message: '无效的操作类型'
        };
    }

    try {
        // 获取当前用户信息
        const userRes = await db.collection('users').doc(userId).get();

        if (!userRes.data) {
            return {
                success: false,
                message: '用户不存在'
            };
        }

        const currentUser = userRes.data;

        // 权限检查：只能操作自己的仓库（管理员除外）
        if (currentUser.role !== 'admin' && currentUser.warehouseId !== warehouseId) {
            return {
                success: false,
                message: '无权限操作该仓库'
            };
        }

        // 获取仓库信息
        const warehouseRes = await db.collection('warehouses').doc(warehouseId).get();

        if (!warehouseRes.data) {
            return {
                success: false,
                message: '仓库不存在'
            };
        }

        const warehouse = warehouseRes.data;
        const today = getTodayDate();

        // 创建日志记录
        const logData = {
            warehouseId,
            warehouseName: warehouse.name,
            date: today,
            type,
            packCount: type === 'pack' ? (parseInt(packCount) || 0) : 0,
            outboundWeight: type === 'outbound' ? (parseFloat(outboundWeight) || 0) : 0,
            outboundCount: type === 'outbound' ? (parseInt(outboundCount) || 0) : 0,
            remark: remark || '',
            operatorId: userId,
            operatorName: currentUser.name,
            createTime: db.serverDate()
        };

        await db.collection('warehouse_logs').add({
            data: logData
        });

        // 更新仓库统计
        const updateData = {};

        if (type === 'pack') {
            updateData['stats.totalPackCount'] = _.inc(logData.packCount);
        } else if (type === 'outbound') {
            updateData['stats.totalOutboundWeight'] = _.inc(logData.outboundWeight);
            updateData['stats.totalOutboundCount'] = _.inc(logData.outboundCount);
        }

        updateData.updateTime = db.serverDate();

        await db.collection('warehouses').doc(warehouseId).update({
            data: updateData
        });

        return {
            success: true,
            message: type === 'pack' ? '打包记录添加成功' : '出库记录添加成功'
        };
    } catch (error) {
        console.error('添加仓库日志失败:', error);
        return {
            success: false,
            message: error.message || '添加仓库日志失败'
        };
    }
}

/**
 * 获取仓库日志列表
 */
async function getWarehouseLogs(event) {
    const { warehouseId, page = 1, pageSize = 20, startDate, endDate } = event;

    if (!warehouseId) {
        return {
            success: false,
            message: '缺少仓库ID'
        };
    }

    try {
        let whereCondition = { warehouseId };

        // 日期筛选
        if (startDate && endDate) {
            whereCondition.date = _.gte(startDate).and(_.lte(endDate));
        } else if (startDate) {
            whereCondition.date = _.gte(startDate);
        } else if (endDate) {
            whereCondition.date = _.lte(endDate);
        }

        // 查询总数
        const countResult = await db.collection('warehouse_logs')
            .where(whereCondition)
            .count();

        // 查询数据
        const result = await db.collection('warehouse_logs')
            .where(whereCondition)
            .orderBy('createTime', 'desc')
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .get();

        return {
            success: true,
            data: {
                list: result.data,
                total: countResult.total,
                page,
                pageSize,
                totalPages: Math.ceil(countResult.total / pageSize)
            }
        };
    } catch (error) {
        console.error('获取仓库日志失败:', error);
        return {
            success: false,
            message: error.message || '获取仓库日志失败'
        };
    }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
    const { action } = event;

    switch (action) {
        case 'list':
            return await listWarehouses(event);
        case 'getDetail':
            return await getWarehouseDetail(event);
        case 'addLog':
            return await addWarehouseLog(event);
        case 'getLogs':
            return await getWarehouseLogs(event);
        default:
            return {
                success: false,
                message: '无效的操作类型'
            };
    }
};
