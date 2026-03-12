"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./mermaid-diagram";
import "~/styles/markdown.css";

interface StockResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: {
    supabaseId: string;
    response?: string;
    prompt?: string;
  } | null;
}

const MarkdownWithColor = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-invert max-w-none text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => {
            return <p className="mt-2 text-white">{children}</p>;
          },
          strong: ({ children }) => {
            const text = typeof children === "string" ? children : null;

            if (text?.includes("Red")) {
              return (
                <strong className="font-semibold text-red-500">
                  {children}
                </strong>
              );
            }

            if (text?.includes("Green")) {
              return (
                <strong className="font-semibold text-green-500">
                  {children}
                </strong>
              );
            }

            if (text?.includes("Neutral")) {
              return (
                <strong className="font-semibold text-amber-600">
                  {children}
                </strong>
              );
            }

            return <strong className="font-semibold">{children}</strong>;
          },
          h1: ({ children }) => {
            return (
              <h1 className="text-2xl font-bold text-white">{children}</h1>
            );
          },
          h2: ({ children }) => {
            return (
              <h2 className="mb-2 mt-4 text-xl font-bold text-white">
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            return (
              <h3 className="mb-2 mt-3 text-lg font-bold text-white">
                {children}
              </h3>
            );
          },
          ul: ({ children }) => {
            return (
              <ul className="list-inside list-disc space-y-1 text-white">
                {children}
              </ul>
            );
          },
          li: ({ children }) => {
            return <li className="text-white">{children}</li>;
          },
          pre: ({ children }) => {
            return <>{children}</>;
          },
          code: ({ className, children }) => {
            const match = /language-mermaid/.exec(className ?? "");
            if (match) {
              return <MermaidDiagram content={String(children)} />;
            }
            if (className) {
              return (
                <pre className="overflow-x-auto rounded-md bg-white/10 p-3 text-sm text-gray-200">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-white/10 px-1 py-0.5 text-sm text-gray-200">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export function StockResponseModal({
  isOpen,
  onClose,
  stock,
}: StockResponseModalProps) {
  if (!stock) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[80vh] max-w-5xl flex-col border-white/20 bg-[#15162c] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {stock.supabaseId} - Analysis Report
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full w-full">
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              {stock.response ? (
                <MarkdownWithColor content={stock.response} />
              ) : (
                <p className="text-gray-400">No analysis available</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
