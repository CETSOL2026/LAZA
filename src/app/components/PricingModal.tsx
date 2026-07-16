import { X, Check, Minus, Zap, Building2, Rocket } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStarter: () => void;
}

const features = [
  {
    label: 'Dashboards & reports',
    icon: '📊',
    starter: '3 core, sampled',
    professional: 'All standard',
    enterprise: 'All + 1 customized',
  },
  {
    label: 'Data history depth',
    icon: '📅',
    starter: 'Latest period',
    professional: '3 years',
    enterprise: 'Full archive',
  },
  {
    label: 'Refresh frequency',
    icon: '🔄',
    starter: 'Monthly',
    professional: 'Weekly',
    enterprise: 'Daily / real-time',
  },
  {
    label: 'API access',
    icon: '⚡',
    starter: null,
    professional: '10k calls/mo incl.',
    enterprise: '100k calls/mo incl.',
  },
  {
    label: 'Dataset downloads',
    icon: '⬇️',
    starter: 'Samples only',
    professional: 'Standard',
    enterprise: 'Premium + exclusive',
  },
  {
    label: 'Metered usage overage',
    icon: '📈',
    starter: null,
    professional: 'Pay-as-you-go',
    enterprise: 'Volume discounts',
  },
  {
    label: 'Premium data licensing',
    icon: '🔒',
    starter: null,
    professional: 'Add-on',
    enterprise: 'Included, negotiated',
  },
  {
    label: 'Support & SLA',
    icon: '🛟',
    starter: 'Community',
    professional: 'Email, business hrs',
    enterprise: 'Dedicated + advisory',
  },
  {
    label: 'Users',
    icon: '👥',
    starter: '1',
    professional: 'Up to 5',
    enterprise: 'Unlimited',
  },
];

function CellValue({ value }: { value: string | null }) {
  if (value === null) {
    return <Minus className="w-4 h-4 text-gray-300 mx-auto" />;
  }
  return <span className="text-sm text-gray-700">{value}</span>;
}

export function PricingModal({ isOpen, onClose, onSelectStarter }: PricingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => modalRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl outline-none"
        style={{ animation: 'scaleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-6 flex items-start justify-between rounded-t-2xl">
          <div>
            <h2 id="pricing-title" className="text-2xl font-semibold text-gray-900">
              Pricing &amp; Commercial Model
            </h2>
            <p className="text-sm text-gray-500 mt-1">Hybrid pricing, packaged by features</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#bf1f27]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing columns header */}
        <div className="px-8 pt-6 pb-2">
          <div className="grid grid-cols-4 gap-4">
            {/* Feature label column */}
            <div />

            {/* Starter */}
            <div className="rounded-xl border border-gray-200 p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Rocket className="w-5 h-5 text-gray-500" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Starter</div>
              <div className="text-2xl font-bold text-gray-900">Free</div>
              <div className="text-xs text-gray-400 mt-1 mb-4">No credit card required</div>
              <button
                onClick={onSelectStarter}
                className="w-full py-2 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#bf1f27]"
              >
                Get Started
              </button>
            </div>

            {/* Professional */}
            <div className="rounded-xl border-2 border-[#bf1f27] p-5 flex flex-col items-center text-center relative shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-b from-[#bf1f27]/5 to-white">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#bf1f27] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow">
                  Most Popular
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#bf1f27]/10 flex items-center justify-center mb-3 mt-2">
                <Zap className="w-5 h-5 text-[#bf1f27]" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#bf1f27] mb-1">Professional</div>
              <div className="text-2xl font-bold text-gray-900">Paid Tier</div>
              <div className="text-xs text-gray-400 mt-1 mb-4">Billed monthly or annually</div>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-lg bg-[#bf1f27] text-white text-sm font-medium hover:bg-[#a81b22] transition-colors focus:outline-none focus:ring-2 focus:ring-[#bf1f27] focus:ring-offset-2"
              >
                Contact Sales
              </button>
            </div>

            {/* Enterprise */}
            <div className="rounded-xl border border-gray-200 p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-gray-900/5 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5 text-gray-700" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Enterprise</div>
              <div className="text-2xl font-bold text-gray-900">Custom</div>
              <div className="text-xs text-gray-400 mt-1 mb-4">Volume &amp; bespoke pricing</div>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-lg border border-gray-800 text-sm font-medium text-gray-800 hover:bg-gray-900 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>

        {/* Feature rows */}
        <div className="px-8 pb-8 mt-4">
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            {features.map((feature, idx) => (
              <div
                key={feature.label}
                className={`grid grid-cols-4 gap-4 items-center px-4 py-3.5 ${
                  idx % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'
                }`}
              >
                {/* Label */}
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{feature.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                </div>
                {/* Starter */}
                <div className="text-center">
                  <CellValue value={feature.starter} />
                </div>
                {/* Professional */}
                <div className="text-center relative">
                  <div className="absolute inset-0 bg-[#bf1f27]/[0.03] rounded" />
                  {feature.professional !== null ? (
                    <span className="text-sm font-medium text-[#bf1f27] relative">{feature.professional}</span>
                  ) : (
                    <Minus className="w-4 h-4 text-gray-300 mx-auto relative" />
                  )}
                </div>
                {/* Enterprise */}
                <div className="text-center">
                  <CellValue value={feature.enterprise} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            All plans include access to public macroeconomic data. Enterprise pricing negotiated directly.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  );
}
