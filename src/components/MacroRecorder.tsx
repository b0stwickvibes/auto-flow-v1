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

interface MacroListeners {
  handleClick: (e: MouseEvent) => void;
  handleInput: (e: Event) => void;
  handleKeyPress: (e: KeyboardEvent) => void;
}

interface WindowWithAutoFlow extends Window {
  autoFlowParentOrigin?: string;
}

interface WindowWithMacroRecorder extends Window {
  macroListeners?: MacroListeners;
}

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
    if (document.getElementById('macro-recorder-ui')) {
      alert('Macro recorder is already active on this page!');
      return;
    }
  }
  
  window.macroRecorderActive = true;
  window.macroRecorderActions = window.macroRecorderActions || [];
  window.macroRecorderStartTime = window.macroRecorderStartTime || Date.now();
  
  // Store the script in window for re-injection
  window.macroRecorderScript = arguments.callee.toString();
  
  // Create floating draggable UI
  const recorderUI = document.createElement('div');
  recorderUI.id = 'macro-recorder-ui';
  recorderUI.style.cssText = \`
    position: fixed;
    top: 80px;
    left: 20px;
    background: linear-gradient(135deg, rgba(26, 26, 26, 0.95), rgba(46, 46, 46, 0.95));
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 16px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    width: 280px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    cursor: move;
    user-select: none;
    transition: transform 0.2s ease;
  \`;
  
  recorderUI.innerHTML = \`
    <div id="recorder-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: move;">
      <div style="width: 6px; height: 6px; background: #ef4444; border-radius: 50%; animation: pulse 2s infinite;"></div>
      <strong style="font-size: 12px;">AutoFlow Recorder</strong>
      <div style="margin-left: auto; display: flex; gap: 4px;">
        <button id="minimize-recorder" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 11px;">−</button>
        <button id="stop-recording" style="background: #ef4444; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Stop</button>
      </div>
    </div>
    <div id="recorder-content">
      <div id="action-count" style="color: #ccc; font-size: 11px; margin-bottom: 6px;">\${window.macroRecorderActions.length} actions captured</div>
      <div style="font-size: 10px; color: #888; line-height: 1.3;">Recording all interactions. Click Stop when done.</div>
    </div>
    <style>
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      #macro-recorder-ui:hover { transform: translateY(-1px); }
    </style>
  \`;
  
  document.body.appendChild(recorderUI);
  
  // Make UI draggable
  let isDragging = false;
  let currentX, currentY, initialX, initialY;
  
  function dragStart(e) {
    if (e.target.id === 'stop-recording' || e.target.id === 'minimize-recorder') return;
    initialX = e.clientX - recorderUI.offsetLeft;
    initialY = e.clientY - recorderUI.offsetTop;
    isDragging = true;
    recorderUI.style.cursor = 'grabbing';
  }
  
  function dragEnd() {
    isDragging = false;
    recorderUI.style.cursor = 'move';
  }
  
  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - recorderUI.offsetWidth;
    const maxY = window.innerHeight - recorderUI.offsetHeight;
    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));
    
    recorderUI.style.left = currentX + 'px';
    recorderUI.style.top = currentY + 'px';
  }
  
  recorderUI.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);
  
  // Minimize functionality
  let isMinimized = false;
  document.getElementById('minimize-recorder').addEventListener('click', () => {
    const content = document.getElementById('recorder-content');
    if (isMinimized) {
      content.style.display = 'block';
      recorderUI.style.width = '280px';
      document.getElementById('minimize-recorder').textContent = '−';
    } else {
      content.style.display = 'none';
      recorderUI.style.width = 'auto';
      document.getElementById('minimize-recorder').textContent = '+';
    }
    isMinimized = !isMinimized;
  });
  
  // Enhanced function to re-inject recorder with AngularJS support
  function reinjectRecorder() {
    if (window.macroRecorderActive && !document.getElementById('macro-recorder-ui')) {
      setTimeout(() => {
        try {
          eval('(' + window.macroRecorderScript + ')()');
        } catch (e) {
          console.log('Reinjection failed, retrying...', e);
          setTimeout(() => {
            try {
              eval('(' + window.macroRecorderScript + ')()');
            } catch (e2) {
              console.log('Second reinjection attempt failed:', e2);
            }
          }, 1000);
        }
      }, 300);
    }
  }
  
  // Enhanced navigation tracking for login flows
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function() {
    originalPushState.apply(history, arguments);
    setTimeout(reinjectRecorder, 100);
  };
  
  history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    setTimeout(reinjectRecorder, 100);
  };
  
  window.addEventListener('popstate', () => setTimeout(reinjectRecorder, 100));
  
  // Enhanced page change detection for login flows and iframes
  const observer = new MutationObserver(() => {
    if (window.macroRecorderActive && !document.getElementById('macro-recorder-ui')) {
      setTimeout(reinjectRecorder, 100);
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Watch for URL changes more aggressively (for SPAs and login redirects)
  let currentUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      if (window.macroRecorderActive && !document.getElementById('macro-recorder-ui')) {
        setTimeout(reinjectRecorder, 200);
      }
    }
  }, 500);
  
  // Handle iframe-based logins and modal overlays
  window.addEventListener('focus', () => {
    if (window.macroRecorderActive && !document.getElementById('macro-recorder-ui')) {
      setTimeout(reinjectRecorder, 100);
    }
  });
  
  // Watch for form submissions that might trigger redirects
  document.addEventListener('submit', () => {
    setTimeout(() => {
      if (window.macroRecorderActive && !document.getElementById('macro-recorder-ui')) {
        setTimeout(reinjectRecorder, 500);
      }
    }, 100);
  }, true);
  
  // AngularJS specific handling (for MarginEdge and similar apps)
  if (window.angular) {
    console.log('AngularJS detected - setting up enhanced monitoring');
    const rootScope = window.angular.element(document).scope();
    if (rootScope && rootScope.$on) {
      rootScope.$on('$routeChangeStart', reinjectRecorder);
      rootScope.$on('$stateChangeStart', reinjectRecorder);
      rootScope.$on('$locationChangeStart', reinjectRecorder);
    }
  }
  
  // Even more aggressive monitoring for AngularJS apps
  const urgentCheck = setInterval(() => {
    if (!window.macroRecorderActive) {
      clearInterval(urgentCheck);
      return;
    }
    if (!document.getElementById('macro-recorder-ui')) {
      console.log('Recorder UI missing - emergency reinjection');
      reinjectRecorder();
    }
  }, 250);
  
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
    
    const finalActions = window.macroRecorderActions || [];
    const currentUrl = window.location.href;
    
    // Always try multiple methods to send data back
    let dataSent = false;
    
    // Method 1: Try postMessage to all possible parent windows
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'MACRO_COMPLETE',
          actions: finalActions,
          url: currentUrl,
          timestamp: Date.now()
        }, '*');
        dataSent = true;
      }
      
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'MACRO_COMPLETE',
          actions: finalActions,
          url: currentUrl,
          timestamp: Date.now()
        }, '*');
        dataSent = true;
      }
      
      // Try to send to the AutoFlow origin if available
      if (window.autoFlowParentOrigin) {
        window.parent.postMessage({
          type: 'MACRO_COMPLETE',
          actions: finalActions,
          url: currentUrl,
          timestamp: Date.now()
        }, window.autoFlowParentOrigin);
        dataSent = true;
      }
    } catch (e) {
      console.log('Could not send via postMessage:', e);
    }
    
    // Method 2: Save to localStorage as backup
    try {
      const savedRecordings = JSON.parse(localStorage.getItem('autoflow_recordings') || '[]');
      savedRecordings.push({
        id: 'recording_' + Date.now(),
        timestamp: Date.now(),
        url: currentUrl,
        actions: finalActions,
        duration: Math.round((Date.now() - window.macroRecorderStartTime) / 1000)
      });
      localStorage.setItem('autoflow_recordings', JSON.stringify(savedRecordings));
      console.log('Recording saved to localStorage');
    } catch (e) {
      console.log('Could not save to localStorage:', e);
    }
    
    // Method 3: Always offer download as final fallback
    if (finalActions.length > 0) {
      const script = generatePlaywrightScript(finalActions);
      const blob = new Blob([script], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'autoflow_recording_' + Date.now() + '.js';
      
      // Show user a notification about the download
      if (confirm(\`Recording complete! \${finalActions.length} actions captured.\\n\\nClick OK to download the automation script, or Cancel to just close the recorder.\`)) {
        a.click();
      }
      URL.revokeObjectURL(url);
    }
    
    document.getElementById('macro-recorder-ui')?.remove();
    
    // Clear the recording data
    window.macroRecorderActions = [];
    delete window.macroRecorderStartTime;
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
    const newWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    if (newWindow) {
      setExternalWindow(newWindow);
      setIsRecording(true);
      setStartTime(Date.now());
      setActions([]);
      
      // Enhanced window handling to prevent disappearing recorder
      let injectionAttempts = 0;
      const maxAttempts = 10;
      
      const attemptInjection = () => {
        injectionAttempts++;
        try {
          if (newWindow.closed) {
            clearInterval(checkLoaded);
            setIsRecording(false);
            setExternalWindow(null);
            return;
          }
          
          if (newWindow.document && newWindow.document.readyState === 'complete') {
            clearInterval(checkLoaded);
            // Auto-inject the bookmarklet script with persistence
            const script = generateBookmarkletScript();
            const scriptElement = newWindow.document.createElement('script');
            scriptElement.textContent = script;
            newWindow.document.head.appendChild(scriptElement);
            
            // Also set up a backup injection on navigation
            (newWindow as WindowWithAutoFlow).autoFlowParentOrigin = window.location.origin;
            (newWindow as WindowWithAutoFlow).addEventListener('beforeunload', () => {
              setTimeout(() => {
                if (!newWindow.closed && newWindow.document) {
                  try {
                    const backupScript = newWindow.document.createElement('script');
                    backupScript.textContent = script;
                    newWindow.document.head.appendChild(backupScript);
                  } catch (e) {
                    console.log('Could not re-inject on navigation:', e);
                  }
                }
              }, 100);
            });
            
            toast({
              title: "Recording Started in External Window",
              description: "AutoFlow recorder is now active. It will persist across page navigation.",
            });
          } else if (injectionAttempts >= maxAttempts) {
            clearInterval(checkLoaded);
            toast({
              title: "External Window Opened",
              description: "Use the bookmarklet button below to start recording manually",
              variant: "default"
            });
          }
        } catch (e) {
          if (injectionAttempts >= maxAttempts) {
            clearInterval(checkLoaded);
            toast({
              title: "External Window Opened", 
              description: "Due to security restrictions, use the bookmarklet to start recording",
              variant: "default"
            });
          }
        }
      };
      
      const checkLoaded = setInterval(attemptInjection, 200);
      
      // Cleanup after 30 seconds
      setTimeout(() => clearInterval(checkLoaded), 30000);
      
      // Monitor window close
      const checkClosed = setInterval(() => {
        if (newWindow.closed) {
          clearInterval(checkClosed);
          setIsRecording(false);
          setExternalWindow(null);
          toast({
            title: "External Window Closed",
            description: "Recording session ended",
          });
        }
      }, 1000);
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
    (window as WindowWithMacroRecorder).macroListeners = { handleClick, handleInput, handleKeyPress };
    
    toast({
      title: "Recording Started",
      description: "All your interactions are now being recorded. Press ESC to stop.",
    });
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    // Remove event listeners
    const listeners = (window as WindowWithMacroRecorder).macroListeners;
    if (listeners) {
      document.removeEventListener('click', listeners.handleClick, true);
      document.removeEventListener('input', listeners.handleInput, true);
      document.removeEventListener('keydown', listeners.handleKeyPress, true);
      delete (window as WindowWithMacroRecorder).macroListeners;
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
      case 'click': return 'text-primary-foreground';
      case 'input': return 'text-primary-foreground';
      case 'navigation': return 'text-primary-foreground';
      default: return 'text-primary-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <header className="border-b border-border bg-glass/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Macro Recorder</h1>
              <p className="text-muted-foreground mt-1">Record interactions and generate automation scripts</p>
            </div>
            
            {/* Enhanced Recording Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  placeholder="Enter website URL to record..."
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  className="px-4 py-2 bg-glass border border-glass rounded-xl text-foreground backdrop-blur-md min-w-72 focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all"
                />
                <Button 
                  variant="glass"
                  onClick={openExternalRecording}
                  disabled={!recordingUrl}
                  className="whitespace-nowrap"
                >
                  <ExternalLink className="w-4 h-4" />
                  Record External
                </Button>
              </div>
              
              {/* Prominent Recording Button */}
              <Button 
                variant={isRecording ? "destructive" : "glow"}
                onClick={isRecording ? stopRecording : startRecording}
                size="lg"
                className="min-w-44 shadow-glow"
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Recording
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content - 3 columns */}
          <div className="xl:col-span-3 space-y-8">
            {/* Recording Status - More Prominent */}
            <Card className={`shadow-card border-2 transition-all duration-300 ${
              isRecording 
                ? 'border-red-400 bg-red-400/5 shadow-glow' 
                : 'border-glass bg-glass/30'
            }`}>
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className={`w-6 h-6 rounded-full ${
                      isRecording 
                        ? 'bg-red-400 animate-pulse shadow-glow' 
                        : 'bg-gray-400'
                    }`} />
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {isRecording ? 'Recording in Progress' : 'Ready to Record'}
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        {isRecording 
                          ? `${actions.length} actions captured`
                          : 'Click "Start Recording" to begin capturing interactions'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={isRecording ? "destructive" : "secondary"} 
                    className="text-lg px-4 py-2"
                  >
                    {isRecording ? 'LIVE' : 'IDLE'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Bookmarklet Section */}
            <Card className="shadow-card hover:shadow-glow transition-all duration-300 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-card">
                    <Globe className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span>Universal Recording Bookmarklet</span>
                </CardTitle>
                <CardDescription>
                  Drag this bookmarklet to your bookmarks bar to record on any website
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-foreground">AutoFlow Recorder</span>
                    <Button variant="glass" size="sm" onClick={() => {
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
                    variant="glow"
                    size="lg"
                    className="w-full mb-4"
                    onClick={() => {
                      const bookmarkletCode = generateBookmarklet();
                      navigator.clipboard.writeText(bookmarkletCode);
                      toast({
                        title: "Bookmarklet Code Copied",
                        description: "Create a new bookmark and paste this as the URL to use anywhere",
                      });
                    }}
                  >
                    <Code className="w-5 h-5" />
                    <span>Get AutoFlow Recorder</span>
                  </Button>
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">
                    Drag this button to your bookmarks bar, then click it on any website to start recording interactions
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Controls */}
            {actions.length > 0 && (
              <Card className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="glass" onClick={() => setShowPreview(!showPreview)}>
                      {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showPreview ? 'Hide' : 'Show'} Script
                    </Button>
                    <Button variant="glass" onClick={copyScript}>
                      <Copy className="w-4 h-4" />
                      Copy Script
                    </Button>
                    <Button variant="glass" onClick={downloadScript}>
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                    <Button variant="destructive" onClick={clearActions}>
                      <Trash2 className="w-4 h-4" />
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

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
                  <pre className="bg-glass border border-glass rounded-xl p-6 text-sm overflow-auto max-h-96 text-foreground backdrop-blur-md">
                    {generateScript()}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Actions List */}
            <Card className="shadow-card hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recorded Actions ({actions.length})</span>
                  {actions.length > 0 && (
                    <Badge variant="outline" className="px-3 py-1">
                      {actions.length} captured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Sequence of captured user interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {actions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-20 h-20 bg-glass border border-glass rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                      <MousePointer className="w-10 h-10 opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No actions recorded yet</h3>
                    <p className="text-sm">Start recording to capture your interactions</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {actions.map((action, index) => (
                      <div key={action.id} className="group p-4 bg-glass border border-glass rounded-xl backdrop-blur-md hover:shadow-card hover:border-primary/30 transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-xs text-muted-foreground w-8 flex-shrink-0 font-mono">
                              #{(index + 1).toString().padStart(2, '0')}
                            </span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActionColor(action.type)} bg-gradient-primary shadow-card`}>
                              {getActionIcon(action.type)}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-foreground capitalize group-hover:text-primary transition-colors">
                                {action.type} {action.element && `on ${action.element}`}
                              </p>
                              {action.value && (
                                <p className="text-sm text-muted-foreground mt-1">Value: {action.value}</p>
                              )}
                              {action.coordinates && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Position: ({action.coordinates.x}, {action.coordinates.y})
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground font-mono">
                            +{Math.round(action.timestamp / 1000)}s
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Visual Session Stats */}
            <Card className="shadow-card hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Timer className="w-5 h-5 text-primary" />
                  <span>Session Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                    <div className="text-2xl font-bold text-foreground">
                      {actions.length > 0 ? 
                        new Set(actions.map(a => a.url || window.location.href)).size : 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Websites</div>
                  </div>
                  <div className="text-center p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                    <div className="text-2xl font-bold text-foreground">{actions.length}</div>
                    <div className="text-xs text-muted-foreground mt-1">Actions</div>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="text-3xl font-bold text-foreground">
                    {startTime && isRecording 
                      ? `${Math.round((Date.now() - startTime) / 1000)}s`
                      : '0s'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Recording Time</div>
                </div>
                
                <div className="flex items-center justify-center p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <Badge 
                    variant={isRecording ? "destructive" : "secondary"}
                    className="px-4 py-2 text-sm"
                  >
                    {isRecording ? 'Recording' : 'Stopped'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Simplified Instructions */}
            <Card className="shadow-card hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Navigation className="w-5 h-5 text-primary" />
                  <span>Quick Guide</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3 p-3 bg-glass border border-glass rounded-xl backdrop-blur-md">
                    <span className="w-6 h-6 bg-gradient-primary text-primary-foreground rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold">1</span>
                    <div>
                      <p className="font-medium text-foreground">Start Recording</p>
                      <p className="text-muted-foreground text-xs">Click the recording button above</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-glass border border-glass rounded-xl backdrop-blur-md">
                    <span className="w-6 h-6 bg-gradient-primary text-primary-foreground rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold">2</span>
                    <div>
                      <p className="font-medium text-foreground">Interact Normally</p>
                      <p className="text-muted-foreground text-xs">All clicks and inputs are captured</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-glass border border-glass rounded-xl backdrop-blur-md">
                    <span className="w-6 h-6 bg-gradient-primary text-primary-foreground rounded-full text-xs flex items-center justify-center flex-shrink-0 font-bold">3</span>
                    <div>
                      <p className="font-medium text-foreground">Stop & Export</p>
                      <p className="text-muted-foreground text-xs">Press ESC or stop button when done</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recording Methods */}
            <Card className="shadow-card hover:shadow-glow transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <span>Recording Options</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <p className="font-medium text-foreground mb-1">Current Page</p>
                  <p className="text-muted-foreground text-xs">Record interactions on this page</p>
                </div>
                <div className="p-3 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <p className="font-medium text-foreground mb-1">External Website</p>
                  <p className="text-muted-foreground text-xs">Enter URL to record in new window</p>
                </div>
                <div className="p-3 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <p className="font-medium text-foreground mb-1">Universal Bookmarklet</p>
                  <p className="text-muted-foreground text-xs">Use on any website via bookmark</p>
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