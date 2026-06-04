import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export function ContactPage() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Contact Us</h1>
          <p className="mt-4 text-lg text-slate-600">
            Have questions? We're here to help. Reach out to our support team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Get in Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Our Office</h3>
                  <p className="text-slate-600 mt-1">
                    123 Logistics Avenue<br />
                    Tech Park, Suite 400<br />
                    New York, NY 10001
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Phone</h3>
                  <p className="text-slate-600 mt-1">
                    +91 9344474088<br />
                    +91 6384224845
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Mon-Fri 9am-6pm EST</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-pink-50 rounded-lg text-pink-600">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Email</h3>
                  <p className="text-slate-600 mt-1">
                    lingesw0561@gmail.com<br />
                    717823s115@kce.ac.in
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Working Hours</h3>
                  <p className="text-slate-600 mt-1">
                    Monday - Friday: 9:00 AM - 6:00 PM<br />
                    Saturday: 10:00 AM - 2:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map / Additional Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col justify-center items-center text-center">
             <div className="w-full h-64 bg-slate-100 rounded-xl mb-6 flex items-center justify-center text-slate-400">
                {/* Placeholder for map integration */}
                <span>Interactive Map Component</span>
             </div>
             <h3 className="text-lg font-semibold text-slate-900">Visit our Headquarters</h3>
             <p className="text-slate-600 mt-2">
               We are located in the heart of the city, easily accessible by public transport.
             </p>
             <button className="mt-6 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
               Get Directions
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}


