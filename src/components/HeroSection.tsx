import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, Clock, Workflow } from 'lucide-react';
import heroImage from '@/assets/hero-automation.jpg';

const HeroSection = () => {
  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Automate tasks in seconds, not hours"
    },
    {
      icon: Shield,
      title: "Secure & Reliable", 
      description: "Enterprise-grade security for your workflows"
    },
    {
      icon: Clock,
      title: "Save Time",
      description: "Reclaim hours every day with smart automation"
    },
    {
      icon: Workflow,
      title: "Visual Builder",
      description: "Drag-and-drop workflow creation"
    }
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-secondary opacity-50" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">AutoFlow</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost">Login</Button>
            <Button variant="glow">Get Started</Button>
          </div>
        </header>

        {/* Hero Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 bg-glass border border-glass rounded-full px-4 py-2 backdrop-blur-md">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">Streamline Your Daily Workflows</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">Automate</span>
                <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">Everything</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Connect your favorite apps, automate repetitive tasks, and reclaim your time. 
                From Gmail to GitHub, terminal commands to file organization - do it all in one place.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="glow" size="lg" className="group">
                <a href="/recorder" className="flex items-center">
                  Start Recording
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button variant="glass" size="lg">
                <a href="/?dashboard" className="flex items-center">
                  View Dashboard
                </a>
              </Button>
            </div>

            <div className="flex items-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span>Setup in 2 minutes</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative bg-glass border border-glass rounded-2xl p-8 backdrop-blur-md shadow-card">
              <img 
                src={heroImage} 
                alt="Automation Platform Dashboard" 
                className="w-full h-auto rounded-xl shadow-primary"
              />
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                <Zap className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group text-center space-y-4">
              <div className="w-16 h-16 bg-glass border border-glass rounded-2xl flex items-center justify-center mx-auto backdrop-blur-md group-hover:shadow-glow transition-all duration-300">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-32 text-center bg-glass border border-glass rounded-3xl p-12 backdrop-blur-md">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to automate your workflow?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who save hours every week with intelligent automation.
          </p>
          <Button variant="glow" size="lg" className="group">
            Get Started Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;