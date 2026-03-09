export interface FMPAnalystRecommendationResult {
  symbol: string;
  date: string;
  analystRatingsbuy: number;
  analystRatingsHold: number;
  analystRatingsSell: number;
  analystRatingsStrongSell: number;
  analystRatingsStrongBuy: number;
}

export type FMPAnalystRecommendationResponse = FMPAnalystRecommendationResult[];
