/**
 * 业务数据重置云函数
 *
 * 目标：
 * - 清空业务数据（农户/发苗/收购/结算/日志等）
 * - 保留 users、warehouses 基础信息
 * - 重置 warehouses.stats 聚合字段
 *
 * 调用示例：
 * wx.cloud.callFunction({
 *   name: 'business-data-reset',
 *   data: {
 *     action: 'purge',
 *     password: 'puhui-reset',
 *     confirmCode: 'RESET_BUSINESS_DATA',
 *     dryRun: false
 *   }
 * })
 */

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const MAX_LIMIT = 100;
const REQUIRED_CONFIRM_CODE = 'RESET_BUSINESS_DATA';
const REQUIRED_PASSWORD = 'puhui-reset';

const BUSINESS_COLLECTIONS = [
  'farmers',
  'business_records',
  'seed_records',
  'acquisitions',
  'settlements',
  'warehouse_daily',
  'planting_guidance',
  'notifications',
  'operation_logs',
  'modification_logs'
];

async function queryAllIds(collectionName) {
  let skip = 0;
  const ids = [];

  while (true) {
    const res = await db.collection(collectionName)
      .field({ _id: true })
      .skip(skip)
      .limit(MAX_LIMIT)
      .get();

    const rows = res.data || [];
    if (rows.length === 0) break;

    ids.push(...rows.map(item => item._id));
    if (rows.length < MAX_LIMIT) break;
    skip += MAX_LIMIT;
  }

  return ids;
}

async function deleteCollectionBatch(collectionName) {
  let deleted = 0;
  while (true) {
    const res = await db.collection(collectionName).field({ _id: true }).limit(MAX_LIMIT).get();
    const list = res.data || [];
    if (list.length === 0) break;
    const ids = list.map(d => d._id);
    await db.collection(collectionName).where({ _id: _.in(ids) }).remove();
    deleted += list.length;
  }
  return deleted;
}

function buildWarehouseStatsResetData() {
  return {
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
    statsUpdateTime: db.serverDate(),
    updateTime: db.serverDate()
  };
}

async function resetWarehouseStats() {
  const warehouseIds = await queryAllIds('warehouses');
  let updated = 0;
  const resetData = buildWarehouseStatsResetData();

  for (const wid of warehouseIds) {
    await db.collection('warehouses').doc(wid).update({ data: resetData });
    updated += 1;
  }

  return updated;
}

async function purgeBusinessData(event) {
  const { confirmCode = '', password = '', dryRun = false } = event;

  if (password !== REQUIRED_PASSWORD) {
    return {
      success: false,
      message: '密码错误'
    };
  }

  if (confirmCode !== REQUIRED_CONFIRM_CODE) {
    return {
      success: false,
      message: `请传入正确确认码：${REQUIRED_CONFIRM_CODE}`
    };
  }

  const result = {
    mode: dryRun ? 'dryRun' : 'execute',
    collections: {},
    warehouseStatsReset: 0
  };

  for (const collectionName of BUSINESS_COLLECTIONS) {
    try {
      if (dryRun) {
        const countRes = await db.collection(collectionName).count();
        result.collections[collectionName] = {
          counted: countRes.total || 0,
          deleted: 0
        };
      } else {
        const deleted = await deleteCollectionBatch(collectionName);
        result.collections[collectionName] = {
          deleted
        };
      }
    } catch (error) {
      result.collections[collectionName] = {
        error: error.message || String(error)
      };
    }
  }

  if (!dryRun) {
    try {
      result.warehouseStatsReset = await resetWarehouseStats();
    } catch (error) {
      result.warehouseStatsResetError = error.message || String(error);
    }
  }

  return {
    success: true,
    data: result
  };
}

exports.main = async (event) => {
  const { action = 'purge' } = event || {};

  switch (action) {
    case 'purge':
      return purgeBusinessData(event || {});
    default:
      return {
        success: false,
        message: '无效的操作类型'
      };
  }
};
