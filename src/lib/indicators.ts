export interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function calcEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;

  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  result[period - 1] = ema;

  for (let i = period; i < values.length; i++) {
    ema = (values[i]! - ema) * multiplier + ema;
    result[i] = ema;
  }

  return result;
}

export function calculateVWAP(
  data: OHLCVData[],
): { date: string; vwap: number }[] {
  let cumTPV = 0;
  let cumVol = 0;

  return data.map((d) => {
    const tp = (d.high + d.low + d.close) / 3;
    cumTPV += tp * d.volume;
    cumVol += d.volume;
    return {
      date: d.date,
      vwap: cumVol > 0 ? cumTPV / cumVol : tp,
    };
  });
}

export function calculateBollingerBands(
  data: OHLCVData[],
  period = 20,
  multiplier = 2,
): {
  date: string;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
}[] {
  const closes = data.map((d) => d.close);

  return data.map((d, i) => {
    if (i < period - 1)
      return { date: d.date, bbUpper: null, bbMiddle: null, bbLower: null };

    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const variance =
      slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
      date: d.date,
      bbUpper: mean + multiplier * std,
      bbMiddle: mean,
      bbLower: mean - multiplier * std,
    };
  });
}

export function calculateRSI(
  data: OHLCVData[],
  period = 14,
): { date: string; rsi: number | null }[] {
  const closes = data.map((d) => d.close);
  const result: { date: string; rsi: number | null }[] = data.map((d) => ({
    date: d.date,
    rsi: null,
  }));

  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i]! - closes[i - 1]!;
    if (change > 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  // No price movement yields a neutral RSI value.
  const neutralRsi = 50;
  const toRSI = (ag: number, al: number) => {
    if (ag === 0 && al === 0) return neutralRsi;
    if (al === 0) return 100;
    if (ag === 0) return 0;
    return 100 - 100 / (1 + ag / al);
  };

  result[period] = { date: data[period]!.date, rsi: toRSI(avgGain, avgLoss) };

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[i] = { date: data[i]!.date, rsi: toRSI(avgGain, avgLoss) };
  }

  return result;
}

export function calculateMACD(
  data: OHLCVData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): {
  date: string;
  macdLine: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
}[] {
  const closes = data.map((d) => d.close);
  const fastEMA = calcEMA(closes, fastPeriod);
  const slowEMA = calcEMA(closes, slowPeriod);

  const macdValues: (number | null)[] = closes.map((_, i) => {
    const fast = fastEMA[i];
    const slow = slowEMA[i];
    return fast != null && slow != null ? fast - slow : null;
  });

  const firstValid = macdValues.findIndex((v) => v !== null);
  const signalEMA: (number | null)[] = new Array(macdValues.length).fill(null);

  if (firstValid !== -1 && macdValues.length - firstValid >= signalPeriod) {
    const macdNonNull = macdValues.slice(firstValid) as number[];
    const signalValues = calcEMA(macdNonNull, signalPeriod);
    signalValues.forEach((v, i) => {
      signalEMA[firstValid + i] = v;
    });
  }

  return data.map((d, i) => ({
    date: d.date,
    macdLine: macdValues[i] ?? null,
    macdSignal: signalEMA[i] ?? null,
    macdHistogram:
      macdValues[i] !== null && signalEMA[i] !== null
        ? macdValues[i]! - signalEMA[i]!
        : null,
  }));
}

export function calculateSupportResistance(
  data: OHLCVData[],
  lookback = 5,
): { date: string; type: "support" | "resistance"; level: number; strength: number }[] {
  const result: {
    date: string;
    type: "support" | "resistance";
    level: number;
    strength: number;
  }[] = [];

  for (let i = lookback; i < data.length - lookback; i++) {
    const d = data[i]!;

    let isSwingHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j]!.high >= d.high) {
        isSwingHigh = false;
        break;
      }
    }

    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j]!.low <= d.low) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingHigh) {
      result.push({ date: d.date, type: "resistance", level: d.high, strength: 1 });
    }
    if (isSwingLow) {
      result.push({ date: d.date, type: "support", level: d.low, strength: 1 });
    }
  }

  return result;
}
