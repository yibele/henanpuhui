/**
 * 结算管理云函数
 * 
 * 功能：
 * - getSettlement: 获取结算单详情
 * - listSettlements: 获取结算单列表
 * - auditSettlement: 审核结算单（通过/驳回）
 * - markPayment: 标记支付中
 * - completePayment: 完成支付
 */

const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;
const MAX_BACKFILL_BATCH = 100;

// 引入精确计算工具
const { multiply, subtract, add, roundToFen } = require('./calc');

function isFiniteNumber(val) {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * 种苗欠款计算（甲方口径）
 * 规则：种苗欠款 = max(0, 累计发苗金额 - 定金)
 * 说明：定金仅在种苗欠款中抵扣一次，不单独参与结算扣款
 */
function resolveSeedDebt(farmer) {
  if (isFiniteNumber(farmer?.seedDebt)) {
    return Math.max(0, roundToFen(farmer.seedDebt));
  }
  const totalSeedAmount = isFiniteNumber(farmer?.stats?.totalSeedAmount)
    ? farmer.stats.totalSeedAmount
    : (isFiniteNumber(farmer?.receivableAmount) ? farmer.receivableAmount : 0);
  const deposit = isFiniteNumber(farmer?.deposit) ? farmer.deposit : 0;
  return Math.max(0, roundToFen(subtract(totalSeedAmount, deposit)));
}

async function deleteCollectionBatch(collectionName) {
  let deleted = 0;
  while (true) {
    const res = await db.collection(collectionName).limit(100).get();
    const list = res.data || [];
    if (list.length === 0) break;
    const ids = list.map(d => d._id);
    await db.collection(collectionName).where({ _id: _.in(ids) }).remove();
    deleted += list.length;
  }
  return deleted;
}

/**
 * 获取结算单详情
 */
async function getSettlement(event) {
  const { OPENID } = cloud.getWXContext();
  const { settlementId, userId = '' } = event;

  if (!settlementId) {
    return {
      success: false,
      errMsg: '缺少结算单ID'
    };
  }

  try {
    // 获取当前用户信息（优先 userId，其次 OPENID）
    let userRes;
    if (userId) {
      userRes = await db.collection('users')
        .where({ _id: userId })
        .get();
    } else if (OPENID) {
      userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
    } else {
      userRes = { data: [] };
    }

    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在或未登录'
      };
    }

    const currentUser = userRes.data[0];
    if (!['warehouse_manager', 'finance_admin', 'cashier', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        errMsg: '无权限查看结算详情'
      };
    }

    const result = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (result.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = result.data[0];

    // 仓库管理员仅可查看本仓库结算单
    if (currentUser.role === 'warehouse_manager' && settlement.warehouseId !== currentUser.warehouseId) {
      return {
        success: false,
        errMsg: '无权限查看该结算单'
      };
    }

    // 同时获取关联的收购记录
    const acquisitionRes = await db.collection('acquisitions')
      .where({ acquisitionId: settlement.acquisitionId })
      .get();
    const acquisition = acquisitionRes.data[0] || null;

    // 获取农户完整信息（签约、欠款汇总）
    let farmer = null;
    if (settlement.farmerId) {
      const farmerRes = await db.collection('farmers')
        .where({ farmerId: settlement.farmerId })
        .get();
      if (farmerRes.data.length > 0) {
        farmer = farmerRes.data[0];
      }
    }

    return {
      success: true,
      data: {
        settlement,
        acquisition,
        farmer  // 包含签约信息、欠款汇总
      }
    };
  } catch (error) {
    console.error('获取结算单详情失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取结算单详情失败'
    };
  }
}


/**
 * 获取结算单列表
 */
async function listSettlements(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    userId = '',              // 前端传入的用户ID
    page = 1,
    pageSize = 20,
    status = '',              // 前端传入的状态参数
    auditStatus = '',
    paymentStatus = '',
    warehouseId = '',
    keyword = '',             // 搜索关键词
    startDate = '',
    endDate = ''
  } = event;

  try {
    // 获取当前用户信息（优先使用 userId，其次使用 OPENID）
    let userRes;
    if (userId) {
      userRes = await db.collection('users')
        .where({ _id: userId })
        .get();
    } else if (OPENID) {
      userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
    }

    const currentUser = userRes && userRes.data.length > 0 ? userRes.data[0] : null;
    if (!currentUser) {
      return {
        success: false,
        errMsg: '用户不存在或未登录'
      };
    }

    // 仅仓管/会计/出纳/管理员可查看结算列表
    if (!['warehouse_manager', 'finance_admin', 'cashier', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        errMsg: '无权限查看结算单列表'
      };
    }

    // 构建查询条件
    let whereCondition = {};

    // 如果是仓库管理员，只能查看自己仓库的结算单
    if (currentUser && currentUser.role === 'warehouse_manager') {
      whereCondition.warehouseId = currentUser.warehouseId;
    }

    // 如果指定了仓库ID
    if (warehouseId && (!currentUser || currentUser.role !== 'warehouse_manager')) {
      whereCondition.warehouseId = warehouseId;
    }

    // 处理状态筛选（status / auditStatus / paymentStatus 分开）
    if (status) {
      whereCondition.status = status;
    }
    if (auditStatus) {
      whereCondition.auditStatus = auditStatus;
    }
    if (paymentStatus) {
      whereCondition.paymentStatus = paymentStatus;
    }

    // 如果指定了日期范围
    if (startDate && endDate) {
      whereCondition.acquisitionDate = _.gte(startDate).and(_.lte(endDate));
    } else if (startDate) {
      whereCondition.acquisitionDate = _.gte(startDate);
    } else if (endDate) {
      whereCondition.acquisitionDate = _.lte(endDate);
    }

    // 关键词搜索（农户姓名或电话）
    let finalWhere = whereCondition;
    const trimmedKeyword = String(keyword || '').trim();
    if (trimmedKeyword) {
      const searchRegex = db.RegExp({
        regexp: trimmedKeyword,
        options: 'i'
      });
      finalWhere = _.and([
        whereCondition,
        _.or([
          { farmerName: searchRegex },
          { farmerPhone: searchRegex }
        ])
      ]);
    }

    // 查询总数
    const countResult = await db.collection('settlements')
      .where(finalWhere)
      .count();

    // 查询数据
    const result = await db.collection('settlements')
      .where(finalWhere)
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
    console.error('获取结算单列表失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取结算单列表失败'
    };
  }
}

/**
 * 审核结算单（会计操作）
 * 审核时实时计算扣款，确保数据准确
 */
async function auditSettlement(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    userId,
    settlementId,
    approved, // true: 通过, false: 驳回
    auditRemark
  } = event;

  if (!settlementId || approved === undefined) {
    return {
      success: false,
      errMsg: '缺少必填字段'
    };
  }

  try {
    // 获取当前用户信息（优先使用 userId，其次使用 OPENID）
    let userRes;
    if (userId) {
      userRes = await db.collection('users').doc(userId).get();
      if (userRes.data) {
        userRes = { data: [userRes.data] };
      } else {
        userRes = { data: [] };
      }
    } else if (OPENID) {
      userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
    } else {
      userRes = { data: [] };
    }

    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 权限检查：必须是会计或管理员
    if (currentUser.role !== 'finance_admin' && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限审核结算单'
      };
    }

    // 获取结算单信息
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 状态检查：只有待审核的结算单可以审核
    const auditState = settlement.auditStatus || settlement.status;
    if (auditState !== 'pending') {
      return {
        success: false,
        errMsg: '该结算单已审核，无法重复审核'
      };
    }

    if (approved) {
      // ============ 审核通过：实时计算扣款 ============

      const acquisitionAmount = settlement.acquisitionAmount || settlement.grossAmount || 0; // 收购货款

      // 事务内读取农户数据并计算扣款（防止并发重复扣除）
      let deductAdvance = 0;
      let deductSeed = 0;
      let deductAgri = 0;
      let totalDeduction = 0;
      let actualPayment = 0;

      await db.runTransaction(async (t) => {
        // 1. 事务内获取农户最新的欠款数据
        const farmerRes = await t.collection('farmers')
          .where({ farmerId: settlement.farmerId })
          .get();

        if (farmerRes.data.length === 0) {
          throw new Error('关联农户不存在');
        }

        const farmer = farmerRes.data[0];

        // 2. 读取当前欠款余额
        // 种苗欠款按甲方口径：累计发苗金额 - 定金（定金仅抵扣一次）
        const currentSeedDebt = resolveSeedDebt(farmer);
        const currentAgriDebt = farmer.agriculturalDebt || farmer.stats?.agriculturalDebt || 0;  // 农资欠款
        const currentAdvance = farmer.advancePayment || farmer.stats?.advancePayment || 0;  // 预付款

        // 3. 计算本次可扣除金额（按优先级：预付款 > 种苗 > 农资）- 使用精确计算
        let remaining = acquisitionAmount;  // 剩余可用于扣款的金额

        // 优先扣预付款（现金债权优先回收）
        if (remaining > 0 && currentAdvance > 0) {
          deductAdvance = Math.min(remaining, currentAdvance);
          remaining = subtract(remaining, deductAdvance);
        }

        // 其次扣种苗欠款
        if (remaining > 0 && currentSeedDebt > 0) {
          deductSeed = Math.min(remaining, currentSeedDebt);
          remaining = subtract(remaining, deductSeed);
        }

        // 最后扣农资欠款
        if (remaining > 0 && currentAgriDebt > 0) {
          deductAgri = Math.min(remaining, currentAgriDebt);
          remaining = subtract(remaining, deductAgri);
        }

        totalDeduction = add(deductAdvance, deductSeed, deductAgri);
        actualPayment = roundToFen(remaining); // 剩余的就是实际应付给农户的

        // 4. 更新结算单
        await t.collection('settlements')
          .doc(settlement._id)
          .update({
            data: {
              // 扣款明细
              advanceDeduction: deductAdvance,
              seedDeduction: deductSeed,
              agriculturalDeduction: deductAgri,
              totalDeduction: totalDeduction,
              totalDeductions: totalDeduction,
              actualPayment: actualPayment,

              // 状态更新
              status: 'approved',  // 待付款
              auditStatus: 'approved',
              paymentStatus: 'unpaid',

              // 审核信息
              auditorId: currentUser._id,
              auditorName: currentUser.name,
              auditTime: db.serverDate(),
              auditRemark: auditRemark || '审核通过',

              updateTime: db.serverDate()
            }
          });

        // 5. 使用原子操作更新农户欠款（防止并发冲突）
        const farmerUpdateData = {
          updateTime: db.serverDate()
        };

        if (deductAdvance > 0) {
          farmerUpdateData.advancePayment = _.inc(-deductAdvance);
          farmerUpdateData['stats.advancePayment'] = _.inc(-deductAdvance);
        }
        if (deductSeed > 0) {
          farmerUpdateData.seedDebt = _.inc(-deductSeed);
          farmerUpdateData['stats.seedDebt'] = _.inc(-deductSeed);
        }
        if (deductAgri > 0) {
          farmerUpdateData.agriculturalDebt = _.inc(-deductAgri);
          farmerUpdateData['stats.agriculturalDebt'] = _.inc(-deductAgri);
        }

        await t.collection('farmers')
          .doc(farmer._id)
          .update({ data: farmerUpdateData });
      });

      // 6. 发送通知给出纳（待付款）
      const cashierUsers = await db.collection('users')
        .where({ role: 'cashier', status: 'active' })
        .get();

      for (const cashier of cashierUsers.data) {
        await db.collection('notifications').add({
          data: {
            userId: cashier._id,
            userRole: 'cashier',
            type: 'payment_pending',
            title: '新的待付款结算',
            content: `农户${settlement.farmerName}的结算单已审核通过，待付金额￥${actualPayment}`,
            data: {
              settlementId,
              farmerName: settlement.farmerName,
              actualPayment
            },
            page: '/pages/finance/detail/index',
            params: { id: settlementId },
            isRead: false,
            priority: 'normal',
            createTime: db.serverDate()
          }
        });
      }

      // 7. 记录操作日志
      await db.collection('operation_logs').add({
        data: {
          userId: currentUser._id,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'audit_settlement_approve',
          module: 'settlement',
          targetId: settlementId,
          targetName: settlement.farmerName,
          description: `审核通过结算单：${settlement.farmerName}，货款￥${acquisitionAmount}，扣款￥${totalDeduction}，实付￥${actualPayment}`,
          deductionDetail: {
            advanceDeduction: deductAdvance,
            seedDeduction: deductSeed,
            agriculturalDeduction: deductAgri,
            totalDeduction,
            actualPayment
          },
          createTime: db.serverDate()
        }
      });

      // 8. 写入业务往来记录 - 结算审核
      await db.collection('business_records').add({
        data: {
          farmerId: settlement.farmerId,
          farmerName: settlement.farmerName,
          type: 'settlement_audit',
          name: '结算审核',
          date: new Date().toISOString().split('T')[0],
          amount: actualPayment,
          desc: `货款¥${acquisitionAmount}，扣款¥${totalDeduction}，待付¥${actualPayment}`,
          relatedId: settlementId,
          relatedType: 'settlement',
          operator: currentUser.name,
          operatorId: currentUser._id,
          createTime: db.serverDate()
        }
      });

      return {
        success: true,
        message: '审核通过',
        data: {
          acquisitionAmount,
          advanceDeduction: deductAdvance,
          seedDeduction: deductSeed,
          agriculturalDeduction: deductAgri,
          totalDeduction,
          actualPayment: actualPayment
        }
      };
    } else {
      // ============ 审核驳回 ============
      if (!auditRemark) {
        return {
          success: false,
          errMsg: '驳回时必须填写原因'
        };
      }

      // ==================== 事务操作开始 ====================
      await db.runTransaction(async (t) => {
        // 1. 更新结算单状态
        await t.collection('settlements')
          .doc(settlement._id)
          .update({
            data: {
              status: 'rejected',
              auditStatus: 'rejected',
              auditorId: currentUser._id,
              auditorName: currentUser.name,
              auditTime: db.serverDate(),
              auditRemark,
              updateTime: db.serverDate()
            }
          });

        // 2. 更新收购记录状态为审核驳回
        if (settlement.acquisitionId) {
          const acqRes = await db.collection('acquisitions')
            .where({ acquisitionId: settlement.acquisitionId })
            .get();
          if (acqRes.data && acqRes.data.length > 0) {
            await t.collection('acquisitions')
              .doc(acqRes.data[0]._id)
              .update({
                data: {
                  status: 'audit_rejected',
                  auditRemark,
                  updateTime: db.serverDate()
                }
              });
          }
        }
      });
      // ==================== 事务操作结束 ====================

      // 非核心操作：记录操作日志（事务外，失败不影响主流程）
      try {
        await db.collection('operation_logs').add({
          data: {
            userId: currentUser._id,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'audit_settlement_reject',
            module: 'settlement',
            targetId: settlementId,
            targetName: settlement.farmerName,
            description: `审核驳回结算单：${settlement.farmerName}，原因：${auditRemark}`,
            createTime: db.serverDate()
          }
        });
      } catch (logError) {
        console.error('审核驳回操作日志写入失败（不影响主流程）:', logError);
      }

      return {
        success: true,
        message: '已驳回'
      };
    }
  } catch (error) {
    console.error('审核结算单失败:', error);
    return {
      success: false,
      errMsg: error.message || '审核结算单失败'
    };
  }
}

/**
 * 标记支付中
 */
async function markPayment(event, context) {
  // 三阶段状态机仅保留 pending -> approved -> completed
  // 兼容旧前端 action，直接复用 completePayment 流程
  return await completePayment(event, context);
}

/**
 * 确认付款（出纳操作）
 * 出纳线下付款后，在系统中确认
 */
async function completePayment(event, context) {
  const { OPENID } = cloud.getWXContext();
  const {
    userId,
    settlementId,
    paymentMethod,   // 付款方式：cash/wechat/bank
    paymentRemark,
    voucherNo        // 财务凭条编号（青号），出纳填写
  } = event;

  if (!settlementId) {
    return {
      success: false,
      errMsg: '缺少结算单ID'
    };
  }

  try {
    // 获取当前用户信息（优先 userId，其次 OPENID）
    let userRes;
    if (userId) {
      userRes = await db.collection('users').doc(userId).get();
      if (userRes.data) {
        userRes = { data: [userRes.data] };
      } else {
        userRes = { data: [] };
      }
    } else if (OPENID) {
      userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .get();
    } else {
      userRes = { data: [] };
    }

    if (!userRes.data || userRes.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    const currentUser = userRes.data[0];

    // 权限检查：必须是出纳或管理员
    if (currentUser.role !== 'cashier' && currentUser.role !== 'admin') {
      return {
        success: false,
        errMsg: '无权限确认付款，请使用出纳账号操作'
      };
    }

    // 获取结算单信息
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 状态检查：必须是已审核待付款状态
    const auditState = settlement.auditStatus || settlement.status;
    const payState = settlement.paymentStatus || 'unpaid';
    if (auditState !== 'approved' || payState === 'paid') {
      return {
        success: false,
        errMsg: payState === 'paid' || settlement.status === 'completed' ? '该结算单已付款完成' : '该结算单尚未审核通过'
      };
    }

    // 付款方式名称映射
    const methodNames = {
      'cash': '现金',
      'wechat': '微信转账',
      'bank': '银行转账',
      'other': '其他'
    };

    // 获取农户信息（用于事务更新）
    const farmerRes = await db.collection('farmers')
      .where({ farmerId: settlement.farmerId })
      .get();
    if (farmerRes.data.length === 0) {
      return { success: false, errMsg: '农户不存在' };
    }
    const farmer = farmerRes.data[0];

    // 更新结算状态 & 农户统计（事务）
    await db.runTransaction(async (t) => {
      await t.collection('settlements')
        .doc(settlement._id)
        .update({
          data: {
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: paymentMethod || 'cash',
            paymentMethodName: methodNames[paymentMethod] || paymentMethod || '现金',
            voucherNo: voucherNo || '',
            paymentRemark: paymentRemark || '',
            cashierId: currentUser._id,
            cashierName: currentUser.name,
            paymentBy: currentUser.name,
            paymentById: currentUser._id,
            paymentTime: db.serverDate(),
            completeTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });

      await t.collection('farmers')
        .doc(farmer._id)
        .update({
          data: {
            'stats.totalPaidAmount': _.inc(settlement.actualPayment || 0),
            updateTime: db.serverDate()
          }
        });
    });

    // 记录操作日志
    await db.collection('operation_logs').add({
      data: {
        userId: currentUser._id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'confirm_payment',
        module: 'settlement',
        targetId: settlementId,
        targetName: settlement.farmerName,
        description: `确认付款：${settlement.farmerName}，金额￥${settlement.actualPayment}，方式：${methodNames[paymentMethod] || '现金'}`,
        createTime: db.serverDate()
      }
    });

    // 写入业务往来记录 - 付款完成
    await db.collection('business_records').add({
      data: {
        farmerId: settlement.farmerId,
        farmerName: settlement.farmerName,
        type: 'payment',
        name: '结算付款',
        date: new Date().toISOString().split('T')[0],
        amount: settlement.actualPayment || 0,
        desc: `实付¥${settlement.actualPayment}，${methodNames[paymentMethod] || '现金'}`,
        relatedId: settlementId,
        relatedType: 'settlement',
        operator: currentUser.name,
        operatorId: currentUser._id,
        createTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '付款确认成功'
    };
  } catch (error) {
    console.error('确认付款失败:', error);
    return {
      success: false,
      errMsg: error.message || '确认付款失败'
    };
  }
}

/**
 * 重新计算结算金额（财务操作）
 * 结算公式：收购总额 - 种苗欠款 - 农资款 - 预支款项
 */
async function recalculateSettlement(event) {
  const { OPENID } = cloud.getWXContext();
  const { userId, settlementId, agriculturalDebt, advancePayment, remark } = event;

  if (!userId || !settlementId) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  try {
    // 获取当前用户信息
    let userRes;
    if (OPENID) {
      userRes = await db.collection('users').where({ _openid: OPENID }).get();
      if (!userRes.data || userRes.data.length === 0) {
        return { success: false, message: '用户不存在' };
      }
      if (userId && userRes.data[0]._id !== userId) {
        return { success: false, message: '用户身份不匹配' };
      }
    } else {
      userRes = await db.collection('users').doc(userId).get();
      if (!userRes.data) {
        return { success: false, message: '用户不存在' };
      }
    }

    if (!userRes.data || (Array.isArray(userRes.data) && userRes.data.length === 0)) {
      return {
        success: false,
        message: '用户不存在'
      };
    }

    const currentUser = Array.isArray(userRes.data) ? userRes.data[0] : userRes.data;

    // 权限检查：只有财务和管理员可以操作
    if (!['finance_admin', 'admin'].includes(currentUser.role)) {
      return {
        success: false,
        message: '无权限重新计算结算'
      };
    }

    // 获取结算单信息
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        message: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 状态检查：已付款的结算单不允许重新计算
    if (settlement.status === 'completed' || settlement.paymentStatus === 'paid') {
      return {
        success: false,
        message: '已付款的结算单无法重新计算'
      };
    }

    // 获取农户信息
    const farmerRes = await db.collection('farmers')
      .where({ farmerId: settlement.farmerId })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        message: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];

    // 计算各项扣款
    const grossAmount = settlement.acquisitionAmount || settlement.grossAmount || 0;  // 收购总额

    // 读取农户当前欠款
    let seedDebt = resolveSeedDebt(farmer);
    let agriDebt = parseFloat(agriculturalDebt) || farmer.agriculturalDebt || 0;  // 农资款
    let advPay = parseFloat(advancePayment) || farmer.advancePayment || 0;        // 预支款

    // 如果结算单已审核过，需要回滚之前的扣款来还原真实欠款
    let effectiveSeedDebt = seedDebt;
    let effectiveAgriDebt = agriDebt;
    let effectiveAdvPay = advPay;

    if (settlement.auditStatus === 'approved') {
      const prevSeedDeduction = settlement.seedDeduction || 0;
      const prevAgriDeduction = settlement.agriculturalDeduction || 0;
      const prevAdvDeduction = settlement.advanceDeduction || 0;

      effectiveSeedDebt = add(seedDebt, prevSeedDeduction);
      effectiveAgriDebt = add(agriDebt, prevAgriDeduction);
      effectiveAdvPay = add(advPay, prevAdvDeduction);
    }

    // 计算新的扣款（优先级：预付款 > 种苗 > 农资）
    let remaining = grossAmount;
    let newAdvDeduction = 0;
    let newSeedDeduction = 0;
    let newAgriDeduction = 0;

    if (remaining > 0 && effectiveAdvPay > 0) {
      newAdvDeduction = Math.min(remaining, effectiveAdvPay);
      remaining = subtract(remaining, newAdvDeduction);
    }

    if (remaining > 0 && effectiveSeedDebt > 0) {
      newSeedDeduction = Math.min(remaining, effectiveSeedDebt);
      remaining = subtract(remaining, newSeedDeduction);
    }

    if (remaining > 0 && effectiveAgriDebt > 0) {
      newAgriDeduction = Math.min(remaining, effectiveAgriDebt);
      remaining = subtract(remaining, newAgriDeduction);
    }

    const totalDeductions = add(newAdvDeduction, newSeedDeduction, newAgriDeduction);
    const actualPayment = roundToFen(remaining);

    // ==================== 事务操作开始 ====================
    await db.runTransaction(async (t) => {
      // 1. 更新结算单（记录回滚后的真实欠款和新扣款明细）
      await t.collection('settlements')
        .doc(settlement._id)
        .update({
          data: {
            seedDebt: effectiveSeedDebt,
            agriculturalDebt: effectiveAgriDebt,
            advancePayment: effectiveAdvPay,
            advanceDeduction: newAdvDeduction,
            seedDeduction: newSeedDeduction,
            agriculturalDeduction: newAgriDeduction,
            totalDeduction: totalDeductions,
            totalDeductions,
            actualPayment: actualPayment,
            recalculateBy: currentUser.name,
            recalculateById: userId,
            recalculateTime: db.serverDate(),
            recalculateRemark: remark || '',
            updateTime: db.serverDate()
          }
        });

      // 2. 更新农户欠款（回滚到真实值，后续审核时再扣减）
      await t.collection('farmers')
        .doc(farmer._id)
        .update({
          data: {
            seedDebt: effectiveSeedDebt,
            agriculturalDebt: effectiveAgriDebt,
            advancePayment: effectiveAdvPay,
            'stats.seedDebt': effectiveSeedDebt,
            'stats.agriculturalDebt': effectiveAgriDebt,
            'stats.advancePayment': effectiveAdvPay,
            updateTime: db.serverDate()
          }
        });
    });
    // ==================== 事务操作结束 ====================

    // 非核心操作：记录修改日志（事务外，失败不影响主流程）
    try {
      await db.collection('modification_logs').add({
        data: {
          targetType: 'settlement',
          targetId: settlementId,
          action: 'recalculate',
          beforeData: {
            grossAmount: settlement.grossAmount,
            seedDebt: settlement.seedDebt,
            agriculturalDebt: settlement.agriculturalDebt || 0,
            advancePayment: settlement.advancePayment || 0,
            actualPayment: settlement.actualPayment
          },
          afterData: {
            grossAmount,
            seedDebt,
            agriculturalDebt: agriDebt,
            advancePayment: advPay,
            actualPayment
          },
          reason: remark || '财务重新计算结算金额',
          operatorId: userId,
          operatorName: currentUser.name,
          createTime: db.serverDate()
        }
      });
    } catch (logError) {
      console.error('重新计算结算修改日志写入失败（不影响主流程）:', logError);
    }

    return {
      success: true,
      message: '结算金额已更新',
      data: {
        grossAmount,
        seedDebt,
        agriculturalDebt: agriDebt,
        advancePayment: advPay,
        totalDeductions,
        actualPayment: actualPayment
      }
    };
  } catch (error) {
    console.error('重新计算结算失败:', error);
    return {
      success: false,
      message: error.message || '重新计算结算失败'
    };
  }
}

/**
 * 获取出纳统计数据
 * 用于出纳首页展示待付款统计
 */
async function getCashierStats() {
  try {
    // 获取待审核结算单
    const pendingAuditRes = await db.collection('settlements')
      .where(_.or([{ auditStatus: 'pending' }, { status: 'pending' }]))
      .count();
    const pendingAuditCount = pendingAuditRes.total || 0;

    // 待审核金额（聚合）
    const pendingAuditAmountRes = await db.collection('settlements')
      .aggregate()
      .match(
        _.or([{ auditStatus: 'pending' }, { status: 'pending' }])
      )
      .group({
        _id: null,
        total: $.sum('$acquisitionAmount')
      })
      .end();
    const pendingAuditAmount = pendingAuditAmountRes.list[0]?.total || 0;

    // 获取待付款结算单（状态为approved）
    // 待付款数量
    const pendingCountRes = await db.collection('settlements')
      .where(
        _.or([
          { auditStatus: 'approved', paymentStatus: 'unpaid' },
          { status: 'approved' }
        ])
      )
      .count();
    const pendingCount = pendingCountRes.total || 0;

    // 待付款金额（聚合）
    const pendingAmountRes = await db.collection('settlements')
      .aggregate()
      .match(
        _.or([
          { auditStatus: 'approved', paymentStatus: 'unpaid' },
          { status: 'approved' }
        ])
      )
      .group({
        _id: null,
        total: $.sum('$actualPayment')
      })
      .end();
    const pendingAmount = pendingAmountRes.list[0]?.total || 0;

    // 获取今日已付款结算单
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日已付款数量
    const todayPaidCountRes = await db.collection('settlements')
      .where(
        _.and([
          _.or([{ paymentStatus: 'paid' }, { status: 'completed' }]),
          { paymentTime: _.gte(today) }
        ])
      )
      .count();
    const todayPaidCount = todayPaidCountRes.total || 0;

    // 今日已付款金额（聚合）
    const todayPaidAmountRes = await db.collection('settlements')
      .aggregate()
      .match(
        _.and([
          _.or([{ paymentStatus: 'paid' }, { status: 'completed' }]),
          { paymentTime: _.gte(today) }
        ])
      )
      .group({
        _id: null,
        total: $.sum('$actualPayment')
      })
      .end();
    const todayPaidAmount = todayPaidAmountRes.list[0]?.total || 0;

    // 获取累计已付款
    const totalPaidRes = await db.collection('settlements')
      .where(_.or([{ paymentStatus: 'paid' }, { status: 'completed' }]))
      .count();

    const totalPaidCount = totalPaidRes.total || 0;

    // 获取累计已付金额（使用聚合）
    const totalPaidAmountRes = await db.collection('settlements')
      .aggregate()
      .match(_.or([{ paymentStatus: 'paid' }, { status: 'completed' }]))
      .group({
        _id: null,
        total: $.sum('$actualPayment')
      })
      .end();

    const totalPaidAmount = totalPaidAmountRes.list[0]?.total || 0;

    return {
      success: true,
      data: {
        pendingAuditCount,
        pendingAuditAmount,
        pendingCount,
        pendingAmount,
        todayPaidCount,
        todayPaidAmount,
        totalPaidCount,
        totalPaidAmount
      }
    };
  } catch (error) {
    console.error('获取出纳统计失败:', error);
    return {
      success: false,
      message: error.message || '获取出纳统计失败'
    };
  }
}

/**
 * 预览扣款计算
 * 会计在审核前可以预览扣款明细
 */
async function previewDeduction(event) {
  const { settlementId } = event;

  if (!settlementId) {
    return {
      success: false,
      errMsg: '缺少结算单ID'
    };
  }

  try {
    // 获取结算单
    const settlementRes = await db.collection('settlements')
      .where({ settlementId })
      .get();

    if (settlementRes.data.length === 0) {
      return {
        success: false,
        errMsg: '结算单不存在'
      };
    }

    const settlement = settlementRes.data[0];

    // 获取农户当前欠款
    const farmerRes = await db.collection('farmers')
      .where({ farmerId: settlement.farmerId })
      .get();

    if (farmerRes.data.length === 0) {
      return {
        success: false,
        errMsg: '农户不存在'
      };
    }

    const farmer = farmerRes.data[0];
    const acquisitionAmount = settlement.acquisitionAmount || settlement.grossAmount || 0;

    // 读取当前欠款余额
    // 种苗欠款按甲方口径：累计发苗金额 - 定金（定金仅抵扣一次）
    const currentSeedDebt = resolveSeedDebt(farmer);
    const currentAgriDebt = farmer.agriculturalDebt || farmer.stats?.agriculturalDebt || 0;
    const currentAdvance = farmer.advancePayment || farmer.stats?.advancePayment || 0;

    // 计算扣款 - 使用精确计算
    let remaining = acquisitionAmount;
    let deductAdvance = 0;
    let deductSeed = 0;
    let deductAgri = 0;

    if (remaining > 0 && currentAdvance > 0) {
      deductAdvance = Math.min(remaining, currentAdvance);
      remaining = subtract(remaining, deductAdvance);
    }

    if (remaining > 0 && currentSeedDebt > 0) {
      deductSeed = Math.min(remaining, currentSeedDebt);
      remaining = subtract(remaining, deductSeed);
    }

    if (remaining > 0 && currentAgriDebt > 0) {
      deductAgri = Math.min(remaining, currentAgriDebt);
      remaining = subtract(remaining, deductAgri);
    }

    const totalDeduction = add(deductAdvance, deductSeed, deductAgri);
    const actualPayment = roundToFen(remaining);

    return {
      success: true,
      data: {
        acquisitionAmount,
        currentDebts: {
          advancePayment: currentAdvance,
          seedDebt: currentSeedDebt,
          agriculturalDebt: currentAgriDebt
        },
        deductions: {
          advanceDeduction: deductAdvance,
          seedDeduction: deductSeed,
          agriculturalDeduction: deductAgri,
          totalDeduction
        },
        actualPayment: actualPayment
      }
    };
  } catch (error) {
    console.error('预览扣款计算失败:', error);
    return {
      success: false,
      message: error.message || '预览扣款计算失败'
    };
  }
}

/**
 * 结算单字段回填（管理员）
 * 只回填缺失字段，不覆盖已有字段
 */
async function backfillSettlements(event) {
  const { OPENID } = cloud.getWXContext();
  const {
    batchSize = 50,
    startAfter = null,
    dryRun = true
  } = event;

  const size = Math.min(Math.max(parseInt(batchSize, 10) || 50, 1), MAX_BACKFILL_BATCH);

  // 权限校验
  const userRes = await db.collection('users').where({ _openid: OPENID }).get();
  if (!userRes.data || userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' };
  }
  const currentUser = userRes.data[0];
  if (currentUser.role !== 'admin') {
    return { success: false, errMsg: '无权限执行回填' };
  }

  let query = db.collection('settlements').orderBy('createTime', 'asc').limit(size);
  if (startAfter) {
    const startDate = new Date(startAfter);
    if (!Number.isNaN(startDate.getTime())) {
      query = query.where({ createTime: _.gt(startDate) });
    }
  }

  const res = await query.get();
  const list = res.data || [];

  let updated = 0;
  for (const doc of list) {
    const updateData = {};
    const status = doc.status;

    if (!doc.auditStatus && status) {
      if (status === 'pending') updateData.auditStatus = 'pending';
      else if (status === 'rejected') updateData.auditStatus = 'rejected';
      else if (status === 'approved' || status === 'completed' || status === 'paying') updateData.auditStatus = 'approved';
    }

    if (!doc.paymentStatus && status) {
      if (status === 'completed') updateData.paymentStatus = 'paid';
      else if (status === 'paying') updateData.paymentStatus = 'unpaid';
      else if (status === 'approved') updateData.paymentStatus = 'unpaid';
      else if (status === 'pending' || status === 'rejected') updateData.paymentStatus = 'unpaid';
    }

    if (!isFiniteNumber(doc.grossAmount) && isFiniteNumber(doc.acquisitionAmount)) {
      updateData.grossAmount = doc.acquisitionAmount;
    }
    if (!isFiniteNumber(doc.netWeight) && isFiniteNumber(doc.acquisitionWeight)) {
      updateData.netWeight = doc.acquisitionWeight;
    }
    if (!isFiniteNumber(doc.unitPrice) && isFiniteNumber(doc.acquisitionPrice)) {
      updateData.unitPrice = doc.acquisitionPrice;
    }

    const sumDeductions = (doc.advanceDeduction || 0) + (doc.seedDeduction || 0) + (doc.agriculturalDeduction || 0);
    if (!isFiniteNumber(doc.totalDeduction) && (isFiniteNumber(doc.totalDeductions) || sumDeductions > 0)) {
      updateData.totalDeduction = isFiniteNumber(doc.totalDeductions) ? doc.totalDeductions : sumDeductions;
    }
    if (!isFiniteNumber(doc.totalDeductions) && (isFiniteNumber(doc.totalDeduction) || sumDeductions > 0)) {
      updateData.totalDeductions = isFiniteNumber(doc.totalDeduction) ? doc.totalDeduction : sumDeductions;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updateTime = db.serverDate();
      if (!dryRun) {
        await db.collection('settlements').doc(doc._id).update({ data: updateData });
      }
      updated += 1;
    }
  }

  const nextStartAfter = list.length > 0 ? list[list.length - 1].createTime : null;
  return {
    success: true,
    data: {
      processed: list.length,
      updated,
      dryRun: !!dryRun,
      nextStartAfter
    }
  };
}

/**
 * 农户种苗欠款回填（管理员）
 * 仅在 seedDebt 缺失时回填
 */
async function backfillFarmersSeedDebt(event) {
  const { OPENID } = cloud.getWXContext();
  const {
    batchSize = 50,
    startAfter = null,
    dryRun = true
  } = event;

  const size = Math.min(Math.max(parseInt(batchSize, 10) || 50, 1), MAX_BACKFILL_BATCH);

  const userRes = await db.collection('users').where({ _openid: OPENID }).get();
  if (!userRes.data || userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' };
  }
  const currentUser = userRes.data[0];
  if (currentUser.role !== 'admin') {
    return { success: false, errMsg: '无权限执行回填' };
  }

  let query = db.collection('farmers').orderBy('createTime', 'asc').limit(size);
  if (startAfter) {
    const startDate = new Date(startAfter);
    if (!Number.isNaN(startDate.getTime())) {
      query = query.where({ createTime: _.gt(startDate) });
    }
  }

  const res = await query.get();
  const list = res.data || [];

  let updated = 0;
  for (const doc of list) {
    if (isFiniteNumber(doc.seedDebt)) continue;
    // 种苗欠款按甲方口径：累计发苗金额 - 定金（定金仅抵扣一次）
    const newSeedDebt = resolveSeedDebt(doc);

    const updateData = {
      seedDebt: newSeedDebt,
      'stats.seedDebt': newSeedDebt,
      updateTime: db.serverDate()
    };
    if (!dryRun) {
      await db.collection('farmers').doc(doc._id).update({ data: updateData });
    }
    updated += 1;
  }

  const nextStartAfter = list.length > 0 ? list[list.length - 1].createTime : null;
  return {
    success: true,
    data: {
      processed: list.length,
      updated,
      dryRun: !!dryRun,
      nextStartAfter
    }
  };
}

/**
 * 清空业务数据（保留所有用户账号）
 * 仅管理员可执行
 */
async function purgeBusinessData(event) {
  const { OPENID } = cloud.getWXContext();
  const userRes = await db.collection('users').where({ _openid: OPENID }).get();
  if (!userRes.data || userRes.data.length === 0) {
    return { success: false, errMsg: '用户不存在' };
  }
  const currentUser = userRes.data[0];
  if (currentUser.role !== 'admin') {
    return { success: false, errMsg: '无权限执行清空' };
  }

  const collections = [
    'warehouses',
    'farmers',
    'business_records',
    'seed_records',
    'acquisitions',
    'settlements',
    'planting_guidance',
    'notifications',
    'operation_logs',
    'modification_logs'
  ];

  const results = {};
  for (const name of collections) {
    results[name] = await deleteCollectionBatch(name);
  }

  return {
    success: true,
    data: results
  };
}

/**
 * 获取结算统计数据
 * 支持按日期范围筛选，返回汇总和每日明细
 */
async function getStatistics(event) {
  const { startDate, endDate, groupBy = 'day' } = event;

  try {
    // 构建查询条件：只统计已完成的结算
    let matchCondition = _.or([
      { status: 'completed' },
      { paymentStatus: 'paid' }
    ]);

    // 日期范围筛选
    if (startDate && endDate) {
      matchCondition = _.and([
        matchCondition,
        { paymentTime: _.gte(new Date(startDate)) },
        { paymentTime: _.lte(new Date(endDate + 'T23:59:59')) }
      ]);
    } else if (startDate) {
      matchCondition = _.and([
        matchCondition,
        { paymentTime: _.gte(new Date(startDate)) }
      ]);
    } else if (endDate) {
      matchCondition = _.and([
        matchCondition,
        { paymentTime: _.lte(new Date(endDate + 'T23:59:59')) }
      ]);
    }

    // 1. 获取汇总统计
    const summaryRes = await db.collection('settlements')
      .aggregate()
      .match(matchCondition)
      .group({
        _id: null,
        totalCount: $.sum(1),
        totalAcquisitionAmount: $.sum('$acquisitionAmount'),
        totalDeduction: $.sum('$totalDeduction'),
        totalActualPayment: $.sum('$actualPayment'),
        totalSeedDeduction: $.sum('$seedDeduction'),
        totalAgriDeduction: $.sum('$agriculturalDeduction'),
        totalAdvanceDeduction: $.sum('$advanceDeduction')
      })
      .end();

    const summary = summaryRes.list[0] || {
      totalCount: 0,
      totalAcquisitionAmount: 0,
      totalDeduction: 0,
      totalActualPayment: 0,
      totalSeedDeduction: 0,
      totalAgriDeduction: 0,
      totalAdvanceDeduction: 0
    };

    // 2. 按日期分组统计
    const dailyRes = await db.collection('settlements')
      .aggregate()
      .match(matchCondition)
      .addFields({
        dateStr: $.dateToString({
          date: '$paymentTime',
          format: '%Y-%m-%d',
          timezone: 'Asia/Shanghai'
        })
      })
      .group({
        _id: '$dateStr',
        count: $.sum(1),
        acquisitionAmount: $.sum('$acquisitionAmount'),
        deduction: $.sum('$totalDeduction'),
        actualPayment: $.sum('$actualPayment')
      })
      .sort({ _id: -1 })
      .limit(60)
      .end();

    const dailyStats = dailyRes.list.map(item => ({
      date: item._id,
      count: item.count,
      acquisitionAmount: item.acquisitionAmount || 0,
      deduction: item.deduction || 0,
      actualPayment: item.actualPayment || 0
    }));

    // 3. 按仓库分组统计
    const warehouseRes = await db.collection('settlements')
      .aggregate()
      .match(matchCondition)
      .group({
        _id: '$warehouseId',
        warehouseName: $.first('$warehouseName'),
        count: $.sum(1),
        acquisitionAmount: $.sum('$acquisitionAmount'),
        actualPayment: $.sum('$actualPayment')
      })
      .sort({ actualPayment: -1 })
      .end();

    const warehouseStats = warehouseRes.list.map(item => ({
      warehouseId: item._id,
      warehouseName: item.warehouseName || '未知仓库',
      count: item.count,
      acquisitionAmount: item.acquisitionAmount || 0,
      actualPayment: item.actualPayment || 0
    }));

    // 4. 按付款方式统计
    const methodRes = await db.collection('settlements')
      .aggregate()
      .match(matchCondition)
      .group({
        _id: '$paymentMethod',
        methodName: $.first('$paymentMethodName'),
        count: $.sum(1),
        actualPayment: $.sum('$actualPayment')
      })
      .sort({ actualPayment: -1 })
      .end();

    const methodNames = {
      'cash': '现金',
      'wechat': '微信转账',
      'bank': '银行转账'
    };

    const paymentMethodStats = methodRes.list.map(item => ({
      method: item._id || 'unknown',
      methodName: item.methodName || methodNames[item._id] || '其他',
      count: item.count,
      actualPayment: item.actualPayment || 0
    }));

    return {
      success: true,
      data: {
        summary: {
          totalCount: summary.totalCount,
          totalAcquisitionAmount: Number((summary.totalAcquisitionAmount || 0).toFixed(2)),
          totalDeduction: Number((summary.totalDeduction || 0).toFixed(2)),
          totalActualPayment: Number((summary.totalActualPayment || 0).toFixed(2)),
          totalSeedDeduction: Number((summary.totalSeedDeduction || 0).toFixed(2)),
          totalAgriDeduction: Number((summary.totalAgriDeduction || 0).toFixed(2)),
          totalAdvanceDeduction: Number((summary.totalAdvanceDeduction || 0).toFixed(2))
        },
        dailyStats,
        warehouseStats,
        paymentMethodStats
      }
    };
  } catch (error) {
    console.error('获取结算统计失败:', error);
    return {
      success: false,
      errMsg: error.message || '获取结算统计失败'
    };
  }
}

// 主函数
exports.main = async (event, context) => {
  const { action } = event;

  switch (action) {
    case 'get':
    case 'getDetail':
      return await getSettlement(event);
    case 'list':
      return await listSettlements(event, context);
    case 'audit':
      return await auditSettlement(event, context);
    case 'markPayment':
      return await markPayment(event, context);
    case 'completePayment':
      return await completePayment(event, context);
    case 'recalculate':
      return await recalculateSettlement(event);
    case 'getCashierStats':
      return await getCashierStats();
    case 'previewDeduction':
      return await previewDeduction(event);
    case 'backfillSettlements':
      return await backfillSettlements(event);
    case 'backfillFarmersSeedDebt':
      return await backfillFarmersSeedDebt(event);
    case 'purgeBusinessData':
      return await purgeBusinessData(event);
    case 'getStatistics':
      return await getStatistics(event);
    default:
      return {
        success: false,
        errMsg: '无效的操作类型'
      };
  }
};
