'use client';

import type { GraphNode, GraphEdge } from '@/features/concentration/api/concentration';

// A data-driven, layered dependency graph (DORA Art. 29): critical functions → providers →
// sub-providers, left to right. Edges are drawn between the layers; an unconfirmed nth-party edge is
// dashed. Deliberately layout-simple (columnar, no physics) so it's deterministic + dependency-free.
const COLS: Record<GraphNode['type'], number> = { function: 0, provider: 1, subprovider: 2 };
const COL_X = [90, 400, 710];
const ROW_H = 46;
const PAD_Y = 28;

export function ConcentrationGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  // group nodes into their three columns, preserving order
  const byCol: GraphNode[][] = [[], [], []];
  for (const n of nodes) byCol[COLS[n.type]]?.push(n);

  const pos = new Map<string, { x: number; y: number }>();
  byCol.forEach((col, ci) => {
    col.forEach((n, ri) => pos.set(n.id, { x: COL_X[ci], y: PAD_Y + ri * ROW_H }));
  });

  const rows = Math.max(1, ...byCol.map((c) => c.length));
  const height = PAD_Y * 2 + (rows - 1) * ROW_H;
  const width = 800;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 520 }} role="img" aria-label="Concentration dependency graph">
        {/* edges first (under nodes) */}
        {edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const unconfirmed = e.kind === 'sub_processes_via' && e.confirmed === false;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={unconfirmed ? 'stroke-amber-400' : 'stroke-border'}
              strokeWidth={1.5}
              strokeDasharray={unconfirmed ? '4 3' : undefined}
            />
          );
        })}
        {/* nodes */}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isProvider = n.type === 'provider';
          const r = isProvider ? 6 + Math.min(8, (n.concentrationScore ?? 0)) : 5;
          const fill =
            n.type === 'function'
              ? 'fill-background stroke-foreground'
              : n.type === 'provider'
                ? 'fill-primary stroke-primary'
                : 'fill-muted stroke-muted-foreground';
          const anchor = n.type === 'subprovider' ? 'end' : n.type === 'function' ? 'start' : 'middle';
          const tx = n.type === 'subprovider' ? p.x - r - 6 : n.type === 'function' ? p.x + r + 6 : p.x;
          const ty = n.type === 'provider' ? p.y - r - 5 : p.y + 3;
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={r} className={fill} strokeWidth={1.5} />
              <text x={tx} y={ty} textAnchor={anchor} className="fill-foreground text-[10px]">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-1">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-foreground" /> Function</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Provider (size ∝ concentration)</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted border border-muted-foreground" /> Sub-provider</span>
        <span className="inline-flex items-center gap-1"><span className="h-0 w-4 border-t border-dashed border-amber-400" /> Unconfirmed edge</span>
      </div>
    </div>
  );
}
