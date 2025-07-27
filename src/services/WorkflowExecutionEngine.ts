// Enhanced Workflow Execution Engine
// Executes workflows by running nodes in sequence and handling service integrations

import GmailService, { GmailConfig, GmailFilter } from './GmailService';
import DriveService, { DriveConfig } from './DriveService';
import GitHubService, { GitHubConfig } from './GitHubService';
import TerminalService, { TerminalConfig } from './TerminalService';

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

export interface WorkflowMetrics {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  executionTime: number;
  avgNodeTime: number;
  successRate: number;
}

class WorkflowExecutionEngine {
  private gmailService?: GmailService;
  private driveService?: DriveService;
  private githubService?: GitHubService;
  private terminalService?: TerminalService;
  private context: ExecutionContext;
  private startTime?: number;
  private nodeExecutionTimes: Record<string, number> = {};

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
    this.startTime = Date.now();
    this.log('info', 'workflow-start', `Starting workflow: ${workflow.name}`);
    
    try {
      // Initialize services based on workflow requirements
      await this.initializeServices(workflow);
      
      // Find the trigger node (starting point)
      const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
      if (!triggerNode) {
        throw new Error('Workflow must have a trigger node');
      }

      // Execute nodes in sequence
      await this.executeNode(triggerNode, workflow, onProgress);
      
      const executionTime = Date.now() - this.startTime;
      this.log('success', 'workflow-complete', `Workflow completed successfully in ${executionTime}ms`);
      
      // Add execution metrics to context
      this.context.variables.executionMetrics = this.calculateMetrics(workflow, executionTime);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'workflow-error', `Workflow failed: ${errorMessage}`);
      throw error;
    }
    
    return this.context;
  }

  private async initializeServices(workflow: WorkflowTemplate): Promise<void> {
    const servicesUsed = new Set(
      workflow.nodes
        .filter(node => node.service)
        .map(node => node.service!)
    );

    if (servicesUsed.has('gmail')) {
      const gmailConfig: GmailConfig = {
        clientId: 'demo-client-id',
        clientSecret: 'demo-client-secret',
        apiKey: 'demo-api-key'
      };
      
      this.gmailService = new GmailService(gmailConfig);
      await this.gmailService.authenticate();
      this.log('info', 'service-init', 'Gmail service initialized');
    }

    if (servicesUsed.has('drive')) {
      const driveConfig: DriveConfig = {
        clientId: 'demo-client-id',
        clientSecret: 'demo-client-secret',
        apiKey: 'demo-api-key'
      };
      
      this.driveService = new DriveService(driveConfig);
      await this.driveService.authenticate();
      this.log('info', 'service-init', 'Google Drive service initialized');
    }

    if (servicesUsed.has('github')) {
      const githubConfig: GitHubConfig = {
        token: 'demo-token',
        username: 'demo-user'
      };
      
      this.githubService = new GitHubService(githubConfig);
      await this.githubService.authenticate();
      this.log('info', 'service-init', 'GitHub service initialized');
    }

    if (servicesUsed.has('terminal')) {
      const terminalConfig: TerminalConfig = {
        workingDirectory: '~/workspace',
        shell: 'bash'
      };
      
      this.terminalService = new TerminalService(terminalConfig);
      this.log('info', 'service-init', 'Terminal service initialized');
    }
  }

  private async executeNode(
    node: WorkflowNode,
    workflow: WorkflowTemplate,
    onProgress?: (nodeId: string, status: 'running' | 'completed' | 'error', message: string) => void
  ): Promise<void> {
    const nodeStartTime = Date.now();
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

      const executionTime = Date.now() - nodeStartTime;
      this.nodeExecutionTimes[node.id] = executionTime;
      
      this.log('success', node.id, `Node completed: ${node.title} (${executionTime}ms)`);
      onProgress?.(node.id, 'completed', `Completed: ${node.title}`);

      // Execute connected nodes
      for (const connectionId of node.connections) {
        const connectedNode = workflow.nodes.find(n => n.id === connectionId);
        if (connectedNode) {
          await this.executeNode(connectedNode, workflow, onProgress);
        }
      }

    } catch (error) {
      const executionTime = Date.now() - nodeStartTime;
      this.nodeExecutionTimes[node.id] = executionTime;
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', node.id, `Node failed: ${errorMessage} (${executionTime}ms)`);
      onProgress?.(node.id, 'error', `Error: ${errorMessage}`);
      throw error;
    }
  }

  private async executeTrigger(node: WorkflowNode): Promise<void> {
    switch (node.service) {
      case 'gmail':
        await this.executeGmailTrigger(node);
        break;
      case 'github':
        await this.executeGitHubTrigger(node);
        break;
      case 'drive':
        await this.executeDriveTrigger(node);
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
    const condition = node.config.condition as string || 'true';
    
    let result = false;
    try {
      // Enhanced condition evaluation
      if (condition === 'true') {
        result = true;
      } else if (condition === 'false') {
        result = false;
      } else if (condition.includes('email_count')) {
        const emailCount = this.context.variables.gmailMessages?.length || 0;
        const match = condition.match(/email_count\s*([><=]+)\s*(\d+)/);
        if (match) {
          const operator = match[1];
          const threshold = parseInt(match[2]);
          switch (operator) {
            case '>': result = emailCount > threshold; break;
            case '<': result = emailCount < threshold; break;
            case '>=': result = emailCount >= threshold; break;
            case '<=': result = emailCount <= threshold; break;
            case '==': result = emailCount === threshold; break;
            default: result = true;
          }
        }
      } else {
        // For demo purposes, default to true for other conditions
        result = true;
      }
    } catch (error) {
      result = false;
    }
    
    this.context.variables[`${node.id}_result`] = result;
    this.log('info', node.id, `Condition "${condition}" evaluated to: ${result}`);
  }

  private async executeDelay(node: WorkflowNode): Promise<void> {
    const duration = (node.config.duration as number) || 1;
    this.log('info', node.id, `Waiting for ${duration} seconds...`);
    await new Promise(resolve => setTimeout(resolve, duration * 1000));
  }

  // Gmail service methods
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

    const actionType = node.config.action as string || node.title.toLowerCase().replace(/\s+/g, '_');
    
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

  // Google Drive service methods
  private async executeDriveTrigger(node: WorkflowNode): Promise<void> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    const folderId = node.config.folderId as string;
    const files = await this.driveService.listFiles(folderId, 10);
    this.context.variables.driveFiles = files;
    this.context.results[node.id] = { fileCount: files.length };
    
    this.log('info', node.id, `Found ${files.length} files in Drive folder`);
  }

  private async executeDriveAction(node: WorkflowNode): Promise<void> {
    if (!this.driveService) {
      throw new Error('Google Drive service not initialized');
    }

    const actionType = node.config.action as string || node.title.toLowerCase().replace(/\s+/g, '_');
    
    switch (actionType) {
      case 'upload_file':
        await this.uploadFileToDrive(node);
        break;
      case 'create_folder':
        await this.createDriveFolder(node);
        break;
      case 'organize_files':
        await this.organizeDriveFiles(node);
        break;
      default:
        this.log('info', node.id, `Google Drive action: ${actionType}`);
    }
  }

  // GitHub service methods
  private async executeGitHubTrigger(node: WorkflowNode): Promise<void> {
    if (!this.githubService) {
      throw new Error('GitHub service not initialized');
    }

    const repo = node.config.repo as string || node.config.repository as string;
    if (repo) {
      const issues = await this.githubService.getIssues(repo, 'open');
      this.context.variables.githubIssues = issues;
      this.context.results[node.id] = { issueCount: issues.length };
      
      this.log('info', node.id, `Found ${issues.length} open issues in ${repo}`);
    }
  }

  private async executeGitHubAction(node: WorkflowNode): Promise<void> {
    if (!this.githubService) {
      throw new Error('GitHub service not initialized');
    }

    const actionType = node.config.action as string || node.title.toLowerCase().replace(/\s+/g, '_');
    
    switch (actionType) {
      case 'create_repository':
        await this.createGitHubRepository(node);
        break;
      case 'create_issue':
        await this.createGitHubIssue(node);
        break;
      case 'create_pull_request':
        await this.createGitHubPullRequest(node);
        break;
      case 'trigger_workflow':
        await this.triggerGitHubWorkflow(node);
        break;
      default:
        this.log('info', node.id, `GitHub action: ${actionType}`);
    }
  }

  // Terminal service methods
  private async executeTerminalAction(node: WorkflowNode): Promise<void> {
    if (!this.terminalService) {
      throw new Error('Terminal service not initialized');
    }

    const commands = node.config.commands as string || node.config.command as string;
    
    if (!commands) {
      throw new Error('No commands specified for terminal action');
    }

    const commandList = commands.split('\n').filter(cmd => cmd.trim());
    const results = await this.terminalService.executeScript(commandList);
    
    const successCount = results.filter(r => r.success).length;
    this.context.results[node.id] = { 
      commandsExecuted: results.length,
      successfulCommands: successCount,
      results: results
    };
    
    this.log('info', node.id, `Executed ${results.length} commands, ${successCount} successful`);
  }

  // Helper methods for specific actions
  private async downloadGmailAttachments(node: WorkflowNode): Promise<void> {
    if (!this.gmailService) return;

    const messages = this.context.variables.gmailMessages || [];
    let totalDownloaded = 0;

    for (const message of messages) {
      const attachments = this.gmailService.extractAttachments(message);
      
      for (const attachment of attachments) {
        try {
          const blob = await this.gmailService.downloadAttachment(message.id, attachment.attachmentId);
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

  private async uploadFileToDrive(node: WorkflowNode): Promise<void> {
    if (!this.driveService) return;

    // This would typically use actual files from the context
    // For demo, we'll simulate file upload
    const mockFile = new File(['mock content'], 'test-file.txt', { type: 'text/plain' });
    const folderId = node.config.folderId as string;
    
    const result = await this.driveService.uploadFile(mockFile, folderId);
    this.context.results[node.id] = result;
  }

  private async createDriveFolder(node: WorkflowNode): Promise<void> {
    if (!this.driveService) return;

    const folderName = node.config.folderName as string || node.config.name as string;
    const parentId = node.config.parentId as string;
    
    if (!folderName) {
      throw new Error('Folder name is required');
    }

    const result = await this.driveService.createFolder(folderName, parentId);
    this.context.results[node.id] = result;
  }

  private async organizeDriveFiles(node: WorkflowNode): Promise<void> {
    if (!this.driveService) return;

    const sourceFolder = node.config.sourceFolder as string || 'root';
    const rules = JSON.parse(node.config.rules as string || '[]');
    
    const result = await this.driveService.organizeFiles(sourceFolder, rules);
    this.context.results[node.id] = result;
  }

  private async createGitHubRepository(node: WorkflowNode): Promise<void> {
    if (!this.githubService) return;

    const name = node.config.name as string;
    const description = node.config.description as string;
    const isPrivate = node.config.private as boolean || false;
    
    if (!name) {
      throw new Error('Repository name is required');
    }

    const result = await this.githubService.createRepository(name, description, isPrivate);
    this.context.results[node.id] = result;
  }

  private async createGitHubIssue(node: WorkflowNode): Promise<void> {
    if (!this.githubService) return;

    const repo = node.config.repo as string || node.config.repository as string;
    const title = node.config.title as string;
    const body = node.config.body as string;
    const labels = node.config.labels as string;
    
    if (!repo || !title) {
      throw new Error('Repository and title are required');
    }

    const labelArray = labels ? labels.split(',').map(l => l.trim()) : undefined;
    const result = await this.githubService.createIssue(repo, title, body, labelArray);
    this.context.results[node.id] = result;
  }

  private async createGitHubPullRequest(node: WorkflowNode): Promise<void> {
    if (!this.githubService) return;

    const repo = node.config.repo as string || node.config.repository as string;
    const title = node.config.title as string;
    const head = node.config.head as string;
    const base = node.config.base as string || 'main';
    const body = node.config.body as string;
    
    if (!repo || !title || !head) {
      throw new Error('Repository, title, and head branch are required');
    }

    const result = await this.githubService.createPullRequest(repo, title, head, base, body);
    this.context.results[node.id] = result;
  }

  private async triggerGitHubWorkflow(node: WorkflowNode): Promise<void> {
    if (!this.githubService) return;

    const repo = node.config.repo as string || node.config.repository as string;
    const workflowId = node.config.workflowId as string;
    const ref = node.config.ref as string || 'main';
    const inputs = node.config.inputs ? JSON.parse(node.config.inputs as string) : undefined;
    
    if (!repo || !workflowId) {
      throw new Error('Repository and workflow ID are required');
    }

    const result = await this.githubService.triggerWorkflow(repo, workflowId, ref, inputs);
    this.context.results[node.id] = result;
  }

  private calculateMetrics(workflow: WorkflowTemplate, totalExecutionTime: number): WorkflowMetrics {
    const totalNodes = workflow.nodes.length;
    const completedNodes = Object.keys(this.nodeExecutionTimes).length;
    const failedNodes = totalNodes - completedNodes;
    const avgNodeTime = completedNodes > 0 ? 
      Object.values(this.nodeExecutionTimes).reduce((a, b) => a + b, 0) / completedNodes : 0;
    const successRate = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

    return {
      totalNodes,
      completedNodes,
      failedNodes,
      executionTime: totalExecutionTime,
      avgNodeTime,
      successRate
    };
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

  getExecutionMetrics(): WorkflowMetrics | undefined {
    return this.context.variables.executionMetrics;
  }
}

export default WorkflowExecutionEngine;