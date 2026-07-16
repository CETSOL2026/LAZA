import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users } from 'lucide-react';

interface SocietySectionProps {
  featured?: boolean;
}

export function SocietySection({ featured = false }: SocietySectionProps) {
  const populationData = [
    { year: '2019', population: 31.2, urbanization: 65.3 },
    { year: '2020', population: 32.1, urbanization: 66.1 },
    { year: '2021', population: 33.0, urbanization: 66.8 },
    { year: '2022', population: 33.9, urbanization: 67.5 },
    { year: '2023', population: 34.8, urbanization: 68.2 },
    { year: '2024', population: 35.6, urbanization: 68.9 },
  ];

  const socialIndicators = [
    { indicator: 'Literacy Rate', value: 71.1 },
    { indicator: 'Life Expectancy', value: 61.6 },
    { indicator: 'Primary Education', value: 85.4 },
    { indicator: 'Healthcare Access', value: 48.2 },
    { indicator: 'Internet Penetration', value: 33.8 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Society Indicators
            </h2>
            <p className="text-sm text-muted-foreground">Population & Urbanization Trends</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={populationData}>
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
            <Line
              type="monotone"
              dataKey="population"
              stroke="#bf1f27"
              strokeWidth={2}
              dot={{ fill: '#bf1f27', r: 4 }}
              name="Population (M)"
            />
            <Line
              type="monotone"
              dataKey="urbanization"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ fill: '#0ea5e9', r: 4 }}
              name="Urbanization (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-6">
          <h3 className="text-lg mb-1">Social Development Metrics</h3>
          <p className="text-sm text-muted-foreground">Key social indicators (%)</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={socialIndicators}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="indicator" stroke="#6b7280" style={{ fontSize: '11px' }} angle={-15} textAnchor="end" height={80} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Value %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
