import { SharedChatInterface } from '../components/SharedChatInterface';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Input } from '../components/Common';
import { Briefcase, Send, Users, TrendingUp, Building2, Calendar, FileText, Edit2, Trash2, Plus, User, Upload, Link as LinkIcon, Search, MessageSquare } from 'lucide-react';
import { api, type ChatMessage, type PlacementStudent, type PlacementStatus } from '../services/api';

export const PlacementInternships: React.FC<{ user: any }> = ({ user }) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingTraces, setStreamingTraces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [drives, setDrives] = useState<any[]>([]);
  const [drivesLoading, setDrivesLoading] = useState(true);
  const [drivesError, setDrivesError] = useState<string | null>(null);
  const [internships, setInternships] = useState<any[]>([]);
  const [internshipsLoading, setInternshipsLoading] = useState(true);
  const [internshipsError, setInternshipsError] = useState<string | null>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [resumesError, setResumesError] = useState<string | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState('');
  const [selectedDriveId, setSelectedDriveId] = useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [matchData, setMatchData] = useState<any | null>(null);
  const [isMatchingLoading, setIsMatchingLoading] = useState<boolean>(false);

  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [editingDriveId, setEditingDriveId] = useState<number | null>(null);
  const [driveForm, setDriveForm] = useState({ company_name: '', job_roles: '', eligible_branches: '', expected_ctc: '', visit_date: '' });
  const [driveSubmitting, setDriveSubmitting] = useState(false);
  const [driveSubmitError, setDriveSubmitError] = useState<string | null>(null);

  const [isInternshipModalOpen, setIsInternshipModalOpen] = useState(false);
  const [editingInternshipId, setEditingInternshipId] = useState<number | null>(null);
  const [internshipForm, setInternshipForm] = useState({ student_name: '', company: '', duration: '' });
  const [internshipSubmitting, setInternshipSubmitting] = useState(false);
  const [internshipSubmitError, setInternshipSubmitError] = useState<string | null>(null);

  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [offerForm, setOfferForm] = useState({ student_name: '', company: '', role: '', ctc: '', status: 'Accepted' });
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerSubmitError, setOfferSubmitError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<any[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<any | null>(null);
  const [isMaterialViewModalOpen, setIsMaterialViewModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    title: '',
    company: '',
    role: '',
    category: 'Interview Questions',
    contributor_name: '',
    content: '',
    file_url: '',
  });
  const [materialSubmitting, setMaterialSubmitting] = useState(false);
  const [materialSubmitError, setMaterialSubmitError] = useState<string | null>(null);

  const [isResumeBulkUploadOpen, setIsResumeBulkUploadOpen] = useState(false);
  const [bulkUploadFiles, setBulkUploadFiles] = useState<FileList | null>(null);
  const [bulkUploadStatus, setBulkUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [bulkUploadResults, setBulkUploadResults] = useState<any[]>([]);

  // ── Placement Status Tracking state ─────────────────────────────────
  const [placementStudents, setPlacementStudents] = useState<PlacementStudent[]>([]);
  const [placementStudentsLoading, setPlacementStudentsLoading] = useState(true);
  const [placementStudentsError, setPlacementStudentsError] = useState<string | null>(null);
  const [placementSearch, setPlacementSearch] = useState('');
  const [placementStatusFilter, setPlacementStatusFilter] = useState<PlacementStatus | ''>('');
  const [statusUpdating, setStatusUpdating] = useState<Record<number, boolean>>({});

  // ── Namelist upload / preview modal state ───────────────────────────
  const [isNamelistModalOpen, setIsNamelistModalOpen] = useState(false);
  const [namelistFile, setNamelistFile] = useState<File | null>(null);
  const [namelistParsing, setNamelistParsing] = useState(false);
  const [namelistParseResult, setNamelistParseResult] = useState<{
    headers: string[];
    suggested_mapping: Record<string, string>;
    rows: Record<string, string>[];
    is_scanned: boolean;
    error: string | null;
  } | null>(null);
  const [namelistMapping, setNamelistMapping] = useState<Record<string, string>>({
    roll_no: '', register_no: '', name: '', department: '', batch: '',
  });
  const [namelistImporting, setNamelistImporting] = useState(false);
  const [namelistImportResult, setNamelistImportResult] = useState<{ imported: number; skipped: number; duplicates: number } | null>(null);
  const [namelistReplaceExisting, setNamelistReplaceExisting] = useState(true);
  const namelistFileInputRef = useRef<HTMLInputElement>(null);

  const loadDrives = async () => {
    setDrivesLoading(true);
    setDrivesError(null);
    try {
      const d = await api.getPlacementDrives();
      setDrives(d);
    } catch (error: any) {
      console.error('Failed to fetch placement drives', error);
      setDrivesError(error?.message || 'Failed to load placement drives');
    } finally {
      setDrivesLoading(false);
    }
  };

  const loadInternships = async () => {
    setInternshipsLoading(true);
    setInternshipsError(null);
    try {
      const i = await api.getInternships();
      setInternships(i);
    } catch (error: any) {
      console.error('Failed to fetch internships', error);
      setInternshipsError(error?.message || 'Failed to load internships');
    } finally {
      setInternshipsLoading(false);
    }
  };

  const loadOffers = async () => {
    setOffersLoading(true);
    setOffersError(null);
    try {
      const o = await api.getStudentOffers();
      setOffers(o);
    } catch (error: any) {
      console.error('Failed to fetch student offers', error);
      setOffersError(error?.message || 'Failed to load student offers');
    } finally {
      setOffersLoading(false);
    }
  };

  const loadMaterials = async () => {
    setMaterialsLoading(true);
    setMaterialsError(null);
    try {
      const m = await api.getInterviewMaterials();
      setMaterials(m);
    } catch (error: any) {
      console.error('Failed to fetch interview materials', error);
      setMaterialsError(error?.message || 'Failed to load interview materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const loadResumes = async () => {
    setResumesLoading(true);
    setResumesError(null);
    try {
      const r = await api.getAllResumes();
      setResumes(r);
    } catch (error: any) {
      console.error('Failed to fetch resumes', error);
      setResumesError(error?.message || 'Failed to load student resumes');
    } finally {
      setResumesLoading(false);
    }
  };

  const loadPlacementStudents = async (search?: string, statusFilter?: string) => {
    setPlacementStudentsLoading(true);
    setPlacementStudentsError(null);
    try {
      const params: { search?: string; status_filter?: string } = {};
      if (search) params.search = search;
      if (statusFilter) params.status_filter = statusFilter;
      const students = await api.getPlacementStudents(params);
      setPlacementStudents(students);
    } catch (error: any) {
      setPlacementStudentsError(error?.message || 'Failed to load placement students');
    } finally {
      setPlacementStudentsLoading(false);
    }
  };

  const handleStatusChange = async (studentId: number, newStatus: PlacementStatus) => {
    setStatusUpdating(prev => ({ ...prev, [studentId]: true }));
    try {
      await api.updateStudentPlacementStatus(studentId, newStatus);
      setPlacementStudents(prev =>
        prev.map(s => s.id === studentId ? { ...s, placement_status: newStatus } : s)
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleNamelistFileChange = async (file: File | null) => {
    if (!file) return;
    setNamelistFile(file);
    setNamelistParseResult(null);
    setNamelistImportResult(null);
    setNamelistParsing(true);
    try {
      const result = await api.parseNamelistFile(file);
      setNamelistParseResult(result);
      // Pre-fill mapping from suggested
      const m: Record<string, string> = { roll_no: '', register_no: '', name: '', department: '', batch: '' };
      for (const field of Object.keys(m)) {
        m[field] = result.suggested_mapping[field] || '';
      }
      setNamelistMapping(m);
    } catch (err: any) {
      setNamelistParseResult({ headers: [], suggested_mapping: {}, rows: [], is_scanned: false, error: err?.message || 'Failed to parse file' });
    } finally {
      setNamelistParsing(false);
    }
  };

  const handleNamelistImport = async () => {
    if (!namelistParseResult || !namelistParseResult.rows.length) return;
    setNamelistImporting(true);
    setNamelistImportResult(null);
    try {
      const result = await api.importNamelistStudents(
        namelistParseResult.rows,
        namelistMapping,
        namelistReplaceExisting
      );
      setNamelistImportResult(result);
      await loadPlacementStudents(placementSearch, placementStatusFilter);
    } catch (err: any) {
      alert(err?.message || 'Import failed');
    } finally {
      setNamelistImporting(false);
    }
  };

  const handleDeletePlacementStudent = async (id: number, name: string) => {
    if (!window.confirm(`Remove ${name} from placement tracking?`)) return;
    try {
      await api.deletePlacementStudent(id);
      loadPlacementStudents(placementSearch, placementStatusFilter);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove student');
    }
  };

  const handleClearAllPlacementStudents = async () => {
    if (!window.confirm('Are you sure you want to clear all students from placement tracking?')) return;
    try {
      await api.clearAllPlacementStudents();
      loadPlacementStudents(placementSearch, placementStatusFilter);
    } catch (err: any) {
      alert(err?.message || 'Failed to clear students');
    }
  };

  const PLACEMENT_STATUSES: PlacementStatus[] = ['Not Started', 'Not Placed', 'Placed', 'Internship', 'In Progress'];
  const STATUS_COLORS: Record<PlacementStatus, string> = {
    'Not Started': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    'Not Placed':  'bg-red-500/15 text-red-300 border-red-500/30',
    'Placed':      'bg-green-500/15 text-green-300 border-green-500/30',
    'Internship':  'bg-blue-500/15 text-blue-300 border-blue-500/30',
    'In Progress': 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  };

  const loadData = async () => {
    loadDrives();
    loadInternships();
    loadOffers();
    loadMaterials();
    loadResumes();
    loadPlacementStudents();
  };

  const handleCopyLink = () => {
    const url = window.location.origin + '/submit-resume';
    navigator.clipboard.writeText(url);
    alert('Upload link copied to clipboard: ' + url);
  };

  const normalizeSkillClient = (skill: string) => {
    const s = skill.trim().toLowerCase();
    const aliases: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      reactjs: 'react',
      'react.js': 'react',
      nodejs: 'node.js',
      node: 'node.js',
      py: 'python',
      cpp: 'c++',
      'c plus plus': 'c++',
      golang: 'go',
      postgres: 'postgresql',
      k8s: 'kubernetes',
      ml: 'machine learning',
      dl: 'deep learning',
      dsa: 'data structures',
    };
    return aliases[s] || s;
  };

  const extractTargetSkills = (roleStr?: string) => {
    if (!roleStr) return [];
    const text = roleStr.toLowerCase();
    const known = [
      'Python', 'Java', 'C++', 'JavaScript', 'TypeScript', 'React', 'Node.js',
      'HTML', 'CSS', 'SQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes',
      'Machine Learning', 'Deep Learning', 'TensorFlow', 'Pandas', 'Linux', 'Git',
      'Data Structures', 'Algorithms', 'REST API', 'FastAPI', 'Redux', 'Next.js',
      'Selenium', 'Automated Testing', 'Jira', 'CI/CD', 'React Native', 'Flutter',
      'Spring Boot', 'Microservices', 'ETL'
    ];
    const roleMap: Record<string, string[]> = {
      frontend: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Redux'],
      backend: ['Python', 'Node.js', 'Java', 'SQL', 'Docker', 'REST API'],
      'full stack': ['React', 'Node.js', 'JavaScript', 'Python', 'SQL', 'Git'],
      'data science': ['Python', 'Machine Learning', 'SQL', 'Pandas', 'Deep Learning'],
      'data engineer': ['SQL', 'Python', 'ETL', 'Docker', 'AWS', 'Data Structures'],
      'machine learning': ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'SQL'],
      cloud: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'CI/CD'],
      devops: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Python'],
      qa: ['Selenium', 'Python', 'Java', 'Automated Testing', 'SQL'],
      test: ['Selenium', 'Python', 'Java', 'Automated Testing', 'SQL'],
      mobile: ['React Native', 'Flutter', 'JavaScript', 'Java', 'Kotlin'],
      software: ['Java', 'Python', 'C++', 'Data Structures', 'Algorithms', 'SQL', 'Git'],
      sde: ['Java', 'Python', 'C++', 'Data Structures', 'Algorithms', 'SQL', 'Git'],
    };

    const req: string[] = [];
    for (const k of known) {
      if (text.includes(normalizeSkillClient(k)) || text.includes(k.toLowerCase())) {
        if (!req.includes(k)) req.push(k);
      }
    }
    for (const [rKey, skills] of Object.entries(roleMap)) {
      if (text.includes(rKey)) {
        for (const s of skills) {
          if (!req.includes(s)) req.push(s);
        }
      }
    }
    if (req.length === 0 && text.trim()) {
      return ['Data Structures', 'Algorithms', 'Python', 'Java', 'SQL'];
    }
    return req;
  };

  const calculateClientMatch = (resumeSkills?: string, requiredSkills: string[] = []) => {
    if (!requiredSkills || requiredSkills.length === 0) {
      return { score: 0, matched: [], missing: [], status: 'no_requirements' };
    }
    if (!resumeSkills || !resumeSkills.trim()) {
      return { score: 0, matched: [], missing: requiredSkills, status: 'missing_resume_skills' };
    }
    const resumeList = resumeSkills.split(/[,;\n]+/).map(s => normalizeSkillClient(s)).filter(Boolean);
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of requiredSkills) {
      const norm = normalizeSkillClient(req);
      const found = resumeList.some(r => r === norm || r.includes(norm) || norm.includes(r));
      if (found) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }
    const score = Math.round((matched.length / requiredSkills.length) * 100);
    return { score, matched, missing, status: 'calculated' };
  };

  const handleTargetChange = async (targetKey: string) => {
    setSelectedTarget(targetKey);
    if (!targetKey) {
      setSelectedDriveId(null);
      setMatchData(null);
      return;
    }

    if (targetKey.startsWith('drive-')) {
      const id = Number(targetKey.replace('drive-', ''));
      setSelectedDriveId(id);
      setIsMatchingLoading(true);
      try {
        const data = await api.getResumeMatchTarget('drive', id);
        setMatchData(data);
      } catch (err) {
        console.error('Failed to fetch match from API, falling back to local calculation', err);
      } finally {
        setIsMatchingLoading(false);
      }
    } else if (targetKey.startsWith('internship-')) {
      const id = Number(targetKey.replace('internship-', ''));
      setSelectedDriveId(null);
      setIsMatchingLoading(true);
      try {
        const data = await api.getResumeMatchTarget('internship', id);
        setMatchData(data);
      } catch (err) {
        console.error('Failed to fetch match from API, falling back to local calculation', err);
      } finally {
        setIsMatchingLoading(false);
      }
    }
  };

  const selectedTargetInfo = useMemo(() => {
    if (!selectedTarget) return null;
    if (selectedTarget.startsWith('drive-')) {
      const id = Number(selectedTarget.replace('drive-', ''));
      const d = drives.find(x => x.id === id);
      if (!d) return null;
      const req = matchData?.target?.id === id && matchData.target.type === 'drive'
        ? matchData.target.required_skills
        : extractTargetSkills(`${d.role || d.job_roles || ''} ${d.eligible_branches || ''}`);
      return {
        type: 'drive',
        company: d.company || d.company_name,
        role: d.role || d.job_roles,
        requiredSkills: req || [],
      };
    } else if (selectedTarget.startsWith('internship-')) {
      const id = Number(selectedTarget.replace('internship-', ''));
      const inv = internships.find(x => x.id === id);
      if (!inv) return null;
      const req = matchData?.target?.id === id && matchData.target.type === 'internship'
        ? matchData.target.required_skills
        : extractTargetSkills(inv.role || '');
      return {
        type: 'internship',
        company: inv.company,
        role: inv.role || 'Internship',
        requiredSkills: req || [],
      };
    }
    return null;
  }, [selectedTarget, drives, internships, matchData]);

  const handleBulkUploadSubmit = async () => {
    if (!bulkUploadFiles || bulkUploadFiles.length === 0) return;
    setBulkUploadStatus('uploading');
    
    try {
      const data = await api.bulkUploadResumes(bulkUploadFiles);
      setBulkUploadStatus('success');
      setBulkUploadResults(data.results || []);
      loadResumes();
    } catch (e: any) {
      console.error('Bulk upload failed', e);
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
    setDriveSubmitting(true);
    setDriveSubmitError(null);
    try {
      if (editingDriveId) {
        await api.editPlacementDrive(editingDriveId, driveForm);
      } else {
        await api.addPlacementDrive(driveForm);
      }
      setIsDriveModalOpen(false);
      loadDrives();
    } catch (error: any) {
      setDriveSubmitError(error?.message || 'Failed to save placement drive');
    } finally {
      setDriveSubmitting(false);
    }
  };

  const handleInternshipSubmit = async () => {
    setInternshipSubmitting(true);
    setInternshipSubmitError(null);
    try {
      if (editingInternshipId) {
        await api.editInternship(editingInternshipId, internshipForm);
      } else {
        await api.addInternship(internshipForm);
      }
      setIsInternshipModalOpen(false);
      loadInternships();
    } catch (error: any) {
      setInternshipSubmitError(error?.message || 'Failed to save internship');
    } finally {
      setInternshipSubmitting(false);
    }
  };

  const handleOfferSubmit = async () => {
    setOfferSubmitting(true);
    setOfferSubmitError(null);
    try {
      const payload = {
        student_name: offerForm.student_name,
        company: offerForm.company,
        role: offerForm.role,
        ctc: offerForm.ctc ? parseFloat(offerForm.ctc) : 0.0,
        status: offerForm.status || 'Accepted',
      };
      if (editingOfferId) {
        await api.editStudentOffer(editingOfferId, payload);
      } else {
        await api.addStudentOffer(payload);
      }
      setIsOfferModalOpen(false);
      loadOffers();
    } catch (error: any) {
      setOfferSubmitError(error?.message || 'Failed to save student offer');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleMaterialSubmit = async () => {
    setMaterialSubmitting(true);
    setMaterialSubmitError(null);
    try {
      const payload = {
        title: materialForm.title,
        company: materialForm.company,
        role: materialForm.role,
        category: materialForm.category || 'Interview Questions',
        contributor_name: materialForm.contributor_name,
        content: materialForm.content,
        file_url: materialForm.file_url,
      };
      await api.addInterviewMaterial(payload);
      setIsMaterialModalOpen(false);
      loadMaterials();
    } catch (error: any) {
      setMaterialSubmitError(error?.message || 'Failed to save interview material');
    } finally {
      setMaterialSubmitting(false);
    }
  };

  const handleDeleteDrive = async (id: number, companyName?: string) => {
    if (!window.confirm(`Are you sure you want to remove the placement drive for ${companyName || 'this company'}?`)) {
      return;
    }
    try {
      await api.deletePlacementDrive(id);
      if (selectedTarget === `drive-${id}`) {
        setSelectedTarget('');
        setSelectedDriveId(null);
        setMatchData(null);
      }
      loadDrives();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove placement drive');
    }
  };

  const handleDeleteInternship = async (id: number, companyName?: string) => {
    if (!window.confirm(`Are you sure you want to remove the internship for ${companyName || 'this company'}?`)) {
      return;
    }
    try {
      await api.deleteInternship(id);
      if (selectedTarget === `internship-${id}`) {
        setSelectedTarget('');
        setMatchData(null);
      }
      loadInternships();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove internship');
    }
  };

  const handleDeleteOffer = async (id: number, studentName?: string) => {
    if (!window.confirm(`Are you sure you want to remove the offer for ${studentName || 'this student'}?`)) {
      return;
    }
    try {
      await api.deleteStudentOffer(id);
      loadOffers();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove student offer');
    }
  };

  const handleDeleteMaterial = async (id: number, title?: string) => {
    if (!window.confirm(`Are you sure you want to remove the material "${title || 'this item'}"?`)) {
      return;
    }
    try {
      await api.deleteInterviewMaterial(id);
      loadMaterials();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove interview material');
    }
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
                {drivesLoading ? (
                  <div className="flex-1 flex flex-col gap-2">
                    {[0, 1, 2].map(n => (
                      <div key={n} className="p-3 rounded-lg bg-paper border border-border animate-pulse">
                        <div className="h-3 bg-border rounded w-2/3 mb-2" />
                        <div className="h-2 bg-border rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : drivesError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-500/30 rounded h-full min-h-[100px]">
                    <p className="text-xs text-red-400">{drivesError}</p>
                    <button onClick={loadDrives} className="text-[10px] text-accent-500 underline underline-offset-2">Retry</button>
                  </div>
                ) : drives.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                    No placement drives found
                  </div>
                ) : (
                  drives.map((d) => (
                    <div key={d.id} className="p-3 rounded-lg bg-paper border border-border flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-ink">{d.company || 'Unknown Company'}</div>
                        <div className="text-xs text-ink-muted">{d.date || 'TBD'} | {d.role || 'SDE'}</div>
                        {d.alumni_sponsor && (
                          <div className="mt-1 text-[9px] bg-accent-500/10 text-accent-600 border border-accent-500/20 px-2 py-0.5 rounded inline-block font-semibold">
                            Alumni Sourced: {d.alumni_sponsor}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="text-[10px] font-semibold text-accent-400 bg-accent-500/10 border border-accent-500/20 px-2 py-0.5 rounded mr-1">
                          {d.status || 'Scheduled'}
                        </div>
                        <button
                          type="button"
                          title="Edit Placement Drive"
                          aria-label="Edit Placement Drive"
                          className="h-7 w-7 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 hover:text-blue-300 flex items-center justify-center transition shadow-sm cursor-pointer"
                          onClick={() => {
                            setEditingDriveId(d.id);
                            setDriveForm({
                              company_name: d.company_name || d.company || '',
                              job_roles: d.job_roles || d.role || '',
                              eligible_branches: d.eligible_branches || '',
                              expected_ctc: d.expected_ctc || '',
                              visit_date: d.visit_date || d.date || ''
                            });
                            setIsDriveModalOpen(true);
                          }}
                        >
                          <Edit2 size={13} className="text-blue-400" />
                        </button>
                        <button
                          type="button"
                          title="Remove Placement Drive"
                          aria-label="Remove Placement Drive"
                          className="h-7 w-7 rounded-md bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-400 hover:text-red-300 flex items-center justify-center transition shadow-sm cursor-pointer"
                          onClick={() => handleDeleteDrive(d.id, d.company || d.company_name)}
                        >
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            <Card className="p-4 flex flex-col bg-surface border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2"><Briefcase size={14} className="text-accent-500" /> Ongoing Internships</h3>
                <Button size="sm" onClick={() => { setEditingInternshipId(null); setInternshipForm({ student_name: '', company: '', duration: '' }); setInternshipSubmitError(null); setIsInternshipModalOpen(true); }} className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600">
                  <Plus size={12} className="mr-1" /> Add
                </Button>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[100px]">
                {internshipsLoading ? (
                  <div className="flex-1 flex flex-col gap-2">
                    {[0, 1, 2].map(n => (
                      <div key={n} className="p-3 rounded-lg bg-paper border border-border animate-pulse">
                        <div className="h-3 bg-border rounded w-2/3 mb-2" />
                        <div className="h-2 bg-border rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : internshipsError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-500/30 rounded h-full min-h-[100px]">
                    <p className="text-xs text-red-400">{internshipsError}</p>
                    <button onClick={loadInternships} className="text-[10px] text-accent-500 underline underline-offset-2">Retry</button>
                  </div>
                ) : internships.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                    No ongoing internships found
                  </div>
                ) : (
                  internships.map((inv) => (
                    <div key={inv.id} className="p-3 rounded-lg bg-paper border border-border flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-ink">{inv.student_name || 'Student'}</div>
                        <div className="text-xs text-ink-muted">{inv.company || 'Company'} | {inv.duration || '6 months'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Edit Internship"
                          aria-label="Edit Internship"
                          className="h-7 w-7 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 hover:text-blue-300 flex items-center justify-center transition shadow-sm cursor-pointer"
                          onClick={() => {
                            setEditingInternshipId(inv.id);
                            setInternshipForm({ student_name: inv.student_name || '', company: inv.company || '', duration: inv.duration || '' });
                            setInternshipSubmitError(null);
                            setIsInternshipModalOpen(true);
                          }}
                        >
                          <Edit2 size={13} className="text-blue-400" />
                        </button>
                        <button
                          type="button"
                          title="Remove Internship"
                          aria-label="Remove Internship"
                          className="h-7 w-7 rounded-md bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-400 hover:text-red-300 flex items-center justify-center transition shadow-sm cursor-pointer"
                          onClick={() => handleDeleteInternship(inv.id, inv.company)}
                        >
                          <Trash2 size={13} className="text-red-400" />
                        </button>
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
                <select
                  className="bg-paper border border-border rounded-lg px-3 py-1 text-xs text-ink outline-none"
                  value={selectedTarget}
                  onChange={(e) => handleTargetChange(e.target.value)}
                >
                  <option value="">Select Drive / Internship to Match</option>
                  {drives.length > 0 && (
                    <optgroup label="Placement Drives">
                      {drives.map(d => (
                        <option key={`drive-${d.id}`} value={`drive-${d.id}`}>{d.company} - {d.role || d.job_roles}</option>
                      ))}
                    </optgroup>
                  )}
                  {internships.length > 0 && (
                    <optgroup label="Ongoing Internships">
                      {internships.map(inv => (
                        <option key={`internship-${inv.id}`} value={`internship-${inv.id}`}>{inv.company} - {inv.role || 'Intern'}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
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

            {selectedTargetInfo && (
              <div className="mb-3 px-3 py-2 bg-paper border border-accent-500/30 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink">Target Requirements:</span>
                  <span className="text-accent-500 font-semibold">{selectedTargetInfo.company} ({selectedTargetInfo.role})</span>
                  {isMatchingLoading && <span className="text-[10px] text-ink-muted italic">Computing AI match...</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-ink-muted text-[11px] font-medium">Required Skills ({selectedTargetInfo.requiredSkills.length}):</span>
                  {selectedTargetInfo.requiredSkills.length === 0 ? (
                    <span className="text-xs text-ink-muted italic">None specified</span>
                  ) : (
                    selectedTargetInfo.requiredSkills.map((sk: string, idx: number) => (
                      <span key={idx} className="bg-accent-500/10 text-accent-500 border border-accent-500/20 px-2 py-0.5 rounded text-[10px] font-mono">
                        {sk}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {resumesLoading ? (
                <div className="flex-1 flex flex-col gap-2">
                  {[0, 1, 2].map(n => (
                    <div key={n} className="h-8 bg-paper border border-border rounded animate-pulse" />
                  ))}
                </div>
              ) : resumesError ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-500/30 rounded h-full min-h-[80px]">
                  <p className="text-xs text-red-400">{resumesError}</p>
                  <button onClick={loadResumes} className="text-[10px] text-accent-500 underline underline-offset-2">Retry</button>
                </div>
              ) : resumes.filter(r => !skillFilter || (r.skills && r.skills.toLowerCase().includes(skillFilter.toLowerCase()))).length === 0 ? (
                <div className="flex-1 text-xs text-ink-muted flex flex-col items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[120px] p-4 text-center gap-1">
                  <p className="font-medium text-ink">{skillFilter ? 'No resumes matched your search' : 'No uploaded student resumes yet'}</p>
                  {!skillFilter && <p className="text-[11px] text-ink-muted">Click <span className="text-blue-400 font-semibold">"Bulk Upload Resumes"</span> above to select and upload student PDF resumes.</p>}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-ink-muted">
                      <th className="py-2 px-3 font-semibold">Roll No</th>
                      <th className="py-2 px-3 font-semibold">Student Name</th>
                      <th className="py-2 px-3 font-semibold">Top Skills Detected</th>
                      {selectedTargetInfo && <th className="py-2 px-3 font-semibold min-w-[220px]">Real Skill Match Analysis</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {resumes.filter(r => !skillFilter || (r.skills && r.skills.toLowerCase().includes(skillFilter.toLowerCase()))).map((r, i) => {
                      let matchResult = { score: 0, matched: [] as string[], missing: [] as string[], status: 'none' };
                      if (selectedTargetInfo) {
                        const apiMatch = matchData?.matches?.find((m: any) => m.roll_no === r.roll_no || m.resume_id === r.id);
                        if (apiMatch) {
                          matchResult = {
                            score: apiMatch.match_score,
                            matched: apiMatch.matched_skills || [],
                            missing: apiMatch.missing_skills || [],
                            status: apiMatch.status,
                          };
                        } else {
                          matchResult = calculateClientMatch(r.skills, selectedTargetInfo.requiredSkills);
                        }
                      }

                      return (
                        <tr key={r.id || i} className="border-b border-border hover:bg-paper/50 transition">
                          <td className="py-2 px-3 text-ink font-medium">{r.roll_no}</td>
                          <td className="py-2 px-3 text-ink">
                            <div className="flex items-center justify-between gap-1">
                              <span>{r.student_name}</span>
                              <button
                                onClick={() => handleSendChat(`Career guidance for ${r.student_name}`)}
                                className="text-[9px] text-accent-400 hover:text-accent-300 bg-accent-950/40 border border-accent-800/40 px-1.5 py-0.5 rounded hover:bg-accent-900/50 transition shrink-0 ml-1"
                                title={`Ask Career Advisor about ${r.student_name}`}
                              >
                                Ask AI
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-accent-400 font-mono text-[10px]">
                            {r.has_resume === false ? (
                              <span className="inline-flex items-center gap-1 text-ink-muted italic">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 inline-block" />
                                Resume not uploaded
                              </span>
                            ) : (
                              r.skills || 'None detected'
                            )}
                          </td>
                          {selectedTargetInfo && (
                            <td className="py-2 px-3">
                              {selectedTargetInfo.requiredSkills.length === 0 ? (
                                <span className="text-[10px] text-ink-muted italic">No requirements specified</span>
                              ) : r.has_resume === false ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-bold text-red-400">0% Match</span>
                                  <span className="text-[9px] text-ink-muted italic">Resume not uploaded — no skills to match</span>
                                </div>
                              ) : !r.skills ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-bold text-red-400">0% Match</span>
                                  <span className="text-[9px] text-ink-muted italic">No resume skills detected</span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5 py-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-1.5 bg-paper rounded-full overflow-hidden border border-border">
                                      <div
                                        className={`h-full ${matchResult.score >= 80 ? 'bg-green-500' : matchResult.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${matchResult.score}%` }}
                                      />
                                    </div>
                                    <span className={`text-[11px] font-bold ${matchResult.score >= 80 ? 'text-green-500' : matchResult.score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                      {matchResult.score}%
                                    </span>
                                    <span className="text-[9px] text-ink-muted">
                                      ({matchResult.matched.length}/{selectedTargetInfo.requiredSkills.length} matched)
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1 text-[9px]">
                                    {matchResult.matched.map((sk: string, sIdx: number) => (
                                      <span key={sIdx} className="bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded font-mono">
                                        ✓ {sk}
                                      </span>
                                    ))}
                                    {matchResult.missing.map((sk: string, sIdx: number) => (
                                      <span key={sIdx} className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono">
                                        ✗ {sk}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
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
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingOfferId(null);
                    setOfferForm({ student_name: '', company: '', role: '', ctc: '', status: 'Accepted' });
                    setOfferSubmitError(null);
                    setIsOfferModalOpen(true);
                  }}
                  className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600"
                >
                  <Plus size={12} className="mr-1" /> Log Offer
                </Button>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[100px]">
                {offersLoading ? (
                  <div className="flex-1 flex flex-col gap-2">
                    {[0, 1, 2].map(n => (
                      <div key={n} className="p-3 rounded-lg bg-paper border border-border animate-pulse">
                        <div className="h-3 bg-border rounded w-2/3 mb-2" />
                        <div className="h-2 bg-border rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : offersError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-500/30 rounded h-full min-h-[100px]">
                    <p className="text-xs text-red-400">{offersError}</p>
                    <button onClick={loadOffers} className="text-[10px] text-accent-500 underline underline-offset-2">Retry</button>
                  </div>
                ) : offers.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                    No offers logged yet
                  </div>
                ) : (
                  offers.map((o) => (
                    <div key={o.id} className="p-3 rounded-lg bg-paper border border-border flex justify-between items-center">
                      <div>
                        <div className="text-sm font-bold text-ink">{o.student_name || 'Student'}</div>
                        <div className="text-xs text-ink-muted">{o.company || 'Company'} | {o.role || 'Role'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-500">{o.ctc} LPA</div>
                          <div className="text-[10px] text-ink-muted uppercase">{o.status || 'Accepted'}</div>
                        </div>
                        <button
                          type="button"
                          title="Edit Student Offer"
                          aria-label="Edit Student Offer"
                          className="h-7 w-7 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 hover:text-blue-300 flex items-center justify-center transition shadow-sm cursor-pointer"
                          onClick={() => {
                            setEditingOfferId(o.id);
                            setOfferForm({
                              student_name: o.student_name || '',
                              company: o.company || '',
                              role: o.role || '',
                              ctc: o.ctc !== undefined && o.ctc !== null ? o.ctc.toString() : '',
                              status: o.status || 'Accepted',
                            });
                            setOfferSubmitError(null);
                            setIsOfferModalOpen(true);
                          }}
                        >
                          <Edit2 size={13} className="text-blue-400" />
                        </button>
                        <button
                          type="button"
                          title="Remove Student Offer"
                          aria-label="Remove Student Offer"
                          className="h-7 w-7 rounded-md bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-400 hover:text-red-300 flex items-center justify-center transition shadow-sm cursor-pointer"
                          onClick={() => handleDeleteOffer(o.id, o.student_name)}
                        >
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            
            <Card className="p-4 bg-surface border-border flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <MessageSquare size={14} className="text-accent-500" /> Interview Prep Hub
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-accent-500/10 text-accent-500 px-2 py-1 rounded">Alumni Sourced</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setMaterialForm({
                        title: '',
                        company: '',
                        role: '',
                        category: 'Interview Questions',
                        contributor_name: '',
                        content: '',
                        file_url: '',
                      });
                      setMaterialSubmitError(null);
                      setIsMaterialModalOpen(true);
                    }}
                    className="h-7 text-xs bg-accent-500 text-black hover:bg-accent-600"
                  >
                    <Plus size={12} className="mr-1" /> Add Material
                  </Button>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-[100px]">
                {materialsLoading ? (
                  <div className="flex-1 flex flex-col gap-2">
                    {[0, 1].map(n => (
                      <div key={n} className="p-3 rounded-lg bg-paper border border-border animate-pulse">
                        <div className="h-3 bg-border rounded w-2/3 mb-2" />
                        <div className="h-2 bg-border rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : materialsError ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-500/30 rounded h-full min-h-[100px]">
                    <p className="text-xs text-red-400">{materialsError}</p>
                    <button onClick={loadMaterials} className="text-[10px] text-accent-500 underline underline-offset-2">Retry</button>
                  </div>
                ) : materials.length === 0 ? (
                  <div className="flex-1 text-xs text-ink-muted flex items-center justify-center border-2 border-dashed border-border rounded h-full min-h-[100px]">
                    No interview materials found
                  </div>
                ) : (
                  materials.map((m) => (
                    <div key={m.id} className="p-3 rounded-lg bg-paper border border-border flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-ink">{m.title}</div>
                        <span className="text-[10px] font-semibold text-accent-500 bg-accent-500/10 px-2 py-0.5 rounded">
                          {m.category || 'Interview Prep'}
                        </span>
                      </div>
                      <div className="text-xs text-ink-muted">
                        {m.company}{m.role ? ` - ${m.role}` : ''} | Contributed by: {m.contributor_name || 'Alumni'}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-6 border-accent-500 text-accent-500 hover:bg-accent-500/10"
                          onClick={() => {
                            setSelectedMaterial(m);
                            setIsMaterialViewModalOpen(true);
                          }}
                        >
                          View Materials
                        </Button>
                        <button
                          type="button"
                          title="Remove Material"
                          aria-label="Remove Material"
                          className="h-7 w-7 rounded-md bg-red-500/15 hover:bg-red-500/30 border border-red-500/40 text-red-400 hover:text-red-300 flex items-center justify-center transition shadow-sm cursor-pointer"
                          onClick={() => handleDeleteMaterial(m.id, m.title)}
                        >
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* ── Student Placement & Internship Status Tracking ── */}
          <Card className="p-4 bg-surface border-border flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Users size={14} className="text-accent-500" /> Student Placement &amp; Internship Status
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status filter tabs */}
                <div className="flex gap-1 flex-wrap">
                  {(['', ...PLACEMENT_STATUSES] as (PlacementStatus | '')[]).map(st => (
                    <button
                      key={st || 'all'}
                      onClick={() => {
                        setPlacementStatusFilter(st);
                        loadPlacementStudents(placementSearch, st);
                      }}
                      className={`text-[9px] px-2 py-0.5 rounded border font-medium transition ${
                        placementStatusFilter === st
                          ? 'bg-accent-500 text-black border-accent-500'
                          : 'bg-paper text-ink-muted border-border hover:border-accent-500/50'
                      }`}
                    >
                      {st || 'All'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setIsNamelistModalOpen(true); setNamelistParseResult(null); setNamelistFile(null); setNamelistImportResult(null); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-600/20 border border-green-500/40 text-green-300 hover:bg-green-600/30 transition font-medium"
                >
                  <Upload size={11} /> Upload Namelist
                </button>
                {placementStudents.length > 0 && (
                  <button
                    onClick={handleClearAllPlacementStudents}
                    title="Clear all students from placement tracking"
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition font-medium"
                  >
                    <Trash2 size={11} /> Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, roll no, dept…"
                value={placementSearch}
                onChange={e => {
                  setPlacementSearch(e.target.value);
                  loadPlacementStudents(e.target.value, placementStatusFilter);
                }}
                className="w-full pl-7 pr-3 py-1.5 text-xs bg-paper border border-border rounded-lg text-ink placeholder:text-ink-muted/60 outline-none focus:border-accent-500/50"
              />
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-64">
              {placementStudentsLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map(n => (
                    <div key={n} className="h-8 bg-paper border border-border rounded animate-pulse" />
                  ))}
                </div>
              ) : placementStudentsError ? (
                <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-red-500/30 rounded p-4">
                  <p className="text-xs text-red-400">{placementStudentsError}</p>
                  <button onClick={() => loadPlacementStudents()} className="text-[10px] text-accent-500 underline">Retry</button>
                </div>
              ) : placementStudents.length === 0 ? (
                <div className="text-xs text-ink-muted flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded p-8">
                  <Users size={24} className="text-ink-muted/40" />
                  <p className="font-medium text-ink">No placement students yet</p>
                  <p className="text-[11px] text-ink-muted text-center max-w-sm">
                    Upload your class namelist (Excel, CSV, or PDF). Only the students in your uploaded file will be displayed here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-1.5 px-2 text-ink-muted font-medium">Name</th>
                      <th className="text-left py-1.5 px-2 text-ink-muted font-medium">Roll No</th>
                      <th className="text-left py-1.5 px-2 text-ink-muted font-medium">Dept</th>
                      <th className="text-left py-1.5 px-2 text-ink-muted font-medium">Batch</th>
                      <th className="text-left py-1.5 px-2 text-ink-muted font-medium">Status</th>
                      <th className="text-right py-1.5 px-2 text-ink-muted font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placementStudents.map(s => (
                      <tr key={s.id} className="border-b border-border/30 hover:bg-paper/50 transition">
                        <td className="py-1.5 px-2 text-ink font-medium">{s.name}</td>
                        <td className="py-1.5 px-2 text-ink-muted font-mono">{s.roll_no}</td>
                        <td className="py-1.5 px-2 text-ink-muted">{s.department}</td>
                        <td className="py-1.5 px-2 text-ink-muted">{s.batch}</td>
                        <td className="py-1.5 px-2">
                          {statusUpdating[s.id] ? (
                            <span className="text-[10px] text-accent-400 animate-pulse">Saving…</span>
                          ) : (
                            <select
                              value={s.placement_status}
                              onChange={e => handleStatusChange(s.id, e.target.value as PlacementStatus)}
                              className={`text-[10px] px-2 py-0.5 rounded border font-medium outline-none cursor-pointer transition ${
                                STATUS_COLORS[s.placement_status] || 'bg-paper text-ink border-border'
                              }`}
                            >
                              {PLACEMENT_STATUSES.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeletePlacementStudent(s.id, s.name)}
                            title={`Remove ${s.name} from placement tracking`}
                            className="p-1 rounded text-ink-muted hover:text-red-400 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
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
                Hello! I am your <strong>Career Advisor AI</strong>. I generate personalized guidance using actual student resume skills, missing skills, active placement drives, internships, and interview prep materials from the database. Click a prompt below or ask about any student!
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
          <div className="px-3 pt-2 pb-1 border-t border-border/40 bg-surface/50 flex flex-wrap gap-1">
            <span className="text-[9px] text-ink-muted self-center mr-1 font-mono">Suggested:</span>
            {['Advice for A. Kumar', 'Advice for B. Priya', 'PersistCorp Prep', 'Batch Skill Gaps'].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendChat(prompt)}
                disabled={isLoading}
                className="text-[9px] bg-accent-500/10 text-accent-400 hover:bg-accent-500/20 border border-accent-500/20 rounded px-1.5 py-0.5 transition"
              >
                {prompt}
              </button>
            ))}
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
            <Input placeholder="Company Name *" value={driveForm.company_name} onChange={e => setDriveForm({...driveForm, company_name: e.target.value})} disabled={driveSubmitting} />
            <Input placeholder="Job Roles *" value={driveForm.job_roles} onChange={e => setDriveForm({...driveForm, job_roles: e.target.value})} disabled={driveSubmitting} />
            <Input placeholder="Eligible Branches" value={driveForm.eligible_branches} onChange={e => setDriveForm({...driveForm, eligible_branches: e.target.value})} disabled={driveSubmitting} />
            <Input placeholder="Expected CTC" value={driveForm.expected_ctc} onChange={e => setDriveForm({...driveForm, expected_ctc: e.target.value})} disabled={driveSubmitting} />
            <Input placeholder="Visit Date (YYYY-MM-DD)" value={driveForm.visit_date} onChange={e => setDriveForm({...driveForm, visit_date: e.target.value})} disabled={driveSubmitting} />
            {driveSubmitError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{driveSubmitError}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => { setIsDriveModalOpen(false); setDriveSubmitError(null); }} disabled={driveSubmitting}>Cancel</Button>
              <Button
                className="bg-accent-500 text-black hover:bg-accent-600 min-w-[64px]"
                onClick={handleDriveSubmit}
                disabled={driveSubmitting || !driveForm.company_name.trim() || !driveForm.job_roles.trim()}
              >
                {driveSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </span>
                ) : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isInternshipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-96 p-4 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink">{editingInternshipId ? 'Edit Internship' : 'Add Internship'}</h3>
            <Input placeholder="Student Name" value={internshipForm.student_name} onChange={e => setInternshipForm({...internshipForm, student_name: e.target.value})} disabled={internshipSubmitting} />
            <Input placeholder="Company *" value={internshipForm.company} onChange={e => setInternshipForm({...internshipForm, company: e.target.value})} disabled={internshipSubmitting} />
            <Input placeholder="Duration" value={internshipForm.duration} onChange={e => setInternshipForm({...internshipForm, duration: e.target.value})} disabled={internshipSubmitting} />
            {internshipSubmitError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{internshipSubmitError}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => { setIsInternshipModalOpen(false); setInternshipSubmitError(null); }} disabled={internshipSubmitting}>Cancel</Button>
              <Button
                className="bg-accent-500 text-black hover:bg-accent-600 min-w-[64px]"
                onClick={handleInternshipSubmit}
                disabled={internshipSubmitting || !internshipForm.company.trim()}
              >
                {internshipSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </span>
                ) : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-96 p-4 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink">{editingOfferId ? 'Edit Student Offer' : 'Log Student Offer'}</h3>
            <Input placeholder="Student Name" value={offerForm.student_name} onChange={e => setOfferForm({...offerForm, student_name: e.target.value})} disabled={offerSubmitting} />
            <Input placeholder="Company *" value={offerForm.company} onChange={e => setOfferForm({...offerForm, company: e.target.value})} disabled={offerSubmitting} />
            <Input placeholder="Role *" value={offerForm.role} onChange={e => setOfferForm({...offerForm, role: e.target.value})} disabled={offerSubmitting} />
            <Input placeholder="CTC (LPA, e.g. 14.5) *" type="number" step="0.1" value={offerForm.ctc} onChange={e => setOfferForm({...offerForm, ctc: e.target.value})} disabled={offerSubmitting} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-muted font-medium">Status</label>
              <select
                className="bg-paper border border-border rounded-lg px-3 py-2 text-xs text-ink outline-none"
                value={offerForm.status}
                onChange={e => setOfferForm({...offerForm, status: e.target.value})}
                disabled={offerSubmitting}
              >
                <option value="Accepted">Accepted</option>
                <option value="Offered">Offered</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
            {offerSubmitError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{offerSubmitError}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => { setIsOfferModalOpen(false); setOfferSubmitError(null); }} disabled={offerSubmitting}>Cancel</Button>
              <Button
                className="bg-accent-500 text-black hover:bg-accent-600 min-w-[64px]"
                onClick={handleOfferSubmit}
                disabled={offerSubmitting || !offerForm.company.trim() || !offerForm.role.trim()}
              >
                {offerSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </span>
                ) : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isMaterialViewModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-[450px] p-5 flex flex-col gap-3 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-accent-500 bg-accent-500/10 px-2 py-0.5 rounded uppercase">
                {selectedMaterial.category || 'Interview Prep'}
              </span>
              <span className="text-xs text-ink-muted">{selectedMaterial.company}{selectedMaterial.role ? ` (${selectedMaterial.role})` : ''}</span>
            </div>
            <h3 className="text-lg font-bold text-ink">{selectedMaterial.title}</h3>
            {selectedMaterial.contributor_name && (
              <p className="text-xs text-ink-muted">Contributed by: <span className="font-semibold text-ink">{selectedMaterial.contributor_name}</span></p>
            )}
            <div className="mt-2 p-3 bg-paper border border-border rounded-lg text-xs text-ink whitespace-pre-wrap leading-relaxed">
              {selectedMaterial.content || 'No detailed content provided for this material.'}
            </div>
            {selectedMaterial.file_url && (
              <a
                href={selectedMaterial.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
              >
                <LinkIcon size={12} /> View Attached Resource
              </a>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={() => { setIsMaterialViewModalOpen(false); setSelectedMaterial(null); }}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-[450px] p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Add Interview Material</h3>
            <Input placeholder="Title *" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} disabled={materialSubmitting} />
            <Input placeholder="Company *" value={materialForm.company} onChange={e => setMaterialForm({...materialForm, company: e.target.value})} disabled={materialSubmitting} />
            <Input placeholder="Role (e.g. SDE 1)" value={materialForm.role} onChange={e => setMaterialForm({...materialForm, role: e.target.value})} disabled={materialSubmitting} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-muted font-medium">Category</label>
              <select
                className="bg-paper border border-border rounded-lg px-3 py-2 text-xs text-ink outline-none"
                value={materialForm.category}
                onChange={e => setMaterialForm({...materialForm, category: e.target.value})}
                disabled={materialSubmitting}
              >
                <option value="Interview Questions">Interview Questions</option>
                <option value="OA Tips">OA Tips</option>
                <option value="Preparation Guide">Preparation Guide</option>
                <option value="System Design">System Design</option>
              </select>
            </div>
            <Input placeholder="Contributor Name (e.g. Preethi - Class of 2025)" value={materialForm.contributor_name} onChange={e => setMaterialForm({...materialForm, contributor_name: e.target.value})} disabled={materialSubmitting} />
            <textarea
              className="bg-paper border border-border rounded-lg p-3 text-xs text-ink outline-none min-h-[90px] resize-y placeholder:text-ink-muted/50"
              placeholder="Questions, tips, or preparation notes..."
              value={materialForm.content}
              onChange={e => setMaterialForm({...materialForm, content: e.target.value})}
              disabled={materialSubmitting}
            />
            <Input placeholder="Resource / File URL (optional)" value={materialForm.file_url} onChange={e => setMaterialForm({...materialForm, file_url: e.target.value})} disabled={materialSubmitting} />
            {materialSubmitError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{materialSubmitError}</p>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => { setIsMaterialModalOpen(false); setMaterialSubmitError(null); }} disabled={materialSubmitting}>Cancel</Button>
              <Button
                className="bg-accent-500 text-black hover:bg-accent-600 min-w-[64px]"
                onClick={handleMaterialSubmit}
                disabled={materialSubmitting || !materialForm.title.trim() || !materialForm.company.trim()}
              >
                {materialSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Saving…
                  </span>
                ) : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isResumeBulkUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-border rounded-xl w-[500px] p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-bold text-ink">Bulk Upload Resumes</h3>
            <p className="text-xs text-ink-muted">
              Select multiple PDF resumes. Ensure filenames start with an enrolled student Roll Number (e.g. <span className="font-mono text-accent-400">24CC001_Resume.pdf</span>).
            </p>
            
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
                  <p className="text-blue-400 font-medium truncate">{bulkUploadFiles.length} file(s) selected</p>
                ) : (
                  <p className="text-slate-400">Click or drag multiple PDFs here</p>
                )}
            </div>

            {bulkUploadStatus === 'success' && (
              <div className="max-h-48 overflow-y-auto text-xs bg-black/20 p-2.5 rounded-lg border border-border flex flex-col gap-1.5">
                {bulkUploadResults.map((r, i) => {
                  const errorMsg = r.reason || r.detail || r.error || 'Student roll number not found';
                  return (
                    <div key={i} className={`flex justify-between items-center gap-2 ${r.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      <span className="font-mono truncate">{r.filename}</span>
                      <span className="shrink-0 font-medium">{r.status === 'success' ? `✓ Uploaded (${r.student || 'Saved'})` : `✗ ${errorMsg}`}</span>
                    </div>
                  );
                })}
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

      {/* ── Namelist Upload / Preview / Import Modal ── */}
      {isNamelistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-[640px] max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Upload size={16} className="text-green-400" /> Upload Class Namelist
              </h3>
              <button
                onClick={() => setIsNamelistModalOpen(false)}
                className="text-ink-muted hover:text-ink text-lg leading-none font-bold"
              >✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {/* File drop zone */}
              <div
                className="border-2 border-dashed border-border hover:border-green-500/50 rounded-xl p-6 text-center transition relative cursor-pointer"
                onClick={() => namelistFileInputRef.current?.click()}
              >
                <input
                  ref={namelistFileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => handleNamelistFileChange(e.target.files?.[0] || null)}
                />
                <Upload size={24} className="text-ink-muted mx-auto mb-2" />
                {namelistFile ? (
                  <p className="text-sm text-green-400 font-medium">{namelistFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-ink-muted">Click to select a PDF, Excel (.xlsx), or CSV file</p>
                    <p className="text-[10px] text-ink-muted/60 mt-1">Max 20 MB</p>
                  </>
                )}
              </div>

              {/* Replace option */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink select-none p-2.5 rounded-lg bg-paper border border-border hover:border-green-500/40 transition">
                <input
                  type="checkbox"
                  checked={namelistReplaceExisting}
                  onChange={e => setNamelistReplaceExisting(e.target.checked)}
                  className="rounded border-border text-green-600 focus:ring-green-500 cursor-pointer"
                />
                <span className="font-medium text-ink">Replace existing list (display only students from this upload)</span>
              </label>

              {namelistParsing && (
                <div className="flex items-center gap-2 text-sm text-accent-400">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Parsing file…
                </div>
              )}

              {namelistParseResult && (
                <>
                  {namelistParseResult.error ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                      {namelistParseResult.error}
                    </div>
                  ) : (
                    <>
                      {/* Column Mapping */}
                      <div className="bg-paper border border-border rounded-lg p-4">
                        <h4 className="text-xs font-semibold text-ink mb-3">Column Mapping</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {(['roll_no', 'name', 'register_no', 'department', 'batch'] as const).map(field => (
                            <div key={field} className="flex flex-col gap-1">
                              <label className="text-[10px] text-ink-muted capitalize">{field.replace('_', ' ')}</label>
                              <select
                                value={namelistMapping[field] || ''}
                                onChange={e => setNamelistMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                className="bg-surface border border-border rounded px-2 py-1 text-xs text-ink outline-none"
                              >
                                <option value="">(skip)</option>
                                {namelistParseResult.headers.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Preview table */}
                      <div>
                        <p className="text-[10px] text-ink-muted mb-2">
                          Preview — {namelistParseResult.rows.length} row(s) detected
                        </p>
                        <div className="overflow-auto max-h-48 rounded-lg border border-border">
                          <table className="w-full text-[10px]">
                            <thead className="bg-paper sticky top-0">
                              <tr>
                                {namelistParseResult.headers.map(h => (
                                  <th key={h} className="text-left py-1.5 px-2 text-ink-muted font-medium whitespace-nowrap border-b border-border">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {namelistParseResult.rows.slice(0, 20).map((row, i) => (
                                <tr key={i} className="border-b border-border/30">
                                  {namelistParseResult!.headers.map(h => (
                                    <td key={h} className="py-1.5 px-2 text-ink-muted whitespace-nowrap">{row[h] || ''}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {namelistParseResult.rows.length > 20 && (
                          <p className="text-[9px] text-ink-muted mt-1">Showing first 20 rows of {namelistParseResult.rows.length}</p>
                        )}
                      </div>

                      {namelistImportResult && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-xs text-green-300">
                          ✓ Import complete — {namelistImportResult.imported} imported, {namelistImportResult.duplicates} updated, {namelistImportResult.skipped} skipped
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
              <Button variant="ghost" onClick={() => setIsNamelistModalOpen(false)}>Cancel</Button>
              {namelistParseResult && !namelistParseResult.error && !namelistImportResult && (
                <Button
                  className="bg-green-600 hover:bg-green-500 text-white min-w-[100px]"
                  onClick={handleNamelistImport}
                  disabled={namelistImporting || !namelistParseResult.rows.length}
                >
                  {namelistImporting ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Importing…
                    </span>
                  ) : 'Confirm Import'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
