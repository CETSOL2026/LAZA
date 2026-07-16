import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MetricsOverview } from './components/MetricsOverview';
import { OilGasIntelligence } from './components/OilGasIntelligence';
import { FiscalExecutionIntelligence } from './components/FiscalExecutionIntelligence';
import { SovereignYieldCurveIntelligence } from './components/SovereignYieldCurveIntelligence';
import { OilNonOilGdpIntelligence } from './components/OilNonOilGdpIntelligence';
import { AdvancedIntelligenceCards } from './components/AdvancedIntelligenceCards';
import { AdvancedIntelligencePage } from './components/AdvancedIntelligencePage';
import { EconomySection } from './components/EconomySection';
import { DataMarketplace } from './components/DataMarketplace';
import { SourceFilesMarketplace } from './components/SourceFilesMarketplace';
import { FeaturedInsights } from './components/FeaturedInsights';
import { AboutUs } from './components/AboutUs';
import { LazaTeam } from './components/LazaTeam';
import { Contact } from './components/Contact';
import { AdminGate } from './components/AdminGate';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedOfficialIndicator, setSelectedOfficialIndicator] = useState('gdp-growth');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeTab]);

  const advancedPages = {
    'advanced-gdp-diversification': {
      topic: 'Macroeconomy & Diversification', title: 'Oil vs. Non-Oil GDP',
      description: 'Quarterly growth momentum, contribution to total GDP growth and the changing structure of Angola\'s economy.',
      content: <OilNonOilGdpIntelligence />,
    },
    'advanced-oil-gas': {
      topic: 'Energy', title: 'Oil & Gas Production',
      description: 'Official monthly production, forecast performance, associated gas allocation and Angola LNG output.',
      content: <OilGasIntelligence />,
    },
    'advanced-fiscal-execution': {
      topic: 'Public Finance', title: 'Fiscal Execution',
      description: 'Quarterly revenue, expenditure, budget execution, composition and fiscal balance from official MINFIN reports.',
      content: <FiscalExecutionIntelligence />,
    },
    'advanced-sovereign-yield': {
      topic: 'Capital Markets', title: 'Sovereign Yield Curve',
      description: 'Observed kwanza Treasury yields, curve spreads and maturity-by-maturity shifts from BODIVA market data.',
      content: <SovereignYieldCurveIntelligence />,
    },
  } as const;
  const advancedPage = advancedPages[activeTab as keyof typeof advancedPages];

  if (showAdmin) return <AdminGate onBack={() => setShowAdmin(false)} />;

  const openOfficialIndicator = (indicatorId: string) => {
    setSelectedOfficialIndicator(indicatorId);
    setActiveTab('official-indicator-detail');
  };

  return <div className="min-h-screen bg-background">
    <Header activeTab={activeTab} setActiveTab={setActiveTab} />
    <button onClick={() => setShowAdmin(true)} className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm text-white shadow-xl transition-colors hover:bg-secondary/90" title="Open Admin Dashboard"><span className="h-2 w-2 rounded-full bg-primary" />Admin Panel</button>

    {activeTab === 'overview' && <><Hero /><main className="mx-auto max-w-[1400px] space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      <MetricsOverview summaryOnly onIndicatorSelect={openOfficialIndicator} />
      <AdvancedIntelligenceCards onNavigate={setActiveTab} />
      <FeaturedInsights onNavigate={setActiveTab} />
    </main></>}

    {activeTab === 'official-indicator-detail' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <button type="button" onClick={() => setActiveTab('overview')} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to overview
      </button>
      <MetricsOverview key={selectedOfficialIndicator} initialSelectedId={selectedOfficialIndicator} />
    </main>}

    {activeTab === 'data-intelligence' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><SourceFilesMarketplace /></main>}

    {advancedPage && <AdvancedIntelligencePage topic={advancedPage.topic} title={advancedPage.title} description={advancedPage.description} onBack={() => setActiveTab('overview')}>{advancedPage.content}</AdvancedIntelligencePage>}

    {(['kiluange', 'bwila', 'lukeni', 'ekuikui', 'njinga'].includes(activeTab)) && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><DataMarketplace /></main>}

    {(['data-quality', 'scn-2008', 'cpi', 'gfs', 'bpm', 'edi', 'equity', 'bond', 'yield', 'fsi', 'traffic', 'macro-fiscal', 'external', 'banking', 'market', 'stress', 'benchmarks'].includes(activeTab)) &&
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><div className="space-y-6"><div><h1 className="mb-2 text-3xl capitalize tracking-tight">{activeTab.replace('-', ' ')}</h1><p className="text-muted-foreground">Methodology and policy information</p></div><EconomySection featured /></div></main>}

    {activeTab === 'about' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><AboutUs /></main>}
    {activeTab === 'team' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><LazaTeam /></main>}
    {activeTab === 'contacts' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><Contact /></main>}
  </div>;
}
