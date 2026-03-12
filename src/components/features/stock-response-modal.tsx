"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
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
              <h2 className="text-xl font-bold text-white mt-4 mb-2">{children}</h2>
            );
          },
          h3: ({ children }) => {
            return (
              <h3 className="text-lg font-bold text-white mt-3 mb-2">{children}</h3>
            );
          },
          ul: ({ children }) => {
            return <ul className="list-disc list-inside text-white space-y-1">{children}</ul>;
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
            return <code className="bg-white/10 px-1 py-0.5 rounded text-sm text-gray-200">{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export function StockResponseModal({ isOpen, onClose, stock }: StockResponseModalProps) {
  if (!stock) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] bg-[#15162c] border-white/20 text-white flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {stock.supabaseId} - Analysis Report
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full w-full">
            <div className="bg-white/5 border border-white/10 p-4 rounded-md">
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