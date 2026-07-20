import { BarChart3, Database, FileText, Building, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import logoFull from '../../imports/Artboard_1_3.png';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const advancedTabs = ['advanced-gdp-diversification', 'advanced-oil-gas', 'advanced-fiscal-execution', 'advanced-sovereign-yield'];

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      hasDropdown: false
    },
    {
      id: 'indicators',
      label: 'Indicators',
      icon: BarChart3,
      hasDropdown: false
    },
    {
      id: 'data-intelligence',
      label: 'Data & Intelligence',
      icon: Database,
      hasDropdown: true,
      dropdownItems: [
        { id: 'data-intelligence', label: 'Data Marketplace', topic: 'Data Catalogue', description: 'Datasets, formats and access options' },
        { id: 'insights', label: 'Insights Library', topic: 'Executive Signals', description: 'Rule-generated insights with source evidence' },
        { id: 'advanced-gdp-diversification', label: 'Oil vs. Non-Oil GDP', topic: 'Macroeconomy & Diversification', description: 'Growth, contribution and economic structure' },
        { id: 'advanced-oil-gas', label: 'Oil & Gas Production', topic: 'Energy', description: 'Production, forecast and gas allocation' },
        { id: 'advanced-fiscal-execution', label: 'Fiscal Execution', topic: 'Public Finance', description: 'Revenue, expenditure and budget balance' },
        { id: 'advanced-sovereign-yield', label: 'Sovereign Yield Curve', topic: 'Capital Markets', description: 'Observed yields, spreads and curve shifts' },
      ],
    },
    {
      id: 'policies',
      label: 'Policies & Methodology',
      icon: FileText,
      hasDropdown: true,
      dropdownItems: [
        { id: 'data-quality', label: 'Data Quality Checks' },
        { id: 'equity', label: 'Laza Equity Index' },
        { id: 'edi', label: 'Laza Economic Diversification Index' },
      ]
    },
    {
      id: 'institutional',
      label: 'Institutional',
      icon: Building,
      hasDropdown: true,
      dropdownItems: [
        { id: 'about', label: 'About us' },
        { id: 'team', label: 'Laza team' },
        { id: 'contacts', label: 'Contacts' },
      ]
    },
  ];

  const handleMouseEnter = (itemId: string) => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      setLeaveTimeout(null);
    }
    setOpenDropdown(itemId);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
    }, 500);
    setLeaveTimeout(timeout);
  };

  const activate = (tab: string) => {
    setActiveTab(tab);
    setOpenDropdown(null);
    setMobileOpen(false);
  };

  return (
      <header className="sticky top-0 z-50 w-full bg-[#bf1f27] border-b border-[#a81b22] shadow-sm">
        <div className="mx-auto max-w-[1400px] px-[32px] py-[10px]">
          <div className="flex h-16 items-center justify-between px-[0px] py-[20px]">
            <div className="flex items-center gap-12">
              <button onClick={() => activate('overview')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img src={logoFull} alt="LAZA" className="h-10" />
              </button>

              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => item.hasDropdown && handleMouseEnter(item.id)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        onClick={() => {
                          if (item.hasDropdown) {
                            setOpenDropdown(openDropdown === item.id ? null : item.id);
                          } else {
                            activate(item.id);
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === item.id || (item.id === 'data-intelligence' && advancedTabs.includes(activeTab))
                            ? 'bg-white/20 text-white'
                            : 'text-white/90 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                        {item.hasDropdown && <ChevronDown className="w-3 h-3" />}
                      </button>

                      {item.hasDropdown && openDropdown === item.id && (
                        <div className={`absolute top-full left-0 mt-0 bg-white rounded-xl shadow-xl border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${item.id === 'data-intelligence' ? 'w-[390px]' : 'w-64'}`}>
                          {item.id === 'data-intelligence' && <div className="px-4 pb-2 pt-1"><p className="text-[11px] uppercase tracking-[0.16em] text-[#bf1f27]">Advanced Market Intelligence</p><p className="mt-1 text-xs text-muted-foreground">Official indicators organised by analytical topic</p></div>}
                          {item.dropdownItems?.map((dropdownItem, index) => (
                            <button
                              key={dropdownItem.id}
                              onClick={() => {
                                activate(dropdownItem.id);
                              }}
                              className={`group w-full border-t text-left transition-colors hover:bg-[#bf1f27]/5 ${index === 0 ? 'border-border/70' : 'border-transparent'} px-4 py-3`}
                            >
                              {'topic' in dropdownItem && <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{dropdownItem.topic}</span>}
                              <span className="mt-0.5 flex items-center justify-between gap-3 text-sm text-foreground group-hover:text-[#bf1f27]">{dropdownItem.label}<ChevronRight className="h-3.5 w-3.5 opacity-40" /></span>
                              {'description' in dropdownItem && <span className="mt-0.5 block text-xs text-muted-foreground">{dropdownItem.description}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <button onClick={() => activate('data-quality')} className="px-4 py-2 rounded-lg border border-white/30 text-white text-sm hover:bg-white/10 transition-colors">
                Methodology
              </button>
              <button onClick={() => activate('data-intelligence')} className="px-5 py-2 rounded-lg bg-white text-[#bf1f27] text-sm hover:bg-white/90 transition-colors shadow-sm">
                Browse Data
              </button>
            </div>
            <button type="button" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileOpen} className="rounded-lg border border-white/25 p-2.5 text-white transition-colors hover:bg-white/10 lg:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
          {mobileOpen && <nav className="border-t border-white/15 pb-4 pt-3 lg:hidden">
            {navItems.map((item) => { const Icon = item.icon; return <div key={item.id} className="py-1">
              <button type="button" onClick={() => !item.hasDropdown && activate(item.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white"><Icon className="h-4 w-4" />{item.label}</button>
              {item.hasDropdown && <div className="ml-6 grid gap-1 border-l border-white/15 pl-3">{item.dropdownItems?.map((dropdownItem) => <button type="button" key={dropdownItem.id} onClick={() => activate(dropdownItem.id)} className="rounded-lg px-3 py-2 text-left text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white">{dropdownItem.label}</button>)}</div>}
            </div>; })}
            <button type="button" onClick={() => activate('data-intelligence')} className="mt-3 w-full rounded-lg bg-white px-4 py-2.5 text-sm text-[#bf1f27]">Browse official data</button>
          </nav>}
        </div>
      </header>
  );
}
