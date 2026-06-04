import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function PlaceholderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const getPageTitle = () => {
    switch(location.pathname) {
      case '/privacy': return 'Privacy Policy';
      case '/terms': return 'Terms of Service';
      case '/contact': return 'Contact Us';
      default: return 'Page Under Construction';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">{getPageTitle()}</h1>
        <p className="text-slate-600 mb-8">
          This page is currently under development. Please check back later for updates.
        </p>
        <Button onClick={() => navigate(-1)} className="flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
}


