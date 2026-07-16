import { LockKeyhole } from 'lucide-react';
import logoFull from '../../imports/Artboard_1_3.png';

interface FooterProps {
  onNavigate: (tab: string) => void;
  onAdmin: () => void;
}

export function Footer({ onNavigate, onAdmin }: FooterProps) {
  return <footer className="mt-16 border-t border-slate-800 bg-slate-950 text-white" aria-label="Site footer">
    <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
      <div className="md:col-span-2"><button type="button" onClick={() => onNavigate('overview')} aria-label="LAZA home"><img src={logoFull} alt="LAZA" className="h-9" /></button><p className="mt-4 max-w-md text-sm leading-6 text-white/55">Official economic and financial intelligence for Angola, supported by governed sources, quality evidence and transparent methodology.</p><p className="mt-4 text-xs text-white/35">MVP coverage: 6 official indicators · 4 advanced analyses · 36 source files</p></div>
      <div><h2 className="text-sm text-white/85">Explore</h2><div className="mt-3 grid gap-2 text-sm text-white/55">{[['overview','Overview'],['data-intelligence','Data Marketplace'],['advanced-gdp-diversification','Advanced Intelligence'],['data-quality','Methodology']].map(([tab,label]) => <button type="button" key={tab} onClick={() => onNavigate(tab)} className="w-fit transition-colors hover:text-white">{label}</button>)}</div></div>
      <div><h2 className="text-sm text-white/85">Institutional</h2><div className="mt-3 grid gap-2 text-sm text-white/55">{[['about','About LAZA'],['team','Team'],['contacts','Contacts']].map(([tab,label]) => <button type="button" key={tab} onClick={() => onNavigate(tab)} className="w-fit transition-colors hover:text-white">{label}</button>)}</div><button type="button" onClick={onAdmin} className="mt-5 inline-flex items-center gap-2 text-xs text-white/35 transition-colors hover:text-white"><LockKeyhole className="h-3.5 w-3.5" />Administrator access</button></div>
    </div>
    <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>© {new Date().getFullYear()} LAZA. MVP environment.</span><span>Sources remain property of their official publishers.</span></div></div>
  </footer>;
}
