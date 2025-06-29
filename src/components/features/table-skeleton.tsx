"use client";

import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 10 }: TableSkeletonProps) {
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-[#15162c] z-10">
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="text-white bg-[#15162c]">Symbol</TableHead>
              <TableHead className="text-white bg-[#15162c]">Sector</TableHead>
              <TableHead className="text-white bg-[#15162c]">Market Cap</TableHead>
              <TableHead className="text-white bg-[#15162c]">Recommendation</TableHead>
              <TableHead className="text-white bg-[#15162c]">Report</TableHead>
              <TableHead className="text-white bg-[#15162c]">Last Updated</TableHead>
              <TableHead className="text-white bg-[#15162c]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index} className="border-white/10 hover:bg-white/5">
                <TableCell>
                  <Skeleton className="h-4 w-16 bg-white/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24 bg-white/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 bg-white/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-24 rounded bg-white/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 bg-white/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded bg-white/10" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}