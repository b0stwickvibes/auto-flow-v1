// Workflow Execution Engine
// Executes workflows by running nodes in sequence and handling service integrations

import GmailService, { GmailConfig, GmailFilter } from './GmailService';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  title: string;
  description: string;
  service?: string;
  config: Record<string, string | number | boolean>;
  position: { x: number; y: number };
  connections: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  connections: Array<{ from: string; to: string }>;
}

export interface ExecutionContext {
  variables: Record<string, any>;
  results: Record<string, any>;
  logs: Array<{
    timestamp: number;
    nodeId: string;
    message: string;
    level: 'info' | 'warn' | 'error' | 'success';
  }>;
}

class WorkflowExecutionEngine {
  private gmailService?: GmailService;
  private context: ExecutionContext;

  constructor() {
    this.context = {
      variables: {},
      results: {},
      logs: []
    };
  }

  async executeWorkflow(
    workflow: WorkflowTemplate,
    onProgress?: (nodeId: string, status: 'running' | 'completed' | 'error', message: string) => void
  ): Promise<ExecutionContext> {
    this.log('info', 'workflow-start', `Starting workflow: ${workflow.name}`);
    
    // Initialize services based on workflow requirements
    await this.initializeServices(workflow);
    
    // Find the trigger node (starting point)
    const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
    if (!triggerNode) {
      throw new Error('Workflow must have a trigger node');
    }

    // Execute nodes in sequence
    await this.executeNode(triggerNode, workflow, onProgress);
    
    this.log('success', 'workflow-complete', `Workflow completed successfully`);
    return this.context;
  }

  private async initializeServices(workflow: WorkflowTemplate): Promise<void> {
    const servicesUsed = new Set(
      workflow.nodes
        .filter(node => node.service)
        .map(node => node.service!)
    );

    if (servicesUsed.has('gmail')) {
      // In a real app, these would come from secure storage or environment variables
      // For demo purposes, we'll use hardcoded values that work in browser
      const gmailConfig: GmailConfig = {
        clientId: 'demo-client-id',
        clientSecret: 'demo-client-secret',
        apiKey: 'demo-api-key'
      };
      
      this.gmailService = new GmailService(gmailConfig);
      await this.gmailService.authenticate();
      this.log('info', 'service-init', 'Gmail service initialized');
    }

    // Add other service initializations here (Drive, GitHub, etc.)
  }

  private async executeNode(
    node: WorkflowNode,
    workflow: WorkflowTemplate,
    onProgress?: (nodeId: string, status: 'running' | 'completed' | 'error', message: string) => void
  ): Promise<void> {
    this.log('info', node.id, `Executing node: ${node.title}`);
    onProgress?.(node.id, 'running', `Executing: ${node.title}`);

    try {
      switch (node.type) {
        case 'trigger':
          await this.executeTrigger(node);
          break;
        case 'action':
          await this.executeAction(node);
          break;
        case 'condition':
          await this.executeCondition(node);
          break;
        case 'delay':
          await this.executeDelay(node);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      this.log('success', node.id, `Node completed: ${node.title}`);
      onProgress?.(node.id, 'completed', `Completed: ${node.title}`);

      // Execute connected nodes
      for (const connectionId of node.connections) {
        const connectedNode = workflow.nodes.find(n => n.id === connectionId);
        if (connectedNode) {
          await this.executeNode(connectedNode, workflow, onProgress);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', node.id, `Node failed: ${errorMessage}`);
      onProgress?.(node.id, 'error', `Error: ${errorMessage}`);
      throw error;
    }
  }

  private async executeTrigger(node: WorkflowNode): Promise<void> {
    switch (node.service) {
      case 'gmail':
        await this.executeGmailTrigger(node);
        break;
      case 'manual':
        // Manual triggers are already "triggered" by starting the workflow
        this.log('info', node.id, 'Manual trigger activated');
        break;
      default:
        this.log('info', node.id, 'Generic trigger executed');
    }
  }

  private async executeAction(node: WorkflowNode): Promise<void> {
    switch (node.service) {
      case 'gmail':
        await this.executeGmailAction(node);
        break;
      case 'drive':
        await this.executeDriveAction(node);
        break;
      case 'github':
        await this.executeGitHubAction(node);
        break;
      case 'terminal':
        await this.executeTerminalAction(node);
        break;
      default:
        this.log('info', node.id, 'Generic action executed');
    }
  }

  private async executeCondition(node: WorkflowNode): Promise<void> {
    // Simple condition evaluation - in a real implementation this would be more sophisticated
    const condition = node.config.condition as string || 'true';
    
    // Basic safe evaluation for simple conditions - replace with proper expression parser in production
    let result = false;
    try {
      if (condition === 'true') {
        result = true;
      } else if (condition === 'false') {
        result = false;
      } else {
        // For demo purposes, default to true
        result = true;
      }
    } catch (error) {
      result = false;
    }
    
    this.context.variables[`${node.id}_result`] = result;
    this.log('info', node.id, `Condition evaluated to: ${result}`);
  }

  private async executeDelay(node: WorkflowNode): Promise<void> {
    const duration = (node.config.duration as number) || 1;
    this.log('info', node.id, `Waiting for ${duration} seconds...`);
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
  }

  private async executeGmailTrigger(node: WorkflowNode): Promise<void> {
    if (!this.gmailService) {
      throw new Error('Gmail service not initialized');
    }

    const filter: GmailFilter = {
      sender: node.config.sender as string,
      subject: node.config.subject as string,
      hasAttachment: node.config.hasAttachment as boolean
    };

    const messages = await this.gmailService.getMessages(filter, 5);
    this.context.variables.gmailMessages = messages;
    this.context.results[node.id] = { messageCount: messages.length };
    
    this.log('info', node.id, `Found ${messages.length} matching emails`);
  }

  private async executeGmailAction(node: WorkflowNode): Promise<void> {
    if (!this.gmailService) {
      throw new Error('Gmail service not initialized');
    }

    const actionType = node.config.action as string || 'check_inbox';
    
    switch (actionType) {
      case 'download_attachments':
        await this.downloadGmailAttachments(node);
        break;
      case 'send_email':
        await this.sendGmailEmail(node);
        break;
      case 'mark_as_read':
        await this.markGmailAsRead(node);
        break;
      default:
        this.log('info', node.id, `Gmail action: ${actionType}`);
    }
  }

  private async downloadGmailAttachments(node: WorkflowNode): Promise<void> {
    if (!this.gmailService) return;

    const messages = this.context.variables.gmailMessages || [];
    let totalDownloaded = 0;

    for (const message of messages) {
      const attachments = this.gmailService.extractAttachments(message);
      
      for (const attachment of attachments) {
        try {
          const blob = await this.gmailService.downloadAttachment(message.id, attachment.attachmentId);
          
          // In a real implementation, you'd save this to Google Drive or local storage
          this.log('info', node.id, `Downloaded: ${attachment.filename} (${attachment.size} bytes)`);
          totalDownloaded++;
          
        } catch (error) {
          this.log('warn', node.id, `Failed to download ${attachment.filename}: ${error}`);
        }
      }
    }

    this.context.results[node.id] = { attachmentsDownloaded: totalDownloaded };
  }

  private async sendGmailEmail(node: WorkflowNode): Promise<void> {
    if (!this.gmailService) return;

    const to = node.config.to as string;
    const subject = node.config.subject as string;
    const body = node.config.body as string;

    if (!to || !subject || !body) {
      throw new Error('Email requires to, subject, and body');
    }

    await this.gmailService.sendEmail(to, subject, body);
    this.context.results[node.id] = { emailSent: true };
  }

  private async markGmailAsRead(node: WorkflowNode): Promise<void> {
    if (!this.gmailService) return;

    const messages = this.context.variables.gmailMessages || [];
    const messageIds = messages.map((msg: any) => msg.id);

    if (messageIds.length > 0) {
      await this.gmailService.markAsRead(messageIds);
      this.context.results[node.id] = { messagesMarked: messageIds.length };
    }
  }

  private async executeDriveAction(node: WorkflowNode): Promise<void> {
    // Simulate Google Drive operations
    const actionType = node.config.action as string || 'upload_file';
    
    switch (actionType) {
      case 'upload_file':
        await this.simulateDelay(1000);
        this.log('info', node.id, 'File uploaded to Google Drive');
        break;
      case 'create_folder':
        await this.simulateDelay(500);
        const folderName = node.config.folderName as string || 'New Folder';
        this.log('info', node.id, `Created folder: ${folderName}`);
        break;
      default:
        this.log('info', node.id, `Google Drive action: ${actionType}`);
    }
    
    this.context.results[node.id] = { driveActionCompleted: true };
  }

  private async executeGitHubAction(node: WorkflowNode): Promise<void> {
    // Simulate GitHub operations
    const actionType = node.config.action as string || 'create_repo';
    
    switch (actionType) {
      case 'create_repo':
        await this.simulateDelay(1500);
        const repoName = node.config.name as string || 'new-repo';
        this.log('info', node.id, `Created GitHub repository: ${repoName}`);
        break;
      case 'create_issue':
        await this.simulateDelay(800);
        this.log('info', node.id, 'Created GitHub issue');
        break;
      default:
        this.log('info', node.id, `GitHub action: ${actionType}`);
    }
    
    this.context.results[node.id] = { githubActionCompleted: true };
  }

  private async executeTerminalAction(node: WorkflowNode): Promise<void> {
    // Simulate terminal command execution
    const commands = node.config.commands as string || 'echo "Hello World"';
    const commandList = commands.split('\n').filter(cmd => cmd.trim());
    
    for (const command of commandList) {
      await this.simulateDelay(500);
      this.log('info', node.id, `Executed: ${command.trim()}`);
    }
    
    this.context.results[node.id] = { commandsExecuted: commandList.length };
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(level: 'info' | 'warn' | 'error' | 'success', nodeId: string, message: string): void {
    const logEntry = {
      timestamp: Date.now(),
      nodeId,
      message,
      level
    };
    
    this.context.logs.push(logEntry);
    console.log(`[${level.toUpperCase()}] [${nodeId}] ${message}`);
  }

  getExecutionLogs(): Array<{
    timestamp: number;
    nodeId: string;
    message: string;
    level: 'info' | 'warn' | 'error' | 'success';
  }> {
    return [...this.context.logs];
  }

  getExecutionResults(): Record<string, any> {
    return { ...this.context.results };
  }
}

export default WorkflowExecutionEngine;