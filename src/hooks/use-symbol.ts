import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const symbolAtom = atomWithStorage<string>("symbol", "AAPL", undefined, {
  getOnInit: true,
});
export const useSymbol = () => {
  return useAtom(symbolAtom);
};
