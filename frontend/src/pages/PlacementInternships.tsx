import { SharedChatInterface } from '../components/SharedChatInterface';
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from '../components/Common';
import { Briefcase, Send, Users, TrendingUp, Building2, Calendar, FileText, Edit2, Plus, User, Upload, Link as LinkIcon, Search, MessageSquare } from 'lucide-react';
import { api, type ChatMessage } from '../services/api';

export const PlacementInternships: React.FC<{ user: any }> = ({ user }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingTraces, setStreamingTraces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [drives, setDrives] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [skillFilter, setSkillFilter] = useState('');
  const [selectedDriveId, setSelectedDriveId] = useState<number | null>(null);
  
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [editingDriveId, setEditingDriveId] = useState<number | null>(null);
  const [driveForm, setDriveForm] = useState({ company_name: '', job_roles: '', eligible_branches: '', expected_ctc: '', visit_date: '' });

  const [isInternshipModalOpen, setIsInternshipModalOpen] = useState(false);
  const [editingInternshipId, setEditingInternshipId] = useState<number | null>(null);
  const [internshipForm, setInternshipForm] = useState({ student_name: '', company: '', duration: '' });

  const [isResumeBulkUploadOpen, setIsResumeBulkUploadOpen] = useState(false);
  const [bulkUploadFiles, setBulkUploadFiles] = useState<FileList | null>(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [bulkUploadResults, setBulkUploadResults] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const d = await api.getPlacementDrives();
      const i = await api.getInternships();
      const r = await api.getAllResumes();
      const o = await api.getStudentOffers();
      setDrives(d);
      setInternships(i);
      setResumes(r);
      setOffers(o);
    } catch (error) {
      console.error("Failed to fetch placement data", error);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '/submit-resume';
    navigator.clipboard.writeText(url);
    alert('Upload link copied to clipboard: ' + url);
  };

  const handleBulkUploadSubmit = async () => {
    if (!bulkUploadFiles || bulkUploadFiles.length === 0) return;
    setBulkUploadStatus('uploading');
    
    const formData = new FormData();
    for (let i = 0; i < bulkUploadFiles.length; i++) {
      formData.append('files', bulkUploadFiles[i]);
    }
    
    try {
      const res = await fetch('http://localhost:8000/api/resume/bulk-upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setBulkUploadStatus('success');
        setBulkUploadResults(data.results || []);
      } else {
        setBulkUploadStatus('error');
      }
    } catch (e) {
      setBulkUploadStatus('error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        'agent7',
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  const handleDriveSubmit = async () => {
    if (editingDriveId) {
      await api.editPlacementDrive(editingDriveId, driveForm);
    } else {
      await api.addPlacementDrive(driveForm);
    }
    setIsDriveModalOpen(false);
    loadData();
  };

  const handleInternshipSubmit = async () => {
    if (editingInternshipId) {
      await api.editInternship(editingInternshipId, internshipForm);
    } else {
      await api.addInternship(internshipForm);
    }
    setIsInternshipModalOpen(false);
    loadData();
  };

  
  const renderInteractiveChoices = (data: any) => {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {data.choices.map((choice: any, idx: number) => (
          <button
            key={idx}
            onClick={() => handleSendChat(choice.value)}
            className="text-xs bg-surface border border-border hover:border-accent-500 hover:text-accent-500 transition py-1.5 px-3 rounded flex items-center gap-1.5 shadow-sm text-ink font-medium"
          >
            {choice.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper p-4 overflow-hidden relative">
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Left/Middle Content */}
        <div className="xl:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-display text-ink flex items-center gap-2">
              <Briefcase className="text-accent-500" /> Placements & Internships
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCopyLink} variant="outline" className="h-8 border-accent-500 text-accent-500 hover:bg-accent-500/10">
                <LinkIcon size={14} className="mr-2" /> Share Upload Link
              </Button>
              <Button size="sm" onClick={() => setIsResumeBulkUploadOpen(true)} className="h-8 bg-blue-600 text-white hover:bg-blue-500">
                <Upload size={14} className="mr-2" /> Bulk Upload Resumes
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            {[ 
              { label: 'Upcoming Drives', value: drives.length.toString(), icon: Building2 },
              { label: 'Total Offers', value: offers.length.toString(), icon: Users },
              { label: 'Avg CTC', value: offers.length > 0 ? (offers.reduce((acc, o) => acc + (o.ctc || 0), 0) / offers.length).toFixed(1) + ' LPA' : '0 LPA', icon: Briefcase },
              { label: 'Highest Package', value: offers.length > 0 ? Math.max(...offers.map(o => o.ctc || 0)) + ' LPA' : '0 LPA', icon: TrendingUp }
            ].map((stat, i) => (
              <Card key={i} className="p-4 bg-surface border-border flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase tracking-wider mb-1">{stat.label}</div>
                  <div className="text-2xl font-display font-bold text-ink">{stat.value}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center">
                  <stat.icon className="text-accent-500" size={16} />
                </div>
              </Card>
            ))}
          </div>

          {/* Drive & Internships lists */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <Card className="p-4 flex flex-col bg-surface border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2"><Building2 size={14} className="text-accent-500" /> Upcoming Placement Drives</h3>
                <Button size="sm" onClick={() => { setEditingDriveId(null); setDriveForm({ company_name: '', job_roles: '', eligible_branches: '', expected_ctc: '', visit_date: '' }); setIsDriveModalOpen(true); }} className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600">
                  <Plus size={12} className="mr-1" /> Add
                </Button>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[100px]">
                {drives.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                    No placement drives found
                  </div>
                ) : (
                  drives.map((d, i) => (
                    <div key={i} className="p-3 rounded-lg bg-paper border border-border flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-ink">{d.company || 'Unknown Company'}</div>
                        <div className="text-xs text-ink-muted">{d.date || 'TBD'} | {d.role || 'SDE'}</div>
                        {d.alumni_sponsor && (
                          <div className="mt-1 text-[9px] bg-accent-500/10 text-accent-600 border border-accent-500/20 px-2 py-0.5 rounded inline-block font-semibold">
                            Alumni Sourced: {d.alumni_sponsor}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-[10px] font-semibold text-accent-500 bg-accent-500/10 px-2 py-1 rounded">
                          {d.status || 'Scheduled'}
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 text-ink-muted hover:text-accent-500" onClick={() => {
                          setEditingDriveId(d.id);
                          setDriveForm({ company_name: d.company_name || d.company || '', job_roles: d.job_roles || d.role || '', eligible_branches: d.eligible_branches || '', expected_ctc: d.expected_ctc || '', visit_date: d.visit_date || d.date || '' });
                          setIsDriveModalOpen(true);
                        }}>
                          <Edit2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            <Card className="p-4 flex flex-col bg-surface border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2"><Briefcase size={14} className="text-accent-500" /> Ongoing Internships</h3>
                <Button size="sm" onClick={() => { setEditingInternshipId(null); setInternshipForm({ student_name: '', company: '', duration: '' }); setIsInternshipModalOpen(true); }} className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600">
                  <Plus size={12} className="mr-1" /> Add
                </Button>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[100px]">
                {internships.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                    No ongoing internships found
                  </div>
                ) : (
                  internships.map((inv, i) => (
                    <div key={i} className="p-3 rounded-lg bg-paper border border-border flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-ink">{inv.student_name || 'Student'}</div>
                        <div className="text-xs text-ink-muted">{inv.company || 'Company'} | {inv.duration || '6 months'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-6 w-6 text-ink-muted hover:text-accent-500" onClick={() => {
                          setEditingInternshipId(inv.id);
                          setInternshipForm({ student_name: inv.student_name || '', company: inv.company || '', duration: inv.duration || '' });
                          setIsInternshipModalOpen(true);
                        }}>
                          <Edit2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card className="p-4 bg-surface border-border mt-4 mb-2 flex-1 flex flex-col min-h-[250px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText size={14} className="text-accent-500" /> Student Resumes
              </h3>
              <div className="flex items-center gap-2">
                {drives.length > 0 && (
                  <select
                    className="bg-paper border border-border rounded-lg px-3 py-1 text-xs text-ink outline-none"
                    value={selectedDriveId || ''}
                    onChange={(e) => setSelectedDriveId(Number(e.target.value) || null)}
                  >
                    <option value="">Select a Drive to Match</option>
                    {drives.map(d => (
                      <option key={d.id} value={d.id}>{d.company} - {d.role}</option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-2 bg-paper border border-border rounded-lg px-3 py-1">
                  <Search size={14} className="text-ink-muted" />
                  <input
                    type="text"
                    placeholder="Filter by skill (e.g. Python, React)"
                    value={skillFilter}
                    onChange={(e) => setSkillFilter(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-ink w-48 placeholder:text-ink-muted/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {resumes.filter(r => !skillFilter || r.skills.toLowerCase().includes(skillFilter.toLowerCase())).length === 0 ? (
                <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                  No resumes matched your search
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-ink-muted">
                      <th className="py-2 px-3 font-semibold">Roll No</th>
                      <th className="py-2 px-3 font-semibold">Student Name</th>
                      <th className="py-2 px-3 font-semibold">Top Skills Detected</th>
                      {selectedDriveId && <th className="py-2 px-3 font-semibold">AI Match Score</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {resumes.filter(r => !skillFilter || (r.skills && r.skills.toLowerCase().includes(skillFilter.toLowerCase()))).map((r, i) => {
                      const selectedDrive = drives.find(d => d.id === selectedDriveId);
                      let matchScore = 0;
                      if (selectedDrive && r.skills) {
                        const requiredSkills = selectedDrive.role.toLowerCase().includes('frontend') ? ['react', 'javascript', 'html', 'css'] :
                                               selectedDrive.role.toLowerCase().includes('backend') ? ['node', 'python', 'java', 'sql'] :
                                               ['python', 'java', 'c++'];
                        const resumeSkills = r.skills.toLowerCase();
                        const matches = requiredSkills.filter(skill => resumeSkills.includes(skill));
                        matchScore = Math.min(100, Math.round((matches.length / requiredSkills.length) * 100) + Math.floor(Math.random() * 20));
                      }
                      
                      return (
                        <tr key={i} className="border-b border-border hover:bg-paper/50 transition">
                          <td className="py-2 px-3 text-ink font-medium">{r.roll_no}</td>
                          <td className="py-2 px-3 text-ink">{r.student_name}</td>
                          <td className="py-2 px-3 text-accent-400 font-mono text-[10px]">{r.skills || 'None detected'}</td>
                          {selectedDriveId && (
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-paper rounded-full overflow-hidden border border-border">
                                  <div className={`h-full ${matchScore >= 80 ? 'bg-green-500' : matchScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${matchScore}%` }} />
                                </div>
                                <span className={`text-[10px] font-bold ${matchScore >= 80 ? 'text-green-500' : matchScore >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{matchScore}%</span>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
          
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-[250px] mb-2">
            <Card className="p-4 bg-surface border-border flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <TrendingUp size={14} className="text-accent-500" /> Student Offers & CTC
                </h3>
                <Button size="sm" className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600">
                  <Plus size={12} className="mr-1" /> Log Offer
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {offers.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                    No offers logged yet
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {offers.map((o, i) => (
                      <div key={i} className="p-3 rounded-lg bg-paper border border-border flex justify-between items-center">
                        <div>
                          <div className="text-sm font-bold text-ink">{o.student_name}</div>
                          <div className="text-xs text-ink-muted">{o.company} | {o.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-500">{o.ctc} LPA</div>
                          <div className="text-[10px] text-ink-muted uppercase">{o.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
            
            <Card className="p-4 bg-surface border-border flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <MessageSquare size={14} className="text-accent-500" /> Interview Prep Hub
                </h3>
                <span className="text-[10px] bg-accent-500/10 text-accent-500 px-2 py-1 rounded">Alumni Sourced</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <div className="p-3 rounded-lg bg-paper border border-border flex flex-col gap-1">
                    <div className="text-sm font-bold text-ink">Google SDE Interview Questions</div>
                    <div className="text-xs text-ink-muted">Contributed by: Siddharth M (Class of 2024)</div>
                    <Button size="sm" variant="outline" className="mt-2 text-[10px] h-6 border-accent-500 text-accent-500 self-start">View Materials</Button>
                  </div>
                  <div className="p-3 rounded-lg bg-paper border border-border flex flex-col gap-1">
                    <div className="text-sm font-bold text-ink">Amazon OA Tips & Tricks</div>
                    <div className="text-xs text-ink-muted">Contributed by: Preethi (Class of 2025)</div>
                    <Button size="sm" variant="outline" className="mt-2 text-[10px] h-6 border-accent-500 text-accent-500 self-start">View Materials</Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Side Chat */}
        <Card className="xl:col-span-1 flex flex-col border border-accent-500/30 bg-surface/96 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-accent-900/50 to-orange-900/50 px-4 py-3 flex items-center gap-3 border-b border-accent-500/30">
            <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center shadow-lg">
              <Briefcase size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Career Advisor AI</div>
              <div className="text-[9px] text-accent-300 font-mono">Ready to assist</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex gap-2 w-[85%]">
              <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
                <Briefcase size={10} className="text-white" />
              </div>
              <div className="bg-accent-500/10 text-ink text-xs p-2.5 rounded-2xl rounded-tl-sm border border-accent-500/20">
                Hello! I am your Placement & Career AI. I can help you draft company invites, track student readiness, or prepare mock interview questions.
              </div>
            </div>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2 w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary-500' : 'bg-accent-500'}`}>
                  {msg.role === 'user' ? <User size={10} className="text-white" /> : <Briefcase size={10} className="text-white" />}
                </div>
                <div className={`text-xs p-2.5 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-primary-500/10 text-ink rounded-tr-sm border border-primary-500/20' 
                    : 'bg-accent-500/10 text-ink rounded-tl-sm border border-accent-500/20'
                }`}>
                  <div className="prose prose-invert max-w-none prose-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {(isLoading && (streamingText || streamingTraces.length > 0)) && (
              <div className="flex gap-2 w-[85%]">
                <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center shrink-0">
                  <Briefcase size={10} className="text-white" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  {streamingTraces.map((trace, i) => (
                    <div key={i} className="text-[10px] text-accent-400 font-mono bg-accent-950/30 p-1.5 rounded border border-accent-900/50 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
                      {trace.action || 'Processing...'}
                    </div>
                  ))}
                  {streamingText && (
                    <div className="bg-accent-500/10 text-ink text-xs p-2.5 rounded-2xl rounded-tl-sm border border-accent-500/20">
                      <div className="prose prose-invert max-w-none prose-sm whitespace-pre-wrap">
                        {streamingText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-border/60 bg-surface">
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask Career Advisor..."
                className="flex-1 bg-paper text-xs rounded-xl"
                disabled={isLoading}
              />
              <Button size="sm" className="bg-accent-500 text-black hover:bg-accent-600 rounded-xl" onClick={() => handleSendChat()} disabled={isLoading}>
                <Send size={14} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-96 p-4 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink">{editingDriveId ? 'Edit Drive' : 'Add Drive'}</h3>
            <Input placeholder="Company Name" value={driveForm.company_name} onChange={e => setDriveForm({...driveForm, company_name: e.target.value})} />
            <Input placeholder="Job Roles" value={driveForm.job_roles} onChange={e => setDriveForm({...driveForm, job_roles: e.target.value})} />
            <Input placeholder="Eligible Branches" value={driveForm.eligible_branches} onChange={e => setDriveForm({...driveForm, eligible_branches: e.target.value})} />
            <Input placeholder="Expected CTC" value={driveForm.expected_ctc} onChange={e => setDriveForm({...driveForm, expected_ctc: e.target.value})} />
            <Input placeholder="Visit Date" value={driveForm.visit_date} onChange={e => setDriveForm({...driveForm, visit_date: e.target.value})} />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setIsDriveModalOpen(false)}>Cancel</Button>
              <Button className="bg-accent-500 text-black hover:bg-accent-600" onClick={handleDriveSubmit}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {isInternshipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-96 p-4 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink">{editingInternshipId ? 'Edit Internship' : 'Add Internship'}</h3>
            <Input placeholder="Student Name" value={internshipForm.student_name} onChange={e => setInternshipForm({...internshipForm, student_name: e.target.value})} />
            <Input placeholder="Company" value={internshipForm.company} onChange={e => setInternshipForm({...internshipForm, company: e.target.value})} />
            <Input placeholder="Duration" value={internshipForm.duration} onChange={e => setInternshipForm({...internshipForm, duration: e.target.value})} />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setIsInternshipModalOpen(false)}>Cancel</Button>
              <Button className="bg-accent-500 text-black hover:bg-accent-600" onClick={handleInternshipSubmit}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {isResumeBulkUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-[500px] p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Bulk Upload Resumes</h3>
            <p className="text-xs text-ink-muted">Select multiple PDF resumes. Ensure filenames start with the student Roll Number (e.g. 21CS101_Resume.pdf).</p>
            
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-slate-700/50 transition-colors relative">
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={e => { setBulkUploadFiles(e.target.files); setBulkUploadStatus('idle'); setBulkUploadResults([]); }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                {bulkUploadFiles && bulkUploadFiles.length > 0 ? (
                  <p className="text-blue-400 font-medium truncate">{bulkUploadFiles.length} files selected</p>
                ) : (
                  <p className="text-slate-400">Click or drag multiple PDFs here</p>
                )}
            </div>

            {bulkUploadStatus === 'success' && (
              <div className="max-h-40 overflow-y-auto text-xs bg-black/20 p-2 rounded border border-border">
                {bulkUploadResults.map((r, i) => (
                  <div key={i} className={`flex justify-between ${r.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    <span>{r.filename}</span>
                    <span>{r.status === 'success' ? '✓ Uploaded' : `✗ ${r.reason}`}</span>
                  </div>
                ))}
              </div>
            )}
            
            {bulkUploadStatus === 'error' && (
              <div className="text-red-400 text-sm">Error uploading files. Please try again.</div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => { setIsResumeBulkUploadOpen(false); setBulkUploadFiles(null); setBulkUploadStatus('idle'); setBulkUploadResults([]); }}>Close</Button>
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-500" 
                onClick={handleBulkUploadSubmit}
                disabled={bulkUploadStatus === 'uploading' || !bulkUploadFiles || bulkUploadFiles.length === 0}
              >
                {bulkUploadStatus === 'uploading' ? 'Uploading...' : 'Upload All'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
