"use client";

import * as React from "react";

const PAGE_WIDTH = 720;

/**
 * A document page that behaves like a PDF viewer: the page is scaled rather
 * than reflowed, the frame scrolls in both directions once the page is bigger
 * than the frame, and the default zoom fits the page to the frame's width.
 */
export function usePageZoom() {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const manual = React.useRef(false);

  const [scale, setScale] = React.useState(1);
  const [fit, setFit] = React.useState(1);
  const [naturalHeight, setNaturalHeight] = React.useState(0);

  /* fit-to-width, and keep fitting while the frame is resized */
  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const available = frame.clientWidth - 40;
      const next = Math.max(0.35, Math.min(1.5, available / PAGE_WIDTH));
      setFit(next);
      if (!manual.current) setScale(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  /* the page's own height, unscaled — transform does not change offsetHeight.
     Observed once: re-creating the observer on every render starves anything
     else that schedules work per frame. */
  React.useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const measure = () =>
      setNaturalHeight((current) =>
        Math.abs(current - page.offsetHeight) > 1 ? page.offsetHeight : current
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  const zoomBy = React.useCallback((delta: number) => {
    manual.current = true;
    setScale((s) => Math.max(0.35, Math.min(2, Number((s + delta).toFixed(2)))));
  }, []);

  const fitToWidth = React.useCallback(() => {
    manual.current = false;
    setScale(fit);
  }, [fit]);

  return {
    frameRef,
    pageRef,
    scale,
    isFitted: Math.abs(scale - fit) < 0.005,
    naturalHeight,
    zoomBy,
    fitToWidth,
    pageWidth: PAGE_WIDTH,
  };
}

export function PageFrame({
  frameRef,
  pageRef,
  scale,
  naturalHeight,
  pageWidth,
  children,
  className,
}: {
  frameRef: React.MutableRefObject<HTMLDivElement | null>;
  pageRef: React.MutableRefObject<HTMLDivElement | null>;
  scale: number;
  naturalHeight: number;
  pageWidth: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      ref={frameRef}
      className={
        "min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#F7F9FC] bg-[radial-gradient(#D9E1EC_1px,transparent_1px)] p-5 [background-size:16px_16px] " +
        (className ?? "")
      }
    >
      {/* the spacer carries the scaled size so the scrollbars are honest */}
      <div
        className="mx-auto"
        style={{ width: pageWidth * scale, height: naturalHeight * scale || undefined }}
      >
        <div
          ref={pageRef}
          style={{ width: pageWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
