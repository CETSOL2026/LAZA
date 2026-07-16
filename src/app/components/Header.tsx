import { BarChart3, Database, FileText, Building, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import logoFull from '../../imports/Artboard_1_3.png';
import { PricingModal } from './PricingModal';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      hasDropdown: false
    },
    {
      id: 'data-intelligence',
      label: 'Data & Intelligence',
      icon: Database,
      hasDropdown: false,
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
    }, 150);
    setLeaveTimeout(timeout);
  };

  const handleStarterSelect = () => {
    setPricingOpen(false);
    setActiveTab('data-intelligence');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#bf1f27] border-b border-[#a81b22] shadow-sm">
        <div className="mx-auto max-w-[1400px] px-[32px] py-[10px]">
          <div className="flex h-16 items-center justify-between px-[0px] py-[20px]">
            <div className="flex items-center gap-12">
              <button onClick={() => setActiveTab('overview')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img src={logoFull} alt="LAZA" className="h-10" />
              </button>

              <nav className="hidden md:flex items-center gap-1">
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
                          if (item.id === 'data-intelligence') {
                            setPricingOpen(true);
                          } else if (!item.hasDropdown) {
                            setActiveTab(item.id);
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                          activeTab === item.id
                            ? 'bg-white/20 text-white'
                            : 'text-white/90 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                        {item.hasDropdown && <ChevronDown className="w-3 h-3" />}
                      </button>

                      {item.hasDropdown && openDropdown === item.id && (
                        <div className="absolute top-full left-0 mt-0.5 w-64 bg-white rounded-lg shadow-xl border border-border py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                          {item.dropdownItems?.map((dropdownItem) => (
                            <button
                              key={dropdownItem.id}
                              onClick={() => {
                                setActiveTab(dropdownItem.id);
                                setOpenDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-[#bf1f27]/5 hover:text-[#bf1f27] transition-colors"
                            >
                              {dropdownItem.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden sm:block px-4 py-2 rounded-lg border border-white/30 text-white text-sm hover:bg-white/10 transition-colors">
                API Access
              </button>
              <button className="px-5 py-2 rounded-lg bg-white text-[#bf1f27] text-sm hover:bg-white/90 transition-colors shadow-sm">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        onSelectStarter={handleStarterSelect}
      />
    </>
  );
}
