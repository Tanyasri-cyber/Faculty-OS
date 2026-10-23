import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from '../components/Common';
import {
  CalendarDays, Send, Users, DollarSign, Calendar, ListTodo, Edit2, Plus,
  Sparkles, AlertTriangle, CheckCircle2, Clock, Copy, Check, ShieldAlert,
  FileText, ArrowRight, MessageSquare
} from 'lucide-react';
import { api, type ChatMessage } from '../services/api';

export const EventManagement: React.FC<{ user: any }> = ({ user }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingTraces, setStreamingTraces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventFormData, setEventFormData] = useState({ name: '', type: 'Workshop', date: '', venue: '', organizer: '', allocated_budget: 45000, expected_participants: 100 });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskFormData, setTaskFormData] = useState({ task: '', assigned_to: '', status: 'Pending', priority: 'medium', due_date: '', category: 'Logistics' });

  const loadData = async () => {
    try {
      const e = await api.getEvents();
      const t = await api.getCommitteeTasks();
      setEvents(e);
      setTasks(t);
    } catch (error) {
      console.error("Failed to fetch event data", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText, streamingTraces]);

  const handleEventSubmit = async () => {
    if (editingEventId) {
      await (api as any).editEvent(editingEventId, eventFormData);
    } else {
      await (api as any).addEvent(eventFormData);
    }
    await loadData();
    setIsEventModalOpen(false);
    setEditingEventId(null);
    setEventFormData({ name: '', type: 'Workshop', date: '', venue: '', organizer: '', allocated_budget: 45000, expected_participants: 100 });
  };

  const handleTaskSubmit = async () => {
    if (editingTaskId) {
      await (api as any).editCommitteeTask(editingTaskId, taskFormData);
    } else {
      await (api as any).addCommitteeTask(taskFormData);
    }
    await loadData();
    setIsTaskModalOpen(false);
    setEditingTaskId(null);
    setTaskFormData({ task: '', assigned_to: '', status: 'Pending', priority: 'medium', due_date: '', category: 'Logistics' });
  };

  const handleToggleTaskStatus = async (taskItem: any) => {
    const nextStatus = taskItem.status === 'Completed' ? 'Pending' : (taskItem.status === 'Pending' ? 'In Progress' : 'Completed');
    await (api as any).editCommitteeTask(taskItem.id, { ...taskItem, status: nextStatus });
    await loadData();
  };

  const handleSendChat = async (directMessage?: string) => {
    const msgContent = directMessage || chatInput.trim();
    if (!msgContent || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msgContent, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setIsLoading(true);
    setStreamingText('');
    setStreamingTraces([]);
    
    let fullText = '';
    
    try {
      await api.streamChat(
        'agent9',
        msgContent,
        newHistory,
        (chunk) => {
          fullText += chunk;
          setStreamingText(fullText);
        },
        (trace) => {
          setStreamingTraces(prev => {
            const existing = prev.findIndex(t => t.name === trace.name);
            if (existing >= 0) {
              const newTraces = [...prev];
              newTraces[existing] = trace;
              return newTraces;
            }
            return [...prev, trace];
          });
        },
        (toolCalls, richData) => {
          setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: fullText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), richData }]);
          setStreamingText('');
          setStreamingTraces([]);
          setIsLoading(false);
          loadData();
        },
        (err) => {
          console.error(err);
          setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Sorry, there was an error processing your request.', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Dynamic Dashboard Stats
  const totalAllocated = events.reduce((sum, e) => sum + (Number(e.allocated_budget) || 50000), 0);
  const totalSpent = events.reduce((sum, e) => sum + (Number(e.spent_budget) || 0), 0);
  const budgetUtilizedPct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 65;
  const pendingTasksCount = tasks.filter(t => t.status !== 'Completed').length;
  const expectedGuestsCount = events.reduce((sum, e) => sum + (Number(e.expected_participants) || 100), 0);

  const QUICK_ACTIONS = [
    { label: 'Plan AI Workshop', icon: '📅', msg: 'Plan a one-day AI workshop for 150 students on November 15.' },
    { label: 'Auto Tasks Checklist', icon: '✅', msg: 'Generate a complete event operations checklist and task assignments.' },
    { label: 'Event Risk Audit', icon: '⚠️', msg: 'Audit event risks, health score, and overdue task bottlenecks.' },
    { label: 'Budget Intelligence', icon: '💰', msg: 'Show me event budget utilization and expenditure breakdown.' },
    { label: 'Speaker Invite', icon: '✉️', msg: 'Generate a formal invitation for the keynote speaker.' },
    { label: 'Faculty Circular', icon: '📢', msg: 'Generate an internal faculty circular for the event.' },
    { label: 'Event-Day Checklist', icon: '🎯', msg: 'Show me the event-day operational checklist.' },
    { label: 'NAAC Report', icon: '📑', msg: 'Generate a post-event summary report for NAAC Criterion 6.' }
  ];

  return (
    <div className="h-full flex flex-col gap-4 font-ui">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-display font-bold text-ink flex items-center gap-2">
            Event & Committee Management
            <span className="text-[10px] font-mono uppercase bg-accent-500/20 text-accent-400 px-2 py-0.5 rounded border border-accent-500/30">
              Agent 9 • Copilot
            </span>
          </h2>
          <p className="text-xs text-ink-muted">Plan FDPs, track event budgets, auto-generate committee task timelines, and monitor operational risks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleSendChat('Audit event risks, health score, and overdue task bottlenecks.')}
            className="text-xs bg-surface border border-accent-500/40 text-accent-400 hover:bg-accent-500/10 flex items-center gap-1.5"
          >
            <ShieldAlert size={13} />
            <span className="hidden sm:inline">Risk Audit</span>
          </Button>
          <Button
            size="sm"
            onClick={() => handleSendChat('Plan a one-day AI workshop for 150 students on November 15.')}
            className="text-xs bg-accent-500 text-black hover:bg-accent-600 font-bold flex items-center gap-1.5"
          >
            <Sparkles size={13} />
            <span>AI Event Planner</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-4 gap-4 overflow-hidden">
        {/* Left/Middle Content */}
        <div className="xl:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            {[ 
              { label: 'Upcoming Events', value: events.length || '3', sub: 'In pipeline', icon: Calendar, color: 'text-accent-400' },
              { label: 'Pending Tasks', value: pendingTasksCount, sub: `${tasks.length - pendingTasksCount} completed`, icon: ListTodo, color: 'text-amber-400' },
              { label: 'Expected Guests', value: expectedGuestsCount, sub: 'Total attendance', icon: Users, color: 'text-blue-400' },
              { label: 'Budget Utilized', value: `${budgetUtilizedPct}%`, sub: `₹${totalSpent.toLocaleString()} spent`, icon: DollarSign, color: 'text-emerald-400' }
            ].map((stat, i) => (
              <Card key={i} className="p-3.5 bg-surface border-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider mb-0.5">{stat.label}</div>
                  <div className="text-2xl font-display font-bold text-ink">{stat.value}</div>
                  <div className="text-[9px] font-mono text-ink-muted">{stat.sub}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center shrink-0">
                  <stat.icon className={stat.color} size={18} />
                </div>
              </Card>
            ))}
          </div>

          {/* Calendar & Tasks 2-Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            {/* Event Calendar */}
            <Card className="p-4 flex flex-col bg-surface border-border overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-accent-500" />
                  <h3 className="text-sm font-bold text-ink">Event Calendar</h3>
                  <span className="text-[10px] font-mono text-ink-muted">({events.length})</span>
                </div>
                <Button size="sm" onClick={() => {
                  setEditingEventId(null);
                  setEventFormData({ name: '', type: 'Workshop', date: '', venue: '', organizer: '', allocated_budget: 45000, expected_participants: 100 });
                  setIsEventModalOpen(true);
                }} className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600 font-bold">
                  <Plus size={14} className="mr-1" /> Add
                </Button>
              </div>

              <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded-xl h-full min-h-[140px]">
                    No events scheduled. Use AI to plan one!
                  </div>
                ) : (
                  events.map((e, i) => {
                    const healthTier = e.health_tier || (e.health_score >= 80 ? 'Healthy' : e.health_score >= 60 ? 'Needs Attention' : 'At Risk');
                    const healthColor = healthTier === 'Healthy' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : healthTier === 'Needs Attention' 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                        : 'bg-red-500/10 text-red-400 border-red-500/30';
                    return (
                      <div key={i} className="p-3 rounded-xl bg-paper border border-border/80 flex flex-col gap-2 hover:border-accent-500/40 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-ink leading-tight">{e.title || e.name || 'Event Title'}</span>
                              <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface border border-border text-ink-muted">
                                {e.type || 'Event'}
                              </span>
                            </div>
                            <div className="text-xs text-ink-muted mt-0.5 flex items-center gap-1.5">
                              <Clock size={11} className="text-ink-muted" />
                              <span>{e.date || 'Date TBD'}</span>
                              <span>•</span>
                              <span>{e.location || e.venue || 'Venue TBD'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${healthColor} font-bold`}>
                              {e.health_score ? `${e.health_score}/100` : healthTier}
                            </span>
                            <Button size="sm" className="h-7 w-7 p-0 bg-transparent hover:bg-surface border-border text-ink" onClick={() => {
                              setEditingEventId(e.id);
                              setEventFormData({
                                name: e.name || e.title || '',
                                type: e.type || 'Workshop',
                                date: e.date || '',
                                venue: e.venue || e.location || '',
                                organizer: e.organizer || '',
                                allocated_budget: e.allocated_budget || 50000,
                                expected_participants: e.expected_participants || 100
                              });
                              setIsEventModalOpen(true);
                            }}>
                              <Edit2 size={12} />
                            </Button>
                          </div>
                        </div>

                        {/* Event Footer with Budget & AI Trigger */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] font-mono text-ink-muted">
                          <span>Budget: ₹{(e.spent_budget || 0).toLocaleString()} / ₹{(e.allocated_budget || 50000).toLocaleString()}</span>
                          <button
                            onClick={() => handleSendChat(`Check event risks and task bottlenecks for ${e.name || e.title}`)}
                            className="text-accent-400 hover:text-accent-300 flex items-center gap-1 transition-colors"
                          >
                            <ShieldAlert size={10} />
                            <span>Audit Risk</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
            
            {/* Committee Tasks */}
            <Card className="p-4 flex flex-col bg-surface border-border overflow-hidden">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ListTodo size={16} className="text-accent-500" />
                  <h3 className="text-sm font-bold text-ink">Committee Tasks</h3>
                  <span className="text-[10px] font-mono text-ink-muted">({tasks.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onClick={() => handleSendChat('Generate a complete event operations checklist and task assignments.')} className="h-7 text-[10px] font-mono bg-accent-500/10 text-accent-400 border border-accent-500/30 hover:bg-accent-500/20">
                    <Sparkles size={11} className="mr-1" /> Auto Tasks
                  </Button>
                  <Button size="sm" onClick={() => {
                    setEditingTaskId(null);
                    setTaskFormData({ task: '', assigned_to: '', status: 'Pending', priority: 'medium', due_date: '', category: 'Logistics' });
                    setIsTaskModalOpen(true);
                  }} className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600 font-bold">
                    <Plus size={14} className="mr-1" /> Add
                  </Button>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded-xl h-full min-h-[140px]">
                    No tasks found. Click 'Auto Tasks' to generate!
                  </div>
                ) : (
                  tasks.map((t, i) => {
                    const isDone = t.status === 'Completed';
                    const prioColor = t.priority === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/30' : t.priority === 'low' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                    return (
                      <div key={i} className="p-2.5 rounded-xl bg-paper border border-border/80 flex justify-between items-center group hover:border-accent-500/40 transition-colors">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleTaskStatus(t)}
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors shrink-0 ${
                              isDone ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-border hover:border-accent-400 text-transparent'
                            }`}
                            title="Click to toggle status"
                          >
                            <Check size={10} />
                          </button>
                          <div className="min-w-0">
                            <div className={`text-xs font-semibold text-ink truncate ${isDone ? 'line-through text-ink-muted' : ''}`}>
                              {t.task || 'Task'}
                            </div>
                            <div className="text-[10px] text-ink-muted flex items-center gap-1.5 mt-0.5 font-mono">
                              <span>{t.assigned_to || 'Unassigned'}</span>
                              {t.due_date && (
                                <>
                                  <span>•</span>
                                  <span className="text-accent-400">{t.due_date}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${prioColor}`}>
                            {t.priority || 'med'}
                          </span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                            isDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            t.status === 'In Progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                            'bg-surface text-ink-muted border-border'
                          }`}>
                            {t.status}
                          </span>
                          <Button size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-surface border-border text-ink" onClick={() => {
                            setEditingTaskId(t.id);
                            setTaskFormData({ task: t.task || '', assigned_to: t.assigned_to || '', status: t.status || 'Pending', priority: t.priority || 'medium', due_date: t.due_date || '', category: t.category || 'Logistics' });
                            setIsTaskModalOpen(true);
                          }}>
                            <Edit2 size={11} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Side Chat: Event Operations Copilot */}
        <Card className="xl:col-span-1 flex flex-col border border-accent-500/30 bg-surface/96 overflow-hidden p-0 h-full">
          {/* AI Header */}
          <div className="bg-gradient-to-r from-accent-950/60 to-emerald-950/60 px-4 py-3 flex items-center justify-between border-b border-accent-500/30 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center shadow-lg text-black">
                <Sparkles size={16} />
              </div>
              <div>
                <div className="text-sm font-bold text-ink flex items-center gap-1.5">
                  Event Planner AI
                  <span className="text-[8px] font-mono uppercase bg-accent-500/20 text-accent-300 px-1.5 py-0.2 rounded border border-accent-500/30 font-bold">Agent 9</span>
                </div>
                <div className="text-[9px] text-accent-300 font-mono">Operations Copilot Active</div>
              </div>
            </div>
          </div>

          {/* Quick Actions Scroll Bar */}
          <div className="p-2 border-b border-border/40 bg-surface flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            {QUICK_ACTIONS.map((a, i) => (
              <button
                key={i}
                onClick={() => handleSendChat(a.msg)}
                disabled={isLoading}
                className="text-[9px] font-mono bg-accent-500/10 hover:bg-accent-500/20 text-accent-300 border border-accent-500/30 px-2 py-0.5 rounded-full whitespace-nowrap transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
              >
                <span>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs">
            {chatMessages.length === 0 && !streamingText && streamingTraces.length === 0 && (
              <div className="flex gap-2 w-[90%]">
                <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center shrink-0 mt-0.5 text-black">
                  <CalendarDays size={11} />
                </div>
                <div className="bg-surface-raised border border-border text-ink text-xs p-3 rounded-2xl rounded-tl-sm shadow-sm space-y-2">
                  <p className="font-semibold text-accent-400">👋 Welcome to your Event Operations Copilot!</p>
                  <p className="text-[11px] text-ink-muted leading-relaxed">
                    I automate your complete event workflow: <strong>Plan → Organize → Assign → Monitor → Communicate → Execute → Report</strong>.
                  </p>
                  <p className="text-[10px] font-mono text-ink-muted">Try one of the quick actions above or tell me what event to plan!</p>
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2 max-w-[90%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shrink-0 mt-0.5 text-accent-400">
                    <Sparkles size={11} />
                  </div>
                )}
                <div className={`text-xs p-3 rounded-2xl border shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-accent-500 text-black rounded-tr-sm border-accent-600 font-medium' 
                    : 'bg-surface-raised text-ink rounded-tl-sm border-border'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Interactive Action Card: Draft Event Plan */}
                  {msg.richData?.type === 'draft_event_plan' && (
                    <div className="mt-3 p-3 bg-accent-500/10 border border-accent-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-accent-400 font-mono flex items-center gap-1.5">
                          <CheckCircle2 size={13} /> READY FOR APPROVAL
                        </span>
                        <span className="text-[9px] font-mono text-ink-muted">Budget: ₹{msg.richData.plan?.budget?.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-ink-muted">Approve this draft plan to automatically add the event to your calendar and create all 8 committee tasks.</p>
                      <Button
                        onClick={() => handleSendChat('Approve plan')}
                        className="w-full text-xs font-mono font-bold bg-accent-500 hover:bg-accent-600 text-black py-1.5 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={13} /> Approve Plan &amp; Create Event
                      </Button>
                    </div>
                  )}

                  {/* Interactive Action Card: Communication Copy */}
                  {msg.richData?.type === 'event_communication' && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex justify-end">
                      <button
                        onClick={() => handleCopyText(msg.richData.body, `comm-${i}`)}
                        className="text-[10px] font-mono bg-surface border border-accent-500/30 text-accent-300 hover:bg-accent-500/10 px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors"
                      >
                        {copiedId === `comm-${i}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copiedId === `comm-${i}` ? 'Copied to Clipboard!' : 'Copy Letter Draft'}</span>
                      </button>
                    </div>
                  )}

                  {/* Interactive Action Card: Event Risk Audit */}
                  {msg.richData?.type === 'event_risk_audit' && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-ink-muted">Audit Score:</span>
                      <span className="text-accent-400 font-bold">{msg.richData.score}/100 ({msg.richData.tier})</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live streaming text & tool traces */}
            {(streamingText || streamingTraces.length > 0) && (
              <div className="flex gap-2 max-w-[90%] self-start">
                <div className="w-5 h-5 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shrink-0 mt-0.5 text-accent-400">
                  <Sparkles size={11} className="animate-pulse" />
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  {streamingTraces.map((trace, i) => (
                    <div key={i} className="text-[9px] text-accent-400 font-mono bg-accent-500/10 px-2 py-1 rounded border border-accent-500/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-ping inline-block" />
                      <span>⚙ Executing: {trace.name || trace.action || 'processing'}... ({trace.status})</span>
                    </div>
                  ))}
                  {streamingText && (
                    <div className="bg-surface-raised border border-border text-ink text-xs p-3 rounded-2xl rounded-tl-sm shadow-sm whitespace-pre-wrap leading-relaxed">
                      {streamingText}
                      <span className="inline-block w-1.5 h-3 bg-accent-400 ml-0.5 animate-pulse rounded" />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-2.5 border-t border-border/60 bg-surface shrink-0">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                placeholder="Ask Event Copilot (e.g. Plan a 1-day AI workshop)..."
                className="flex-1 bg-paper text-xs rounded-xl border-border focus:border-accent-500"
                disabled={isLoading}
              />
              <Button
                size="sm"
                className="bg-accent-500 text-black hover:bg-accent-600 rounded-xl px-3 font-bold disabled:opacity-40"
                onClick={() => handleSendChat()}
                disabled={isLoading || !chatInput.trim()}
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Add / Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-accent-500/30 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <CalendarDays size={16} className="text-accent-400" />
              {editingEventId ? 'Edit Event' : 'Add New Event'}
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Event Name</label>
                <Input placeholder="e.g. International AI Symposium" value={eventFormData.name} onChange={e => setEventFormData({...eventFormData, name: e.target.value})} className="bg-paper border-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Event Type</label>
                  <select
                    value={eventFormData.type}
                    onChange={e => setEventFormData({...eventFormData, type: e.target.value})}
                    className="w-full bg-paper border border-border text-ink rounded-lg py-2 px-3 outline-none focus:border-accent-500 text-xs"
                  >
                    <option value="Workshop">Workshop</option>
                    <option value="FDP">FDP</option>
                    <option value="Conference">Conference</option>
                    <option value="Symposium">Symposium</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Hackathon">Hackathon</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Event Date</label>
                  <Input type="date" value={eventFormData.date} onChange={e => setEventFormData({...eventFormData, date: e.target.value})} className="bg-paper border-border" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Venue</label>
                <Input placeholder="e.g. Main Auditorium & CS Lab 3" value={eventFormData.venue} onChange={e => setEventFormData({...eventFormData, venue: e.target.value})} className="bg-paper border-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Expected Attendees</label>
                  <Input type="number" placeholder="150" value={eventFormData.expected_participants} onChange={e => setEventFormData({...eventFormData, expected_participants: Number(e.target.value)})} className="bg-paper border-border" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Allocated Budget (₹)</label>
                  <Input type="number" placeholder="45000" value={eventFormData.allocated_budget} onChange={e => setEventFormData({...eventFormData, allocated_budget: Number(e.target.value)})} className="bg-paper border-border" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Organizer / Department</label>
                <Input placeholder="e.g. CSE & CCE Department" value={eventFormData.organizer} onChange={e => setEventFormData({...eventFormData, organizer: e.target.value})} className="bg-paper border-border" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setIsEventModalOpen(false)}>Cancel</Button>
              <Button className="bg-accent-500 text-black hover:bg-accent-600 font-bold" onClick={handleEventSubmit}>Submit Event</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Committee Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-accent-500/30 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <ListTodo size={16} className="text-accent-400" />
              {editingTaskId ? 'Edit Committee Task' : 'Add Committee Task'}
            </h3>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Task Description</label>
                <Input placeholder="e.g. Keynote Speaker Liaison & Confirmation" value={taskFormData.task} onChange={e => setTaskFormData({...taskFormData, task: e.target.value})} className="bg-paper border-border" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Assigned Person</label>
                  <Input placeholder="e.g. Dr. S. Sharma" value={taskFormData.assigned_to} onChange={e => setTaskFormData({...taskFormData, assigned_to: e.target.value})} className="bg-paper border-border" />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Due Date</label>
                  <Input type="date" value={taskFormData.due_date} onChange={e => setTaskFormData({...taskFormData, due_date: e.target.value})} className="bg-paper border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Priority</label>
                  <select
                    value={taskFormData.priority}
                    onChange={e => setTaskFormData({...taskFormData, priority: e.target.value})}
                    className="w-full bg-paper border border-border text-ink rounded-lg py-2 px-3 outline-none focus:border-accent-500 text-xs"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Status</label>
                  <select
                    value={taskFormData.status}
                    onChange={e => setTaskFormData({...taskFormData, status: e.target.value})}
                    className="w-full bg-paper border border-border text-ink rounded-lg py-2 px-3 outline-none focus:border-accent-500 text-xs"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setIsTaskModalOpen(false)}>Cancel</Button>
              <Button className="bg-accent-500 text-black hover:bg-accent-600 font-bold" onClick={handleTaskSubmit}>Save Task</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
