import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Download, FileText, CheckCircle2, Clock, Ban } from 'lucide-react';

export function CustomerReports() {
  const [dateRange, setDateRange] = useState('This Month');

  // Mock stats data
  const stats = [
    { label: 'Total Shipments', value: '48', icon: BarChart3, color: 'purple' },
    { label: 'Total Spent', value: '\u20b912,450', icon: TrendingUp, color: 'pink' },
    { label: 'Delivery Rate', value: '98.5%', icon: CheckCircle2, color: 'green' },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500">Track your shipping performance and expenses</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option>This Month</option>
              <option>Last Month</option>
              <option>Last 3 Months</option>
              <option>This Year</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors">
            <FileText className="w-4 h-4" />
            Download Report
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110`} />
            <div className="flex items-center gap-4 relative z-10">
              <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm text-slate-500">{stat.label}</div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-green-600 bg-green-50 w-fit px-2 py-1 rounded-full relative z-10">
              <TrendingUp className="w-3 h-3" />
              <span>+12% vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Shipment Breakdown */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Shipment Status Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-slate-700">Delivered</span>
              </div>
              <span className="font-bold text-slate-900">32</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-slate-700">In Transit</span>
              </div>
              <span className="font-bold text-slate-900">12</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
              <div className="flex items-center gap-3">
                <Ban className="w-5 h-5 text-red-600" />
                <span className="font-medium text-slate-700">Cancelled</span>
              </div>
              <span className="font-bold text-slate-900">4</span>
            </div>
          </div>
        </div>

        {/* Recent Costs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Monthly Expenses</h3>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
             {/* Mock Bar Chart */}
             {[40, 65, 45, 80, 55, 90].map((h, i) => (
               <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                 <div className="w-full bg-purple-100 rounded-t-lg relative group-hover:bg-purple-600 transition-colors" style={{ height: `${h}%` }}>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                     &#8377;{h * 150}
                   </div>
                 </div>
                 <span className="text-xs text-slate-500 font-medium">
                   {['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                 </span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}


