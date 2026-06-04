import React from 'react';

const terms = [
  {
    title: 'Service Usage',
    body: 'Users must provide accurate shipment, pickup, and delivery details. Incorrect or incomplete data may delay fulfillment.'
  },
  {
    title: 'Shipment Restrictions',
    body: 'Illegal, hazardous, or prohibited goods must not be booked. ShipFast may reject or cancel non-compliant shipments.'
  },
  {
    title: 'Payment and Billing',
    body: 'Charges are calculated based on service level, weight, route zone, and applicable taxes or handling fees.'
  },
  {
    title: 'Delivery Attempts',
    body: 'Delivery status may change after failed attempts, recipient unavailability, or address verification issues.'
  },
  {
    title: 'Data and Privacy',
    body: 'Operational data is retained for service execution, audit, and support processes. Sensitive data is handled under access controls.'
  }
];

export function TermsPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mt-3 text-slate-600">These terms govern use of the ShipFast logistics platform.</p>

        <div className="mt-8 space-y-6">
          {terms.map((item) => (
            <section key={item.title}>
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="text-slate-600 mt-2 leading-relaxed">{item.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

