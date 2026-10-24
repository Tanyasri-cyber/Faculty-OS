import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Badge } from '../components/Common';
import {
  Network, Search, Filter, Plus, Users, Award, Calendar,
  Briefcase, GraduationCap, Building, MapPin, Mail,
  ExternalLink, CheckCircle2, Clock, Sparkles, Send, RefreshCw,
  X, Star, Copy, Check, Eye, Edit3, HeartHandshake,
  BarChart3, UserCheck, ShieldCheck
} from 'lucide-react';
import { api, type ChatMessage } from '../services/api';

export const AlumniRelations: React.FC<{ user: any }> = ({ user }) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'directory' | 'matchmaker' | 'mentorship' | 'events' | 'contributions' | 'followups' | 'analytics'>('directory');

  // Core Data States
  const [alumniList, setAlumniList] = useState<any[]>([]);
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [smartRecs, setSmartRecs] = useState<any[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Directory Filters & View
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [mentorFilter, setMentorFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'batch' | 'score' | 'recent'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAlumnus, setSelectedAlumnus] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Modals
  const [isAddAlumniModalOpen, setIsAddAlumniModalOpen] = useState(false);
  const [editingAlumnusId, setEditingAlumnusId] = useState<number | null>(null);
  const [alumniForm, setAlumniForm] = useState({
    name: '',
    email: '',
    phone: '',
    graduation_year: '2022',
    degree: 'B.Tech',
    department: 'CSE',
    current_company: '',
    designation: '',
    industry: 'Technology',
    location: '',
    skills: '',
    linkedin_url: '',
    mentorship_available: true,
    mentorship_topics: '',
    willing_to_refer: true,
    willing_guest_lectures: true,
    engagement_status: 'Active'
  });

  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [interactionAlumniId, setInteractionAlumniId] = useState<number | null>(null);
  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'Guest Lecture',
    date: new Date().toISOString().split('T')[0],
    summary: '',
    outcome: 'Completed'
  });

  const [isMentorshipModalOpen, setIsMentorshipModalOpen] = useState(false);
  const [mentorshipForm, setMentorshipForm] = useState({
    alumni_id: '',
    student_name: '',
    student_roll_no: '',
    student_department: 'CSE',
    topic: '',
    goals: '',
    meeting_link: ''
  });

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'Guest Lecture',
    date: new Date().toISOString().split('T')[0],
    time: '10:30 AM',
    venue: 'Seminar Hall 1',
    target_audience: '3rd & 4th Year Students',
    coordinator_name: user?.name || 'Dr. Preethi R',
    alumni_speaker_id: '',
    alumni_speaker_name: '',
    expected_attendees: '100',
    description: ''
  });

  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [contributionForm, setContributionForm] = useState({
    alumni_id: '',
    alumni_name: '',
    category: 'Guest Lecture',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    verified_by: user?.name || 'Faculty Coordinator',
    impact_summary: ''
  });

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    alumni_id: '',
    alumni_name: '',
    assigned_to: user?.name || 'Alumni Lead',
    title: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    priority: 'Medium',
    notes: ''
  });

  // AI Matchmaker State
  const [matchType, setMatchType] = useState<'student_mentor' | 'guest_speaker'>('student_mentor');
  const [matchDepartment, setMatchDepartment] = useState('CSE');
  const [matchSkillsInput, setMatchSkillsInput] = useState('Cloud, Kubernetes, System Design');
  const [matchTopicInput, setMatchTopicInput] = useState('Distributed Architecture');
  const [matchedResults, setMatchedResults] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  // Outreach Template Generator
  const [isOutreachModalOpen, setIsOutreachModalOpen] = useState(false);
  const [selectedOutreachAlumnus, setSelectedOutreachAlumnus] = useState<any | null>(null);
  const [outreachTemplateType, setOutreachTemplateType] = useState<'keynote' | 'mentorship' | 'reunion' | 'endowment'>('keynote');
  const [outreachDraftText, setOutreachDraftText] = useState('');
  const [copiedDraft, setCopiedDraft] = useState(false);

  // ARIA Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingTraces, setStreamingTraces] = useState<any[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch all data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [alumniData, mentorData, eventsData, contribData, followData, analyticsData, recsData] = await Promise.all([
        api.getAlumniDirectory(),
        api.getAlumniMentorships(),
        api.getAlumniEvents(),
        api.getAlumniContributions(),
        api.getAlumniFollowUps(),
        api.getAlumniAnalyticsSummary(),
        api.getAlumniSmartRecommendations()
      ]);

      setAlumniList(alumniData || []);
      setMentorships(mentorData || []);
      setEvents(eventsData || []);
      setContributions(contribData || []);
      setFollowUps(followData || []);
      setAnalytics(analyticsData);
      setSmartRecs(recsData || []);
    } catch (err) {
      console.error("Error loading alumni data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText, streamingTraces]);

  // Filtered & Sorted Alumni
  const filteredAlumni = useMemo(() => {
    return alumniList.filter((a) => {
      if (batchFilter !== 'All' && String(a.graduation_year) !== batchFilter) return false;
      if (deptFilter !== 'All' && a.department !== deptFilter) return false;
      if (companyFilter !== 'All' && !a.current_company.toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (statusFilter !== 'All' && a.engagement_status !== statusFilter) return false;
      if (mentorFilter === 'Yes' && !a.mentorship_available) return false;
      if (mentorFilter === 'No' && a.mentorship_available) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${a.name} ${a.current_company} ${a.designation} ${a.skills} ${a.location} ${a.department} ${a.graduation_year}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'batch') return b.graduation_year - a.graduation_year;
      if (sortBy === 'score') return (b.engagement_score || 0) - (a.engagement_score || 0);
      if (sortBy === 'recent') {
        const dA = a.last_interaction_date ? new Date(a.last_interaction_date).getTime() : 0;
        const dB = b.last_interaction_date ? new Date(b.last_interaction_date).getTime() : 0;
        return dB - dA;
      }
      return a.name.localeCompare(b.name);
    });
  }, [alumniList, searchQuery, batchFilter, deptFilter, companyFilter, statusFilter, mentorFilter, sortBy]);

  // Unique batches and companies for filters
  const uniqueBatches = useMemo(() => {
    const s = new Set<string>();
    alumniList.forEach(a => { if (a.graduation_year) s.add(String(a.graduation_year)); });
    return Array.from(s).sort().reverse();
  }, [alumniList]);

  const uniqueCompanies = useMemo(() => {
    const s = new Set<string>();
    alumniList.forEach(a => { if (a.current_company) s.add(a.current_company); });
    return Array.from(s).sort();
  }, [alumniList]);

  // Handle Save Alumnus
  const handleSaveAlumnus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumniForm.name.trim()) return;

    try {
      if (editingAlumnusId) {
        await api.editAlumni(editingAlumnusId, alumniForm);
        showToast(`Updated profile for ${alumniForm.name}`);
      } else {
        await api.addAlumni(alumniForm);
        showToast(`Added ${alumniForm.name} to Alumni Network`);
      }
      setIsAddAlumniModalOpen(false);
      setEditingAlumnusId(null);
      loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to save alumnus record');
    }
  };

  // Open Edit Alumnus
  const openEditAlumnus = (alumnus: any) => {
    setEditingAlumnusId(alumnus.id);
    setAlumniForm({
      name: alumnus.name,
      email: alumnus.email || '',
      phone: alumnus.phone || '',
      graduation_year: String(alumnus.graduation_year || '2022'),
      degree: alumnus.degree || 'B.Tech',
      department: alumnus.department || 'CSE',
      current_company: alumnus.current_company || '',
      designation: alumnus.designation || '',
      industry: alumnus.industry || 'Technology',
      location: alumnus.location || '',
      skills: alumnus.skills || '',
      linkedin_url: alumnus.linkedin_url || '',
      mentorship_available: alumnus.mentorship_available ?? true,
      mentorship_topics: alumnus.mentorship_topics || '',
      willing_to_refer: alumnus.willing_to_refer ?? true,
      willing_guest_lectures: alumnus.willing_guest_lectures ?? true,
      engagement_status: alumnus.engagement_status || 'Active'
    });
    setIsAddAlumniModalOpen(true);
  };

  // Handle Delete Alumnus
  const handleDeleteAlumnus = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the Alumni Directory?`)) return;
    try {
      await api.deleteAlumni(id);
      showToast(`Removed ${name} from directory`);
      if (selectedAlumnus?.id === id) setIsDetailModalOpen(false);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Log Interaction
  const openLogInteraction = (alumnus: any) => {
    setInteractionAlumniId(alumnus.id);
    setInteractionForm({
      interaction_type: 'Guest Lecture',
      date: new Date().toISOString().split('T')[0],
      summary: '',
      outcome: 'Completed'
    });
    setIsInteractionModalOpen(true);
  };

  const handleSaveInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionAlumniId || !interactionForm.summary.trim()) return;
    try {
      await api.logAlumniInteraction(interactionAlumniId, interactionForm);
      showToast('Interaction logged successfully');
      setIsInteractionModalOpen(false);
      if (selectedAlumnus?.id === interactionAlumniId) {
        const updated = await api.getAlumniDetail(interactionAlumniId);
        setSelectedAlumnus(updated);
      }
      loadAllData();
    } catch (err) {
      console.error(err);
      showToast('Failed to log interaction');
    }
  };

  // View Alumnus Detail
  const handleOpenDetail = async (alumnus: any) => {
    setSelectedAlumnus(alumnus);
    setIsDetailModalOpen(true);
    try {
      const fullDetail = await api.getAlumniDetail(alumnus.id);
      if (fullDetail) setSelectedAlumnus(fullDetail);
    } catch (e) {
      console.warn("Could not load full detail", e);
    }
  };

  // Handle Mentorship Request
  const handleSaveMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorshipForm.alumni_id || !mentorshipForm.student_name.trim() || !mentorshipForm.topic.trim()) return;
    try {
      await api.createAlumniMentorship(mentorshipForm);
      showToast(`Mentorship request submitted for ${mentorshipForm.student_name}`);
      setIsMentorshipModalOpen(false);
      setMentorshipForm({
        alumni_id: '',
        student_name: '',
        student_roll_no: '',
        student_department: 'CSE',
        topic: '',
        goals: '',
        meeting_link: ''
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Mentorship Status Update
  const handleUpdateMentorshipStatus = async (id: number, status: string, feedbackRating?: number) => {
    try {
      await api.updateAlumniMentorshipStatus(id, { status, feedback_rating: feedbackRating });
      showToast(`Mentorship updated to ${status}`);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;
    try {
      await api.addAlumniEvent(eventForm);
      showToast(`Scheduled event: ${eventForm.title}`);
      setIsEventModalOpen(false);
      setEventForm({
        title: '',
        event_type: 'Guest Lecture',
        date: new Date().toISOString().split('T')[0],
        time: '10:30 AM',
        venue: 'Seminar Hall 1',
        target_audience: '3rd & 4th Year Students',
        coordinator_name: user?.name || 'Dr. Preethi R',
        alumni_speaker_id: '',
        alumni_speaker_name: '',
        expected_attendees: '100',
        description: ''
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Save Contribution
  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributionForm.alumni_name.trim()) return;
    try {
      await api.addAlumniContribution(contributionForm);
      showToast('Alumni institutional contribution recorded');
      setIsContributionModalOpen(false);
      setContributionForm({
        alumni_id: '',
        alumni_name: '',
        category: 'Guest Lecture',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        verified_by: user?.name || 'Faculty Coordinator',
        impact_summary: ''
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateContributionStatus = async (id: number, status: string) => {
    try {
      await api.updateAlumniContributionStatus(id, { status, verified_by: user?.name || 'Admin' });
      showToast(`Contribution marked as ${status}`);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Save Follow-up
  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpForm.title.trim() || !followUpForm.alumni_name.trim()) return;
    try {
      await api.addAlumniFollowUp(followUpForm);
      showToast('Follow-up task created');
      setIsFollowUpModalOpen(false);
      setFollowUpForm({
        alumni_id: '',
        alumni_name: '',
        assigned_to: user?.name || 'Alumni Lead',
        title: '',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        priority: 'Medium',
        notes: ''
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await api.updateAlumniFollowUp(id, { status: nextStatus });
      showToast(`Task marked as ${nextStatus}`);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // AI Matching execution
  const executeAIMatch = async () => {
    setIsMatching(true);
    try {
      const skillsArr = matchSkillsInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.matchAlumni({
        type: matchType,
        skills: skillsArr,
        department: matchDepartment,
        topic: matchTopicInput
      });
      setMatchedResults(res);
      showToast(`Generated ${res.length} ranked matches with AI scoring`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMatching(false);
    }
  };

  // Outreach Draft Generator
  const openOutreachDraft = (alumnus: any, defaultType: 'keynote' | 'mentorship' | 'reunion' | 'endowment' = 'keynote') => {
    setSelectedOutreachAlumnus(alumnus);
    setOutreachTemplateType(defaultType);
    generateOutreachText(alumnus, defaultType);
    setIsOutreachModalOpen(true);
    setCopiedDraft(false);
  };

  const generateOutreachText = (alumnus: any, templateType: string) => {
    const name = alumnus?.name || 'Esteemed Alumnus';
    const comp = alumnus?.current_company || 'your esteemed organization';
    const role = alumnus?.designation || 'Leader';
    const dept = alumnus?.department || 'Computer Science';
    const batch = alumnus?.graduation_year || 'Class of 2020';
    const topSkill = alumnus?.skills ? alumnus.skills.split(',')[0].trim() : 'Advanced Engineering';

    let text = '';
    if (templateType === 'keynote') {
      text = `Subject: Invitation to Deliver Keynote Address — Department Colloquium

Dear ${name},

Greetings from the Department of ${dept}! We are thrilled to witness your inspiring journey as ${role} at ${comp}.

Our academic council is organizing an upcoming Technical Seminar on "${topSkill} in Industry Production" for our 3rd and final year undergraduate cohorts. Given your remarkable accomplishments since graduating in ${batch}, we would be deeply privileged if you could deliver a 45-minute keynote talk (hybrid or on-campus).

We are completely flexible around your schedule during the upcoming month. Please let us know if you would be open to this interaction, and our student coordinators will handle all logistic arrangements.

Warm institutional regards,
Dr. Preethi R
Head of Department, Alumni Relations Lead
Faculty-OS University Network`;
    } else if (templateType === 'mentorship') {
      text = `Subject: Student Mentorship Invitation — Connecting with our ${dept} Scholars

Dear ${name},

Greetings! Following your graduation in ${batch}, your technical leadership at ${comp} has been a tremendous beacon for our students.

We are launching the 2026-27 Alumni Mentorship Cohort, connecting high-potential students with alumni industry champions. We have identified 2 promising students whose career ambitions in ${topSkill} strongly align with your expertise.

Mentorship entails:
- 1 to 2 remote guidance sessions per month (30 mins each)
- High-level resume advice & industry best-practice insights
- Platform hosted securely via Faculty-OS

Kindly reply to this message if you would be delighted to mentor a budding engineer from your alma mater.

With gratitude,
Office of Student Wellbeing & Mentorship`;
    } else if (templateType === 'reunion') {
      text = `Subject: Official Invitation: Annual Alumni Homecoming Summit 2026

Dear ${name},

It has been a privilege to watch your growth since your graduation in ${batch}!

You are cordially invited to our Grand Annual Alumni Homecoming & Leadership Summit on Saturday, December 19, 2026 at the Main Campus Grounds.

Event Highlights:
- Distinguished Alumni Keynotes & Panel Discussions
- Innovation Exhibition & Startup Pitch Arena
- Networking Banquet with Faculty Mentors & Batchmates

Please RSVP through this link or reply to confirm your attendance so we may reserve your delegate pass.

Warm regards,
Alumni Relations Directorate`;
    } else {
      text = `Subject: Partnering for Academic Excellence — Student Scholarship & Lab Innovation Fund

Dear ${name},

Greetings from your Alma Mater! As you continue to innovate at ${comp}, our department is expanding initiatives to support underprivileged scholars and state-of-the-art laboratory infrastructure.

Through the Alumni Innovation Endowment, distinguished alumni are empowering the next generation through named scholarships, student travel grants for IEEE/ACM conferences, and specialized equipment sponsorships.

We would welcome an opportunity to connect for a brief 10-minute briefing on how your involvement can create transformational impact for aspiring engineers.

Sincerely,
Dean of Institutional Advancement`;
    }

    setOutreachDraftText(text);
  };

  const copyOutreachDraft = () => {
    navigator.clipboard.writeText(outreachDraftText);
    setCopiedDraft(true);
    showToast('Outreach draft copied to clipboard!');
    setTimeout(() => setCopiedDraft(false), 2000);
  };

  // ARIA Streaming Chat
  const handleSendChat = async (directMessage?: string) => {
    const msg = directMessage || chatInput.trim();
    if (!msg || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setIsChatLoading(true);
    setStreamingText('');
    setStreamingTraces([]);

    let fullText = '';

    try {
      await api.streamChat(
        'agent8',
        msg,
        newHistory,
        (chunk) => {
          fullText += chunk;
          setStreamingText(fullText);
        },
        (trace) => {
          setStreamingTraces((prev) => {
            const idx = prev.findIndex((t) => t.name === trace.name);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = trace;
              return updated;
            }
            return [...prev, trace];
          });
        },
        (toolCalls, richData) => {
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: fullText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              richData
            }
          ]);
          setStreamingText('');
          setStreamingTraces([]);
          setIsChatLoading(false);
        },
        (err) => {
          console.error(err);
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: 'Sorry, an error occurred while processing your Alumni Relations request.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setIsChatLoading(false);
        }
      );
    } catch (e) {
      console.error(e);
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-800 text-white border border-cyan-500/40 px-4 py-3 rounded-lg shadow-xl shadow-cyan-950/40 text-sm animate-fade-in font-sans">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER BANNER & STATS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-xl p-5 md:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Network className="w-5 h-5" />
              </span>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white font-ui">
                Alumni Relations & Institutional Network
              </h1>
              <Badge variant="accent" className="bg-cyan-950 text-cyan-300 border-cyan-800/50">
                Agent 8
              </Badge>
            </div>
            <p className="text-slate-400 text-sm max-w-2xl">
              Intelligent alumni directory, AI-powered student mentorship matchmaking, guest lecture coordination, institutional giving records, and structured follow-up workflows.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>ARIA Assistant</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingAlumnusId(null);
                setAlumniForm({
                  name: '',
                  email: '',
                  phone: '',
                  graduation_year: '2023',
                  degree: 'B.Tech',
                  department: 'CSE',
                  current_company: '',
                  designation: '',
                  industry: 'Technology',
                  location: '',
                  skills: '',
                  linkedin_url: '',
                  mentorship_available: true,
                  mentorship_topics: '',
                  willing_to_refer: true,
                  willing_guest_lectures: true,
                  engagement_status: 'Active'
                });
                setIsAddAlumniModalOpen(true);
              }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Alumnus</span>
            </Button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Network</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {analytics?.total_alumni ?? alumniList.length}
            </div>
            <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
              Across {uniqueBatches.length || 5} Graduating Batches
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Active Engagement</span>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {analytics?.engagement_rate ?? '72.7'}%
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {analytics?.active_alumni ?? alumniList.filter(a => a.engagement_status === 'Active').length} Verified Active
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Mentorship Match</span>
              <HeartHandshake className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">
              {analytics?.mentorship?.total ?? mentorships.length}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {analytics?.mentorship?.completed ?? mentorships.filter(m => m.status === 'Completed').length} Sessions Completed
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Institutional Giving</span>
              <Award className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              ₹{((analytics?.contributions?.total_funds ?? 430000) / 100000).toFixed(1)}L
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Scholarships & Lab Grants
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-1 border-b border-slate-700 overflow-x-auto pb-px text-sm font-medium">
        {[
          { id: 'directory', label: 'Alumni Directory', icon: Users, badge: alumniList.length },
          { id: 'matchmaker', label: 'AI Matchmaker', icon: Sparkles, badge: smartRecs.length ? `${smartRecs.length} Recs` : undefined },
          { id: 'mentorship', label: 'Mentorship Programme', icon: HeartHandshake, badge: mentorships.length },
          { id: 'events', label: 'Events & Lectures', icon: Calendar, badge: events.length },
          { id: 'contributions', label: 'Giving & Partnerships', icon: Award, badge: contributions.length },
          { id: 'followups', label: 'Follow-up Centre', icon: Clock, badge: followUps.filter(f => f.status !== 'Completed').length || undefined },
          { id: 'analytics', label: 'Engagement Analytics', icon: BarChart3 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ALUMNI DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS TOOLBAR */}
          <Card className="p-4 bg-slate-900 border-slate-700/60 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search alumni by name, company, technical skills, designation, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-700 rounded-lg p-0.5 bg-slate-800/80">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium ${viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium ${viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    List
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 border-l border-slate-700 pl-3">
                  <span>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs outline-none"
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="batch">Graduation Batch</option>
                    <option value="score">Engagement Score</option>
                    <option value="recent">Recently Contacted</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECONDARY FILTER CHIPS */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter by:
              </span>

              {/* Batch Filter */}
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="All">All Batches</option>
                {uniqueBatches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="All">All Depts</option>
                <option value="CSE">CSE</option>
                <option value="CCE">CCE</option>
                <option value="ECE">ECE</option>
                <option value="IT">IT</option>
                <option value="MECH">MECH</option>
              </select>

              {/* Company Filter */}
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="All">All Companies</option>
                {uniqueCompanies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Mentorship Filter */}
              <select
                value={mentorFilter}
                onChange={(e) => setMentorFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="All">All Mentorship</option>
                <option value="Yes">Mentors Available</option>
                <option value="No">Not Available</option>
              </select>

              {/* Engagement Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-xs"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Newly Registered">Newly Registered</option>
                <option value="Requires Follow-up">Requires Follow-up</option>
                <option value="Inactive">Inactive</option>
              </select>

              {(batchFilter !== 'All' || deptFilter !== 'All' || companyFilter !== 'All' || mentorFilter !== 'All' || statusFilter !== 'All' || searchQuery) && (
                <button
                  onClick={() => {
                    setBatchFilter('All');
                    setDeptFilter('All');
                    setCompanyFilter('All');
                    setMentorFilter('All');
                    setStatusFilter('All');
                    setSearchQuery('');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-xs underline ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </Card>

          {/* RESULTS COUNT */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing <strong className="text-white">{filteredAlumni.length}</strong> of {alumniList.length} alumni</span>
            <span>Click any profile for complete interaction history, contributions, and contact details</span>
          </div>

          {/* GRID VIEW */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAlumni.map((a) => {
                const initials = a.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <Card
                    key={a.id}
                    className="p-5 bg-slate-900 border-slate-700/60 hover:border-cyan-500/50 transition-all duration-200 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt={a.name} className="w-12 h-12 rounded-full object-cover border border-slate-600 shadow-sm" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold flex items-center justify-center text-sm shadow-sm">
                              {initials}
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-white text-base group-hover:text-cyan-300 transition-colors">
                              {a.name}
                            </h3>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-cyan-400 font-semibold">{a.degree} '{a.graduation_year}</span>
                              <span>•</span>
                              <span>{a.department}</span>
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={
                            a.engagement_status === 'Active' ? 'success' :
                            a.engagement_status === 'Newly Registered' ? 'accent' :
                            a.engagement_status === 'Requires Follow-up' ? 'warning' : 'neutral'
                          }
                          className="text-[10px]"
                        >
                          {a.engagement_status}
                        </Badge>
                      </div>

                      {/* Current Role & Company */}
                      <div className="bg-slate-800/60 rounded-lg p-2.5 mb-3 border border-slate-700/40">
                        <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{a.designation}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center justify-between mt-1">
                          <span className="flex items-center gap-1 text-slate-300 font-medium">
                            <Building className="w-3 h-3 text-slate-400" />
                            {a.current_company}
                          </span>
                          {a.location && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-400">
                              <MapPin className="w-3 h-3" />
                              {a.location.split(',')[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Skills Chips */}
                      {a.skills && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {a.skills.split(',').slice(0, 3).map((skill: string, idx: number) => (
                              <span key={idx} className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                                {skill.trim()}
                              </span>
                            ))}
                            {a.skills.split(',').length > 3 && (
                              <span className="text-[11px] text-slate-400 self-center">
                                +{a.skills.split(',').length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Badges row: Mentorship & Lectures */}
                      <div className="flex items-center gap-2 mb-3 text-[11px]">
                        {a.mentorship_available && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Mentor
                          </span>
                        )}
                        {a.willing_guest_lectures && (
                          <span className="inline-flex items-center gap-1 text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                            <GraduationCap className="w-3 h-3" /> Speaker
                          </span>
                        )}
                        {a.willing_to_refer && (
                          <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                            <Award className="w-3 h-3" /> Refers
                          </span>
                        )}
                      </div>

                      {/* Engagement Score Bar */}
                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Engagement Index</span>
                          <span className="font-mono text-cyan-300 font-semibold">{a.engagement_score || 70}/100</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                            style={{ width: `${a.engagement_score || 70}%` }}
                          />
                        </div>
                        {a.last_interaction_date && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Last Contacted: {a.last_interaction_date}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDetail(a)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-1.5 flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Profile</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOutreachDraft(a, 'keynote')}
                        className="border-slate-700 hover:bg-slate-800 text-cyan-400 text-xs py-1.5 px-2.5"
                        title="Draft Outreach Letter"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLogInteraction(a)}
                        className="border-slate-700 hover:bg-slate-800 text-emerald-400 text-xs py-1.5 px-2.5"
                        title="Log Interaction / Meeting"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditAlumnus(a)}
                        className="text-slate-400 hover:text-white px-2"
                        title="Edit Record"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* TABLE LIST VIEW */
            <Card className="p-0 bg-slate-900 border-slate-700/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Alumnus Name</th>
                      <th className="py-3 px-3">Batch & Dept</th>
                      <th className="py-3 px-4">Company & Designation</th>
                      <th className="py-3 px-3">Technical Skills</th>
                      <th className="py-3 px-3">Mentorship</th>
                      <th className="py-3 px-3">Score</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredAlumni.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white hover:text-cyan-400 cursor-pointer" onClick={() => handleOpenDetail(a)}>
                            {a.name}
                          </div>
                          {a.email && <div className="text-[11px] text-slate-400">{a.email}</div>}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="text-cyan-400">{a.graduation_year}</span> {a.department}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">{a.current_company}</div>
                          <div className="text-[11px] text-slate-400">{a.designation}</div>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate text-slate-300">
                          {a.skills || 'N/A'}
                        </td>
                        <td className="py-3 px-3">
                          {a.mentorship_available ? (
                            <span className="text-emerald-400 font-medium">Available</span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-cyan-300">
                          {a.engagement_score || 70}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              a.engagement_status === 'Active' ? 'success' :
                              a.engagement_status === 'Newly Registered' ? 'accent' : 'warning'
                            }
                          >
                            {a.engagement_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDetail(a)}
                            className="p-1 hover:bg-slate-700 rounded text-cyan-400"
                            title="View Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openOutreachDraft(a, 'keynote')}
                            className="p-1 hover:bg-slate-700 rounded text-emerald-400"
                            title="Draft Outreach"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditAlumnus(a)}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {filteredAlumni.length === 0 && (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-lg font-medium text-slate-300">No alumni records found</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Try loosening your filters or search keywords to discover more alumni profiles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI MATCHMAKER & SMART RECOMMENDATIONS */}
      {activeTab === 'matchmaker' && (
        <div className="space-y-6">
          {/* SMART RECOMMENDATIONS FEED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold text-white">
                  Intelligent Institutional Action Feed
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {smartRecs.length} dynamic suggestions generated
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {smartRecs.map((rec, idx) => (
                <Card key={idx} className="p-4 bg-slate-900 border-slate-700/60 hover:border-cyan-500/40 transition-all flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant={rec.type === 're_engagement' ? 'warning' : rec.type === 'mentorship_approval' ? 'accent' : 'success'} className="text-[10px]">
                      {rec.category}
                    </Badge>
                    <h4 className="text-sm font-semibold text-slate-200 mt-1">
                      {rec.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (rec.alumni_id) {
                        const target = alumniList.find(a => a.id === rec.alumni_id);
                        if (target) openOutreachDraft(target, 'keynote');
                      } else {
                        setActiveTab('events');
                      }
                    }}
                    className="shrink-0 text-xs bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20"
                  >
                    {rec.action_text}
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* INTERACTIVE MATCHING WORKBENCH */}
          <Card className="p-6 bg-slate-900 border-slate-700/60 shadow-md space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white font-ui">
                  AI Matchmaker Engine
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Match students with experienced alumni mentors, or identify the best qualified alumni guest speakers for technical workshops based on domain skills and verified engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Matching Objective</label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="student_mentor">Student Career Mentorship</option>
                  <option value="guest_speaker">Guest Lecturer / Workshop Speaker</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Department Context</label>
                <select
                  value={matchDepartment}
                  onChange={(e) => setMatchDepartment(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                >
                  <option value="CSE">Computer Science & Eng (CSE)</option>
                  <option value="CCE">Computer & Communication (CCE)</option>
                  <option value="ECE">Electronics & Comm (ECE)</option>
                  <option value="IT">Information Tech (IT)</option>
                  <option value="MECH">Mechanical Eng (MECH)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Skills / Stack</label>
                <input
                  type="text"
                  placeholder="e.g. Kubernetes, Golang, PyTorch"
                  value={matchSkillsInput}
                  onChange={(e) => setMatchSkillsInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Session / Career Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Google SDE Prep, Distributed Architecture"
                  value={matchTopicInput}
                  onChange={(e) => setMatchTopicInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={executeAIMatch}
                disabled={isMatching}
                className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 text-sm px-5 py-2.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isMatching ? 'Scoring & Ranking...' : 'Compute AI Matches'}</span>
              </Button>
            </div>

            {/* MATCH RESULTS */}
            {matchedResults.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                  <span>Top Ranked Alumni Opportunities</span>
                  <span className="text-xs text-cyan-400 font-mono">{matchedResults.length} Qualified Alumni Found</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedResults.map((match, idx) => (
                    <Card key={idx} className="p-4 bg-slate-800/80 border-slate-700 hover:border-cyan-500/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="text-base font-bold text-white flex items-center gap-2">
                              {match.name}
                              <span className="text-xs font-mono text-cyan-400 font-normal">
                                '{match.batch} ({match.department})
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 font-medium mt-0.5">
                              {match.designation} at <span className="text-cyan-300">{match.company}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xl font-bold font-mono text-emerald-400">
                              {match.score}%
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Match Score</div>
                          </div>
                        </div>

                        {/* Match Reasons */}
                        <div className="bg-slate-900/60 rounded p-2.5 mb-3 border border-slate-700/40 text-xs space-y-1">
                          <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Match Breakdown:</span>
                          {match.reasons?.map((r: string, rIdx: number) => (
                            <div key={rIdx} className="text-slate-200 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span>{r}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const target = alumniList.find(a => a.id === match.id);
                            if (target) openOutreachDraft(target, matchType === 'student_mentor' ? 'mentorship' : 'keynote');
                          }}
                          className="flex-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 flex items-center justify-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Invite to {matchType === 'student_mentor' ? 'Mentor' : 'Lecture'}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(match)}
                          className="text-xs border-slate-700 hover:bg-slate-700 text-slate-300 py-1.5"
                        >
                          View Profile
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: MENTORSHIP PROGRAMME */}
      {activeTab === 'mentorship' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Alumni-Student Mentorship Programme</h2>
              <p className="text-xs text-slate-400">Structured pairings connecting current engineering scholars with verified industry mentors.</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsMentorshipModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Plus className="w-4 h-4" />
              <span>Request Mentorship Pairing</span>
            </Button>
          </div>

          {/* MENTORSHIP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentorships.map((m) => (
              <Card key={m.id} className="p-5 bg-slate-900 border-slate-700/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <Badge
                        variant={m.status === 'Completed' ? 'success' : m.status === 'Accepted' ? 'accent' : 'warning'}
                        className="text-[10px] mb-1.5"
                      >
                        {m.status}
                      </Badge>
                      <h3 className="text-base font-semibold text-white">
                        {m.topic}
                      </h3>
                    </div>

                    {m.feedback_rating && (
                      <div className="flex items-center gap-1 text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded text-xs font-mono font-bold">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{m.feedback_rating}.0</span>
                      </div>
                    )}
                  </div>

                  {/* Mentee & Mentor Row */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700/40 text-xs mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Student Mentee</span>
                      <div className="font-semibold text-slate-200 mt-0.5">{m.student_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono">{m.student_roll_no || '22CSE045'} ({m.student_department || 'CSE'})</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Alumni Mentor</span>
                      <div className="font-semibold text-slate-200 mt-0.5">{m.alumni_name}</div>
                      <div className="text-[11px] text-slate-400">{m.alumni_company || 'Google'}</div>
                    </div>
                  </div>

                  {m.goals && (
                    <div className="text-xs text-slate-300 mb-2">
                      <span className="text-slate-400 font-medium">Session Goals:</span> {m.goals}
                    </div>
                  )}

                  {m.session_notes && (
                    <div className="text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded border border-slate-700/30 mb-3 italic">
                      "{m.session_notes}"
                    </div>
                  )}

                  {m.meeting_link && (
                    <div className="flex items-center gap-2 text-xs text-cyan-400 mb-3">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <a href={m.meeting_link} target="_blank" rel="noreferrer" className="underline truncate">
                        {m.meeting_link}
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-mono">Requested: {m.request_date}</span>

                  <div className="flex items-center gap-1.5">
                    {m.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateMentorshipStatus(m.id, 'Accepted')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateMentorshipStatus(m.id, 'Declined')}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded font-medium text-xs"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {m.status === 'Accepted' && (
                      <button
                        onClick={() => handleUpdateMentorshipStatus(m.id, 'Completed', 5)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Complete Session</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: EVENTS & GUEST LECTURES */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Alumni Events & Guest Lecture Series</h2>
              <p className="text-xs text-slate-400">Collaborative technical colloquia, homecoming reunions, and industry seminars.</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEventModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Alumni Event</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <Card key={ev.id} className="p-5 bg-slate-900 border-slate-700/60 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={ev.status === 'Upcoming' ? 'accent' : 'success'} className="text-[10px]">
                      {ev.event_type} • {ev.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      {ev.date}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">
                    {ev.title}
                  </h3>

                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40 space-y-1.5 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Featured Speaker:</span>
                      <span className="text-cyan-300 font-semibold">{ev.alumni_speaker_name || 'Alumni Panel'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Venue / Location:</span>
                      <span className="text-slate-200">{ev.venue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Target Audience:</span>
                      <span className="text-slate-300">{ev.target_audience}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Expected Attendance:</span>
                      <span className="text-emerald-400 font-mono font-medium">{ev.expected_attendees || 100} Scholars</span>
                    </div>
                  </div>

                  {ev.feedback_summary && (
                    <div className="text-xs text-slate-400 bg-cyan-950/20 border border-cyan-800/30 p-2.5 rounded">
                      <span className="font-semibold text-cyan-300">Audience Feedback: </span>
                      {ev.feedback_summary}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Coord: {ev.coordinator_name}</span>
                  {ev.alumni_speaker_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const target = alumniList.find(a => a.id === ev.alumni_speaker_id);
                        if (target) openOutreachDraft(target, 'keynote');
                      }}
                      className="text-xs border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 py-1"
                    >
                      Draft Speaker Invite
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: GIVING & PARTNERSHIPS */}
      {activeTab === 'contributions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Alumni Institutional Contributions & Giving</h2>
              <p className="text-xs text-slate-400">Auditable record of scholarships, equipment sponsorships, mentorship hours, and placement referrals.</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsContributionModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Plus className="w-4 h-4" />
              <span>Record Contribution</span>
            </Button>
          </div>

          <Card className="p-0 bg-slate-900 border-slate-700/60 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Alumnus Name</th>
                    <th className="py-3 px-3">Contribution Category</th>
                    <th className="py-3 px-4">Details & Impact</th>
                    <th className="py-3 px-3">Monetary Value</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {contributions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        {c.alumni_name}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            c.category.includes('Financial') ? 'warning' :
                            c.category.includes('Equipment') ? 'accent' : 'success'
                          }
                        >
                          {c.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="text-slate-200">{c.description}</div>
                        {c.impact_summary && (
                          <div className="text-[11px] text-cyan-400 mt-0.5 font-medium">Impact: {c.impact_summary}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-amber-400">
                        {c.amount && c.amount > 0 ? `₹${Number(c.amount).toLocaleString()}` : 'In-Kind / Service'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {c.date}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={c.status === 'Approved' || c.status === 'Completed' ? 'success' : 'warning'}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status === 'Pending Verification' ? (
                          <button
                            onClick={() => handleUpdateContributionStatus(c.id, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Verified by {c.verified_by || 'Admin'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: FOLLOW-UP CENTRE & TEMPLATES */}
      {activeTab === 'followups' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Alumni Communication & Follow-up Centre</h2>
              <p className="text-xs text-slate-400">Structured coordinator tasks, outreach reminders, and instant template composers.</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsFollowUpModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Follow-up Task</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {followUps.map((t) => (
              <Card key={t.id} className="p-4 bg-slate-900 border-slate-700/60 hover:border-cyan-500/40 transition-all flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'neutral'} className="text-[10px]">
                      {t.priority} Priority
                    </Badge>
                    <Badge variant={t.status === 'Completed' ? 'success' : t.status === 'Overdue' ? 'danger' : 'accent'} className="text-[10px]">
                      {t.status}
                    </Badge>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {t.title}
                  </h3>

                  <div className="text-xs text-slate-300">
                    Target Alumnus: <span className="font-semibold text-cyan-300">{t.alumni_name}</span>
                  </div>

                  {t.notes && (
                    <p className="text-xs text-slate-400 bg-slate-800/50 p-2 rounded border border-slate-700/30">
                      {t.notes}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Due: <strong className="text-slate-300 font-mono">{t.due_date}</strong></span>
                    <span>Assignee: {t.assigned_to}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleTaskStatus(t.id, t.status)}
                    className={`p-2 rounded border text-xs font-medium flex items-center justify-center transition-colors ${
                      t.status === 'Completed'
                        ? 'bg-emerald-950 border-emerald-800 text-emerald-400 hover:bg-emerald-900'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={t.status === 'Completed' ? 'Mark Incomplete' : 'Mark Completed'}
                  >
                    <Check className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      const target = alumniList.find(a => a.name.toLowerCase() === t.alumni_name.toLowerCase()) || { name: t.alumni_name, current_company: 'Corporate' };
                      openOutreachDraft(target, 'keynote');
                    }}
                    className="p-2 rounded border border-slate-700 bg-slate-800 text-cyan-400 hover:bg-slate-700 text-xs flex items-center justify-center"
                    title="Compose Outreach Email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: ENGAGEMENT ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 bg-slate-900 border-slate-700/60">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">Department Distribution</h3>
              <div className="space-y-2.5">
                {analytics?.department_distribution && Object.entries(analytics.department_distribution).map(([dept, count]: any) => (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium">{dept}</span>
                      <span className="text-cyan-400 font-mono font-semibold">{count} Alumni</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{ width: `${(count / (analytics.total_alumni || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-slate-900 border-slate-700/60">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">Graduation Batch Distribution</h3>
              <div className="space-y-2.5">
                {analytics?.batch_distribution && Object.entries(analytics.batch_distribution).map(([batch, count]: any) => (
                  <div key={batch} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-mono font-medium">Class of {batch}</span>
                      <span className="text-emerald-400 font-mono font-semibold">{count} Alumni</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${(count / (analytics.total_alumni || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-slate-900 border-slate-700/60">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">Industry Alignment</h3>
              <div className="space-y-2.5">
                {analytics?.industry_distribution && Object.entries(analytics.industry_distribution).map(([ind, count]: any) => (
                  <div key={ind} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white font-medium truncate max-w-[180px]">{ind}</span>
                      <span className="text-amber-400 font-mono font-semibold">{count}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${(count / (analytics.total_alumni || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ALUMNUS DETAIL MODAL / DRAWER */}
      {isDetailModalOpen && selectedAlumnus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-6">
              {selectedAlumnus.avatar_url ? (
                <img src={selectedAlumnus.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-cyan-500 shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-500 text-cyan-300 text-xl font-bold flex items-center justify-center shadow-md">
                  {selectedAlumnus.name[0]}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">{selectedAlumnus.name}</h2>
                <div className="text-sm text-cyan-300 font-medium">
                  {selectedAlumnus.designation} at <span className="text-white">{selectedAlumnus.current_company}</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  {selectedAlumnus.degree} • {selectedAlumnus.department} • Class of {selectedAlumnus.graduation_year}
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 text-xs mb-5">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Email Contact</span>
                <span className="text-slate-200 font-mono">{selectedAlumnus.email || 'Protected/Private'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Phone</span>
                <span className="text-slate-200 font-mono">{selectedAlumnus.phone || 'Available via Coordinator'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Location</span>
                <span className="text-slate-200">{selectedAlumnus.location || 'Bengaluru, India'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">LinkedIn</span>
                {selectedAlumnus.linkedin_url ? (
                  <a href={selectedAlumnus.linkedin_url} target="_blank" rel="noreferrer" className="text-cyan-400 underline truncate block">
                    {selectedAlumnus.linkedin_url}
                  </a>
                ) : (
                  <span className="text-slate-400">Verified profile</span>
                )}
              </div>
            </div>

            {/* Skills & Guidance Topics */}
            <div className="space-y-3 mb-5">
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Core Technical Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAlumnus.skills ? selectedAlumnus.skills.split(',').map((s: string, i: number) => (
                    <span key={i} className="text-xs bg-slate-800 text-cyan-300 border border-slate-700 px-2.5 py-1 rounded-md">
                      {s.trim()}
                    </span>
                  )) : <span className="text-xs text-slate-500">Not specified</span>}
                </div>
              </div>

              {selectedAlumnus.mentorship_topics && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Preferred Mentorship Areas</h4>
                  <p className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded border border-slate-700/40">
                    {selectedAlumnus.mentorship_topics}
                  </p>
                </div>
              )}
            </div>

            {/* Past Interactions Timeline */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Interaction & Engagement History</h4>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openLogInteraction(selectedAlumnus)}
                  className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/50 py-1"
                >
                  + Log Interaction
                </Button>
              </div>

              <div className="space-y-2">
                {selectedAlumnus.interactions?.length > 0 ? (
                  selectedAlumnus.interactions.map((it: any) => (
                    <div key={it.id} className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-lg text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-cyan-300">{it.type}</span>
                        <span className="font-mono text-slate-400">{it.date}</span>
                      </div>
                      <p className="text-slate-300">{it.summary}</p>
                      <div className="text-[10px] text-emerald-400 font-medium">Outcome: {it.outcome}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-3 text-center bg-slate-800/30 rounded border border-slate-800">
                    No logged interactions yet. Click "+ Log Interaction" to record a meeting or keynote.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteAlumnus(selectedAlumnus.id, selectedAlumnus.name)}
                className="border-red-900/50 text-red-400 hover:bg-red-950/30 text-xs"
              >
                Delete Record
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openOutreachDraft(selectedAlumnus, 'keynote');
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
              >
                Compose Outreach
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OUTREACH DRAFT MODAL */}
      {isOutreachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setIsOutreachModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Personalized Academic Outreach Composer</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Select an institutional template to generate tailored correspondence for <strong className="text-cyan-300">{selectedOutreachAlumnus?.name}</strong> ({selectedOutreachAlumnus?.current_company}).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { id: 'keynote', label: 'Keynote Invite' },
                { id: 'mentorship', label: 'Mentorship' },
                { id: 'reunion', label: 'Reunion Gala' },
                { id: 'endowment', label: 'Endowment' }
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setOutreachTemplateType(tmpl.id as any);
                    generateOutreachText(selectedOutreachAlumnus, tmpl.id);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                    outreachTemplateType === tmpl.id
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            <textarea
              rows={12}
              value={outreachDraftText}
              onChange={(e) => setOutreachDraftText(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono outline-none focus:border-cyan-500 leading-relaxed"
            />

            <div className="flex items-center justify-between gap-3 mt-4">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Respects communication consent & FERPA/DPDP privacy
              </span>

              <Button
                variant="primary"
                onClick={copyOutreachDraft}
                className="bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
              >
                {copiedDraft ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedDraft ? 'Copied to Clipboard!' : 'Copy Letter'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ALUMNUS MODAL */}
      {isAddAlumniModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddAlumniModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">
              {editingAlumnusId ? 'Edit Alumnus Profile' : 'Add Alumnus to Directory'}
            </h2>
            <p className="text-xs text-slate-400 mb-4">Maintain up-to-date alumni records with professional organization, skills, and mentorship status.</p>

            <form onSubmit={handleSaveAlumnus} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={alumniForm.name}
                    onChange={(e) => setAlumniForm({ ...alumniForm, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="e.g. Siddharth M"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={alumniForm.email}
                    onChange={(e) => setAlumniForm({ ...alumniForm, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="siddharth@google.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Graduation Batch *</label>
                  <input
                    type="number"
                    required
                    value={alumniForm.graduation_year}
                    onChange={(e) => setAlumniForm({ ...alumniForm, graduation_year: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Degree</label>
                  <input
                    type="text"
                    value={alumniForm.degree}
                    onChange={(e) => setAlumniForm({ ...alumniForm, degree: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="B.Tech"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Department *</label>
                  <select
                    value={alumniForm.department}
                    onChange={(e) => setAlumniForm({ ...alumniForm, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                  >
                    <option value="CSE">CSE</option>
                    <option value="CCE">CCE</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Current Company *</label>
                  <input
                    type="text"
                    required
                    value={alumniForm.current_company}
                    onChange={(e) => setAlumniForm({ ...alumniForm, current_company: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="e.g. Google, Microsoft, Zoho"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Job Designation *</label>
                  <input
                    type="text"
                    required
                    value={alumniForm.designation}
                    onChange={(e) => setAlumniForm({ ...alumniForm, designation: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="Senior SDE / Tech Lead"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={alumniForm.location}
                    onChange={(e) => setAlumniForm({ ...alumniForm, location: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="Bengaluru, Hyderabad, San Jose"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">LinkedIn Profile URL</label>
                  <input
                    type="url"
                    value={alumniForm.linkedin_url}
                    onChange={(e) => setAlumniForm({ ...alumniForm, linkedin_url: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Technical Skills & Expertise (comma separated)</label>
                <input
                  type="text"
                  value={alumniForm.skills}
                  onChange={(e) => setAlumniForm({ ...alumniForm, skills: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none focus:border-cyan-500"
                  placeholder="Go, Kubernetes, Cloud Architecture, System Design"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alumniForm.mentorship_available}
                    onChange={(e) => setAlumniForm({ ...alumniForm, mentorship_available: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>Mentorship Ready</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alumniForm.willing_guest_lectures}
                    onChange={(e) => setAlumniForm({ ...alumniForm, willing_guest_lectures: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>Guest Lectures</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alumniForm.willing_to_refer}
                    onChange={(e) => setAlumniForm({ ...alumniForm, willing_to_refer: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>Student Referrals</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddAlumniModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  {editingAlumnusId ? 'Update Alumnus' : 'Save Alumnus'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG INTERACTION MODAL */}
      {isInteractionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-xs">
            <button onClick={() => setIsInteractionModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Log Alumni Interaction</h2>
            <p className="text-slate-400 mb-4">Record meetings, keynote presentations, campus visits, or mentorship calls.</p>

            <form onSubmit={handleSaveInteraction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Interaction Type</label>
                  <select
                    value={interactionForm.interaction_type}
                    onChange={(e) => setInteractionForm({ ...interactionForm, interaction_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  >
                    <option value="Guest Lecture">Guest Lecture</option>
                    <option value="Mentorship">Mentorship Session</option>
                    <option value="Meeting">Executive Meeting</option>
                    <option value="Campus Visit">Campus Visit</option>
                    <option value="Phone Call">Phone / Video Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={interactionForm.date}
                    onChange={(e) => setInteractionForm({ ...interactionForm, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Interaction Summary & Key Discussion Points</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Summary of discussion, agreed follow-ups, student questions answered..."
                  value={interactionForm.summary}
                  onChange={(e) => setInteractionForm({ ...interactionForm, summary: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Outcome Status</label>
                <select
                  value={interactionForm.outcome}
                  onChange={(e) => setInteractionForm({ ...interactionForm, outcome: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                >
                  <option value="Completed">Completed Successfully</option>
                  <option value="Follow-up Required">Follow-up Required</option>
                  <option value="Positive">Positive Alignment</option>
                  <option value="No Response">Awaiting Confirmation</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsInteractionModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Save Interaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST MENTORSHIP MODAL */}
      {isMentorshipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-xs">
            <button onClick={() => setIsMentorshipModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Request Mentorship Pairing</h2>
            <p className="text-slate-400 mb-4">Pair an undergraduate candidate with an active alumni industry mentor.</p>

            <form onSubmit={handleSaveMentorship} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Select Alumni Mentor *</label>
                <select
                  required
                  value={mentorshipForm.alumni_id}
                  onChange={(e) => setMentorshipForm({ ...mentorshipForm, alumni_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                >
                  <option value="">-- Choose Mentor --</option>
                  {alumniList.filter(a => a.mentorship_available).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.current_company} — {a.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={mentorshipForm.student_name}
                    onChange={(e) => setMentorshipForm({ ...mentorshipForm, student_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                    placeholder="e.g. Rahul Varma"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Student Roll No</label>
                  <input
                    type="text"
                    value={mentorshipForm.student_roll_no}
                    onChange={(e) => setMentorshipForm({ ...mentorshipForm, student_roll_no: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                    placeholder="22CSE045"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Mentorship Focus Topic *</label>
                <input
                  type="text"
                  required
                  value={mentorshipForm.topic}
                  onChange={(e) => setMentorshipForm({ ...mentorshipForm, topic: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="e.g. Distributed Systems Architecture & Mock Interview"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Session Goals / Deliverables</label>
                <textarea
                  rows={3}
                  value={mentorshipForm.goals}
                  onChange={(e) => setMentorshipForm({ ...mentorshipForm, goals: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="Resume review, discussing capstone architecture, career transition advice..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsMentorshipModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Submit Pairing Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-xs">
            <button onClick={() => setIsEventModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Schedule Alumni Event / Lecture</h2>
            <p className="text-slate-400 mb-4">Coordinate guest sessions, industry panels, or department workshops.</p>

            <form onSubmit={handleSaveEvent} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="e.g. Building Scalable Microservices on GCP"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Event Type</label>
                  <select
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  >
                    <option value="Guest Lecture">Guest Lecture</option>
                    <option value="Industry Workshop">Industry Workshop</option>
                    <option value="Alumni Reunion">Alumni Reunion</option>
                    <option value="Career Talk">Career Talk</option>
                    <option value="Panel Discussion">Panel Discussion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Venue / Link</label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                    placeholder="Seminar Hall 1 / Zoom"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Alumni Speaker Name</label>
                  <input
                    type="text"
                    value={eventForm.alumni_speaker_name}
                    onChange={(e) => setEventForm({ ...eventForm, alumni_speaker_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                    placeholder="Siddharth Madhavan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Event Description & Abstract</label>
                <textarea
                  rows={3}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="Key technical topics covered, target outcomes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsEventModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Save & Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD CONTRIBUTION MODAL */}
      {isContributionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-xs">
            <button onClick={() => setIsContributionModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Record Institutional Contribution</h2>
            <p className="text-slate-400 mb-4">Track scholarships, equipment donations, guest lecture hours, and placement referrals.</p>

            <form onSubmit={handleSaveContribution} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Alumnus Name *</label>
                <input
                  type="text"
                  required
                  value={contributionForm.alumni_name}
                  onChange={(e) => setContributionForm({ ...contributionForm, alumni_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="e.g. Siddharth Madhavan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Contribution Category</label>
                  <select
                    value={contributionForm.category}
                    onChange={(e) => setContributionForm({ ...contributionForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  >
                    <option value="Financial/Scholarship">Financial / Scholarship</option>
                    <option value="Lab Equipment/Sponsorship">Lab Equipment / Workstation</option>
                    <option value="Internship/Placement Referral">Placement / Internship Referral</option>
                    <option value="Mentoring Hours">Mentoring Hours</option>
                    <option value="Guest Lecture">Guest Lecture Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Amount (₹ INR, if applicable)</label>
                  <input
                    type="number"
                    value={contributionForm.amount}
                    onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none font-mono"
                    placeholder="150000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Contribution Description</label>
                <textarea
                  rows={3}
                  required
                  value={contributionForm.description}
                  onChange={(e) => setContributionForm({ ...contributionForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="Endowed merit scholarship for economically underprivileged scholars..."
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Impact Summary</label>
                <input
                  type="text"
                  value={contributionForm.impact_summary}
                  onChange={(e) => setContributionForm({ ...contributionForm, impact_summary: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="Sponsored tuition and supplies for 3 students"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsContributionModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Record Giving
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE FOLLOW-UP TASK MODAL */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative text-xs">
            <button onClick={() => setIsFollowUpModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-white mb-1">Create Coordinator Follow-up Task</h2>
            <p className="text-slate-400 mb-4">Set action items with priority and due dates for authorized faculty.</p>

            <form onSubmit={handleSaveFollowUp} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={followUpForm.title}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="Confirm symposium slide deck with alumnus"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Target Alumnus *</label>
                  <input
                    type="text"
                    required
                    value={followUpForm.alumni_name}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, alumni_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                    placeholder="Siddharth Madhavan"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={followUpForm.due_date}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, due_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Priority</label>
                  <select
                    value={followUpForm.priority}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, priority: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Assignee</label>
                  <input
                    type="text"
                    value={followUpForm.assigned_to}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, assigned_to: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                    placeholder="Dr. Preethi R"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Coordinator Notes</label>
                <textarea
                  rows={2}
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 outline-none"
                  placeholder="Special instructions or agenda items..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="ghost" size="sm" type="button" onClick={() => setIsFollowUpModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARIA ASSISTANT EMBEDDED DRAWER */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 z-40 w-96 max-w-[90vw] bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] animate-fade-in font-sans">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-cyan-500/20 text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-white">ARIA — Alumni Assistant</h4>
                <div className="text-[10px] text-cyan-400 font-mono">Domain AI Agent 8</div>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-2 bg-slate-950/60 border-b border-slate-800 flex gap-1.5 overflow-x-auto text-[11px] whitespace-nowrap">
            {[
              "Find alumni at Google",
              "Who can speak on Cloud?",
              "Draft keynote invite",
              "Alumni giving totals"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(chip)}
                className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {chatMessages.length === 0 && (
              <div className="text-center py-8 text-slate-500 space-y-1">
                <Network className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                <p className="font-medium text-slate-400">Ask ARIA anything about Alumni</p>
                <p className="text-[11px]">Directory searches, mentor scoring, guest speaker matching, or email drafting.</p>
              </div>
            )}

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 px-1 font-mono">
                  {msg.timestamp}
                </span>
              </div>
            ))}

            {/* Traces & Streaming */}
            {streamingTraces.length > 0 && (
              <div className="p-2 rounded bg-slate-800/60 border border-cyan-800/40 text-[11px] text-cyan-300 space-y-1">
                {streamingTraces.map((tr, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                    <span>Tool Trace: <strong className="font-mono">{tr.name}</strong></span>
                  </div>
                ))}
              </div>
            )}

            {streamingText && (
              <div className="bg-slate-800 text-slate-200 border border-slate-700 rounded-xl rounded-bl-none px-3 py-2 max-w-[85%] leading-relaxed whitespace-pre-wrap">
                {streamingText}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                placeholder="Ask about alumni relations..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="p-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
