import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, Database, FileDown, Layers3, Search, ShieldCheck } from 'lucide-react';
import { loadLatestIndicators, PilotIndicator } from '../data/indicators';

interface HeroProps {
  onNavigate: (tab: string) => void;
  onIndicatorSelect: (indicatorId: string) => void;
}

const searchItems = [
  { label: 'GDP Growth', keywords: 'gdp pib growth crescimento', indicatorId: 'gdp-growth' },
  { label: 'Inflation Rate', keywords: 'inflation inflacao ipcn prices precos', indicatorId: 'inflation-rate' },
  { label: 'Exchange Rate', keywords: 'exchange cambio usd aoa bna', indicatorId: 'exchange-rate' },
  { label: 'Population', keywords: 'population populacao census censo', indicatorId: 'population' },
  { label: 'Banking Assets', keywords: 'banking banks ativos bancarios', indicatorId: 'banking-assets' },
  { label: 'Public Debt/GDP', keywords: 'public debt divida publica gdp pib', indicatorId: 'public-debt-gdp' },
  { label: 'Oil vs. Non-Oil GDP', keywords: 'oil non-oil petroleo diversificacao', tab: 'advanced-gdp-diversification' },
  { label: 'Oil & Gas Production', keywords: 'oil gas production anpg petroleo', tab: 'advanced-oil-gas' },
  { label: 'Fiscal Execution', keywords: 'fiscal budget revenue expenditure minfin', tab: 'advanced-fiscal-execution' },
  { label: 'Sovereign Yield Curve', keywords: 'yield curve treasury bodiva juros', tab: 'advanced-sovereign-yield' },
  { label: 'Official Source Marketplace', keywords: 'data files downloads sources ficheiros fontes', tab: 'data-intelligence' },
];

export function Hero({ onNavigate, onIndicatorSelect }: HeroProps) {
  const [query, setQuery] = useState('');
  const [latest, setLatest] = useState<PilotIndicator[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    loadLatestIndicators(controller.signal).then((payload) => setLatest(payload.data)).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return searchItems.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(normalized)).slice(0, 5);
  }, [query]);

  const openItem = (item: (typeof searchItems)[number]) => {
    setQuery('');
    if (item.indicatorId) onIndicatorSelect(item.indicatorId);
    else if (item.tab) onNavigate(item.tab);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (matches[0]) openItem(matches[0]);
    else onNavigate('data-intelligence');
  };

  const gdp = latest.find((indicator) => indicator.id === 'gdp-growth');
  const inflation = latest.find((indicator) => indicator.id === 'inflation-rate');

  return <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/5 via-white to-slate-50">
    <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
      <div className="max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary"><Database className="h-4 w-4" />Official intelligence for Angola</div>
        <h1 className="mb-5 text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">Trusted economic and financial data, ready for decision-making</h1>
        <p className="mb-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">Explore six official indicators, four advanced analytical products and the original source files preserved with quality and lineage evidence.</p>

        <form onSubmit={submitSearch} className="mb-7 flex flex-col gap-3 sm:flex-row">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search indicators and datasets" placeholder="Search indicators, analyses or source files..." className="w-full rounded-xl border-2 border-border bg-white py-3.5 pl-12 pr-4 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10" />
            {matches.length > 0 && <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl">{matches.map((item) => <button type="button" key={item.label} onClick={() => openItem(item)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-primary/5 hover:text-primary"><span>{item.label}</span><ArrowRight className="h-4 w-4" /></button>)}</div>}
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-white shadow-sm transition-colors hover:bg-primary/90">Search <ArrowRight className="h-4 w-4" /></button>
        </form>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => document.getElementById('official-indicators')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-white px-4 py-2.5 text-sm text-primary transition-colors hover:bg-primary/5"><BarChart3 className="h-4 w-4" />View official indicators</button>
          <button type="button" onClick={() => onNavigate('data-intelligence')} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm transition-colors hover:bg-muted"><FileDown className="h-4 w-4" />Download source files</button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-xl shadow-slate-200/60">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.16em] text-primary">MVP coverage</p><h2 className="mt-1 text-2xl">Official data foundation</h2></div><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck className="h-6 w-6" /></div></div>
        <div className="mt-6 grid grid-cols-2 gap-3">{[
          ['6', 'Official indicators'], ['4', 'Advanced analyses'], ['36', 'Source files'], ['10', 'Official datasets'],
        ].map(([value, label]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-2xl text-primary">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div>
        <div className="mt-5 rounded-xl border border-border p-4"><div className="mb-3 flex items-center gap-2 text-sm"><Layers3 className="h-4 w-4 text-primary" />Bronze → Silver → Gold lineage</div><div className="space-y-2 text-xs text-muted-foreground"><p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Source files archived locally with SHA-256 evidence</p><p className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Published values exposed through read-only APIs</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => onIndicatorSelect('gdp-growth')} className="rounded-xl border border-border p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"><p className="text-xs text-muted-foreground">Latest GDP growth</p><p className="mt-1 text-xl">{gdp?.value ?? 'Loading...'}</p><p className="mt-1 text-xs text-muted-foreground">{gdp?.period ?? 'Official series'}</p></button><button type="button" onClick={() => onIndicatorSelect('inflation-rate')} className="rounded-xl border border-border p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"><p className="text-xs text-muted-foreground">Latest inflation</p><p className="mt-1 text-xl">{inflation?.value ?? 'Loading...'}</p><p className="mt-1 text-xs text-muted-foreground">{inflation?.period ?? 'Official series'}</p></button></div>
      </div>
    </div>
  </section>;
}
