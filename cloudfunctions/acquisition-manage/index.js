/**
 * 收购管理云函数
 * 
 * 功能：
 * - createAcquisition: 创建收购记录（并自动生成结算单）
 * - getAcquisition: 获取收购详情
 * - listAcquisitions: 获取收购列表
 * - updateAcquisition: 更新收购记录（仅限审核驳回后）
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 生成收购单号
 * 格式：ACQ_YYYYMMDD_XXXX
 */
function generateAcquisitionId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ACQ_${year}${month}${day}_${random}`;
}

/**
 * 生成结算单号
 * 格式：STL_YYYYMMDD_XXXX
 */
function generateSettlementId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() + 10000)).padStart(4, '0');
  return `STL_${year}${month}${day}_${random}`;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 创建收购记录
 * 核心业务流程：
 * 1. 创建收购记录
 * 2. 自动生成结算单
 * 3. 更新农户统计数据
 * 4. 更新仓库统计数据
 * 5. 发送通知给财务
 */
async function createAcquisition(event, context) {
  const { userId, data } = event;

  // 验证用户ID
  if (!userId) {
    return {
      success: false,
      message: '缺少用户ID'
    };
  }

  const {
    farmerId,
    warehouseId,
    farmerAcreage,
    estimatedWeight,
    grossWeight,
    tareWeight,
    moistureRate,
    moistureWeight,
    weight,
    unitPrice,
    totalAmount,
    productType,
    remark
  } = data;

  // 数据验证
  if (!farmerId || !warehouseId || !grossWeight || !tareWeight || moistureRate === undefined || !unitPrice) {
    return {
      success: false,
      message: '缺少必填字段'
    };
  }

  try {
    // 获取当前用户信息（仓库管理员）
    const userRes = await db.collection('users').doc(userId).get();

    if (!userRes.data) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = userRes.data;

    // 权限检查：必须是仓库管理员
    if (currentUser.role !== 'warehouse_manager') {
      return {
        success: false,
        errMsg: '只有仓库管理员可以创建收购记录'
      };
    }

    if (!currentUser.warehouseId) {
      return {
        success: false,
        errMsg: '仓库管理员未绑定仓库'
      };
    }

    // 获取农户信息
    const farmerRes = await db.collection('farmers')
      .where({ farmerId, status: 'active' })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        errMsg: '农户不存在或已停用'
      };
    }

    const farmer = farmerRes.data[0];

    // 获取仓库信息
    const warehouseRes = await db.collection('warehouses')
      .where({ _id: currentUser.warehouseId })
      .get();

    if (warehouseRes.data.length === 0) {
      return {
        success: false,
        errMsg: '仓库不存在'
      };
    }

    const warehouse = warehouseRes.data[0];

    // 计算重量和金额
    const grossWeightNum = Number(grossWeight);
    const tareWeightNum = Number(tareWeight);
    const moistureRateNum = Number(moistureRate);
    const unitPriceNum = Number(unitPrice);

    const moistureWeight = (grossWeightNum - tareWeightNum) * (moistureRateNum / 100);
    const netWeight = grossWeightNum - tareWeightNum - moistureWeight;
    const totalAmount = netWeight * unitPriceNum;

    // 计算预估重量和差异
    const estimatedWeight = farmer.acreage * 300; // 每亩 300kg
    const weightDifference = netWeight - estimatedWeight;
    const weightDifferenceRate = (weightDifference / estimatedWeight) * 100;
    const isAbnormal = Math.abs(weightDifferenceRate) > 50; // 差异率超过50%为异常

    // 生成收购单号
    const acquisitionId = generateAcquisitionId();
    const acquisitionDate = formatDate(new Date());

    // 构造收购记录数据
    const acquisitionData = {
      acquisitionId,
      farmerId: farmer.farmerId,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      farmerAcreage: farmer.acreage,
      warehouseId: currentUser.warehouseId,
      warehouseName: warehouse.name,
      estimatedWeight,
      grossWeight: grossWeightNum,
      tareWeight: tareWeightNum,
      moistureRate: moistureRateNum,
      moistureWeight: Number(moistureWeight.toFixed(2)),
      netWeight: Number(netWeight.toFixed(2)),
      unitPrice: unitPriceNum,
      totalAmount: Number(totalAmount.toFixed(2)),
      weightDifference: Number(weightDifference.toFixed(2)),
      weightDifferenceRate: Number(weightDifferenceRate.toFixed(2)),
      isAbnormal,
      remark: remark || '',
      photos: [],
      status: 'confirmed',
      auditRemark: '',
      correctionRemark: '',
      acquisitionDate,
      createTime: db.serverDate(),
      createBy: currentUser.name,
      createById: currentUser._id,
      confirmTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    // 1. 插入收购记录
    const acquisitionResult = await db.collection('acquisitions').add({
      data: acquisitionData
    });

    // 2. 生成结算单
    const settlementId = generateSettlementId();
    const settlementData = {
      settlementId,
      acquisitionId,
      farmerId: farmer.farmerId,
      farmerName: farmer.name,
      farmerPhone: farmer.phone,
      farmerBankAccount: farmer.bankAccount || '',
      farmerBankName: farmer.bankName || '',
      accountHolder: farmer.accountHolder || farmer.name,
      warehouseId: currentUser.warehouseId,
      warehouseName: warehouse.name,
      acquisitionDate,
      netWeight: Number(netWeight.toFixed(2)),
      unitPrice: unitPriceNum,
      grossAmount: Number(totalAmount.toFixed(2)),
      seedDebt: farmer.stats.currentDebt || 0,
      otherDeductions: 0,
      actualPayment: Number((totalAmount - (farmer.stats.currentDebt || 0)).toFixed(2)),
      auditStatus: 'pending',
      auditBy: '',
      auditById: '',
      auditTime: null,
      auditRemark: '',
      paymentStatus: 'unpaid',
      paymentMethod: '',
      paymentBy: '',
      paymentById: '',
      paymentTime: null,
      paymentVoucher: '',
      paymentRemark: '',
      status: 'pending_audit',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      completeTime: null
    };

    await db.collection('settlements').add({
      data: settlementData
    });

    // 3. 更新农户统计数据
    const isFirstAcquisition = farmer.stats.totalAcquisitionCount === 0;

    await db.collection('farmers')
      .where({ farmerId: farmer.farmerId })
      .update({
        data: {
          'stats.totalAcquisitionCount': _.inc(1),
          'stats.totalAcquisitionWeight': _.inc(Number(netWeight.toFixed(2))),
          'stats.totalAcquisitionAmount': _.inc(Number(totalAmount.toFixed(2))),
          lastAcquisitionTime: db.serverDate(),
          firstAcquisitionTime: isFirstAcquisition ? db.serverDate() : farmer.firstAcquisitionTime,
          updateTime: db.serverDate()
        }
      });

    // 4. 更新仓库统计数据
    await db.collection('warehouses')
      .where({ _id: currentUser.warehouseId })
      .update({
        data: {
          'stats.todayAcquisitionCount': _.inc(1),
          'stats.todayAcquisitionWeight': _.inc(Number(netWeight.toFixed(2))),
          'stats.todayAcquisitionAmount': _.inc(Number(totalAmount.toFixed(2))),
          'stats.totalAcquisitionCount': _.inc(1),
          'stats.totalAcquisitionWeight': _.inc(Number(netWeight.toFixed(2))),
          'stats.totalAcquisitionAmount': _.inc(Number(totalAmount.toFixed(2))),
          'stats.currentStock': _.inc(Number(netWeight.toFixed(2))),
          statsUpdateTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    // 5. 发送通知给财务（查询所有财务角色用户）
    const financeUsers = await db.collection('users')
      .where({ role: 'finance_admin', status: 'active' })
      .get();

    for (const financeUser of financeUsers.data) {
      await db.collection('notifications').add({
        data: {
          userId: financeUser._id,
          userRole: 'finance',
          type: 'settlement_created',
          title: '新收购待结算',
          content: `${warehouse.name}仓库收购农户${farmer.name}的甜叶菊，净重${netWeight.toFixed(2)}kg，应付金额${(totalAmount / 10000).toFixed(4)}万元，请审核。`,
          data: {
            settlementId,
            acquisitionId,
            farmerName: farmer.name,
            warehouseName: warehouse.name,
            netWeight: Number(netWeight.toFixed(2)),
            totalAmount: Number(totalAmount.toFixed(2)),
            actualPayment: settlementData.actualPayment
          },
          page: '/pages/finance/settlement-detail/index',
          params: {
            id: settlementId
          },
          isRead: false,
          readTime: null,
          priority: isAbnormal ? 'high' : 'normal',
          createTime: db.serverDate()
        }
      });
    }

    // 6. 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: currentUser._id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create_acquisition',
        module: 'acquisition',
        targetId: acquisitionId,
        targetName: `${farmer.name} - ${netWeight.toFixed(2)}kg`,
        description: `创建收购记录：${farmer.name}，净重${netWeight.toFixed(2)}kg`,
        before: {},
        after: acquisitionData,
        changes: [],
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      data: {
        acquisitionId,
        settlementId,
        _id: acquisitionResult._id
      },
      message: '收购记录创建成功'
    };
  } catch (error) {
    console.error('创建收购记录失败:', error);
    return {
      success: false,
      errMsg: error.message || '创建收购记录失败'
    };
  }
}

/**
 * 获取收购详情
 */
async function getAcquisition(event) {
  const { acquisitionId } = event;

  if (!acquisitionId) {
    return {
      success: false,
      errMsg: '缺少收购ID'
    };
  }

  try {
    const result = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        errMsg: '收购记录不存在'
      };
    }

    return {
      success: true,
      data: result.data[0]
    };
  } catch (error) {
    console.error('获取收购详情失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取收购详情失败'
    };
  }
}

/**
 * 获取收购列表
 */
async function listAcquisitions(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    userId,
    page = 1,
    pageSize = 20,
    warehouseId = '',
    farmerId = '',
    startDate = '',
    endDate = '',
    status = ''
  } = event;

  try {
    // 获取当前用户信息（优先使用userId，否则用_openid）
    let userRes;
    if (userId) {
      userRes = await db.collection('users').doc(userId).get();
      if (!userRes.data) {
        userRes = { data: [] };
      } else {
        userRes = { data: [userRes.data] };
      }
    } else {
      userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
    }

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 构建查询条件
    let whereCondition = {};

    // 如果是仓库管理员，只能查看自己仓库的收购记录
    if (currentUser.role === 'warehouse_manager') {
      whereCondition.warehouseId = currentUser.warehouseId;
    }

    // 如果指定了仓库ID
    if (warehouseId && currentUser.role !== 'warehouse_manager') {
      whereCondition.warehouseId = warehouseId;
    }

    // 如果指定了农户ID
    if (farmerId) {
      whereCondition.farmerId = farmerId;
    }

    // 如果指定了日期范围
    if (startDate && endDate) {
      whereCondition.acquisitionDate = _.gte(startDate).and(_.lte(endDate));
    } else if (startDate) {
      whereCondition.acquisitionDate = _.gte(startDate);
    } else if (endDate) {
      whereCondition.acquisitionDate = _.lte(endDate);
    }

    // 如果指定了状态
    if (status) {
      whereCondition.status = status;
    }

    // 查询总数
    const countResult = await db.collection('acquisitions')
      .where(whereCondition)
      .count();

    // 查询数据
    const result = await db.collection('acquisitions')
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
    console.error('获取收购列表失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取收购列表失败'
    };
  }
}

/**
 * 更新收购记录（仅限审核驳回后）
 */
async function updateAcquisition(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    acquisitionId,
    correctionRemark,
    updateData
  } = event;

  if (!acquisitionId) {
    return {
      success: false,
      errMsg: '缺少收购ID'
    };
  }

  try {
    // 获取当前用户信息
    const userRes = await db.collection('users')
      .where({ _openid: OPENID })
      .get();

    if (userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 获取收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (acquisitionRes.data.length === 0) {
      return {
        success: false,
        errMsg: '收购记录不存在'
      };
    }

    const acquisition = acquisitionRes.data[0];

    // 权限检查：只有创建人或管理员可以修改
    if (acquisition.createById !== currentUser._id && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限修改该收购记录'
      };
    }

    // 状态检查：只有审核驳回的记录可以修改
    if (acquisition.status !== 'audit_rejected') {
      return {
        success: false,
        errMsg: '只有审核驳回的记录可以修改'
      };
    }

    // 更新收购记录
    const updates = {
      ...updateData,
      correctionRemark: correctionRemark || '',
      status: 'confirmed', // 修改后重新提交审核
      updateTime: db.serverDate()
    };

    await db.collection('acquisitions')
      .where({ acquisitionId })
      .update({
        data: updates
      });

    // ==========================================
    // 修复逻辑：同步更新结算单和统计数据
    // ==========================================

    // 1. 计算差额
    const oldNetWeight = acquisition.netWeight || 0;
    const oldTotalAmount = acquisition.totalAmount || 0;
    const newNetWeight = updateData.netWeight !== undefined ? updateData.netWeight : oldNetWeight;
    const newTotalAmount = updateData.totalAmount !== undefined ? updateData.totalAmount : oldTotalAmount;

    const diffWeight = Number((newNetWeight - oldNetWeight).toFixed(2));
    const diffAmount = Number((newTotalAmount - oldTotalAmount).toFixed(2));

    if (diffWeight !== 0 || diffAmount !== 0) {
      // 2. 同步更新结算单
      const settlementRes = await db.collection('settlements')
        .where({ acquisitionId })
        .get();

      if (settlementRes.data.length > 0) {
        const settlement = settlementRes.data[0];
        // 重新计算应付金额（保持原有的扣款项）
        const newActualPayment = Number((newTotalAmount - (settlement.seedDebt || 0) - (settlement.otherDeductions || 0)).toFixed(2));

        const settlementUpdates = {
          netWeight: newNetWeight,
          grossAmount: newTotalAmount,
          unitPrice: updateData.unitPrice !== undefined ? updateData.unitPrice : settlement.unitPrice,
          actualPayment: newActualPayment,
          status: 'pending_audit',
          auditStatus: 'pending',
          updateTime: db.serverDate()
        };

        await db.collection('settlements')
          .doc(settlement._id)
          .update({
            data: settlementUpdates
          });
      }

      // 3. 更新农户统计
      if (acquisition.farmerId) {
        await db.collection('farmers')
          .where({ farmerId: acquisition.farmerId })
          .update({
            data: {
              'stats.totalAcquisitionWeight': _.inc(diffWeight),
              'stats.totalAcquisitionAmount': _.inc(diffAmount),
              updateTime: db.serverDate()
            }
          });
      }

      // 4. 更新仓库统计
      if (acquisition.warehouseId) {
        const warehouseUpdates = {
          'stats.totalAcquisitionWeight': _.inc(diffWeight),
          'stats.totalAcquisitionAmount': _.inc(diffAmount),
          'stats.currentStock': _.inc(diffWeight),
          updateTime: db.serverDate()
        };

        // 如果是今天的记录，同时更新今日统计
        const todayStr = formatDate(new Date());
        if (acquisition.acquisitionDate === todayStr) {
          warehouseUpdates['stats.todayAcquisitionWeight'] = _.inc(diffWeight);
          warehouseUpdates['stats.todayAcquisitionAmount'] = _.inc(diffAmount);
        }

        await db.collection('warehouses')
          .where({ _id: acquisition.warehouseId })
          .update({
            data: warehouseUpdates
          });
      }
    } else {
      // 如果金额没变，只更新结算单状态
      await db.collection('settlements')
        .where({ acquisitionId })
        .update({
          data: {
            status: 'pending_audit',
            auditStatus: 'pending',
            updateTime: db.serverDate()
          }
        });
    }

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: currentUser._id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update_acquisition',
        module: 'acquisition',
        targetId: acquisitionId,
        targetName: acquisition.farmerName,
        description: `修正收购记录：${acquisition.farmerName}`,
        before: acquisition,
        after: { ...acquisition, ...updates },
        changes: Object.keys(updates).map(key => ({
          field: key,
          oldValue: acquisition[key],
          newValue: updates[key]
        })),
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '收购记录更新成功'
    };
  } catch (error) {
    console.error('更新收购记录失败:', error);
    return {
      success: false,
      errMsg: error.message || '更新收购记录失败'
    };
  }
}

/**
 * 获取农户收购汇总（分仓库统计）
 */
async function getFarmerAcquisitionSummary(event) {
  const { farmerId } = event;

  if (!farmerId) {
    return {
      success: false,
      message: '缺少农户ID'
    };
  }

  try {
    // 获取该农户的所有收购记录
    const acquisitionsRes = await db.collection('acquisitions')
      .where({
        farmerId: farmerId,
        status: _.neq('deleted')
      })
      .orderBy('createTime', 'desc')
      .get();

    const acquisitions = acquisitionsRes.data;

    if (acquisitions.length === 0) {
      return {
        success: true,
        data: {
          totalCount: 0,
          totalWeight: 0,
          totalAmount: 0,
          warehouseStats: [],
          recentRecords: []
        }
      };
    }

    // 按仓库分组统计
    const warehouseMap = {};
    let totalWeight = 0;
    let totalAmount = 0;

    acquisitions.forEach(acq => {
      const wId = acq.warehouseId;
      const wName = acq.warehouseName || '未知仓库';

      if (!warehouseMap[wId]) {
        warehouseMap[wId] = {
          warehouseId: wId,
          warehouseName: wName,
          count: 0,
          weight: 0,
          amount: 0
        };
      }

      warehouseMap[wId].count += 1;
      warehouseMap[wId].weight += acq.netWeight || acq.weight || 0;
      warehouseMap[wId].amount += acq.totalAmount || 0;

      totalWeight += acq.netWeight || acq.weight || 0;
      totalAmount += acq.totalAmount || 0;
    });

    const warehouseStats = Object.values(warehouseMap).map(w => ({
      ...w,
      weight: Number(w.weight.toFixed(2)),
      amount: Number(w.amount.toFixed(2)),
      amountWan: Number((w.amount / 10000).toFixed(4))
    }));

    // 获取最近5条记录
    const recentRecords = acquisitions.slice(0, 5).map(acq => ({
      acquisitionId: acq.acquisitionId,
      warehouseName: acq.warehouseName,
      netWeight: acq.netWeight || acq.weight || 0,
      unitPrice: acq.unitPrice,
      totalAmount: acq.totalAmount,
      acquisitionDate: acq.acquisitionDate,
      createTime: acq.createTime
    }));

    return {
      success: true,
      data: {
        totalCount: acquisitions.length,
        totalWeight: Number(totalWeight.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        totalAmountWan: Number((totalAmount / 10000).toFixed(4)),
        warehouseStats,
        recentRecords
      }
    };
  } catch (error) {
    console.error('获取农户收购汇总失败:', error);
    return {
      success: false,
      message: error.message || '获取农户收购汇总失败'
    };
  }
}

/**
 * 删除收购记录（软删除，仅财务/管理员可操作）
 */
async function deleteAcquisition(event) {
  const { userId, acquisitionId, reason } = event;

  if (!userId || !acquisitionId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      message: '请填写删除原因（至少5个字）'
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

    // 权限检查：只有财务和管理员可以删除
    if (!['finance_admin', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        message: '无权限删除收购记录'
      };
    }

    // 获取收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (acquisitionRes.data.length === 0) {
      return {
        success: false,
        message: '收购记录不存在'
      };
    }

    const acquisition = acquisitionRes.data[0];

    // 记录修改日志
    await db.collection('modification_logs').add({
      data: {
        targetType: 'acquisition',
        targetId: acquisitionId,
        action: 'delete',
        beforeData: acquisition,
        afterData: null,
        reason: reason.trim(),
        operatorId: userId,
        operatorName: currentUser.name,
        createTime: db.serverDate()
      }
    });

    // 软删除：更新状态为 deleted
    await db.collection('acquisitions')
      .where({ acquisitionId })
      .update({
        data: {
          status: 'deleted',
          deleteReason: reason.trim(),
          deleteBy: currentUser.name,
          deleteById: userId,
          deleteTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    // 同时删除对应的结算单
    await db.collection('settlements')
      .where({ acquisitionId })
      .update({
        data: {
          status: 'deleted',
          deleteReason: reason.trim(),
          deleteBy: currentUser.name,
          deleteById: userId,
          deleteTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    // ==========================================
    // 修复逻辑：回滚农户和仓库的统计数据
    // ==========================================
    const netWeight = acquisition.netWeight || 0;
    const totalAmount = acquisition.totalAmount || 0;

    // 1. 回滚农户统计
    if (acquisition.farmerId && netWeight > 0) {
      await db.collection('farmers')
        .where({ farmerId: acquisition.farmerId })
        .update({
          data: {
            'stats.totalAcquisitionCount': _.inc(-1),
            'stats.totalAcquisitionWeight': _.inc(-netWeight),
            'stats.totalAcquisitionAmount': _.inc(-totalAmount),
            updateTime: db.serverDate()
          }
        });
    }

    // 2. 回滚仓库统计
    if (acquisition.warehouseId && netWeight > 0) {
      const warehouseUpdates = {
        'stats.totalAcquisitionCount': _.inc(-1),
        'stats.totalAcquisitionWeight': _.inc(-netWeight),
        'stats.totalAcquisitionAmount': _.inc(-totalAmount),
        'stats.currentStock': _.inc(-netWeight),
        updateTime: db.serverDate()
      };

      // 如果是今天的记录，同时回滚今日统计
      const todayStr = formatDate(new Date());
      if (acquisition.acquisitionDate === todayStr) {
        warehouseUpdates['stats.todayAcquisitionCount'] = _.inc(-1);
        warehouseUpdates['stats.todayAcquisitionWeight'] = _.inc(-netWeight);
        warehouseUpdates['stats.todayAcquisitionAmount'] = _.inc(-totalAmount);
      }

      await db.collection('warehouses')
        .where({ _id: acquisition.warehouseId })
        .update({
          data: warehouseUpdates
        });
    }

    return {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    console.error('删除收购记录失败:', error);
    return {
      success: false,
      message: error.message || '删除收购记录失败'
    };
  }
}

/**
 * 财务修改收购记录
 */
async function financeUpdateAcquisition(event) {
  const { userId, acquisitionId, updateData, reason } = event;

  if (!userId || !acquisitionId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      message: '请填写修改原因（至少5个字）'
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

    // 权限检查：只有财务和管理员可以修改
    if (!['finance_admin', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        message: '无权限修改收购记录'
      };
    }

    // 获取收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId })
      .get();

    if (acquisitionRes.data.length === 0) {
      return {
        success: false,
        message: '收购记录不存在'
      };
    }

    const acquisition = acquisitionRes.data[0];

    // 记录修改日志
    await db.collection('modification_logs').add({
      data: {
        targetType: 'acquisition',
        targetId: acquisitionId,
        action: 'update',
        beforeData: acquisition,
        afterData: { ...acquisition, ...updateData },
        reason: reason.trim(),
        operatorId: userId,
        operatorName: currentUser.name,
        createTime: db.serverDate()
      }
    });

    // 更新收购记录
    await db.collection('acquisitions')
      .where({ acquisitionId })
      .update({
        data: {
          ...updateData,
          lastModifyReason: reason.trim(),
          lastModifyBy: currentUser.name,
          lastModifyById: userId,
          lastModifyTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });

    return {
      success: true,
      message: '修改成功'
    };
  } catch (error) {
    console.error('修改收购记录失败:', error);
    return {
      success: false,
      message: error.message || '修改收购记录失败'
    };
  }
}

// 主函数
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'create':
      return await createAcquisition(event, context);
    case 'get':
      return await getAcquisition(event);
    case 'list':
      return await listAcquisitions(event, context);
    case 'update':
      return await updateAcquisition(event, context);
    case 'getFarmerSummary':
      return await getFarmerAcquisitionSummary(event);
    case 'delete':
      return await deleteAcquisition(event);
    case 'financeUpdate':
      return await financeUpdateAcquisition(event);
    default:
      return {
        success: false,
        errMsg: '无效的操作类型'
      };
  }
};
