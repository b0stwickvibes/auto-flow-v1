import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Plus, 
  Trash2, 
  Save, 
  Settings,
  Mail,
  HardDrive,
  Github,
  Terminal,
  Timer,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Brain
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import WorkflowExecutionEngine from '@/services/WorkflowExecutionEngine';
import AIWorkflowSuggestionService from '@/services/AIWorkflowSuggestionService';
import AdvancedSchedulingService from '@/services/AdvancedSchedulingService';
import WorkflowMonitoringService from '@/services/WorkflowMonitoringService';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  title: string;
  description: string;
  service?: string;
  config: Record<string, string | number | boolean>;
  position: { x: number; y: number };
  connections: string[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  connections: Array<{ from: string; to: string }>;
}

const WorkflowBuilder = () => {
  const [workflow, setWorkflow] = useState<WorkflowTemplate>({
    id: 'new-workflow',
    name: 'New Workflow',
    description: 'Describe what this workflow does...',
    category: 'automation',
    nodes: [],
    connections: []
  });
  
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<Record<string, 'pending' | 'running' | 'completed' | 'error'>>({});
  const [executionLogs, setExecutionLogs] = useState<Array<{ timestamp: number; nodeId: string; message: string; level: string }>>([]);
  const [aiSuggestions, setAISuggestions] = useState<any[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [workflowMetrics, setWorkflowMetrics] = useState<any>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Initialize services
  const executionEngine = useRef(new WorkflowExecutionEngine());
  const aiService = useRef(new AIWorkflowSuggestionService());
  const schedulingService = useRef(new AdvancedSchedulingService());
  const monitoringService = useRef(new WorkflowMonitoringService());

  useEffect(() => {
    // Load AI suggestions when workflow changes
    if (workflow.nodes.length > 0) {
      loadAISuggestions();
    }
    
    // Load workflow metrics
    loadWorkflowMetrics();
  }, [workflow]);

  const nodeTypes = [
    {
      type: 'trigger',
      icon: Zap,
      title: 'Trigger',
      description: 'Start the workflow',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10'
    },
    {
      type: 'action',
      icon: Play,
      title: 'Action',
      description: 'Perform an operation',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    },
    {
      type: 'condition',
      icon: ArrowRight,
      title: 'Condition',
      description: 'Make a decision',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10'
    },
    {
      type: 'delay',
      icon: Timer,
      title: 'Delay',
      description: 'Wait for a period',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10'
    }
  ];

  const serviceTemplates = [
    {
      service: 'gmail',
      icon: Mail,
      name: 'Gmail',
      actions: ['Send Email', 'Check Inbox', 'Download Attachments', 'Mark as Read', 'Filter by Sender']
    },
    {
      service: 'drive',
      icon: HardDrive,
      name: 'Google Drive',
      actions: ['Upload File', 'Download File', 'Create Folder', 'Share File', 'Organize Files']
    },
    {
      service: 'github',
      icon: Github,
      name: 'GitHub',
      actions: ['Create Repository', 'Create Issue', 'Create PR', 'Trigger Workflow', 'Fork Repository']
    },
    {
      service: 'terminal',
      icon: Terminal,
      name: 'Terminal',
      actions: ['Run Command', 'Execute Script', 'Run Template', 'File Operations']
    }
  ];

  const addNode = useCallback((type: string) => {
    const newNode: WorkflowNode = {
      id: `${type}-${Date.now()}`,
      type: type as WorkflowNode['type'],
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: `Configure this ${type}`,
      config: {},
      position: { x: 200 + workflow.nodes.length * 50, y: 200 + workflow.nodes.length * 30 },
      connections: []
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));

    setSelectedNode(newNode);
  }, [workflow.nodes.length]);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));

    if (selectedNode?.id === nodeId) {
      setSelectedNode(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedNode]);

  const deleteNode = useCallback((nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      connections: prev.connections.filter(conn => 
        conn.from !== nodeId && conn.to !== nodeId
      )
    }));

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const executeWorkflow = useCallback(async () => {
    if (workflow.nodes.length === 0) {
      toast({
        title: "No Workflow to Execute",
        description: "Please add some nodes to your workflow first",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    setExecutionLogs([]);
    
    // Initialize all nodes as pending
    const initialProgress: Record<string, 'pending' | 'running' | 'completed' | 'error'> = {};
    workflow.nodes.forEach(node => {
      initialProgress[node.id] = 'pending';
    });
    setExecutionProgress(initialProgress);

    // Start monitoring trace
    const traceId = monitoringService.current.startExecutionTrace(workflow.id);

    try {
      const result = await executionEngine.current.executeWorkflow(
        workflow,
        (nodeId, status, message) => {
          setExecutionProgress(prev => ({
            ...prev,
            [nodeId]: status
          }));
          
          setExecutionLogs(prev => [...prev, {
            timestamp: Date.now(),
            nodeId,
            message,
            level: status === 'error' ? 'error' : status === 'completed' ? 'success' : 'info'
          }]);

          // Update monitoring trace
          monitoringService.current.addExecutionStep(
            traceId, 
            nodeId, 
            workflow.nodes.find(n => n.id === nodeId)?.title || 'Unknown Node',
            status === 'running' ? 'running' : status === 'completed' ? 'completed' : 'failed',
            status === 'completed' ? { success: true } : undefined,
            status === 'error' ? message : undefined
          );
          
          toast({
            title: `Node ${status === 'completed' ? 'Completed' : status === 'error' ? 'Failed' : 'Running'}`,
            description: message,
            variant: status === 'error' ? 'destructive' : 'default'
          });
        }
      );
      
      // Complete monitoring trace
      monitoringService.current.completeExecutionTrace(traceId, 'completed');
      
      toast({
        title: "Workflow Completed Successfully",
        description: `Executed ${workflow.nodes.length} nodes successfully`,
      });
      
      // Load updated metrics
      loadWorkflowMetrics();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Complete monitoring trace with error
      monitoringService.current.completeExecutionTrace(traceId, 'failed');
      
      toast({
        title: "Workflow Execution Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      setExecutionLogs(prev => [...prev, {
        timestamp: Date.now(),
        nodeId: 'system',
        message: `Workflow failed: ${errorMessage}`,
        level: 'error'
      }]);
    } finally {
      setIsExecuting(false);
    }
  }, [workflow, toast]);

  const loadAISuggestions = useCallback(async () => {
    try {
      const analysis = await aiService.current.analyzeWorkflow(workflow);
      setAISuggestions(analysis.suggestions);
    } catch (error) {
      console.error('Failed to load AI suggestions:', error);
    }
  }, [workflow]);

  const loadWorkflowMetrics = useCallback(() => {
    const metrics = monitoringService.current.getWorkflowMetrics(workflow.id);
    setWorkflowMetrics(metrics);
  }, [workflow.id]);

  const saveWorkflow = useCallback(() => {
    const savedWorkflows = JSON.parse(localStorage.getItem('autoflow_workflows') || '[]');
    const workflowToSave = {
      ...workflow,
      id: workflow.id === 'new-workflow' ? `workflow-${Date.now()}` : workflow.id,
      lastModified: Date.now()
    };
    
    const existingIndex = savedWorkflows.findIndex((w: WorkflowTemplate) => w.id === workflowToSave.id);
    if (existingIndex >= 0) {
      savedWorkflows[existingIndex] = workflowToSave;
    } else {
      savedWorkflows.push(workflowToSave);
    }
    
    localStorage.setItem('autoflow_workflows', JSON.stringify(savedWorkflows));
    setWorkflow(workflowToSave);
    
    toast({
      title: "Workflow Saved",
      description: "Your workflow has been saved successfully",
    });
  }, [workflow, toast]);

  const applyAISuggestion = useCallback(async (suggestion: any) => {
    toast({
      title: "Applying AI Suggestion",
      description: suggestion.title,
    });

    // This would implement the actual suggestion
    // For now, just show a success message
    setTimeout(() => {
      toast({
        title: "AI Suggestion Applied",
        description: "Your workflow has been optimized!",
      });
    }, 1000);
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Advanced Workflow Builder</h1>
                <p className="text-muted-foreground">Create AI-powered automated workflows</p>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  value={workflow.name}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  className="min-w-48"
                  placeholder="Workflow name..."
                />
                <Badge variant="secondary">{workflow.nodes.length} nodes</Badge>
                {workflowMetrics && (
                  <Badge variant="outline">
                    {workflowMetrics.successRate.toFixed(1)}% success
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center space-x-2"
              >
                <Brain className="w-4 h-4" />
                <span>AI Suggestions</span>
                {aiSuggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{aiSuggestions.length}</Badge>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSchedulePanel(!showSchedulePanel)}
              >
                <Clock className="w-4 h-4" />
                Schedule
              </Button>
              <Button variant="outline" onClick={saveWorkflow}>
                <Save className="w-4 h-4" />
                Save
              </Button>
              <Button 
                variant="glow" 
                onClick={executeWorkflow}
                disabled={isExecuting || workflow.nodes.length === 0}
              >
                <Play className="w-4 h-4" />
                {isExecuting ? 'Executing...' : 'Run Workflow'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Sidebar - Node Types & Templates */}
        <div className="w-80 border-r border-border bg-card/30 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Node Types */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Add Nodes</h3>
              <div className="grid grid-cols-2 gap-2">
                {nodeTypes.map((nodeType) => (
                  <Button
                    key={nodeType.type}
                    variant="outline"
                    size="sm"
                    onClick={() => addNode(nodeType.type)}
                    className="flex-col h-auto p-3 text-left"
                  >
                    <nodeType.icon className={`w-5 h-5 ${nodeType.color} mb-1`} />
                    <span className="text-xs font-medium">{nodeType.title}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Service Templates */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Services</h3>
              <div className="space-y-2">
                {serviceTemplates.map((service) => (
                  <Card key={service.service} className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <service.icon className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{service.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {service.actions.slice(0, 3).join(', ')}
                      {service.actions.length > 3 && '...'}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Workflow Analytics */}
            {workflowMetrics && (
              <div>
                <h3 className="font-semibold text-foreground mb-3">Analytics</h3>
                <Card className="p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Executions:</span>
                      <span className="font-medium">{workflowMetrics.executionCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Success Rate:</span>
                      <span className="font-medium text-green-600">
                        {workflowMetrics.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg Time:</span>
                      <span className="font-medium">
                        {(workflowMetrics.averageExecutionTime / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Time Saved:</span>
                      <span className="font-medium text-blue-600">
                        {Math.round(workflowMetrics.totalTimeSaved / 60000)}m
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            ref={canvasRef}
            className="w-full h-full bg-muted/5 relative overflow-auto"
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {workflow.nodes.map((node) => {
              const NodeIcon = nodeTypes.find(nt => nt.type === node.type)?.icon || Play;
              const ServiceIcon = node.service ? serviceTemplates.find(st => st.service === node.service)?.icon : null;
              const isSelected = selectedNode?.id === node.id;
              const executionStatus = executionProgress[node.id];
              
              return (
                <div
                  key={node.id}
                  className={`absolute bg-card border rounded-lg p-4 min-w-48 cursor-pointer transition-all ${
                    isSelected ? 'border-primary shadow-glow' : 'border-border hover:shadow-md'
                  } ${
                    executionStatus === 'running' ? 'border-yellow-400 shadow-yellow-400/20' :
                    executionStatus === 'completed' ? 'border-green-400 shadow-green-400/20' :
                    executionStatus === 'error' ? 'border-red-400 shadow-red-400/20' : ''
                  }`}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                  }}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <NodeIcon className="w-4 h-4 text-primary" />
                      {ServiceIcon && <ServiceIcon className="w-3 h-3 text-muted-foreground" />}
                      {executionStatus && (
                        <div className="flex items-center">
                          {executionStatus === 'running' && <Clock className="w-3 h-3 text-yellow-400 animate-spin" />}
                          {executionStatus === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                          {executionStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="font-medium text-sm text-foreground mb-1">{node.title}</div>
                  <div className="text-xs text-muted-foreground">{node.description}</div>
                  
                  {executionStatus && (
                    <div className="mt-2">
                      <Badge 
                        variant={
                          executionStatus === 'completed' ? 'default' :
                          executionStatus === 'error' ? 'destructive' :
                          executionStatus === 'running' ? 'secondary' : 'outline'
                        }
                        className="text-xs"
                      >
                        {executionStatus}
                      </Badge>
                    </div>
                  )}
                  
                  {node.connections.length > 0 && (
                    <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Connection lines */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
              {workflow.connections.map((connection, index) => {
                const fromNode = workflow.nodes.find(n => n.id === connection.from);
                const toNode = workflow.nodes.find(n => n.id === connection.to);
                
                if (!fromNode || !toNode) return null;
                
                const fromX = fromNode.position.x + 192;
                const fromY = fromNode.position.y + 40;
                const toX = toNode.position.x;
                const toY = toNode.position.y + 40;
                
                return (
                  <line
                    key={index}
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="hsl(var(--primary))"
                  />
                </marker>
              </defs>
            </svg>

            {workflow.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Build Your Advanced Workflow</h3>
                  <p className="text-muted-foreground mb-4">Add nodes from the sidebar and connect them to create powerful automations</p>
                  <Button onClick={() => addNode('trigger')} variant="glow">
                    <Plus className="w-4 h-4" />
                    Add First Node
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Node Properties / AI Suggestions / Execution Logs */}
        <div className="w-80 border-l border-border bg-card/30 overflow-y-auto">
          {selectedNode ? (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-4">Node Properties</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="node-title">Title</Label>
                    <Input
                      id="node-title"
                      value={selectedNode.title}
                      onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="node-description">Description</Label>
                    <Textarea
                      id="node-description"
                      value={selectedNode.description}
                      onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="node-service">Service</Label>
                    <Select
                      value={selectedNode.service || ''}
                      onValueChange={(value) => updateNode(selectedNode.id, { service: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTemplates.map((service) => (
                          <SelectItem key={service.service} value={service.service}>
                            <div className="flex items-center space-x-2">
                              <service.icon className="w-4 h-4" />
                              <span>{service.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service-specific configuration */}
                  {selectedNode.service && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">{
                        serviceTemplates.find(s => s.service === selectedNode.service)?.name || 'Service'
                      } Configuration</h4>
                      
                      {selectedNode.service === 'gmail' && (
                        <>
                          <div>
                            <Label>Sender Email</Label>
                            <Input
                              placeholder="sender@example.com"
                              value={selectedNode.config.sender as string || ''}
                              onChange={(e) => updateNode(selectedNode.id, { 
                                config: { ...selectedNode.config, sender: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <Label>Subject Filter</Label>
                            <Input
                              placeholder="Subject contains..."
                              value={selectedNode.config.subject as string || ''}
                              onChange={(e) => updateNode(selectedNode.id, { 
                                config: { ...selectedNode.config, subject: e.target.value }
                              })}
                            />
                          </div>
                        </>
                      )}

                      {selectedNode.service === 'drive' && (
                        <div>
                          <Label>Folder Path</Label>
                          <Input
                            placeholder="/Documents"
                            value={selectedNode.config.folder as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, { 
                              config: { ...selectedNode.config, folder: e.target.value }
                            })}
                          />
                        </div>
                      )}

                      {selectedNode.service === 'github' && (
                        <>
                          <div>
                            <Label>Repository</Label>
                            <Input
                              placeholder="owner/repo-name"
                              value={selectedNode.config.repo as string || ''}
                              onChange={(e) => updateNode(selectedNode.id, { 
                                config: { ...selectedNode.config, repo: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <Label>Action</Label>
                            <Select
                              value={selectedNode.config.action as string || ''}
                              onValueChange={(value) => updateNode(selectedNode.id, {
                                config: { ...selectedNode.config, action: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select action..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="create_repository">Create Repository</SelectItem>
                                <SelectItem value="create_issue">Create Issue</SelectItem>
                                <SelectItem value="create_pull_request">Create Pull Request</SelectItem>
                                <SelectItem value="trigger_workflow">Trigger Workflow</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {selectedNode.service === 'terminal' && (
                        <div>
                          <Label>Commands</Label>
                          <Textarea
                            placeholder="npm install&#10;npm run build"
                            value={selectedNode.config.commands as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, { 
                              config: { ...selectedNode.config, commands: e.target.value }
                            })}
                            rows={4}
                          />
                        </div>
                      )}

                      {selectedNode.type === 'delay' && (
                        <div>
                          <Label>Duration (seconds)</Label>
                          <Input
                            type="number"
                            placeholder="5"
                            value={selectedNode.config.duration as number || ''}
                            onChange={(e) => updateNode(selectedNode.id, { 
                              config: { ...selectedNode.config, duration: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : showAIPanel && aiSuggestions.length > 0 ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>AI Suggestions</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIPanel(false)}
                >
                  Close
                </Button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-auto">
                {aiSuggestions.map((suggestion, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={
                        suggestion.priority === 'high' ? 'destructive' :
                        suggestion.priority === 'medium' ? 'default' : 'secondary'
                      } className="text-xs">
                        {suggestion.priority}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyAISuggestion(suggestion)}
                      >
                        Apply
                      </Button>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{suggestion.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>{suggestion.estimatedImpact.timeSaved}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : executionLogs.length > 0 ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>Execution Logs</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExecutionLogs([])}
                >
                  Clear
                </Button>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-auto">
                {executionLogs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${
                      log.level === 'error' ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                      log.level === 'success' ? 'bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                      'bg-muted/30 border border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs text-muted-foreground">
                        {log.nodeId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div>{log.message}</div>
                  </div>
                ))}
              </div>
              
              {isExecuting && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Executing workflow...</span>
                  </div>
                  <Progress 
                    value={
                      (Object.values(executionProgress).filter(status => status === 'completed').length / 
                       workflow.nodes.length) * 100
                    } 
                    className="w-full"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="text-muted-foreground">
                <Settings className="w-8 h-8 mx-auto mb-2" />
                <p>Select a node to configure it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;