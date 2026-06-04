import React from 'react';
import { Building2, Truck, ShieldCheck, Users } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">About ShipFast</h1>
          <p className="mt-4 text-slate-600 leading-relaxed">
            ShipFast is a logistics platform built for end-to-end shipment lifecycle management, from booking and route assignment to delivery proof and reporting.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Branch & Hub Network</h2>
            </div>
            <p className="text-slate-600">Centralized operations across branches and hubs with role-based access for admins and agents.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Fleet and Delivery Ops</h2>
            </div>
            <p className="text-slate-600">Run-sheet driven execution, live status scans, and COD reconciliation support high-volume delivery operations.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Security and Auditability</h2>
            </div>
            <p className="text-slate-600">Authenticated APIs, role controls, and status history tracking maintain operational accountability.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Customer First</h2>
            </div>
            <p className="text-slate-600">Customers get transparent shipment tracking, invoice access, and support workflows from a single dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

