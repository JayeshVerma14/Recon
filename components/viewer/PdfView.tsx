"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Columns2,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  MoreVertical,
  PanelLeft,
  Printer,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from "@/components/element";
import { cn } from "@/lib/utils";

export const PAGE_WIDTH = 720;
const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const PAGE_GAP = 16;
const FRAME_PAD = 20;
const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 4, 5];

const clamp = (n: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, n));

export type ZoomMode = "fit-width" | "fit-page" | "custom";
export type PageSize = { width: number; height: number };

export interface PdfView {
  frameRef: React.MutableRefObject<HTMLDivElement | null>;
  /** Attach the scrolling frame with this, not the ref: a view that mounts
      hidden gets no observer until its frame actually exists. */
  attachFrame: (el: HTMLDivElement | null) => void;
  pagesRef: React.MutableRefObject<HTMLDivElement | null>;
  registerPage: (index: number, el: HTMLDivElement | null) => void;
  measurePage: (index: number, size: PageSize) => void;
  pageSizes: Record<number, PageSize>;

  pageCount: number;
  page: number;
  goToPage: (page: number) => void;
  stepPage: (delta: number) => void;
  onScroll: () => void;

  scale: number;
  zoomMode: ZoomMode;
  setZoom: (scale: number) => void;
  zoomBy: (steps: number) => void;
  fitWidth: () => void;
  fitPage: () => void;
  refit: () => void;

  rotation: number;
  rotate: (quarters: number) => void;
  /** 1 = one page at a time, 2 = a spread. */
  spread: 1 | 2;
  setSpread: (n: 1 | 2) => void;

  thumbnails: boolean;
  setThumbnails: (open: boolean) => void;
  full: boolean;
  setFull: (full: boolean) => void;

  /** Reserved margin beside the page — notes live here. */
  gutter: number;
  /** True while the page is on its side, where a right-hand margin means nothing. */
  sideways: boolean;
  frameWidth: number;
}

/**
 * The mechanics a PDF reader needs: zoom with real fit modes, rotation,
 * one-page and spread layouts, and a page number that follows the scroll
 * rather than being set by a pager.
 */
export function usePdfView({
  pageCount,
  gutter = 0,
}: {
  pageCount: number;
  gutter?: number;
}): PdfView {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const pagesRef = React.useRef<HTMLDivElement | null>(null);
  const pageEls = React.useRef<Record<number, HTMLDivElement | null>>({});
  const scaleRef = React.useRef(1);
  const modeRef = React.useRef<ZoomMode>("fit-width");
  const programmatic = React.useRef(0);
  /* the page a step is counted from, so two quick clicks step twice */
  const pageRef = React.useRef(1);

  const [scale, setScaleState] = React.useState(1);
  const [zoomMode, setZoomMode] = React.useState<ZoomMode>("fit-width");
  const [rotation, setRotation] = React.useState(0);
  const [spread, setSpread] = React.useState<1 | 2>(1);
  const [page, setPage] = React.useState(1);
  const [thumbnails, setThumbnails] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const [pageSizes, setPageSizes] = React.useState<Record<number, PageSize>>({});
  const [frameWidth, setFrameWidth] = React.useState(0);
  const [frameNode, setFrameNode] = React.useState<HTMLDivElement | null>(null);

  const attachFrame = React.useCallback((el: HTMLDivElement | null) => {
    frameRef.current = el;
    setFrameNode(el);
  }, []);

  const sideways = rotation % 180 !== 0;

  const applyScale = React.useCallback((next: number) => {
    scaleRef.current = next;
    setScaleState(next);
  }, []);

  const registerPage = React.useCallback((index: number, el: HTMLDivElement | null) => {
    pageEls.current[index] = el;
  }, []);

  const measurePage = React.useCallback((index: number, size: PageSize) => {
    setPageSizes((current) => {
      const known = current[index];
      if (known && Math.abs(known.height - size.height) < 1) return current;
      return { ...current, [index]: size };
    });
  }, []);

  /* the biggest page decides the fit, so turning a page never rescales the view */
  const natural = React.useMemo(() => {
    const heights = Object.values(pageSizes).map((s) => s.height);
    const height = heights.length ? Math.max(...heights) : PAGE_WIDTH * 1.4;
    return { width: PAGE_WIDTH, height };
  }, [pageSizes]);

  /** One page's footprint on screen, rotation included. */
  const box = React.useMemo(
    () =>
      sideways
        ? { width: natural.height, height: natural.width }
        : { width: natural.width, height: natural.height },
    [natural, sideways]
  );

  const fitScales = React.useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return null;
    const across = spread === 2 ? box.width * 2 + PAGE_GAP : box.width;
    const usableWidth = frame.clientWidth - FRAME_PAD * 2 - gutter;
    const usableHeight = frame.clientHeight - FRAME_PAD * 2;
    return {
      width: clamp(usableWidth / across),
      page: clamp(Math.min(usableWidth / across, usableHeight / box.height)),
    };
  }, [box, spread, gutter]);

  const refit = React.useCallback(() => {
    const frame = frameRef.current;
    const fits = fitScales();
    /* a pane the layout has hidden measures zero — fitting to that would lock
       in the minimum zoom and still be there when it comes back */
    if (!frame || !fits || frame.clientWidth === 0) return;
    setFrameWidth(frame.clientWidth);
    if (modeRef.current === "fit-width") applyScale(fits.width);
    else if (modeRef.current === "fit-page") applyScale(fits.page);
  }, [fitScales, applyScale]);

  React.useEffect(() => {
    if (!frameNode) return;
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(frameNode);
    return () => observer.disconnect();
  }, [frameNode, refit]);

  const setMode = React.useCallback((mode: ZoomMode) => {
    modeRef.current = mode;
    setZoomMode(mode);
  }, []);

  const setZoom = React.useCallback(
    (next: number) => {
      setMode("custom");
      applyScale(clamp(next));
    },
    [applyScale, setMode]
  );

  /** Steps through the same ladder a browser viewer uses, not a fixed delta. */
  const zoomBy = React.useCallback(
    (steps: number) => {
      const current = scaleRef.current;
      const index = ZOOM_STEPS.findIndex((s) => s > current + 0.001);
      const at = steps > 0 ? index : (index === -1 ? ZOOM_STEPS.length : index) - 1;
      const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, at))];
      setZoom(next ?? current);
    },
    [setZoom]
  );

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

      setMode("custom");
      applyScale(target);
      requestAnimationFrame(() => {
        frame.scrollLeft = pointX * ratio - offsetX;
        frame.scrollTop = pointY * ratio - offsetY;
      });
    },
    [applyScale, setMode]
  );

  /* trackpad pinch arrives as ctrl+wheel; touch pinch as two moving fingers */
  React.useEffect(() => {
    if (!frameNode) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      /* exponential so a trackpad's small deltas glide and a mouse wheel's
         large ones still land on a sensible step */
      zoomAround(scaleRef.current * Math.exp(-e.deltaY * 0.002), e.clientX, e.clientY);
    };

    let startDistance = 0;
    let startScale = 1;
    const distance = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );

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

    frameNode.addEventListener("wheel", onWheel, { passive: false });
    frameNode.addEventListener("touchstart", onTouchStart, { passive: true });
    frameNode.addEventListener("touchmove", onTouchMove, { passive: false });
    frameNode.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      frameNode.removeEventListener("wheel", onWheel);
      frameNode.removeEventListener("touchstart", onTouchStart);
      frameNode.removeEventListener("touchmove", onTouchMove);
      frameNode.removeEventListener("touchend", onTouchEnd);
    };
  }, [frameNode, zoomAround]);

  const fitWidth = React.useCallback(() => {
    setMode("fit-width");
    const fits = fitScales();
    if (fits) applyScale(fits.width);
  }, [fitScales, applyScale, setMode]);

  const fitPage = React.useCallback(() => {
    setMode("fit-page");
    const fits = fitScales();
    if (fits) applyScale(fits.page);
  }, [fitScales, applyScale, setMode]);

  /* rotating or spreading changes the footprint, so a fit has to be redone */
  React.useLayoutEffect(() => {
    refit();
  }, [rotation, spread, full, refit]);

  const rotate = React.useCallback((quarters: number) => {
    setRotation((r) => (r + quarters * 90 + 360) % 360);
  }, []);

  const goToPage = React.useCallback(
    (next: number) => {
      const target = Math.max(1, Math.min(pageCount, next));
      pageRef.current = target;
      setPage(target);
      const frame = frameRef.current;
      const el = pageEls.current[target - 1];
      if (!frame || !el) return;

      /* measured against the frame, not an offset parent: full screen changes
         which ancestor is positioned, and offsetTop would change with it */
      const top = Math.max(
        0,
        frame.scrollTop +
          el.getBoundingClientRect().top -
          frame.getBoundingClientRect().top -
          FRAME_PAD
      );

      /* the scroll listener must not fight the jump it did not ask for */
      programmatic.current = Date.now() + 400;
      const from = frame.scrollTop;
      frame.scrollTo({ top, behavior: "smooth" });
      /* smooth scrolling needs frames; where it gets none, land anyway */
      window.setTimeout(() => {
        if (Math.abs(frame.scrollTop - from) < 2 && Math.abs(top - from) > 2) {
          frame.scrollTop = top;
        }
      }, 320);
    },
    [pageCount]
  );

  const stepPage = React.useCallback(
    (delta: number) => goToPage(pageRef.current + delta * spread),
    [goToPage, spread]
  );

  /** Whichever page covers the top of the frame is the page you are on. */
  const onScroll = React.useCallback(() => {
    if (Date.now() < programmatic.current) return;
    const frame = frameRef.current;
    if (!frame) return;
    const line = frame.getBoundingClientRect().top + FRAME_PAD + 1;
    let current = 1;
    for (let i = 0; i < pageCount; i++) {
      const el = pageEls.current[i];
      if (el && el.getBoundingClientRect().top <= line) current = i + 1;
    }
    pageRef.current = current;
    setPage((p) => (p === current ? p : current));
  }, [pageCount]);

  return {
    frameRef,
    attachFrame,
    pagesRef,
    registerPage,
    measurePage,
    pageSizes,
    pageCount,
    page,
    goToPage,
    stepPage,
    onScroll,
    scale,
    zoomMode,
    setZoom,
    zoomBy,
    fitWidth,
    fitPage,
    refit,
    rotation,
    rotate,
    spread,
    setSpread,
    thumbnails,
    setThumbnails,
    full,
    setFull,
    gutter,
    sideways,
    frameWidth,
  };
}

/* -------------------------------------------------------------------------- */
/*                                   toolbar                                  */
/* -------------------------------------------------------------------------- */

/** What a surface can actually honour. A control it cannot is not offered. */
export type PdfCapability = "thumbnails" | "spread" | "rotate" | "full";

/**
 * The control set a reader expects above a document, in the order a viewer puts
 * them: what you are looking at on the left, where you are and how big in the
 * middle, what you can do with it on the right.
 *
 * The bar is the application's ink navy rather than a browser's neutral grey —
 * a document surface should still read as part of this product.
 */
export function PdfToolbar({
  view,
  fileName,
  showName = true,
  onDownload,
  onPrint,
  can = ["thumbnails", "spread", "rotate", "full"],
  className,
  leading,
  children,
}: {
  view: PdfView;
  fileName: string;
  /** Off where the surface already names the document above the bar. */
  showName?: boolean;
  onDownload?: () => void;
  onPrint?: () => void;
  /** Omit what this surface does not implement — a dead toggle is worse than none. */
  can?: PdfCapability[];
  className?: string;
  /** Controls belonging to this view, placed after the name. */
  leading?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const allows = (c: PdfCapability) => can.includes(c);
  const [draft, setDraft] = React.useState(String(view.page));
  React.useEffect(() => setDraft(String(view.page)), [view.page]);

  const commit = () => {
    const next = Number(draft);
    if (Number.isFinite(next) && next >= 1) view.goToPage(Math.round(next));
    else setDraft(String(view.page));
  };

  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center gap-1 bg-[#16273F] px-2 text-white",
        className
      )}
    >
      {allows("thumbnails") && (
        <PdfBarButton
          label="Thumbnails"
          active={view.thumbnails}
          onClick={() => view.setThumbnails(!view.thumbnails)}
        >
          <PanelLeft />
        </PdfBarButton>
      )}

      {showName && (
        <span className="ml-1 hidden min-w-0 max-w-[18rem] items-center gap-1.5 truncate text-body-sm text-white/90 lg:flex">
          <FileText className="h-3.5 w-3.5 shrink-0 text-white/50" />
          <span className="truncate">{fileName}</span>
        </span>
      )}

      {leading}

      {/* -------------------------- where you are, how big ------------------------ */}
      <div className="mx-auto flex items-center gap-0.5">
        <PdfBarButton
          label="Previous page"
          onClick={() => view.stepPage(-1)}
          disabled={view.page <= 1}
        >
          <ChevronUp />
        </PdfBarButton>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setDraft(String(view.page));
          }}
          aria-label="Page number"
          className="tabular h-7 w-9 rounded-md border border-white/15 bg-white/10 text-center font-mono text-body-sm text-white outline-none focus:border-brand/70"
        />
        <span className="tabular px-1 font-mono text-body-sm text-white/55">
          / {view.pageCount}
        </span>
        <PdfBarButton
          label="Next page"
          onClick={() => view.stepPage(1)}
          disabled={view.page >= view.pageCount}
        >
          <ChevronDown />
        </PdfBarButton>

        <span className="mx-1.5 h-5 w-px bg-white/15" />

        <PdfBarButton label="Zoom out" onClick={() => view.zoomBy(-1)}>
          <ZoomOut />
        </PdfBarButton>
        <ZoomMenu view={view} />
        <PdfBarButton label="Zoom in" onClick={() => view.zoomBy(1)}>
          <ZoomIn />
        </PdfBarButton>
      </div>

      {/* ------------------------- what you can do with it ----------------------- */}
      {allows("spread") && (
        <PdfBarButton
          label={view.spread === 2 ? "Single page view" : "Two page view"}
          active={view.spread === 2}
          onClick={() => view.setSpread(view.spread === 2 ? 1 : 2)}
        >
          <Columns2 />
        </PdfBarButton>
      )}
      {allows("rotate") && (
        <PdfBarButton label="Rotate clockwise" onClick={() => view.rotate(1)}>
          <RotateCw />
        </PdfBarButton>
      )}
      {onDownload && (
        <PdfBarButton label="Download" onClick={onDownload}>
          <Download />
        </PdfBarButton>
      )}
      {onPrint && (
        <PdfBarButton label="Print" onClick={onPrint}>
          <Printer />
        </PdfBarButton>
      )}
      {allows("full") && (
        <PdfBarButton
          label={view.full ? "Exit full screen · Esc" : "Full screen"}
          active={view.full}
          onClick={() => view.setFull(!view.full)}
        >
          {view.full ? <Minimize2 /> : <Maximize2 />}
        </PdfBarButton>
      )}

      {children}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition-colors duration-fast hover:bg-white/10 hover:text-white [&_svg]:size-4"
          >
            <MoreVertical />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Zoom</DropdownMenuLabel>
          <DropdownMenuItem onSelect={view.fitWidth}>
            Fit width
            {view.zoomMode === "fit-width" && <Mark />}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={view.fitPage}>
            Fit page
            {view.zoomMode === "fit-page" && <Mark />}
          </DropdownMenuItem>

          {(allows("spread") || allows("rotate")) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Page display</DropdownMenuLabel>
            </>
          )}
          {allows("spread") && (
            <>
              <DropdownMenuItem onSelect={() => view.setSpread(1)}>
                <FileText />
                Single page
                {view.spread === 1 && <Mark />}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => view.setSpread(2)}>
                <Columns2 />
                Two page view
                {view.spread === 2 && <Mark />}
              </DropdownMenuItem>
            </>
          )}
          {allows("rotate") && (
            <>
              <DropdownMenuItem onSelect={() => view.rotate(-1)}>
                <RotateCcw />
                Rotate counterclockwise
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => view.rotate(1)}>
                <RotateCw />
                Rotate clockwise
              </DropdownMenuItem>
            </>
          )}
          {allows("thumbnails") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => view.setThumbnails(!view.thumbnails)}>
                <PanelLeft />
                {view.thumbnails ? "Hide thumbnails" : "Show thumbnails"}
              </DropdownMenuItem>
            </>
          )}
          {onPrint && (
            <DropdownMenuItem onSelect={onPrint}>
              <Printer />
              Print
            </DropdownMenuItem>
          )}
          {onDownload && (
            <DropdownMenuItem onSelect={onDownload}>
              <Download />
              Download
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Mark() {
  return <span className="ml-auto text-meta text-brand">●</span>;
}

function ZoomMenu({ view }: { view: PdfView }) {
  const label =
    view.zoomMode === "fit-width"
      ? "Fit width"
      : view.zoomMode === "fit-page"
        ? "Fit page"
        : `${Math.round(view.scale * 100)}%`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="tabular inline-flex h-7 min-w-[5.25rem] items-center justify-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 font-mono text-body-sm text-white transition-colors duration-fast hover:bg-white/20"
        >
          {label}
          <ChevronDown className="h-3 w-3 text-white/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem onSelect={view.fitWidth}>
          Fit width
          {view.zoomMode === "fit-width" && <Mark />}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={view.fitPage}>
          Fit page
          {view.zoomMode === "fit-page" && <Mark />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((step) => (
          <DropdownMenuItem key={step} onSelect={() => view.setZoom(step)}>
            <span className="tabular font-mono">{Math.round(step * 100)}%</span>
            {view.zoomMode === "custom" && Math.abs(view.scale - step) < 0.005 && <Mark />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PdfBarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-fast [&_svg]:size-4",
          active
            ? "bg-[rgba(70,100,220,0.32)] text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white",
          disabled && "pointer-events-none opacity-35"
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   canvas                                   */
/* -------------------------------------------------------------------------- */

/**
 * The scrolling page area. Pages are laid out one or two across, scaled rather
 * than reflowed, and rotated in place — so what scrolls past is the document,
 * not a web page pretending to be one.
 */
export function PdfCanvas({
  view,
  pages,
  margin,
  marginWidth = 0,
  marginGap = 20,
  className,
}: {
  view: PdfView;
  pages: React.ReactNode[];
  /** Notes column, laid out beside the pages and scrolled with them. */
  margin?: React.ReactNode;
  marginWidth?: number;
  marginGap?: number;
  className?: string;
}) {
  const rows: number[][] = [];
  for (let i = 0; i < pages.length; i += view.spread) {
    rows.push(pages.map((_, index) => index).slice(i, i + view.spread));
  }

  const showMargin = Boolean(margin) && !view.sideways;
  const reserved = showMargin ? marginWidth + marginGap : 0;
  const widest = Math.max(
    ...rows.map((row) => {
      const boxes = row.map((i) => pageBox(view, i));
      return boxes.reduce((sum, b) => sum + b.width, 0) + (row.length - 1) * PAGE_GAP;
    }),
    0
  );
  const lead = Math.max(
    0,
    Math.min(reserved, view.frameWidth - FRAME_PAD * 2 - widest - reserved)
  );

  return (
    <div
      ref={view.attachFrame}
      onScroll={view.onScroll}
      style={{ touchAction: "pan-x pan-y", padding: FRAME_PAD }}
      className={cn("min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#48566E]", className)}
    >
      <div className="mx-auto flex items-start" style={{ width: lead + widest + reserved }}>
        {lead > 0 && <div className="shrink-0" style={{ width: lead }} aria-hidden />}

        <div ref={view.pagesRef} className="flex flex-col" style={{ gap: PAGE_GAP }}>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-start" style={{ gap: PAGE_GAP }}>
              {row.map((index) => (
                <PageSlot key={index} view={view} index={index}>
                  {pages[index]}
                </PageSlot>
              ))}
            </div>
          ))}
        </div>

        {showMargin && (
          <div
            className="relative shrink-0"
            style={{ width: marginWidth, marginLeft: marginGap }}
          >
            {margin}
          </div>
        )}
      </div>
    </div>
  );
}

function pageBox(view: PdfView, index: number) {
  const size = view.pageSizes[index] ?? { width: PAGE_WIDTH, height: PAGE_WIDTH * 1.4 };
  const w = (view.sideways ? size.height : size.width) * view.scale;
  const h = (view.sideways ? size.width : size.height) * view.scale;
  return { width: w, height: h, natural: size };
}

/** One page: a fixed-width sheet, scaled and rotated inside a box that reserves the room it takes. */
function PageSlot({
  view,
  index,
  children,
}: {
  view: PdfView;
  index: number;
  children: React.ReactNode;
}) {
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const { measurePage } = view;

  React.useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const measure = () =>
      measurePage(index, { width: PAGE_WIDTH, height: sheet.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [index, measurePage]);

  const box = pageBox(view, index);

  return (
    <div
      ref={(el) => view.registerPage(index, el)}
      data-page={index + 1}
      className="relative shrink-0"
      style={{ width: box.width, height: box.height }}
    >
      <div
        ref={sheetRef}
        style={{
          width: PAGE_WIDTH,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) rotate(${view.rotation}deg) scale(${view.scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 thumbnails                                 */
/* -------------------------------------------------------------------------- */

const THUMB_WIDTH = 116;

/** The page rail: the whole document at a glance, current page marked. */
export function PdfThumbnails({
  view,
  pages,
  labels,
}: {
  view: PdfView;
  pages: React.ReactNode[];
  labels?: string[];
}) {
  return (
    <div className="flex w-[164px] shrink-0 flex-col overflow-y-auto scrollbar-thin bg-[#1E3050] p-3">
      <ul className="flex flex-col gap-3">
        {pages.map((node, index) => {
          const size = view.pageSizes[index];
          const ratio = THUMB_WIDTH / PAGE_WIDTH;
          const current = view.page === index + 1;
          return (
            <li key={index} className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => view.goToPage(index + 1)}
                aria-label={`Page ${index + 1}${labels?.[index] ? ` — ${labels[index]}` : ""}`}
                aria-current={current}
                className={cn(
                  "relative overflow-hidden rounded-sm bg-white transition-shadow duration-fast",
                  current
                    ? "ring-2 ring-brand ring-offset-2 ring-offset-[#1E3050]"
                    : "opacity-80 hover:opacity-100"
                )}
                style={{
                  width: THUMB_WIDTH,
                  height: (size?.height ?? PAGE_WIDTH * 1.4) * ratio,
                }}
              >
                {/* the real page, shrunk — a thumbnail that lies is worse than none */}
                <div
                  aria-hidden
                  className="pointer-events-none origin-top-left"
                  style={{ width: PAGE_WIDTH, transform: `scale(${ratio})` }}
                >
                  {node}
                </div>
              </button>
              <span
                className={cn(
                  "tabular font-mono text-[10px]",
                  current ? "text-white" : "text-white/50"
                )}
              >
                {index + 1}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
