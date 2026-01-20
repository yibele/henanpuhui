/**
 * 仓库管理云函数
 * 
 * 功能：
 * - list: 获取所有仓库列表（含库存统计）
 * - getDetail: 获取单个仓库详情
 * - getDailyList: 获取日报列表
 * - saveDaily: 保存日报数据
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
 * 获取所有仓库列表（简化版，用于出库时查看其他仓库）
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

        // 简化返回，只返回基本信息
        const result = warehouses.map(warehouse => ({
            _id: warehouse._id,
            code: warehouse.code,
            name: warehouse.name,
            isMyWarehouse: currentUser && currentUser.warehouseId === warehouse._id
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
 * 获取仓库日报列表（按日期）
 */
async function getDailyList(event) {
    const { warehouseId, page = 1, pageSize = 30 } = event;

    if (!warehouseId) {
        return {
            success: false,
            message: '缺少仓库ID'
        };
    }

    try {
        // 生成最近N天的日期列表
        const dateList = [];
        for (let i = 0; i < pageSize * page; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dateList.push(dateStr);
        }

        // 获取这些日期的收购数据
        const acquisitions = await db.collection('acquisitions')
            .where({
                warehouseId,
                acquisitionDate: _.in(dateList),
                status: _.neq('deleted')
            })
            .get();

        // 按日期汇总收购量
        const acquisitionByDate = {};
        acquisitions.data.forEach(acq => {
            const date = acq.acquisitionDate;
            if (!acquisitionByDate[date]) {
                acquisitionByDate[date] = 0;
            }
            acquisitionByDate[date] += acq.netWeight || acq.weight || 0;
        });

        // 获取日报记录
        let dailyRecords = { data: [] };
        try {
            dailyRecords = await db.collection('warehouse_daily')
                .where({
                    warehouseId,
                    date: _.in(dateList)
                })
                .get();
        } catch (e) {
            console.log('warehouse_daily集合可能不存在');
        }

        // 按日期索引日报
        const dailyByDate = {};
        dailyRecords.data.forEach(record => {
            dailyByDate[record.date] = record;
        });

        // 组装日期列表数据
        const startIdx = (page - 1) * pageSize;
        const endIdx = page * pageSize;
        const pageDates = dateList.slice(startIdx, endIdx);

        const list = pageDates.map(date => {
            const daily = dailyByDate[date] || {};
            return {
                date,
                acquisitionWeight: Number((acquisitionByDate[date] || 0).toFixed(2)),
                packCount: daily.packCount || 0,
                outboundWeight: daily.outboundWeight || 0,
                outboundCount: daily.outboundCount || 0
            };
        });

        // 计算库存汇总
        let totalAcquisition = 0;
        let totalPack = 0;
        let totalOutboundWeight = 0;
        let totalOutboundCount = 0;

        // 获取所有收购数据
        const allAcquisitions = await db.collection('acquisitions')
            .where({
                warehouseId,
                status: _.neq('deleted')
            })
            .get();

        allAcquisitions.data.forEach(acq => {
            totalAcquisition += acq.netWeight || acq.weight || 0;
        });

        // 获取所有日报数据
        let allDaily = { data: [] };
        try {
            allDaily = await db.collection('warehouse_daily')
                .where({ warehouseId })
                .get();
        } catch (e) {
            console.log('warehouse_daily集合可能不存在');
        }

        allDaily.data.forEach(d => {
            totalPack += d.packCount || 0;
            totalOutboundWeight += d.outboundWeight || 0;
            totalOutboundCount += d.outboundCount || 0;
        });

        return {
            success: true,
            data: {
                list,
                totalStats: {
                    stockWeight: Number((totalAcquisition - totalOutboundWeight).toFixed(2)),
                    stockCount: totalPack - totalOutboundCount
                }
            }
        };
    } catch (error) {
        console.error('获取日报列表失败:', error);
        return {
            success: false,
            message: error.message || '获取日报列表失败'
        };
    }
}

/**
 * 保存仓库日报
 */
async function saveDaily(event) {
    const { userId, warehouseId, date, packCount, inboundWeight, inboundCount } = event;

    if (!warehouseId || !date) {
        return {
            success: false,
            message: '缺少必要参数'
        };
    }

    try {
        // 权限检查
        if (userId) {
            const userRes = await db.collection('users').doc(userId).get();
            const currentUser = userRes.data;

            if (currentUser && currentUser.role !== 'admin' && currentUser.warehouseId !== warehouseId) {
                return {
                    success: false,
                    message: '无权限操作该仓库'
                };
            }
        }

        // 查找是否已有该日期的记录
        let existRes = { data: [] };
        try {
            existRes = await db.collection('warehouse_daily')
                .where({ warehouseId, date })
                .get();
        } catch (e) {
            console.log('warehouse_daily集合可能不存在');
        }

        // 构建更新数据（只更新传入的字段）
        const updateData = {
            updateTime: db.serverDate()
        };

        if (packCount !== undefined) {
            updateData.packCount = packCount || 0;
        }
        if (inboundWeight !== undefined) {
            updateData.inboundWeight = inboundWeight || 0;
        }
        if (inboundCount !== undefined) {
            updateData.inboundCount = inboundCount || 0;
        }

        if (existRes.data.length > 0) {
            // 更新
            await db.collection('warehouse_daily')
                .doc(existRes.data[0]._id)
                .update({ data: updateData });
        } else {
            // 新增
            await db.collection('warehouse_daily').add({
                data: {
                    warehouseId,
                    date,
                    packCount: packCount || 0,
                    inboundWeight: inboundWeight || 0,
                    inboundCount: inboundCount || 0,
                    createTime: db.serverDate(),
                    updateTime: db.serverDate()
                }
            });
        }

        return {
            success: true,
            message: '保存成功'
        };
    } catch (error) {
        console.error('保存日报失败:', error);
        return {
            success: false,
            message: error.message || '保存日报失败'
        };
    }
}

/**
 * 获取仓库看板数据
 * 返回今日数据、库存汇总、历史记录
 */
async function getDashboard(event) {
    const { warehouseId, page = 1 } = event;

    if (!warehouseId) {
        return {
            success: false,
            message: '缺少仓库ID'
        };
    }

    try {
        const today = getTodayDate();
        const pageSize = 20;

        // 1. 获取今日收购数据
        const todayAcquisitions = await db.collection('acquisitions')
            .where({
                warehouseId,
                acquisitionDate: today,
                status: _.neq('deleted')
            })
            .get();

        let todayAcquisitionWeight = 0;
        todayAcquisitions.data.forEach(acq => {
            todayAcquisitionWeight += acq.netWeight || acq.weight || 0;
        });

        // 2. 获取今日日报数据
        let todayDaily = null;
        try {
            const todayDailyRes = await db.collection('warehouse_daily')
                .where({ warehouseId, date: today })
                .get();
            if (todayDailyRes.data.length > 0) {
                todayDaily = todayDailyRes.data[0];
            }
        } catch (e) {
            console.log('warehouse_daily集合可能不存在');
        }

        // 3. 获取所有收购数据计算累计
        const allAcquisitions = await db.collection('acquisitions')
            .where({
                warehouseId,
                status: _.neq('deleted')
            })
            .get();

        let totalAcquisition = 0;
        const acquisitionByDate = {}; // 按日期汇总
        allAcquisitions.data.forEach(acq => {
            const weight = acq.netWeight || acq.weight || 0;
            totalAcquisition += weight;
            const date = acq.acquisitionDate;
            if (date) {
                if (!acquisitionByDate[date]) {
                    acquisitionByDate[date] = 0;
                }
                acquisitionByDate[date] += weight;
            }
        });

        // 4. 获取所有日报数据计算累计
        let allDaily = { data: [] };
        try {
            allDaily = await db.collection('warehouse_daily')
                .where({ warehouseId })
                .orderBy('date', 'desc')
                .get();
        } catch (e) {
            console.log('warehouse_daily集合可能不存在');
        }

        let totalPack = 0;
        let totalInboundWeight = 0;
        let totalInboundCount = 0;
        const dailyByDate = {};

        allDaily.data.forEach(d => {
            totalPack += d.packCount || 0;
            totalInboundWeight += d.inboundWeight || 0;
            totalInboundCount += d.inboundCount || 0;
            dailyByDate[d.date] = d;
        });

        // 5. 组装历史记录（只显示有数据的日期）
        const allDates = new Set([
            ...Object.keys(acquisitionByDate),
            ...Object.keys(dailyByDate)
        ]);

        // 排序日期（倒序）
        const sortedDates = Array.from(allDates)
            .filter(d => d !== today) // 排除今日
            .sort((a, b) => b.localeCompare(a));

        // 分页
        const startIdx = (page - 1) * pageSize;
        const pageDates = sortedDates.slice(startIdx, startIdx + pageSize);

        const historyList = pageDates.map(date => {
            const daily = dailyByDate[date] || {};
            return {
                date,
                acquisitionWeight: Number((acquisitionByDate[date] || 0).toFixed(2)),
                packCount: daily.packCount || 0,
                inboundWeight: daily.inboundWeight || 0,
                inboundCount: daily.inboundCount || 0
            };
        });

        return {
            success: true,
            data: {
                todayData: {
                    acquisitionWeight: Number(todayAcquisitionWeight.toFixed(2)),
                    packCount: todayDaily?.packCount || 0,
                    inboundWeight: todayDaily?.inboundWeight || 0,
                    inboundCount: todayDaily?.inboundCount || 0
                },
                totalStats: {
                    stockWeight: Number((totalAcquisition - totalInboundWeight).toFixed(2)),
                    stockCount: totalPack - totalInboundCount,
                    totalAcquisition: Number(totalAcquisition.toFixed(2)),
                    totalPack,
                    totalOutWeight: Math.abs(Math.min(totalInboundWeight, 0)),
                    totalOutCount: Math.abs(Math.min(totalInboundCount, 0))
                },
                historyList
            }
        };
    } catch (error) {
        console.error('获取看板数据失败:', error);
        return {
            success: false,
            message: error.message || '获取看板数据失败'
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
        case 'getDailyList':
            return await getDailyList(event);
        case 'getDashboard':
            return await getDashboard(event);
        case 'saveDaily':
            return await saveDaily(event);
        default:
            return {
                success: false,
                message: '无效的操作类型'
            };
    }
};
