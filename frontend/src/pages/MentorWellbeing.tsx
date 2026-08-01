import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart, Send, Calendar, Clock, AlertCircle, MessageSquare, CheckCircle2,
  ChevronRight, UserCheck, X, Plus, Search, Shield, TrendingUp, Users,
  Sparkles, AlertTriangle, PhoneCall, MessageCircle, User, ListTodo, StickyNote,
  Edit2, ArrowUpDown, Filter, Mic, MicOff, FileText, Loader2, StopCircle
} from 'lucide-react';
import { Card, Button, Input, Badge, Seal } from '../components/Common';
import { api, type ChatMessage, type User as UserType } from '../services/api';

interface MentorWellbeingProps { user: UserType; }

const MOOD_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  'doing well': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  'needs attention': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  'concerning': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400' },
};

const MODE_ICONS: Record<string, React.ReactNode> = {
  'in-person': <User size={11} />,
  'call': <PhoneCall size={11} />,
  'chat': <MessageCircle size={11} />,
};

// ─── Wellbeing Score Engine ───────────────────────────────────────
export const computeWellbeingScore = (mentee: any, timeline: any[] = [], escalations: any[] = []): number => {
  if (mentee.wellbeing_score !== undefined && mentee.wellbeing_score !== null) {
    return mentee.wellbeing_score;
  }
  let score = 80;
  const days = mentee.days_since_checkin ?? 10;
  if (days > 30) score -= 30;
  else if (days > 20) score -= 20;
  else if (days > 10) score -= 10;

  if (mentee.is_overdue) score -= 10;

  const latestMood = mentee.latest_mood || (timeline.length > 0 ? timeline[0].mood_tag : 'doing well');
  if (latestMood === 'concerning') score -= 35;
  else if (latestMood === 'needs attention') score -= 20;
  else if (latestMood === 'doing well') score += 10;

  const isEscalated = mentee.has_escalation || escalations.some(e => (e.student_id === mentee.student_id || e.roll_no === mentee.roll_no) && e.status !== 'resolved');
  if (isEscalated) score -= 25;

  return Math.max(5, Math.min(100, score));
};

export const getWellbeingCategory = (score: number) => {
  if (score >= 90) return {
    label: 'Excellent',
    emoji: '😊',
    range: '90-100',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    ring: 'ring-emerald-500/40',
    barColor: 'bg-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    actionTitle: '😊 Thriving Student',
    actionText: 'Student is in an excellent wellbeing state. Maintain regular monthly check-in cadence and acknowledge academic & personal progress.',
    actionBadge: 'Routine Check-in',
    priority: 5
  };
  if (score >= 70) return {
    label: 'Good',
    emoji: '🙂',
    range: '70-89',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    ring: 'ring-blue-500/40',
    barColor: 'bg-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    actionTitle: '🙂 On-Track State',
    actionText: 'Student is performing well overall. Keep up with routine check-in meetings and offer mentorship on upcoming academic goals.',
    actionBadge: 'Standard Support',
    priority: 4
  };
  if (score >= 50) return {
    label: 'Average',
    emoji: '😐',
    range: '50-69',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/40',
    barColor: 'bg-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    actionTitle: '😐 Moderate Priority',
    actionText: 'Check-in is due soon or recent notes show mild concern. Schedule a brief catch-up to review academic pressure and general mood.',
    actionBadge: 'Follow-Up Soon',
    priority: 3
  };
  if (score >= 30) return {
    label: 'Needs Attention',
    emoji: '😟',
    range: '30-49',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    ring: 'ring-orange-500/40',
    barColor: 'bg-orange-400',
    badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30 font-semibold',
    actionTitle: '😟 Attention Required',
    actionText: 'Wellbeing score has dropped into the warning zone. Reach out to schedule a 1-on-1 session within 48 hours to discuss challenges.',
    actionBadge: 'Action Required (48h)',
    priority: 2
  };
  return {
    label: 'Critical',
    emoji: '🚨',
    range: '0-29',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    ring: 'ring-red-500/50 animate-pulse',
    barColor: 'bg-red-500',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30 font-bold animate-pulse',
    actionTitle: '🚨 Critical Intervention Needed',
    actionText: 'Urgent 1-on-1 counseling check-in required immediately. If uncontactable or showing signs of high distress, raise a counseling escalation.',
    actionBadge: 'Immediate Intervention',
    priority: 1
  };
};

export const MentorWellbeing: React.FC<MentorWellbeingProps> = ({ user }) => {
  // ─── Core State ───────────────────────────────────────────────
  const [mentees, setMentees] = useState<any[]>([]);
  const [activeMentee, setActiveMentee] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_mentees: 0, overdue_count: 0, open_escalations: 0, checkins_this_month: 0 });
  const [tasks, setTasks] = useState<any[]>([]);
  const [futureNotes, setFutureNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score_asc' | 'score_desc' | 'overdue' | 'name'>('score_asc');

  // ─── Modal State ──────────────────────────────────────────────
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [checkinMode, setCheckinMode] = useState('in-person');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [checkinMood, setCheckinMood] = useState('doing well');
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateTo, setEscalateTo] = useState('counselor');

  // ─── Loading/Feedback State ───────────────────────────────────
  const [isLoadingMentees, setIsLoadingMentees] = useState(false);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // ─── Chat State ───────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome', role: 'assistant',
      content: '🌸 Hello! I\'m your **Wellbeing Advisor**. I can help you:\n\n• 📊 Analyze student Wellbeing Scores (0-100)\n• 📋 Highlight critical mentees requiring immediate action\n• 💬 Suggest gentle 1-on-1 conversation starters\n• 🚨 Assist with counseling escalations\n\nTry one of the quick actions below!',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const streamingRef = useRef('');
  const [streamingTraces, setStreamingTraces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Voice Check-in State ─────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [structuredReport, setStructuredReport] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  // ─── Load Data ────────────────────────────────────────────────
  const loadData = async () => {
    setIsLoadingMentees(true);
    try {
      const [mData, escData, statsData, tasksData] = await Promise.all([
        api.getMentees(),
        api.getMentorEscalations(),
        api.getMentorStats(),
        api.getMentorTasks(),
      ]);
      setMentees(mData);
      setEscalations(escData);
      setStats(statsData);
      setTasks(tasksData);
      if (mData.length > 0 && !activeMentee) {
        await handleSelectMentee(mData[0]);
      } else if (activeMentee) {
        const updated = mData.find((m: any) => m.id === activeMentee.id);
        if (updated) await handleSelectMentee(updated);
      }
    } catch (e) {
      console.error(e);
      setFeedbackMessage('Could not refresh mentor roster.');
    } finally {
      setIsLoadingMentees(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ─── Voice Recording ──────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedbackMessage('⚠️ Your browser does not support voice recording. Please use Chrome.');
      return;
    }
    setVoiceTranscript('');
    setStructuredReport(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    let finalTranscript = '';
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t + ' ';
        else interim = t;
      }
      setVoiceTranscript(finalTranscript + interim);
    };
    recognition.onerror = (e: any) => {
      setFeedbackMessage(`🎤 Mic error: ${e.error}. Please allow microphone access.`);
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        structureReport(finalTranscript.trim());
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const structureReport = (rawTranscript: string) => {
    if (!activeMentee) return;
    setVoiceLoading(true);
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const prompt = `A faculty mentor had a 1‑on‑1 meeting with student "${activeMentee.name}" (${activeMentee.roll_no}).

Voice note from mentor:
"${rawTranscript}"

Generate a "Meeting Summary" formatted exactly as follows:
📝 Meeting Summary
• Student is experiencing placement-related stress.
• Difficulty in DSA preparation.
• Attendance is satisfactory.
• Follow-up scheduled for next Monday.

Make the bullets match the facts mentioned in the recording. Return ONLY the plain text matching this format (no JSON, no markdown codeblocks).`;

    let buffer = '';
    api.streamChat(
      'agent6',
      prompt,
      [],
      (chunk) => { buffer += chunk; },
      () => {},
      async () => {
        const note = buffer.trim();
        setStructuredReport({ note, mood: 'doing well', date: today });
        setVoiceLoading(false);
      },
      () => { setVoiceLoading(false); setFeedbackMessage('Could not generate note.'); }
    );
  };

  useEffect(() => { 
    if (chatMessages.length > 1 || streamingText) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); 
    }
  }, [chatMessages, streamingText]);

  useEffect(() => {
    if (feedbackMessage) {
      const t = setTimeout(() => setFeedbackMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [feedbackMessage]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleSelectMentee = async (mentee: any) => {
    setActiveMentee(mentee);
    setSuggestedPrompt('');
    setTimeline([]);
    setFutureNotes([]);
    setNewNote('');
    try {
      const [timelineData, promptData, notesData] = await Promise.all([
        api.getMenteeTimeline(mentee.student_id),
        api.getSuggestedWellbeingPrompt(mentee.student_id),
        api.getFutureNotes(mentee.student_id),
      ]);
      setTimeline(timelineData);
      setSuggestedPrompt(promptData.prompt || promptData);
      setFutureNotes(notesData);
    } catch (e) {
      console.error(e);
      setSuggestedPrompt('I can help you craft a gentle starting point for your next check-in.');
    }
  };

  const handleAddFutureNote = async () => {
    if (!activeMentee || !newNote.trim()) return;
    try {
      await api.addFutureNote(activeMentee.student_id, newNote);
      setNewNote('');
      const notesData = await api.getFutureNotes(activeMentee.student_id);
      setFutureNotes(notesData);
    } catch (e) {
      setFeedbackMessage('Could not save note.');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => { e.preventDefault(); };

  const handleLogCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMentee || !checkinNotes) return;
    setIsSubmittingCheckin(true);
    try {
      await api.logCheckin(activeMentee.student_id, checkinMode, checkinNotes, checkinMood);
      setIsCheckinModalOpen(false);
      setCheckinNotes('');
      setCheckinMood('doing well');
      setFeedbackMessage(`✅ Check-in logged for ${activeMentee.name}.`);
      await loadData();
    } catch { setFeedbackMessage('Could not save check-in.'); } finally { setIsSubmittingCheckin(false); }
  };

  const handleRaiseEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMentee || !escalateReason) return;
    setIsSubmittingEscalation(true);
    try {
      await api.escalateMentee(activeMentee.student_id, escalateReason, escalateTo);
      setIsEscalateModalOpen(false);
      setEscalateReason('');
      setFeedbackMessage(`🚨 Escalation raised for ${activeMentee.name}.`);
      await loadData();
    } catch { setFeedbackMessage('Could not raise escalation.'); } finally { setIsSubmittingEscalation(false); }
  };

  const handleUpdateEscalation = async (id: number, newStatus: string) => {
    try {
      await api.updateEscalationStatus(id, newStatus);
      setFeedbackMessage(`Escalation status updated to ${newStatus}.`);
      await loadData();
    } catch { setFeedbackMessage('Could not update escalation.'); }
  };

  // ─── Chat ─────────────────────────────────────────────────────
  const handleSendChat = (preset?: string) => {
    const msg = preset || chatInput;
    if (!msg.trim()) return;
    const userMsg: ChatMessage = {
      id: Math.random().toString(), role: 'user', content: msg,
      timestamp: new Date().toLocaleTimeString(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    if (!preset) setChatInput('');
    setStreamingText('');
    streamingRef.current = '';
    setStreamingTraces([]);
    setIsLoading(true);

    const score = activeMentee ? computeWellbeingScore(activeMentee, timeline, escalations) : 0;
    const cat = getWellbeingCategory(score);

    const context = activeMentee
      ? `[Context: Viewing mentee "${activeMentee.name}" (${activeMentee.roll_no}), Wellbeing Score: ${score}/100 (${cat.label} ${cat.emoji}), last check-in: ${activeMentee.last_checkin_date}, status: ${activeMentee.is_overdue ? 'OVERDUE' : 'active'}]`
      : '[Context: No mentee selected]';

    api.streamChat(
      'agent6',
      `${context}\n\nUser: ${msg}`,
      chatMessages.filter(m => m.id !== 'welcome').slice(-6),
      (chunk) => {
        streamingRef.current += chunk;
        setStreamingText(streamingRef.current);
      },
      (trace) => {
        setStreamingTraces(prev => {
          const idx = prev.findIndex(t => t.name === trace.name);
          if (idx >= 0) { const u = [...prev]; u[idx] = trace; return u; }
          return [...prev, trace];
        });
      },
      async (_toolCalls, _richData) => {
        const finalText = streamingRef.current;
        setChatMessages(prev => [...prev, {
          id: Math.random().toString(), role: 'assistant',
          content: finalText || 'I processed your request. Please check the updated mentee view.',
          timestamp: new Date().toLocaleTimeString(),
        }]);
        setStreamingText('');
        streamingRef.current = '';
        setIsLoading(false);
        await loadData();
      },
      (err) => { console.error(err); setIsLoading(false); }
    );
  };

  // ─── Quick Actions ────────────────────────────────────────────
  const QUICK_ACTIONS = [
    { icon: '🚨', label: 'Critical List', msg: 'List all critical and warning mentees needing urgent action' },
    { icon: '💬', label: 'Suggest Prompt', msg: activeMentee ? `Suggest a check-in prompt for ${activeMentee.name} (Score: ${computeWellbeingScore(activeMentee, timeline, escalations)}/100)` : 'Suggest a check-in prompt' },
    { icon: '📊', label: 'Cohort Wellbeing', msg: 'Give me a summary of my cohort\'s wellbeing distribution' },
    { icon: '📝', label: 'Action Advice', msg: activeMentee ? `What action should I take next for ${activeMentee.name}?` : 'What action should I take next?' },
  ];

  // ─── Calculated Mentee Metrics & Filtering ─────────────────────
  const processedMentees = mentees.map(m => {
    const score = computeWellbeingScore(m, timeline, escalations);
    const cat = getWellbeingCategory(score);
    return { ...m, calculatedScore: score, category: cat };
  });

  const filteredMentees = processedMentees.filter(m => {
    const matchSearch = searchQuery === '' || m.name?.toLowerCase().includes(searchQuery.toLowerCase()) || m.roll_no?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchFilter = true;
    if (filterStatus === 'overdue') matchFilter = m.is_overdue;
    else if (filterStatus === 'critical') matchFilter = m.calculatedScore < 30;
    else if (filterStatus === 'needs_attention') matchFilter = m.calculatedScore >= 30 && m.calculatedScore < 50;
    else if (filterStatus === 'average') matchFilter = m.calculatedScore >= 50 && m.calculatedScore < 70;
    else if (filterStatus === 'good') matchFilter = m.calculatedScore >= 70 && m.calculatedScore < 90;
    else if (filterStatus === 'excellent') matchFilter = m.calculatedScore >= 90;

    return matchSearch && matchFilter;
  });

  // Sorting
  filteredMentees.sort((a, b) => {
    if (sortBy === 'score_asc') return a.calculatedScore - b.calculatedScore; // Lowest score first (recommended)
    if (sortBy === 'score_desc') return b.calculatedScore - a.calculatedScore;
    if (sortBy === 'overdue') return (b.days_since_checkin || 0) - (a.days_since_checkin || 0);
    return a.name.localeCompare(b.name);
  });

  // Cohort statistics
  const criticalCount = processedMentees.filter(m => m.calculatedScore < 30).length;
  const needsAttentionCount = processedMentees.filter(m => m.calculatedScore >= 30 && m.calculatedScore < 50).length;
  const averageCount = processedMentees.filter(m => m.calculatedScore >= 50 && m.calculatedScore < 70).length;
  const goodCount = processedMentees.filter(m => m.calculatedScore >= 70 && m.calculatedScore < 90).length;
  const excellentCount = processedMentees.filter(m => m.calculatedScore >= 90).length;
  const cohortAvgScore = processedMentees.length > 0
    ? Math.round(processedMentees.reduce((sum, m) => sum + m.calculatedScore, 0) / processedMentees.length)
    : 0;

  const urgentMentees = processedMentees.filter(m => m.calculatedScore < 50);

  // Active mentee category
  const activeScore = activeMentee ? computeWellbeingScore(activeMentee, timeline, escalations) : 0;
  const activeCategory = getWellbeingCategory(activeScore);

  // ─── Mood Dots for Timeline ───────────────────────────────────
  const MoodDots = ({ entries }: { entries: any[] }) => {
    const recent = entries.slice(0, 6);
    return (
      <div className="flex items-center gap-1">
        {recent.map((e, i) => {
          const cfg = MOOD_CONFIG[e.mood_tag] || MOOD_CONFIG['doing well'];
          return <div key={i} className={`w-2 h-2 rounded-full ${cfg.dot}`} title={`${e.date}: ${e.mood_tag}`} />;
        })}
        {recent.length === 0 && <span className="text-[9px] text-ink-muted font-mono">No history</span>}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-paper text-ink overflow-hidden font-ui">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <Seal agentId="agent6" icon={Heart} size="md" className="bg-pink-500" />
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Mentor & Wellbeing System</h1>
            <p className="text-[10px] text-ink-muted">Proactive Wellbeing Score monitoring, 1-on-1 check-ins, and automated intervention actions.</p>
          </div>
        </div>
      </div>

      {/* ── Wellbeing Summary Bar & Metrics ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3 shrink-0">
        {/* Metric Cards */}
        <div className="lg:col-span-8 grid grid-cols-4 gap-2">
          {[
            { label: 'Cohort Average', value: `${cohortAvgScore}/100`, icon: TrendingUp, accent: 'text-pink-400', sub: 'Overall Health' },
            { label: '🚨 Critical (0-29)', value: criticalCount, icon: AlertTriangle, accent: 'text-red-400', sub: 'Urgent Action' },
            { label: '😟 Needs Attention', value: needsAttentionCount, icon: Clock, accent: 'text-orange-400', sub: '30-49 Range' },
            { label: '😊 Excellent / Good', value: excellentCount + goodCount, icon: CheckCircle2, accent: 'text-emerald-400', sub: '70-100 Range' },
          ].map(({ label, value, icon: Icon, accent, sub }) => (
            <Card key={label} className="p-2.5 flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg bg-surface-raised flex items-center justify-center shrink-0 ${accent}`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold font-mono text-ink leading-none">{value}</div>
                <div className="text-[9px] font-mono text-ink-muted uppercase tracking-wider truncate mt-0.5">{label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Cohort Spectrum Bar */}
        <Card className="lg:col-span-4 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase text-ink-muted mb-1">
            <span>Cohort Wellbeing Spectrum</span>
            <span className="text-pink-400 font-bold">{processedMentees.length} Mentees</span>
          </div>
          {/* Bar */}
          <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-surface-raised border border-border/50">
            <div style={{ width: `${(criticalCount / Math.max(1, processedMentees.length)) * 100}%` }} className="bg-red-500" title={`Critical: ${criticalCount}`} />
            <div style={{ width: `${(needsAttentionCount / Math.max(1, processedMentees.length)) * 100}%` }} className="bg-orange-400" title={`Needs Attention: ${needsAttentionCount}`} />
            <div style={{ width: `${(averageCount / Math.max(1, processedMentees.length)) * 100}%` }} className="bg-amber-400" title={`Average: ${averageCount}`} />
            <div style={{ width: `${(goodCount / Math.max(1, processedMentees.length)) * 100}%` }} className="bg-blue-400" title={`Good: ${goodCount}`} />
            <div style={{ width: `${(excellentCount / Math.max(1, processedMentees.length)) * 100}%` }} className="bg-emerald-400" title={`Excellent: ${excellentCount}`} />
          </div>
          {/* Legend */}
          <div className="flex items-center justify-between text-[8px] font-mono text-ink-muted mt-1">
            <span onClick={() => setFilterStatus('critical')} className="cursor-pointer hover:text-red-400">🚨 {criticalCount}</span>
            <span onClick={() => setFilterStatus('needs_attention')} className="cursor-pointer hover:text-orange-400">😟 {needsAttentionCount}</span>
            <span onClick={() => setFilterStatus('average')} className="cursor-pointer hover:text-amber-400">😐 {averageCount}</span>
            <span onClick={() => setFilterStatus('good')} className="cursor-pointer hover:text-blue-400">🙂 {goodCount}</span>
            <span onClick={() => setFilterStatus('excellent')} className="cursor-pointer hover:text-emerald-400">😊 {excellentCount}</span>
          </div>
        </Card>
      </div>

      {/* ── Priority Action Required Banner ─────────────────────── */}
      {urgentMentees.length > 0 && (
        <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-400 shrink-0 animate-pulse" size={16} />
            <div>
              <div className="text-xs font-bold text-red-400 font-mono flex items-center gap-1.5">
                URGENT ATTENTION REQUIRED ({urgentMentees.length} Mentees in Warning/Critical Tiers)
              </div>
              <div className="text-[10px] text-ink-muted">These students require immediate 1-on-1 check-in sessions or counseling escalation.</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {urgentMentees.map(m => (
              <button
                key={m.id}
                onClick={() => handleSelectMentee(m)}
                className={`text-[9px] font-mono px-2 py-1 rounded-md border flex items-center gap-1 transition-all ${
                  activeMentee?.id === m.id ? 'bg-red-500 text-black border-red-400 font-bold' : 'bg-surface border-red-500/40 text-red-300 hover:bg-red-500/20'
                }`}
              >
                <span>{m.category.emoji}</span>
                <span>{m.name}</span>
                <span className="font-bold">({m.calculatedScore})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main 2-Column Layout ───────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 overflow-hidden">

        {/* ── Left: Mentee Roster with Wellbeing Scores ────────── */}
        <div className="xl:col-span-4 flex flex-col gap-2 overflow-hidden">
          {/* Tasks & Polling Header */}
          <div className="mb-1 shrink-0">
            <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5"><ListTodo size={11} /> Tasks & Follow-ups</span>
              <Button size="sm" variant="ghost" onClick={() => { setEditingTask(null); setTaskTitle(''); setTaskDescription(''); setIsTaskModalOpen(true); }} className="hover:text-pink-400 p-0.5">
                <Plus size={12} />
              </Button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
              {tasks.length === 0 ? (
                <div className="text-[9px] text-ink-muted bg-surface p-1.5 rounded border border-dashed border-border text-center">No pending tasks</div>
              ) : (
                tasks.map(t => (
                  <Card key={t.id} className="p-1.5 border border-border bg-surface group relative flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-ink truncate">{t.title}</span>
                    {t.status === 'completed' ? (
                      <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[7px] px-1 py-0.2 rounded bg-pink-500/10 text-pink-400 font-mono shrink-0">Pending</span>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider flex items-center justify-between shrink-0">
            <span className="flex items-center gap-1.5"><Users size={11} /> Assigned Mentees</span>
            <span className="text-[9px] text-pink-400">{filteredMentees.length} / {mentees.length}</span>
          </div>

          {/* Search & Filters */}
          <div className="space-y-1.5 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                placeholder="Search student name or roll..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border text-ink rounded pl-7 pr-2 py-1.5 outline-none text-[10px] focus:border-pink-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-[8px] font-mono text-ink-muted uppercase block mb-0.5">Tier Filter</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-surface border border-border text-ink rounded px-1.5 py-1 text-[9px] outline-none"
                >
                  <option value="all">All Tiers</option>
                  <option value="critical">🚨 Critical (0-29)</option>
                  <option value="needs_attention">😟 Needs Attn (30-49)</option>
                  <option value="average">😐 Average (50-69)</option>
                  <option value="good">🙂 Good (70-89)</option>
                  <option value="excellent">😊 Excellent (90-100)</option>
                  <option value="overdue">🗓️ Overdue Only</option>
                </select>
              </div>
              <div>
                <label className="text-[8px] font-mono text-ink-muted uppercase block mb-0.5">Sort Order</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full bg-surface border border-border text-ink rounded px-1.5 py-1 text-[9px] outline-none"
                >
                  <option value="score_asc">Lowest Score First</option>
                  <option value="score_desc">Highest Score First</option>
                  <option value="overdue">Days Overdue</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mentee Cards Roster */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoadingMentees ? (
              <div className="p-4 bg-surface rounded border border-border text-[11px] text-ink-muted text-center">Loading mentee roster…</div>
            ) : filteredMentees.length === 0 ? (
              <div className="p-4 bg-surface rounded border border-dashed border-border text-[11px] text-ink-muted text-center">No mentees match filter.</div>
            ) : filteredMentees.map(m => (
              <div
                key={m.id}
                onClick={() => handleSelectMentee(m)}
                className={`p-2.5 bg-surface rounded border cursor-pointer transition-all duration-200 ${
                  activeMentee?.id === m.id
                    ? 'border-pink-500 bg-pink-500/5 shadow-sm shadow-pink-500/10'
                    : m.calculatedScore < 30
                      ? 'border-l-4 border-l-red-500 border-border hover:border-pink-500/40'
                      : m.calculatedScore < 50
                        ? 'border-l-4 border-l-orange-400 border-border hover:border-pink-500/40'
                        : 'border-border hover:border-pink-500/30'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-ink truncate max-w-[130px]">{m.name}</span>
                  {/* Wellbeing Score Pill — only show score if genuinely computed from real data */}
                  {m.wellbeing_score !== null && m.wellbeing_score !== undefined ? (
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${m.category.badgeClass} flex items-center gap-1`}>
                      <span>{m.category.emoji}</span>
                      <span className="font-bold">{m.calculatedScore}/100</span>
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-border bg-surface-raised text-ink-muted flex items-center gap-1">
                      <span>📋</span>
                      <span>Score pending</span>
                    </span>
                  )}
                </div>

                {/* Score Progress Bar — only show if score is available */}
                {m.wellbeing_score !== null && m.wellbeing_score !== undefined && (
                  <div className="w-full bg-surface-raised h-1.5 rounded-full overflow-hidden border border-border/40 my-1.5">
                    <div className={`h-full ${m.category.barColor}`} style={{ width: `${m.calculatedScore}%` }} />
                  </div>
                )}

                <div className="flex items-center justify-between text-[9px] font-mono text-ink-muted mt-1">
                  <span>{m.roll_no} • {m.class_section}</span>
                  <span className="text-pink-400">
                    {m.days_since_checkin != null ? `${m.days_since_checkin}d ago` : 'Not checked in'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Mentee Wellbeing Detail & Next Action Hub ── */}
        <div className="xl:col-span-8 flex flex-col gap-3 overflow-y-auto pr-1 pb-4">
          {activeMentee ? (
            <div className="space-y-3">
              {/* Feedback Toast */}
              {feedbackMessage && (
                <div className="rounded border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-xs text-pink-300 flex items-center justify-between">
                  {feedbackMessage}
                  <button onClick={() => setFeedbackMessage(null)}><X size={12} className="text-pink-300/60" /></button>
                </div>
              )}

              {/* Mentee Profile Header with Score Gauge */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${activeCategory.bg} border-2 ${activeCategory.border} flex items-center justify-center text-pink-400 font-bold text-base ${activeCategory.ring}`}>
                      {activeMentee.name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="text-base font-bold text-ink flex items-center gap-2">
                        {activeMentee.name}
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${activeCategory.badgeClass}`}>
                          {activeCategory.emoji} {activeCategory.label.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-ink-muted">{activeMentee.roll_no} • {activeMentee.class_section} • Mentor Assigned</div>
                    </div>
                  </div>
                </div>

                {/* Score Gauge & Key Metrics Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Wellbeing Score — show only if computed from real data */}
                  {activeMentee.wellbeing_score !== null && activeMentee.wellbeing_score !== undefined ? (
                    <div className={`p-2.5 rounded-lg border ${activeCategory.bg} ${activeCategory.border} text-center`}>
                      <div className="text-xs font-mono text-ink-muted uppercase">Wellbeing Score</div>
                      <div className={`text-xl font-bold font-mono ${activeCategory.color} mt-0.5 flex items-center justify-center gap-1`}>
                        <span>{activeCategory.emoji}</span>
                        <span>{activeScore}</span>
                        <span className="text-[10px] text-ink-muted">/100</span>
                      </div>
                      <div className="text-[8px] font-mono text-ink-muted mt-0.5">Tier: {activeCategory.range}</div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg border border-border bg-surface-raised text-center flex flex-col justify-center">
                      <div className="text-xs font-mono text-ink-muted uppercase">Wellbeing Score</div>
                      <div className="text-xl font-bold font-mono text-ink-muted mt-0.5">—</div>
                      <div className="text-[8px] font-mono text-ink-muted mt-0.5">Log check-in to compute</div>
                    </div>
                  )}

                  <div className="bg-surface-raised rounded-lg p-2.5 text-center flex flex-col justify-center border border-border/40">
                    <div className="text-base font-bold font-mono text-ink">
                      {activeMentee.days_since_checkin != null ? activeMentee.days_since_checkin : '—'}
                    </div>
                    <div className="text-[8px] font-mono text-ink-muted uppercase">Days Since Check-in</div>
                    {activeMentee.days_since_checkin == null && (
                      <div className="text-[7px] text-ink-muted">Not yet checked in</div>
                    )}
                  </div>

                  {/* Internal Marks — only show if available from Phase 2 */}
                  <div className="bg-surface-raised rounded-lg p-2.5 text-center flex flex-col justify-center border border-border/40">
                    <div className="text-base font-bold font-mono text-ink">
                      {activeMentee.internal_marks != null ? `${activeMentee.internal_marks}/50` : (timeline.length > 0 ? timeline.length : '—')}
                    </div>
                    <div className="text-[8px] font-mono text-ink-muted uppercase">
                      {activeMentee.internal_marks != null ? 'Internal Marks' : 'Total Sessions'}
                    </div>
                  </div>

                  {/* Attendance status / Mood Dots */}
                  <div className="bg-surface-raised rounded-lg p-2.5 text-center flex flex-col justify-center border border-border/40">
                    {activeMentee.attendance_status != null ? (
                      <>
                        <div className={`text-sm font-bold font-mono ${activeMentee.attendance_status === 'Present' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {activeMentee.attendance_status === 'Present' ? '✔ Present' : '✘ Absent'}
                        </div>
                        <div className="text-[8px] font-mono text-ink-muted uppercase mt-0.5">Latest Attendance</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[8px] font-mono text-ink-muted uppercase mb-1">Recent Moods</div>
                        <MoodDots entries={timeline} />
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* ── Voice Check-in Recorder ────────────────────── */}
              <Card className="p-4 space-y-3 border-pink-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      isRecording ? 'bg-red-500 animate-pulse' : 'bg-pink-500/20'
                    }`}>
                      <Mic size={14} className={isRecording ? 'text-white' : 'text-pink-400'} />
                    </div>
                    <span className="text-xs font-bold font-mono uppercase tracking-wider text-pink-400">
                      Voice Check-in Recorder
                    </span>
                    {isRecording && (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-red-400 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        RECORDING
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-black text-[10px] font-mono font-bold rounded-lg transition-all duration-200 shadow-md shadow-pink-500/20"
                      >
                        <Mic size={12} /> Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-mono font-bold rounded-lg transition-all animate-pulse"
                      >
                        <StopCircle size={12} /> Stop & Generate Report
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Transcript Area */}
                <div className="bg-surface-raised border border-border rounded-lg p-3 min-h-[56px] relative">
                  <div className="text-[8px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
                    <MessageSquare size={8} /> Live Transcript
                  </div>
                  {voiceTranscript ? (
                    <p className="text-xs text-ink leading-relaxed">{voiceTranscript}</p>
                  ) : (
                    <p className="text-[10px] text-ink-muted italic">
                      {isRecording
                        ? 'Speak naturally... e.g. "Kumar seemed stressed about exams, attendance is good..."'
                        : 'Click \'Start Recording\' and speak your meeting notes after the session.'}
                    </p>
                  )}
                  {isRecording && (
                    <div className="absolute bottom-2 right-2 flex gap-0.5">
                      {[0,1,2,3,4].map(i => (
                        <div key={i} className="w-0.5 bg-pink-400 rounded-full animate-pulse"
                          style={{ height: `${8 + (i % 3) * 6}px`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Short Note Output */}
                {voiceLoading && (
                  <div className="flex items-center justify-center gap-2 py-3 text-pink-400">
                    <Loader2 size={15} className="animate-spin" />
                    <span className="text-xs font-mono">Converting to student note…</span>
                  </div>
                )}

                {structuredReport && !voiceLoading && (
                  <div className="border border-pink-500/25 bg-pink-500/5 rounded-lg p-3 space-y-2">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-pink-400" />
                        <span className="text-[10px] font-bold font-mono uppercase text-pink-400">Meeting Note</span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${
                          structuredReport.mood === 'concerning'     ? 'bg-red-500/10    border-red-500/30    text-red-400'
                          : structuredReport.mood === 'needs attention' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {structuredReport.mood === 'concerning' ? '😟' : structuredReport.mood === 'needs attention' ? '😐' : '😊'}
                          &nbsp;{(structuredReport.mood || 'doing well').replace(/-/g,' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-ink-muted">
                        {structuredReport.date || new Date().toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    {/* The short note */}
                    <p className="text-xs text-ink leading-relaxed bg-surface rounded-md p-2.5 border border-border/50 whitespace-pre-wrap font-sans">
                      {structuredReport.note || structuredReport.raw || '—'}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-1 border-t border-border/30">
                      <button
                        onClick={async () => {
                          if (!activeMentee || !structuredReport.note) return;
                          setIsSubmittingCheckin(true);
                          try {
                            const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                            
                            // Save note using the standard logCheckin api
                            await api.logCheckin(activeMentee.student_id, 'in-person', structuredReport.note, 'doing well');
                            
                            // Update localState activeMentee right away so UI updates instantly
                            setActiveMentee((prev: any) => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                last_checkin_date: today,
                                days_since_checkin: 0,
                                latest_mood: 'doing well'
                              };
                            });

                            setFeedbackMessage(`✅ Summary saved to student record!`);
                            setStructuredReport(null);
                            setVoiceTranscript('');
                            await loadData();
                          } catch {
                            setFeedbackMessage('Could not save note to student record.');
                          } finally {
                            setIsSubmittingCheckin(false);
                          }
                        }}
                        disabled={isSubmittingCheckin}
                        className="text-[10px] font-mono bg-pink-500 hover:bg-pink-600 text-black px-3 py-1 rounded font-bold transition-all flex items-center gap-1 disabled:opacity-50"
                      >
                        {isSubmittingCheckin ? <Loader2 size={10} className="animate-spin" /> : '✓'} Save to Record
                      </button>
                      <button
                        onClick={() => { setStructuredReport(null); setVoiceTranscript(''); }}
                        className="text-[9px] font-mono text-ink-muted hover:text-red-400 flex items-center gap-1 transition-colors"
                      >
                        <MicOff size={9} /> Discard &amp; record again
                      </button>
                    </div>
                  </div>
                )}
              </Card>

              {/* ── WHAT ACTION SHOULD I TAKE NEXT? Card ──────────── */}
              <div className={`p-4 rounded-lg border ${activeCategory.bg} ${activeCategory.border} space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Recommended Action Next
                  </span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${activeCategory.badgeClass}`}>
                    {activeCategory.actionBadge}
                  </span>
                </div>

                <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <span>{activeCategory.actionTitle}</span>
                </div>
                <p className="text-xs leading-relaxed text-ink-muted">
                  {activeCategory.actionText}
                </p>
              </div>

              {/* Escalation History */}
              {escalations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={11} /> Escalation History
                  </div>
                  <div className="space-y-2">
                    {escalations.map(esc => (
                      <Card key={esc.id} className="p-3 border-border">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-ink">{esc.student_name || 'Student'}</span>
                              <span className="text-[9px] font-mono text-ink-muted">{esc.roll_no}</span>
                              <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${
                                esc.status === 'open' ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                : esc.status === 'in-progress' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}>{esc.status?.toUpperCase()}</span>
                            </div>
                            <p className="text-[10px] text-ink-muted">{esc.reason}</p>
                            <div className="text-[9px] font-mono text-ink-muted mt-1">
                              Escalated to: <span className="text-pink-400">{esc.escalated_to}</span>
                              {esc.created_at && <span className="ml-2">• {new Date(esc.created_at).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          {esc.status !== 'resolved' && (
                            <div className="flex flex-col gap-1 shrink-0">
                              {esc.status === 'open' && (
                                <button onClick={() => handleUpdateEscalation(esc.id, 'in-progress')}
                                  className="text-[8px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-colors">
                                  In Progress
                                </button>
                              )}
                              <button onClick={() => handleUpdateEscalation(esc.id, 'resolved')}
                                className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors">
                                Resolve
                              </button>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="flex-1 min-h-48 flex flex-col items-center justify-center text-center p-8">
              <Heart className="text-pink-500/20 mb-4 animate-pulse" size={48} />
              <div className="text-sm text-ink font-semibold">Select a mentee</div>
              <p className="text-[11px] text-ink-muted mt-1 max-w-xs">Choose a mentee from the roster to view their Wellbeing Score, recommended actions, and timeline.</p>
            </Card>
          )}
        </div>


      </div>

      {/* ── Log Check-in Modal ────────────────────────────────── */}
      {isCheckinModalOpen && activeMentee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-surface border-pink-500/30 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-mono font-bold text-pink-400 flex items-center gap-1.5">
                <Plus size={12} /> LOG CHECK-IN: {activeMentee.name}
              </span>
              <button onClick={() => setIsCheckinModalOpen(false)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
            </div>

            <form onSubmit={handleLogCheckin} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Check-in Mode</label>
                  <select value={checkinMode} onChange={e => setCheckinMode(e.target.value)}
                    className="w-full bg-surface border border-border text-ink rounded py-2 px-3 outline-none focus:border-pink-500">
                    <option value="in-person">In-Person Meeting</option>
                    <option value="call">Phone Call</option>
                    <option value="chat">Chat / Message</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Mood Tag</label>
                  <div className="flex gap-1.5">
                    {(['doing well', 'needs attention', 'concerning'] as const).map(mood => {
                      const cfg = MOOD_CONFIG[mood];
                      return (
                        <button key={mood} type="button"
                          onClick={() => setCheckinMood(mood)}
                          className={`flex-1 text-[8px] font-mono px-1 py-2 rounded border transition-all ${
                            checkinMood === mood
                              ? `${cfg.bg} ${cfg.border} ${cfg.color} font-bold ring-1 ring-current`
                              : 'bg-surface border-border text-ink-muted hover:border-pink-500/30'
                          }`}>
                          {mood === 'doing well' ? '😊' : mood === 'needs attention' ? '😐' : '😟'}
                          <div className="mt-0.5">{mood.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1 flex items-center gap-1">
                  <Shield size={9} /> Meeting Notes (Sensitive — visible only to assigned mentor)
                </label>
                <textarea rows={4} required placeholder="Record a summary of your conversation…"
                  value={checkinNotes} onChange={e => setCheckinNotes(e.target.value)}
                  className="w-full bg-surface border border-border text-ink rounded py-2 px-3 outline-none focus:border-pink-500 resize-none" />
              </div>

              <Button type="submit" disabled={isSubmittingCheckin} className="w-full bg-pink-500 hover:bg-pink-600 text-black font-mono font-bold disabled:opacity-60">
                {isSubmittingCheckin ? 'SAVING…' : '✓ SUBMIT CHECK-IN LOG'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ── Escalate Modal ────────────────────────────────────── */}
      {isEscalateModalOpen && activeMentee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-surface border-pink-500/30 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-mono font-bold text-pink-400 flex items-center gap-1.5">
                <AlertCircle size={12} /> ESCALATE: {activeMentee.name}
              </span>
              <button onClick={() => setIsEscalateModalOpen(false)} className="text-ink-muted hover:text-ink"><X size={16} /></button>
            </div>

            <form onSubmit={handleRaiseEscalation} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Escalate To</label>
                <select value={escalateTo} onChange={e => setEscalateTo(e.target.value)}
                  className="w-full bg-surface border border-border text-ink rounded py-2 px-3 outline-none focus:border-pink-500">
                  <option value="counselor">Institutional Counselor</option>
                  <option value="HOD">Head of Department (HOD)</option>
                  <option value="Dean">Dean of Student Affairs</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase block mb-1">Reason for Escalation</label>
                <textarea rows={4} required
                  placeholder="Describe the academic, attendance, health, or emotional concerns…"
                  value={escalateReason} onChange={e => setEscalateReason(e.target.value)}
                  className="w-full bg-surface border border-border text-ink rounded py-2 px-3 outline-none focus:border-pink-500 resize-none" />
              </div>
              <Button type="submit" disabled={isSubmittingEscalation} className="w-full bg-pink-500 hover:bg-pink-600 text-black font-mono font-bold disabled:opacity-60">
                {isSubmittingEscalation ? 'RAISING CASE…' : '🚨 SUBMIT ESCALATION'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-paper border-border shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ListTodo size={16} className="text-pink-400" />
                <h3 className="font-semibold text-ink text-sm">{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsTaskModalOpen(false)}>
                <X size={14} className="text-ink-muted" />
              </Button>
            </div>
            <form onSubmit={handleSaveTask} className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase tracking-wider mb-1.5 block">Task Title</label>
                <Input
                  autoFocus
                  placeholder="e.g. Register for NPTEL"
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-ink-muted uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  placeholder="Provide any additional details or links..."
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  className="w-full h-24 bg-surface border border-border rounded-md p-3 text-ink text-xs focus:border-pink-500 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsTaskModalOpen(false)} className="text-xs">Cancel</Button>
                <Button type="submit" className="bg-pink-500 hover:bg-pink-600 text-black text-xs font-bold">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
