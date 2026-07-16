import { ArrowLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';

interface AdvancedIntelligencePageProps {
  topic: string;
  title: string;
  description: string;
  onBack: () => void;
  children: ReactNode;
}

export function AdvancedIntelligencePage({ topic, title, description, onBack, children }: AdvancedIntelligencePageProps) {
  return <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to overview</button>
    <div className="mt-5 mb-7 flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>Data &amp; Intelligence</span><ChevronRight className="h-3 w-3" /><span>Advanced Market Intelligence</span><ChevronRight className="h-3 w-3" /><span className="text-primary">{topic}</span></div>
        <h1 className="mt-3 text-3xl tracking-tight">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p></div>
      <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">Official source-backed analysis</span>
    </div>
    {children}
  </main>;
}
