import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import WorkflowService, { Workflow } from '../services/workflowService';
import WorkflowExecutionModal from './WorkflowExecutionModal';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executionModal, setExecutionModal] = useState<{
    isOpen: boolean;
    workflow: Workflow | null;
  }>({ isOpen: false, workflow: null });
  const { toast } = useToast();
  
  const workflowService = WorkflowService.getInstance();

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = () => {
    const allWorkflows = workflowService.getAllWorkflows();
    setWorkflows(allWorkflows);
  };

  const handleToggleWorkflow = (workflowId: string) => {
    const updatedWorkflow = workflowService.toggleWorkflowStatus(workflowId);
    if (updatedWorkflow) {
      loadWorkflows();
      toast({
        title: "Workflow Updated",
        description: `Workflow ${updatedWorkflow.status === 'active' ? 'activated' : 'paused'}`,
      });
    }
  };

  const handleExecuteWorkflow = (workflow: Workflow) => {
    if (workflow.actions.length === 0) {
      toast({
        title: "No Actions",
        description: "This workflow has no recorded actions to execute. Record some actions first.",
        variant: "destructive"
      });
      return;
    }
    
    setExecutionModal({ isOpen: true, workflow });
  };

  const handleExecutionComplete = (result: any) => {
    // Refresh workflows to update last run time
    loadWorkflows();
  };

  const stats = workflowService.getWorkflowStats();

  const integrations = [
    { name: "Gmail", icon: Mail, status: "connected", color: "text-red-400" },
    { name: "Google Drive", icon: HardDrive, status: "connected", color: "text-blue-400" },
    { name: "GitHub", icon: Github, status: "connected", color: "text-gray-400" },
    { name: "Terminal", icon: Terminal, status: "available", color: "text-green-400" },
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
                      <p className="text-3xl font-bold text-foreground">{stats.activeWorkflows}</p>
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
                      <p className="text-3xl font-bold text-foreground">{stats.recentExecutions}</p>
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
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-3xl font-bold text-foreground">{stats.successRate}%</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
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
                    <ExternalLink className="w-4 h-4 mr-2" />
                    <a href="/recorder">Create New</a>
                  </Button>
                </CardTitle>
                <CardDescription>
                  Manage and monitor your automation workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workflows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No workflows created yet</p>
                    <p className="text-sm">Record some actions to create your first workflow</p>
                    <Button variant="outline" className="mt-3">
                      <a href="/recorder" className="flex items-center">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Workflow
                      </a>
                    </Button>
                  </div>
                ) : (
                  workflows.map((workflow) => (
                    <div key={workflow.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-foreground">{workflow.name}</h3>
                          <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'}>
                            {workflow.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {workflow.actions.length} actions
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Last run: {workflow.lastRun || 'Never'}</span>
                          <span>•</span>
                          <span>{workflow.frequency || 'Manual trigger'}</span>
                          <span>•</span>
                          <span>Services: {workflow.services.join(', ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleExecuteWorkflow(workflow)}
                          disabled={workflow.actions.length === 0}
                          title={workflow.actions.length === 0 ? 'No actions to execute' : 'Execute workflow'}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleToggleWorkflow(workflow.id)}
                        >
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
                  ))
                )}
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
                {workflowService.getExecutionHistory().slice(0, 4).map((execution, index) => (
                  <div key={execution.id} className="flex items-start space-x-3 p-3 bg-muted/20 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      execution.status === 'completed' ? 'bg-green-400' : 
                      execution.status === 'failed' ? 'bg-red-400' : 
                      'bg-blue-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {execution.status === 'completed' ? 'Successfully executed' : 
                         execution.status === 'failed' ? 'Failed to execute' :
                         'Started executing'} workflow
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(execution.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {workflowService.getExecutionHistory().length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Workflow Execution Modal */}
        {executionModal.workflow && (
          <WorkflowExecutionModal
            isOpen={executionModal.isOpen}
            onClose={() => setExecutionModal({ isOpen: false, workflow: null })}
            workflowId={executionModal.workflow.id}
            workflowName={executionModal.workflow.name}
            actions={executionModal.workflow.actions}
            onExecutionComplete={handleExecutionComplete}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;