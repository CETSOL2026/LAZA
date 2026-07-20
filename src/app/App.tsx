import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MetricsOverview } from './components/MetricsOverview';
import { AdvancedIntelligenceCards } from './components/AdvancedIntelligenceCards';
import { AdvancedIntelligencePage } from './components/AdvancedIntelligencePage';
import { FeaturedInsights } from './components/FeaturedInsights';
import { TrustAndMethodology } from './components/TrustAndMethodology';
import { Footer } from './components/Footer';
import { PricingModal } from './components/PricingModal';
import { normalizePlan, type SubscriptionPlan } from './data/subscriptionAccess';

const OilGasIntelligence = lazy(() => import('./components/OilGasIntelligence').then((module) => ({ default: module.OilGasIntelligence })));
const FiscalExecutionIntelligence = lazy(() => import('./components/FiscalExecutionIntelligence').then((module) => ({ default: module.FiscalExecutionIntelligence })));
const SovereignYieldCurveIntelligence = lazy(() => import('./components/SovereignYieldCurveIntelligence').then((module) => ({ default: module.SovereignYieldCurveIntelligence })));
const OilNonOilGdpIntelligence = lazy(() => import('./components/OilNonOilGdpIntelligence').then((module) => ({ default: module.OilNonOilGdpIntelligence })));
const ExecutiveMarketPulse = lazy(() => import('./components/ExecutiveMarketPulse').then((module) => ({ default: module.ExecutiveMarketPulse })));
const IndicatorCatalog = lazy(() => import('./components/IndicatorCatalog').then((module) => ({ default: module.IndicatorCatalog })));
const DataQualityMethodology = lazy(() => import('./components/DataQualityMethodology').then((module) => ({ default: module.DataQualityMethodology })));
const DataMarketplace = lazy(() => import('./components/DataMarketplace').then((module) => ({ default: module.DataMarketplace })));
const SourceFilesMarketplace = lazy(() => import('./components/SourceFilesMarketplace').then((module) => ({ default: module.SourceFilesMarketplace })));
const AboutUs = lazy(() => import('./components/AboutUs').then((module) => ({ default: module.AboutUs })));
const LazaTeam = lazy(() => import('./components/LazaTeam').then((module) => ({ default: module.LazaTeam })));
const Contact = lazy(() => import('./components/Contact').then((module) => ({ default: module.Contact })));
const AdminGate = lazy(() => import('./components/AdminGate').then((module) => ({ default: module.AdminGate })));

const advancedPaths: Record<string, string> = {
  'advanced-gdp-diversification': '/intelligence/oil-vs-non-oil-gdp',
  'advanced-oil-gas': '/intelligence/oil-gas-production',
  'advanced-fiscal-execution': '/intelligence/fiscal-execution',
  'advanced-sovereign-yield': '/intelligence/sovereign-yield-curve',
};

const institutionalPaths: Record<string, string> = { about: '/institutional/about', team: '/institutional/team', contacts: '/institutional/contacts' };
const officialIndicatorIds = ['gdp-growth', 'inflation-rate', 'exchange-rate', 'population', 'banking-assets', 'public-debt-gdp'];
const marketplaceTabs = ['kiluange', 'bwila', 'lukeni', 'ekuikui', 'njinga'];
const methodologyTabs = ['data-quality', 'scn-2008', 'cpi', 'gfs', 'bpm', 'edi', 'equity', 'bond', 'yield', 'fsi', 'traffic', 'macro-fiscal', 'external', 'banking', 'market', 'stress', 'benchmarks'];

function routeFromPath(pathname: string) {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const indicatorMatch = cleanPath.match(/^\/indicators\/([a-z0-9-]+)$/);
  if (indicatorMatch && officialIndicatorIds.includes(indicatorMatch[1])) return { tab: 'official-indicator-detail', indicatorId: indicatorMatch[1], admin: false };
  const advancedTab = Object.keys(advancedPaths).find((tab) => advancedPaths[tab] === cleanPath);
  if (advancedTab) return { tab: advancedTab, indicatorId: 'gdp-growth', admin: false };
  const institutionalTab = Object.keys(institutionalPaths).find((tab) => institutionalPaths[tab] === cleanPath);
  if (institutionalTab) return { tab: institutionalTab, indicatorId: 'gdp-growth', admin: false };
  if (cleanPath === '/indicators') return { tab: 'indicators', indicatorId: 'gdp-growth', admin: false };
  if (cleanPath === '/data') return { tab: 'data-intelligence', indicatorId: 'gdp-growth', admin: false };
  if (cleanPath === '/admin') return { tab: 'overview', indicatorId: 'gdp-growth', admin: true };
  const dataMatch = cleanPath.match(/^\/data\/([a-z0-9-]+)$/);
  if (dataMatch && marketplaceTabs.includes(dataMatch[1])) return { tab: dataMatch[1], indicatorId: 'gdp-growth', admin: false };
  const methodologyMatch = cleanPath.match(/^\/methodology\/([a-z0-9-]+)$/);
  if (methodologyMatch && methodologyTabs.includes(methodologyMatch[1])) return { tab: methodologyMatch[1], indicatorId: 'gdp-growth', admin: false };
  return { tab: 'overview', indicatorId: 'gdp-growth', admin: false };
}

function pathForTab(tab: string) {
  if (tab === 'overview') return '/';
  if (tab === 'indicators') return '/indicators';
  if (tab === 'data-intelligence') return '/data';
  if (advancedPaths[tab]) return advancedPaths[tab];
  if (institutionalPaths[tab]) return institutionalPaths[tab];
  if (marketplaceTabs.includes(tab)) return `/data/${tab}`;
  if (methodologyTabs.includes(tab)) return `/methodology/${tab}`;
  return '/';
}

function PageLoader() {
  return <div className="mx-auto max-w-[1400px] px-4 py-20 text-center text-sm text-muted-foreground" role="status">Loading LAZA content...</div>;
}

export default function App() {
  const initialRoute = routeFromPath(window.location.pathname);
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [showAdmin, setShowAdmin] = useState(initialRoute.admin);
  const [selectedOfficialIndicator, setSelectedOfficialIndicator] = useState(initialRoute.indicatorId);
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>(() => normalizePlan(window.localStorage.getItem('laza_subscription_plan')));
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeTab]);
  useEffect(() => { window.localStorage.setItem('laza_subscription_plan', subscriptionPlan); }, [subscriptionPlan]);
  useEffect(() => {
    const indicatorTitles: Record<string, string> = { 'gdp-growth': 'GDP Growth', 'inflation-rate': 'Inflation Rate', 'exchange-rate': 'Exchange Rate', population: 'Population', 'banking-assets': 'Banking Assets', 'public-debt-gdp': 'Public Debt/GDP' };
    const tabTitles: Record<string, string> = { overview: 'Data & Intelligence', indicators: 'All Indicators', 'data-intelligence': 'Official Source Marketplace', 'advanced-gdp-diversification': 'Oil vs. Non-Oil GDP', 'advanced-oil-gas': 'Oil & Gas Production', 'advanced-fiscal-execution': 'Fiscal Execution', 'advanced-sovereign-yield': 'Sovereign Yield Curve', about: 'About', team: 'Team', contacts: 'Contacts', 'data-quality': 'Data Quality Methodology' };
    const pageTitle = showAdmin ? 'Admin Panel' : activeTab === 'official-indicator-detail' ? indicatorTitles[selectedOfficialIndicator] : tabTitles[activeTab] ?? 'Data & Intelligence';
    document.title = `${pageTitle} | LAZA`;
  }, [activeTab, selectedOfficialIndicator, showAdmin]);
  useEffect(() => {
    const handlePopState = () => {
      const route = routeFromPath(window.location.pathname);
      setActiveTab(route.tab);
      setSelectedOfficialIndicator(route.indicatorId);
      setShowAdmin(route.admin);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const navigateTo = (tab: string) => {
    const targetPath = pathForTab(tab);
    if (window.location.pathname !== targetPath) window.history.pushState({}, '', targetPath);
    setShowAdmin(false);
    setActiveTab(tab);
  };

  const openOfficialIndicator = (indicatorId: string) => {
    const targetPath = `/indicators/${indicatorId}`;
    if (window.location.pathname !== targetPath) window.history.pushState({}, '', targetPath);
    setShowAdmin(false);
    setSelectedOfficialIndicator(indicatorId);
    setActiveTab('official-indicator-detail');
  };

  const openAdmin = () => {
    if (window.location.pathname !== '/admin') window.history.pushState({}, '', '/admin');
    setShowAdmin(true);
  };

  const previewAsPlan = (plan: SubscriptionPlan) => {
    setSubscriptionPlan(plan);
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
    setShowAdmin(false);
    setActiveTab('overview');
  };

  if (showAdmin) return <Suspense fallback={<PageLoader />}><AdminGate onBack={() => navigateTo('overview')} onPreviewPlan={previewAsPlan} /></Suspense>;

  return <div className="min-h-screen bg-background">
    <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-2 text-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
    <Header activeTab={activeTab} setActiveTab={navigateTo} />
    <div id="main-content" tabIndex={-1}>
    <Suspense fallback={<PageLoader />}>

    {activeTab === 'overview' && <><Hero onNavigate={navigateTo} onIndicatorSelect={openOfficialIndicator} /><main className="mx-auto max-w-[1400px] space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      <FeaturedInsights subscriptionPlan={subscriptionPlan} onUpgrade={() => setPricingOpen(true)} onNavigate={navigateTo} onIndicatorSelect={openOfficialIndicator} />
      <ExecutiveMarketPulse />
      <div id="official-indicators"><MetricsOverview summaryOnly subscriptionPlan={subscriptionPlan} onUpgrade={() => setPricingOpen(true)} onIndicatorSelect={openOfficialIndicator} /></div>
      <AdvancedIntelligenceCards subscriptionPlan={subscriptionPlan} onUpgrade={() => setPricingOpen(true)} onNavigate={navigateTo} />
      <TrustAndMethodology onNavigate={navigateTo} />
    </main></>}

    {activeTab === 'official-indicator-detail' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <button type="button" onClick={() => navigateTo('overview')} className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to overview
      </button>
      <MetricsOverview key={selectedOfficialIndicator} subscriptionPlan={subscriptionPlan} onUpgrade={() => setPricingOpen(true)} initialSelectedId={selectedOfficialIndicator} />
    </main>}

    {activeTab === 'indicators' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><IndicatorCatalog subscriptionPlan={subscriptionPlan} onUpgrade={() => setPricingOpen(true)} onNavigate={navigateTo} onIndicatorSelect={openOfficialIndicator} /></main>}

    {activeTab === 'data-intelligence' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><SourceFilesMarketplace subscriptionPlan={subscriptionPlan} onUpgrade={() => setPricingOpen(true)} /></main>}

    {advancedPage && <AdvancedIntelligencePage topic={advancedPage.topic} title={advancedPage.title} description={advancedPage.description} onBack={() => navigateTo('overview')}>{advancedPage.content}</AdvancedIntelligencePage>}

    {(['kiluange', 'bwila', 'lukeni', 'ekuikui', 'njinga'].includes(activeTab)) && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><DataMarketplace /></main>}

    {activeTab === 'data-quality' &&
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><DataQualityMethodology /></main>}

    {(['scn-2008', 'cpi', 'gfs', 'bpm', 'edi', 'equity', 'bond', 'yield', 'fsi', 'traffic', 'macro-fiscal', 'external', 'banking', 'market', 'stress', 'benchmarks'].includes(activeTab)) &&
      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><div className="rounded-lg border border-border bg-white p-6 shadow-sm"><h1 className="mb-2 text-3xl capitalize tracking-tight">{activeTab.replace('-', ' ')}</h1><p className="text-muted-foreground">Methodology and policy information under review.</p></div></main>}

    {activeTab === 'about' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><AboutUs /></main>}
    {activeTab === 'team' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><LazaTeam /></main>}
    {activeTab === 'contacts' && <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8"><Contact /></main>}
    </Suspense>
    </div>
    <Footer onNavigate={navigateTo} onAdmin={openAdmin} />
    <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} onSelectStarter={() => { setSubscriptionPlan('free'); setPricingOpen(false); }} />
  </div>;
}
