import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

export function FeaturedInsights() {
  const insights = [
    {
      title: 'Economic Diversification Index',
      description: 'Angolan economy shows signs of further diversification',
      trend: 'positive',
      icon: TrendingUp,
      metric: '+3.2%',
      color: 'text-green-600 bg-green-50',
    },
    {
      title: 'Laza Equity Index',
      description: 'Laza Equity Index fell by 2.1% in today\'s trading',
      trend: 'positive',
      icon: TrendingDown,
      metric: '-2.1%',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Banking Sector Growth',
      description: 'Total banking assets increase by 5.4% reaching $48.2B',
      trend: 'positive',
      icon: CheckCircle,
      metric: '+5.4%',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Fiscal Deficit Narrows',
      description: 'Government budget deficit improves to 2.7% of GDP',
      trend: 'alert',
      icon: AlertCircle,
      metric: '2.7%',
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl tracking-tight mb-1">Featured Insights</h2>
          <p className="text-muted-foreground">Check our Insights on the economy and financial markets</p>
        </div>
        <button className="text-sm text-primary hover:underline">View All</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div
              key={index}
              className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${insight.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-sm px-2 py-1 rounded-full ${insight.color}`}>
                  {insight.metric}
                </span>
              </div>
              <h3 className="text-base mb-2 group-hover:text-primary transition-colors">
                {insight.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
