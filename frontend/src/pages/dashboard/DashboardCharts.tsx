import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface DashboardChartsProps {
  revenueTrend: Array<{ date: string; revenue: number }>;
  sourceBreakdown: Array<{ source: string; count: number }>;
}

const COLORS = ['#a9752e', '#b7893e', '#3f846c', '#568294', '#826a96', '#b95f55'];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ revenueTrend, sourceBreakdown }) => (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div><span className="kicker">Financial Analytics</span><h3 className="font-serif text-lg font-medium text-hotel-text">Revenue & Room Nights Trend</h3></div>
        <div className="flex items-center gap-4 text-xs"><span className="flex items-center gap-1.5 text-hotel-accent"><span className="h-2 w-2 rounded-full bg-hotel-accent" />Revenue (BDT)</span><span className="flex items-center gap-1.5 text-hotel-gold"><span className="h-2 w-2 rounded-full bg-hotel-gold" />Rooms Sold</span></div>
      </div>
      <div className="mt-6 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueTrend}><defs><linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a9752e" stopOpacity={0.3} /><stop offset="95%" stopColor="#a9752e" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="date" stroke="#a49a8f" fontSize={11} tickLine={false} /><YAxis stroke="#a49a8f" fontSize={11} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip contentStyle={{ backgroundColor: '#fffefb', color: '#20352f', border: '1px solid #d8ded9', borderRadius: '8px', fontSize: '11px' }} formatter={(value) => [`${Number(value).toLocaleString()} BDT`, 'Revenue']} /><Area type="monotone" dataKey="revenue" stroke="#a9752e" strokeWidth={2} fillOpacity={1} fill="url(#revenueGrad)" /></AreaChart></ResponsiveContainer></div>
    </div>
    <div className="rounded-2xl border border-hotel-line bg-hotel-panel p-6">
      <div><span className="kicker">Distribution Channels</span><h3 className="font-serif text-lg font-medium text-hotel-text">Reservation Source Mix</h3></div>
      <div className="mt-4 flex h-48 items-center justify-center"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sourceBreakdown} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4}>{sourceBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#fffefb', color: '#20352f', border: '1px solid #d8ded9', borderRadius: '8px', fontSize: '11px' }} /></PieChart></ResponsiveContainer></div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">{sourceBreakdown.map((item, index) => <div key={item.source} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="capitalize text-hotel-muted">{item.source}:</span><span className="font-semibold text-hotel-text">{item.count}</span></div>)}</div>
    </div>
  </div>
);
