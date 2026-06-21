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
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow className="border-border hover:bg-accent">
              <TableHead className="text-foreground bg-background">Symbol</TableHead>
              <TableHead className="text-foreground bg-background">Sector</TableHead>
              <TableHead className="text-foreground bg-background">Market Cap</TableHead>
              <TableHead className="text-foreground bg-background">Recommendation</TableHead>
              <TableHead className="text-foreground bg-background">Report</TableHead>
              <TableHead className="text-foreground bg-background">Last Updated</TableHead>
              <TableHead className="text-foreground bg-background">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, index) => (
              <TableRow key={index} className="border-border hover:bg-accent">
                <TableCell>
                  <Skeleton className="h-4 w-16 bg-foreground/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24 bg-foreground/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 bg-foreground/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20 rounded-full bg-foreground/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-24 rounded bg-foreground/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20 bg-foreground/10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded bg-foreground/10" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}