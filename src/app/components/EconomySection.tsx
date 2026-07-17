import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

export function EconomySection() {
  const gdpData = [
    { year: '2019', gdp: 88.8, growth: 0.2 },
    { year: '2020', gdp: 62.3, growth: -5.6 },
    { year: '2021', gdp: 66.5, growth: 1.2 },
    { year: '2022', gdp: 74.8, growth: 3.0 },
    { year: '2023', gdp: 82.1, growth: 2.9 },
    { year: '2024', gdp: 87.5, growth: 3.2 },
  ];

  const sectorData = [
    { sector: 'Oil & Gas', contribution: 32.5 },
    { sector: 'Agriculture', contribution: 12.8 },
    { sector: 'Services', contribution: 28.4 },
    { sector: 'Manufacturing', contribution: 8.6 },
    { sector: 'Construction', contribution: 6.2 },
    { sector: 'Other', contribution: 11.5 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Economy Overview
            </h2>
            <p className="text-sm text-muted-foreground">GDP & Economic Growth Trends</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={gdpData}>
            <defs>
              <linearGradient id="gdpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#bf1f27" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#bf1f27" stopOpacity={0} />
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
              dataKey="gdp"
              stroke="#bf1f27"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#gdpGradient)"
              name="GDP ($ Billion)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-6">
          <h3 className="text-lg mb-1">Sectoral Contribution to GDP</h3>
          <p className="text-sm text-muted-foreground">Breakdown by economic sector (%)</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sectorData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis dataKey="sector" type="category" width={100} stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="contribution" fill="#bf1f27" radius={[0, 4, 4, 0]} name="GDP %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
