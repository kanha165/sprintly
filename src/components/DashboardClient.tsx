'use client';

import React, { useState, useEffect, useRef } from 'react';
import { JWTPayload } from '@/lib/types';
import TopBar from './TopBar';
import ToastContainer, { ToastMessage } from './Toast';

interface DashboardClientProps { currentUser: JWTPayload; }
interface StatusDist { status: string; count: number; }
interface AssigneeDist { assignee: string; hours: number; }
interface StatsData {
  statusDistribution: StatusDist[];
  assigneeDistribution: AssigneeDist[];
  completedThisWeekHours: number;
}

/* ── Animated count-up ── */
function useCountUp(target: number, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) return;
    const t0 = performance.now();
    const raf = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setV(Math.round(e * target));
      if (p < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target]);
  return v;
}

/* ── Status colours ── */
const S: Record<string, { hex: string; from: string; to: string; glow: string }> = {
  'Backlog':     { hex: '#94a3b8', from: '#94a3b8', to: '#64748b', glow: '148,163,184' },
  'In Progress': { hex: '#3b82f6', from: '#3b82f6', to: '#6366f1', glow: '59,130,246' },
  'Review':      { hex: '#f59e0b', from: '#f59e0b', to: '#f97316', glow: '245,158,11' },
  'Done':        { hex: '#10b981', from: '#10b981', to: '#06b6d4', glow: '16,185,129' },
};

const AG = [
  { from: '#8b5cf6', to: '#6366f1', glow: '139,92,246' },
  { from: '#ec4899', to: '#f43f5e', glow: '236,72,153' },
  { from: '#3b82f6', to: '#06b6d4', glow: '59,130,246' },
  { from: '#10b981', to: '#84cc16', glow: '16,185,129' },
  { from: '#f59e0b', to: '#f97316', glow: '245,158,11' },
  { from: '#a78bfa', to: '#818cf8', glow: '167,139,250' },
];

/* ── Donut (SVG pie, no lib) ── */
function Donut({ slices, size = 220 }: { slices: { label: string; value: number; color: string }[]; size?: number }) {
  const [hov, setHov] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);

  const R = 80, cx = size / 2, cy = size / 2;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let angle = -90;

  const paths = slices.map((sl, i) => {
    const deg = (sl.value / total) * 360;
    const a1 = angle, a2 = angle + deg;
    angle += deg;
    const r2d = (d: number) => (d * Math.PI) / 180;
    const x1 = cx + R * Math.cos(r2d(a1)), y1 = cy + R * Math.sin(r2d(a1));
    const x2 = cx + R * Math.cos(r2d(a2)), y2 = cy + R * Math.sin(r2d(a2));
    const large = deg > 180 ? 1 : 0;
    const d = `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`;
    const mid = a1 + deg / 2;
    const ox = Math.cos(r2d(mid)) * 6, oy = Math.sin(r2d(mid)) * 6;
    return (
      <path key={sl.label} d={d}
        fill={sl.color}
        style={{
          transform: hov === i ? `translate(${ox}px,${oy}px)` : 'none',
          opacity: ready ? 1 : 0,
          transition: `opacity .5s ease ${i * .1}s, transform .2s ease, filter .2s ease`,
          filter: hov === i ? `drop-shadow(0 0 8px ${sl.color}88)` : 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setHov(i)}
        onMouseLeave={() => setHov(null)}
      />
    );
  });

  const hs = hov !== null ? slices[hov] : null;

  return (
    <svg width={size} height={size} className="overflow-visible">
      {paths}
      {/* hole */}
      <circle cx={cx} cy={cy} r={R * 0.5}
        className="fill-white dark:fill-[#161b27]" />
      {/* centre text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontWeight={800} fontSize={24}
        fill={hs ? hs.color : '#6366f1'}>
        {hs ? hs.value : total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontWeight={600} fontSize={11}
        fill="#94a3b8">
        {hs ? hs.label : 'Total'}
      </text>
    </svg>
  );
}

/* ── Animated bar ── */
function Bar({ pct, from, to, delay = 0 }: { pct: number; from: string; to: string; delay?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 120 + delay); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700/50">
      <div className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${w}%`, background: `linear-gradient(90deg,${from},${to})` }} />
    </div>
  );
}

/* ── Stat card with glassmorphism ── */
function StatCard({ label, value, suffix = '', icon, from, to, glow }:
  { label: string; value: number; suffix?: string; icon: React.ReactNode; from: string; to: string; glow: string }) {
  const n = useCountUp(value);
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white"
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 8px 32px -4px rgba(${glow},.35)`,
      }}>
      {/* glass shimmer */}
      <div className="absolute inset-0 opacity-10"
        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,.4) 0%,transparent 60%)' }} />
      <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-[.12] bg-white" />
      <div className="absolute -right-3 -bottom-8 w-20 h-20 rounded-full opacity-[.08] bg-white" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-75 mb-2">{label}</p>
          <p className="text-4xl font-black leading-none tabular-nums">
            {n}<span className="text-xl font-semibold opacity-70 ml-0.5">{suffix}</span>
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Ring ── */
function Ring({ pct, size = 100 }: { pct: number; size?: number }) {
  const r = 38, c = 2 * Math.PI * r;
  const [dash, setDash] = useState(c);
  useEffect(() => { const t = setTimeout(() => setDash(c * (1 - pct / 100)), 200); return () => clearTimeout(t); }, [pct]);
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="white" strokeWidth={10}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={dash}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)' }} />
      <text x={size/2} y={size/2+6} textAnchor="middle" fill="white" fontWeight={800} fontSize={15}>
        {pct}%
      </text>
    </svg>
  );
}

/* ════════════════════════════════════════
   Main component
════════════════════════════════════════ */
export default function DashboardClient({ currentUser }: DashboardClientProps) {
  const [stats, setStats]   = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts]  = useState<ToastMessage[]>([]);
  const [issuesFixed, setIssuesFixed]   = useState(13);
  const [tasksLoaded, setTasksLoaded]   = useState(37);

  const toast = (text: string, type: 'success' | 'error' | 'info') =>
    setToasts(p => [...p, { id: Math.random().toString(36).slice(2), text, type }]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json())
      .then(r => { if (r.ok) setStats(r.data); })
      .catch(e => toast(e.message, 'error'))
      .finally(() => setLoading(false));
    const f = localStorage.getItem('issuesFixed');
    const l = localStorage.getItem('tasksLoaded');
    if (f) setIssuesFixed(+f);
    if (l) setTasksLoaded(+l);
  }, []);

  const total    = stats?.statusDistribution.reduce((s, x) => s + x.count, 0) ?? 0;
  const done     = stats?.statusDistribution.find(s => s.status === 'Done')?.count ?? 0;
  const inProg   = stats?.statusDistribution.find(s => s.status === 'In Progress')?.count ?? 0;
  const week     = stats?.completedThisWeekHours ?? 0;
  const team     = stats?.assigneeDistribution.length ?? 0;
  const donePct  = total > 0 ? Math.round((done / total) * 100) : 0;
  const maxHours = Math.max(...(stats?.assigneeDistribution.map(a => a.hours) ?? [0]));

  const donutSlices = (stats?.statusDistribution ?? []).map(s => ({
    label: s.status, value: s.count, color: S[s.status]?.hex ?? '#94a3b8',
  }));

  /* glass card class reused */
  const glass = 'bg-white/80 dark:bg-[#161b27]/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/40 rounded-2xl shadow-sm';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d0f14] flex flex-col transition-colors duration-200">
      <TopBar currentUser={currentUser} issuesFixed={issuesFixed} tasksLoaded={tasksLoaded} triggerToast={toast} />

      <main className="flex-1 w-full px-4 md:px-8 py-8 flex flex-col gap-8">

        {/* ── Header ── */}
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight
              bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500
              dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400
              bg-clip-text text-transparent">
              Analytics
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Sprint metrics &amp; team performance
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full
            bg-violet-100 dark:bg-violet-500/15
            text-violet-700 dark:text-violet-300
            border border-violet-200 dark:border-violet-500/30">
            Live data
          </span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
            <span className="text-sm font-semibold text-slate-400">Loading analytics…</span>
          </div>
        ) : stats ? (<>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Total Tasks"  value={total}  from="#7c3aed" to="#4f46e5" glow="124,58,237"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>} />
            <StatCard label="Completed"   value={done}   from="#059669" to="#0891b2" glow="5,150,105"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>} />
            <StatCard label="In Progress" value={inProg} from="#2563eb" to="#7c3aed" glow="37,99,235"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>} />
            <StatCard label="This Week"   value={week} suffix="h" from="#db2777" to="#9333ea" glow="219,39,119"
              icon={<svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
          </div>

          {/* ── Donut + Status bars ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Donut */}
            <div className={`${glass} p-6 flex flex-col gap-5`}>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Task Distribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">Hover a slice to inspect</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="shrink-0"><Donut slices={donutSlices} size={200} /></div>
                <div className="flex flex-col gap-3 flex-1 w-full">
                  {stats.statusDistribution.map(item => {
                    const cfg = S[item.status] ?? S['Backlog'];
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <div key={item.status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.hex }} />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{item.status}</span>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-8 text-right">{pct}%</span>
                            <span className="text-sm font-extrabold text-slate-800 dark:text-white w-5 text-right">{item.count}</span>
                          </div>
                        </div>
                        <Bar pct={pct} from={cfg.from} to={cfg.to} delay={50} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Completion ring banner */}
            <div className="rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-between gap-6"
              style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 45%,#2563eb 100%)', boxShadow: '0 8px 40px -8px rgba(124,58,237,.5)' }}>
              {/* blobs */}
              <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-10 bg-white" />
              <div className="absolute -bottom-16 -left-8  w-44 h-44 rounded-full opacity-10 bg-white" />
              <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full opacity-5 bg-white -translate-x-1/2 -translate-y-1/2" />

              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Sprint Completion</p>
                <p className="text-6xl font-black leading-none">{donePct}<span className="text-2xl font-semibold opacity-60 ml-1">%</span></p>
                <p className="text-sm opacity-60 mt-2">{done} of {total} tasks · {week}h this week</p>
              </div>

              <div className="relative flex items-end justify-between gap-4 flex-wrap">
                {/* mini stat pills */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Done',    val: done,   color: '#10b981' },
                    { label: 'Active',  val: inProg, color: '#3b82f6' },
                    { label: 'Team',    val: team,   color: '#a78bfa' },
                  ].map(p => (
                    <div key={p.label} className="px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                      <p className="text-[10px] font-bold uppercase opacity-70">{p.label}</p>
                      <p className="text-lg font-black leading-none" style={{ color: p.color }}>{p.val}</p>
                    </div>
                  ))}
                </div>
                <Ring pct={donePct} size={90} />
              </div>
            </div>
          </div>

          {/* ── Assignee workload ── */}
          <div className={`${glass} p-6`}>
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">Team Workload</h3>
                <p className="text-xs text-slate-400 mt-0.5">Hours per assignee</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full
                bg-slate-100 dark:bg-slate-700/60
                text-slate-600 dark:text-slate-300
                border border-slate-200 dark:border-slate-600/50">
                {team} members
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
              {stats.assigneeDistribution.map((a, i) => {
                const g = AG[i % AG.length];
                const pct = maxHours > 0 ? Math.round((a.hours / maxHours) * 100) : 0;
                return (
                  <div key={a.assignee}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(a.assignee)}`}
                          alt={a.assignee}
                          className="w-8 h-8 rounded-full border-2 shrink-0"
                          style={{ borderColor: g.from + '66' }}
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{a.assignee}</span>
                      </div>
                      <span className="text-sm font-extrabold tabular-nums" style={{ color: g.from }}>{a.hours}h</span>
                    </div>
                    <Bar pct={pct} from={g.from} to={g.to} delay={i * 60} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Status breakdown table ── */}
          <div className={`${glass} p-6`}>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Pipeline Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/40">
                    {['Status', 'Tasks', 'Share', 'Progress'].map(h => (
                      <th key={h} className="pb-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pr-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                  {stats.statusDistribution.map(item => {
                    const cfg = S[item.status] ?? S['Backlog'];
                    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                    return (
                      <tr key={item.status} className="group">
                        <td className="py-3 pr-6">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.hex }} />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{item.status}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-6 font-extrabold text-slate-800 dark:text-white tabular-nums">{item.count}</td>
                        <td className="py-3 pr-6">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                            style={{ background: cfg.hex + '22', color: cfg.hex }}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-3 w-40">
                          <Bar pct={pct} from={cfg.from} to={cfg.to} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </>) : (
          <div className="flex-1 flex items-center justify-center py-40 text-slate-400">
            <span className="text-sm font-semibold">No stats available</span>
          </div>
        )}
      </main>

      <ToastContainer toasts={toasts} onClose={id => setToasts(p => p.filter(t => t.id !== id))} />
    </div>
  );
}
