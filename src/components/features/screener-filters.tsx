"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";

interface ScreenerFiltersProps {
  symbol: string;
  sector: string;
  recommendation: string;
  marketCapMin: string;
  marketCapMax: string;
  onSymbolChange: (value: string) => void;
  onSectorChange: (value: string) => void;
  onRecommendationChange: (value: string) => void;
  onMarketCapMinChange: (value: string) => void;
  onMarketCapMaxChange: (value: string) => void;
  onClearFilters: () => void;
}

export function ScreenerFilters({
  symbol,
  sector,
  recommendation,
  marketCapMin,
  marketCapMax,
  onSymbolChange,
  onSectorChange,
  onRecommendationChange,
  onMarketCapMinChange,
  onMarketCapMaxChange,
  onClearFilters,
}: ScreenerFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    symbol !== "" ||
    sector !== "all" ||
    recommendation !== "all" ||
    marketCapMin !== "" ||
    marketCapMax !== "";

  return (
    <div className="mb-6">
      {/* Desktop Layout */}
      <div className="hidden rounded-lg bg-white/5 p-4 md:block">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="symbol" className="text-white">
              Symbol
            </Label>
            <Input
              id="symbol"
              type="text"
              placeholder="e.g. AAPL"
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector" className="text-white">
              Sector
            </Label>
            <Select value={sector} onValueChange={onSectorChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                <SelectItem value="FINANCIALS">Financials</SelectItem>
                <SelectItem value="HEALTH">Healthcare</SelectItem>
                <SelectItem value="CONS DISC">
                  Consumer Discretionary
                </SelectItem>
                <SelectItem value="INDUSTRIALS">Industrials</SelectItem>
                <SelectItem value="COMMUNICATION SVS">
                  Communication Services
                </SelectItem>
                <SelectItem value="CONS STPL">Consumer Staples</SelectItem>
                <SelectItem value="ENERGY">Energy</SelectItem>
                <SelectItem value="MATERIALS">Materials</SelectItem>
                <SelectItem value="UTILITIES">Utilities</SelectItem>
                <SelectItem value="REAL ESTATE">Real Estate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recommendation" className="text-white">
              Recommendation
            </Label>
            <Select
              value={recommendation}
              onValueChange={onRecommendationChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Recommendations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recommendations</SelectItem>
                <SelectItem value="strong_buy">Strong Buy</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketCapMin" className="text-white">
              Min Market Cap ($M)
            </Label>
            <Input
              id="marketCapMin"
              type="number"
              placeholder="0"
              value={marketCapMin}
              onChange={(e) => onMarketCapMinChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketCapMax" className="text-white">
              Max Market Cap ($M)
            </Label>
            <Input
              id="marketCapMax"
              type="number"
              placeholder="No limit"
              value={marketCapMax}
              onChange={(e) => onMarketCapMaxChange(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            onClick={onClearFilters}
            className="h-10 border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Mobile Layout - Collapsible */}
      <div className="md:hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                    Active
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="space-y-4 rounded-lg bg-white/5 p-4">
              <div className="space-y-2">
                <Label htmlFor="symbol-mobile" className="text-white">
                  Symbol
                </Label>
                <Input
                  id="symbol-mobile"
                  type="text"
                  placeholder="e.g. AAPL"
                  value={symbol}
                  onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector-mobile" className="text-white">
                  Sector
                </Label>
                <Select value={sector} onValueChange={onSectorChange}>
                  <SelectTrigger id="sector-mobile">
                    <SelectValue placeholder="All Sectors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sectors</SelectItem>
                    <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                    <SelectItem value="FINANCIALS">Financials</SelectItem>
                    <SelectItem value="HEALTH">Healthcare</SelectItem>
                    <SelectItem value="CONS DISC">
                      Consumer Discretionary
                    </SelectItem>
                    <SelectItem value="INDUSTRIALS">Industrials</SelectItem>
                    <SelectItem value="COMMUNICATION SVS">
                      Communication Services
                    </SelectItem>
                    <SelectItem value="CONS STPL">Consumer Staples</SelectItem>
                    <SelectItem value="ENERGY">Energy</SelectItem>
                    <SelectItem value="MATERIALS">Materials</SelectItem>
                    <SelectItem value="UTILITIES">Utilities</SelectItem>
                    <SelectItem value="REAL ESTATE">Real Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendation-mobile" className="text-white">
                  Recommendation
                </Label>
                <Select
                  value={recommendation}
                  onValueChange={onRecommendationChange}
                >
                  <SelectTrigger id="recommendation-mobile">
                    <SelectValue placeholder="All Recommendations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recommendations</SelectItem>
                    <SelectItem value="strong_buy">Strong Buy</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="hold">Hold</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marketCapMin-mobile" className="text-white">
                    Min Cap ($M)
                  </Label>
                  <Input
                    id="marketCapMin-mobile"
                    type="number"
                    placeholder="0"
                    value={marketCapMin}
                    onChange={(e) => onMarketCapMinChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketCapMax-mobile" className="text-white">
                    Max Cap ($M)
                  </Label>
                  <Input
                    id="marketCapMax-mobile"
                    type="number"
                    placeholder="No limit"
                    value={marketCapMax}
                    onChange={(e) => onMarketCapMaxChange(e.target.value)}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                onClick={onClearFilters}
                className="w-full border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20"
              >
                Clear Filters
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
