"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { api } from "~/trpc/react";
import { useSymbol } from "~/hooks/use-symbol";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "./mermaid-diagram";
import { StockResponseModal } from "./stock-response-modal";
import { Maximize2 } from "lucide-react";
import "~/styles/markdown.css";

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
            return <MarkdownWithColor content={String(children)} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const GPT = () => {
  const [symbol] = useSymbol();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    isLoading: isPending,
    data,
    error,
    isSuccess,
  } = api.post.getBySymbol.useQuery(
    { symbol: symbol ?? "" },
    { enabled: !!symbol },
  );

  if (!symbol) {
    return null;
  }

  return (
    <div
      className="p-4"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-bold">
              Stock recommendations - Powered by OpenAI
            </h3>
            <p>Input data: live quote, fundamental metrics, news summary</p>
          </div>
          <Button
            className="self-end border border-white bg-slate-900 text-white hover:bg-slate-600"
            variant="secondary"
            disabled={isPending}
          >
            Generate{" "}
            <Image
              src="/assets/gpt.svg"
              width={20}
              height={20}
              alt="gpt"
              color="white"
              style={{
                animation: isPending ? "spin 1s linear infinite" : undefined,
              }}
            />
          </Button>
        </div>
        {data && data.supabaseId === symbol ? (
          <p className="self-end text-xs text-gray-400">
            {`Updated at: ${Intl.DateTimeFormat().format(new Date(data.updatedAt ?? data.createdAt))}`}
          </p>
        ) : null}
      </div>

      {data && data.supabaseId === symbol ? (
        <div className="mt-4">
          <div className="relative mt-2">
            <div className="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 max-h-[500px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/50 p-4 py-8">
              {data.response ? (
                <MarkdownWithColor content={data.response} />
              ) : null}
            </div>
            <div className="pointer-events-none absolute bottom-0 h-8 w-full bg-gradient-to-t from-gray-900 to-transparent" />
            {data.response ? (
              <Button
                className="absolute right-2 top-2 h-8 w-8 border border-white/20 bg-gray-800/80 text-gray-300 hover:bg-white/20 hover:text-white"
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(true)}
                title="Read Full Report"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isSuccess && !data?.recommendation && !isPending && !error ? (
        <div className="mt-4 text-sm text-gray-400">
          Empty report for this stock 😔. Try again later! Or email me to run it
          manually. 🚀
        </div>
      ) : null}

      {isPending ? (
        <div className="mt-4 space-y-4">
          <div className="h-4 w-48 animate-pulse rounded-md bg-gray-700" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded-md bg-gray-700" />
            <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-700" />
            <div className="h-4 w-5/6 animate-pulse rounded-md bg-gray-700" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-gray-700" />
          </div>
        </div>
      ) : null}

      {!!error ? (
        <div className="mt-4 space-y-4">
          <div className="h-4 w-48 rounded-md bg-red-500" />
          <div className="text-sm text-red-500">
            Sorry something went wrong here .-., try again later
          </div>
          <p>Report to: mtosity@gmail.com. Thank you!</p>
        </div>
      ) : null}

      {data ? (
        <StockResponseModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          stock={data}
        />
      ) : null}
    </div>
  );
};
