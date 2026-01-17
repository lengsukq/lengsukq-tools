/**
 * 电费计算工具函数
 */

export interface ElectricityCalculationParams {
  powerConsumption: number;
  pricePerKWH: number;
  dailyRunTime: number;
  period: string;
  enablePeakValley: boolean;
  peakPricePerKWH?: number;
  valleyPricePerKWH?: number;
  peakRunTime?: number;
  valleyRunTime?: number;
  enableCustomPeriodMultiplier: boolean;
  customMultiplier?: number;
}

/**
 * 计算电费
 */
export const calculateElectricityCost = (
  params: ElectricityCalculationParams,
): number => {
  const { powerConsumption, enablePeakValley, period, enableCustomPeriodMultiplier } =
    params;

  if (isNaN(powerConsumption) || powerConsumption <= 0) {
    return 0;
  }

  let dailyCost = 0;

  if (enablePeakValley) {
    const peakPrice = params.peakPricePerKWH || 0;
    const valleyPrice = params.valleyPricePerKWH || 0;
    const peakHours = params.peakRunTime || 0;
    const valleyHours = params.valleyRunTime || 0;

    if (
      isNaN(peakPrice) ||
      isNaN(valleyPrice) ||
      isNaN(peakHours) ||
      isNaN(valleyHours)
    ) {
      return 0;
    }

    const peakKWHPerDay = (powerConsumption * peakHours) / 1000;
    const valleyKWHPerDay = (powerConsumption * valleyHours) / 1000;

    dailyCost = peakKWHPerDay * peakPrice + valleyKWHPerDay * valleyPrice;
  } else {
    const price = params.pricePerKWH;
    const runTime = params.dailyRunTime;

    if (isNaN(price) || isNaN(runTime)) {
      return 0;
    }
    const kwhPerDay = (powerConsumption * runTime) / 1000;

    dailyCost = kwhPerDay * price;
  }

  // 计算基础天数（根据period选择）
  let baseDaysInPeriod = 0;

  switch (period) {
    case "day":
      baseDaysInPeriod = 1;
      break;
    case "week":
      baseDaysInPeriod = 7;
      break;
    case "month":
      baseDaysInPeriod = 30;
      break;
    case "year":
      baseDaysInPeriod = 365;
      break;
    default:
      baseDaysInPeriod = 1;
  }

  // 如果启用了自定义周期倍数，使用自定义倍数
  if (enableCustomPeriodMultiplier && params.customMultiplier) {
    const multiplier = params.customMultiplier;

    if (isNaN(multiplier) || multiplier <= 0) {
      return 0;
    }

    return dailyCost * multiplier;
  }

  return dailyCost * baseDaysInPeriod;
};
