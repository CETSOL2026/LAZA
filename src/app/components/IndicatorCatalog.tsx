import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Landmark,
  LockKeyhole,
  Search,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { loadLatestIndicators, pilotIndicators, type PilotIndicator } from '../data/indicators';
import {
  accessLabel,
  advancedProductAccess,
  minimumPlanForFullAccess,
  officialIndicatorAccess,
  type AccessLevel,
  type SubscriptionPlan,
} from '../data/subscriptionAccess';

interface IndicatorCatalogProps {
  subscriptionPlan?: SubscriptionPlan;
  onIndicatorSelect: (indicatorId: string) => void;
  onNavigate: (tab: string) => void;
  onUpgrade?: () => void;
}

interface CatalogItem {
  id: string;
  title: string;
  type: 'Official indicator' | 'Advanced intelligence';
  domain: string;
  description: string;
  source: string;
  frequency: string;
  value: string;
  period: string;
  qualityScore?: number | null;
  access: AccessLevel;
  action: () => void;
}

const filters = ['All', 'Economy', 'Prices', 'FX', 'Society', 'Finance', 'Public Finance', 'Energy', 'Capital Markets'];

const advancedItems = [
  {
    id: 'advanced-gdp-diversification',
    title: 'Oil vs. Non-Oil GDP',
    domain: 'Economy',
    description: 'Quarterly view of oil and non-oil contribution to GDP growth and economic structure.',
    source: 'INE Angola - National Accounts',
    frequency: 'Quarterly',
    value: 'Advanced',
    period: '2021-Q1 to 2026-Q1',
  },
  {
    id: 'advanced-oil-gas',
    title: 'Oil & Gas Production',
    domain: 'Energy',
    description: 'Monthly crude production, forecast variance, associated gas allocation and Angola LNG output.',
    source: 'ANPG - Monthly Oil & Gas Publications',
    frequency: 'Monthly',
    value: 'Advanced',
    period: '2025-01 to 2026-06',
  },
  {
    id: 'advanced-fiscal-execution',
    title: 'Fiscal Execution',
    domain: 'Public Finance',
    description: 'Quarterly revenue, expenditure, execution rates and budget balance from official MINFIN reports.',
    source: 'MINFIN - Budget Execution Reports',
    frequency: 'Quarterly',
    value: 'Advanced',
    period: '2025-Q1 to 2026-Q1',
  },
  {
    id: 'advanced-sovereign-yield',
    title: 'Sovereign Yield Curve',
    domain: 'Capital Markets',
    description: 'Observed Kwanza Treasury yields, spreads and maturity-by-maturity curve shifts.',
    source: 'BODIVA - Market Bulletins',
    frequency: 'Snapshot',
    value: 'Premium',
    period: '2026 snapshots',
  },
] as const;

function domainGroup(indicator: PilotIndicator) {
  if (indicator.id === 'inflation-rate') return 'Prices';
  if (indicator.id === 'exchange-rate') return 'FX';
  if (indicator.id === 'population') return 'Society';
  if (indicator.id === 'banking-assets') return 'Finance';
  if (indicator.id === 'public-debt-gdp') return 'Public Finance';
  return 'Economy';
}

function accessClasses(access: AccessLevel) {
  if (access === 'full') return 'bg-blue-50 text-blue-700';
  if (access === 'preview') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

export function IndicatorCatalog({ subscriptionPlan = 'free', onIndicatorSelect, onNavigate, onUpgrade }: IndicatorCatalogProps) {
  const [indicators, setIndicators] = useState<PilotIndicator[]>(pilotIndicators);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'fallback'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    loadLatestIndicators(controller.signal)
      .then((payload) => {
        setIndicators(payload.data);
        setConnectionStatus('connected');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setConnectionStatus('fallback');
      });
    return () => controller.abort();
  }, []);

  const catalogItems = useMemo<CatalogItem[]>(() => {
    const officialItems = indicators.map((indicator) => {
      const access = officialIndicatorAccess[indicator.id]?.[subscriptionPlan] ?? 'full';
      return {
        id: indicator.id,
        title: indicator.label,
        type: 'Official indicator' as const,
        domain: domainGroup(indicator),
        description: indicator.definition,
        source: indicator.sourceName,
        frequency: indicator.frequency,
        value: indicator.value,
        period: indicator.period,
        qualityScore: indicator.qualityScore,
        access,
        action: () => onIndicatorSelect(indicator.id),
      };
    });

    const advancedCatalogItems = advancedItems.map((item) => {
      const access = advancedProductAccess[item.id]?.[subscriptionPlan] ?? 'locked';
      return {
        ...item,
        type: 'Advanced intelligence' as const,
        qualityScore: 100,
        access,
        action: () => {
          if (access === 'full') onNavigate(item.id);
          else onUpgrade?.();
        },
      };
    });

    return [...officialItems, ...advancedCatalogItems];
  }, [indicators, onIndicatorSelect, onNavigate, onUpgrade, subscriptionPlan]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return catalogItems.filter((item) => {
      const matchesFilter = activeFilter === 'All' || item.domain === activeFilter;
      const haystack = `${item.title} ${item.type} ${item.domain} ${item.description} ${item.source}`.toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeFilter, catalogItems, query]);

  const officialCount = catalogItems.filter((item) => item.type === 'Official indicator').length;
  const advancedCount = catalogItems.length - officialCount;
  const summaryCards: Array<{ label: string; value: number; icon: LucideIcon }> = [
    { label: 'Official indicators', value: officialCount, icon: ShieldCheck },
    { label: 'Advanced products', value: advancedCount, icon: TrendingUp },
    { label: 'Topics covered', value: filters.length - 1, icon: BarChart3 },
  ];

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-white to-slate-50 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-primary">Indicator catalog</p>
            <h1 className="mt-2 text-3xl tracking-tight sm:text-4xl">All Indicators</h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              Browse official indicators and advanced intelligence products by topic, source, quality evidence and access level.
            </p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
            connectionStatus === 'connected'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            {connectionStatus === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
            {connectionStatus === 'loading' && 'Loading catalog...'}
            {connectionStatus === 'connected' && `${officialCount} official / ${advancedCount} advanced`}
            {connectionStatus === 'fallback' && 'Fallback catalog'}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-white p-4">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-2xl text-primary">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by indicator, source or topic..."
            className="w-full rounded-xl border border-border bg-white py-3 pl-11 pr-4 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              type="button"
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition-colors ${
                activeFilter === filter
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-foreground hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filteredItems.map((item) => {
          const canOpen = item.access === 'full' || item.type === 'Official indicator';
          return (
            <article key={`${item.type}-${item.id}`} className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-primary">{item.domain}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.type}</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${accessClasses(item.access)}`}>{accessLabel(item.access)}</span>
                  </div>
                  <h2 className="text-xl tracking-tight">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  {item.type === 'Official indicator' ? <BarChart3 className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                </div>
              </div>

              <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Latest value</dt>
                  <dd className="mt-1 text-lg">{item.value}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Period</dt>
                  <dd className="mt-1">{item.period}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Frequency</dt>
                  <dd className="mt-1">{item.frequency}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Quality</dt>
                  <dd className="mt-1">{item.qualityScore == null ? 'n/a' : `${item.qualityScore.toFixed(1)}/100`}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Source</dt>
                  <dd className="mt-1 truncate" title={item.source}>{item.source}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={item.action}
                className={`mt-5 inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  canOpen
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-border bg-muted text-muted-foreground hover:bg-slate-100'
                }`}
              >
                {canOpen ? 'Open details' : `Requires ${minimumPlanForFullAccess(advancedProductAccess[item.id])}`}
                {canOpen ? <ArrowRight className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
              </button>
            </article>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="rounded-2xl border border-border bg-white p-8 text-center text-muted-foreground">
          No indicators match the current search and filter.
        </div>
      )}
    </section>
  );
}
