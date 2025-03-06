import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatLargeNumber = (num: number): string => {
  const absNum = Math.abs(num);

  if (absNum >= 1e12) {
    return `${(num / 1e12).toFixed(2)}T`;
  } else if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(2)}K`;
  }
  return num.toFixed(2);
};

export const openInNewTab = (url: string) => {
  const win = window.open(url, "_blank");
  win?.focus();
};
