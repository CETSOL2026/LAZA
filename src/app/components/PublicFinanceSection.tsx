import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart } from 'recharts';
import { Wallet } from 'lucide-react';

export function PublicFinanceSection() {
  const budgetData = [
    { year: '2019', revenue: 28.5, expenditure: 32.8, deficit: -4.3 },
    { year: '2020', revenue: 22.1, expenditure: 28.4, deficit: -6.3 },
    { year: '2021', revenue: 25.8, expenditure: 30.2, deficit: -4.4 },
    { year: '2022', revenue: 29.4, expenditure: 32.6, deficit: -3.2 },
    { year: '2023', revenue: 31.2, expenditure: 34.8, deficit: -3.6 },
    { year: '2024', revenue: 33.8, expenditure: 36.5, deficit: -2.7 },
  ];

  const expenditureBreakdown = [
    { category: 'Education', amount: 5.8 },
    { category: 'Healthcare', amount: 4.2 },
    { category: 'Infrastructure', amount: 8.5 },
    { category: 'Defense', amount: 6.1 },
    { category: 'Social Services', amount: 4.9 },
    { category: 'Debt Service', amount: 7.0 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl mb-1 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Public Finance
            </h2>
            <p className="text-sm text-muted-foreground">Government Budget & Fiscal Position</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={budgetData}>
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
            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue ($ Billion)" />
            <Bar dataKey="expenditure" fill="#bf1f27" radius={[4, 4, 0, 0]} name="Expenditure ($ Billion)" />
            <Line
              type="monotone"
              dataKey="deficit"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
              name="Deficit ($ Billion)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-6">
          <h3 className="text-lg mb-1">Government Expenditure by Sector</h3>
          <p className="text-sm text-muted-foreground">Budget allocation ($ Billion)</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={expenditureBreakdown} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis dataKey="category" type="category" width={100} stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Amount ($ Billion)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
