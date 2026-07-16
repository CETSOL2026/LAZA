import { Database, Download, Calendar, TrendingUp, Users, Building2, Wallet, Search } from 'lucide-react';
import { useState } from 'react';

export function DataMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Data' },
    { id: 'economy', label: 'Economy' },
    { id: 'society', label: 'Society' },
    { id: 'finance', label: 'Finance' },
    { id: 'public', label: 'Public Finance' },
  ];

  const datasets = [
    {
      id: 1,
      title: 'GDP & Economic Indicators',
      description: 'Comprehensive economic data including GDP, inflation, exchange rates, and sectoral contributions.',
      category: 'economy',
      icon: TrendingUp,
      lastUpdated: '2024-05-01',
      downloads: 1248,
      format: 'CSV, JSON, Excel',
      frequency: 'Quarterly',
      price: 'Free',
    },
    {
      id: 2,
      title: 'Population & Demographics',
      description: 'Detailed population statistics, urbanization trends, age distribution, and regional breakdown.',
      category: 'society',
      icon: Users,
      lastUpdated: '2024-04-28',
      downloads: 892,
      format: 'CSV, JSON',
      frequency: 'Annual',
      price: 'Free',
    },
    {
      id: 3,
      title: 'Banking Sector Data',
      description: 'Banking assets, loans, deposits, interest rates, and financial institution performance metrics.',
      category: 'finance',
      icon: Building2,
      lastUpdated: '2024-05-03',
      downloads: 654,
      format: 'CSV, JSON, Excel',
      frequency: 'Monthly',
      price: '$49/month',
    },
    {
      id: 4,
      title: 'Government Budget & Expenditure',
      description: 'Public finance data including revenue, expenditure, deficit, and sectoral budget allocation.',
      category: 'public',
      icon: Wallet,
      lastUpdated: '2024-04-30',
      downloads: 723,
      format: 'CSV, JSON',
      frequency: 'Annual',
      price: 'Free',
    },
    {
      id: 5,
      title: 'Trade & Export Statistics',
      description: 'International trade data, export/import values, trading partners, and commodity breakdown.',
      category: 'economy',
      icon: TrendingUp,
      lastUpdated: '2024-05-02',
      downloads: 534,
      format: 'CSV, Excel',
      frequency: 'Monthly',
      price: '$29/month',
    },
    {
      id: 6,
      title: 'Education & Healthcare Metrics',
      description: 'Social indicators covering education enrollment, literacy rates, healthcare access, and outcomes.',
      category: 'society',
      icon: Users,
      lastUpdated: '2024-04-25',
      downloads: 412,
      format: 'CSV, JSON',
      frequency: 'Annual',
      price: 'Free',
    },
  ];

  const filteredDatasets = datasets.filter((dataset) => {
    const matchesCategory = selectedCategory === 'all' || dataset.category === selectedCategory;
    const matchesSearch = dataset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dataset.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight mb-2">Data Marketplace</h1>
        <p className="text-muted-foreground">
          Access curated datasets on Angola's economy, society, and finance
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDatasets.map((dataset) => {
          const Icon = dataset.icon;
          return (
            <div
              key={dataset.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary/20 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-md bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg mb-1 group-hover:text-primary transition-colors">{dataset.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-muted capitalize">
                        {dataset.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded ${
                        dataset.price === 'Free' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {dataset.price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {dataset.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Format</p>
                  <p>{dataset.format}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Update Frequency</p>
                  <p>{dataset.frequency}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dataset.lastUpdated}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Downloads</p>
                  <p className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {dataset.downloads.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button className="px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors">
                  Preview
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDatasets.length === 0 && (
        <div className="text-center py-12">
          <Database className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No datasets found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
