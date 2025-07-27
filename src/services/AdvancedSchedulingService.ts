// Advanced Scheduling Service
// Phase 4: Advanced Features - Enhanced scheduling and triggering system

export interface ScheduleConfig {
  id: string;
  workflowId: string;
  name: string;
  type: 'cron' | 'interval' | 'webhook' | 'event' | 'conditional';
  schedule: string; // Cron expression or interval
  timezone?: string;
  enabled: boolean;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
  conditions?: Array<{
    type: 'time' | 'date' | 'day' | 'custom';
    operator: 'equals' | 'before' | 'after' | 'between';
    value: string | string[];
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  workflowId: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'skipped';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
  retryCount: number;
  nextRetryAt?: Date;
}

export interface WebhookTrigger {
  id: string;
  workflowId: string;
  url: string;
  secret: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'exists';
    value: string;
  }>;
  enabled: boolean;
  createdAt: Date;
}

export interface EventTrigger {
  id: string;
  workflowId: string;
  eventType: string;
  source: 'system' | 'user' | 'external';
  filters?: Record<string, any>;
  enabled: boolean;
  createdAt: Date;
}

class AdvancedSchedulingService {
  private schedules: Map<string, ScheduleConfig> = new Map();
  private executions: Map<string, ScheduleExecution> = new Map();
  private webhooks: Map<string, WebhookTrigger> = new Map();
  private eventTriggers: Map<string, EventTrigger> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeScheduler();
  }

  private initializeScheduler(): void {
    console.log('Initializing Advanced Scheduling Service...');
    this.isRunning = true;
    
    // Start the scheduler tick
    this.startSchedulerTick();
  }

  private startSchedulerTick(): void {
    if (!this.isRunning) return;

    // Check for scheduled executions every minute
    const checkInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(checkInterval);
        return;
      }
      this.checkScheduledTasks();
    }, 60000); // 1 minute

    // Initial check
    this.checkScheduledTasks();
  }

  private async checkScheduledTasks(): Promise<void> {
    const now = new Date();
    
    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      try {
        if (this.shouldExecuteSchedule(schedule, now)) {
          await this.executeScheduledWorkflow(schedule);
        }
      } catch (error) {
        console.error(`Error checking schedule ${schedule.id}:`, error);
      }
    }
  }

  private shouldExecuteSchedule(schedule: ScheduleConfig, now: Date): boolean {
    switch (schedule.type) {
      case 'cron':
        return this.evaluateCronSchedule(schedule.schedule, now);
      case 'interval':
        return this.evaluateIntervalSchedule(schedule, now);
      case 'conditional':
        return this.evaluateConditionalSchedule(schedule, now);
      default:
        return false;
    }
  }

  private evaluateCronSchedule(cronExpression: string, now: Date): boolean {
    // Simplified cron evaluation - in production use a proper cron library
    if (cronExpression === '0 9 * * 1-5') { // 9 AM, weekdays
      return now.getHours() === 9 && now.getMinutes() === 0 && 
             now.getDay() >= 1 && now.getDay() <= 5;
    }
    
    if (cronExpression === '0 */6 * * *') { // Every 6 hours
      return now.getMinutes() === 0 && now.getHours() % 6 === 0;
    }
    
    if (cronExpression === '0 0 * * 0') { // Weekly on Sunday
      return now.getHours() === 0 && now.getMinutes() === 0 && now.getDay() === 0;
    }

    // Default to hourly for demo
    return now.getMinutes() === 0;
  }

  private evaluateIntervalSchedule(schedule: ScheduleConfig, now: Date): boolean {
    // Check last execution time and interval
    const lastExecution = Array.from(this.executions.values())
      .filter(exec => exec.scheduleId === schedule.id)
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())[0];

    if (!lastExecution) return true; // First execution

    const intervalMs = this.parseInterval(schedule.schedule);
    const timeSinceLastExecution = now.getTime() - lastExecution.scheduledAt.getTime();
    
    return timeSinceLastExecution >= intervalMs;
  }

  private evaluateConditionalSchedule(schedule: ScheduleConfig, now: Date): boolean {
    if (!schedule.conditions) return false;

    return schedule.conditions.every(condition => {
      switch (condition.type) {
        case 'time':
          return this.evaluateTimeCondition(condition, now);
        case 'date':
          return this.evaluateDateCondition(condition, now);
        case 'day':
          return this.evaluateDayCondition(condition, now);
        default:
          return true;
      }
    });
  }

  private evaluateTimeCondition(condition: any, now: Date): boolean {
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    switch (condition.operator) {
      case 'equals':
        return currentTime === condition.value;
      case 'after':
        return currentTime > condition.value;
      case 'before':
        return currentTime < condition.value;
      case 'between':
        return currentTime >= condition.value[0] && currentTime <= condition.value[1];
      default:
        return false;
    }
  }

  private evaluateDateCondition(condition: any, now: Date): boolean {
    const currentDate = now.toISOString().split('T')[0];
    
    switch (condition.operator) {
      case 'equals':
        return currentDate === condition.value;
      case 'after':
        return currentDate > condition.value;
      case 'before':
        return currentDate < condition.value;
      default:
        return false;
    }
  }

  private evaluateDayCondition(condition: any, now: Date): boolean {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    
    if (Array.isArray(condition.value)) {
      return condition.value.includes(currentDay);
    }
    
    return currentDay === condition.value;
  }

  private parseInterval(interval: string): number {
    // Parse intervals like "5m", "1h", "2d"
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 60000; // Default 1 minute

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60000;
    }
  }

  private async executeScheduledWorkflow(schedule: ScheduleConfig): Promise<void> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: ScheduleExecution = {
      id: executionId,
      scheduleId: schedule.id,
      workflowId: schedule.workflowId,
      status: 'scheduled',
      scheduledAt: new Date(),
      retryCount: 0
    };

    this.executions.set(executionId, execution);

    try {
      console.log(`Executing scheduled workflow: ${schedule.name} (${schedule.workflowId})`);
      
      execution.status = 'running';
      execution.startedAt = new Date();
      
      // Simulate workflow execution
      await this.simulateWorkflowExecution(schedule.workflowId);
      
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt!.getTime();
      execution.result = { success: true, message: 'Workflow completed successfully' };
      
      console.log(`Scheduled workflow completed: ${schedule.name}`);
      
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Scheduled workflow failed: ${schedule.name}`, error);
      
      // Handle retry logic
      if (schedule.retryPolicy && execution.retryCount < schedule.retryPolicy.maxAttempts) {
        await this.scheduleRetry(execution, schedule.retryPolicy);
      }
    }

    this.executions.set(executionId, execution);
  }

  private async scheduleRetry(execution: ScheduleExecution, retryPolicy: NonNullable<ScheduleConfig['retryPolicy']>): Promise<void> {
    execution.retryCount++;
    
    const delay = Math.min(
      retryPolicy.maxDelay,
      1000 * Math.pow(retryPolicy.backoffMultiplier, execution.retryCount - 1)
    );
    
    execution.nextRetryAt = new Date(Date.now() + delay);
    execution.status = 'scheduled';
    
    console.log(`Scheduling retry ${execution.retryCount}/${retryPolicy.maxAttempts} for execution ${execution.id} in ${delay}ms`);
    
    setTimeout(async () => {
      const schedule = this.schedules.get(execution.scheduleId);
      if (schedule) {
        await this.executeScheduledWorkflow(schedule);
      }
    }, delay);
  }

  private async simulateWorkflowExecution(workflowId: string): Promise<void> {
    // Simulate workflow execution time
    const executionTime = 2000 + Math.random() * 3000;
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error('Simulated workflow execution failure');
    }
  }

  // Public API methods

  async createSchedule(config: Omit<ScheduleConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduleConfig> {
    const schedule: ScheduleConfig = {
      ...config,
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.schedules.set(schedule.id, schedule);
    console.log(`Created schedule: ${schedule.name} (${schedule.id})`);
    
    return schedule;
  }

  async updateSchedule(id: string, updates: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    const updatedSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date()
    };

    this.schedules.set(id, updatedSchedule);
    console.log(`Updated schedule: ${id}`);
    
    return updatedSchedule;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const deleted = this.schedules.delete(id);
    
    // Clear any associated timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    
    console.log(`Deleted schedule: ${id}`);
    return deleted;
  }

  getSchedule(id: string): ScheduleConfig | undefined {
    return this.schedules.get(id);
  }

  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values());
  }

  getSchedulesByWorkflow(workflowId: string): ScheduleConfig[] {
    return Array.from(this.schedules.values()).filter(s => s.workflowId === workflowId);
  }

  async enableSchedule(id: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (schedule) {
      schedule.enabled = true;
      schedule.updatedAt = new Date();
      console.log(`Enabled schedule: ${id}`);
    }
  }

  async disableSchedule(id: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (schedule) {
      schedule.enabled = false;
      schedule.updatedAt = new Date();
      console.log(`Disabled schedule: ${id}`);
    }
  }

  // Webhook management

  async createWebhook(webhook: Omit<WebhookTrigger, 'id' | 'createdAt'>): Promise<WebhookTrigger> {
    const webhookTrigger: WebhookTrigger = {
      ...webhook,
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    this.webhooks.set(webhookTrigger.id, webhookTrigger);
    console.log(`Created webhook trigger: ${webhookTrigger.id}`);
    
    return webhookTrigger;
  }

  async handleWebhookRequest(webhookId: string, payload: any, headers: Record<string, string>): Promise<{
    success: boolean;
    message: string;
    executionId?: string;
  }> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook || !webhook.enabled) {
      return { success: false, message: 'Webhook not found or disabled' };
    }

    // Validate webhook conditions
    if (webhook.conditions) {
      const conditionsMet = webhook.conditions.every(condition => {
        const fieldValue = this.getNestedProperty(payload, condition.field);
        switch (condition.operator) {
          case 'equals':
            return fieldValue === condition.value;
          case 'contains':
            return String(fieldValue).includes(condition.value);
          case 'exists':
            return fieldValue !== undefined;
          default:
            return false;
        }
      });

      if (!conditionsMet) {
        return { success: false, message: 'Webhook conditions not met' };
      }
    }

    // Execute workflow
    try {
      console.log(`Webhook triggered workflow: ${webhook.workflowId}`);
      await this.simulateWorkflowExecution(webhook.workflowId);
      
      const executionId = `webhook_exec_${Date.now()}`;
      return { 
        success: true, 
        message: 'Workflow executed successfully',
        executionId
      };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Execution failed'
      };
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Event trigger management

  async createEventTrigger(trigger: Omit<EventTrigger, 'id' | 'createdAt'>): Promise<EventTrigger> {
    const eventTrigger: EventTrigger = {
      ...trigger,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    this.eventTriggers.set(eventTrigger.id, eventTrigger);
    console.log(`Created event trigger: ${eventTrigger.id}`);
    
    return eventTrigger;
  }

  async emitEvent(eventType: string, source: string, data: any): Promise<{
    triggeredWorkflows: string[];
    executionIds: string[];
  }> {
    const matchingTriggers = Array.from(this.eventTriggers.values()).filter(trigger => 
      trigger.enabled && 
      trigger.eventType === eventType && 
      trigger.source === source
    );

    const triggeredWorkflows: string[] = [];
    const executionIds: string[] = [];

    for (const trigger of matchingTriggers) {
      // Check filters
      if (trigger.filters) {
        const filtersMatch = Object.entries(trigger.filters).every(([key, value]) => 
          data[key] === value
        );
        
        if (!filtersMatch) continue;
      }

      try {
        console.log(`Event triggered workflow: ${trigger.workflowId}`);
        await this.simulateWorkflowExecution(trigger.workflowId);
        
        triggeredWorkflows.push(trigger.workflowId);
        executionIds.push(`event_exec_${Date.now()}_${trigger.id}`);
      } catch (error) {
        console.error(`Event trigger failed for workflow ${trigger.workflowId}:`, error);
      }
    }

    return { triggeredWorkflows, executionIds };
  }

  // Execution history

  getExecution(id: string): ScheduleExecution | undefined {
    return this.executions.get(id);
  }

  getExecutionHistory(scheduleId?: string, limit = 50): ScheduleExecution[] {
    let executions = Array.from(this.executions.values());
    
    if (scheduleId) {
      executions = executions.filter(exec => exec.scheduleId === scheduleId);
    }
    
    return executions
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())
      .slice(0, limit);
  }

  getExecutionMetrics(scheduleId?: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    averageDuration: number;
  } {
    let executions = Array.from(this.executions.values());
    
    if (scheduleId) {
      executions = executions.filter(exec => exec.scheduleId === scheduleId);
    }

    const completedExecutions = executions.filter(exec => exec.status === 'completed');
    const failedExecutions = executions.filter(exec => exec.status === 'failed');
    
    const totalExecutions = executions.length;
    const successfulExecutions = completedExecutions.length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    
    const durationsWithValue = completedExecutions.filter(exec => exec.duration);
    const averageDuration = durationsWithValue.length > 0 
      ? durationsWithValue.reduce((sum, exec) => sum + (exec.duration || 0), 0) / durationsWithValue.length
      : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions: failedExecutions.length,
      successRate,
      averageDuration
    };
  }

  // Utility methods

  validateCronExpression(cronExpression: string): boolean {
    // Simplified validation - in production use a proper cron library
    const parts = cronExpression.split(' ');
    return parts.length === 5;
  }

  getNextScheduledRun(scheduleId: string): Date | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.enabled) return null;

    // Simplified next run calculation
    const now = new Date();
    
    switch (schedule.type) {
      case 'interval':
        const intervalMs = this.parseInterval(schedule.schedule);
        return new Date(now.getTime() + intervalMs);
      case 'cron':
        // For demo, assume next hour
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return nextHour;
      default:
        return null;
    }
  }

  // Predefined schedule templates

  getScheduleTemplates(): Array<{
    name: string;
    description: string;
    type: ScheduleConfig['type'];
    schedule: string;
    conditions?: ScheduleConfig['conditions'];
  }> {
    return [
      {
        name: 'Daily Morning',
        description: 'Execute every day at 9 AM',
        type: 'cron',
        schedule: '0 9 * * *'
      },
      {
        name: 'Business Hours',
        description: 'Execute every hour during business hours (9 AM - 5 PM, weekdays)',
        type: 'cron',
        schedule: '0 9-17 * * 1-5'
      },
      {
        name: 'Weekly Report',
        description: 'Execute every Sunday at midnight',
        type: 'cron',
        schedule: '0 0 * * 0'
      },
      {
        name: 'Every 15 Minutes',
        description: 'Execute every 15 minutes',
        type: 'interval',
        schedule: '15m'
      },
      {
        name: 'Hourly',
        description: 'Execute every hour',
        type: 'interval',
        schedule: '1h'
      },
      {
        name: 'Business Days Only',
        description: 'Execute at 10 AM on weekdays only',
        type: 'conditional',
        schedule: '0 10 * * *',
        conditions: [
          {
            type: 'day',
            operator: 'equals',
            value: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        ]
      }
    ];
  }

  // Cleanup and shutdown

  async shutdown(): Promise<void> {
    console.log('Shutting down Advanced Scheduling Service...');
    this.isRunning = false;
    
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    console.log('Advanced Scheduling Service shutdown complete');
  }
}

export default AdvancedSchedulingService;