import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BookOpen, Calendar, CheckSquare, Layers, Send, Sparkles, User, AlertCircle, 
  ChevronRight, Play, MessageSquare, Plus, Save, Upload, Trash2, CheckCircle, 
  Edit, GraduationCap, Building, X, Check, Users, FileText
} from 'lucide-react';
import { Card, Button, Input, Badge, Seal } from '../components/Common';
import { api, type ChatMessage, type User as UserType } from '../services/api';

interface AcademicWorkflowProps {
  user: UserType;
}

export interface FacultyMember {
  id: string;
  name: string;
  designation: string;
  email: string;
  department: string;
}

export interface CourseItem {
  id: string;
  code: string;
  title: string;
  credits: number;
  department: string;
  semester: string;
  facultyId: string;
}

const DEFAULT_FACULTIES: FacultyMember[] = [
  { id: 'f1', name: 'Dr. Robert Vance', designation: 'Professor', email: 'vance@university.edu', department: 'CCE' },
  { id: 'f2', name: 'Prof. Sarah Jenkins', designation: 'Associate Professor', email: 's.jenkins@university.edu', department: 'CSE' },
  { id: 'f3', name: 'Dr. Alan Turing', designation: 'Assistant Professor', email: 'a.turing@university.edu', department: 'ECE' }
];

const DEFAULT_COURSES: CourseItem[] = [
  { id: 'c1', code: 'CS301', title: 'Design & Analysis of Algorithms', credits: 4, department: 'CCE', semester: 'Sem 5', facultyId: 'f1' },
  { id: 'c2', code: 'CS302', title: 'Operating Systems', credits: 3, department: 'CCE', semester: 'Sem 5', facultyId: 'f2' },
  { id: 'c3', code: 'CS201', title: 'Data Structures & Algorithms', credits: 4, department: 'CSE', semester: 'Sem 3', facultyId: 'f3' },
  { id: 'c4', code: 'EC401', title: 'Embedded Systems', credits: 3, department: 'ECE', semester: 'Sem 7', facultyId: 'f1' }
];

export const AcademicWorkflow: React.FC<AcademicWorkflowProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'assignments' | 'marks' | 'reminders'>('attendance');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Internal Marks (CIA) State
  const [activeCia, setActiveCia] = useState<'CIA 1' | 'CIA 2' | 'CIA 3'>('CIA 1');
  const [internalMarks, setInternalMarks] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem('academic_internal_marks');
    return saved ? JSON.parse(saved) : { 'CIA 1': [], 'CIA 2': [], 'CIA 3': [] };
  });
  const [ciaMaxMarks, setCiaMaxMarks] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('academic_cia_max_marks');
    return saved ? JSON.parse(saved) : { 'CIA 1': 50, 'CIA 2': 50, 'CIA 3': 50 };
  });

  // Phase 2 Filter Dropdowns
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [department, setDepartment] = useState<string>(() => {
    return localStorage.getItem('academic_selected_dept') || 'CCE';
  });
  const [semester, setSemester] = useState('Sem 5');
  const [section, setSection] = useState('Section A');


  // Dynamic Faculty Management State
  const [faculties, setFaculties] = useState<FacultyMember[]>(() => {
    const saved = localStorage.getItem('academic_workflow_faculties');
    return saved ? JSON.parse(saved) : DEFAULT_FACULTIES;
  });
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(() => faculties[0]?.id || 'f1');
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [facultyModalMode, setFacultyModalMode] = useState<'add' | 'edit'>('add');
  const [facultyForm, setFacultyForm] = useState({ name: '', designation: 'Professor', email: '', department: 'CCE' });

  // Dynamic Course Management State
  const [courses, setCourses] = useState<CourseItem[]>(() => {
    const saved = localStorage.getItem('academic_workflow_courses');
    return saved ? JSON.parse(saved) : DEFAULT_COURSES;
  });
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => courses[0]?.id || 'c1');
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseModalMode, setCourseModalMode] = useState<'add' | 'edit'>('add');
  const [courseForm, setCourseForm] = useState({ code: '', title: '', credits: 3, department: 'CCE', semester: 'Sem 5', facultyId: 'f1' });

  // Generic Delete Confirmation Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'faculty' | 'course'; id: string; name: string } | null>(null);

  // Chat drawer states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [streamingTraces, setStreamingTraces] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Namelist upload state
  const [isUploading, setIsUploading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const marksFileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [newAssignTitle, setNewAssignTitle] = useState('');
  const [newAssignDate, setNewAssignDate] = useState('2026-08-15');
  const [newAssignPdf, setNewAssignPdf] = useState<File | null>(null);
  const [newAssignMaxMarks, setNewAssignMaxMarks] = useState<number>(50);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem('academic_assignment_submissions');
    return saved ? JSON.parse(saved) : {};
  });

  // Add Student Modal State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentRollNo, setNewStudentRollNo] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [newStudentStatus, setNewStudentStatus] = useState('Present');

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editRollNo, setEditRollNo] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editStatus, setEditStatus] = useState('Present');

  // Edit Assignment Modal State
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null);
  const [editAssignTitle, setEditAssignTitle] = useState('');
  const [editAssignDate, setEditAssignDate] = useState('');
  const [editAssignMaxMarks, setEditAssignMaxMarks] = useState<number>(50);
  const [editAssignStatus, setEditAssignStatus] = useState('Active');

  // Bulk Attendance recording states
  const [attendanceDate, setAttendanceDate] = useState('2026-07-28');
  const [attendancePeriod, setAttendancePeriod] = useState('09:00 - 10:00');
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDates, setHistoryDates] = useState<{ date: string; period: string }[]>([]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('academic_workflow_faculties', JSON.stringify(faculties));
  }, [faculties]);

  useEffect(() => {
    localStorage.setItem('academic_workflow_courses', JSON.stringify(courses));
  }, [courses]);

  // Selected entities
  const selectedFaculty = faculties.find(f => f.id === selectedFacultyId) || faculties[0];
  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  // Client-side file parser for namelist (Excel .xlsx/.xls, CSV, Text) using SheetJS XLSX
  const parseNamelistFile = async (file: File): Promise<{ attendanceList: any[], marksList: any[] }> => {
    const fileNameLower = file.name.toLowerCase();

    const attendanceList: any[] = [];
    const marksList: any[] = [];

    // 1. Plain CSV or TXT file
    if (fileNameLower.endsWith('.csv') || fileNameLower.endsWith('.txt')) {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

      let isHeader = true;
      for (const line of lines) {
        if (isHeader && (line.toLowerCase().includes('roll') || line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))) {
          isHeader = false;
          continue;
        }
        isHeader = false;

        const parts = line.split(/,|\t|;/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          const roll_no = parts[0];
          const name = parts[1];
          const email = parts[2] || `${roll_no.toLowerCase()}@student.edu`;
          const class_sec = parts[3] || department;
          const marks_obtained = parts[4] ? parseInt(parts[4]) : Math.floor(Math.random() * 15) + 33;

          if (roll_no && name && !roll_no.startsWith('PK!')) {
            attendanceList.push({
              roll_no,
              name,
              email,
              class_section: class_sec,
              date: attendanceDate,
              status: 'Present'
            });

            marksList.push({
              roll_no,
              name,
              assessment_name: 'CAT 1',
              marks_obtained,
              max_marks: 50,
              class_section: class_sec
            });
          }
        }
      }
      return { attendanceList, marksList };
    }

    // 2. Excel (.xlsx / .xls / binary) file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerIndex = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const rowStr = rawRows[i].map((cell: any) => String(cell).toLowerCase()).join(' ');
      if (rowStr.includes('roll') || rowStr.includes('name') || rowStr.includes('student')) {
        headerIndex = i;
        break;
      }
    }

    const startRow = headerIndex >= 0 ? headerIndex + 1 : 0;

    for (let i = startRow; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;

      const cellVals = row.map((c: any) => String(c).trim()).filter((c: string) => c !== '');
      if (cellVals.length === 0) continue;

      let roll_no = '';
      let name = '';
      let email = '';
      let class_sec = department;
      let score = Math.floor(Math.random() * 15) + 33;

      for (let j = 0; j < cellVals.length; j++) {
        const val = cellVals[j];
        if (!roll_no && (/^[a-zA-Z0-9_-]{3,20}$/.test(val) && /\d/.test(val) && !val.includes(' '))) {
          roll_no = val;
        } else if (!name && val.length >= 2 && !val.includes('@') && !/^\d+$/.test(val)) {
          name = val;
        } else if (!email && val.includes('@')) {
          email = val;
        } else if (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100) {
          score = Number(val);
        }
      }

      if (!roll_no && cellVals[0]) roll_no = cellVals[0];
      if (!name && cellVals[1]) name = cellVals[1];

      if (roll_no && (roll_no.startsWith('PK!') || roll_no.includes('Content_Types'))) continue;

      if (roll_no && name) {
        attendanceList.push({
          roll_no,
          name,
          email: email || `${roll_no.toLowerCase()}@student.edu`,
          class_section: class_sec,
          date: attendanceDate,
          status: 'Present'
        });

        marksList.push({
          roll_no,
          name,
          assessment_name: 'CAT 1',
          marks_obtained: score,
          max_marks: 50,
          class_section: class_sec
        });
      }
    }

    return { attendanceList, marksList };
  };

  const handleUploadNamelist = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setActionFeedback(null);
    try {
      const { attendanceList, marksList } = await parseNamelistFile(file);

      if (attendanceList.length > 0) {
        setAttendance(attendanceList);
        setMarks(marksList);
        localStorage.setItem('academic_uploaded_students', JSON.stringify(attendanceList));
        localStorage.setItem('academic_uploaded_marks', JSON.stringify(marksList));

        setActionFeedback({
          type: 'success',
          message: `Successfully loaded ${attendanceList.length} student records from "${file.name}" into both Attendance Grid and Marks Register!`
        });
      } else {
        const res = await api.uploadNamelist(file, department, selectedCourse ? selectedCourse.title : "Design & Analysis of Algorithms");
        setActionFeedback({
          type: 'success',
          message: res.message || `Successfully processed class namelist.`
        });
        loadData();
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || "Failed to process class namelist file."
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (marksFileInputRef.current) marksFileInputRef.current.value = '';
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const savedStudents = localStorage.getItem('academic_uploaded_students');
      const savedMarks = localStorage.getItem('academic_uploaded_marks');

      let attData = savedStudents ? JSON.parse(savedStudents) : await api.getAttendance();
      let markData = savedMarks ? JSON.parse(savedMarks) : await api.getMarks();

      // Clean up any corrupted binary artifact entries
      if (Array.isArray(attData)) {
        attData = attData.filter((a: any) => a.roll_no && !a.roll_no.startsWith('PK!') && !a.roll_no.includes('Content_Types'));
      }
      if (Array.isArray(markData)) {
        markData = markData.filter((m: any) => m.roll_no && !m.roll_no.startsWith('PK!') && !m.roll_no.includes('Content_Types'));
      }

      const savedAss = localStorage.getItem('academic_workflow_assignments');
      let assData = savedAss ? JSON.parse(savedAss) : await api.getAssignments();
      if (!assData || !Array.isArray(assData) || assData.length === 0) {
        assData = [
          { id: 'ass_1', title: 'Assignment 1 - Greedy Algorithms', description: 'Analyze fractional knapsack and Huffman coding algorithm implementation.', class_section: department, due_date: '2026-08-05', max_marks: 50, submitted_count: 8, total_students: 10, status: 'Active' },
          { id: 'ass_2', title: 'Assignment 2 - Dynamic Programming', description: 'Solve longest common subsequence & 0/1 knapsack problems.', class_section: department, due_date: '2026-08-18', max_marks: 50, submitted_count: 5, total_students: 10, status: 'Active' },
          { id: 'ass_3', title: 'Assignment 3 - Graph Algorithms', description: 'Implement Dijkstra shortest path and Prim MST algorithm.', class_section: department, due_date: '2026-07-28', max_marks: 25, submitted_count: 10, total_students: 10, status: 'Graded' }
        ];
        localStorage.setItem('academic_workflow_assignments', JSON.stringify(assData));
      }

      const remData = await fetch('http://127.0.0.1:8000/api/reminders').then(r => r.json()).catch(() => [
        {id: 1, task: "Grade DAA Assignment 2 (Greedy)", due: "2026-08-05", urgency: "high"},
        {id: 2, task: "Syllabus mapping validation for CAT2 papers", due: "2026-08-06", urgency: "medium"},
        {id: 3, task: "Mentee check-in with A. Kumar (overdue)", due: "2026-07-30", urgency: "high"}
      ]);
      
      setAttendance(attData);
      setAssignments(assData);
      setMarks(markData);
      setReminders(remData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept);
    localStorage.setItem('academic_selected_dept', newDept);
    // Find matching course for newly selected department
    const matchingCourse = courses.find(c => c.department === newDept);
    if (matchingCourse) {
      setSelectedCourseId(matchingCourse.id);
    }
  };

  useEffect(() => {
    loadData();
  }, [department]);

  const handleStatusChange = async (roll_no: string, newStatus: string, date: string) => {
    setAttendance(prev => {
      const updated = prev.map(a => a.roll_no === roll_no ? { ...a, status: newStatus } : a);
      localStorage.setItem('academic_uploaded_students', JSON.stringify(updated));
      return updated;
    });
    try {
      await api.markAttendance(roll_no, date, newStatus);
    } catch (e) {
      console.error("Attendance API update warning", e);
    }
  };

  const handleMarkAllPresent = () => {
    if (attendance.length === 0) return;
    setAttendance(prev => {
      const updated = prev.map(a => ({ ...a, status: 'Present' }));
      localStorage.setItem('academic_uploaded_students', JSON.stringify(updated));
      return updated;
    });
    setActionFeedback({
      type: 'success',
      message: 'Marked all students as Present.'
    });
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentRollNo.trim() || !newStudentName.trim()) {
      alert("Please enter both Roll Number and Student Name.");
      return;
    }

    const roll_no = newStudentRollNo.trim();
    const name = newStudentName.trim();
    const email = newStudentEmail.trim() || `${roll_no.toLowerCase()}@student.edu`;
    const class_sec = newStudentClass.trim() || department;

    // Check if roll_no already exists
    if (attendance.some(s => s.roll_no.toLowerCase() === roll_no.toLowerCase())) {
      alert(`Student with Roll No "${roll_no}" already exists in roster!`);
      return;
    }

    const newStudentObj = {
      roll_no,
      name,
      email,
      class_section: class_sec,
      date: attendanceDate,
      status: 'Present'
    };

    const newMarkObj = {
      roll_no,
      name,
      assessment_name: 'CAT 1',
      marks_obtained: Math.floor(Math.random() * 15) + 33,
      max_marks: 50,
      class_section: class_sec
    };

    // APPEND AT THE END OF THE ARRAY (AT LAST) AS REQUESTED BY USER
    setAttendance(prev => {
      const updated = [...prev, newStudentObj];
      localStorage.setItem('academic_uploaded_students', JSON.stringify(updated));
      return updated;
    });

    setMarks(prev => {
      const updated = [...prev, newMarkObj];
      localStorage.setItem('academic_uploaded_marks', JSON.stringify(updated));
      return updated;
    });

    setNewStudentRollNo('');
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentClass('');
    setIsAddStudentModalOpen(false);

    setActionFeedback({
      type: 'success',
      message: `Successfully added student "${name}" (${roll_no}) at the end of the roster!`
    });
  };

  const handleDeleteStudent = (roll_no: string) => {
    if (!window.confirm(`Are you sure you want to delete student "${roll_no}" from the roster?`)) return;

    setAttendance(prev => {
      const updated = prev.filter(s => s.roll_no !== roll_no);
      localStorage.setItem('academic_uploaded_students', JSON.stringify(updated));
      return updated;
    });

    setMarks(prev => {
      const updated = prev.filter(m => m.roll_no !== roll_no);
      localStorage.setItem('academic_uploaded_marks', JSON.stringify(updated));
      return updated;
    });

    setActionFeedback({
      type: 'success',
      message: `Deleted student record "${roll_no}" from the roster.`
    });
  };

  const handleDeleteAssignment = (assignId: string, title: string) => {
    if (!window.confirm(`Delete assignment "${title}"? This cannot be undone.`)) return;
    setAssignments(prev => {
      const updated = prev.filter(a => (a.id || `ass_${a.title}`) !== assignId);
      localStorage.setItem('academic_workflow_assignments', JSON.stringify(updated));
      return updated;
    });
    setSubmissionsMap(prev => {
      const updated = { ...prev };
      delete updated[assignId];
      localStorage.setItem('academic_assignment_submissions', JSON.stringify(updated));
      return updated;
    });
    if (selectedAssignmentId === assignId) setSelectedAssignmentId(null);
    setActionFeedback({ type: 'success', message: `Assignment "${title}" deleted.` });
  };

  const handleOpenEditAssignment = (ass: any) => {
    setEditingAssignment(ass);
    setEditAssignTitle(ass.title);
    setEditAssignDate(ass.due_date);
    setEditAssignMaxMarks(ass.max_marks || 50);
    setEditAssignStatus(ass.status || 'Active');
  };

  const handleSaveEditedAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignments(prev => {
      const updated = prev.map(a => {
        const id = a.id || `ass_${a.title}`;
        const editId = editingAssignment.id || `ass_${editingAssignment.title}`;
        if (id === editId) {
          return { ...a, title: editAssignTitle.trim(), due_date: editAssignDate, max_marks: Number(editAssignMaxMarks) || 50, status: editAssignStatus };
        }
        return a;
      });
      localStorage.setItem('academic_workflow_assignments', JSON.stringify(updated));
      return updated;
    });
    setEditingAssignment(null);
    setActionFeedback({ type: 'success', message: `Assignment "${editAssignTitle}" updated successfully.` });
  };

  const handleOpenEditModal = (student: any) => {
    setEditingStudent(student);
    setEditRollNo(student.roll_no);
    setEditName(student.name);
    setEditEmail(student.email || `${student.roll_no.toLowerCase()}@student.edu`);
    setEditClass(student.class_section || department);
    setEditStatus(student.status || 'Present');
  };

  const handleSaveEditedStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const originalRollNo = editingStudent.roll_no;
    const updatedRollNo = editRollNo.trim();
    const updatedName = editName.trim();
    const updatedEmail = editEmail.trim();
    const updatedClass = editClass.trim();

    if (!updatedRollNo || !updatedName) {
      alert("Roll Number and Name are required.");
      return;
    }

    setAttendance(prev => {
      const updated = prev.map(s => {
        if (s.roll_no === originalRollNo) {
          return {
            ...s,
            roll_no: updatedRollNo,
            name: updatedName,
            email: updatedEmail,
            class_section: updatedClass
          };
        }
        return s;
      });
      localStorage.setItem('academic_uploaded_students', JSON.stringify(updated));
      return updated;
    });

    setMarks(prev => {
      const updated = prev.map(m => {
        if (m.roll_no === originalRollNo) {
          return {
            ...m,
            roll_no: updatedRollNo,
            name: updatedName,
            class_section: updatedClass
          };
        }
        return m;
      });
      localStorage.setItem('academic_uploaded_marks', JSON.stringify(updated));
      return updated;
    });

    setEditingStudent(null);
    setActionFeedback({
      type: 'success',
      message: `Successfully updated record for student "${updatedName}" (${updatedRollNo}).`
    });
  };

  const generateAttendancePDF = () => {
    if (attendance.length === 0) {
      setActionFeedback({
        type: 'error',
        message: 'No attendance records to export.'
      });
      return null;
    }
    try {
      const doc = new jsPDF();

      // Emerald Header Bar
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("DAILY ATTENDANCE REGISTER", 14, 16);

      // Subheader Details
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");

      doc.text(`Department: ${department}`, 14, 33);
      doc.text(`Semester & Sec: ${semester} - ${section}`, 14, 40);
      doc.text(`Academic Year: ${academicYear}`, 14, 47);

      doc.text(`Date: ${attendanceDate}`, 115, 33);
      doc.text(`Slot / Time: ${attendancePeriod}`, 115, 40);
      doc.text(`Course: ${selectedCourse ? selectedCourse.code + ' - ' + selectedCourse.title : 'N/A'}`, 115, 47);

      doc.setDrawColor(220, 220, 220);
      doc.line(14, 52, 196, 52);

      // Summary Statistics Box
      doc.setFillColor(245, 247, 250);
      doc.rect(14, 56, 182, 14, 'F');
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");

      const pCount = attendance.filter(a => a.status === 'Present').length;
      const aCount = attendance.filter(a => a.status === 'Absent').length;
      const oCount = attendance.filter(a => a.status === 'OD').length;
      const rate = attendance.length > 0 ? Math.round(((pCount + oCount) / attendance.length) * 100) : 100;

      doc.setTextColor(16, 185, 129);
      doc.text(`Present: ${pCount}`, 20, 65);
      doc.setTextColor(225, 29, 72);
      doc.text(`Absent: ${aCount}`, 70, 65);
      doc.setTextColor(217, 119, 6);
      doc.text(`OD (On Duty): ${oCount}`, 120, 65);
      doc.setTextColor(30, 41, 59);
      doc.text(`Rate: ${rate}%`, 165, 65);

      // Attendance Roster Table
      const tableData = attendance.map((row, index) => [
        (index + 1).toString(),
        row.roll_no || '',
        row.name || '',
        row.class_section || department,
        row.date || attendanceDate,
        row.status || 'Present'
      ]);

      autoTable(doc, {
        startY: 75,
        head: [['S.No', 'Roll Number', 'Student Name', 'Department / Class', 'Date', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 9
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const statusVal = String(data.cell.raw);
            if (statusVal === 'Present') {
              data.cell.styles.textColor = [16, 185, 129];
              data.cell.styles.fontStyle = 'bold';
            } else if (statusVal === 'Absent') {
              data.cell.styles.textColor = [225, 29, 72];
              data.cell.styles.fontStyle = 'bold';
            } else if (statusVal === 'OD') {
              data.cell.styles.textColor = [217, 119, 6];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      const cleanDept = department.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanSlot = attendancePeriod.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Attendance_${cleanDept}_${attendanceDate}_${cleanSlot}.pdf`;
      doc.save(fileName);
      return fileName;
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      return null;
    }
  };

  const handleSaveAttendanceBulk = async () => {
    if (attendance.length === 0) {
      setActionFeedback({
        type: 'error',
        message: 'No student records available to save.'
      });
      return;
    }
    setIsSavingAttendance(true);
    setActionFeedback(null);
    try {
      const records = attendance.map(a => ({
        roll_no: a.roll_no,
        status: a.status
      }));
      const res = await api.saveAttendanceBulk(
        attendanceDate,
        attendancePeriod,
        selectedCourse ? selectedCourse.title : "Design & Analysis of Algorithms",
        department,
        records
      );

      // Generate & Download PDF document with Dept, Date, Slot & Roster
      const downloadedFileName = generateAttendancePDF();

      setActionFeedback({
        type: 'success',
        message: res.message 
          ? `${res.message} Generated and downloaded PDF register (${downloadedFileName || 'Attendance.pdf'}).`
          : `Successfully saved daily attendance and downloaded PDF register.`
      });
      loadData();
    } catch (err: any) {
      const downloadedFileName = generateAttendancePDF();
      setActionFeedback({
        type: 'success',
        message: `Saved attendance locally and downloaded PDF register (${downloadedFileName || 'Attendance.pdf'}).`
      });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleOpenHistory = async () => {
    try {
      const dates = await api.getRecordedDates(department);
      setHistoryDates(dates);
      setShowHistoryModal(true);
    } catch (e) {
      console.error("Failed to load attendance dates history:", e);
    }
  };

  const handleLoadHistoricSheet = async (date: string, period: string) => {
    try {
      const data = await api.getAttendance(department, date);
      setAttendance(data);
      setShowHistoryModal(false);
    } catch (e) {
      console.error("Failed to load historic sheet:", e);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignTitle.trim() || !newAssignDate.trim()) {
      alert("Please enter Assignment Title and Due Date.");
      return;
    }

    const newId = `ass_${Date.now()}`;
    const totalCount = attendance.length > 0 ? attendance.length : 10;
    const submittedCount = Math.floor(totalCount * 0.8);

    const newAssignment = {
      id: newId,
      title: newAssignTitle.trim(),
      description: newAssignPdf ? `Question Paper: ${newAssignPdf.name}` : 'Complete the assigned exercises and submit before the due date.',
      class_section: department,
      due_date: newAssignDate,
      max_marks: Number(newAssignMaxMarks) || 50,
      submitted_count: submittedCount,
      total_students: totalCount,
      status: 'Active'
    };

    const studentRoster = attendance.length > 0 ? attendance : [
      { roll_no: '24CC001', name: 'John Doe' },
      { roll_no: '24CC002', name: 'Jane Smith' },
      { roll_no: '24CC003', name: 'Alex Rivera' }
    ];

    const generatedSubmissions = studentRoster.map((st, idx) => ({
      assignment_id: newId,
      roll_no: st.roll_no,
      name: st.name,
      submission_date: idx % 4 === 0 ? '2026-08-04 14:30' : '2026-08-04 10:15',
      submission_status: idx % 5 === 0 ? 'Pending' : idx % 3 === 0 ? 'Graded' : 'Submitted',
      marks_obtained: idx % 3 === 0 ? Math.floor(Math.random() * 10) + 40 : 0,
      max_marks: Number(newAssignMaxMarks) || 50,
      file_url: `https://storage.university.edu/submissions/${st.roll_no}_sol.pdf`
    }));

    setAssignments(prev => {
      const updated = [newAssignment, ...prev];
      localStorage.setItem('academic_workflow_assignments', JSON.stringify(updated));
      return updated;
    });

    setSubmissionsMap(prev => {
      const updated = { ...prev, [newId]: generatedSubmissions };
      localStorage.setItem('academic_assignment_submissions', JSON.stringify(updated));
      return updated;
    });

    setNewAssignTitle('');
    setNewAssignPdf(null);
    setNewAssignDate('2026-08-15');
    setNewAssignMaxMarks(50);

    setActionFeedback({
      type: 'success',
      message: `Successfully created assignment "${newAssignment.title}" with due date ${newAssignDate}.`
    });
  };

  const handleUpdateStudentSubmissionMarks = (assignmentId: string, roll_no: string, marksVal: number, statusVal: string) => {
    setSubmissionsMap(prev => {
      const currentList = prev[assignmentId] || [];
      const updatedList = currentList.map(item => {
        if (item.roll_no === roll_no) {
          return {
            ...item,
            marks_obtained: Number(marksVal) || 0,
            submission_status: statusVal
          };
        }
        return item;
      });
      const updatedMap = { ...prev, [assignmentId]: updatedList };
      localStorage.setItem('academic_assignment_submissions', JSON.stringify(updatedMap));
      return updatedMap;
    });

    setActionFeedback({
      type: 'success',
      message: `Updated assignment marks and status for student (${roll_no}).`
    });
  };

  // Chat handling
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setStreamingText('');
    setStreamingTraces([]);
    setIsLoading(true);

    api.streamChat(
      'agent2',
      chatInput,
      chatMessages,
      (chunk) => {
        setStreamingText(prev => prev + chunk);
      },
      (trace) => {
        setStreamingTraces(prev => {
          const idx = prev.findIndex(t => t.name === trace.name);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = trace;
            return updated;
          }
          return [...prev, trace];
        });
      },
      (toolCalls, richData) => {
        setChatMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'assistant',
            content: streamingText,
            timestamp: new Date().toLocaleTimeString(),
            toolCalls,
            richData
          }
        ]);
        setStreamingText('');
        setIsLoading(false);
        loadData();
      },
      (err) => {
        console.error(err);
        setIsLoading(false);
      }
    );
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingText]);

  // Attendance summary metrics
  const totalStudents = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'Present').length;
  const odCount = attendance.filter(a => a.status === 'OD').length;
  const absentCount = attendance.filter(a => a.status === 'Absent').length;
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + odCount) / totalStudents) * 100) : 100;

  return (
    <div className="h-full flex flex-col relative bg-paper text-ink overflow-hidden font-ui">
      
      {/* 1. TITLE CARD: Academic Workflow */}
      <div className="mb-6 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-surface to-paper p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <Seal agentId="agent2" icon={BookOpen} size="lg" className="bg-emerald-600 shadow-md shadow-emerald-900/50" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Phase 2
                </span>
                <span className="text-[10px] font-mono text-ink-muted">Academic Administration Engine</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink mt-0.5">
                Academic Workflow
              </h1>
              <p className="text-xs text-ink-muted mt-1 max-w-xl">
                Comprehensive portal for course allocation, faculty administration, daily roll calls, assignments, and grade records.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-paper/60 backdrop-blur border border-border p-2.5 rounded-lg">
            <div className="text-right">
              <div className="text-[10px] font-mono text-ink-muted uppercase">Active Context</div>
              <div className="text-xs font-mono font-bold text-emerald-400">
                {department} • {semester} • {section}
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <div className="text-[10px] font-mono text-ink-muted uppercase">Current Course</div>
              <div className="text-xs font-mono font-bold text-ink">
                {selectedCourse ? selectedCourse.code : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DROPDOWN CONTROLS TOOLBAR (Academic Year, Dept, Semester, Section) */}
      <div className="mb-6 p-4 rounded-lg bg-surface border border-border flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Academic Year Dropdown */}
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
              <Calendar size={11} className="text-emerald-400" /> Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-paper border border-border text-ink text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 hover:border-emerald-500/50 cursor-pointer"
            >
              <option value="2025-2026">2025 - 2026 (Odd)</option>
              <option value="2025-2026-EVEN">2025 - 2026 (Even)</option>
              <option value="2026-2027">2026 - 2027 (Odd)</option>
              <option value="2026-2027-EVEN">2026 - 2027 (Even)</option>
              <option value="2024-2025">2024 - 2025</option>
            </select>
          </div>

          {/* Department Dropdown */}
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
              <Building size={11} className="text-emerald-400" /> Dept
            </label>
            <select
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="bg-paper border border-border text-ink text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 hover:border-emerald-500/50 cursor-pointer font-bold"
            >
              <option value="CCE">CCE (Computer & Comm.)</option>
              <option value="CSE">CSE (Computer Science)</option>
              <option value="ECE">ECE (Electronics & Comm.)</option>
              <option value="EEE">EEE (Electrical & Electronics)</option>
              <option value="IT">IT (Information Tech)</option>
              <option value="MECH">MECH (Mechanical Eng.)</option>
            </select>
          </div>

          {/* Semester Dropdown */}
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
              <GraduationCap size={11} className="text-emerald-400" /> Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="bg-paper border border-border text-ink text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 hover:border-emerald-500/50 cursor-pointer"
            >
              <option value="Sem 1">Sem 1</option>
              <option value="Sem 2">Sem 2</option>
              <option value="Sem 3">Sem 3</option>
              <option value="Sem 4">Sem 4</option>
              <option value="Sem 5">Sem 5</option>
              <option value="Sem 6">Sem 6</option>
              <option value="Sem 7">Sem 7</option>
              <option value="Sem 8">Sem 8</option>
            </select>
          </div>

          {/* Section Dropdown */}
          <div className="flex flex-col">
            <label className="text-[10px] font-mono text-ink-muted uppercase mb-1 flex items-center gap-1">
              <Users size={11} className="text-emerald-400" /> Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="bg-paper border border-border text-ink text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 hover:border-emerald-500/50 cursor-pointer"
            >
              <option value="Section A">Section A</option>
              <option value="Section B">Section B</option>
              <option value="Section C">Section C</option>
              <option value="Section D">Section D</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-1">
            Active Year: {academicYear}
          </Badge>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`mb-4 p-3 rounded-lg flex items-center justify-between text-xs font-mono border ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="hover:opacity-80">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-border/60 mb-6 gap-2">
        {(['attendance', 'assignments', 'marks', 'reminders'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 px-4 text-xs font-mono uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab 
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5 font-bold' 
                : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface/30'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto pr-1 pb-16">
        
        {/* Tab 1: Attendance Grid */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* KPI Summary Block */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Selected Class</div>
                  <div className="font-display text-xl font-bold text-ink mt-1">{department} ({semester})</div>
                </div>
                <Badge variant="accent">{attendancePeriod}</Badge>
              </Card>
              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Total Strength</div>
                  <div className="font-display text-2xl font-bold text-ink mt-1">{totalStudents}</div>
                </div>
                <User className="text-emerald-500" size={20} />
              </Card>
              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Status Breakdown</div>
                  <div className="flex items-center gap-2 mt-1 font-mono text-xs">
                    <span className="text-emerald-400 font-bold">{presentCount} P</span>
                    <span className="text-rose-400 font-bold">{absentCount} A</span>
                    <span className="text-amber-400 font-bold">{odCount} OD</span>
                  </div>
                </div>
                <Users className="text-emerald-500" size={20} />
              </Card>
              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Attendance Rate</div>
                  <div className="font-display text-2xl font-bold text-emerald-400 mt-1">{attendanceRate}%</div>
                </div>
                <div className="text-[10px] font-mono text-ink-muted">Target: 75%</div>
              </Card>
            </div>

            {/* Class Roster Upload Card (Full Width) */}
            <Card className="p-4 bg-surface/40 border-border hover:border-emerald-500/30 transition duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Upload size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase text-ink">Upload Student Namelist File</h3>
                    {attendance.length > 0 && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {attendance.length} Students Loaded
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-muted mt-1 mb-3">
                    Upload a CSV or text file containing your student list (<code className="text-emerald-400 font-mono">roll_no, name, email, class_section, marks</code>). 
                    This will directly populate both the <strong>Attendance Grid</strong> and <strong>Marks Register</strong>.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls, .pdf, .txt"
                      ref={fileInputRef}
                      onChange={handleUploadNamelist}
                      className="hidden"
                      id="namelist-file-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="namelist-file-upload">
                      <span
                        className="cursor-pointer inline-flex items-center justify-center font-medium font-ui rounded-radius-sm transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-paper bg-emerald-600 hover:bg-emerald-700 text-black py-1.5 px-4 text-xs font-semibold gap-1.5 shadow-sm"
                      >
                        {isUploading ? (
                          <>Processing File...</>
                        ) : (
                          <><Upload size={13} /> Select Namelist File</>
                        )}
                      </span>
                    </label>
                    <a
                      href="data:text/csv;charset=utf-8,roll_no,name,email,class_section,marks%0A24CC001,John Doe,john.d@student.edu,CCE,45%0A24CC002,Jane Smith,jane.s@student.edu,CCE,48%0A24CC003,Alex Rivera,alex.r@student.edu,CCE,39"
                      download="student_namelist_template.csv"
                      className="text-[10px] font-mono text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <FileText size={11} /> Download CSV Template
                    </a>
                  </div>
                </div>
              </div>
            </Card>

            {/* Top Attendance Quick Bulk Action Bar & Controls */}
            <div className="flex flex-col gap-3 bg-surface p-4 rounded-lg border border-border">
              {/* Quick Bulk Marking Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">Bulk Attendance Action:</span>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 px-3.5 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <CheckCircle size={13} /> Full Present
                  </button>
                </div>

                <div className="text-[11px] font-mono text-ink-muted">
                  Quickly set status for all enrolled students
                </div>
              </div>

              {/* Date & Register Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div>
                    <label className="text-[10px] font-mono text-ink-muted uppercase block">Date</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="bg-paper border border-border text-ink text-xs font-mono rounded px-2.5 py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-ink-muted uppercase block">Slot</label>
                    <select
                      value={attendancePeriod}
                      onChange={(e) => setAttendancePeriod(e.target.value)}
                      className="bg-paper border border-border text-ink text-xs font-mono rounded px-2.5 py-1"
                    >
                      <option value="09:00 - 10:00">09:00 - 10:00</option>
                      <option value="10:00 - 11:00">10:00 - 11:00</option>
                      <option value="11:15 - 12:15">11:15 - 12:15</option>
                      <option value="14:00 - 15:00">14:00 - 15:00</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleOpenHistory}
                    className="text-xs font-mono border-border text-ink hover:bg-surface/50"
                  >
                    <Calendar size={12} className="mr-1" /> View Saved Register
                  </Button>

                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddStudentModalOpen(true)}
                    className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs font-mono font-semibold gap-1.5"
                  >
                    <Plus size={13} /> Add Student
                  </Button>

                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={generateAttendancePDF}
                    className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs font-mono font-semibold gap-1.5"
                  >
                    <FileText size={12} /> Download PDF
                  </Button>
                  
                  <Button 
                    size="sm"
                    onClick={handleSaveAttendanceBulk}
                    disabled={isSavingAttendance}
                    className="bg-emerald-600 hover:bg-emerald-700 text-black font-semibold text-xs gap-1.5"
                  >
                    {isSavingAttendance ? 'Saving...' : <><Save size={12} /> Save Daily Attendance</>}
                  </Button>
                </div>
              </div>
            </div>

            {/* Attendance Roster Table */}
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border font-mono uppercase text-ink-muted text-[10px]">
                  <tr>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Attendance Status (Dropdown)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-ink-muted">
                        No student records loaded. Upload a namelist file above to populate the attendance roster.
                      </td>
                    </tr>
                  ) : (
                    attendance.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface/40 transition">
                        <td className="p-3 text-emerald-400 font-bold">{row.roll_no}</td>
                        <td className="p-3 font-sans text-ink font-medium">{row.name}</td>
                        <td className="p-3 text-ink-muted text-[11px]">{row.email || `${row.roll_no.toLowerCase()}@student.edu`}</td>
                        <td className="p-3 text-ink-muted">{row.class_section || department}</td>
                        <td className="p-3 text-ink-muted">{row.date || attendanceDate}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={row.status || 'Present'}
                              onChange={(e) => handleStatusChange(row.roll_no, e.target.value, row.date || attendanceDate)}
                              className={`text-xs font-mono font-bold rounded px-3 py-1.5 border focus:outline-none cursor-pointer transition shadow-sm ${
                                row.status === 'Present'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : row.status === 'OD'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                              }`}
                            >
                              <option value="Present" className="bg-paper text-emerald-400 font-mono font-bold">Present</option>
                              <option value="Absent" className="bg-paper text-rose-400 font-mono font-bold">Absent</option>
                              <option value="OD" className="bg-paper text-amber-400 font-mono font-bold">OD (On Duty)</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(row)}
                              title="Edit Student Information"
                              className="p-1.5 rounded bg-surface border border-border text-ink-muted hover:text-emerald-400 hover:border-emerald-500/40 transition shadow-sm"
                            >
                              <Edit size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(row.roll_no)}
                              title="Delete Student Record"
                              className="p-1.5 rounded bg-surface border border-border text-ink-muted hover:text-rose-400 hover:border-rose-500/40 transition shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Tab 2: Assignments Dashboard */}
        {activeTab === 'assignments' && (
          <div className="space-y-6 font-ui">
            
            {/* KPI Summary Block for Assignments */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Active Assignments</div>
                  <div className="font-display text-2xl font-bold text-ink mt-1">{assignments.length}</div>
                </div>
                <BookOpen className="text-emerald-500" size={22} />
              </Card>

              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Class Submissions</div>
                  <div className="font-display text-2xl font-bold text-emerald-400 mt-1">
                    {assignments.reduce((acc, curr) => acc + (curr.submitted_count || 0), 0)} Total
                  </div>
                </div>
                <CheckSquare className="text-emerald-500" size={22} />
              </Card>

              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase">Active Department</div>
                  <div className="font-display text-xl font-bold text-ink mt-1">{department} ({semester})</div>
                </div>
                <Badge variant="accent">Term 2025-26</Badge>
              </Card>
            </div>

            {/* 1. CREATE ASSIGNMENT CARD */}
            <Card className="p-5 bg-surface/60 border border-border hover:border-emerald-500/30 transition">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/60">
                <h2 className="text-xs font-mono font-bold uppercase text-ink flex items-center gap-2">
                  <Plus className="text-emerald-400" size={15} /> Create New Assignment
                </h2>
                <span className="text-[10px] font-mono text-ink-muted">Department: {department}</span>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                      Assignment Title <span className="text-rose-400">*</span>
                    </label>
                    <Input
                      placeholder="e.g. Assignment 3 - Greedy Algorithms"
                      value={newAssignTitle}
                      onChange={e => setNewAssignTitle(e.target.value)}
                      className="text-xs font-sans font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                      Submission / Due Date <span className="text-rose-400">*</span>
                    </label>
                    <Input
                      type="date"
                      value={newAssignDate}
                      onChange={e => setNewAssignDate(e.target.value)}
                      className="text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                      Maximum Marks
                    </label>
                    <Input
                      type="number"
                      value={newAssignMaxMarks}
                      onChange={e => setNewAssignMaxMarks(Number(e.target.value))}
                      placeholder="50"
                      className="text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                    Question Paper (PDF)
                  </label>
                  <label
                    htmlFor="question-pdf-upload"
                    className={`flex items-center gap-3 cursor-pointer rounded-lg border-2 border-dashed px-4 py-3 transition-all select-none
                      ${
                        newAssignPdf
                          ? 'border-emerald-500/60 bg-emerald-500/10'
                          : 'border-border hover:border-emerald-500/40 hover:bg-emerald-500/5'
                      }`}
                  >
                    <input
                      id="question-pdf-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => setNewAssignPdf(e.target.files?.[0] ?? null)}
                    />
                    <FileText size={18} className={newAssignPdf ? 'text-emerald-400' : 'text-ink-muted'} />
                    <span className="text-xs font-mono">
                      {newAssignPdf
                        ? <span className="text-emerald-400 font-bold">{newAssignPdf.name}</span>
                        : <span className="text-ink-muted">Click to upload question paper PDF&hellip;</span>
                      }
                    </span>
                    {newAssignPdf && (
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setNewAssignPdf(null); }}
                        className="ml-auto text-rose-400 hover:text-rose-300 transition text-[11px] font-mono"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-black font-bold text-xs gap-1.5 shadow-sm">
                    <Plus size={14} /> Create Assignment
                  </Button>
                </div>
              </form>
            </Card>

            {/* 2. VIEW ASSIGNMENTS LIST TABLE */}
            <Card className="p-0 overflow-hidden">
              <div className="p-4 bg-surface border-b border-border flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase text-ink flex items-center gap-2">
                  <BookOpen size={15} className="text-emerald-400" /> View Created Assignments
                </h3>
                <span className="text-[10px] font-mono text-ink-muted">{assignments.length} Assignments Scheduled</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-surface/80 border-b border-border font-mono uppercase text-ink-muted text-[10px]">
                  <tr>
                    <th className="p-3">Assignment Title & Description</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Submission Date</th>
                    <th className="p-3">Student Submissions</th>
                    <th className="p-3">Max Marks</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-ink-muted font-sans">
                        No assignments created yet. Use the form above to schedule a new assignment.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((ass) => {
                      const targetId = ass.id || `ass_${ass.title}`;
                      const isSelected = selectedAssignmentId === targetId;

                      return (
                        <tr key={targetId} className={`hover:bg-surface/40 transition ${isSelected ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : ''}`}>
                          <td className="p-3 font-sans">
                            <div className="font-bold text-ink text-xs">{ass.title}</div>
                            <div className="text-[11px] text-ink-muted line-clamp-1">{ass.description || 'Standard assignment problems.'}</div>
                          </td>
                          <td className="p-3 text-ink-muted">{ass.class_section || department}</td>
                          <td className="p-3 text-emerald-400 font-bold">{ass.due_date}</td>
                          <td className="p-3">
                            <span className="font-bold text-emerald-400">{ass.submitted_count || (attendance.length > 0 ? Math.floor(attendance.length * 0.8) : 8)}</span>
                            <span className="text-ink-muted"> / {ass.total_students || (attendance.length > 0 ? attendance.length : 10)}</span>
                          </td>
                          <td className="p-3 font-bold text-ink">{ass.max_marks || 50} pts</td>
                          <td className="p-3">
                            <Badge variant={ass.status === 'Graded' ? 'accent' : 'success'}>
                              {ass.status || 'Active'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant={isSelected ? 'primary' : 'outline'}
                                onClick={() => setSelectedAssignmentId(isSelected ? null : targetId)}
                                className="text-[11px] font-mono py-1 px-3 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-1"
                              >
                                {isSelected ? 'Hide Submissions' : 'View Submissions & Marks'}
                              </Button>
                              {/* Edit icon button */}
                              <button
                                type="button"
                                title="Edit Assignment"
                                onClick={() => handleOpenEditAssignment(ass)}
                                className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 transition group"
                              >
                                <Edit size={14} className="group-hover:scale-110 transition-transform" />
                              </button>
                              {/* Delete icon button */}
                              <button
                                type="button"
                                title="Delete Assignment"
                                onClick={() => handleDeleteAssignment(targetId, ass.title)}
                                className="p-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 transition group"
                              >
                                <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </Card>

            {/* 3. STUDENT SUBMISSIONS & MARKS EVALUATION PANEL */}
            {selectedAssignmentId && (
              <Card className="p-5 border border-emerald-500/40 bg-surface/80 shadow-lg space-y-4 animate-fadeIn">
                {(() => {
                  const targetAss = assignments.find(a => (a.id || `ass_${a.title}`) === selectedAssignmentId) || assignments[0];
                  const currentSubmissions = submissionsMap[selectedAssignmentId] || (
                    (attendance.length > 0 ? attendance : [
                      { roll_no: '24CC001', name: 'John Doe' },
                      { roll_no: '24CC002', name: 'Jane Smith' },
                      { roll_no: '24CC003', name: 'Alex Rivera' }
                    ]).map((st, idx) => ({
                      assignment_id: selectedAssignmentId,
                      roll_no: st.roll_no,
                      name: st.name,
                      submission_date: idx % 4 === 0 ? '2026-08-04 14:30' : '2026-08-04 10:15',
                      submission_status: idx % 5 === 0 ? 'Pending' : idx % 3 === 0 ? 'Graded' : 'Submitted',
                      marks_obtained: idx % 3 === 0 ? Math.floor(Math.random() * 10) + 40 : 0,
                      max_marks: targetAss?.max_marks || 50,
                      file_url: `https://storage.university.edu/submissions/${st.roll_no}_sol.pdf`
                    }))
                  );

                  return (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                              Submissions Register
                            </span>
                            <h3 className="text-sm font-bold text-ink">{targetAss?.title}</h3>
                          </div>
                          <p className="text-[11px] text-ink-muted mt-1">
                            Due Date: <span className="text-emerald-400 font-mono font-bold">{targetAss?.due_date}</span> | Maximum Marks: <span className="font-bold text-ink">{targetAss?.max_marks || 50}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSubmissionsMap(prev => {
                                const updated = { ...prev, [selectedAssignmentId]: currentSubmissions };
                                localStorage.setItem('academic_assignment_submissions', JSON.stringify(updated));
                                return updated;
                              });
                              const doc = new jsPDF();
                              const ass = assignments.find(a => (a.id || `ass_${a.title}`) === selectedAssignmentId);
                              doc.setFontSize(14);
                              doc.setFont('helvetica', 'bold');
                              doc.text('Assignment Submission Report', 14, 18);
                              doc.setFontSize(9);
                              doc.setFont('helvetica', 'normal');
                              doc.text(`Assignment: ${ass?.title || selectedAssignmentId}`, 14, 26);
                              doc.text(`Due Date: ${ass?.due_date || '-'}  |  Max Marks: ${ass?.max_marks || 50}  |  Department: ${department}`, 14, 32);
                              doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
                              autoTable(doc, {
                                startY: 44,
                                head: [['Roll No', 'Student Name', 'Submission Date', 'Status', 'Marks', 'Max Marks', 'Percentage']],
                                body: currentSubmissions.map(s => [
                                  s.roll_no,
                                  s.name,
                                  s.submission_date,
                                  s.submission_status,
                                  s.marks_obtained,
                                  s.max_marks || ass?.max_marks || 50,
                                  `${((s.marks_obtained / (s.max_marks || ass?.max_marks || 50)) * 100).toFixed(1)}%`
                                ]),
                                styles: { fontSize: 8, font: 'helvetica' },
                                headStyles: { fillColor: [16, 185, 129], textColor: 0, fontStyle: 'bold' },
                                alternateRowStyles: { fillColor: [245, 250, 247] },
                              });
                              doc.save(`${ass?.title?.replace(/\s+/g, '_') || 'assignment'}_submissions_report.pdf`);
                              setActionFeedback({ type: 'success', message: 'Report saved and downloaded as PDF!' });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-black px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition shadow-md inline-flex items-center gap-1.5"
                          >
                            <Save size={13} /> Save &amp; Download PDF
                          </button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setSelectedAssignmentId(null)}
                            className="text-xs font-mono"
                          >
                            <X size={13} className="mr-1" /> Close View
                          </Button>
                        </div>
                      </div>

                      {/* Submissions Roster Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-paper border-b border-border uppercase text-ink-muted text-[10px]">
                            <tr>
                              <th className="p-3">Roll No</th>
                              <th className="p-3">Student Name</th>
                              <th className="p-3">Submission Date</th>
                              <th className="p-3">Status</th>
                              <th className="p-3">Marks Obtained</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {currentSubmissions.map((sub, sIdx) => (
                              <tr key={sIdx} className="hover:bg-surface/50 transition">
                                <td className="p-3 text-emerald-400 font-bold">{sub.roll_no}</td>
                                <td className="p-3 font-sans font-medium text-ink">{sub.name}</td>
                                <td className="p-3 text-ink-muted">{sub.submission_date}</td>
                                <td className="p-3">
                                  <select
                                    value={sub.submission_status}
                                    onChange={(e) => handleUpdateStudentSubmissionMarks(selectedAssignmentId, sub.roll_no, sub.marks_obtained, e.target.value)}
                                    className={`text-xs font-mono font-bold rounded px-2.5 py-1 border focus:outline-none cursor-pointer ${
                                      sub.submission_status === 'Graded'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                        : sub.submission_status === 'Submitted'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                    }`}
                                  >
                                    <option value="Submitted" className="bg-paper text-amber-400">Submitted</option>
                                    <option value="Graded" className="bg-paper text-emerald-400">Graded</option>
                                    <option value="Pending" className="bg-paper text-rose-400">Pending</option>
                                    <option value="Late" className="bg-paper text-rose-400">Late</option>
                                  </select>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      value={sub.marks_obtained}
                                      onChange={(e) => handleUpdateStudentSubmissionMarks(selectedAssignmentId, sub.roll_no, Number(e.target.value), 'Graded')}
                                      className="w-16 bg-paper border border-border rounded px-2 py-1 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                                      min={0}
                                      max={sub.max_marks || 50}
                                    />
                                    <span className="text-ink-muted text-[11px]">/ {sub.max_marks || 50}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </Card>
            )}

          </div>
        )}

        {/* Tab 3: Internal Marks */}
        {activeTab === 'marks' && (() => {
          const ciaKeys: ('CIA 1' | 'CIA 2' | 'CIA 3')[] = ['CIA 1', 'CIA 2', 'CIA 3'];

          // Build student roster for active CIA from attendance or existing saved data
          const ciaStudents: any[] = (() => {
            const saved = internalMarks[activeCia];
            if (saved && saved.length > 0) return saved;
            // Auto-populate from attendance roster
            const roster = attendance.length > 0 ? attendance : [];
            return roster.map(st => ({
              roll_no: st.roll_no,
              name: st.name,
              score: '',
              max_score: ciaMaxMarks[activeCia] || 50,
            }));
          })();

          const updateStudentField = (rollNo: string, field: 'score' | 'max_score', value: string | number) => {
            const updated = ciaStudents.map(s =>
              s.roll_no === rollNo ? { ...s, [field]: value } : s
            );
            const newMarks = { ...internalMarks, [activeCia]: updated };
            setInternalMarks(newMarks);
            localStorage.setItem('academic_internal_marks', JSON.stringify(newMarks));
          };

          const handleSetGlobalMax = (val: number) => {
            const updated = ciaStudents.map(s => ({ ...s, max_score: val }));
            const newMarks = { ...internalMarks, [activeCia]: updated };
            const newMaxMap = { ...ciaMaxMarks, [activeCia]: val };
            setInternalMarks(newMarks);
            setCiaMaxMarks(newMaxMap);
            localStorage.setItem('academic_internal_marks', JSON.stringify(newMarks));
            localStorage.setItem('academic_cia_max_marks', JSON.stringify(newMaxMap));
          };

          const handleSaveCia = () => {
            const newMarks = { ...internalMarks, [activeCia]: ciaStudents };
            setInternalMarks(newMarks);
            localStorage.setItem('academic_internal_marks', JSON.stringify(newMarks));

            // Download PDF
            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Internal Marks Register — ${activeCia}`, 14, 18);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Department: ${department}  |  Semester: ${semester}  |  Section: ${section}`, 14, 26);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
            autoTable(doc, {
              startY: 38,
              head: [['Roll No', 'Student Name', 'Score', 'Max Score', 'Percentage']],
              body: ciaStudents.map(s => [
                s.roll_no,
                s.name,
                s.score === '' ? '-' : s.score,
                s.max_score || ciaMaxMarks[activeCia] || 50,
                s.score !== '' && s.max_score
                  ? `${((Number(s.score) / Number(s.max_score)) * 100).toFixed(1)}%`
                  : '-'
              ]),
              styles: { fontSize: 8, font: 'helvetica' },
              headStyles: { fillColor: [16, 185, 129], textColor: 0, fontStyle: 'bold' },
              alternateRowStyles: { fillColor: [245, 250, 247] },
            });
            doc.save(`Internal_Marks_${activeCia.replace(' ', '_')}_${department}.pdf`);
            setActionFeedback({ type: 'success', message: `${activeCia} marks saved and downloaded as PDF!` });
          };

          return (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border">
                <div>
                  <h3 className="text-xs font-mono font-bold uppercase text-ink flex items-center gap-2">
                    <GraduationCap size={15} className="text-emerald-400" /> Internal Marks Register
                  </h3>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {department} — {semester} — {section} &bull; {ciaStudents.length} students
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveCia}
                  className="bg-emerald-600 hover:bg-emerald-700 text-black px-4 py-2 rounded-lg text-xs font-mono font-bold transition shadow-md inline-flex items-center gap-2"
                >
                  <Save size={13} /> Save &amp; Download PDF
                </button>
              </div>

              {/* CIA Tab Switcher */}
              <div className="flex items-center gap-2">
                {ciaKeys.map(cia => (
                  <button
                    key={cia}
                    type="button"
                    onClick={() => setActiveCia(cia)}
                    className={`px-5 py-2 rounded-lg text-xs font-mono font-bold border transition ${
                      activeCia === cia
                        ? 'bg-emerald-600 text-black border-emerald-600 shadow-md'
                        : 'bg-surface text-ink-muted border-border hover:border-emerald-500/50 hover:text-emerald-400'
                    }`}
                  >
                    {cia}
                    {internalMarks[cia]?.length > 0 && (
                      <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        activeCia === cia ? 'bg-black/20 text-black' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {internalMarks[cia].filter(s => s.score !== '' && s.score !== undefined).length}/{internalMarks[cia].length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Global Max Marks Setter */}
              <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono uppercase font-bold text-ink-muted">Set Max Score for all students ({activeCia}):</span>
                  <input
                    type="number"
                    defaultValue={ciaMaxMarks[activeCia] || 50}
                    key={activeCia}
                    onBlur={e => handleSetGlobalMax(Number(e.target.value))}
                    className="w-20 bg-paper border border-border rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 text-center"
                    min={1}
                  />
                  <span className="text-[10px] text-ink-muted font-mono">marks (applies to all rows on blur)</span>
                </div>
              </Card>

              {/* Marks Table */}
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface border-b border-border font-mono uppercase text-ink-muted text-[10px]">
                    <tr>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Assessment</th>
                      <th className="p-3">Score <span className="text-rose-400">*</span></th>
                      <th className="p-3">Max Score <span className="text-rose-400">*</span></th>
                      <th className="p-3">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {ciaStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-ink-muted font-sans">
                          No students found. Add students in the Attendance tab first.
                        </td>
                      </tr>
                    ) : (
                      ciaStudents.map((s, idx) => {
                        const pct = s.score !== '' && s.score !== undefined && Number(s.max_score) > 0
                          ? ((Number(s.score) / Number(s.max_score)) * 100).toFixed(1)
                          : null;
                        return (
                          <tr key={s.roll_no || idx} className="hover:bg-surface/40 transition">
                            <td className="p-3 text-emerald-400 font-bold">{s.roll_no}</td>
                            <td className="p-3 font-sans text-ink font-medium">{s.name}</td>
                            <td className="p-3">
                              <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                                {activeCia}
                              </span>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={s.score}
                                placeholder="—"
                                onChange={e => updateStudentField(s.roll_no, 'score', e.target.value)}
                                className="w-20 bg-paper border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 text-center"
                                min={0}
                                max={s.max_score || ciaMaxMarks[activeCia] || 50}
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={s.max_score}
                                placeholder="—"
                                onChange={e => updateStudentField(s.roll_no, 'max_score', Number(e.target.value))}
                                className="w-20 bg-paper border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-ink focus:outline-none focus:border-emerald-500 text-center"
                                min={1}
                              />
                            </td>
                            <td className="p-3">
                              {pct !== null ? (
                                <span className={`font-bold text-xs ${
                                  Number(pct) >= 75 ? 'text-emerald-400'
                                  : Number(pct) >= 50 ? 'text-amber-400'
                                  : 'text-rose-400'
                                }`}>{pct}%</span>
                              ) : (
                                <span className="text-ink-muted text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          );
        })()}


        {/* Tab 4: Reminders */}
        {activeTab === 'reminders' && (
          <div className="space-y-4">
            {reminders.map((rem) => (
              <Card key={rem.id} className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
                <div>
                  <h4 className="font-sans text-sm font-semibold text-ink">{rem.task}</h4>
                  <span className="text-[10px] font-mono text-ink-muted">Due: {rem.due}</span>
                </div>
                <Badge variant={rem.urgency === 'high' ? 'danger' : 'accent'}>
                  {rem.urgency.toUpperCase()} URGENCY
                </Badge>
              </Card>
            ))}
          </div>
        )}

      </div>

      {/* Floating Chat Drawer */}
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col transition-all duration-300 ${
        isChatOpen ? 'w-96 h-[500px]' : 'w-12 h-12'
      }`}>
        {isChatOpen ? (
          <Card className="h-full flex flex-col shadow-2xl border-emerald-500/30 overflow-hidden bg-surface">
            <div className="p-3 bg-paper border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Seal agentId="agent2" icon={BookOpen} size="sm" className="bg-emerald-600" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">Workflow Assistant</span>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-ink-muted hover:text-ink text-xs font-mono">
                [CLOSE]
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {chatMessages.length === 0 && (
                <div className="text-ink-muted text-center py-12">
                  <BookOpen size={24} className="mx-auto mb-2 text-emerald-500/40" />
                  Ask me questions about attendance rates, assignment submission counts, or internal mark grades.
                </div>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-radius-md p-2.5 ${
                    m.role === 'user' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-paper border border-border text-ink'
                  }`}>
                    {m.content}
                  </div>
                  <span className="text-[8px] text-ink-muted mt-1 font-mono">{m.timestamp}</span>
                </div>
              ))}
              
              {streamingTraces.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 font-mono text-[9px] text-emerald-400/80 bg-emerald-500/5 px-2.5 py-1 rounded">
                  <Play size={8} className="animate-pulse" />
                  <span>Executing {t.name}... Status: {t.status}</span>
                </div>
              ))}

              {streamingText && (
                <div className="flex flex-col items-start">
                  <div className="max-w-[85%] rounded-radius-md p-2.5 bg-paper border border-border text-ink whitespace-pre-wrap">
                    {streamingText}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-paper border-t border-border flex gap-2">
              <Input 
                placeholder="Ask about marks or attendance..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                className="text-xs"
              />
              <Button onClick={handleSendChat} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-black">
                <Send size={12} />
              </Button>
            </div>
          </Card>
        ) : (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition"
            title="Open Workflow Assistant"
          >
            <MessageSquare size={20} />
          </button>
        )}
      </div>

      {/* Attendance History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/85 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 bg-surface border border-border shadow-2xl relative">
            <button 
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-ink-muted hover:text-ink font-mono text-xs"
            >
              [Close]
            </button>
            <h2 className="text-sm font-mono font-bold uppercase text-ink mb-2">Recorded Attendance History</h2>
            <p className="text-[11px] text-ink-muted mb-4">Select a saved period register slot to view its student checklist.</p>
            
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {historyDates.length === 0 ? (
                <div className="text-[11px] font-mono text-ink-muted py-6 text-center border border-dashed border-border rounded">
                  No attendance records stored yet.
                </div>
              ) : (
                historyDates.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-2.5 rounded bg-surface border border-border hover:border-emerald-500/30 hover:bg-emerald-500/5 transition duration-150"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-ink">{item.date}</div>
                      <div className="text-[10px] text-ink-muted font-mono">{item.period}</div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleLoadHistoricSheet(item.date, item.period)}
                      className="text-[10px] font-mono border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 py-1 px-2.5"
                    >
                      Load Sheet
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden font-ui">
            <div className="px-5 py-4 border-b border-border bg-surface/80 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <User className="text-emerald-400" size={18} /> Add New Student Record
              </h3>
              <button 
                onClick={() => setIsAddStudentModalOpen(false)}
                className="text-ink-muted hover:text-ink transition p-1 rounded hover:bg-surface"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Roll Number <span className="text-rose-400">*</span>
                </label>
                <Input 
                  value={newStudentRollNo} 
                  onChange={(e) => setNewStudentRollNo(e.target.value)} 
                  placeholder="e.g. 24CC045"
                  className="py-2 text-xs font-mono font-bold" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Student Name <span className="text-rose-400">*</span>
                </label>
                <Input 
                  value={newStudentName} 
                  onChange={(e) => setNewStudentName(e.target.value)} 
                  placeholder="e.g. Alex Kumar"
                  className="py-2 text-xs font-sans font-medium" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Email Address
                </label>
                <Input 
                  type="email"
                  value={newStudentEmail} 
                  onChange={(e) => setNewStudentEmail(e.target.value)} 
                  placeholder="e.g. alex.k@student.edu (Optional)"
                  className="py-2 text-xs font-mono" 
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Class / Section
                </label>
                <Input 
                  value={newStudentClass} 
                  onChange={(e) => setNewStudentClass(e.target.value)} 
                  placeholder={`e.g. ${department}`}
                  className="py-2 text-xs font-mono" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="py-2 px-4 text-xs font-mono"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-black font-bold py-2 px-5 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Save size={14} /> Save Student
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden font-ui">
            <div className="px-5 py-4 border-b border-border bg-surface/80 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Edit className="text-emerald-400" size={18} /> Edit Student Information
              </h3>
              <button 
                onClick={() => setEditingStudent(null)}
                className="text-ink-muted hover:text-ink transition p-1 rounded hover:bg-surface"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedStudent} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Roll Number <span className="text-rose-400">*</span>
                </label>
                <Input 
                  value={editRollNo} 
                  onChange={(e) => setEditRollNo(e.target.value)} 
                  className="py-2 text-xs font-mono font-bold" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Student Name <span className="text-rose-400">*</span>
                </label>
                <Input 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="py-2 text-xs font-sans font-medium" 
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Email Address
                </label>
                <Input 
                  type="email"
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                  className="py-2 text-xs font-mono" 
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Class / Section
                </label>
                <Input 
                  value={editClass} 
                  onChange={(e) => setEditClass(e.target.value)} 
                  className="py-2 text-xs font-mono" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingStudent(null)}
                  className="py-2 px-4 text-xs font-mono"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-black font-bold py-2 px-5 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Save size={14} /> Update Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden font-ui">
            <div className="px-5 py-4 border-b border-border bg-surface/80 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
                <Edit className="text-amber-400" size={18} /> Edit Assignment
              </h3>
              <button
                onClick={() => setEditingAssignment(null)}
                className="text-ink-muted hover:text-ink transition p-1 rounded hover:bg-surface"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedAssignment} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Assignment Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  value={editAssignTitle}
                  onChange={e => setEditAssignTitle(e.target.value)}
                  className="py-2 text-xs font-sans font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Submission / Due Date <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="date"
                  value={editAssignDate}
                  onChange={e => setEditAssignDate(e.target.value)}
                  className="py-2 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Maximum Marks
                </label>
                <Input
                  type="number"
                  value={editAssignMaxMarks}
                  onChange={e => setEditAssignMaxMarks(Number(e.target.value))}
                  className="py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-ink-muted block mb-1.5 font-bold">
                  Status
                </label>
                <select
                  value={editAssignStatus}
                  onChange={e => setEditAssignStatus(e.target.value)}
                  className="w-full bg-paper border border-border rounded-lg px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-emerald-500"
                >
                  <option value="Active">Active</option>
                  <option value="Graded">Graded</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAssignment(null)}
                  className="py-2 px-4 text-xs font-mono"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 px-5 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Save size={14} /> Update Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
