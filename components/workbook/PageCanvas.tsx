"use client";

import * as React from "react";

const PAGE_WIDTH = 720;
const MIN_SCALE = 0.35;
const MAX_SCALE = 2.5;

const clamp = (n: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, n));

/**
 * A document page that behaves like a PDF viewer: the page is scaled rather
 * than reflowed, the frame scrolls in both directions once the page is bigger
 * than the frame, and the default zoom fits the page to the frame's width.
 */
export function usePageZoom({ gutter = 0 }: { gutter?: number } = {}) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const pageRef = React.useRef<HTMLDivElement | null>(null);
  const manual = React.useRef(false);
  const scaleRef = React.useRef(1);

  const [scale, setScaleState] = React.useState(1);
  const [fit, setFit] = React.useState(1);
  const [naturalHeight, setNaturalHeight] = React.useState(0);
  const [frameWidth, setFrameWidth] = React.useState(0);

  const setScale = React.useCallback((next: number) => {
    scaleRef.current = next;
    setScaleState(next);
  }, []);

  /**
   * Re-measure the frame and re-fit, unless the reader has chosen a zoom.
   *
   * Fit means the largest page that still leaves the note margin free — page
   * size is never given up to centre the page. Centring is taken only from
   * width nothing else wants: zoom out, or a frame wide enough that the page
   * has hit maximum zoom, and the page slides to the middle on its own.
   */
  const refit = React.useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setFrameWidth(frame.clientWidth);
    const next = clamp((frame.clientWidth - 40 - gutter) / PAGE_WIDTH);
    setFit(next);
    if (!manual.current) setScale(next);
  }, [gutter, setScale]);

  /* fit-to-width, and keep fitting while the frame is resized */
  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [refit]);

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

  /** Zoom while keeping the point under the fingers or cursor where it is. */
  const zoomAround = React.useCallback(
    (next: number, clientX: number, clientY: number) => {
      const frame = frameRef.current;
      const target = clamp(next);
      const previous = scaleRef.current;
      if (!frame || Math.abs(target - previous) < 0.001) return;

      const rect = frame.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;
      const pointX = frame.scrollLeft + offsetX;
      const pointY = frame.scrollTop + offsetY;
      const ratio = target / previous;

      manual.current = true;
      setScale(target);

      requestAnimationFrame(() => {
        frame.scrollLeft = pointX * ratio - offsetX;
        frame.scrollTop = pointY * ratio - offsetY;
      });
    },
    [setScale]
  );

  /* trackpad pinch arrives as ctrl+wheel; touch pinch as two moving fingers */
  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      /* exponential so a trackpad's small deltas glide and a mouse wheel's
         large ones still land on a sensible step */
      zoomAround(scaleRef.current * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
    };

    let startDistance = 0;
    let startScale = 1;

    const distance = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      startDistance = distance(e.touches);
      startScale = scaleRef.current;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !startDistance) return;
      e.preventDefault();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomAround((startScale * distance(e.touches)) / startDistance, midX, midY);
    };

    const onTouchEnd = () => {
      startDistance = 0;
    };

    frame.addEventListener("wheel", onWheel, { passive: false });
    frame.addEventListener("touchstart", onTouchStart, { passive: true });
    frame.addEventListener("touchmove", onTouchMove, { passive: false });
    frame.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("touchstart", onTouchStart);
      frame.removeEventListener("touchmove", onTouchMove);
      frame.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoomAround]);

  const zoomBy = React.useCallback(
    (delta: number) => {
      const frame = frameRef.current;
      manual.current = true;
      if (!frame) return setScale(clamp(scaleRef.current + delta));
      const rect = frame.getBoundingClientRect();
      zoomAround(scaleRef.current + delta, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [setScale, zoomAround]
  );

  const fitToWidth = React.useCallback(() => {
    manual.current = false;
    setScale(fit);
  }, [fit, setScale]);

  return {
    frameRef,
    pageRef,
    scale,
    isFitted: Math.abs(scale - fit) < 0.005,
    naturalHeight,
    frameWidth,
    zoomBy,
    fitToWidth,
    refit,
    pageWidth: PAGE_WIDTH,
  };
}

export function PageFrame({
  frameRef,
  pageRef,
  scale,
  naturalHeight,
  pageWidth,
  frameWidth = 0,
  gutter,
  gutterWidth = 0,
  gutterGap = 20,
  children,
  className,
}: {
  frameRef: React.MutableRefObject<HTMLDivElement | null>;
  pageRef: React.MutableRefObject<HTMLDivElement | null>;
  scale: number;
  naturalHeight: number;
  pageWidth: number;
  /** The frame's own width, so the page can be balanced inside it. */
  frameWidth?: number;
  /** Margin content — laid out beside the page and scrolled with it. */
  gutter?: React.ReactNode;
  gutterWidth?: number;
  gutterGap?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const pageHeight = naturalHeight * scale || undefined;
  const scaled = pageWidth * scale;
  const margin = gutter ? gutterWidth + gutterGap : 0;
  /* blank space to the left of the page, mirroring the notes on the right —
     given up a pixel at a time as the page is zoomed past the frame */
  const lead = Math.max(0, Math.min(margin, frameWidth - 40 - scaled - margin));
  return (
    <div
      ref={frameRef}
      /* the browser must not claim the pinch gesture for page zoom */
      style={{ touchAction: "pan-x pan-y" }}
      className={
        "min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#F7F9FC] bg-[radial-gradient(#D9E1EC_1px,transparent_1px)] p-5 [background-size:16px_16px] " +
        (className ?? "")
      }
    >
      <div className="mx-auto flex items-start" style={{ width: lead + scaled + margin }}>
        {lead > 0 && <div className="shrink-0" style={{ width: lead }} aria-hidden />}

        {/* the spacer carries the scaled size so the scrollbars are honest */}
        <div className="shrink-0" style={{ width: scaled, height: pageHeight }}>
          <div
            ref={pageRef}
            style={{ width: pageWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            {children}
          </div>
        </div>

        {/* notes keep their own size: zoom scales the page, not the handwriting */}
        {gutter && (
          <div
            className="relative shrink-0"
            style={{ width: gutterWidth, marginLeft: gutterGap, minHeight: pageHeight }}
          >
            {gutter}
          </div>
        )}
      </div>
    </div>
  );
}

/** Drag handle between the document and the margin. */
export function SplitHandle({
  onResize,
  className,
}: {
  onResize: (deltaX: number) => void;
  className?: string;
}) {
  const start = React.useRef<number | null>(null);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      onPointerDown={(e) => {
        e.preventDefault();
        start.current = e.clientX;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(e) => {
        if (start.current === null) return;
        onResize(e.clientX - start.current);
        start.current = e.clientX;
      }}
      onPointerUp={(e) => {
        start.current = null;
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* pointer already released */
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }}
      className={
        "group relative flex w-3 shrink-0 cursor-col-resize items-center justify-center " +
        (className ?? "")
      }
    >
      <span className="flex h-11 w-3 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-colors duration-fast group-hover:border-brand/50">
        <span className="grid grid-cols-2 gap-[2px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="block h-[2px] w-[2px] rounded-full bg-muted-foreground/60 transition-colors duration-fast group-hover:bg-brand"
            />
          ))}
        </span>
      </span>
    </div>
  );
}
