import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Settings, 
  Check, 
  X, 
  Mail, 
  Smartphone, 
  AlertCircle,
  Clock,
  Workflow,
  Calendar,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'assignment' | 'deadline' | 'change' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
  assignments: boolean;
  deadlines: boolean;
  changes: boolean;
  system: boolean;
}

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'deadline',
      title: 'Workflow Deadline Approaching',
      message: 'Gmail File Downloader workflow has a deadline in 2 hours',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      read: false,
      priority: 'high',
      actionUrl: '/?dashboard'
    },
    {
      id: '2',
      type: 'assignment',
      title: 'New Integration Available',
      message: 'Slack integration has been assigned to your workspace',
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      read: false,
      priority: 'medium'
    },
    {
      id: '3',
      type: 'change',
      title: 'Workflow Updated',
      message: 'Repository Setup Generator has been modified by admin',
      timestamp: Date.now() - 1000 * 60 * 60 * 4, // 4 hours ago
      read: true,
      priority: 'low'
    }
  ]);

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    inApp: true,
    email: true,
    push: false,
    assignments: true,
    deadlines: true,
    changes: true,
    system: true
  });

  const { toast } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({
      title: "All notifications marked as read",
      description: "You're all caught up!",
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const updatePreferences = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Notification preferences updated",
      description: `${key} notifications ${value ? 'enabled' : 'disabled'}`,
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <Workflow className="w-4 h-4" />;
      case 'deadline': return <Clock className="w-4 h-4" />;
      case 'change': return <AlertCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-400 bg-red-400/10';
      case 'medium': return 'border-yellow-400 bg-yellow-400/10';
      case 'low': return 'border-blue-400 bg-blue-400/10';
      default: return 'border-gray-400 bg-gray-400/10';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) { // 5% chance every 5 seconds
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: ['assignment', 'deadline', 'change', 'system'][Math.floor(Math.random() * 4)] as any,
          title: 'New Activity Detected',
          message: 'A workflow has been automatically updated',
          timestamp: Date.now(),
          read: false,
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any
        };
        setNotifications(prev => [newNotification, ...prev]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (showSettings) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-glow border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <span>Notification Preferences</span>
                </CardTitle>
                <CardDescription>
                  Customize how and when you receive notifications
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowSettings(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delivery Methods */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Delivery Methods</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <Label htmlFor="inApp" className="font-medium">In-App</Label>
                  </div>
                  <Switch
                    id="inApp"
                    checked={preferences.inApp}
                    onCheckedChange={(checked) => updatePreferences('inApp', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <Label htmlFor="email" className="font-medium">Email</Label>
                  </div>
                  <Switch
                    id="email"
                    checked={preferences.email}
                    onCheckedChange={(checked) => updatePreferences('email', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <Label htmlFor="push" className="font-medium">Push</Label>
                  </div>
                  <Switch
                    id="push"
                    checked={preferences.push}
                    onCheckedChange={(checked) => updatePreferences('push', checked)}
                  />
                </div>
              </div>
            </div>

            {/* Notification Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Notification Types</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-3">
                    <Workflow className="w-5 h-5 text-primary" />
                    <div>
                      <Label htmlFor="assignments" className="font-medium">Assignments</Label>
                      <p className="text-sm text-muted-foreground">New workflows and tasks assigned to you</p>
                    </div>
                  </div>
                  <Switch
                    id="assignments"
                    checked={preferences.assignments}
                    onCheckedChange={(checked) => updatePreferences('assignments', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <Label htmlFor="deadlines" className="font-medium">Deadlines</Label>
                      <p className="text-sm text-muted-foreground">Upcoming deadlines and time-sensitive alerts</p>
                    </div>
                  </div>
                  <Switch
                    id="deadlines"
                    checked={preferences.deadlines}
                    onCheckedChange={(checked) => updatePreferences('deadlines', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    <div>
                      <Label htmlFor="changes" className="font-medium">Changes</Label>
                      <p className="text-sm text-muted-foreground">Updates to workflows and configurations</p>
                    </div>
                  </div>
                  <Switch
                    id="changes"
                    checked={preferences.changes}
                    onCheckedChange={(checked) => updatePreferences('changes', checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-glass border border-glass rounded-xl backdrop-blur-md">
                  <div className="flex items-center space-x-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <div>
                      <Label htmlFor="system" className="font-medium">System</Label>
                      <p className="text-sm text-muted-foreground">System updates and maintenance notices</p>
                    </div>
                  </div>
                  <Switch
                    id="system"
                    checked={preferences.system}
                    onCheckedChange={(checked) => updatePreferences('system', checked)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-border">
              <Button variant="ghost" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
              <Button variant="glow" onClick={() => setShowSettings(false)}>
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="relative hover:bg-primary/20"
          aria-label={`Open notifications. ${unreadCount} unread notifications`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(false)}
        className="relative hover:bg-primary/20"
        aria-label="Close notifications"
      >
        <Bell className="w-5 h-5 text-primary" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Card className="absolute top-12 right-0 w-96 max-h-96 shadow-glow border-primary/20 z-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-primary" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                aria-label="Open notification settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="w-fit text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group p-4 border-l-2 hover:bg-glass/50 transition-all duration-200 ${
                      notification.read ? 'opacity-60' : ''
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          {getNotificationIcon(notification.type)}
                          <p className="font-medium text-sm text-foreground">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                              className="h-6 px-2 text-xs hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {notification.actionUrl && !notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                            onClick={() => {
                              markAsRead(notification.id);
                              window.location.href = notification.actionUrl!;
                            }}
                          >
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter;