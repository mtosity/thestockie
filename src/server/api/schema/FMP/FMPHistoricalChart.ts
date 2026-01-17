export interface FMPChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type FMPHistoricalChartResponse = FMPChartData[];
