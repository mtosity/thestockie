export interface FMPStockGradeResult {
  symbol: string;
  date: string;
  gradingCompany: string;
  previousGrade: string;
  newGrade: string;
}

export type FMPStockGradeResponse = FMPStockGradeResult[];
