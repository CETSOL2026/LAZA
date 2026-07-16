import { useState } from 'react';
import { ExternalLink, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { pilotIndicators } from '../data/indicators';

export function MetricsOverview() {
  const [selectedId, setSelectedId] = useState(pilotIndicators[0].id);
  const selected = pilotIndicators.find((indicator) => indicator.id === selectedId) ?? pilotIndicators[0];

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-1 text-2xl tracking-tight">Pilot Indicators</h2>
          <p className="text-muted-foreground">Six indicators prepared for the first staged data integration test.</p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          <Info className="h-3.5 w-3.5" />
          Demonstration values - official validation pending
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {pilotIndicators.map((metric) => {
          const TrendIcon = metric.trend === 'up'
            ? TrendingUp
            : metric.trend === 'down'
              ? TrendingDown
              : Minus;

          return (
            <button
              type="button"
              key={metric.id}
              onClick={() => setSelectedId(metric.id)}
              aria-pressed={selectedId === metric.id}
              className={`group cursor-pointer rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-lg ${
                selectedId === metric.id ? 'border-primary ring-2 ring-primary/10' : 'border-border'
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="whitespace-nowrap rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {metric.period}
                </div>
                <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                  metric.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{metric.change}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl tracking-tight transition-colors group-hover:text-primary">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-muted/40 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg">{selected.label}</h3>
              <span className="rounded-full border border-border bg-white px-2.5 py-1 text-xs text-muted-foreground">
                {selected.domain}
              </span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{selected.definition}</p>
          </div>

          <a
            href={selected.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {selected.sourceName}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 md:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Period</dt>
            <dd className="mt-1 text-sm">{selected.period}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Frequency</dt>
            <dd className="mt-1 text-sm">{selected.frequency}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Unit</dt>
            <dd className="mt-1 text-sm">{selected.unit}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Quality status</dt>
            <dd className="mt-1 text-sm text-amber-700">{selected.qualityStatus}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
