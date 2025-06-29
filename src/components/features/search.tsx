"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ClipLoader } from "react-spinners";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { api } from "~/trpc/react";
import { CommandLoading } from "cmdk";
import useDebounce from "~/hooks/use-debounce";
import { useSymbol } from "~/hooks/use-symbol";

export function Search() {
  const [open, setOpen] = React.useState(false);
  const [symbol, setSymbol] = useSymbol();
  const [search, setSearch] = React.useState<string>();
  const debouncedSearch = useDebounce(search, 200);
  const isReady = debouncedSearch === search;
  const { data, isLoading } = api.asset.equitySearch.useQuery(
    debouncedSearch ?? symbol,
    {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      enabled: !!debouncedSearch || !!symbol,
    },
  );

  const stocks = data?.results
    ?.filter((re) => re.etf === "N")
    .slice(0, 50)
    .map((re) => ({
      value: re.symbol,
      label: `${re.symbol} - ${re.name}`,
    }));
  // Add exact match to the top of the list
  const exactMatch = data?.results.find(
    (re) => re.symbol === search?.toUpperCase(),
  );
  if (
    !!exactMatch &&
    !stocks?.find((stock) => stock.value === exactMatch.symbol)
  ) {
    stocks?.unshift({
      value: exactMatch.symbol,
      label: `${exactMatch.symbol} - ${exactMatch.name}`,
    });
  }
  //

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between text-black"
        >
          <p className="w-32 overflow-hidden text-ellipsis whitespace-nowrap sm:w-64">
            {stocks && !!symbol && !open
              ? stocks?.find((stock) => stock.value === symbol)
                ? stocks?.find((stock) => stock.value === symbol)?.label
                : symbol
              : "Search stock..."}
            {/* <ChevronsUpDown className="opacity-50" /> */}
          </p>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command
          shouldFilter={
            !!isReady && !!stocks?.length && !!debouncedSearch?.length
          }
          filter={(_v, _s, keywords) => {
            if (
              keywords?.some((keyword) =>
                keyword
                  .toLowerCase()
                  .includes(debouncedSearch?.toLowerCase() ?? ""),
              )
            )
              return 1;
            return 0;
          }}
        >
          <CommandInput
            placeholder="Search stock..."
            className="h-9"
            value={search}
            onValueChange={(value) => setSearch(value)}
          />
          <CommandList>
            {isReady && data && <CommandEmpty>No stocks found.</CommandEmpty>}
            {isLoading ? (
              <CommandLoading>
                <div className="flex justify-center py-8">
                  <ClipLoader size={16} />
                </div>
              </CommandLoading>
            ) : (
              <CommandGroup>
                {stocks ? (
                  stocks.map((stock) => (
                    <CommandItem
                      key={stock.value}
                      value={stock.value}
                      keywords={[stock.value, stock.label]}
                      onSelect={(currentValue) => {
                        setSymbol(currentValue);

                        setOpen(false);
                      }}
                    >
                      {stock.label}
                      <Check
                        className={cn(
                          "ml-auto",
                          symbol === stock.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))
                ) : (
                  <div className="flex justify-center py-8"></div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
