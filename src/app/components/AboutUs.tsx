import { Database, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import backgroundImg from '../../imports/Background_laza.png';

export function AboutUs() {
  const features = [
    {
      icon: Database,
      title: 'Curated Gold Data',
      description: 'Premium quality economic data curated from 50+ verified sources, ensuring accuracy and reliability for critical decisions.',
      color: 'text-[#bf1f27] bg-[#bf1f27]/5',
    },
    {
      icon: Zap,
      title: 'AI-Powered Insights',
      description: 'Advanced analytics powered by artificial intelligence, transforming raw data into actionable intelligence.',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Analytics',
      description: 'Live dashboards and instant updates on key economic indicators, financial markets, and social metrics.',
      color: 'text-green-600 bg-green-50',
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#bf1f27]/5 via-transparent to-blue-500/5 rounded-3xl -z-10"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12 px-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#bf1f27]/10 text-[#bf1f27] text-sm">Laza's Intelligence Hub<Database className="w-4 h-4" /></div>
            <h1 className="text-4xl lg:text-5xl tracking-tight">
              About <span className="text-[#DC2626]">LAZA</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">An integrated intelligence platform focused on Angola’s economic and social data.</p>
            <div className="space-y-4 text-muted-foreground">
              <p className="leading-relaxed">
                LAZA transforms complex Angolan economic and social data into accessible intelligence, empowering institutions, businesses, and individuals to make smarter decisions through trusted analytics and real-time insights.
              </p>
              <p className="leading-relaxed">Our platform serves as the single              point of access for Angola's economic landscape, combining cutting-edge technology with deep local expertise to deliver unparalleled market intelligence and data-driven insights.</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#bf1f27]/20 to-blue-500/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-border p-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#bf1f27]/10 rounded-xl">
                    <BarChart3 className="w-8 h-8 text-[#bf1f27]" />
                  </div>
                  <div>
                    <p className="text-3xl">50+</p>
                    <p className="text-sm text-muted-foreground">Data Sources</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Database className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl">100K+</p>
                    <p className="text-sm text-muted-foreground">Data Points</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl">Daily</p>
                    <p className="text-sm text-muted-foreground">Updates</p>
                  </div>
                </div>
              </div>

              {/* Decorative data visualization */}
              <div className="mt-8 pt-8 border-t border-border">
                <div className="flex items-end justify-between h-32 gap-2">
                  {[65, 78, 45, 89, 72, 95, 68, 82].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-[#bf1f27] to-[#bf1f27]/30 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                  ))}
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">Economic Performance Indicators</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl tracking-tight">Why Choose LAZA</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powered by advanced technology and deep expertise in Angolan markets
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-2xl border border-border p-8 hover:shadow-xl hover:border-[#bf1f27]/20 transition-all group cursor-pointer"
              >
                <div className={`inline-flex p-4 rounded-xl ${feature.color} mb-4`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl mb-3 group-hover:text-[#bf1f27] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mission Statement */}
      <div className="relative bg-gradient-to-br from-[#bf1f27] to-[#8a0d1f] rounded-3xl p-12 text-white">
        <div className="absolute inset-0 rounded-3xl bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${backgroundImg})` }}></div>
        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl lg:text-4xl">How do we add value?</h2>
          <p className="text-xl leading-relaxed opacity-95 text-left">
            1. Consolidation (single point of access): one login replaces surfing multiple sites.<br /><br />
            2. Timeliness and Efficiency: automated curated data reduces the lag between accessing, downloading, preparing and analyzing information.<br /><br />
            3. Intelligence: beyond data, Laza produces proprietary analytical products, that transform data into actionable insight. Ex: Economic Diversification Index, Equity Index, etc.
          </p>
        </div>
      </div>
    </div>
  );
}
