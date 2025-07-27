import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Square, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MacroAction } from './MacroRecorder';
import { WorkflowExecutor, ExecutionResult } from '../services/workflowExecutor';
import { useToast } from '@/hooks/use-toast';

interface WorkflowExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
  actions: MacroAction[];
  onExecutionComplete?: (result: ExecutionResult) => void;
}

const WorkflowExecutionModal: React.FC<WorkflowExecutionModalProps> = ({
  isOpen,
  onClose,
  workflowId,
  workflowName,
  actions,
  onExecutionComplete
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState<MacroAction | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();

  const executor = WorkflowExecutor.getInstance();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExecuting && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExecuting, startTime]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setIsExecuting(false);
      setProgress(0);
      setCurrentAction(null);
      setExecutionResult(null);
      setStartTime(null);
      setElapsedTime(0);
    }
  }, [isOpen]);

  const handleStartExecution = async () => {
    if (actions.length === 0) {
      toast({
        title: "No Actions",
        description: "This workflow has no actions to execute",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);
    setStartTime(Date.now());
    setProgress(0);
    setExecutionResult(null);

    try {
      const result = await executor.executeWorkflow(
        workflowId,
        actions,
        (progressData) => {
          setProgress((progressData.current / progressData.total) * 100);
          setCurrentAction(progressData.action);
        }
      );

      setExecutionResult(result);
      setIsExecuting(false);
      
      if (onExecutionComplete) {
        onExecutionComplete(result);
      }

      toast({
        title: result.success ? "Execution Complete" : "Execution Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });

    } catch (error) {
      const errorResult: ExecutionResult = {
        success: false,
        message: "Execution failed with error",
        error: error instanceof Error ? error.message : "Unknown error",
        executedActions: 0,
        totalActions: actions.length,
        duration: Date.now() - (startTime || Date.now())
      };

      setExecutionResult(errorResult);
      setIsExecuting(false);

      if (onExecutionComplete) {
        onExecutionComplete(errorResult);
      }

      toast({
        title: "Execution Failed",
        description: errorResult.error || "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleStopExecution = () => {
    executor.stopCurrentExecution();
    setIsExecuting(false);
    
    toast({
      title: "Execution Stopped",
      description: "Workflow execution was stopped by user",
    });
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click': return '🖱️';
      case 'input': return '⌨️';
      case 'keypress': return '🔘';
      case 'navigation': return '🧭';
      default: return '⚡';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Execute Workflow: {workflowName}</span>
          </DialogTitle>
          <DialogDescription>
            Run this workflow with {actions.length} recorded actions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Execution Status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    isExecuting ? 'bg-blue-400 animate-pulse' : 
                    executionResult?.success ? 'bg-green-400' : 
                    executionResult && !executionResult.success ? 'bg-red-400' : 
                    'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-semibold text-foreground">
                      {isExecuting ? 'Executing Workflow' : 
                       executionResult?.success ? 'Execution Complete' :
                       executionResult && !executionResult.success ? 'Execution Failed' :
                       'Ready to Execute'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isExecuting ? `${Math.round(progress)}% complete` :
                       executionResult ? executionResult.message :
                       `${actions.length} actions ready to execute`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={
                    isExecuting ? 'default' : 
                    executionResult?.success ? 'default' : 
                    executionResult && !executionResult.success ? 'destructive' : 
                    'secondary'
                  }>
                    {isExecuting ? 'RUNNING' : 
                     executionResult?.success ? 'SUCCESS' :
                     executionResult && !executionResult.success ? 'FAILED' :
                     'READY'}
                  </Badge>
                  {(isExecuting || executionResult) && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(elapsedTime)}</span>
                    </div>
                  )}
                </div>
              </div>

              {isExecuting && (
                <div className="space-y-3">
                  <Progress value={progress} className="w-full" />
                  {currentAction && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{getActionIcon(currentAction.type)}</span>
                      <span>
                        {currentAction.type} on {currentAction.element}
                        {currentAction.value && ` - "${currentAction.value}"`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {executionResult && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start space-x-3">
                    {executionResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {executionResult.success ? 'Execution Successful' : 'Execution Failed'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Executed {executionResult.executedActions} of {executionResult.totalActions} actions
                        in {formatTime(executionResult.duration)}
                      </p>
                      {executionResult.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <p className="text-sm text-red-700 dark:text-red-300">
                              {executionResult.error}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions to Execute</CardTitle>
              <CardDescription>Preview of recorded actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-auto">
                {actions.slice(0, 10).map((action, index) => (
                  <div key={action.id} className="flex items-center space-x-3 p-2 bg-muted/20 rounded text-sm">
                    <span className="text-muted-foreground w-6">#{index + 1}</span>
                    <span>{getActionIcon(action.type)}</span>
                    <span className="flex-1">
                      {action.type} {action.element && `on ${action.element}`}
                      {action.value && ` - "${action.value.substring(0, 30)}${action.value.length > 30 ? '...' : ''}"`}
                    </span>
                  </div>
                ))}
                {actions.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    ... and {actions.length - 10} more actions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            <div className="flex space-x-2">
              {!isExecuting && !executionResult && (
                <Button variant="glow" onClick={handleStartExecution}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Execution
                </Button>
              )}
              
              {isExecuting && (
                <Button variant="destructive" onClick={handleStopExecution}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Execution
                </Button>
              )}

              {executionResult && (
                <Button variant="glow" onClick={handleStartExecution}>
                  <Play className="w-4 h-4 mr-2" />
                  Run Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowExecutionModal;