import React from 'react';

export function PrivacyPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mt-4 text-slate-600 leading-relaxed">
          ShipFast collects only operational data needed to fulfill shipments, support users, and generate business reports.
          Personal details such as name, contact, and shipment addresses are used strictly for order lifecycle and support.
        </p>
        <div className="mt-6 space-y-4 text-slate-600">
          <p>1. We store shipment metadata, status events, and account-level profile details.</p>
          <p>2. Access is controlled by user role (customer, agent, admin).</p>
          <p>3. We do not sell personal data to third parties.</p>
          <p>4. Users can request profile updates through the settings page.</p>
        </div>
      </div>
    </div>
  );
}

