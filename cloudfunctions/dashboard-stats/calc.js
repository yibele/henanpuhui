/**
 * 精确金额计算工具
 * @description 使用整数计算法避免 JavaScript 浮点数精度问题
 *
 * 原理：将元转为分（整数）进行计算，避免 0.1 + 0.2 !== 0.3 的问题
 *
 * 安全范围：
 * - JavaScript 安全整数上限：9,007,199,254,740,991（约 9000 万亿）
 * - 10亿元 = 1000亿分，远在安全范围内
 * - 即使 100亿元 × 100 的中间计算也完全安全
 */

/**
 * 元转分（放大100倍取整）
 * @param {number} yuan 金额（元）
 * @returns {number} 金额（分）
 */
function toFen(yuan) {
  if (yuan === null || yuan === undefined || isNaN(yuan)) {
    return 0
  }
  return Math.round(yuan * 100)
}

/**
 * 分转元
 * @param {number} fen 金额（分）
 * @returns {number} 金额（元）
 */
function toYuan(fen) {
  if (fen === null || fen === undefined || isNaN(fen)) {
    return 0
  }
  return fen / 100
}

/**
 * 精确加法（支持多个参数）
 * @param {...number} nums 多个金额（元）
 * @returns {number} 求和结果（元），精确到分
 * @example add(0.1, 0.2) => 0.3
 * @example add(100.01, 200.02, 300.03) => 600.06
 */
function add(...nums) {
  const sum = nums.reduce((acc, n) => {
    return acc + toFen(n)
  }, 0)
  return toYuan(sum)
}

/**
 * 精确减法
 * @param {number} a 被减数（元）
 * @param {number} b 减数（元）
 * @returns {number} 差值（元），精确到分
 * @example subtract(100.10, 50.05) => 50.05
 */
function subtract(a, b) {
  return toYuan(toFen(a) - toFen(b))
}

/**
 * 精确乘法（用于 重量 × 单价 等场景）
 * @param {number} a 乘数1
 * @param {number} b 乘数2
 * @returns {number} 乘积，精确到分
 * @example multiply(100.5, 3.5) => 351.75
 */
function multiply(a, b) {
  if (a === null || a === undefined || isNaN(a)) return 0
  if (b === null || b === undefined || isNaN(b)) return 0

  // 将两个数都放大到整数进行计算
  // 确定小数位数
  const aStr = a.toString()
  const bStr = b.toString()
  const aDecimals = aStr.includes('.') ? aStr.split('.')[1].length : 0
  const bDecimals = bStr.includes('.') ? bStr.split('.')[1].length : 0

  const factor = Math.pow(10, aDecimals + bDecimals)
  const aInt = Math.round(a * Math.pow(10, aDecimals))
  const bInt = Math.round(b * Math.pow(10, bDecimals))

  // 计算结果后再除以放大倍数，最后四舍五入到分
  const result = (aInt * bInt) / factor
  return roundToFen(result)
}

/**
 * 精确除法
 * @param {number} a 被除数
 * @param {number} b 除数
 * @returns {number} 商，精确到分
 * @example divide(100, 3) => 33.33
 */
function divide(a, b) {
  if (b === 0 || b === null || b === undefined || isNaN(b)) {
    return 0
  }
  if (a === null || a === undefined || isNaN(a)) {
    return 0
  }
  return roundToFen(a / b)
}

/**
 * 四舍五入到分（保留2位小数）
 * @param {number} amount 金额
 * @returns {number} 四舍五入后的金额
 * @example roundToFen(100.567) => 100.57
 * @example roundToFen(100.001) => 100
 */
function roundToFen(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0
  }
  return Math.round(amount * 100) / 100
}

/**
 * 计算净重
 * @param {number} grossWeight 毛重（kg）
 * @param {number} tareWeight 皮重（kg）
 * @param {number} moistureRate 水杂率（小数，如 0.05 表示 5%）
 * @returns {number} 净重（kg），精确到小数点后2位
 */
function calcNetWeight(grossWeight, tareWeight, moistureRate) {
  // 净重 = 毛重 - 皮重 - (毛重 × 水杂率)
  const moisture = multiply(grossWeight, moistureRate)
  const net = subtract(subtract(grossWeight, tareWeight), moisture)
  return roundToFen(net)
}

/**
 * 计算总金额
 * @param {number} weight 重量（kg）
 * @param {number} unitPrice 单价（元/kg）
 * @returns {number} 总金额（元），精确到分
 */
function calcTotalAmount(weight, unitPrice) {
  return multiply(weight, unitPrice)
}

/**
 * 计算扣款后实付金额
 * @param {number} acquisitionAmount 收购货款（元）
 * @param {number} advanceDeduction 预支款扣除（元）
 * @param {number} seedDeduction 种苗欠款扣除（元）
 * @param {number} agriculturalDeduction 农资欠款扣除（元）
 * @returns {object} { totalDeduction, actualPayment }
 */
function calcSettlement(acquisitionAmount, advanceDeduction, seedDeduction, agriculturalDeduction) {
  const totalDeduction = add(advanceDeduction, seedDeduction, agriculturalDeduction)
  const actualPayment = subtract(acquisitionAmount, totalDeduction)

  return {
    totalDeduction: roundToFen(totalDeduction),
    actualPayment: roundToFen(Math.max(0, actualPayment)) // 实付不能为负
  }
}

/**
 * 安全地将数值转为存储格式（确保精度）
 * @param {number} amount 金额
 * @returns {number} 适合存储的金额值
 */
function toStorageAmount(amount) {
  return roundToFen(amount)
}

module.exports = {
  // 基础转换
  toFen,
  toYuan,

  // 四则运算
  add,
  subtract,
  multiply,
  divide,

  // 精度处理
  roundToFen,

  // 业务计算
  calcNetWeight,
  calcTotalAmount,
  calcSettlement,

  // 存储
  toStorageAmount
}
