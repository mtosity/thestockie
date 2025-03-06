import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type GridLayout from "react-grid-layout";

const layout: GridLayout.Layout[] = [
  { i: "main-chart", x: 0, y: 0, w: 14, h: 12 },
  { i: "news", x: 14, y: 0, w: 6, h: 18 },
  { i: "fundamental-pillars", x: 0, y: 12, w: 14, h: 6 },

  { i: "live-quote", x: 0, y: 18, w: 5, h: 16 },
  { i: "ai", x: 5, y: 18, w: 15, h: 16 },

  { i: "eps", x: 0, y: 24, w: 10, h: 14 },
  { i: "revenue", x: 11, y: 24, w: 10, h: 14 },
  { i: "balance-growth", x: 0, y: 32, w: 10, h: 14 },
  { i: "cash-growth", x: 11, y: 32, w: 10, h: 14 },
  {
    i: "metrics-table",
    x: 0,
    y: 45,
    w: 20,
    h: 80,
    isDraggable: false,
    isResizable: false,
  },
];

const layoutAtom = atomWithStorage("layout-v1", layout, undefined, {
  getOnInit: true,
});
export const useLayout = () => {
  return useAtom(layoutAtom);
};
