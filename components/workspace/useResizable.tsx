"use client";

import * as React from "react";

/** Drag-to-resize for the workspace panels. Width is kept in px, clamped. */
export function useResizable(initial: number, min: number, max: number, side: "left" | "right") {
  const [width, setWidth] = React.useState(initial);
  const dragging = React.useRef(false);

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const next =
        side === "left" ? e.clientX : window.innerWidth - e.clientX;
      setWidth(Math.max(min, Math.min(max, next)));
    },
    [min, max, side]
  );

  const onPointerUp = React.useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const handleProps = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return { width, handleProps };
}

export function ResizeHandle({
  handleProps,
  className,
}: {
  handleProps: ReturnType<typeof useResizable>["handleProps"];
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={
        "group relative w-px shrink-0 cursor-col-resize bg-border transition-colors duration-fast hover:bg-brand/40 " +
        (className ?? "")
      }
      {...handleProps}
    >
      <span className="absolute inset-y-0 -left-1.5 -right-1.5 block" />
    </div>
  );
}
