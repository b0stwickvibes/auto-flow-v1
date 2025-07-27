import { MacroAction } from '../components/MacroRecorder';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  actions: MacroAction[];
  status: 'active' | 'paused' | 'draft';
  lastRun?: string;
  frequency?: string;
  services: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  result?: {
    success: boolean;
    message: string;
    executedActions: number;
    totalActions: number;
  };
}

class WorkflowService {
  private static instance: WorkflowService;
  private workflows: Workflow[] = [];
  private executions: WorkflowExecution[] = [];

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
      WorkflowService.instance.loadFromLocalStorage();
    }
    return WorkflowService.instance;
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('autoflow_workflows');
      if (stored) {
        this.workflows = JSON.parse(stored);
      } else {
        // Initialize with sample workflows for demo
        this.workflows = [
          {
            id: '1',
            name: 'Gmail File Downloader',
            description: 'Automatically download attachments from specific senders',
            actions: [],
            status: 'active',
            lastRun: '2 minutes ago',
            frequency: 'Every 30 minutes',
            services: ['Gmail', 'Google Drive'],
            createdAt: Date.now() - 86400000,
            updatedAt: Date.now() - 3600000
          },
          {
            id: '2',
            name: 'Repository Setup Generator',
            description: 'Generate terminal commands for project initialization',
            actions: [],
            status: 'paused',
            lastRun: '1 hour ago',
            frequency: 'Manual trigger',
            services: ['GitHub', 'Terminal'],
            createdAt: Date.now() - 172800000,
            updatedAt: Date.now() - 7200000
          },
          {
            id: '3',
            name: 'Cloud Storage Organizer',
            description: 'Sort and organize files across cloud storage platforms',
            actions: [],
            status: 'active',
            lastRun: '15 minutes ago',
            frequency: 'Daily at 2 AM',
            services: ['Google Drive', 'Dropbox'],
            createdAt: Date.now() - 259200000,
            updatedAt: Date.now() - 900000
          }
        ];
        this.saveToLocalStorage();
      }

      const storedExecutions = localStorage.getItem('autoflow_executions');
      if (storedExecutions) {
        this.executions = JSON.parse(storedExecutions);
      }
    } catch (error) {
      console.error('Failed to load workflows from localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('autoflow_workflows', JSON.stringify(this.workflows));
      localStorage.setItem('autoflow_executions', JSON.stringify(this.executions));
    } catch (error) {
      console.error('Failed to save workflows to localStorage:', error);
    }
  }

  getAllWorkflows(): Workflow[] {
    return [...this.workflows];
  }

  getWorkflowById(id: string): Workflow | undefined {
    return this.workflows.find(w => w.id === id);
  }

  createWorkflow(name: string, description: string, actions: MacroAction[]): Workflow {
    const workflow: Workflow = {
      id: `workflow_${Date.now()}`,
      name,
      description,
      actions,
      status: 'draft',
      services: this.extractServicesFromActions(actions),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.workflows.push(workflow);
    this.saveToLocalStorage();
    return workflow;
  }

  updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | null {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) return null;

    this.workflows[index] = {
      ...this.workflows[index],
      ...updates,
      updatedAt: Date.now()
    };

    this.saveToLocalStorage();
    return this.workflows[index];
  }

  deleteWorkflow(id: string): boolean {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index === -1) return false;

    this.workflows.splice(index, 1);
    this.saveToLocalStorage();
    return true;
  }

  toggleWorkflowStatus(id: string): Workflow | null {
    const workflow = this.getWorkflowById(id);
    if (!workflow) return null;

    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    return this.updateWorkflow(id, { status: newStatus });
  }

  recordExecution(workflowId: string): WorkflowExecution {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      workflowId,
      status: 'running',
      startTime: Date.now()
    };

    this.executions.push(execution);
    
    // Update workflow last run
    this.updateWorkflow(workflowId, { 
      lastRun: 'Just now'
    });

    this.saveToLocalStorage();
    return execution;
  }

  completeExecution(
    executionId: string, 
    success: boolean, 
    message: string, 
    executedActions: number, 
    totalActions: number
  ): void {
    const execution = this.executions.find(e => e.id === executionId);
    if (execution) {
      execution.status = success ? 'completed' : 'failed';
      execution.endTime = Date.now();
      execution.result = {
        success,
        message,
        executedActions,
        totalActions
      };
      this.saveToLocalStorage();
    }
  }

  getExecutionHistory(workflowId?: string): WorkflowExecution[] {
    if (workflowId) {
      return this.executions.filter(e => e.workflowId === workflowId);
    }
    return [...this.executions];
  }

  private extractServicesFromActions(actions: MacroAction[]): string[] {
    const services = new Set<string>();
    
    actions.forEach(action => {
      if (action.url) {
        if (action.url.includes('gmail.com')) services.add('Gmail');
        if (action.url.includes('github.com')) services.add('GitHub');
        if (action.url.includes('drive.google.com')) services.add('Google Drive');
        if (action.url.includes('dropbox.com')) services.add('Dropbox');
      }
    });

    if (services.size === 0) services.add('Browser');
    return Array.from(services);
  }

  getWorkflowStats() {
    const activeWorkflows = this.workflows.filter(w => w.status === 'active').length;
    const totalExecutions = this.executions.length;
    const successfulExecutions = this.executions.filter(e => e.result?.success).length;
    const recentExecutions = this.executions.filter(e => 
      Date.now() - e.startTime < 24 * 60 * 60 * 1000
    ).length;

    return {
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      recentExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100).toFixed(1) : '0'
    };
  }
}

export default WorkflowService;