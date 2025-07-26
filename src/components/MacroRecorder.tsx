import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Square, 
  Trash2, 
  Copy, 
  Download,
  Eye,
  EyeOff,
  MousePointer,
  Type,
  Navigation,
  Timer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MacroAction {
  id: string;
  timestamp: number;
  type: 'click' | 'input' | 'navigation' | 'scroll' | 'keypress';
  element?: string;
  value?: string;
  coordinates?: { x: number; y: number };
  url?: string;
  selector?: string;
}

const MacroRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [actions, setActions] = useState<MacroAction[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const actionIdCounter = useRef(0);

  const generateActionId = () => `action_${++actionIdCounter.current}`;

  const addAction = useCallback((actionData: Omit<MacroAction, 'id' | 'timestamp'>) => {
    if (!isRecording) return;
    
    const action: MacroAction = {
      ...actionData,
      id: generateActionId(),
      timestamp: Date.now() - (startTime || 0)
    };
    
    setActions(prev => [...prev, action]);
  }, [isRecording, startTime]);

  const startRecording = () => {
    setIsRecording(true);
    setStartTime(Date.now());
    setActions([]);
    
    // Add event listeners for recording
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const selector = generateSelector(target);
      
      addAction({
        type: 'click',
        element: target.tagName.toLowerCase(),
        coordinates: { x: e.clientX, y: e.clientY },
        selector
      });
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const selector = generateSelector(target);
      
      addAction({
        type: 'input',
        element: target.tagName.toLowerCase(),
        value: target.value,
        selector
      });
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isRecording) {
        stopRecording();
        return;
      }
      
      addAction({
        type: 'keypress',
        value: e.key,
        element: 'keyboard'
      });
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeyPress, true);

    // Store listeners for cleanup
    (window as any).macroListeners = { handleClick, handleInput, handleKeyPress };
    
    toast({
      title: "Recording Started",
      description: "All your interactions are now being recorded. Press ESC to stop.",
    });
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    // Remove event listeners
    const listeners = (window as any).macroListeners;
    if (listeners) {
      document.removeEventListener('click', listeners.handleClick, true);
      document.removeEventListener('input', listeners.handleInput, true);
      document.removeEventListener('keydown', listeners.handleKeyPress, true);
      delete (window as any).macroListeners;
    }
    
    toast({
      title: "Recording Stopped",
      description: `Captured ${actions.length} actions`,
    });
  };

  const generateSelector = (element: Element): string => {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) return `.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
  };

  const generateScript = () => {
    const script = actions.map(action => {
      switch (action.type) {
        case 'click':
          return `await page.click('${action.selector}'); // Click on ${action.element}`;
        case 'input':
          return `await page.fill('${action.selector}', '${action.value}'); // Input: ${action.value}`;
        case 'keypress':
          return `await page.keyboard.press('${action.value}'); // Key: ${action.value}`;
        default:
          return `// ${action.type}: ${action.element}`;
      }
    }).join('\n');

    return `// Generated Automation Script
// Total actions: ${actions.length}
// Recording duration: ${startTime ? Math.round((Date.now() - startTime) / 1000) : 0}s

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('${window.location.origin}');
  
${script.split('\n').map(line => `  ${line}`).join('\n')}
  
  await browser.close();
})();`;
  };

  const copyScript = () => {
    navigator.clipboard.writeText(generateScript());
    toast({
      title: "Script Copied",
      description: "Automation script copied to clipboard",
    });
  };

  const downloadScript = () => {
    const script = generateScript();
    const blob = new Blob([script], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `macro_${Date.now()}.js`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearActions = () => {
    setActions([]);
    toast({
      title: "Actions Cleared",
      description: "All recorded actions have been removed",
    });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'click': return <MousePointer className="w-4 h-4" />;
      case 'input': return <Type className="w-4 h-4" />;
      case 'navigation': return <Navigation className="w-4 h-4" />;
      default: return <Timer className="w-4 h-4" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'click': return 'text-blue-400';
      case 'input': return 'text-green-400';
      case 'navigation': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Macro Recorder</h1>
              <p className="text-muted-foreground">Record interactions and generate automation scripts</p>
            </div>
            <div className="flex items-center space-x-3">
              {actions.length > 0 && (
                <>
                  <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPreview ? 'Hide' : 'Show'} Script
                  </Button>
                  <Button variant="outline" onClick={copyScript}>
                    <Copy className="w-4 h-4" />
                    Copy Script
                  </Button>
                  <Button variant="outline" onClick={downloadScript}>
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={clearActions}>
                    <Trash2 className="w-4 h-4" />
                    Clear
                  </Button>
                </>
              )}
              <Button 
                variant={isRecording ? "destructive" : "glow"}
                onClick={isRecording ? stopRecording : startRecording}
                className="min-w-32"
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Recording
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recording Status */}
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-foreground">
                        {isRecording ? 'Recording in Progress' : 'Ready to Record'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isRecording 
                          ? `${actions.length} actions captured`
                          : 'Click "Start Recording" to begin capturing interactions'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant={isRecording ? "destructive" : "secondary"}>
                    {isRecording ? 'LIVE' : 'IDLE'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Script Preview */}
            {showPreview && actions.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Generated Script</CardTitle>
                  <CardDescription>
                    Playwright automation script based on recorded actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/30 p-4 rounded-lg text-sm overflow-auto max-h-96 text-foreground">
                    {generateScript()}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Actions List */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Recorded Actions ({actions.length})</CardTitle>
                <CardDescription>
                  Sequence of captured user interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MousePointer className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No actions recorded yet</p>
                    <p className="text-sm">Start recording to capture your interactions</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {actions.map((action, index) => (
                      <div key={action.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-muted-foreground w-8">#{index + 1}</span>
                          <div className={`${getActionColor(action.type)}`}>
                            {getActionIcon(action.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground capitalize">
                              {action.type} {action.element && `on ${action.element}`}
                            </p>
                            {action.value && (
                              <p className="text-xs text-muted-foreground">Value: {action.value}</p>
                            )}
                            {action.coordinates && (
                              <p className="text-xs text-muted-foreground">
                                Position: ({action.coordinates.x}, {action.coordinates.y})
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          +{Math.round(action.timestamp / 1000)}s
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>How to Use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center mt-0.5 font-bold">1</span>
                  <p>Click "Start Recording" to begin capturing your interactions</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center mt-0.5 font-bold">2</span>
                  <p>Interact with the page normally - clicks, inputs, and keystrokes will be recorded</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center mt-0.5 font-bold">3</span>
                  <p>Press ESC or click "Stop Recording" when finished</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="w-5 h-5 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center mt-0.5 font-bold">4</span>
                  <p>Generate and download your automation script</p>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Actions:</span>
                  <span className="font-semibold text-foreground">{actions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recording Time:</span>
                  <span className="font-semibold text-foreground">
                    {startTime && isRecording 
                      ? `${Math.round((Date.now() - startTime) / 1000)}s`
                      : '0s'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={isRecording ? "destructive" : "secondary"}>
                    {isRecording ? 'Recording' : 'Stopped'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroRecorder;