// Terminal Service for Command Execution
// This service provides functionality to simulate terminal command execution

export interface TerminalConfig {
  workingDirectory?: string;
  environment?: Record<string, string>;
  shell?: string;
  timeout?: number;
}

export interface CommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  command: string;
}

export interface CommandExecution {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  result?: CommandResult;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'setup' | 'build' | 'deploy' | 'maintenance' | 'utility';
  commands: string[];
  variables?: Record<string, string>;
}

class TerminalService {
  private config: TerminalConfig;
  private executions: Map<string, CommandExecution> = new Map();
  private commandHistory: string[] = [];

  constructor(config: TerminalConfig = {}) {
    this.config = {
      workingDirectory: config.workingDirectory || '~/workspace',
      environment: config.environment || {},
      shell: config.shell || 'bash',
      timeout: config.timeout || 30000,
      ...config
    };
  }

  async executeCommand(command: string, options: {
    timeout?: number;
    cwd?: string;
    env?: Record<string, string>;
  } = {}): Promise<CommandResult> {
    console.log(`Executing command: ${command}`);
    
    const startTime = Date.now();
    const executionId = `cmd_${startTime}`;
    
    // Add to history
    this.commandHistory.unshift(command);
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(0, 100);
    }
    
    // Create execution record
    const execution: CommandExecution = {
      id: executionId,
      command,
      status: 'running',
      startTime
    };
    this.executions.set(executionId, execution);
    
    try {
      // Simulate command execution based on the command type
      const result = await this.simulateCommandExecution(command);
      
      execution.status = result.success ? 'completed' : 'error';
      execution.endTime = Date.now();
      execution.result = result;
      
      console.log(`Command ${result.success ? 'completed' : 'failed'}: ${command}`);
      return result;
      
    } catch (error) {
      const errorResult: CommandResult = {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        command
      };
      
      execution.status = 'error';
      execution.endTime = Date.now();
      execution.result = errorResult;
      
      console.error(`Command failed: ${command}`, error);
      return errorResult;
    }
  }

  async executeScript(commands: string[], stopOnError = true): Promise<CommandResult[]> {
    console.log(`Executing script with ${commands.length} commands`);
    
    const results: CommandResult[] = [];
    
    for (const command of commands) {
      if (command.trim() === '' || command.trim().startsWith('#')) {
        continue; // Skip empty lines and comments
      }
      
      const result = await this.executeCommand(command.trim());
      results.push(result);
      
      if (!result.success && stopOnError) {
        console.log(`Script execution stopped due to error in command: ${command}`);
        break;
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`Script execution completed: ${successCount}/${results.length} commands successful`);
    
    return results;
  }

  private async simulateCommandExecution(command: string): Promise<CommandResult> {
    const startTime = Date.now();
    
    // Simulate execution delay based on command type
    const delay = this.getExecutionDelay(command);
    await this.simulateDelay(delay);
    
    const duration = Date.now() - startTime;
    
    // Simulate different command types
    if (command.startsWith('npm install') || command.startsWith('yarn install')) {
      return this.simulateNpmInstall(command, duration);
    }
    
    if (command.startsWith('npm run') || command.startsWith('yarn run')) {
      return this.simulateNpmRun(command, duration);
    }
    
    if (command.startsWith('git ')) {
      return this.simulateGitCommand(command, duration);
    }
    
    if (command.startsWith('docker ')) {
      return this.simulateDockerCommand(command, duration);
    }
    
    if (command.startsWith('curl ') || command.startsWith('wget ')) {
      return this.simulateHttpCommand(command, duration);
    }
    
    if (command.includes('mkdir') || command.includes('touch') || command.includes('cp') || command.includes('mv')) {
      return this.simulateFileOperation(command, duration);
    }
    
    if (command.includes('ls') || command.includes('dir') || command.includes('pwd')) {
      return this.simulateDirectoryCommand(command, duration);
    }
    
    // Generic command simulation
    return this.simulateGenericCommand(command, duration);
  }

  private simulateNpmInstall(command: string, duration: number): CommandResult {
    const packages = command.includes('@') ? 'dev packages' : 'dependencies';
    return {
      success: true,
      exitCode: 0,
      stdout: `added 237 packages from 156 contributors and audited 521 packages in ${(duration / 1000).toFixed(1)}s\nfound 0 vulnerabilities`,
      stderr: '',
      duration,
      command
    };
  }

  private simulateNpmRun(command: string, duration: number): CommandResult {
    const script = command.split(' ')[2] || 'script';
    
    if (script === 'build') {
      return {
        success: true,
        exitCode: 0,
        stdout: `> Building project...\n✓ Build completed successfully\nDist files written to ./dist/\nBuild time: ${(duration / 1000).toFixed(1)}s`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (script === 'test') {
      return {
        success: true,
        exitCode: 0,
        stdout: `> Running tests...\n✓ All tests passed (15/15)\nTest time: ${(duration / 1000).toFixed(1)}s`,
        stderr: '',
        duration,
        command
      };
    }
    
    return {
      success: true,
      exitCode: 0,
      stdout: `> ${script}@1.0.0 ${script}\n> Script executed successfully`,
      stderr: '',
      duration,
      command
    };
  }

  private simulateGitCommand(command: string, duration: number): CommandResult {
    if (command.includes('clone')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `Cloning into 'repository'...\nremote: Enumerating objects: 1247, done.\nremote: Total 1247 (delta 0), reused 0 (delta 0)\nReceiving objects: 100% (1247/1247), 2.5 MiB | 1.2 MiB/s, done.\nResolving deltas: 100% (543/543), done.`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('status')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  modified: src/App.tsx\n  modified: package.json\n\nno changes added to commit`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('add')) {
      return {
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('commit')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `[main abc1234] Added new features\n 2 files changed, 47 insertions(+), 12 deletions(-)`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('push')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `Enumerating objects: 7, done.\nCounting objects: 100% (7/7), done.\nDelta compression using up to 8 threads\nCompressing objects: 100% (4/4), done.\nWriting objects: 100% (4/4), 1.2 KiB | 1.2 MiB/s, done.\nTotal 4 (delta 2), reused 0 (delta 0)\nTo https://github.com/user/repo.git\n   def5678..abc1234  main -> main`,
        stderr: '',
        duration,
        command
      };
    }
    
    return {
      success: true,
      exitCode: 0,
      stdout: `Git command executed: ${command}`,
      stderr: '',
      duration,
      command
    };
  }

  private simulateDockerCommand(command: string, duration: number): CommandResult {
    if (command.includes('build')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `Sending build context to Docker daemon...\nStep 1/5 : FROM node:16\n ---> 1234567890ab\nStep 2/5 : WORKDIR /app\n ---> Using cache\n ---> abcdef123456\n...\nSuccessfully built abcdef123456\nSuccessfully tagged myapp:latest`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('run')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `Container started successfully\nContainer ID: abc123def456`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('ps')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS                    NAMES\nabc123def456   myapp     "docker-entrypoint.s…"   2 minutes ago   Up 2 minutes   0.0.0.0:3000->3000/tcp   myapp-container`,
        stderr: '',
        duration,
        command
      };
    }
    
    return {
      success: true,
      exitCode: 0,
      stdout: `Docker command executed: ${command}`,
      stderr: '',
      duration,
      command
    };
  }

  private simulateHttpCommand(command: string, duration: number): CommandResult {
    const url = command.split(' ').find(arg => arg.startsWith('http')) || 'URL';
    
    return {
      success: true,
      exitCode: 0,
      stdout: `HTTP/1.1 200 OK\nContent-Length: 1234\nContent-Type: application/json\n\n{"status": "success", "data": "..."}`,
      stderr: '',
      duration,
      command
    };
  }

  private simulateFileOperation(command: string, duration: number): CommandResult {
    if (command.includes('mkdir')) {
      const dir = command.split(' ').pop() || 'directory';
      return {
        success: true,
        exitCode: 0,
        stdout: `Created directory: ${dir}`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('touch')) {
      const file = command.split(' ').pop() || 'file';
      return {
        success: true,
        exitCode: 0,
        stdout: `Created file: ${file}`,
        stderr: '',
        duration,
        command
      };
    }
    
    return {
      success: true,
      exitCode: 0,
      stdout: `File operation completed: ${command}`,
      stderr: '',
      duration,
      command
    };
  }

  private simulateDirectoryCommand(command: string, duration: number): CommandResult {
    if (command.includes('ls') || command.includes('dir')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `total 12\ndrwxr-xr-x 3 user user 4096 Jan 15 10:30 .\ndrwxr-xr-x 5 user user 4096 Jan 15 10:25 ..\n-rw-r--r-- 1 user user 1234 Jan 15 10:30 package.json\ndrwxr-xr-x 2 user user 4096 Jan 15 10:30 src\n-rw-r--r-- 1 user user  567 Jan 15 10:30 README.md`,
        stderr: '',
        duration,
        command
      };
    }
    
    if (command.includes('pwd')) {
      return {
        success: true,
        exitCode: 0,
        stdout: `/home/user/workspace/project`,
        stderr: '',
        duration,
        command
      };
    }
    
    return {
      success: true,
      exitCode: 0,
      stdout: `Directory command executed: ${command}`,
      stderr: '',
      duration,
      command
    };
  }

  private simulateGenericCommand(command: string, duration: number): CommandResult {
    // Simulate some commands that might fail
    if (command.includes('rm -rf /') || command.includes('format')) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Permission denied: dangerous operation blocked',
        duration,
        command
      };
    }
    
    return {
      success: true,
      exitCode: 0,
      stdout: `Command executed successfully: ${command}\nOutput generated at ${new Date().toLocaleTimeString()}`,
      stderr: '',
      duration,
      command
    };
  }

  private getExecutionDelay(command: string): number {
    // Simulate realistic execution times
    if (command.includes('npm install') || command.includes('yarn install')) {
      return 3000 + Math.random() * 2000; // 3-5 seconds
    }
    
    if (command.includes('build') || command.includes('compile')) {
      return 2000 + Math.random() * 3000; // 2-5 seconds
    }
    
    if (command.includes('test')) {
      return 1500 + Math.random() * 2500; // 1.5-4 seconds
    }
    
    if (command.includes('docker build')) {
      return 5000 + Math.random() * 5000; // 5-10 seconds
    }
    
    if (command.includes('git clone')) {
      return 2000 + Math.random() * 3000; // 2-5 seconds
    }
    
    // Default delay for most commands
    return 200 + Math.random() * 800; // 200ms-1s
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get predefined script templates
  getScriptTemplates(): ScriptTemplate[] {
    return [
      {
        id: 'react-setup',
        name: 'React Project Setup',
        description: 'Initialize a new React project with TypeScript',
        category: 'setup',
        commands: [
          'npx create-react-app {{projectName}} --template typescript',
          'cd {{projectName}}',
          'npm install',
          'npm start'
        ],
        variables: {
          projectName: 'my-react-app'
        }
      },
      {
        id: 'node-project',
        name: 'Node.js Project Setup',
        description: 'Initialize a Node.js project with Express',
        category: 'setup',
        commands: [
          'mkdir {{projectName}}',
          'cd {{projectName}}',
          'npm init -y',
          'npm install express',
          'npm install -D nodemon @types/node',
          'touch server.js',
          'echo "console.log(\'Hello World\');" > server.js'
        ],
        variables: {
          projectName: 'my-node-app'
        }
      },
      {
        id: 'git-workflow',
        name: 'Git Workflow',
        description: 'Standard git workflow for feature development',
        category: 'utility',
        commands: [
          'git checkout main',
          'git pull origin main',
          'git checkout -b feature/{{featureName}}',
          'git add .',
          'git commit -m "{{commitMessage}}"',
          'git push origin feature/{{featureName}}'
        ],
        variables: {
          featureName: 'new-feature',
          commitMessage: 'Add new feature'
        }
      },
      {
        id: 'deployment',
        name: 'Production Deployment',
        description: 'Build and deploy application to production',
        category: 'deploy',
        commands: [
          'npm run build',
          'npm run test',
          'docker build -t {{appName}}:latest .',
          'docker push {{registry}}/{{appName}}:latest',
          'kubectl set image deployment/{{appName}} {{appName}}={{registry}}/{{appName}}:latest'
        ],
        variables: {
          appName: 'my-app',
          registry: 'registry.example.com'
        }
      }
    ];
  }

  // Execute a script template with variable substitution
  async executeTemplate(templateId: string, variables: Record<string, string> = {}): Promise<CommandResult[]> {
    const template = this.getScriptTemplates().find(t => t.id === templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Substitute variables in commands
    const commands = template.commands.map(command => {
      let substituted = command;
      const allVariables = { ...template.variables, ...variables };
      
      Object.entries(allVariables).forEach(([key, value]) => {
        substituted = substituted.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      
      return substituted;
    });

    console.log(`Executing template: ${template.name}`);
    return this.executeScript(commands);
  }

  // Get command history
  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  // Get execution details
  getExecution(id: string): CommandExecution | undefined {
    return this.executions.get(id);
  }

  // Get all executions
  getAllExecutions(): CommandExecution[] {
    return Array.from(this.executions.values());
  }

  // Clear history
  clearHistory(): void {
    this.commandHistory = [];
  }

  // Clear executions
  clearExecutions(): void {
    this.executions.clear();
  }
}

export default TerminalService;