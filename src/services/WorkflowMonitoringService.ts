// Workflow Monitoring and Analytics Service
// Phase 4: Advanced Features - Real-time monitoring, analytics, and performance tracking

export interface WorkflowMetrics {
  workflowId: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  lastExecutionTime: Date;
  totalTimeSaved: number;
  successRate: number;
  peakExecutionTime: {
    day: string;
    hour: number;
  };
  errorPatterns: Array<{
    error: string;
    frequency: number;
    lastOccurrence: Date;
  }>;
}

export interface PerformanceAlert {
  id: string;
  workflowId: string;
  type: 'performance' | 'error' | 'timeout' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  totalWorkflows: number;
  activeExecutions: number;
  queuedExecutions: number;
  systemLoad: {
    cpu: number;
    memory: number;
    storage: number;
  };
  serviceHealth: Record<string, {
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    lastCheck: Date;
  }>;
}

export interface ExecutionTrace {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  steps: Array<{
    nodeId: string;
    nodeName: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: any;
    error?: string;
  }>;
  totalDuration?: number;
  resourceUsage: {
    cpuTime: number;
    memoryPeak: number;
    networkCalls: number;
    diskIO: number;
  };
}

export interface AnalyticsReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    totalTimeSaved: number;
    mostActiveWorkflow: string;
    peakUsageTime: Date;
  };
  trends: {
    executionTrend: Array<{ date: string; count: number }>;
    performanceTrend: Array<{ date: string; avgTime: number }>;
    errorTrend: Array<{ date: string; errorRate: number }>;
  };
  topWorkflows: Array<{
    workflowId: string;
    name: string;
    executions: number;
    successRate: number;
    timeSaved: number;
  }>;
  recommendations: string[];
}

class WorkflowMonitoringService {
  private metrics: Map<string, WorkflowMetrics> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private traces: Map<string, ExecutionTrace> = new Map();
  private systemHealth: SystemHealth;
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds = {
    executionTime: 30000, // 30 seconds
    failureRate: 20, // 20%
    responseTime: 5000, // 5 seconds
    queueDepth: 100
  };

  constructor() {
    this.systemHealth = this.initializeSystemHealth();
    this.startMonitoring();
  }

  private initializeSystemHealth(): SystemHealth {
    return {
      status: 'healthy',
      uptime: 0,
      totalWorkflows: 0,
      activeExecutions: 0,
      queuedExecutions: 0,
      systemLoad: {
        cpu: 0,
        memory: 0,
        storage: 0
      },
      serviceHealth: {
        gmail: { status: 'up', responseTime: 150, lastCheck: new Date() },
        drive: { status: 'up', responseTime: 200, lastCheck: new Date() },
        github: { status: 'up', responseTime: 180, lastCheck: new Date() },
        terminal: { status: 'up', responseTime: 50, lastCheck: new Date() }
      }
    };
  }

  private startMonitoring(): void {
    console.log('Starting workflow monitoring...');
    
    // Update metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateSystemHealth();
      this.checkPerformanceAlerts();
      this.cleanupOldData();
    }, 30000);

    // Initial health check
    this.updateSystemHealth();
  }

  private updateSystemHealth(): void {
    const now = new Date();
    
    // Simulate system metrics
    this.systemHealth.uptime = Date.now() - (Date.now() - 3600000); // 1 hour ago
    this.systemHealth.totalWorkflows = this.metrics.size;
    this.systemHealth.activeExecutions = Array.from(this.traces.values())
      .filter(trace => trace.status === 'running').length;
    this.systemHealth.queuedExecutions = Math.floor(Math.random() * 10);
    
    // Simulate system load
    this.systemHealth.systemLoad = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      storage: Math.random() * 100
    };

    // Update service health
    Object.keys(this.systemHealth.serviceHealth).forEach(service => {
      const health = this.systemHealth.serviceHealth[service];
      health.lastCheck = now;
      health.responseTime = 100 + Math.random() * 500;
      
      // Simulate occasional service degradation
      if (Math.random() < 0.05) {
        health.status = 'degraded';
        health.responseTime *= 2;
      } else if (Math.random() < 0.01) {
        health.status = 'down';
      } else {
        health.status = 'up';
      }
    });

    // Determine overall system status
    const degradedServices = Object.values(this.systemHealth.serviceHealth)
      .filter(service => service.status === 'degraded').length;
    const downServices = Object.values(this.systemHealth.serviceHealth)
      .filter(service => service.status === 'down').length;

    if (downServices > 0 || this.systemHealth.systemLoad.cpu > 90) {
      this.systemHealth.status = 'down';
    } else if (degradedServices > 1 || this.systemHealth.systemLoad.cpu > 80) {
      this.systemHealth.status = 'degraded';
    } else {
      this.systemHealth.status = 'healthy';
    }
  }

  private checkPerformanceAlerts(): void {
    // Check execution time alerts
    this.metrics.forEach((metrics, workflowId) => {
      if (metrics.averageExecutionTime > this.alertThresholds.executionTime) {
        this.createAlert({
          workflowId,
          type: 'performance',
          severity: 'medium',
          message: 'High Average Execution Time',
          description: `Workflow ${workflowId} has an average execution time of ${metrics.averageExecutionTime}ms, exceeding the threshold of ${this.alertThresholds.executionTime}ms.`,
          metadata: {
            averageTime: metrics.averageExecutionTime,
            threshold: this.alertThresholds.executionTime
          }
        });
      }

      // Check failure rate alerts
      if (metrics.successRate < (100 - this.alertThresholds.failureRate)) {
        this.createAlert({
          workflowId,
          type: 'error',
          severity: 'high',
          message: 'High Failure Rate',
          description: `Workflow ${workflowId} has a success rate of ${metrics.successRate.toFixed(1)}%, below the acceptable threshold.`,
          metadata: {
            successRate: metrics.successRate,
            threshold: 100 - this.alertThresholds.failureRate
          }
        });
      }
    });

    // Check system health alerts
    if (this.systemHealth.systemLoad.cpu > 90) {
      this.createAlert({
        workflowId: 'system',
        type: 'resource',
        severity: 'critical',
        message: 'High CPU Usage',
        description: `System CPU usage is at ${this.systemHealth.systemLoad.cpu.toFixed(1)}%`,
        metadata: {
          cpuUsage: this.systemHealth.systemLoad.cpu
        }
      });
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PerformanceAlert = {
      ...alertData,
      id: alertId,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(alertId, alert);
    console.warn(`Performance Alert Created: ${alert.message} - ${alert.description}`);
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Clean old traces
    for (const [id, trace] of this.traces.entries()) {
      if (trace.startTime.getTime() < cutoffTime) {
        this.traces.delete(id);
      }
    }

    // Clean resolved alerts older than 24 hours
    const alertCutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < alertCutoff) {
        this.alerts.delete(id);
      }
    }
  }

  // Public API methods

  recordWorkflowExecution(
    workflowId: string, 
    duration: number, 
    success: boolean, 
    error?: string
  ): void {
    let metrics = this.metrics.get(workflowId);
    
    if (!metrics) {
      metrics = {
        workflowId,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
        lastExecutionTime: new Date(),
        totalTimeSaved: 0,
        successRate: 0,
        peakExecutionTime: {
          day: 'monday',
          hour: 9
        },
        errorPatterns: []
      };
    }

    // Update metrics
    metrics.executionCount++;
    metrics.lastExecutionTime = new Date();
    
    if (success) {
      metrics.successCount++;
      // Estimate time saved (assume manual task would take 5x longer)
      metrics.totalTimeSaved += duration * 4;
    } else {
      metrics.failureCount++;
      
      // Track error patterns
      if (error) {
        const existingError = metrics.errorPatterns.find(e => e.error === error);
        if (existingError) {
          existingError.frequency++;
          existingError.lastOccurrence = new Date();
        } else {
          metrics.errorPatterns.push({
            error,
            frequency: 1,
            lastOccurrence: new Date()
          });
        }
      }
    }

    // Update average execution time
    metrics.averageExecutionTime = (
      (metrics.averageExecutionTime * (metrics.executionCount - 1) + duration) / 
      metrics.executionCount
    );

    // Update success rate
    metrics.successRate = (metrics.successCount / metrics.executionCount) * 100;

    // Update peak execution time (simplified)
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    metrics.peakExecutionTime = {
      day: days[now.getDay()],
      hour: now.getHours()
    };

    this.metrics.set(workflowId, metrics);
  }

  startExecutionTrace(workflowId: string): string {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const trace: ExecutionTrace = {
      id: traceId,
      workflowId,
      startTime: new Date(),
      status: 'running',
      steps: [],
      resourceUsage: {
        cpuTime: 0,
        memoryPeak: 0,
        networkCalls: 0,
        diskIO: 0
      }
    };

    this.traces.set(traceId, trace);
    return traceId;
  }

  addExecutionStep(
    traceId: string, 
    nodeId: string, 
    nodeName: string, 
    status: 'running' | 'completed' | 'failed',
    output?: any,
    error?: string
  ): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    let step = trace.steps.find(s => s.nodeId === nodeId);
    if (!step) {
      step = {
        nodeId,
        nodeName,
        startTime: new Date(),
        status: 'pending'
      };
      trace.steps.push(step);
    }

    if (status === 'running' && step.status === 'pending') {
      step.startTime = new Date();
    }

    step.status = status;
    
    if (status === 'completed' || status === 'failed') {
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();
      
      if (output) step.output = output;
      if (error) step.error = error;
    }

    // Update resource usage (simulated)
    trace.resourceUsage.cpuTime += Math.random() * 1000;
    trace.resourceUsage.memoryPeak = Math.max(
      trace.resourceUsage.memoryPeak, 
      Math.random() * 100000000
    );
    trace.resourceUsage.networkCalls += Math.random() > 0.7 ? 1 : 0;
    trace.resourceUsage.diskIO += Math.random() * 1000;
  }

  completeExecutionTrace(traceId: string, status: 'completed' | 'failed' | 'cancelled'): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = new Date();
    trace.status = status;
    trace.totalDuration = trace.endTime.getTime() - trace.startTime.getTime();

    // Record workflow execution
    this.recordWorkflowExecution(
      trace.workflowId,
      trace.totalDuration,
      status === 'completed',
      status === 'failed' ? 'Workflow execution failed' : undefined
    );
  }

  getWorkflowMetrics(workflowId: string): WorkflowMetrics | undefined {
    return this.metrics.get(workflowId);
  }

  getAllMetrics(): WorkflowMetrics[] {
    return Array.from(this.metrics.values());
  }

  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  getAllAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      console.log(`Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  getExecutionTrace(traceId: string): ExecutionTrace | undefined {
    return this.traces.get(traceId);
  }

  getWorkflowTraces(workflowId: string, limit = 50): ExecutionTrace[] {
    return Array.from(this.traces.values())
      .filter(trace => trace.workflowId === workflowId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  generateAnalyticsReport(startDate: Date, endDate: Date): AnalyticsReport {
    const traces = Array.from(this.traces.values()).filter(trace => 
      trace.startTime >= startDate && trace.startTime <= endDate
    );

    const totalExecutions = traces.length;
    const successfulExecutions = traces.filter(t => t.status === 'completed').length;
    const failedExecutions = traces.filter(t => t.status === 'failed').length;
    
    const completedTraces = traces.filter(t => t.totalDuration);
    const averageExecutionTime = completedTraces.length > 0 
      ? completedTraces.reduce((sum, t) => sum + (t.totalDuration || 0), 0) / completedTraces.length
      : 0;

    const totalTimeSaved = Array.from(this.metrics.values())
      .reduce((sum, metrics) => sum + metrics.totalTimeSaved, 0);

    // Find most active workflow
    const workflowCounts = traces.reduce((acc, trace) => {
      acc[trace.workflowId] = (acc[trace.workflowId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostActiveWorkflow = Object.entries(workflowCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    // Generate trends (simplified)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const executionTrend = Array.from({ length: days }, (_, i) => {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayTraces = traces.filter(t => 
        t.startTime.toDateString() === date.toDateString()
      );
      return {
        date: date.toISOString().split('T')[0],
        count: dayTraces.length
      };
    });

    const performanceTrend = executionTrend.map(day => {
      const dayTraces = traces.filter(t => 
        t.startTime.toDateString() === new Date(day.date).toDateString() &&
        t.totalDuration
      );
      const avgTime = dayTraces.length > 0
        ? dayTraces.reduce((sum, t) => sum + (t.totalDuration || 0), 0) / dayTraces.length
        : 0;
      return {
        date: day.date,
        avgTime
      };
    });

    const errorTrend = executionTrend.map(day => {
      const dayTraces = traces.filter(t => 
        t.startTime.toDateString() === new Date(day.date).toDateString()
      );
      const errorCount = dayTraces.filter(t => t.status === 'failed').length;
      const errorRate = dayTraces.length > 0 ? (errorCount / dayTraces.length) * 100 : 0;
      return {
        date: day.date,
        errorRate
      };
    });

    // Top workflows
    const topWorkflows = Object.entries(workflowCounts)
      .map(([workflowId, executions]) => {
        const workflowMetrics = this.metrics.get(workflowId);
        return {
          workflowId,
          name: `Workflow ${workflowId}`,
          executions,
          successRate: workflowMetrics?.successRate || 0,
          timeSaved: workflowMetrics?.totalTimeSaved || 0
        };
      })
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(traces);

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
        totalTimeSaved,
        mostActiveWorkflow,
        peakUsageTime: traces.length > 0 ? traces[0].startTime : new Date()
      },
      trends: {
        executionTrend,
        performanceTrend,
        errorTrend
      },
      topWorkflows,
      recommendations
    };
  }

  private generateRecommendations(traces: ExecutionTrace[]): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    const slowTraces = traces.filter(t => (t.totalDuration || 0) > 30000);
    if (slowTraces.length > traces.length * 0.2) {
      recommendations.push('Consider optimizing workflows with high execution times');
    }

    // Error rate recommendations
    const failedTraces = traces.filter(t => t.status === 'failed');
    if (failedTraces.length > traces.length * 0.1) {
      recommendations.push('Implement better error handling and retry mechanisms');
    }

    // Resource usage recommendations
    const highMemoryTraces = traces.filter(t => t.resourceUsage.memoryPeak > 50000000);
    if (highMemoryTraces.length > 0) {
      recommendations.push('Monitor memory usage in resource-intensive workflows');
    }

    // Add general recommendations
    recommendations.push('Review workflow schedules to optimize peak usage times');
    recommendations.push('Consider implementing caching for frequently accessed data');

    return recommendations;
  }

  // Real-time monitoring methods

  subscribeToMetrics(callback: (metrics: WorkflowMetrics[]) => void): () => void {
    const interval = setInterval(() => {
      callback(this.getAllMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }

  subscribeToAlerts(callback: (alerts: PerformanceAlert[]) => void): () => void {
    const interval = setInterval(() => {
      callback(this.getActiveAlerts());
    }, 10000);

    return () => clearInterval(interval);
  }

  subscribeToSystemHealth(callback: (health: SystemHealth) => void): () => void {
    const interval = setInterval(() => {
      callback(this.getSystemHealth());
    }, 15000);

    return () => clearInterval(interval);
  }

  // Configuration methods

  updateAlertThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    console.log('Alert thresholds updated:', this.alertThresholds);
  }

  getAlertThresholds(): typeof this.alertThresholds {
    return { ...this.alertThresholds };
  }

  // Cleanup

  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    console.log('Workflow monitoring service shutdown');
  }
}

export default WorkflowMonitoringService;