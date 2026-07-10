'use client';

import React, { useState, useEffect, useRef } from 'react';
import { JWTPayload } from '@/lib/types';
import TopBar from './TopBar';
import ToastContainer, { ToastMessage } from './Toast';

interface DashboardClientProps {
  currentUser: JWTPayload;
}

interface StatusDistribution {
  status: string;
  count: number;
}

interface AssigneeDistribution {
  assignee: string;
  hours: number;
}

interface StatsData {
  statusDistribution: StatusDistribution[];
  assigneeDistribution: AssigneeDistribution[];
  completedThisWeekHours: number;
}

/* ─────────────────────────────────────────
   Animated counter hook
───────────────────────────────────────── */
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(ease * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* ─────────────────────────────────────────
   SVG Donut Chart (pure, no lib)
───────────────────────────────────────── */
interface DonutSlice {
  label: string;
  value: number;
  color: string;
  darkColor: string;
}

function DonutChart({ slices, size = 200 }: { slices: DonutSlice[]; size?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((s, sl) => s + sl.value, 0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  let cumulativeAngle = -90; // start from top

  const paths = slices.map((slice, i) => {
    const angle = (slice.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const largeArc = angle > 180 ? 1 : 0;

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const scale = hovered === i ? 1.06 : 1;
    const midAngle = startAngle + angle / 2;
    const tx = cx + (r * 0.3) * Math.cos(toRad(midAngle));
    const ty = cy + (r * 0.3) * Math.sin(toRad(midAngle));

    return (
      <path
        key={slice.label}
        d={d}
        fill={slice.color}
        className="transition-all duration-300 cursor-pointer dark:fill-current"
        style={{
          transform: `translate(${cx}px,${cy}px) scale(${scale}) translate(${-cx}px,${-cy}px)`,
          transformOrigin: `${tx}px ${ty}px`,
          opacity: animated ? 1 : 0,
          transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.2s ease`,
          fill: slice.color,
        }}
        onMouseEnter={() => setHovered(i)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  });

  const hoveredSlice = hovered !== null ? slices[hovered] : null;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="drop-shadow-lg">
        {/* background circle */}
        <circle cx={cx} cy={cy} r={r + 2} fill="transparent"
          className="stroke-slate-100 dark:stroke-slate-800" strokeWidth={2} />
        {paths}
        {/* centre hole */}
        <circle cx={cx} cy={cy} r={r * 0.52}
          className="fill-white dark:fill-slate-950" />
        {/* centre label */}
        <text x={cx} y={cy - 10} textAnchor="middle"
          className="fill-slate-800 dark:fill-slate-100"
          style={{ fontSize: 22, fontWeight: 800, fill: hoveredSlice ? hoveredSlice.color : undefined }}>
          {hoveredSlice ? hoveredSlice.value : total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle"
          style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}>
          {hoveredSlice ? hoveredSlice.label : 'Total'}
        </text>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────
   Animated bar row
───────────────────────────────────────── */
function AnimatedBar({
  label, value, max, color, gradientFrom, gradientTo, sublabel,
}: {
  label: string; value: number; max: number;
  color: string; gradientFrom: string; gradientTo: string; sublabel?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0`} style={{ background: gradientFrom }} />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
          {sublabel && (
            <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline">{sublabel}</span>
          )}
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</span>
      </div>
      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Stat card
───────────────────────────────────────── */
function StatCard({
  label, value, icon, gradientFrom, gradientTo, suffix = '',
}: {
  label: string; value: number; icon: React.ReactNode;
  gradientFrom: string; gradientTo: string; suffix?: string;
}) {
  const display = useCountUp(value);
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}>
      {/* decorative circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20"
        style={{ background: 'rgba(255,255,255,0.4)' }} />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full opacity-10"
        style={{ background: 'rgba(255,255,255,0.6)' }} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">{label}</p>
          <p className="text-4xl font-extrabold leading-none">
            {display}{suffix}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Status config
───────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { color: string; from: string; to: string }> = {
  'Backlog':     { color: '#94a3b8', from: '#94a3b8', to: '#64748b' },
  'In Progress': { color: '#3b82f6', from: '#3b82f6', to: '#6366f1' },
  'Review':      { color: '#f59e0b', from: '#f59e0b', to: '#f97316' },
  'Done':        { color: '#10b981', from: '#10b981', to: '#06b6d4' },
};

const ASSIGNEE_GRADIENTS = [
  { from: '#8b5cf6', to: '#6366f1' },
  { from: '#ec4899', to: '#f43f5e' },
  { from: '#3b82f6', to: '#06b6d4' },
  { from: '#10b981', to: '#84cc16' },
  { from: '#f59e0b', to: '#f97316' },
  { from: '#a78bfa', to: '#818cf8' },
];

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function DashboardClient({ currentUser }: DashboardClientProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [issuesFixed, setIssuesFixed] = useState(13);
  const [tasksLoaded, setTasksLoaded] = useState(37);

  const triggerToast = (text: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const handleCloseToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((res) => { if (res.ok) setStats(res.data); })
      .catch((e) => triggerToast(e.message, 'error'))
      .finally(() => setLoading(false));

    const fixed = localStorage.getItem('issuesFixed');
    const loaded = localStorage.getItem('tasksLoaded');
    if (fixed) setIssuesFixed(parseInt(fixed, 10));
    if (loaded) setTasksLoaded(parseInt(loaded, 10));
  }, []);

  /* derived */
  const totalTasks = stats?.statusDistribution.reduce((s, x) => s + x.count, 0) ?? 0;
  const doneTasks  = stats?.statusDistribution.find((s) => s.status === 'Done')?.count ?? 0;
  const inProgress = stats?.statusDistribution.find((s) => s.status === 'In Progress')?.count ?? 0;
  const teamSize   = stats?.assigneeDistribution.length ?? 0;
  const weekHours  = stats?.completedThisWeekHours ?? 0;

  const donutSlices: DonutSlice[] = (stats?.statusDistribution ?? []).map((s) => ({
    label: s.status,
    value: s.count,
    color: STATUS_CONFIG[s.status]?.color ?? '#94a3b8',
    darkColor: STATUS_CONFIG[s.status]?.color ?? '#94a3b8',
  }));

  const maxAssigneeHours = Math.max(
    ...(stats?.assigneeDistribution.map((a) => a.hours) ?? [0])
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      <TopBar
        currentUser={currentUser}
        issuesFixed={issuesFixed}
        tasksLoaded={tasksLoaded}
        triggerToast={triggerToast}
      />

      <main className="flex-1 w-full px-4 md:px-6 py-8 flex flex-col gap-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r
            from-violet-500 via-fuchsia-500 to-indigo-500
            dark:from-violet-400 dark:via-fuchsia-400 dark:to-indigo-400
            bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sprint metrics &amp; team performance at a glance
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
            <span className="text-sm font-semibold text-slate-400">Loading analytics…</span>
          </div>
        ) : stats ? (
          <>
            {/* ── Stat cards row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Tasks"
                value={totalTasks}
                gradientFrom="#7c3aed"
                gradientTo="#4f46e5"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              <StatCard
                label="Completed"
                value={doneTasks}
                gradientFrom="#059669"
                gradientTo="#0891b2"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
              <StatCard
                label="In Progress"
                value={inProgress}
                gradientFrom="#2563eb"
                gradientTo="#7c3aed"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
              <StatCard
                label="This Week"
                value={weekHours}
                suffix="h"
                gradientFrom="#db2777"
                gradientTo="#9333ea"
                icon={
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* ── Donut + Status bars ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Donut chart card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
                rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Task Distribution
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Breakdown by current status</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <DonutChart slices={donutSlices} size={200} />

                  {/* Legend */}
                  <div className="flex flex-col gap-3 flex-1 w-full">
                    {stats.statusDistribution.map((item) => {
                      const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['Backlog'];
                      const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                      return (
                        <div key={item.status} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded-sm shrink-0"
                              style={{ background: cfg.color }} />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums w-8 text-right">
                              {pct}%
                            </span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums w-6 text-right">
                              {item.count}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status bars card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
                rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Progress by Status
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Tasks in each pipeline stage</p>
                </div>
                <div className="flex flex-col gap-5 justify-center flex-1">
                  {stats.statusDistribution.map((item) => {
                    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['Backlog'];
                    return (
                      <AnimatedBar
                        key={item.status}
                        label={item.status}
                        value={item.count}
                        max={totalTasks}
                        color={cfg.color}
                        gradientFrom={cfg.from}
                        gradientTo={cfg.to}
                        sublabel={`of ${totalTasks}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Assignee section ── */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
              rounded-3xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Hours by Assignee
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Workload distribution across {teamSize} team member{teamSize !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                {stats.assigneeDistribution.map((item, idx) => {
                  const grad = ASSIGNEE_GRADIENTS[idx % ASSIGNEE_GRADIENTS.length];
                  return (
                    <div key={item.assignee}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(item.assignee)}`}
                            alt={item.assignee}
                            className="w-7 h-7 rounded-full border-2 border-slate-100 dark:border-slate-800 shrink-0"
                          />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {item.assignee}
                          </span>
                        </div>
                        <span className="text-sm font-extrabold tabular-nums"
                          style={{ color: grad.from }}>
                          {item.hours}h
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <AssigneeBar hours={item.hours} max={maxAssigneeHours} from={grad.from} to={grad.to} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Completion rate banner ── */}
            <div className="rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)' }}>
              {/* decorative blobs */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 translate-x-16 -translate-y-16"
                style={{ background: 'white' }} />
              <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10 -translate-x-10 translate-y-10"
                style={{ background: 'white' }} />

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center
                justify-between gap-6">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">
                    Sprint Completion Rate
                  </p>
                  <p className="text-5xl font-extrabold leading-none">
                    {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}
                    <span className="text-2xl font-semibold opacity-70 ml-1">%</span>
                  </p>
                  <p className="text-sm opacity-70 mt-2">
                    {doneTasks} of {totalTasks} tasks completed · {weekHours}h done this week
                  </p>
                </div>

                {/* mini progress ring */}
                <div className="shrink-0">
                  <svg width={100} height={100}>
                    <circle cx={50} cy={50} r={40} fill="none"
                      stroke="rgba(255,255,255,0.2)" strokeWidth={10} />
                    <circle cx={50} cy={50} r={40} fill="none"
                      stroke="white" strokeWidth={10}
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (totalTasks > 0 ? doneTasks / totalTasks : 0))}`}
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                    />
                    <text x={50} y={54} textAnchor="middle"
                      style={{ fontSize: 16, fontWeight: 800, fill: 'white' }}>
                      {doneTasks}/{totalTasks}
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-32 text-slate-400">
            <span className="text-sm font-semibold">No stats available</span>
          </div>
        )}
      </main>

      <ToastContainer toasts={toasts} onClose={handleCloseToast} />
    </div>
  );
}

/* Separate component so it can animate on mount */
function AssigneeBar({ hours, max, from, to }: { hours: number; max: number; from: string; to: string }) {
  const [width, setWidth] = useState(0);
  const pct = max > 0 ? (hours / max) * 100 : 0;
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div
      className="h-full rounded-full transition-all duration-700 ease-out"
      style={{ width: `${width}%`, background: `linear-gradient(90deg, ${from}, ${to})` }}
    />
  );
}
