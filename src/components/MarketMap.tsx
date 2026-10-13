import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MarketData, Stall } from '../../shared/types';
import { categoryColor } from '../../shared/categories';

const VB_W = 1000;
const VB_H = 620;

interface Props {
  data: MarketData;
  highlightIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  locateNonce: number;
  filteredCategoryId: string | null;
  badgeIds: Set<string>;
}

interface Transform { x: number; y: number; k: number }

const MIN_K = 0.5;
const MAX_K = 6;

function clampK(k: number): number {
  return Math.min(MAX_K, Math.max(MIN_K, k));
}

export default function MarketMap({
  data, highlightIds, selectedId, onSelect, locateNonce, filteredCategoryId, badgeIds,
}: Props): React.ReactElement {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastMid = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);

  const stalls = data.stalls;
  const bounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of stalls) {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    }
    if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: VB_W, maxY: VB_H };
    return { minX, minY, maxX, maxY };
  }, [stalls]);

  const fitToScreen = useCallback(() => {
    const pad = 40;
    const w = bounds.maxX - bounds.minX + pad * 2;
    const h = bounds.maxY - bounds.minY + pad * 2;
    const k = clampK(Math.min(VB_W / w, VB_H / h));
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    setTf({ x: VB_W / 2 - cx * k, y: VB_H / 2 - cy * k, k });
  }, [bounds]);

  useEffect(() => {
    fitToScreen();
    // Fit only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locate: center on a stall when asked.
  useEffect(() => {
    if (!locateNonce) return;
    if (!selectedId) return;
    const stall = stalls.find((s) => s.id === selectedId);
    if (!stall) return;
    const k = Math.max(tf.k, 1.8);
    setTf({
      x: VB_W / 2 - (stall.x + stall.width / 2) * k,
      y: VB_H / 2 - (stall.y + stall.height / 2) * k,
      k,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateNonce]);

  const zoomBy = useCallback((factor: number) => {
    setTf((prev) => {
      const k = clampK(prev.k * factor);
      const ratio = k / prev.k;
      return {
        k,
        x: VB_W / 2 - (VB_W / 2 - prev.x) * ratio,
        y: VB_H / 2 - (VB_H / 2 - prev.y) * ratio,
      };
    });
  }, []);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VB_W,
      y: ((clientY - rect.top) / rect.height) * VB_H,
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 1) {
      dragging.current = true;
      lastMid.current = null;
      lastDist.current = null;
    } else if (pointers.current.size === 2) {
      dragging.current = false;
      const pts = [...pointers.current.values()];
      lastMid.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      lastDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prevPt = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      if (lastDist.current && lastDist.current > 0) {
        const factor = dist / lastDist.current;
        const svgMid = toSvg(mid.x, mid.y);
        setTf((prev) => {
          const k = clampK(prev.k * factor);
          const ratio = k / prev.k;
          return {
            k,
            x: svgMid.x - (svgMid.x - prev.x) * ratio,
            y: svgMid.y - (svgMid.y - prev.y) * ratio,
          };
        });
      }
      if (lastMid.current) {
        const svgMid = toSvg(mid.x, mid.y);
        const svgLast = toSvg(lastMid.current.x, lastMid.current.y);
        const dmx = svgMid.x - svgLast.x;
        const dmy = svgMid.y - svgLast.y;
        setTf((prev) => ({ ...prev, x: prev.x + dmx, y: prev.y + dmy }));
      }
      lastDist.current = dist;
      lastMid.current = mid;
      moved.current = true;
      return;
    }

    if (dragging.current) {
      const dx = e.clientX - prevPt.x;
      const dy = e.clientY - prevPt.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
      const svgPt = toSvg(e.clientX, e.clientY);
      const svgPrev = toSvg(e.clientX - dx, e.clientY - dy);
      setTf((prev) => ({
        ...prev,
        x: prev.x + (svgPt.x - svgPrev.x),
        y: prev.y + (svgPt.y - svgPrev.y),
      }));
    }
  }, [toSvg]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      lastDist.current = null;
      lastMid.current = null;
    }
    if (pointers.current.size === 0) dragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const p = toSvg(e.clientX, e.clientY);
    setTf((prev) => {
      const k = clampK(prev.k * factor);
      const ratio = k / prev.k;
      return {
        k,
        x: p.x - (p.x - prev.x) * ratio,
        y: p.y - (p.y - prev.y) * ratio,
      };
    });
  }, [toSvg]);

  const handleStallClick = useCallback((s: Stall) => {
    if (moved.current) return;
    onSelect(s.id);
  }, [onSelect]);

  const renderStall = (s: Stall) => {
    const vendor = s.vendorId ? data.vendors.find((v) => v.id === s.vendorId) ?? null : null;
    const catId = vendor?.categoryId ?? null;
    const color = catId ? categoryColor(catId) : '#9aa79b';
    const isSel = s.id === selectedId;
    const isHi = highlightIds.has(s.id);
    const isVacant = s.status === 'vacant';
    const isClosed = s.status === 'closed';
    const isFeatured = s.featuredLevel !== 'free';
    const isPremium = s.featuredLevel === 'premium';
    const dimmed = filteredCategoryId !== null && catId !== filteredCategoryId;

    let fill = '#ffffff';
    if (isVacant || isClosed) fill = '#e4e7e4';
    else if (dimmed) fill = '#f3f4f3';
    else if (catId) fill = '#ffffff';

    let stroke = '#c9d2ca';
    let strokeWidth = 1;
    if (isFeatured) { stroke = '#b8860b'; strokeWidth = 2; }
    if (s.featuredLevel === 'promoted') stroke = '#c2410c';
    if (isPremium) { stroke = '#8b5cf6'; strokeWidth = 2.5; }
    if (isHi) { stroke = '#f59e0b'; strokeWidth = 3; }
    if (isSel) { stroke = '#166534'; strokeWidth = 4; }

    const labelColor = isVacant || isClosed ? '#7b857c' : '#1f2a20';

    return (
      <g
        key={s.id}
        className={`stall${isSel ? ' stall--selected' : ''}${isHi ? ' stall--result' : ''}`}
        transform={`translate(${s.x} ${s.y})${s.rotation ? ` rotate(${s.rotation} ${s.width / 2} ${s.height / 2})` : ''}`}
        onClick={() => handleStallClick(s)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStallClick(s); } }}
        tabIndex={0}
        role="button"
        aria-label={`Stall ${s.stallNumber}${vendor ? `, ${vendor.businessName}` : isVacant ? ', vacant' : ''}`}
        aria-pressed={isSel}
      >
        <rect
          width={s.width}
          height={s.height}
          rx={6}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={dimmed && !isSel && !isHi ? 0.45 : 1}
        />
        {/* category colour bar */}
        {!isVacant && catId && (
          <rect x={4} y={4} width={s.width - 8} height={5} rx={2.5} fill={color} opacity={dimmed ? 0.3 : 0.9} />
        )}
        <text
          x={s.width / 2}
          y={s.height / 2 + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={15}
          fontWeight={isSel || isHi ? 700 : 600}
          fill={labelColor}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {s.stallNumber}
        </text>
        {s.saturdaySpecial && badgeIds.has(s.id) && (
          <g transform={`translate(${s.width - 14} 2)`} aria-hidden="true">
            <circle cx={7} cy={7} r={7} fill="#dc2626" />
            <text x={7} y={10.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">%</text>
          </g>
        )}
        {isPremium && (
          <g transform={`translate(2 2)`} aria-hidden="true">
            <circle cx={6} cy={6} r={6} fill="#8b5cf6" />
            <text x={6} y={9} textAnchor="middle" fontSize={8} fontWeight={700} fill="#fff">★</text>
          </g>
        )}
        {isVacant && (
          <text x={s.width / 2} y={s.height - 8} textAnchor="middle" fontSize={9} fill="#7b857c" style={{ pointerEvents: 'none' }}>
            VACANT
          </text>
        )}
        {isClosed && (
          <text x={s.width / 2} y={s.height - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill="#b91c1c" style={{ pointerEvents: 'none' }}>
            CLOSED
          </text>
        )}
      </g>
    );
  };

  const streets = useMemo(() => data.stalls.map((s) => s.streetName).filter((v, i, a) => a.indexOf(v) === i), [data.stalls]);

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div className="map-toolbar" role="group" aria-label="Map controls">
        <button type="button" className="map-btn" onClick={() => zoomBy(1.3)} aria-label="Zoom in">＋</button>
        <button type="button" className="map-btn" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">－</button>
        <button type="button" className="map-btn map-btn--wide" onClick={fitToScreen}>⛶ Fit</button>
        <button type="button" className="map-btn map-btn--wide" onClick={() => setTf({ x: 0, y: 0, k: 1 })}>↺ Reset</button>
      </div>
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        role="img"
        aria-label="Interactive market layout map"
      >
        <g transform={`translate(${tf.x} ${tf.y}) scale(${tf.k})`}>
          <rect x={-200} y={-200} width={VB_W + 400} height={VB_H + 400} fill="#eef1ec" />
          {/* ground plot */}
          <rect x={20} y={20} width={VB_W - 40} height={VB_H - 40} fill="#e3e8df" stroke="#cbd5c9" strokeWidth={2} rx={10} />
          {/* internal streets drawn between stall rows */}
          <rect x={20} y={162} width={VB_W - 40} height={26} fill="#d7d2c4" />
          <text x={VB_W - 40} y={180} textAnchor="end" fontSize={13} fill="#6b6f63" fontWeight={600}>Olienhoutlaan</text>
          <rect x={466} y={20} width={26} height={VB_H - 40} fill="#d7d2c4" />
          <text x={479} y={330} textAnchor="middle" fontSize={13} fill="#6b6f63" fontWeight={600} transform="rotate(-90 479 330)">Wilgerlaan</text>
          <rect x={20} y={342} width={VB_W - 40} height={26} fill="#d7d2c4" />
          <text x={40} y={360} fontSize={13} fill="#6b6f63" fontWeight={600}>Olienhoutlaan</text>
          {/* boundary street labels */}
          <text x={VB_W / 2} y={14} textAnchor="middle" fontSize={14} fill="#575b50" fontWeight={700}>Moreleta St</text>
          {/* entrance markers */}
          <rect x={452} y={20} width={14} height={26} fill="#eef1ec" />
          <text x={459} y={60} textAnchor="middle" fontSize={10} fill="#575b50">Gate</text>
          {streets.length > 0 && (
            <text x={40} y={VB_H - 12} fontSize={11} fill="#8a8f81">
              Demo layout — street names from reference: {streets.join(' · ')}
            </text>
          )}
          {stalls.map(renderStall)}
        </g>
      </svg>
    </div>
  );
}
