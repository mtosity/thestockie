"use client";

import { useEffect, useRef, useState } from "react";

let mermaidModule: typeof import("mermaid") | null = null;
let initPromise: Promise<void> | null = null;
let counter = 0;

function getMermaid() {
  if (!initPromise) {
    initPromise = import("mermaid").then((mod) => {
      mermaidModule = mod;
      mod.default.initialize({
        startOnLoad: false,
        theme: "base",
        themeVariables: {
          darkMode: true,
          background: "transparent",
          mainBkg: "rgba(99,102,241,0.08)",
          // Text
          primaryTextColor: "#e2e8f0",
          secondaryTextColor: "#94a3b8",
          tertiaryTextColor: "#64748b",
          // Nodes — glass-like with accent borders
          primaryColor: "rgba(99,102,241,0.12)",
          primaryBorderColor: "rgba(129,140,248,0.4)",
          secondaryColor: "rgba(56,189,248,0.10)",
          secondaryBorderColor: "rgba(56,189,248,0.3)",
          tertiaryColor: "rgba(167,139,250,0.10)",
          tertiaryBorderColor: "rgba(167,139,250,0.3)",
          // Lines — soft accent
          lineColor: "rgba(129,140,248,0.35)",
          nodeTextColor: "#e2e8f0",
          // Fonts
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: "14px",
          // Flowchart
          clusterBkg: "rgba(99,102,241,0.06)",
          clusterBorder: "rgba(129,140,248,0.25)",
          edgeLabelBackground: "rgba(21,22,44,0.9)",
          // Sequence diagrams
          actorBkg: "rgba(99,102,241,0.12)",
          actorBorder: "rgba(129,140,248,0.4)",
          actorTextColor: "#e2e8f0",
          signalColor: "rgba(129,140,248,0.35)",
          signalTextColor: "#94a3b8",
          activationBorderColor: "rgba(129,140,248,0.4)",
          activationBkgColor: "rgba(99,102,241,0.12)",
          sequenceNumberColor: "#e2e8f0",
          loopTextColor: "#94a3b8",
          noteBkgColor: "rgba(56,189,248,0.08)",
          noteBorderColor: "rgba(56,189,248,0.25)",
          noteTextColor: "#e2e8f0",
          // Pie — modern multi-hue palette
          pie1: "#6366f1",
          pie2: "#38bdf8",
          pie3: "#a78bfa",
          pie4: "#34d399",
          pie5: "#f472b6",
          pie6: "#fb923c",
          pie7: "#22d3ee",
          pie8: "#facc15",
          pieStrokeColor: "rgba(21,22,44,0.8)",
          pieSectionTextColor: "#f8fafc",
          pieTitleTextColor: "#e2e8f0",
          pieStrokeWidth: "2px",
          pieLegendTextColor: "#94a3b8",
          pieOuterStrokeColor: "transparent",
          // Gantt
          gridColor: "rgba(129,140,248,0.15)",
          doneTaskBkgColor: "rgba(99,102,241,0.25)",
          activeTaskBkgColor: "rgba(56,189,248,0.25)",
          taskBkgColor: "rgba(99,102,241,0.12)",
          taskBorderColor: "rgba(129,140,248,0.3)",
          taskTextColor: "#e2e8f0",
          todayLineColor: "#6366f1",
          // Git graph
          git0: "#6366f1",
          git1: "#38bdf8",
          git2: "#a78bfa",
          git3: "#34d399",
          gitBranchLabel0: "#e2e8f0",
          // XY chart
          xyChart: {
            backgroundColor: "transparent",
            width: 800,
            height: 500,
            xAxis: {
              labelFontSize: 14,
              titleFontSize: 16,
              labelColor: "#e2e8f0",
              titleColor: "#e2e8f0",
              tickColor: "#94a3b8",
            },
            yAxis: {
              labelFontSize: 14,
              titleFontSize: 16,
              labelColor: "#e2e8f0",
              titleColor: "#e2e8f0",
              tickColor: "#94a3b8",
            },
            chartConfig: {
              titleFontSize: 18,
              titleColor: "#e2e8f0",
            },
            plotColorPalette:
              "#6366f1,#38bdf8,#a78bfa,#34d399,#f472b6,#fb923c",
          },
          // Quadrant
          quadrant1Fill: "rgba(99,102,241,0.08)",
          quadrant2Fill: "rgba(56,189,248,0.06)",
          quadrant3Fill: "rgba(167,139,250,0.06)",
          quadrant4Fill: "rgba(52,211,153,0.06)",
          quadrantPointFill: "#6366f1",
          quadrantExternalBorderStrokeFill: "rgba(129,140,248,0.3)",
          quadrantInternalBorderStrokeFill: "rgba(129,140,248,0.15)",
          quadrantTitleFill: "#e2e8f0",
          quadrantPointTextFill: "#e2e8f0",
          quadrantXAxisTextFill: "#94a3b8",
          quadrantYAxisTextFill: "#94a3b8",
        },
      });
    });
  }
  return initPromise;
}

export function MermaidDiagram({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);
  const idRef = useRef(`mmd-${counter++}`);

  useEffect(() => {
    let cancelled = false;

    getMermaid().then(async () => {
      if (cancelled || !mermaidModule) return;
      try {
        const { svg: rawSvg } = await mermaidModule.default.render(
          idRef.current,
          content.trim(),
        );
        if (!cancelled) {
          // Strip mermaid's background rect so the chart is transparent
          const cleaned = rawSvg.replace(
            /<rect[^>]*class="[^"]*background[^"]*"[^>]*\/?>(<\/rect>)?/gi,
            "",
          );
          setSvg(cleaned);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          // Clean up any error container mermaid may have left
          document.getElementById("d" + idRef.current)?.remove();
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [content]);

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-md bg-white/10 p-3 text-sm text-red-400">
        {content}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-2 flex justify-center">
        <div className="h-24 w-full animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-container my-2 flex w-full justify-center overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
