import React, { useState } from 'react';
import HeroSection from '@/components/HeroSection';
import Dashboard from '@/components/Dashboard';
import { Button } from '@/components/ui/button';
import { useLocation } from 'react-router-dom';

const Index = () => {
  const location = useLocation();
  const showDashboard = location.search.includes('dashboard');

  if (showDashboard) {
    return <Dashboard />;
  }

  return (
    <div className="relative">
      <HeroSection />
    </div>
  );
};

export default Index;
