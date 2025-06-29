"use client";
import React from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { api } from "~/trpc/react";
import { useSymbol } from "~/hooks/use-symbol";
import { useGenPrompt } from "~/hooks/use-gen-prompt";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
          code: ({ children }) => {
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
  const { mutate, isPending, data, error } = api.post.create.useMutation();
  const prompt = useGenPrompt();

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
      <div className="flex gap-8">
        <div>
          <h3 className="text-lg font-bold">
            LLM Stock recommendations - Powered by OpenAI
          </h3>
          <p>Input data: live quote, fundamental metrics, news summary</p>
        </div>

        <Button
          className="self-end border border-white bg-slate-900 text-white hover:bg-slate-600"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            mutate({
              symbol,
              prompt,
            })
          }
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

      {data && data.id === symbol ? (
        <div className="mt-4">
          <p className="text-sm text-gray-400">
            {`Generated at: ${Intl.DateTimeFormat().format(data.createdAt)} (every week)`}
          </p>
          <div className="relative mt-2">
            <div className="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 max-h-[500px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-800/50 p-4 py-8">
              {data.response ? (
                <MarkdownWithColor content={data.response} />
              ) : null}
            </div>
            <div className="pointer-events-none absolute bottom-0 h-8 w-full bg-gradient-to-t from-gray-900 to-transparent" />
          </div>
        </div>
      ) : null}

      {!data && !isPending && !error ? (
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
    </div>
  );
};
