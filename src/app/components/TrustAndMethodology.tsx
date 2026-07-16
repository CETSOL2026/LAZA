import { ArrowRight, CheckCircle2, Database, FileCheck2, Layers3, ShieldCheck } from 'lucide-react';

export function TrustAndMethodology({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const layers = [
    { title: 'Bronze', description: 'Original official assets and raw observations preserved with source, publication and hash evidence.', icon: Database },
    { title: 'Silver', description: 'Normalized observations validated for completeness, uniqueness and reconciliation.', icon: FileCheck2 },
    { title: 'Gold', description: 'Approved, publication-ready indicators exposed through governed read-only APIs.', icon: ShieldCheck },
  ];

  return <section className="overflow-hidden rounded-2xl border border-border bg-slate-950 text-white shadow-xl">
    <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
      <div><p className="text-xs uppercase tracking-[0.16em] text-red-300">Trust and methodology</p><h2 className="mt-2 text-3xl tracking-tight">Every published value keeps its evidence</h2><p className="mt-4 text-sm leading-6 text-white/65">LAZA separates source acquisition, normalization, quality validation and publication so users can understand where a value came from and whether it is ready for decision-making.</p>
        <div className="mt-6 space-y-2 text-sm text-white/75"><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />6 official indicators currently published</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />36 governed local source files</p><p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Quality score and source shown in indicator details</p></div>
        <div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={() => onNavigate('data-quality')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm text-slate-950 transition-colors hover:bg-white/90">View methodology <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => onNavigate('data-intelligence')} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm text-white transition-colors hover:bg-white/10">Browse evidence</button></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{layers.map((layer, index) => { const Icon = layer.icon; return <article key={layer.title} className="relative rounded-xl border border-white/10 bg-white/5 p-5"><div className="mb-5 flex items-center justify-between"><div className="rounded-lg bg-white/10 p-2.5"><Icon className="h-5 w-5" /></div><span className="text-xs text-white/35">0{index + 1}</span></div><h3 className="text-lg">{layer.title}</h3><p className="mt-2 text-xs leading-5 text-white/55">{layer.description}</p>{index < layers.length - 1 && <Layers3 className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-red-300 sm:block" />}</article>; })}</div>
    </div>
  </section>;
}
