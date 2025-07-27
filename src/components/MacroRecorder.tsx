import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Timer,
  ExternalLink,
  Code,
  Globe
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
  text?: string;
  tagName?: string;
}

const MacroRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [actions, setActions] = useState<MacroAction[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [externalWindow, setExternalWindow] = useState<Window | null>(null);
  const { toast } = useToast();
  const actionIdCounter = useRef(0);
  const messageHandler = useRef<((event: MessageEvent) => void) | null>(null);

  const generateActionId = () => `action_${++actionIdCounter.current}`;

  // Generate the bookmarklet script that can be injected into any page
  const generateBookmarkletScript = () => {
    return `
(function() {
  if (window.macroRecorderActive) {
    alert('Macro recorder is already active on this page!');
    return;
  }
  
  window.macroRecorderActive = true;
  window.macroRecorderActions = window.macroRecorderActions || [];
  window.macroRecorderStartTime = window.macroRecorderStartTime || Date.now();
  
  // Store the script in window for re-injection
  window.macroRecorderScript = arguments.callee.toString();
  
  // Create floating UI
  const recorderUI = document.createElement('div');
  recorderUI.id = 'macro-recorder-ui';
  recorderUI.style.cssText = \`
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a1a1a;
    color: white;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 16px;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    min-width: 280px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
  \`;
  
  recorderUI.innerHTML = \`
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 2s infinite;"></div>
      <strong>Recording Actions</strong>
      <button id="stop-recording" style="margin-left: auto; background: #ef4444; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Stop</button>
    </div>
    <div id="action-count" style="color: #888; font-size: 12px;">\${window.macroRecorderActions.length} actions captured</div>
    <style>
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    </style>
  \`;
  
  document.body.appendChild(recorderUI);
  
  // Function to re-inject recorder on navigation
  function reinjectRecorder() {
    if (window.macroRecorderActive && !document.getElementById('macro-recorder-ui')) {
      setTimeout(() => {
        eval('(' + window.macroRecorderScript + ')()');
      }, 500);
    }
  }
  
  // Listen for navigation events
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(history, arguments);
    reinjectRecorder();
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    reinjectRecorder();
  };
  
  window.addEventListener('popstate', reinjectRecorder);
  
  // Watch for page changes with MutationObserver
  const observer = new MutationObserver(() => {
    if (window.macroRecorderActive && !document.getElementById('macro-recorder-ui')) {
      reinjectRecorder();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Enhanced selector generation
  function generateSelector(element) {
    if (element.id) return '#' + element.id;
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0 && !c.includes(' '));
      if (classes.length > 0) return '.' + classes[0];
    }
    
    // Try to generate a more specific selector
    let selector = element.tagName.toLowerCase();
    if (element.type) selector += \`[type="\${element.type}"]\`;
    if (element.name) selector += \`[name="\${element.name}"]\`;
    if (element.placeholder) selector += \`[placeholder="\${element.placeholder}"]\`;
    
    return selector;
  }
  
  function addAction(actionData) {
    const action = {
      ...actionData,
      id: 'action_' + (window.macroRecorderActions.length + 1),
      timestamp: Date.now() - window.macroRecorderStartTime,
      url: window.location.href
    };
    
    window.macroRecorderActions.push(action);
    document.getElementById('action-count').textContent = window.macroRecorderActions.length + ' actions captured';
    
    // Send to parent window if available
    try {
      window.parent.postMessage({
        type: 'MACRO_ACTION',
        action: action
      }, '*');
    } catch (e) {
      console.log('Could not send to parent:', e);
    }
  }
  
  // Event listeners
  function handleClick(e) {
    const target = e.target;
    addAction({
      type: 'click',
      element: target.tagName.toLowerCase(),
      coordinates: { x: e.clientX, y: e.clientY },
      selector: generateSelector(target),
      text: target.textContent?.substring(0, 50) || '',
      tagName: target.tagName
    });
  }
  
  function handleInput(e) {
    const target = e.target;
    addAction({
      type: 'input',
      element: target.tagName.toLowerCase(),
      value: target.value,
      selector: generateSelector(target),
      tagName: target.tagName
    });
  }
  
  function handleKeyPress(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    addAction({
      type: 'keypress',
      value: e.key,
      element: 'keyboard'
    });
  }
  
  function stopRecording() {
    window.macroRecorderActive = false;
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('input', handleInput, true);
    document.removeEventListener('keydown', handleKeyPress, true);
    
    // Send final results to parent window
    try {
      window.parent.postMessage({
        type: 'MACRO_COMPLETE',
        actions: window.macroRecorderActions,
        url: window.location.href
      }, '*');
    } catch (e) {
      // Download as fallback
      const script = generatePlaywrightScript(window.macroRecorderActions);
      const blob = new Blob([script], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recorded_macro_' + Date.now() + '.js';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    document.getElementById('macro-recorder-ui')?.remove();
  }
  
  function generatePlaywrightScript(actions) {
    const script = actions.map(action => {
      switch (action.type) {
        case 'click':
          return \`  await page.click('\${action.selector}'); // Click on \${action.element}\`;
        case 'input':
          return \`  await page.fill('\${action.selector}', '\${action.value}'); // Input: \${action.value}\`;
        case 'keypress':
          return \`  await page.keyboard.press('\${action.value}'); // Key: \${action.value}\`;
        default:
          return \`  // \${action.type}: \${action.element}\`;
      }
    }).join('\\n');

    return \`// Generated Automation Script for \${window.location.href}
// Total actions: \${actions.length}

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('\${window.location.href}');
  
\${script}
  
  await browser.close();
})();\`;
  }
  
  // Add event listeners
  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('keydown', handleKeyPress, true);
  
  // Stop button functionality
  document.getElementById('stop-recording').addEventListener('click', stopRecording);
  
  console.log('Macro recorder activated! Click the red button to stop recording.');
})();`;
  };

  // Handle messages from external windows
  useEffect(() => {
    messageHandler.current = (event: MessageEvent) => {
      if (event.data?.type === 'MACRO_ACTION') {
        const action = event.data.action;
        setActions(prev => [...prev, action]);
      } else if (event.data?.type === 'MACRO_COMPLETE') {
        setActions(prev => [...prev, ...event.data.actions]);
        setIsRecording(false);
        toast({
          title: "Recording Complete",
          description: `Captured ${event.data.actions.length} actions from ${event.data.url}`,
        });
      }
    };
    
    window.addEventListener('message', messageHandler.current);
    return () => {
      if (messageHandler.current) {
        window.removeEventListener('message', messageHandler.current);
      }
    };
  }, [toast]);

  const addAction = useCallback((actionData: Omit<MacroAction, 'id' | 'timestamp'>) => {
    if (!isRecording) return;
    
    const action: MacroAction = {
      ...actionData,
      id: generateActionId(),
      timestamp: Date.now() - (startTime || 0)
    };
    
    setActions(prev => [...prev, action]);
  }, [isRecording, startTime]);

  const generateBookmarklet = () => {
    const script = generateBookmarkletScript();
    return `javascript:${encodeURIComponent(script)}`;
  };

  const openExternalRecording = () => {
    const url = recordingUrl || 'https://example.com';
    const newWindow = window.open(url, '_blank', 'width=1200,height=800');
    if (newWindow) {
      setExternalWindow(newWindow);
      setIsRecording(true);
      setStartTime(Date.now());
      setActions([]);
      
      // Wait for the window to load then inject the bookmarklet
      const checkLoaded = setInterval(() => {
        try {
          if (newWindow.document && newWindow.document.readyState === 'complete') {
            clearInterval(checkLoaded);
            // Auto-inject the bookmarklet script
            (newWindow as any).eval(generateBookmarkletScript());
            toast({
              title: "Recording Started in External Window",
              description: "AutoFlow recorder is now active on the external page",
            });
          }
        } catch (e) {
          // Cross-origin restrictions - fallback to manual bookmarklet
          clearInterval(checkLoaded);
          toast({
            title: "External Window Opened",
            description: "Use the bookmarklet on that page to start recording",
            variant: "default"
          });
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkLoaded), 5000);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setStartTime(Date.now());
    setActions([]);
    
    // Add event listeners for recording on current page
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const selector = generateSelector(target);
      
      addAction({
        type: 'click',
        element: target.tagName.toLowerCase(),
        coordinates: { x: e.clientX, y: e.clientY },
        selector,
        text: target.textContent?.substring(0, 50) || '',
        tagName: target.tagName
      });
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const selector = generateSelector(target);
      
      addAction({
        type: 'input',
        element: target.tagName.toLowerCase(),
        value: target.value,
        selector,
        tagName: target.tagName
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
    
    // Close external window if open
    if (externalWindow && !externalWindow.closed) {
      externalWindow.close();
      setExternalWindow(null);
    }
    
    toast({
      title: "Recording Stopped",
      description: `Captured ${actions.length} actions`,
    });
  };

  const generateSelector = (element: Element): string => {
    if (element.id) return `#${element.id}`;
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0 && !c.includes(' '));
      if (classes.length > 0) return `.${classes[0]}`;
    }
    
    // Try to generate a more specific selector
    let selector = element.tagName.toLowerCase();
    if ((element as HTMLInputElement).type) selector += `[type="${(element as HTMLInputElement).type}"]`;
    if ((element as HTMLInputElement).name) selector += `[name="${(element as HTMLInputElement).name}"]`;
    if ((element as HTMLInputElement).placeholder) selector += `[placeholder="${(element as HTMLInputElement).placeholder}"]`;
    
    return selector;
  };

  const generateScript = () => {
    const groupedByUrl = actions.reduce((acc, action) => {
      const url = action.url || window.location.href;
      if (!acc[url]) acc[url] = [];
      acc[url].push(action);
      return acc;
    }, {} as Record<string, MacroAction[]>);

    const scripts = Object.entries(groupedByUrl).map(([url, urlActions]) => {
      const script = urlActions.map(action => {
        switch (action.type) {
          case 'click':
            return `  await page.click('${action.selector}'); // Click on ${action.element}${action.text ? ` - "${action.text}"` : ''}`;
          case 'input':
            return `  await page.fill('${action.selector}', '${action.value}'); // Input: ${action.value}`;
          case 'keypress':
            return `  await page.keyboard.press('${action.value}'); // Key: ${action.value}`;
          default:
            return `  // ${action.type}: ${action.element}`;
        }
      }).join('\n');

      return `  // Actions for ${url}\n  await page.goto('${url}');\n${script}`;
    }).join('\n\n');

    return `// Generated Cross-Website Automation Script
// Total actions: ${actions.length}
// Websites: ${Object.keys(groupedByUrl).length}
// Recording duration: ${startTime ? Math.round((Date.now() - startTime) / 1000) : 0}s

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
${scripts}
  
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
              <input
                type="url"
                placeholder="Enter website URL to record..."
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded-lg text-foreground flex-1 min-w-64"
              />
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
                variant="outline"
                onClick={openExternalRecording}
                disabled={!recordingUrl}
              >
                <ExternalLink className="w-4 h-4" />
                Record External
              </Button>
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
            {/* Bookmarklet Section */}
            <Card className="shadow-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span>Universal Recording Bookmarklet</span>
                </CardTitle>
                <CardDescription>
                  Drag this bookmarklet to your bookmarks bar to record on any website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-foreground">AutoFlow Recorder</span>
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(generateBookmarklet());
                      toast({
                        title: "Bookmarklet Copied",
                        description: "Paste this in your bookmarks bar or click to use",
                      });
                    }}>
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                  </div>
                  <Button 
                    className="inline-flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                    onClick={() => {
                      const bookmarkletCode = generateBookmarklet();
                      navigator.clipboard.writeText(bookmarkletCode);
                      toast({
                        title: "Bookmarklet Code Copied",
                        description: "Create a new bookmark and paste this as the URL to use anywhere",
                      });
                    }}
                  >
                    <Code className="w-4 h-4" />
                    <span>Get AutoFlow Recorder</span>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Drag this button to your bookmarks bar, then click it on any website to start recording interactions
                  </p>
                </div>
              </CardContent>
            </Card>

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
                <CardTitle>Recording Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center mt-0.5 font-bold">1</span>
                    <div>
                      <p className="font-medium text-foreground">Current Page Recording</p>
                      <p>Click "Start Recording" to record interactions on this page</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center mt-0.5 font-bold">2</span>
                    <div>
                      <p className="font-medium text-foreground">External Website</p>
                      <p>Enter a URL and click "Record External" to open in new window</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="w-6 h-6 bg-primary text-primary-foreground rounded text-xs flex items-center justify-center mt-0.5 font-bold">3</span>
                    <div>
                      <p className="font-medium text-foreground">Universal Bookmarklet</p>
                      <p>Use the bookmarklet above for maximum compatibility across all websites</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  <span className="text-muted-foreground">Websites Recorded:</span>
                  <span className="font-semibold text-foreground">
                    {actions.length > 0 ? 
                      new Set(actions.map(a => a.url || window.location.href)).size : 0}
                  </span>
                </div>
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