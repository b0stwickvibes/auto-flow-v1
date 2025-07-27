import { MacroAction } from '../components/MacroRecorder';

export interface ExecutionResult {
  success: boolean;
  message: string;
  error?: string;
  executedActions: number;
  totalActions: number;
  duration: number;
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  timestamp: number;
  status: 'running' | 'completed' | 'failed' | 'paused';
  result?: ExecutionResult;
  actions: MacroAction[];
}

export class WorkflowExecutor {
  private static instance: WorkflowExecutor;
  private executionLogs: ExecutionLog[] = [];
  private currentExecution: ExecutionLog | null = null;

  static getInstance(): WorkflowExecutor {
    if (!WorkflowExecutor.instance) {
      WorkflowExecutor.instance = new WorkflowExecutor();
    }
    return WorkflowExecutor.instance;
  }

  async executeWorkflow(
    workflowId: string, 
    actions: MacroAction[],
    onProgress?: (progress: { current: number; total: number; action: MacroAction }) => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec_${Date.now()}`;
    
    const executionLog: ExecutionLog = {
      id: executionId,
      workflowId,
      timestamp: startTime,
      status: 'running',
      actions
    };

    this.executionLogs.push(executionLog);
    this.currentExecution = executionLog;

    try {
      let executedActions = 0;
      
      for (const action of actions) {
        if (onProgress) {
          onProgress({ current: executedActions + 1, total: actions.length, action });
        }

        await this.executeAction(action);
        executedActions++;
        
        // Add small delay between actions for more natural execution
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const result: ExecutionResult = {
        success: true,
        message: `Successfully executed ${executedActions} actions`,
        executedActions,
        totalActions: actions.length,
        duration: Date.now() - startTime
      };

      executionLog.status = 'completed';
      executionLog.result = result;
      this.currentExecution = null;

      return result;

    } catch (error) {
      const result: ExecutionResult = {
        success: false,
        message: 'Workflow execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executedActions: 0,
        totalActions: actions.length,
        duration: Date.now() - startTime
      };

      executionLog.status = 'failed';
      executionLog.result = result;
      this.currentExecution = null;

      return result;
    }
  }

  private async executeAction(action: MacroAction): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        switch (action.type) {
          case 'click':
            this.simulateClick(action);
            break;
          case 'input':
            this.simulateInput(action);
            break;
          case 'keypress':
            this.simulateKeypress(action);
            break;
          case 'navigation':
            this.simulateNavigation(action);
            break;
          default:
            console.log(`Unsupported action type: ${action.type}`);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private simulateClick(action: MacroAction): void {
    if (!action.selector) return;
    
    const element = document.querySelector(action.selector);
    if (element) {
      // Create and dispatch a click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: action.coordinates?.x || 0,
        clientY: action.coordinates?.y || 0
      });
      element.dispatchEvent(clickEvent);
    } else {
      console.warn(`Element not found for selector: ${action.selector}`);
    }
  }

  private simulateInput(action: MacroAction): void {
    if (!action.selector || !action.value) return;
    
    const element = document.querySelector(action.selector) as HTMLInputElement;
    if (element) {
      element.value = action.value;
      
      // Dispatch input and change events
      const inputEvent = new Event('input', { bubbles: true });
      const changeEvent = new Event('change', { bubbles: true });
      
      element.dispatchEvent(inputEvent);
      element.dispatchEvent(changeEvent);
    } else {
      console.warn(`Input element not found for selector: ${action.selector}`);
    }
  }

  private simulateKeypress(action: MacroAction): void {
    if (!action.value) return;
    
    const keyEvent = new KeyboardEvent('keydown', {
      key: action.value,
      bubbles: true,
      cancelable: true
    });
    
    document.dispatchEvent(keyEvent);
  }

  private simulateNavigation(action: MacroAction): void {
    if (action.url) {
      window.location.href = action.url;
    }
  }

  getCurrentExecution(): ExecutionLog | null {
    return this.currentExecution;
  }

  getExecutionLogs(): ExecutionLog[] {
    return [...this.executionLogs];
  }

  getExecutionById(id: string): ExecutionLog | undefined {
    return this.executionLogs.find(log => log.id === id);
  }

  clearExecutionLogs(): void {
    this.executionLogs = [];
  }

  pauseCurrentExecution(): void {
    if (this.currentExecution) {
      this.currentExecution.status = 'paused';
    }
  }

  stopCurrentExecution(): void {
    if (this.currentExecution) {
      this.currentExecution.status = 'failed';
      this.currentExecution.result = {
        success: false,
        message: 'Execution stopped by user',
        executedActions: 0,
        totalActions: this.currentExecution.actions.length,
        duration: Date.now() - this.currentExecution.timestamp
      };
      this.currentExecution = null;
    }
  }
}

export default WorkflowExecutor;