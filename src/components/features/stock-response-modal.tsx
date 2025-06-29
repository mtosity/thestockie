"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "~/styles/markdown.css";

interface StockResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: {
    id: string;
    response: string | null;
    prompt: string | null;
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
          code: ({ children }) => {
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
      <DialogContent className="max-w-4xl max-h-[80vh] bg-[#15162c] border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {stock.id} - Analysis Report
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <ScrollArea className="h-[500px] w-full">
              <div className="bg-white/5 border border-white/10 p-4 rounded-md">
                {stock.response ? (
                  <MarkdownWithColor content={stock.response} />
                ) : (
                  <p className="text-gray-400">No analysis available</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}