import { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { MetricsOverview } from './components/MetricsOverview';
import { OilGasIntelligence } from './components/OilGasIntelligence';
import { FiscalExecutionIntelligence } from './components/FiscalExecutionIntelligence';
import { SovereignYieldCurveIntelligence } from './components/SovereignYieldCurveIntelligence';
import { OilNonOilGdpIntelligence } from './components/OilNonOilGdpIntelligence';
import { EconomySection } from './components/EconomySection';
import { SocietySection } from './components/SocietySection';
import { FinancialSystemSection } from './components/FinancialSystemSection';
import { PublicFinanceSection } from './components/PublicFinanceSection';
import { DataMarketplace } from './components/DataMarketplace';
import { DataMarketplaceDesign } from './components/DataMarketplaceDesign';
import { FeaturedInsights } from './components/FeaturedInsights';
import { AboutUs } from './components/AboutUs';
import { LazaTeam } from './components/LazaTeam';
import { Contact } from './components/Contact';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  {/* MARKER-MAKE-KIT-INVOKED */}
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdmin, setShowAdmin] = useState(false);

  if (showAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      {/* Admin access button — fixed bottom-right */}
      <button
        onClick={() => setShowAdmin(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-white text-sm shadow-xl hover:bg-secondary/90 transition-colors"
        title="Open Admin Dashboard"
      >
        <span className="w-2 h-2 bg-primary rounded-full" />
        Admin Panel
      </button>

      {activeTab === 'overview' && (
        <>
          <Hero />

          <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-12 space-y-16">
            <MetricsOverview />

            <OilGasIntelligence />

            <FiscalExecutionIntelligence />

            <SovereignYieldCurveIntelligence />

            <OilNonOilGdpIntelligence />

            <FeaturedInsights />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <EconomySection />
              <SocietySection />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <FinancialSystemSection />
              <PublicFinanceSection />
            </div>
          </main>
        </>
      )}

      {activeTab === 'data-intelligence' && (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
          <DataMarketplaceDesign />
        </main>
      )}

      {(activeTab === 'kiluange' || activeTab === 'bwila' || activeTab === 'lukeni' ||
        activeTab === 'ekuikui' || activeTab === 'njinga') && (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
          <DataMarketplace />
        </main>
      )}

      {(activeTab === 'data-quality' || activeTab === 'scn-2008' || activeTab === 'cpi' ||
        activeTab === 'gfs' || activeTab === 'bpm' || activeTab === 'edi' || activeTab === 'equity' ||
        activeTab === 'bond' || activeTab === 'yield' || activeTab === 'fsi' || activeTab === 'traffic' ||
        activeTab === 'macro-fiscal' || activeTab === 'external' || activeTab === 'banking' ||
        activeTab === 'market' || activeTab === 'stress' || activeTab === 'benchmarks') && (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl tracking-tight mb-2 capitalize">{activeTab.replace('-', ' ')}</h1>
              <p className="text-muted-foreground">Methodology and policy information</p>
            </div>
            <EconomySection featured />
          </div>
        </main>
      )}

      {activeTab === 'about' && (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
          <AboutUs />
        </main>
      )}

      {activeTab === 'team' && (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
          <LazaTeam />
        </main>
      )}

      {activeTab === 'contacts' && (
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
          <Contact />
        </main>
      )}
    </div>
  );
}
