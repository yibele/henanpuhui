/**
 * 精确金额计算工具
 * @description 使用整数计算法避免 JavaScript 浮点数精度问题
 *
 * 与云函数端 calc.js 逻辑一致，确保前后端计算结果相同
 */

/**
 * 元转分（放大100倍取整）
 */
function toFen(yuan: number): number {
  if (yuan === null || yuan === undefined || isNaN(yuan)) {
    return 0
  }
  return Math.round(yuan * 100)
}

/**
 * 分转元
 */
function toYuan(fen: number): number {
  if (fen === null || fen === undefined || isNaN(fen)) {
    return 0
  }
  return fen / 100
}

/**
 * 精确加法（支持多个参数）
 * @example add(0.1, 0.2) => 0.3
 */
export function add(...nums: number[]): number {
  const sum = nums.reduce((acc, n) => acc + toFen(n), 0)
  return toYuan(sum)
}

/**
 * 精确减法
 * @example subtract(100.10, 50.05) => 50.05
 */
export function subtract(a: number, b: number): number {
  return toYuan(toFen(a) - toFen(b))
}

/**
 * 精确乘法（用于 重量 × 单价 等场景）
 * @example multiply(100.5, 3.5) => 351.75
 */
export function multiply(a: number, b: number): number {
  if (a === null || a === undefined || isNaN(a)) return 0
  if (b === null || b === undefined || isNaN(b)) return 0

  const aStr = a.toString()
  const bStr = b.toString()
  const aDecimals = aStr.includes('.') ? aStr.split('.')[1].length : 0
  const bDecimals = bStr.includes('.') ? bStr.split('.')[1].length : 0

  const factor = Math.pow(10, aDecimals + bDecimals)
  const aInt = Math.round(a * Math.pow(10, aDecimals))
  const bInt = Math.round(b * Math.pow(10, bDecimals))

  const result = (aInt * bInt) / factor
  return roundToFen(result)
}

/**
 * 精确除法
 * @example divide(100, 3) => 33.33
 */
export function divide(a: number, b: number): number {
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
 * @example roundToFen(100.567) => 100.57
 */
export function roundToFen(amount: number): number {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 0
  }
  return Math.round(amount * 100) / 100
}

/**
 * 计算净重
 * @param grossWeight 毛重（kg）
 * @param tareWeight 皮重（kg）
 * @param moistureRate 水杂率（小数，如 0.05 表示 5%）
 */
export function calcNetWeight(grossWeight: number, tareWeight: number, moistureRate: number): number {
  const baseWeight = subtract(grossWeight, tareWeight)
  const moisture = multiply(baseWeight, moistureRate)
  return roundToFen(subtract(baseWeight, moisture))
}

/**
 * 计算总金额
 * @param weight 重量（kg）
 * @param unitPrice 单价（元/kg）
 */
export function calcTotalAmount(weight: number, unitPrice: number): number {
  return multiply(weight, unitPrice)
}
