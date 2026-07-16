import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2 } from 'lucide-react';

export function FinancialSystemSection() {
  const bankingData = [
    { year: '2019', assets: 42.1, loans: 18.5, deposits: 28.2 },
    { year: '2020', assets: 38.9, loans: 16.2, deposits: 26.8 },
    { year: '2021', assets: 41.2, loans: 17.8, deposits: 28.9 },
    { year: '2022', assets: 44.6, loans: 19.4, deposits: 31.2 },
    { year: '2023', assets: 46.8, loans: 20.8, deposits: 33.5 },
    { year: '2024', assets: 48.2, loans: 21.9, deposits: 34.8 },
  ];

  const bankDistribution = [
    { name: 'Commercial Banks', value: 18, color: '#bf1f27' },
    { name: 'Investment Banks', value: 5, color: '#0ea5e9' },
    { name: 'Microfinance', value: 12, color: '#f59e0b' },
    { name: 'Other Financial', value: 8, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Financial System
            </h2>
            <p className="text-sm text-muted-foreground">Banking Sector Performance</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={bankingData}>
            <defs>
              <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#bf1f27" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#bf1f27" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="loansGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area
              type="monotone"
              dataKey="assets"
              stroke="#bf1f27"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#assetsGradient)"
              name="Total Assets ($ Billion)"
            />
            <Area
              type="monotone"
              dataKey="loans"
              stroke="#0ea5e9"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#loansGradient)"
              name="Total Loans ($ Billion)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-6">
          <h3 className="text-lg mb-1">Financial Institutions Distribution</h3>
          <p className="text-sm text-muted-foreground">Number of institutions by type</p>
        </div>

        <div className="flex items-center justify-between">
          <ResponsiveContainer width="50%" height={280}>
            <PieChart>
              <Pie
                data={bankDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {bankDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-3">
            {bankDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
