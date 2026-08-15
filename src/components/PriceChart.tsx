import { useState, useMemo } from 'react';
import type { PriceHistoryBySupermarket } from '@/types/database';

interface PriceChartProps {
  data: PriceHistoryBySupermarket[];
}

interface HoverInfo {
  x: number;
  y: number;
  date: string;
  entries: { supermarketName: string; color: string; price: number }[];
}

const CHART_W = 800;
const CHART_H = 320;
const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPrice(price: number): string {
  return price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function PriceChart({ data }: PriceChartProps) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(data.map((d) => d.supermarket.id))
  );

  // Collect all data points from visible series
  const allPoints = useMemo(() => {
    const points: { date: string; price: number; smId: string }[] = [];
    for (const series of data) {
      if (!visibleSeries.has(series.supermarket.id)) continue;
      for (const h of series.history) {
        points.push({ date: h.recorded_at, price: h.price, smId: series.supermarket.id });
      }
    }
    return points;
  }, [data, visibleSeries]);

  // Compute scales
  const { minPrice, maxPrice, minDate, maxDate, dateRange } = useMemo(() => {
    if (allPoints.length === 0) {
      return { minPrice: 0, maxPrice: 1, minDate: 0, maxDate: 1, dateRange: 1 };
    }
    const prices = allPoints.map((p) => p.price);
    const dates = allPoints.map((p) => new Date(p.date).getTime());
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const padding = (maxP - minP) * 0.1 || 0.5;
    return {
      minPrice: Math.max(0, minP - padding),
      maxPrice: maxP + padding,
      minDate: Math.min(...dates),
      maxDate: Math.max(...dates),
      dateRange: Math.max(...dates) - Math.min(...dates) || 1,
    };
  }, [allPoints]);

  const xScale = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return PAD.left + ((t - minDate) / dateRange) * PLOT_W;
  };

  const yScale = (price: number) => {
    return PAD.top + PLOT_H - ((price - minPrice) / (maxPrice - minPrice)) * PLOT_H;
  };

  // Build SVG path for each series
  const seriesPaths = useMemo(() => {
    return data
      .filter((d) => visibleSeries.has(d.supermarket.id))
      .map((series) => {
        const sorted = [...series.history].sort(
          (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        );
        const path = sorted
          .map((h, i) => {
            const x = xScale(h.recorded_at);
            const y = yScale(h.price);
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(' ');
        const points = sorted.map((h) => ({
          x: xScale(h.recorded_at),
          y: yScale(h.price),
          date: h.recorded_at,
          price: h.price,
        }));
        return {
          supermarket: series.supermarket,
          path,
          points,
        };
      });
  }, [data, visibleSeries, minPrice, maxPrice, minDate, maxDate, dateRange]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: { y: number; label: string }[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + ((maxPrice - minPrice) * i) / steps;
      ticks.push({ y: yScale(price), label: formatPrice(price) });
    }
    return ticks;
  }, [minPrice, maxPrice, minDate, maxDate, dateRange]);

  // X-axis ticks (approx 6 evenly spaced)
  const xTicks = useMemo(() => {
    if (dateRange < 1) return [];
    const ticks: { x: number; label: string }[] = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const t = minDate + (dateRange * i) / steps;
      const x = PAD.left + (PLOT_W * i) / steps;
      ticks.push({ x, label: formatDateShort(new Date(t).toISOString()) });
    }
    return ticks;
  }, [minDate, maxDate, dateRange]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = CHART_W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    if (mouseX < PAD.left || mouseX > PAD.left + PLOT_W) {
      setHover(null);
      return;
    }

    // Find the closest date
    const t = minDate + ((mouseX - PAD.left) / PLOT_W) * dateRange;
    const targetDate = new Date(t).toISOString();

    // For each visible series, find the point closest to this date
    const entries: { supermarketName: string; color: string; price: number }[] = [];
    let closestX = mouseX;
    let closestY = PAD.top;

    for (const series of data) {
      if (!visibleSeries.has(series.supermarket.id)) continue;
      const sorted = [...series.history].sort(
        (a, b) => Math.abs(new Date(a.recorded_at).getTime() - t) - Math.abs(new Date(b.recorded_at).getTime() - t)
      );
      const closest = sorted[0];
      if (closest) {
        entries.push({
          supermarketName: series.supermarket.name,
          color: series.supermarket.logo_color,
          price: closest.price,
        });
        closestX = xScale(closest.recorded_at);
        closestY = yScale(closest.price);
      }
    }

    setHover({
      x: closestX,
      y: closestY,
      date: targetDate,
      entries: entries.sort((a, b) => a.price - b.price),
    });
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = CHART_W / rect.width;
    const touch = e.touches[0];
    const mouseX = (touch.clientX - rect.left) * scaleX;

    if (mouseX < PAD.left || mouseX > PAD.left + PLOT_W) {
      setHover(null);
      return;
    }

    const t = minDate + ((mouseX - PAD.left) / PLOT_W) * dateRange;
    const targetDate = new Date(t).toISOString();

    const entries: { supermarketName: string; color: string; price: number }[] = [];
    let closestX = mouseX;
    let closestY = PAD.top;

    for (const series of data) {
      if (!visibleSeries.has(series.supermarket.id)) continue;
      const sorted = [...series.history].sort(
        (a, b) => Math.abs(new Date(a.recorded_at).getTime() - t) - Math.abs(new Date(b.recorded_at).getTime() - t)
      );
      const closest = sorted[0];
      if (closest) {
        entries.push({
          supermarketName: series.supermarket.name,
          color: series.supermarket.logo_color,
          price: closest.price,
        });
        closestX = xScale(closest.recorded_at);
        closestY = yScale(closest.price);
      }
    }

    setHover({
      x: closestX,
      y: closestY,
      date: targetDate,
      entries: entries.sort((a, b) => a.price - b.price),
    });
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    handleTouchMove(e);
  };

  const toggleSeries = (smId: string) => {
    setVisibleSeries((prev) => {
      const next = new Set(prev);
      if (next.has(smId)) next.delete(smId);
      else next.add(smId);
      return next;
    });
  };

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Sin datos de historial para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend / toggle */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {data.map((series) => {
          const active = visibleSeries.has(series.supermarket.id);
          return (
            <button
              key={series.supermarket.id}
              onClick={() => toggleSeries(series.supermarket.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-white ring-1 ring-slate-200 shadow-sm'
                  : 'bg-slate-50 text-slate-400 ring-1 ring-transparent'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-opacity ${active ? '' : 'opacity-30'}`}
                style={{ backgroundColor: series.supermarket.logo_color }}
              />
              {series.supermarket.name}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full"
          style={{ display: 'block' }}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setHover(null)}
          onMouseLeave={() => setHover(null)}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines (horizontal) */}
          {yTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line
                x1={PAD.left}
                y1={tick.y}
                x2={PAD.left + PLOT_W}
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px]"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={`x-${i}`}
              x={tick.x}
              y={CHART_H - PAD.bottom + 20}
              textAnchor="middle"
              className="fill-slate-400 text-[11px]"
            >
              {tick.label}
            </text>
          ))}

          {/* Lines */}
          {seriesPaths.map((sp) => (
            <g key={sp.supermarket.id}>
              <path
                d={sp.path}
                fill="none"
                stroke={sp.supermarket.logo_color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Hover line + points */}
          {hover && (
            <g>
              <line
                x1={hover.x}
                y1={PAD.top}
                x2={hover.x}
                y2={PAD.top + PLOT_H}
                stroke="#cbd5e1"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              {hover.entries.map((entry, i) => {
                const y = yScale(entry.price);
                return (
                  <circle
                    key={i}
                    cx={hover.x}
                    cy={y}
                    r={5}
                    fill="white"
                    stroke={entry.color}
                    strokeWidth={2.5}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hover && hover.entries.length > 0 && (
          <div
            className="pointer-events-none absolute z-10 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
            style={{
              left: `${(hover.x / CHART_W) * 100}%`,
              top: 0,
              transform: `translateX(${hover.x > CHART_W * 0.6 ? '-110%' : '10%'})`,
            }}
          >
            <p className="mb-1.5 text-xs font-medium text-slate-500">
              {formatDateFull(hover.date)}
            </p>
            <div className="space-y-1">
              {hover.entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-600">{entry.supermarketName}</span>
                  <span className="ml-auto font-semibold text-slate-800">
                    {formatPrice(entry.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
