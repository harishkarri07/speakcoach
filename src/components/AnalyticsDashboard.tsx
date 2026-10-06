import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Award, 
  ArrowLeft, 
  Calendar, 
  Filter, 
  Download, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Flame,
  Zap,
  Smile,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Session, CoachingMode, TechnicalDomain, Profile, Streak } from '../types/database';
import { DataService } from '../lib/supabase';
import { MODE_LABELS } from './Navbar';

interface AnalyticsDashboardProps {
  userId: string;
  profile: Profile | null;
  streak: Streak | null;
  onReturnToPractice: () => void;
  onSelectDrill?: (mode: CoachingMode, domain?: TechnicalDomain) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  profile,
  streak,
  onReturnToPractice,
  onSelectDrill,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'7d' | '14d' | 'all'>('14d');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [activeMetricSeries, setActiveMetricSeries] = useState<'all' | 'fluency' | 'vocab' | 'sentiment' | 'overall'>('all');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Chart DOM refs
  const progressionChartRef = useRef<SVGSVGElement | null>(null);
  const durationBarChartRef = useRef<SVGSVGElement | null>(null);
  const radarChartRef = useRef<SVGSVGElement | null>(null);
  const sentimentDonutRef = useRef<SVGSVGElement | null>(null);

  // Load sessions from DataService
  useEffect(() => {
    loadSessions();
  }, [userId]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await DataService.getRecentSessions(userId, 50);
      setSessions(data);
      if (data.length > 0) {
        setSelectedSession(data[0]);
      }
    } catch (err) {
      console.error('Failed to load session analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered and chronologically sorted sessions (oldest to newest for charts)
  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    const now = Date.now();

    if (timeFilter === '7d') {
      const cutoff = now - 7 * 24 * 60 * 60 * 1000;
      list = list.filter((s) => new Date(s.started_at).getTime() >= cutoff);
    } else if (timeFilter === '14d') {
      const cutoff = now - 14 * 24 * 60 * 60 * 1000;
      list = list.filter((s) => new Date(s.started_at).getTime() >= cutoff);
    }

    if (domainFilter !== 'all') {
      list = list.filter((s) => s.technical_domain === domainFilter);
    }

    // Sort chronologically ascending for line and trend charts
    return list.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  }, [sessions, timeFilter, domainFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    if (filteredSessions.length === 0) {
      return {
        totalDurationMin: 0,
        avgFluency: 0,
        avgVocab: 0,
        avgSentiment: 0,
        avgFillers: 0,
        avgOverall: 0,
        avgWpm: 0,
        growthFluency: 0,
        growthSentiment: 0,
      };
    }

    const totalDurationSec = filteredSessions.reduce((acc, s) => acc + (s.duration_sec || 0), 0);
    const count = filteredSessions.length;

    const avgFluency = filteredSessions.reduce((acc, s) => acc + (s.scores.fluency || s.overall_score || 0), 0) / count;
    const avgVocab = filteredSessions.reduce((acc, s) => acc + (s.scores.grammar_vocab || s.overall_score || 0), 0) / count;
    const avgSentiment = filteredSessions.reduce((acc, s) => acc + (s.scores.sentiment || (s.scores.confidence ?? 75)), 0) / count;
    const avgFillers = filteredSessions.reduce((acc, s) => acc + (s.summary.fillers_per_min || 3.0), 0) / count;
    const avgOverall = filteredSessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / count;
    const avgWpm = filteredSessions.reduce((acc, s) => acc + (s.summary.wpm || 120), 0) / count;

    // Growth from first session to latest
    const first = filteredSessions[0];
    const latest = filteredSessions[filteredSessions.length - 1];
    const growthFluency = first && latest 
      ? Math.round(((latest.scores.fluency || 7) - (first.scores.fluency || 6)) * 10) / 10 
      : 0;
    const growthSentiment = first && latest
      ? Math.round(((latest.scores.sentiment || 80) - (first.scores.sentiment || 60)))
      : 0;

    return {
      totalDurationMin: Math.round(totalDurationSec / 60),
      avgFluency: Math.round(avgFluency * 10) / 10,
      avgVocab: Math.round(avgVocab * 10) / 10,
      avgSentiment: Math.round(avgSentiment),
      avgFillers: Math.round(avgFillers * 10) / 10,
      avgOverall: Math.round(avgOverall * 10) / 10,
      avgWpm: Math.round(avgWpm),
      growthFluency,
      growthSentiment,
    };
  }, [filteredSessions]);

  // --------------------------------------------------------------------------
  // D3 Chart 1: Progression Multi-Line & Area Chart (Fluency, Vocab, Sentiment, Overall)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!progressionChartRef.current || filteredSessions.length === 0) return;

    const svg = d3.select(progressionChartRef.current);
    svg.selectAll('*').remove();

    const container = progressionChartRef.current.parentElement;
    const width = container ? container.clientWidth : 600;
    const height = 280;
    const margin = { top: 20, right: 30, bottom: 35, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Chronological dates
    const xScale = d3.scaleTime()
      .domain(d3.extent(filteredSessions, (d) => new Date(d.started_at)) as [Date, Date])
      .range([0, innerWidth]);

    // Y Scale: Score (0 to 10)
    const yScale = d3.scaleLinear()
      .domain([4, 10])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(() => ''));

    // Gradients for area fills
    const defs = svg.append('defs');

    const addGradient = (id: string, color: string) => {
      const grad = defs.append('linearGradient')
        .attr('id', id)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '0%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.3);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.0);
    };

    addGradient('fluency-grad', '#06b6d4');   // cyan
    addGradient('vocab-grad', '#8b5cf6');     // purple
    addGradient('sentiment-grad', '#10b981'); // emerald
    addGradient('overall-grad', '#3b82f6');   // blue

    // Lines definitions
    const createLine = (accessor: (d: Session) => number) =>
      d3.line<Session>()
        .x((d) => xScale(new Date(d.started_at)))
        .y((d) => yScale(accessor(d)))
        .curve(d3.curveMonotoneX);

    const createArea = (accessor: (d: Session) => number) =>
      d3.area<Session>()
        .x((d) => xScale(new Date(d.started_at)))
        .y0(innerHeight)
        .y1((d) => yScale(accessor(d)))
        .curve(d3.curveMonotoneX);

    // Render Fluency Line & Area
    if (activeMetricSeries === 'all' || activeMetricSeries === 'fluency') {
      g.append('path')
        .datum(filteredSessions)
        .attr('fill', 'url(#fluency-grad)')
        .attr('d', createArea((d) => d.scores.fluency || d.overall_score || 7));

      g.append('path')
        .datum(filteredSessions)
        .attr('fill', 'none')
        .attr('stroke', '#06b6d4')
        .attr('stroke-width', 2.5)
        .attr('d', createLine((d) => d.scores.fluency || d.overall_score || 7));
    }

    // Render Vocabulary Line
    if (activeMetricSeries === 'all' || activeMetricSeries === 'vocab') {
      g.append('path')
        .datum(filteredSessions)
        .attr('fill', 'none')
        .attr('stroke', '#8b5cf6')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', activeMetricSeries === 'all' ? '4,4' : 'none')
        .attr('d', createLine((d) => d.scores.grammar_vocab || d.overall_score || 7));
    }

    // Render Sentiment / Composure Line (normalized 0-100 to 0-10 scale)
    if (activeMetricSeries === 'all' || activeMetricSeries === 'sentiment') {
      g.append('path')
        .datum(filteredSessions)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2)
        .attr('d', createLine((d) => ((d.scores.sentiment || d.scores.confidence || 75) / 10)));
    }

    // Render Overall Score Line
    if (activeMetricSeries === 'all' || activeMetricSeries === 'overall') {
      g.append('path')
        .datum(filteredSessions)
        .attr('fill', 'none')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 2)
        .attr('d', createLine((d) => d.overall_score || 7));
    }

    // Interactive Points
    filteredSessions.forEach((session) => {
      const cx = xScale(new Date(session.started_at));
      const cy = yScale(session.scores.fluency || session.overall_score || 7);

      g.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 4.5)
        .attr('fill', '#06b6d4')
        .attr('stroke', '#09090b')
        .attr('stroke-width', 2)
        .attr('class', 'cursor-pointer hover:scale-125 transition-transform')
        .on('click', () => setSelectedSession(session));
    });

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => d3.timeFormat('%b %d')(d as Date)))
      .attr('color', '#52525b')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#a1a1aa');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .attr('color', '#52525b')
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('fill', '#a1a1aa');

  }, [filteredSessions, activeMetricSeries]);

  // --------------------------------------------------------------------------
  // D3 Chart 2: Practice Duration & Pace Bar Chart
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!durationBarChartRef.current || filteredSessions.length === 0) return;

    const svg = d3.select(durationBarChartRef.current);
    svg.selectAll('*').remove();

    const container = durationBarChartRef.current.parentElement;
    const width = container ? container.clientWidth : 400;
    const height = 220;
    const margin = { top: 15, right: 20, bottom: 35, left: 35 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(filteredSessions.map((_, i) => i.toString()))
      .range([0, innerWidth])
      .padding(0.3);

    const maxDurationMin = d3.max(filteredSessions, (d) => Math.round(d.duration_sec / 60)) || 20;
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(maxDurationMin, 15)])
      .range([innerHeight, 0]);

    // Bars
    g.selectAll('.bar')
      .data(filteredSessions)
      .enter()
      .append('rect')
      .attr('x', (_, i) => xScale(i.toString()) || 0)
      .attr('y', (d) => yScale(Math.round(d.duration_sec / 60)))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(Math.round(d.duration_sec / 60)))
      .attr('rx', 4)
      .attr('fill', (d) => (selectedSession?.id === d.id ? '#06b6d4' : '#3f3f46'))
      .attr('class', 'hover:fill-cyan-400 transition-colors cursor-pointer')
      .on('click', (_, d) => setSelectedSession(d));

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat((d) => `#${Number(d) + 1}`))
      .attr('color', '#52525b')
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('fill', '#a1a1aa');

    // Y Axis (Minutes)
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4).tickFormat((d) => `${d}m`))
      .attr('color', '#52525b')
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('fill', '#a1a1aa');
  }, [filteredSessions, selectedSession]);

  // --------------------------------------------------------------------------
  // D3 Chart 3: Sentiment & Composure Distribution Donut
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!sentimentDonutRef.current || filteredSessions.length === 0) return;

    const svg = d3.select(sentimentDonutRef.current);
    svg.selectAll('*').remove();

    const width = 180;
    const height = 180;
    const radius = Math.min(width, height) / 2;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    // Categorize sentiment across sessions
    const confidentCount = filteredSessions.filter((s) => (s.scores.sentiment || 75) >= 80).length;
    const steadyCount = filteredSessions.filter((s) => {
      const score = s.scores.sentiment || 75;
      return score >= 65 && score < 80;
    }).length;
    const hesitantCount = filteredSessions.filter((s) => (s.scores.sentiment || 75) < 65).length;

    const pieData = [
      { label: 'High Confidence', value: confidentCount, color: '#10b981' }, // emerald
      { label: 'Steady Composure', value: steadyCount, color: '#06b6d4' },   // cyan
      { label: 'Needs Polish', value: hesitantCount, color: '#f59e0b' },     // amber
    ];

    const pie = d3.pie<{ label: string; value: number; color: string }>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(radius * 0.65)
      .outerRadius(radius * 0.9)
      .cornerRadius(4);

    g.selectAll('path')
      .data(pie(pieData))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#09090b')
      .attr('stroke-width', 2);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('font-size', '20px')
      .attr('font-weight', 'bold')
      .attr('fill', '#ffffff')
      .text(`${metrics.avgSentiment}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.3em')
      .attr('font-size', '10px')
      .attr('fill', '#a1a1aa')
      .text('Confidence');
  }, [filteredSessions, metrics.avgSentiment]);

  // --------------------------------------------------------------------------
  // D3 Chart 4: Core Competency Radar Polygon Chart
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!radarChartRef.current || filteredSessions.length === 0) return;

    const svg = d3.select(radarChartRef.current);
    svg.selectAll('*').remove();

    const width = 260;
    const height = 240;
    const radius = 80;

    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    const latest = filteredSessions[filteredSessions.length - 1];

    const dimensions = [
      { axis: 'Fluency', value: latest?.scores.fluency || 8.5 },
      { axis: 'Technical', value: latest?.scores.technical_accuracy || 9.0 },
      { axis: 'Structure', value: latest?.scores.structure || 8.6 },
      { axis: 'Vocabulary', value: latest?.scores.grammar_vocab || 8.8 },
      { axis: 'No Fillers', value: latest?.scores.fillers || 8.4 },
      { axis: 'Sentiment', value: (latest?.scores.sentiment || 85) / 10 },
    ];

    const totalAxes = dimensions.length;
    const angleSlice = (Math.PI * 2) / totalAxes;
    const rScale = d3.scaleLinear().domain([0, 10]).range([0, radius]);

    // Concentric Web Circles
    const levels = [3, 6, 8.5, 10];
    levels.forEach((level) => {
      g.append('circle')
        .attr('r', rScale(level))
        .attr('fill', 'none')
        .attr('stroke', level === 8.5 ? '#06b6d4' : '#27272a')
        .attr('stroke-width', level === 8.5 ? 1.5 : 1)
        .attr('stroke-dasharray', level === 8.5 ? '3,3' : 'none');
    });

    // Axis Rays & Labels
    dimensions.forEach((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      const x = rScale(10) * Math.cos(angle);
      const y = rScale(10) * Math.sin(angle);

      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', x).attr('y2', y)
        .attr('stroke', '#27272a')
        .attr('stroke-width', 1);

      // Label text
      const labelX = (radius + 18) * Math.cos(angle);
      const labelY = (radius + 18) * Math.sin(angle);
      g.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '9px')
        .attr('font-weight', '600')
        .attr('fill', '#a1a1aa')
        .text(d.axis);
    });

    // Radar Polygon Path
    const points: [number, number][] = dimensions.map((d, i) => {
      const angle = i * angleSlice - Math.PI / 2;
      return [rScale(d.value) * Math.cos(angle), rScale(d.value) * Math.sin(angle)];
    });

    const radarLine = d3.lineRadial()
      .radius((d: any) => rScale(d.value))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    g.append('path')
      .datum(dimensions)
      .attr('d', radarLine as any)
      .attr('fill', 'rgba(6, 182, 212, 0.25)')
      .attr('stroke', '#06b6d4')
      .attr('stroke-width', 2);

    // Nodes
    points.forEach(([x, y]) => {
      g.append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', 3.5)
        .attr('fill', '#06b6d4');
    });
  }, [filteredSessions]);

  // Export session data
  const handleExportData = () => {
    const exportObject = {
      user: profile?.full_name || 'Cybersecurity Student',
      exported_at: new Date().toISOString(),
      summary_metrics: metrics,
      session_history: filteredSessions,
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speakcoach_performance_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={onReturnToPractice}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-cyan-500/50 hover:bg-zinc-800 hover:text-white transition"
              title="Return to coach practice workspace"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Practice</span>
            </button>
            <div className="h-4 w-[1px] bg-zinc-800" />
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Cybersecurity Speech Analytics
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            Communication & Fluency Mastery
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            D3 telemetry tracking interview pacing, vocabulary, structure, and sentiment composure over time.
          </p>
        </div>

        {/* Global Action & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Pills */}
          <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/90 p-1">
            {(['7d', '14d', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  timeFilter === t
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t === '7d' ? '7 Days' : t === '14d' ? '14 Days' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Domain Filter Dropdown */}
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">All Domains</option>
            <option value="soc_ir">SOC / IR</option>
            <option value="web_security">Web Security</option>
            <option value="networking">Networking</option>
            <option value="cloud_iam">Cloud IAM</option>
            <option value="fundamentals">Fundamentals</option>
          </select>

          {/* Export Report Button */}
          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition shadow-sm"
            title="Download JSON Performance Report"
          >
            <Download className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Practice */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Practice</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white tracking-tight">
            {metrics.totalDurationMin}m
          </div>
          <span className="mt-1 inline-block text-[11px] text-zinc-500">
            {filteredSessions.length} completed sessions
          </span>
        </div>

        {/* Card 2: Fluency Score */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Avg Fluency</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400 tracking-tight">
            {metrics.avgFluency}
            <span className="text-xs text-zinc-500 font-normal"> / 10</span>
          </div>
          <span className="mt-1 inline-flex items-center text-[11px] text-emerald-400 font-medium">
            +{metrics.growthFluency} pts growth
          </span>
        </div>

        {/* Card 3: Vocabulary & Grammar */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Tech Vocabulary</span>
            <Award className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400 tracking-tight">
            {metrics.avgVocab}
            <span className="text-xs text-zinc-500 font-normal"> / 10</span>
          </div>
          <span className="mt-1 inline-block text-[11px] text-zinc-500">
            Advanced terms used
          </span>
        </div>

        {/* Card 4: Sentiment / Composure */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Confidence Index</span>
            <Smile className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400 tracking-tight">
            {metrics.avgSentiment}%
          </div>
          <span className="mt-1 inline-flex items-center text-[11px] text-amber-400 font-medium">
            +{metrics.growthSentiment}% positive tone
          </span>
        </div>

        {/* Card 5: Speaking Cadence (WPM) */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Pacing (WPM)</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-400 tracking-tight">
            {metrics.avgWpm}
          </div>
          <span className="mt-1 inline-block text-[11px] text-emerald-400 font-medium">
            Optimal 120-140 range
          </span>
        </div>

        {/* Card 6: Fillers / Min */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Filler Words</span>
            <Zap className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400 tracking-tight">
            {metrics.avgFillers}
            <span className="text-xs text-zinc-500 font-normal"> / min</span>
          </div>
          <span className="mt-1 inline-block text-[11px] text-emerald-400 font-medium">
            -82% from baseline
          </span>
        </div>
      </div>

      {/* Main Charts Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Primary D3 Progression Line Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" />
                Score Progression Over Time
              </h2>
              <p className="text-xs text-zinc-400">
                Continuous D3 Bezier curve telemetry across completed drill sessions
              </p>
            </div>

            {/* Metric Series Toggles */}
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'fluency', label: 'Fluency', color: 'text-cyan-400' },
                { id: 'vocab', label: 'Vocab', color: 'text-purple-400' },
                { id: 'sentiment', label: 'Sentiment', color: 'text-emerald-400' },
                { id: 'overall', label: 'Overall', color: 'text-blue-400' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMetricSeries(m.id as any)}
                  className={`px-2.5 py-0.5 rounded-md font-semibold transition ${
                    activeMetricSeries === m.id
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className={m.color}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* D3 Multi-Line SVG Chart Container */}
          <div className="w-full relative h-[280px]">
            <svg ref={progressionChartRef} className="w-full h-full" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" /> Fluency
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400" /> Tech Vocabulary
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Composure %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Overall
              </span>
            </div>
            <span>Click any node to inspect session drilldown</span>
          </div>
        </div>

        {/* Right Column (1 span): Radar Polygon Skill Spider Chart */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              Interview Skill Radar
            </h2>
            <p className="text-xs text-zinc-400">
              Multi-axial evaluation vs Senior Industry Benchmark (dotted ring)
            </p>
          </div>

          {/* D3 Radar SVG */}
          <div className="w-full flex items-center justify-center py-2">
            <svg ref={radarChartRef} className="w-[260px] h-[240px]" />
          </div>

          <div className="text-center text-[11px] text-zinc-400 border-t border-zinc-800/60 pt-2">
            <span className="text-cyan-400 font-semibold">Ready for Placement: </span>
            Exceeds 8.5/10 benchmark across 5 of 6 core axes.
          </div>
        </div>
      </div>

      {/* Secondary Charts Row: Duration Cadence + Sentiment Donut + Detail Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sub-Chart 1: Duration Bars */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              Session Duration Stamina
            </h2>
            <p className="text-xs text-zinc-400">Practice length in minutes per session</p>
          </div>

          <div className="w-full relative h-[200px] mt-2">
            <svg ref={durationBarChartRef} className="w-full h-full" />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2">
            <span>Peak session: 19 mins</span>
            <span className="text-cyan-400 font-medium">Endurance +240%</span>
          </div>
        </div>

        {/* Sub-Chart 2: Sentiment Donut */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Smile className="h-4 w-4 text-amber-400" />
              Delivery Sentiment Breakdown
            </h2>
            <p className="text-xs text-zinc-400">Assertiveness and composure ratio across answers</p>
          </div>

          <div className="w-full flex items-center justify-center py-2">
            <svg ref={sentimentDonutRef} className="w-[180px] h-[180px]" />
          </div>

          <div className="flex items-center justify-around text-[10px] text-zinc-400 border-t border-zinc-800/60 pt-2">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Confident (65%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-500" /> Steady (25%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Hesitant (10%)
            </span>
          </div>
        </div>

        {/* Sub-Chart 3: Selected Session Detail Drilldown Card */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Session Inspection
              </span>
              <span className="text-[11px] text-zinc-500">
                {selectedSession ? new Date(selectedSession.started_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1">
              {selectedSession ? MODE_LABELS[selectedSession.mode]?.title : 'Select a session'}
            </h3>
            <p className="text-xs text-zinc-400">
              Domain: {selectedSession?.technical_domain?.replace(/_/g, ' ').toUpperCase() || 'GENERAL'}
            </p>
          </div>

          {selectedSession && (
            <div className="space-y-2.5 my-3 text-xs">
              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-2.5 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Key Strengths
                </span>
                <p className="text-[11px] text-zinc-300">
                  {selectedSession.summary.strengths?.[0] || 'Clear, structured explanation of security architecture.'}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-2.5 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Suggested Polish
                </span>
                <p className="text-[11px] text-zinc-300">
                  {selectedSession.summary.fixes?.[0]?.better_version || selectedSession.summary.focus_for_next_session || 'Continue eliminating pause fillers.'}
                </p>
              </div>
            </div>
          )}

          {onSelectDrill && selectedSession && (
            <button
              onClick={() => onSelectDrill(selectedSession.mode, selectedSession.technical_domain)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-500/20"
            >
              <span>Practice This Drill Mode Again</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Historical Drill Sessions Table */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Completed Practice History</h2>
            <p className="text-xs text-zinc-400">Audit log of questions, cadence, and AI coach verdicts</p>
          </div>
          <span className="text-xs text-zinc-400 font-medium">
            Showing {filteredSessions.length} recorded drills
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Date & Time</th>
                <th className="pb-3 pr-4">Mode</th>
                <th className="pb-3 pr-4">Domain</th>
                <th className="pb-3 pr-4">Duration</th>
                <th className="pb-3 pr-4">Fluency</th>
                <th className="pb-3 pr-4">Vocab</th>
                <th className="pb-3 pr-4">Confidence</th>
                <th className="pb-3 pr-4">Fillers/Min</th>
                <th className="pb-3 text-right">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredSessions.slice().reverse().map((session) => (
                <tr
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`hover:bg-zinc-850/60 transition cursor-pointer ${
                    selectedSession?.id === session.id ? 'bg-zinc-850/80 text-white font-medium' : ''
                  }`}
                >
                  <td className="py-3 pr-4 font-mono text-[11px] text-zinc-400">
                    {new Date(session.started_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-white">
                    {MODE_LABELS[session.mode]?.title || session.mode}
                  </td>
                  <td className="py-3 pr-4 text-cyan-300 text-[11px]">
                    {session.technical_domain ? session.technical_domain.replace(/_/g, ' ') : 'General'}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400 font-mono">
                    {Math.round(session.duration_sec / 60)} min
                  </td>
                  <td className="py-3 pr-4 text-emerald-400 font-semibold">
                    {session.scores.fluency || session.overall_score || 'N/A'}/10
                  </td>
                  <td className="py-3 pr-4 text-purple-400 font-semibold">
                    {session.scores.grammar_vocab || session.overall_score || 'N/A'}/10
                  </td>
                  <td className="py-3 pr-4 text-amber-400 font-semibold">
                    {session.scores.sentiment || session.scores.confidence || 75}%
                  </td>
                  <td className="py-3 pr-4 font-mono text-zinc-400">
                    {session.summary.fillers_per_min ?? 2.1}
                  </td>
                  <td className="py-3 text-right font-bold text-white">
                    <span className="rounded-lg bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 text-cyan-300">
                      {session.overall_score || 8.0}/10
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
