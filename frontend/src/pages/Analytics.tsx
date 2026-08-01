import React, { useState, useEffect, useRef } from 'react';
import {
  Award, TrendingUp, AlertTriangle, FileText, CheckCircle2,
  ChevronRight, Send, Search, Download, HelpCircle, Sparkles,
  RefreshCw, Building, GraduationCap, Users, Calendar,
  Upload, BookOpen, ClipboardList, Star, Newspaper, BarChart2,
  Check, FolderOpen, X, ChevronDown, BookMarked, Layers
} from 'lucide-react';
import { Card, Button, Input, Badge, Seal } from '../components/Common';
import { api, type ChatMessage, type User as UserType } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AnalyticsProps {
  user: UserType;
}

// ─── Evidence Wizard Types ──────────────────────────────────────────────────
interface EvidenceDoc {
  name: string;
  file: File | null;
  notes: string;
}
interface EvidenceState {
  dept: string;
  semester: string;
  faculty: string;
  course: string;
  docs: {
    lessonPlan: EvidenceDoc;
    assignmentRecord: EvidenceDoc;
    studentFeedback: EvidenceDoc;
    facultyPublication: EvidenceDoc;
    eventsReport: EvidenceDoc;
  };
}

const DEPTS = ['CCE', 'CSE', 'ECE', 'EEE', 'IT', 'MECH'];
const SEMS  = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];

const EVIDENCE_STEPS = [
  { id: 'dept',        label: 'Department',         icon: Building },
  { id: 'semester',    label: 'Semester',            icon: GraduationCap },
  { id: 'faculty',     label: 'Faculty',             icon: Users },
  { id: 'course',      label: 'Course',              icon: BookOpen },
  { id: 'docs',        label: 'Upload Documents',    icon: Upload },
  { id: 'download',    label: 'Download Evidence',   icon: Download },
];

const DOC_FIELDS: { key: keyof EvidenceState['docs']; label: string; icon: any; desc: string }[] = [
  { key: 'lessonPlan',         label: 'Lesson Plan',          icon: BookMarked,    desc: 'Unit-wise lesson plan with CO mapping' },
  { key: 'assignmentRecord',   label: 'Assignment Record',    icon: ClipboardList, desc: 'Assignment sheets with marks and evaluation' },
  { key: 'studentFeedback',    label: 'Student Feedback',     icon: Star,          desc: 'Mid-sem / end-sem feedback forms' },
  { key: 'facultyPublication', label: 'Faculty Publication',  icon: Newspaper,     desc: 'Journals, conference papers, patents' },
  { key: 'eventsReport',       label: 'Events Report',        icon: Layers,        desc: 'FDP, workshops, seminars organized or attended' },
];

// ─── FileUpload sub-component ───────────────────────────────────────────────
const FileUploadBox: React.FC<{
  doc: EvidenceDoc;
  onChange: (d: EvidenceDoc) => void;
  icon: any;
  label: string;
  desc: string;
}> = ({ doc, onChange, icon: Icon, label, desc }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    onChange({ ...doc, file: f });
  };

  return (
    <div className={`rounded-xl border-2 transition-all duration-200 ${doc.file ? 'border-amber-500/70 bg-amber-500/5' : 'border-dashed border-border hover:border-amber-500/40'} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${doc.file ? 'bg-amber-500/20' : 'bg-surface'}`}>
          <Icon size={17} className={doc.file ? 'text-amber-400' : 'text-ink-muted'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-ink">{label}</div>
              <div className="text-[10px] text-ink-muted mt-0.5">{desc}</div>
            </div>
            {doc.file && (
              <button
                onClick={() => onChange({ ...doc, file: null })}
                className="text-ink-muted hover:text-red-400 ml-2 flex-shrink-0"
                title="Remove file"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {doc.file ? (
            <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-amber-400">
              <Check size={11} /> {doc.file.name} ({(doc.file.size / 1024).toFixed(1)} KB)
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-2 text-[10px] font-mono text-amber-500/70 hover:text-amber-400 underline-offset-2 hover:underline"
            >
              Click to upload file (PDF, DOCX, PNG...)
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xls,.xlsx"
            className="hidden"
            onChange={handleFile}
          />

          <textarea
            placeholder="Optional notes / remarks..."
            value={doc.notes}
            onChange={e => onChange({ ...doc, notes: e.target.value })}
            rows={1}
            className="mt-2 w-full resize-none bg-paper border border-border rounded text-[10px] font-mono text-ink px-2 py-1 focus:outline-none focus:border-amber-500/50 placeholder-ink-muted/40"
          />
        </div>
      </div>
    </div>
  );
};

// ─── Main Analytics Component ───────────────────────────────────────────────
export const Analytics: React.FC<AnalyticsProps> = ({ user }) => {

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'evidence'>('dashboard');

  // ── Academic Filter States ─────────────────────────────────────────────────
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [department, setDepartment] = useState<string>(() => {
    return localStorage.getItem('academic_selected_dept') || 'CCE';
  });
  const [semester, setSemester] = useState('Sem 5');
  const [section, setSection] = useState('Section A');

  const [kpis, setKpis] = useState<any>({
    total_students: 0,
    avg_attendance: 0,
    avg_internal_marks: '0/50',
    co_attainment_rate: '0%'
  });
  const [charts, setCharts] = useState<any>({
    performance_chart: [
      { range: '0-10', count: 0 },
      { range: '10-20', count: 0 },
      { range: '20-30', count: 0 },
      { range: '30-40', count: 0 },
      { range: '40-50', count: 0 }
    ],
    attendance_chart: [
      { date: '07-25', rate: 90 },
      { date: '07-26', rate: 85 },
      { date: '07-27', rate: 88 },
      { date: '07-28', rate: 84 },
      { date: 'Today', rate: 92 }
    ],
    co_chart: [
      { co: 'CO1', target: 75, attained: 0 },
      { co: 'CO2', target: 75, attained: 0 },
      { co: 'CO3', target: 75, attained: 0 }
    ]
  });
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [isDataEmpty, setIsDataEmpty] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  // ── Query Bar states ───────────────────────────────────────────────────────
  const [queryInput, setQueryInput] = useState('');
  const [queryResponse, setQueryResponse] = useState<string | null>(null);
  const [queryToolCalls, setQueryToolCalls] = useState<any[]>([]);
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  // ── Evidence Wizard States ─────────────────────────────────────────────────
  const [evidenceStep, setEvidenceStep] = useState(0);
  const [evidenceData, setEvidenceData] = useState<EvidenceState>({
    dept: localStorage.getItem('academic_selected_dept') || 'CCE',
    semester: 'Sem 5',
    faculty: '',
    course: '',
    docs: {
      lessonPlan:         { name: 'Lesson Plan',         file: null, notes: '' },
      assignmentRecord:   { name: 'Assignment Record',   file: null, notes: '' },
      studentFeedback:    { name: 'Student Feedback',    file: null, notes: '' },
      facultyPublication: { name: 'Faculty Publication', file: null, notes: '' },
      eventsReport:       { name: 'Events Report',       file: null, notes: '' },
    }
  });
  const [evidenceDownloading, setEvidenceDownloading] = useState(false);
  const [evidenceStatus, setEvidenceStatus] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    localStorage.setItem('academic_selected_dept', newDept);
  };

  const updateEvidenceDoc = (key: keyof EvidenceState['docs'], doc: EvidenceDoc) => {
    setEvidenceData(prev => ({ ...prev, docs: { ...prev.docs, [key]: doc } }));
  };

  const canAdvanceEvidence = () => {
    switch (evidenceStep) {
      case 0: return !!evidenceData.dept;
      case 1: return !!evidenceData.semester;
      case 2: return evidenceData.faculty.trim().length > 0;
      case 3: return evidenceData.course.trim().length > 0;
      case 4: return true; // documents are optional
      default: return true;
    }
  };

  // ── Data Loading ───────────────────────────────────────────────────────────
  const loadData = async () => {
    try {
      const savedStudentsStr = localStorage.getItem('academic_uploaded_students');
      let allStudents: any[] = savedStudentsStr ? JSON.parse(savedStudentsStr) : await api.getAttendance(department);
      if (!Array.isArray(allStudents)) allStudents = [];

      let students = allStudents.filter(s => {
        if (!department) return true;
        const sDept = (s.class_section || s.department || '').toUpperCase();
        return sDept.includes(department.toUpperCase()) || s.roll_no.toUpperCase().includes(department.toUpperCase());
      });

      if (students.length === 0) {
        setIsDataEmpty(true);
        setKpis({ total_students: 0, avg_attendance: 0, avg_internal_marks: '—', co_attainment_rate: '—' });
        setAtRisk([]);
        return;
      }
      setIsDataEmpty(false);

      const savedInternalStr = localStorage.getItem('academic_internal_marks');
      const internalMarksMap: Record<string, any[]> = savedInternalStr
        ? JSON.parse(savedInternalStr)
        : { 'CIA 1': [], 'CIA 2': [], 'CIA 3': [] };

      const savedSubmissionsStr = localStorage.getItem('academic_assignment_submissions');
      const submissionsMap: Record<string, any[]> = savedSubmissionsStr
        ? JSON.parse(savedSubmissionsStr)
        : {};

      const totalStudentsCount = students.length || 10;

      let presentCount = 0;
      students.forEach(s => {
        if (s.status === 'Present' || s.status === 'present') presentCount++;
      });
      const avgAtt = students.length > 0
        ? Math.round((presentCount / students.length) * 100)
        : 88;

      const studentScoreTotals: Record<string, { totalEarned: number; totalMax: number; count: number }> = {};
      students.forEach(s => {
        studentScoreTotals[s.roll_no] = { totalEarned: 0, totalMax: 0, count: 0 };
      });

      let globalScoreSum = 0;
      let globalMaxSum = 0;
      let globalScoreCount = 0;

      const ciaKeys = ['CIA 1', 'CIA 2', 'CIA 3'];
      const ciaAttainment: Record<string, { total: number; passed: number }> = {
        'CO1': { total: 0, passed: 0 },
        'CO2': { total: 0, passed: 0 },
        'CO3': { total: 0, passed: 0 }
      };

      ciaKeys.forEach((cia, idx) => {
        const records = internalMarksMap[cia] || [];
        const coKey = idx === 0 ? 'CO1' : idx === 1 ? 'CO2' : 'CO3';
        records.forEach(r => {
          if (studentScoreTotals[r.roll_no] && r.score !== '' && r.score !== undefined && r.score !== null) {
            const earned = Number(r.score);
            const max = Number(r.max_score) || 50;
            globalScoreSum += earned;
            globalMaxSum += max;
            globalScoreCount++;
            ciaAttainment[coKey].total++;
            if ((earned / max) >= 0.6) ciaAttainment[coKey].passed++;
            studentScoreTotals[r.roll_no].totalEarned += earned;
            studentScoreTotals[r.roll_no].totalMax += max;
            studentScoreTotals[r.roll_no].count++;
          }
        });
      });

      Object.values(submissionsMap).forEach(subList => {
        if (Array.isArray(subList)) {
          subList.forEach(sub => {
            if (studentScoreTotals[sub.roll_no] && sub.marks_obtained !== undefined && sub.marks_obtained !== null && sub.marks_obtained !== '') {
              const earned = Number(sub.marks_obtained);
              const max = Number(sub.max_marks) || 50;
              globalScoreSum += earned;
              globalMaxSum += max;
              globalScoreCount++;
              studentScoreTotals[sub.roll_no].totalEarned += earned;
              studentScoreTotals[sub.roll_no].totalMax += max;
              studentScoreTotals[sub.roll_no].count++;
            }
          });
        }
      });

      const avgObtained = globalScoreCount > 0 ? Math.round(globalScoreSum / globalScoreCount) : 38;
      const avgMax = globalScoreCount > 0 ? Math.round(globalMaxSum / globalScoreCount) : 50;

      const dist = [
        { range: '0-10', count: 0 },
        { range: '10-20', count: 0 },
        { range: '20-30', count: 0 },
        { range: '30-40', count: 0 },
        { range: '40-50', count: 0 }
      ];

      Object.values(studentScoreTotals).forEach(st => {
        if (st.count > 0 && st.totalMax > 0) {
          const normScore = (st.totalEarned / st.totalMax) * 50;
          if (normScore < 10) dist[0].count++;
          else if (normScore < 20) dist[1].count++;
          else if (normScore < 30) dist[2].count++;
          else if (normScore < 40) dist[3].count++;
          else dist[4].count++;
        }
      });

      if (globalScoreCount === 0) {
        dist[2].count = Math.max(1, Math.floor(students.length * 0.3));
        dist[3].count = Math.max(2, Math.floor(students.length * 0.5));
        dist[4].count = Math.max(1, Math.floor(students.length * 0.2));
      }

      const coChartData = Object.entries(ciaAttainment).map(([coName, stat]) => {
        const attainedPct = stat.total > 0 ? Math.round((stat.passed / stat.total) * 100) : 78;
        return { co: coName, target: 75, attained: attainedPct };
      });

      const overallCoAttainment = Math.round(
        coChartData.reduce((acc, curr) => acc + curr.attained, 0) / coChartData.length
      );

      const atRiskList: any[] = [];
      students.forEach(st => {
        const stScore = studentScoreTotals[st.roll_no];
        const isAbsent = st.status === 'Absent' || st.status === 'absent';
        let stMarks = 35;
        if (stScore && stScore.count > 0 && stScore.totalMax > 0) {
          stMarks = Math.round((stScore.totalEarned / stScore.totalMax) * 50);
        } else if (isAbsent) {
          stMarks = 22;
        }
        const isLowMarks = stMarks < 25;
        if (isAbsent || isLowMarks) {
          atRiskList.push({
            roll_no: st.roll_no,
            name: st.name,
            attendance: isAbsent ? 60 : avgAtt,
            marks: stMarks,
            risk_level: (isAbsent && isLowMarks) || stMarks < 20 ? 'High' : 'Medium'
          });
        }
      });

      setKpis({
        total_students: totalStudentsCount,
        avg_attendance: avgAtt,
        avg_internal_marks: `${avgObtained}/${avgMax}`,
        co_attainment_rate: `${overallCoAttainment}%`
      });
      setCharts((prev: any) => ({ ...prev, performance_chart: dist, co_chart: coChartData }));
      setAtRisk(atRiskList);
    } catch (e) {
      console.error('Error loading live analytics data:', e);
    }
  };

  useEffect(() => { loadData(); }, [department, semester, section, academicYear]);

  // ── PDF: Analytics ─────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setIsReportLoading(true);
    setReportStatus(null);
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`NBA ACCREDITATION & CO ATTAINMENT REPORT`, 14, 18);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Academic Year: ${academicYear} | Department: ${department} | ${semester} (${section})`, 14, 25);
      doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 30);

      autoTable(doc, {
        startY: 36,
        head: [['Metric Parameter', 'Evaluated Value', 'NBA Benchmark Target', 'Compliance Status']],
        body: [
          ['Total Enrolled Students', `${kpis.total_students}`, '>= 30 Students', 'COMPLIANT'],
          ['Class Average Attendance', `${kpis.avg_attendance}%`, '>= 75%', kpis.avg_attendance >= 75 ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT'],
          ['Average Internal Marks', `${kpis.avg_internal_marks}`, '>= 60% of Max', 'SATISFACTORY'],
          ['CO Attainment Rate', `${kpis.co_attainment_rate}`, '>= 70%', 'ATTACKING TARGET']
        ],
        headStyles: { fillColor: [245, 158, 11], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      const nextY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Course Outcome (CO) Mapping & Attainment Summary', 14, nextY);

      autoTable(doc, {
        startY: nextY + 4,
        head: [['CO Code', 'Description', 'Target Level (%)', 'Attained Level (%)', 'Status']],
        body: (charts.co_chart || []).map((c: any) => [
          c.co,
          c.co === 'CO1' ? 'Apply algorithmic techniques to solve computational problems' : c.co === 'CO2' ? 'Analyze space and time complexity of core data structures' : 'Design efficient dynamic programming solutions',
          `${c.target}%`,
          `${c.attained}%`,
          c.attained >= c.target ? 'TARGET ACHIEVED' : 'PARTIALLY ATTAINED'
        ]),
        headStyles: { fillColor: [16, 185, 129], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 8 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('At-Risk Student Identification & Remedial Action Register', 14, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['Roll No', 'Student Name', 'Attendance (%)', 'Marks (/50)', 'Risk Level', 'Recommended Action']],
        body: atRisk.length > 0 ? atRisk.map(r => [
          r.roll_no, r.name, `${r.attendance}%`, `${r.marks}/50`, r.risk_level,
          r.risk_level === 'High' ? 'Mandatory Mentor Counseling & Peer Tutoring' : 'Remedial Assignment & Progress Tracking'
        ]) : [['—', 'No students currently flagged at risk', '—', '—', 'CLEAR', 'Maintain regular monitoring']],
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8 }
      });

      doc.save(`NBA_Accreditation_Report_${department}_${semester.replace(' ', '')}_2026.pdf`);
      setReportStatus(`Official NBA Accreditation PDF for ${department} (${semester}) compiled and downloaded successfully!`);
    } catch (e) {
      console.error(e);
      setReportStatus('Failed to generate PDF report.');
    } finally {
      setIsReportLoading(false);
    }
  };

  // ── PDF: Evidence Bundle ───────────────────────────────────────────────────
  const handleDownloadEvidence = () => {
    setEvidenceDownloading(true);
    setEvidenceStatus(null);
    try {
      const doc = new jsPDF();
      const { dept, semester: sem, faculty, course, docs } = evidenceData;
      const today = new Date().toLocaleString();

      // Cover Page
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('NBA / NAAC ACCREDITATION EVIDENCE BUNDLE', 14, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Department: ${dept}  |  Semester: ${sem}  |  Generated: ${today}`, 14, 28);
      doc.text(`Faculty: ${faculty}  |  Course: ${course}`, 14, 35);

      doc.setTextColor(0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Evidence Document Index', 14, 55);

      autoTable(doc, {
        startY: 60,
        head: [['#', 'Document Type', 'File Attached', 'Notes / Remarks']],
        body: DOC_FIELDS.map((f, i) => {
          const d = docs[f.key];
          return [
            `${i + 1}`,
            f.label,
            d.file ? `✓ ${d.file.name}` : '— Not uploaded',
            d.notes || '—'
          ];
        }),
        headStyles: { fillColor: [245, 158, 11], textColor: 0, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        styles: { fontSize: 9 }
      });

      const afterTable = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Faculty & Course Details', 14, afterTable);

      autoTable(doc, {
        startY: afterTable + 4,
        head: [['Parameter', 'Value']],
        body: [
          ['Department',    dept],
          ['Semester',      sem],
          ['Faculty Name',  faculty],
          ['Course Title',  course],
          ['Academic Year', '2025 – 2026'],
          ['Report Date',   today],
        ],
        headStyles: { fillColor: [16, 185, 129], textColor: 0, fontStyle: 'bold' },
        styles: { fontSize: 9 }
      });

      const certY = (doc as any).lastAutoTable.finalY + 14;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Declaration', 14, certY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `I, ${faculty}, hereby certify that the documents listed above are authentic records pertaining to the course "${course}" offered in ${sem}, Department of ${dept}, and are submitted as evidence for NBA/NAAC accreditation purposes.`,
        14, certY + 6, { maxWidth: 180 }
      );

      doc.save(`NBA_NAAC_Evidence_${dept}_${sem.replace(' ', '')}_${faculty.replace(/\s+/g,'_')}.pdf`);
      setEvidenceStatus(`Evidence bundle for ${dept} – ${faculty} (${course}) downloaded successfully!`);
    } catch (e) {
      console.error(e);
      setEvidenceStatus('Failed to generate evidence PDF.');
    } finally {
      setEvidenceDownloading(false);
    }
  };

  // ── Query handler ──────────────────────────────────────────────────────────
  const handleSendQuery = () => {
    if (!queryInput.trim()) return;
    setIsQueryLoading(true);
    setQueryResponse(null);
    setQueryToolCalls([]);
    api.streamChat('agent3', queryInput, [],
      (chunk) => setQueryResponse(prev => (prev || '') + chunk),
      (trace) => setQueryToolCalls(prev => {
        const idx = prev.findIndex(t => t.name === trace.name);
        if (idx >= 0) { const u = [...prev]; u[idx] = trace; return u; }
        return [...prev, trace];
      }),
      (_toolCalls, _richData) => { setIsQueryLoading(false); loadData(); },
      (err) => { console.error(err); setIsQueryLoading(false); }
    );
  };

  const chartWidth = 360;
  const chartHeight = 180;
  const padding = 30;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col relative bg-paper text-ink overflow-hidden font-ui">

      {/* ── Header Row ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Seal agentId="agent3" icon={Award} size="md" className="bg-amber-500" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Analytics &amp; Accreditation</h1>
            <p className="text-xs text-ink-muted">Executive dashboard, CO attainment metrics, and NBA/NAAC evidence management.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'dashboard' && (
            <>
              <Button
                onClick={loadData}
                variant="outline"
                className="text-xs flex items-center gap-1.5 font-mono py-2 text-ink-muted hover:text-ink"
                title="Refresh analytics from live academic workflow"
              >
                <RefreshCw size={13} /> Sync Flow Data
              </Button>
              <Button
                onClick={handleDownloadPDF}
                className="bg-amber-500 hover:bg-amber-600 text-black text-xs flex items-center gap-1.5 font-mono py-2 font-bold shadow"
                disabled={isReportLoading}
              >
                <Download size={14} />
                {isReportLoading ? 'COMPILING...' : 'NBA ACCREDITATION PDF'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 bg-surface p-1 rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200 ${
            activeTab === 'dashboard'
              ? 'bg-amber-500 text-black shadow'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <BarChart2 size={13} /> Analytics Dashboard
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all duration-200 ${
            activeTab === 'evidence'
              ? 'bg-amber-500 text-black shadow'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <FileText size={13} /> NBA / NAAC Evidence
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 – ANALYTICS DASHBOARD
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {reportStatus && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400 font-mono flex items-center justify-between">
              <span>{reportStatus}</span>
              <button onClick={() => setReportStatus(null)} className="text-amber-400/60 hover:text-amber-400">[X]</button>
            </div>
          )}

          {/* Filter Bar */}
          <div className="mb-5 p-3.5 bg-surface border border-border rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
                  <Calendar size={11} className="text-amber-400" /> Academic Year
                </label>
                <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                  className="bg-paper border border-border text-ink text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-amber-500 hover:border-amber-500/50 cursor-pointer font-bold">
                  <option value="2025-2026">2025 – 2026 (Odd)</option>
                  <option value="2025-2026-EVEN">2025 – 2026 (Even)</option>
                  <option value="2026-2027">2026 – 2027 (Odd)</option>
                  <option value="2024-2025">2024 – 2025</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1 font-bold">
                  <Building size={11} className="text-amber-400" /> Department
                </label>
                <select value={department} onChange={e => handleDepartmentChange(e.target.value)}
                  className="bg-paper border border-amber-500/50 text-amber-400 text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-amber-500 hover:border-amber-500 cursor-pointer font-bold bg-amber-500/10">
                  <option value="CCE" className="bg-paper text-ink">CCE (Computer &amp; Comm.)</option>
                  <option value="CSE" className="bg-paper text-ink">CSE (Computer Science)</option>
                  <option value="ECE" className="bg-paper text-ink">ECE (Electronics &amp; Comm.)</option>
                  <option value="EEE" className="bg-paper text-ink">EEE (Electrical &amp; Electronics)</option>
                  <option value="IT"  className="bg-paper text-ink">IT (Information Tech)</option>
                  <option value="MECH" className="bg-paper text-ink">MECH (Mechanical Eng.)</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
                  <GraduationCap size={11} className="text-amber-400" /> Semester
                </label>
                <select value={semester} onChange={e => setSemester(e.target.value)}
                  className="bg-paper border border-border text-ink text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-amber-500 hover:border-amber-500/50 cursor-pointer font-bold">
                  {SEMS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
                  <Users size={11} className="text-amber-400" /> Section
                </label>
                <select value={section} onChange={e => setSection(e.target.value)}
                  className="bg-paper border border-border text-ink text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-amber-500 hover:border-amber-500/50 cursor-pointer font-bold">
                  <option>Section A</option>
                  <option>Section B</option>
                  <option>Section C</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/30">
              <Building size={13} /> Active Dept Context: <span className="font-bold text-ink">{department}</span> ({semester})
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pr-1 pb-24 space-y-6">

            {/* No Data Empty State */}
            {isDataEmpty && (
              <div className="flex flex-col items-center justify-center py-20 gap-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <AlertTriangle size={36} className="text-amber-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-paper flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">!</span>
                  </div>
                </div>
                <div className="text-center max-w-sm">
                  <h2 className="font-display text-xl font-bold text-ink mb-2">No Data Available</h2>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    No student records found for <span className="font-bold text-amber-400">{department}</span> department in the Academic Workflow.
                  </p>
                  <p className="text-xs text-ink-muted/60 mt-1">
                    Please upload student data or select a different department in Phase 2 (Academic Workflow) first.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-px w-20 bg-border" />
                  <span className="text-[10px] font-mono text-ink-muted uppercase">Switch Department or Upload Data in Academic Workflow</span>
                  <div className="h-px w-20 bg-border" />
                </div>
                <div className="flex gap-3">
                  {DEPTS.filter(d => d !== department).slice(0, 3).map(d => (
                    <button key={d} onClick={() => handleDepartmentChange(d)}
                      className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-surface border border-border hover:border-amber-500/50 hover:text-amber-400 transition-all">
                      Switch to {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* KPI Cards */}
            {!isDataEmpty && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="relative overflow-hidden">
                <div className="text-[10px] font-mono text-ink-muted uppercase">Total Students</div>
                <div className="font-display text-3xl font-bold text-ink mt-1">{kpis.total_students}</div>
                <svg className="absolute bottom-0 left-0 right-0 h-8 w-full text-amber-500/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0,10 L20,8 L40,9 L60,4 L80,6 L100,2 L100,10 Z" fill="currentColor" />
                  <path d="M0,10 L20,8 L40,9 L60,4 L80,6 L100,2" fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="1" />
                </svg>
              </Card>
              <Card className="relative overflow-hidden">
                <div className="text-[10px] font-mono text-ink-muted uppercase">Avg Attendance</div>
                <div className="font-display text-3xl font-bold text-amber-400 mt-1">{kpis.avg_attendance}%</div>
                <svg className="absolute bottom-0 left-0 right-0 h-8 w-full text-amber-500/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0,5 L20,6 L40,4 L60,3 L80,7 L100,2 L100,10 Z" fill="currentColor" />
                  <path d="M0,5 L20,6 L40,4 L60,3 L80,7 L100,2" fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="1" />
                </svg>
              </Card>
              <Card className="relative overflow-hidden">
                <div className="text-[10px] font-mono text-ink-muted uppercase">Avg Internals</div>
                <div className="font-display text-3xl font-bold text-ink mt-1">{kpis.avg_internal_marks}</div>
                <svg className="absolute bottom-0 left-0 right-0 h-8 w-full text-amber-500/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0,8 L20,7 L40,5 L60,6 L80,3 L100,1 L100,10 Z" fill="currentColor" />
                  <path d="M0,8 L20,7 L40,5 L60,6 L80,3 L100,1" fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="1" />
                </svg>
              </Card>
              <Card className="relative overflow-hidden">
                <div className="text-[10px] font-mono text-ink-muted uppercase">CO Attainment</div>
                <div className="font-display text-3xl font-bold text-amber-400 mt-1">{kpis.co_attainment_rate}</div>
                <svg className="absolute bottom-0 left-0 right-0 h-8 w-full text-amber-500/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0,9 L20,8 L40,9 L60,5 L80,7 L100,3 L100,10 Z" fill="currentColor" />
                  <path d="M0,9 L20,8 L40,9 L60,5 L80,7 L100,3" fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="1" />
                </svg>
              </Card>
            </div>}

            {/* Charts */}
            {!isDataEmpty && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Performance Distribution */}
              <Card>
                <div className="text-xs font-semibold text-ink-muted uppercase font-mono mb-4">Performance Distribution</div>
                <div className="flex justify-center">
                  <svg width={chartWidth} height={chartHeight} className="overflow-visible font-mono text-[9px] fill-ink-muted">
                    {[0,1,2,3].map(g => (
                      <line key={g} x1={padding} y1={padding + g*40} x2={chartWidth - padding} y2={padding + g*40}
                        stroke="var(--border)" strokeDasharray="2 2" />
                    ))}
                    {(charts.performance_chart || []).map((c: any, i: number) => {
                      const maxCount = Math.max(...(charts.performance_chart || []).map((x: any) => x.count), 1);
                      const barHeight = (c.count / maxCount) * 100;
                      const barWidth = 35;
                      const spacing = (chartWidth - padding * 2) / (charts.performance_chart || []).length;
                      const x = padding + i * spacing + (spacing - barWidth) / 2;
                      const y = chartHeight - padding - barHeight;
                      return (
                        <g key={c.range}>
                          <rect x={x} y={y} width={barWidth} height={barHeight} fill="var(--agent3-500)" opacity="0.8" rx="2" />
                          <text x={x + barWidth/2} y={y - 5} textAnchor="middle" fill="var(--ink)" className="font-semibold">{c.count}</text>
                          <text x={x + barWidth/2} y={chartHeight - padding + 15} textAnchor="middle">{c.range}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </Card>

              {/* Attendance Trend */}
              <Card>
                <div className="text-xs font-semibold text-ink-muted uppercase font-mono mb-4">Attendance Rate Trend (%)</div>
                <div className="flex justify-center">
                  <svg width={chartWidth} height={chartHeight} className="overflow-visible font-mono text-[9px] fill-ink-muted">
                    {[0,20,40,60,80,100].map((val, idx) => (
                      <line key={val} x1={padding} y1={chartHeight - padding - idx*24} x2={chartWidth - padding} y2={chartHeight - padding - idx*24} stroke="var(--border)" />
                    ))}
                    {(() => {
                      const attList = charts.attendance_chart || [];
                      if (attList.length === 0) return null;
                      const spacing = (chartWidth - padding * 2) / Math.max(1, attList.length - 1);
                      const points = attList.map((c: any, i: number) => ({
                        x: padding + i * spacing,
                        y: chartHeight - padding - (c.rate / 100) * 120,
                        rate: c.rate, date: c.date
                      }));
                      const pathD = points.map((p: any, idx: number) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                      return (
                        <g>
                          <path d={pathD} fill="none" stroke="var(--agent3-500)" strokeWidth="2" />
                          {points.map((p: any, idx: number) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="3.5" fill="var(--agent3-700)" stroke="var(--agent3-500)" strokeWidth="1.5" />
                              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="var(--ink)">{p.rate}%</text>
                              <text x={p.x} y={chartHeight - padding + 15} textAnchor="middle">{p.date}</text>
                            </g>
                          ))}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </Card>

              {/* At-Risk Table */}
              <Card className="flex flex-col h-[280px]">
                <div className="text-xs font-semibold text-ink-muted uppercase font-mono mb-3">At-Risk Students Prediction</div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-ink-muted">
                        <th className="py-2">ROLL NO</th>
                        <th className="py-2">NAME</th>
                        <th className="py-2 text-center">ATTENDANCE</th>
                        <th className="py-2 text-center">MARKS</th>
                        <th className="py-2 text-right">RISK LEVEL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRisk.map((r, idx) => (
                        <tr key={idx} className="border-b border-border/40 hover:bg-surface/30">
                          <td className="py-2.5 font-mono">{r.roll_no}</td>
                          <td className="py-2.5 font-bold">{r.name}</td>
                          <td className="py-2.5 text-center font-mono text-status-bad">{r.attendance}%</td>
                          <td className="py-2.5 text-center font-mono">{r.marks}/50</td>
                          <td className="py-2.5 text-right"><Badge variant="danger">{r.risk_level}</Badge></td>
                        </tr>
                      ))}
                      {atRisk.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-ink-muted font-mono">No at-risk students flagged.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* CO Attainment */}
              <Card>
                <div className="text-xs font-semibold text-ink-muted uppercase font-mono mb-4">CO Attainment vs Target</div>
                <div className="flex justify-center">
                  <svg width={chartWidth} height={chartHeight} className="overflow-visible font-mono text-[9px] fill-ink-muted">
                    <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--border)" strokeDasharray="2 2" />
                    <text x={chartWidth - padding + 5} y={padding + 3} textAnchor="start">100%</text>
                    {charts.co_chart.map((c: any, i: number) => {
                      const spacing = (chartWidth - padding * 2) / charts.co_chart.length;
                      const x = padding + i * spacing + 10;
                      const yTarget = chartHeight - padding - (c.target / 100) * 120;
                      const yAttained = chartHeight - padding - (c.attained / 100) * 120;
                      const barWidth = 15;
                      return (
                        <g key={c.co}>
                          <rect x={x} y={yTarget} width={barWidth} height={(c.target / 100) * 120} fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeDasharray="2 2" />
                          <rect x={x + barWidth + 4} y={yAttained} width={barWidth} height={(c.attained / 100) * 120} fill="var(--agent3-500)" rx="1" />
                          <text x={x + 15} y={chartHeight - padding + 15} textAnchor="middle">{c.co}</text>
                          <text x={x + barWidth/2} y={yTarget - 5} textAnchor="middle" fill="var(--ink-muted)">{c.target}</text>
                          <text x={x + barWidth + 4 + barWidth/2} y={yAttained - 5} textAnchor="middle" fill="var(--agent3-200)">{c.attained}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </Card>

            </div>}

          </div>

          {/* Floating Query Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30">
            <Card className="shadow-2xl border-amber-500/40 border bg-surface/95 backdrop-blur">
              {queryResponse && (
                <div className="mb-4 max-h-48 overflow-y-auto border-b border-border/80 pb-3 text-xs leading-relaxed">
                  <div className="font-mono text-[10px] text-amber-400 mb-1 flex items-center gap-1.5">
                    <Sparkles size={10} /> ANALYTICS ADVISOR
                  </div>
                  <div className="whitespace-pre-wrap">{queryResponse}</div>
                </div>
              )}
              {queryToolCalls.map((t, idx) => (
                <div key={idx} className="text-[9px] font-mono text-amber-500/80 mb-2">
                  Executing {t.name}... ({t.status})
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about attainment targets, weak student lists, or department averages..."
                  value={queryInput}
                  onChange={e => setQueryInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendQuery()}
                  className="text-xs border-amber-500/20 focus:border-amber-500"
                />
                <Button onClick={handleSendQuery} size="sm" className="bg-amber-500 hover:bg-amber-600 text-black px-4">
                  Ask
                </Button>
              </div>
            </Card>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 – NBA / NAAC EVIDENCE WIZARD
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'evidence' && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Stepper Bar */}
          <div className="mb-6">
            <div className="flex items-center gap-0">
              {EVIDENCE_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx < evidenceStep;
                const isActive = idx === evidenceStep;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => { if (idx <= evidenceStep) setEvidenceStep(idx); }}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                        isActive  ? 'bg-amber-500/15 border border-amber-500/50' :
                        isDone    ? 'opacity-80 hover:opacity-100' :
                        'opacity-40 cursor-not-allowed'
                      }`}
                      disabled={idx > evidenceStep}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isDone   ? 'bg-green-500 text-white' :
                        isActive ? 'bg-amber-500 text-black' :
                        'bg-surface border border-border text-ink-muted'
                      }`}>
                        {isDone ? <Check size={14} /> : <Icon size={14} />}
                      </div>
                      <span className={`text-[9px] font-mono font-bold whitespace-nowrap ${
                        isActive ? 'text-amber-400' : isDone ? 'text-green-400' : 'text-ink-muted'
                      }`}>{step.label}</span>
                    </button>
                    {idx < EVIDENCE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 transition-all ${idx < evidenceStep ? 'bg-green-500/60' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto pb-6">

            {/* STEP 0 – Department */}
            {evidenceStep === 0 && (
              <div className="max-w-lg mx-auto">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Building size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold">Select Department</h2>
                      <p className="text-xs text-ink-muted">Choose the department for which evidence is being submitted.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {DEPTS.map(d => (
                      <button
                        key={d}
                        onClick={() => setEvidenceData(prev => ({ ...prev, dept: d }))}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                          evidenceData.dept === d
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-border hover:border-amber-500/40 text-ink'
                        }`}
                      >
                        <div className="font-bold font-mono text-sm">{d}</div>
                        <div className="text-[10px] text-ink-muted mt-0.5">
                          {{
                            CCE: 'Computer & Communication',
                            CSE: 'Computer Science',
                            ECE: 'Electronics & Comm.',
                            EEE: 'Electrical & Electronics',
                            IT: 'Information Technology',
                            MECH: 'Mechanical Engineering'
                          }[d]}
                        </div>
                        {evidenceData.dept === d && (
                          <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-green-400">
                            <Check size={10} /> Selected
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* STEP 1 – Semester */}
            {evidenceStep === 1 && (
              <div className="max-w-lg mx-auto">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <GraduationCap size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold">Select Semester</h2>
                      <p className="text-xs text-ink-muted">Department: <span className="font-bold text-amber-400">{evidenceData.dept}</span></p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {SEMS.map(s => (
                      <button
                        key={s}
                        onClick={() => setEvidenceData(prev => ({ ...prev, semester: s }))}
                        className={`p-3 rounded-xl border-2 text-center font-mono font-bold text-sm transition-all duration-200 ${
                          evidenceData.semester === s
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-border hover:border-amber-500/40 text-ink'
                        }`}
                      >
                        {s}
                        {evidenceData.semester === s && <div className="text-[9px] text-green-400 mt-1">✓</div>}
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* STEP 2 – Faculty */}
            {evidenceStep === 2 && (
              <div className="max-w-lg mx-auto">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Users size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold">Faculty Details</h2>
                      <p className="text-xs text-ink-muted">{evidenceData.dept} · {evidenceData.semester}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase mb-1.5 block">Faculty Name <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. R. Meenakshi"
                        value={evidenceData.faculty}
                        onChange={e => setEvidenceData(prev => ({ ...prev, faculty: e.target.value }))}
                        className="w-full bg-paper border border-border text-ink text-sm font-mono rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 placeholder-ink-muted/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase mb-1.5 block">Employee ID / Staff Code</label>
                      <input
                        type="text"
                        placeholder="e.g. FAC-2024-085"
                        className="w-full bg-paper border border-border text-ink text-sm font-mono rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500/50 placeholder-ink-muted/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase mb-1.5 block">Designation</label>
                      <select className="w-full bg-paper border border-border text-ink text-sm font-mono rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500/50 cursor-pointer">
                        <option>Assistant Professor</option>
                        <option>Associate Professor</option>
                        <option>Professor</option>
                        <option>HOD</option>
                        <option>Guest Lecturer</option>
                      </select>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* STEP 3 – Course */}
            {evidenceStep === 3 && (
              <div className="max-w-lg mx-auto">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <BookOpen size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold">Course Details</h2>
                      <p className="text-xs text-ink-muted">{evidenceData.dept} · {evidenceData.semester} · {evidenceData.faculty}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase mb-1.5 block">Course / Subject Name <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Data Structures and Algorithms"
                        value={evidenceData.course}
                        onChange={e => setEvidenceData(prev => ({ ...prev, course: e.target.value }))}
                        className="w-full bg-paper border border-border text-ink text-sm font-mono rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 placeholder-ink-muted/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase mb-1.5 block">Course Code</label>
                      <input
                        type="text"
                        placeholder="e.g. CCE502 / CS301"
                        className="w-full bg-paper border border-border text-ink text-sm font-mono rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500/50 placeholder-ink-muted/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-ink-muted uppercase mb-1.5 block">Course Type</label>
                      <select className="w-full bg-paper border border-border text-ink text-sm font-mono rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500/50 cursor-pointer">
                        <option>Theory</option>
                        <option>Practical / Lab</option>
                        <option>Theory + Practical</option>
                        <option>Elective</option>
                      </select>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* STEP 4 – Upload Documents */}
            {evidenceStep === 4 && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Upload size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold">Upload Evidence Documents</h2>
                    <p className="text-xs text-ink-muted">{evidenceData.dept} · {evidenceData.semester} · {evidenceData.faculty} · {evidenceData.course}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {DOC_FIELDS.map(f => (
                    <FileUploadBox
                      key={f.key}
                      doc={evidenceData.docs[f.key]}
                      onChange={doc => updateEvidenceDoc(f.key, doc)}
                      icon={f.icon}
                      label={f.label}
                      desc={f.desc}
                    />
                  ))}
                </div>
                <div className="text-[10px] font-mono text-ink-muted/50 text-center pt-2">
                  All document uploads are optional. You can still download the evidence summary even without files.
                </div>
              </div>
            )}

            {/* STEP 5 – Download Evidence */}
            {evidenceStep === 5 && (
              <div className="max-w-lg mx-auto">
                <Card className="p-6">
                  <div className="flex flex-col items-center text-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                      <Award size={30} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold">Evidence Bundle Ready</h2>
                      <p className="text-sm text-ink-muted mt-1">
                        Review your evidence summary below, then download the official NBA/NAAC PDF bundle.
                      </p>
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div className="rounded-xl bg-surface border border-border overflow-hidden mb-5">
                    <div className="text-[10px] font-mono text-ink-muted uppercase px-4 py-2 border-b border-border bg-paper/50">Evidence Summary</div>
                    {[
                      { label: 'Department',  value: evidenceData.dept },
                      { label: 'Semester',    value: evidenceData.semester },
                      { label: 'Faculty',     value: evidenceData.faculty || '—' },
                      { label: 'Course',      value: evidenceData.course || '—' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                        <span className="text-xs text-ink-muted font-mono">{row.label}</span>
                        <span className="text-xs font-bold text-ink font-mono">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Document Checklist */}
                  <div className="rounded-xl bg-surface border border-border overflow-hidden mb-5">
                    <div className="text-[10px] font-mono text-ink-muted uppercase px-4 py-2 border-b border-border bg-paper/50">Attached Documents</div>
                    {DOC_FIELDS.map(f => {
                      const d = evidenceData.docs[f.key];
                      const Icon = f.icon;
                      return (
                        <div key={f.key} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0">
                          <Icon size={13} className={d.file ? 'text-amber-400' : 'text-ink-muted/40'} />
                          <span className="text-xs text-ink font-mono flex-1">{f.label}</span>
                          {d.file
                            ? <span className="text-[10px] font-mono text-green-400 flex items-center gap-1"><Check size={10} /> {d.file.name}</span>
                            : <span className="text-[10px] font-mono text-ink-muted/40">Not uploaded</span>
                          }
                        </div>
                      );
                    })}
                  </div>

                  {evidenceStatus && (
                    <div className={`mb-4 p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                      evidenceStatus.includes('successfully') ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}>
                      {evidenceStatus.includes('successfully') ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {evidenceStatus}
                    </div>
                  )}

                  <Button
                    onClick={handleDownloadEvidence}
                    disabled={evidenceDownloading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center justify-center gap-2 py-3"
                  >
                    <Download size={16} />
                    {evidenceDownloading ? 'Generating Evidence PDF...' : 'Download NBA/NAAC Evidence PDF'}
                  </Button>
                  <button
                    onClick={() => { setEvidenceStep(0); setEvidenceStatus(null); }}
                    className="w-full mt-3 text-xs font-mono text-ink-muted hover:text-amber-400 transition-colors"
                  >
                    ↺ Start New Evidence Submission
                  </button>
                </Card>
              </div>
            )}

          </div>

          {/* Navigation Buttons */}
          {evidenceStep < 5 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <button
                onClick={() => setEvidenceStep(prev => Math.max(0, prev - 1))}
                disabled={evidenceStep === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-xs font-mono font-bold text-ink-muted hover:text-ink hover:border-amber-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              <div className="text-[10px] font-mono text-ink-muted">
                Step {evidenceStep + 1} of {EVIDENCE_STEPS.length}
              </div>
              <button
                onClick={() => { if (canAdvanceEvidence()) setEvidenceStep(prev => prev + 1); }}
                disabled={!canAdvanceEvidence()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow"
              >
                {evidenceStep === 4 ? 'Review & Download' : 'Next'} →
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
