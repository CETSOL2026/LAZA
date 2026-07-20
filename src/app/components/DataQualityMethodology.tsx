import { CheckCircle2, Database, FileCheck2, LockKeyhole, ShieldCheck, TriangleAlert } from 'lucide-react';

const qualityRules = [
  {
    rule: 'Source evidence',
    description: 'Official values must keep the original source asset, publication metadata, acquisition timestamp and SHA-256 evidence.',
  },
  {
    rule: 'Bronze validity',
    description: 'Raw payloads are preserved before semantic correction and must remain valid, traceable and reprocessable.',
  },
  {
    rule: 'Silver uniqueness',
    description: 'Only one current observation is allowed at the governed business grain: series, period, unit, source and methodology.',
  },
  {
    rule: 'Reconciliation',
    description: 'Transformations must reconcile published values, formulas, subtotals or accepted source exceptions before publication.',
  },
  {
    rule: 'Approval gate',
    description: 'Gold publication requires passed DQ evidence and an explicit approval or documented exception.',
  },
];

const layers = [
  {
    title: 'Bronze',
    icon: Database,
    summary: 'Original source assets and raw records.',
    evidence: ['Official file or response archived', 'Source path and checksum retained', 'Raw observations linked to ingestion batch'],
  },
  {
    title: 'Silver',
    icon: FileCheck2,
    summary: 'Normalized, versioned and validated observations.',
    evidence: ['Canonical indicator and series grain', 'Current-version control', 'Completeness and uniqueness checks'],
  },
  {
    title: 'Gold',
    icon: ShieldCheck,
    summary: 'Approved facts exposed to the read-only API.',
    evidence: ['Published status only after approval', 'Quality score visible to users', 'Lineage retained back to source evidence'],
  },
];

const reviewItems = [
  'Every methodology page must state the source of truth for its figures and rules.',
  'Accepted exceptions must be visible without weakening the official classification.',
  'Quality score labels must distinguish passed, warning and rejected evidence.',
  'Downloads and indicator details must reference the same source asset lineage.',
  'No demonstration data should be mixed with official published values.',
];

export function DataQualityMethodology() {
  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.16em] text-primary">Methodology</p>
            <h1 className="mt-2 text-3xl tracking-tight text-foreground">Data Quality Checks</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              LAZA publishes only values that can be traced from the original official source through Bronze ingestion,
              Silver normalization, data-quality evidence and an explicit Gold publication gate.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Governed methodology
          </span>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {layers.map((layer) => {
          const Icon = layer.icon;
          return (
            <article key={layer.title} className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg text-foreground">{layer.title}</h2>
                  <p className="text-xs text-muted-foreground">{layer.summary}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {layer.evidence.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl text-foreground">Publication gate</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A value becomes official only when source evidence, validation results and approval evidence all agree.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {['Source acquired', 'Bronze preserved', 'Silver validated', 'DQ approved', 'Gold published'].map((step, index) => (
            <div key={step} className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Step {index + 1}</p>
              <p className="mt-1 text-sm text-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="text-xl text-foreground">Core DQ rules</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Rule</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">What it confirms</th>
                </tr>
              </thead>
              <tbody>
                {qualityRules.map((item) => (
                  <tr key={item.rule} className="border-b border-border/60">
                    <td className="px-4 py-3 text-sm text-foreground">{item.rule}</td>
                    <td className="px-4 py-3 text-sm leading-6 text-muted-foreground">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5" />
            <h2 className="text-lg">Accepted exceptions</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-amber-900/80">
            Some official series can retain documented warnings, such as unavailable prior-period data or source narrative
            inconsistencies. These exceptions reduce or qualify the quality evidence but must remain visible to users.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-amber-300/70 bg-white/60 px-3 py-2 text-xs">
            <LockKeyhole className="h-4 w-4" />
            Gold publication remains controlled by approval evidence.
          </div>
        </aside>
      </section>

      <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <h2 className="text-xl text-foreground">Review checklist before formal publication</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {reviewItems.map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
