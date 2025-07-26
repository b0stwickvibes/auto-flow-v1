import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Mail, 
  HardDrive, 
  Github, 
  Terminal, 
  Play, 
  Pause, 
  Settings,
  Plus,
  Activity,
  Calendar,
  Clock,
  CheckCircle2
} from 'lucide-react';

const Dashboard = () => {
  const workflows = [
    {
      id: 1,
      name: "Gmail File Downloader",
      description: "Automatically download attachments from specific senders",
      status: "active",
      lastRun: "2 minutes ago",
      frequency: "Every 30 minutes",
      services: ["Gmail", "Google Drive"]
    },
    {
      id: 2,
      name: "Repository Setup Generator",
      description: "Generate terminal commands for project initialization",
      status: "paused",
      lastRun: "1 hour ago",
      frequency: "Manual trigger",
      services: ["GitHub", "Terminal"]
    },
    {
      id: 3,
      name: "Cloud Storage Organizer",
      description: "Sort and organize files across cloud storage platforms",
      status: "active",
      lastRun: "15 minutes ago",
      frequency: "Daily at 2 AM",
      services: ["Google Drive", "Dropbox"]
    }
  ];

  const integrations = [
    { name: "Gmail", icon: Mail, status: "connected", color: "text-red-400" },
    { name: "Google Drive", icon: HardDrive, status: "connected", color: "text-blue-400" },
    { name: "GitHub", icon: Github, status: "connected", color: "text-gray-400" },
    { name: "Terminal", icon: Terminal, status: "available", color: "text-green-400" },
  ];

  const recentActivity = [
    { action: "Downloaded 3 files from Gmail", time: "2 min ago", status: "success" },
    { action: "Generated deployment script", time: "1 hour ago", status: "success" },
    { action: "Organized 47 files in Drive", time: "2 hours ago", status: "success" },
    { action: "Authentication failed for Gmail", time: "6 hours ago", status: "error" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">AutoFlow</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="glow">
                <Plus className="w-4 h-4" />
                New Workflow
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-accent border-glass">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Workflows</p>
                      <p className="text-3xl font-bold text-foreground">12</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-accent border-glass">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tasks Today</p>
                      <p className="text-3xl font-bold text-foreground">47</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-accent border-glass">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Time Saved</p>
                      <p className="text-3xl font-bold text-foreground">2.4h</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Workflows */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Active Workflows</span>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage and monitor your automation workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-foreground">{workflow.name}</h3>
                        <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                          {workflow.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Last run: {workflow.lastRun}</span>
                        <span>•</span>
                        <span>{workflow.frequency}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon">
                        {workflow.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Integrations */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connected services and tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrations.map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <integration.icon className={`w-5 h-5 ${integration.color}`} />
                      <span className="font-medium text-foreground">{integration.name}</span>
                    </div>
                    <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                      {integration.status}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-4">
                  <Plus className="w-4 h-4" />
                  Add Integration
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest automation events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${activity.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;