export interface FMPCashFlowGrowthResult {
  date: string;
  symbol: string;
  calendarYear: string;
  period: string;
  growthNetIncome: number;
  growthDepreciationAndAmortization: number;
  growthDeferredIncomeTax: number;
  growthStockBasedCompensation: number;
  growthChangeInWorkingCapital: number;
  growthAccountsReceivables: number;
  growthInventory: number;
  growthAccountsPayables: number;
  growthOtherWorkingCapital: number;
  growthOtherNonCashItems: number;
  growthNetCashProvidedByOperatingActivites: number;
  growthInvestmentsInPropertyPlantAndEquipment: number;
  growthAcquisitionsNet: number;
  growthPurchasesOfInvestments: number;
  growthSalesMaturitiesOfInvestments: number;
  growthOtherInvestingActivites: number;
  growthNetCashUsedForInvestingActivites: number;
  growthDebtRepayment: number;
  growthCommonStockIssued: number;
  growthCommonStockRepurchased: number;
  growthDividendsPaid: number;
  growthOtherFinancingActivites: number;
  growthNetCashUsedProvidedByFinancingActivities: number;
  growthEffectOfForexChangesOnCash: number;
  growthNetChangeInCash: number;
  growthCashAtEndOfPeriod: number;
  growthCashAtBeginningOfPeriod: number;
  growthOperatingCashFlow: number;
  growthCapitalExpenditure: number;
  growthFreeCashFlow: number;
}

export type FMPCashFlowGrowthResponse = FMPCashFlowGrowthResult[];
