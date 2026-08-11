import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RevenueChart = () => {
  const data = [
    { month: 'Jan', revenue: 4000, users: 240 },
    { month: 'Feb', revenue: 3000, users: 139 },
    { month: 'Mar', revenue: 2000, users: 980 },
    { month: 'Apr', revenue: 2780, users: 390 },
    { month: 'May', revenue: 1890, users: 480 },
    { month: 'Jun', revenue: 2390, users: 380 },
    { month: 'Jul', revenue: 3490, users: 430 },
  ];

  return (
    <div className="panel p-5 sm:p-6 h-full">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink-950">Revenue overview</h3>
          <p className="text-sm text-ink-500 mt-0.5">Monthly revenue and user growth</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-brand-500 rounded-full" />
            <span className="text-xs font-medium text-ink-500">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-teal-600 rounded-full" />
            <span className="text-xs font-medium text-ink-500">Users</span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0891b2" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#0891b2" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="userFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3eaed" vertical={false} />
            <XAxis dataKey="month" stroke="#768e9d" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#768e9d" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(28,34,40,0.08)',
                borderRadius: '12px',
                boxShadow: '0 12px 40px rgba(28,34,40,0.1)',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#0891b2"
              strokeWidth={2.5}
              fill="url(#revFill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#0f766e"
              strokeWidth={2.5}
              fill="url(#userFill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RevenueChart;
