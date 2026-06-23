"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Defers mounting a panel (and therefore its data fetching) so the homepage
 * can load the priority widgets first — main chart, news, market indices,
 * company profile — then fill in the rest without a single network burst.
 *
 * A deferred panel mounts when EITHER:
 *  - it scrolls within ~300px of the viewport (IntersectionObserver), or
 *  - the browser goes idle, at which point a shared scheduler releases a few
 *    panels per idle tick so off-screen widgets trickle in after the critical
 *    content rather than all at once.
 */

type Release = () => void;

// Shared idle drip across all deferred panels.
const queue: Release[] = [];
let draining = false;

const onIdle: (cb: () => void) => number =
  typeof window !== "undefined" && "requestIdleCallback" in window
    ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
    : (cb) => window.setTimeout(cb, 200);

function drain() {
  if (draining) return;
  draining = true;
  const step = () => {
    if (queue.length === 0) {
      draining = false;
      return;
    }
    // Release a small batch per idle tick so requests stay staggered.
    queue.splice(0, 2).forEach((fn) => fn());
    onIdle(step);
  };
  onIdle(step);
}

function enqueue(fn: Release) {
  queue.push(fn);
  drain();
}

function dequeue(fn: Release) {
  const i = queue.indexOf(fn);
  if (i >= 0) queue.splice(i, 1);
}

export function DeferredMount({
  children,
  eager = false,
}: {
  children: ReactNode;
  eager?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(eager);

  useEffect(() => {
    if (eager || show) return;
    const el = ref.current;
    const reveal = () => setShow(true);

    let io: IntersectionObserver | undefined;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) reveal();
        },
        { rootMargin: "300px" },
      );
      io.observe(el);
    }

    enqueue(reveal);

    return () => {
      io?.disconnect();
      dequeue(reveal);
    };
  }, [eager, show]);

  return (
    <div ref={ref} className="h-full w-full">
      {show ? (
        children
      ) : (
        <div className="h-full w-full animate-pulse bg-foreground/[0.02]" />
      )}
    </div>
  );
}
