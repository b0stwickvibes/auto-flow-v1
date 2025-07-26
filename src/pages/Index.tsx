import React, { useState } from 'react';
import HeroSection from '@/components/HeroSection';
import Dashboard from '@/components/Dashboard';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  if (showDashboard) {
    return <Dashboard />;
  }

  return (
    <div className="relative">
      <HeroSection />
      {/* Demo Dashboard Access */}
      <div className="fixed bottom-8 right-8">
        <Button 
          variant="glow" 
          onClick={() => setShowDashboard(true)}
          className="shadow-2xl"
        >
          View Dashboard Demo
        </Button>
      </div>
    </div>
  );
};

export default Index;
