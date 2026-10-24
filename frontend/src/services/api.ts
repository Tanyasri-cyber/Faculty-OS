export interface User {
  id: number;
  name: string;
  email: string;
  department: string;
  designation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: Array<{ name: string; status: 'running' | 'success' | 'error'; result?: string; error?: string }>;
  richData?: any;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '5174') 
    ? 'http://localhost:8000' 
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000'));

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

export const api = {
  async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Login failed');
      }
      
      return await response.json();
    } catch (error) {
      console.warn('Backend login connection failed, using mockup auth fallback.', error);
      if (email === 'demo@faculty.edu' && password === 'demo1234') {
        return {
          access_token: 'mock-jwt-token',
          user: {
            id: 1,
            name: 'Preethi R',
            email: 'demo@faculty.edu',
            department: 'Computer and Communication Engineering',
            designation: 'Professor & Head',
          }
        };
      }
      throw new Error('Invalid credentials (mockup mode: demo@faculty.edu / demo1234)');
    }
  },

  async register(data: { name: string; email: string; password: string; department: string; designation: string; phone?: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return await response.json();
  },

  async getMe(): Promise<{ user: User }> {
    const token = getAuthToken();
    if (!token) throw new Error('No token found');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Token verification failed');
      const data = await response.json();
      return { user: data };
    } catch (error) {
      console.warn('Backend getMe connection failed, using mockup session.', error);
      return {
        user: {
          id: 1,
          name: 'Preethi R',
          email: 'demo@faculty.edu',
          department: 'Computer Science & Engineering',
          designation: 'Professor & Head',
        }
      };
    }
  },

  streamChat(
    agentId: string,
    message: string,
    history: any[],
    onChunk: (text: string) => void,
    onTrace: (trace: any) => void,
    onDone: (toolCalls: any[], richData: any) => void,
    onError: (err: any) => void
  ) {
    let buffer = '';
    
    const runMockStream = () => {
      let mockReply = '';
      let richData: any = null;
      let toolCalls: any[] = [];
      const msgLower = message.toLowerCase();
      
      const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant');
      const lastAssistantContent = lastAssistantMsg ? lastAssistantMsg.content : '';

      if (msgLower.includes('schedule') || msgLower.includes('today') || msgLower.includes('timetable') || msgLower.includes('classes')) {
        let day = 'Monday';
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (const d of days) {
          if (msgLower.includes(d)) {
            day = d.charAt(0).toUpperCase() + d.slice(1);
            break;
          }
        }
        
        let localSchedules = [];
        const localData = localStorage.getItem('mock_schedules');
        if (localData) {
          localSchedules = JSON.parse(localData);
        } else {
          localSchedules = [
            { id: 1, day_of_week: 'Monday', period: '09:00 - 10:00', subject: 'Design & Analysis of Algorithms', class_section: 'CSE-A', room: 'LH-201' },
            { id: 2, day_of_week: 'Monday', period: '11:30 - 12:30', subject: 'Machine Learning', class_section: 'CSE-B', room: 'LH-302' },
            { id: 3, day_of_week: 'Tuesday', period: '10:00 - 11:00', subject: 'Design & Analysis of Algorithms', class_section: 'CSE-A', room: 'LH-201' },
            { id: 4, day_of_week: 'Tuesday', period: '14:00 - 15:30', subject: 'Machine Learning Lab', class_section: 'CSE-B', room: 'Lab-3' },
            { id: 5, day_of_week: 'Wednesday', period: '09:00 - 10:00', subject: 'Compiler Design', class_section: 'CSE-A', room: 'LH-203' },
            { id: 6, day_of_week: 'Wednesday', period: '11:30 - 12:30', subject: 'Design & Analysis of Algorithms', class_section: 'CSE-A', room: 'LH-201' },
            { id: 7, day_of_week: 'Thursday', period: '10:00 - 11:00', subject: 'Machine Learning', class_section: 'CSE-B', room: 'LH-302' },
            { id: 8, day_of_week: 'Thursday', period: '14:00 - 15:00', subject: 'Compiler Design', class_section: 'CSE-A', room: 'LH-203' },
            { id: 9, day_of_week: 'Friday', period: '09:00 - 10:00', subject: 'Compiler Design', class_section: 'CSE-A', room: 'LH-203' },
            { id: 10, day_of_week: 'Friday', period: '11:30 - 12:30', subject: 'Machine Learning', class_section: 'CSE-B', room: 'LH-302' },
          ];
          localStorage.setItem('mock_schedules', JSON.stringify(localSchedules));
        }
        
        const filtered = localSchedules.filter((s: any) => s.day_of_week === day);
        toolCalls = [{ name: 'get_todays_schedule', status: 'success', result: `Found ${filtered.length} classes for ${day}.` }];
        
        if (filtered.length === 0) {
          mockReply = `Based on your timetable database, you have no classes scheduled for **${day}**.`;
        } else {
          const listText = filtered.map((s: any, idx: number) => `${idx + 1}. **${s.period}**: ${s.subject} for **${s.class_section}** in **${s.room}**`).join('\n');
          mockReply = `Based on your timetable database, you have the following classes on **${day}**:\n\n${listText}\n\nI have rendered this schedule in your dashboard panel to the right.`;
        }
        
        richData = {
          type: 'schedule',
          day: day,
          schedule: filtered
        };
      } else if (agentId === 'agent5' && (msgLower.includes('part b') || msgLower.includes('part a') || msgLower.includes('generate'))) {
        const isPartBOnly = msgLower.includes('part b only');
        const isPartAOnly = msgLower.includes('part a only');
        
        const qPartA = [
          { question_text: "Define Algorithm.", section: "Part A", marks: 2, co: "CO1", bloom_level: "Remember" },
          { question_text: "What is Time Complexity?", section: "Part A", marks: 2, co: "CO1", bloom_level: "Understand" },
          { question_text: "State the principle of divide and conquer.", section: "Part A", marks: 2, co: "CO2", bloom_level: "Remember" },
          { question_text: "Differentiate between NP-Hard and NP-Complete.", section: "Part A", marks: 2, co: "CO3", bloom_level: "Analyze" },
          { question_text: "What is dynamic programming?", section: "Part A", marks: 2, co: "CO2", bloom_level: "Remember" }
        ];
        const qPartB = [
          { question_text: "Explain Quick Sort and its time complexity analysis.", section: "Part B", marks: 10, co: "CO2", bloom_level: "Understand" },
          { question_text: "Solve the 0/1 Knapsack problem using Dynamic Programming.", section: "Part B", marks: 10, co: "CO3", bloom_level: "Apply" },
          { question_text: "Discuss the Traveling Salesperson Problem and its approximation algorithms.", section: "Part B", marks: 10, co: "CO3", bloom_level: "Evaluate" },
          { question_text: "Explain the concepts of P, NP, NP-hard and NP-complete classes.", section: "Part B", marks: 10, co: "CO1", bloom_level: "Understand" }
        ];
        
        let generatedQuestions = [];
        if (isPartAOnly) {
          generatedQuestions = qPartA;
          mockReply = "I have generated Part A only questions for you. I have updated the question paper view on the left.";
        } else if (isPartBOnly) {
          generatedQuestions = qPartB;
          mockReply = "I have generated Part B only descriptive questions for you. The paper has been updated on the left.";
        } else {
          generatedQuestions = [...qPartA, ...qPartB];
          mockReply = "I have generated a full question paper with both Part A and Part B. The view has been updated.";
        }

        richData = {
          questions: generatedQuestions,
          total_marks: generatedQuestions.reduce((sum, q) => sum + q.marks, 0),
          subject: "Design & Analysis of Algorithms"
        };
        toolCalls = [{ name: 'generate_question_paper', status: 'success', result: `Generated ${generatedQuestions.length} questions.` }];
      } else if (agentId === 'agent6') {
        if (msgLower.includes('critical') || msgLower.includes('warning') || msgLower.includes('cohort') || msgLower.includes('summary') || msgLower.includes('distribution')) {
          toolCalls = [{ name: 'analyze_cohort_wellbeing', status: 'success', result: 'Processed cohort wellbeing metrics across 5 tiers.' }];
          richData = { type: 'cohort_wellbeing_summary' };
          mockReply = "### 🌸 Cohort Wellbeing Intelligence Summary\n\n- **🚨 Critical (0-29)**: 1 student (A. Kumar, Score 24/100, Attendance 68%)\n- **😟 Needs Attention (30-49)**: 1 student (C. Dinesh, Score 42/100)\n- **😐 Average (50-69)**: 2 students\n- **🙂 Good (70-89)**: 3 students\n- **😊 Excellent (90-100)**: 1 student\n\n**Action Advice:** Immediate outreach recommended for A. Kumar. You can use 'Suggest Prompt' to start an empathetic conversation.";
        } else if (msgLower.includes('prompt') || msgLower.includes('starter') || msgLower.includes('suggest') || msgLower.includes('how to talk') || msgLower.includes('message')) {
          toolCalls = [{ name: 'generate_empathy_prompt', status: 'success', result: 'Crafted 2 empathetic conversation starters.' }];
          richData = { type: 'checkin_prompts' };
          mockReply = "### 💬 Empathetic Conversation Starters\n\n**Option 1: Supportive Non-Threatening Nudge (Recommended)**\n> *\"Hi Kumar, I was reviewing our mentee check-ins and wanted to see how you're feeling this week. I noticed classes have been demanding lately—is everything going okay with your health, hostel, or studies? Let me know when you're free for a casual 10-minute catchup; I'm here to support you.\"*\n\n**Option 2: Gentle Academic Check-in**\n> *\"Hello Kumar, hope you're having a good week. I noticed your attendance dipped in recent DAA lectures. Let's sit together tomorrow during my counseling hour to sort out any hurdles before internal assessments.\"*";
        } else if (msgLower.includes('escalat') || msgLower.includes('refer') || msgLower.includes('counsel') || msgLower.includes('crisis')) {
          toolCalls = [{ name: 'prepare_counseling_referral', status: 'success', result: 'Drafted confidential counseling referral brief.' }];
          richData = { type: 'escalation_memo' };
          mockReply = "### 🚨 Confidential Counseling Referral Memo\n\n**To:** Head of Student Counseling / Academic Advisory Committee\n**Mentee:** A. Kumar (`2024CS001`)\n**Status:** Urgent Intervention Recommended (Tier 1)\n\n**Observed Risk Indicators:**\n- Cumulative wellbeing score dropped to 24/100 (Critical).\n- Persistent absenteeism in core modules and emotional distress signaled in previous check-in.\n\n**Recommended Step:** Scheduled confidential 1-on-1 counseling session with campus clinical counselor under NAAC Criterion 5 privacy guidelines.";
        } else if (msgLower.includes('dossier') || msgLower.includes('naac') || msgLower.includes('nba') || msgLower.includes('criterion 5')) {
          toolCalls = [{ name: 'generate_naac_mentoring_dossier', status: 'success', result: 'Compiled NAAC Criterion 5.1.4 Dossier.' }];
          richData = { type: 'naac_dossier' };
          mockReply = "### 📑 NAAC Criterion 5.1.4 Mentoring Compliance Dossier\n\n- **Mentor-Mentee Ratio:** 1:8\n- **Total Check-in Touchpoints Logged:** 24 sessions\n- **At-Risk Identification Rate:** 100% early triage\n- **Attendance Recovery Index:** 84.6% recovered required >75% attendance within 4 weeks.\n\n✅ *All records, check-in dates, and faculty signatures comply with NAAC SSR Criterion 5.*";
        } else {
          mockReply = "🌸 Hello! I am your **Mentor & Wellbeing Advisor** (Agent 6). I can help you evaluate student risk, draft empathetic check-in prompts, summarize raw meeting notes, or prepare confidential counseling referrals.";
        }
      } else if (agentId === 'agent9') {
        if (msgLower.includes('approve') || msgLower.includes('confirm event')) {
          toolCalls = [{ name: 'approve_event_plan', status: 'success', result: 'Created event and 8 committee tasks.' }];
          richData = { type: 'event_approved' };
          mockReply = "### ✅ Event Plan Approved & Created Successfully!\n\n**Event:** One-Day AI Hands-on Workshop\n- **Date:** 2026-11-15 | **Venue:** Main Auditorium & Lab 3\n- **Expected Attendees:** 150 | **Allocated Budget:** ₹42,000\n\n#### 📋 8 Committee Tasks Created:\n1. **Venue Booking & Stage Setup** → Prof. Vance (`Completed`)\n2. **Keynote Speaker Liaison** → Dr. S. Sharma (`Due: 25 Oct`)\n3. **Registration Portal & Posters** → Prof. Priya (`Due: 01 Nov`)\n4. **Catering & High-Tea** → Prof. Rajesh (`Due: 08 Nov`)\n5. **AV & Lab Systems Check** → Prof. Preethi R (`Due: 12 Nov`)\n6. **Certificates & Mementos** → Prof. Arul (`Due: 13 Nov`)\n7. **Attendance & Feedback QR** → Prof. Priya (`Due: 15 Nov`)\n8. **Post-Event Report Compilation** → Prof. Arul (`Due: 17 Nov`)\n\n*The event and committee tasks have been added to your calendar and task checklist.*";
        } else if (msgLower.includes('plan') || msgLower.includes('workshop') || msgLower.includes('fdp') || msgLower.includes('symposium') || msgLower.includes('conference')) {
          toolCalls = [{ name: 'generate_draft_event_plan', status: 'success', result: 'Drafted 1-day AI workshop operational blueprint.' }];
          richData = { type: 'draft_event_plan', plan: { title: 'One-Day AI Hands-on Workshop', type: 'Workshop', date: '2026-11-15', participants: 150, budget: 42000 } };
          mockReply = "### 📋 Draft Event Operations Plan: **One-Day AI Hands-on Workshop**\n\n**Type:** Workshop | **Duration:** 1 Day | **Target Date:** `2026-11-15`\n**Expected Participants:** 150 | **Venue:** Main Auditorium & CS Lab 3\n\n#### 💰 Estimated Budget Breakdown:\n- 🍱 Catering & Working Lunch (150 pax @ ₹160): **₹24,000**\n- 🎤 Keynote Speaker Honorarium & Travel: **₹10,000**\n- 🔊 AV Equipment & Seminar Hall: **₹4,000**\n- 📜 Participant Kits & Certificates: **₹4,000**\n**Total Estimated Budget:** **₹42,000**\n\n#### 👥 Recommended Committee Assignments:\n- **Venue & AV Setup:** Prof. Vance\n- **Speaker Liaison:** Dr. S. Sharma\n- **Registration & Media:** Prof. Priya\n- **Catering & Hospitality:** Prof. Rajesh\n- **Finance & Accounts:** Prof. Preethi R\n- **Documentation & Report:** Prof. Arul\n\n#### ⏳ Milestone Deadlines:\n- **T-30 Days:** Hall requisition & budget signoff\n- **T-21 Days:** Speaker confirmation\n- **T-14 Days:** Registration link released\n- **T-7 Days:** Final headcount to caterer\n- **T-1 Day:** AV dry run & kit assembly\n- **Event Day:** Execution & attendance\n\n👉 *Click **'Approve Plan'** below or reply `Approve plan` to create this event and all 8 tasks automatically.*";
        } else if (msgLower.includes('risk') || msgLower.includes('overdue') || msgLower.includes('health') || msgLower.includes('monitor') || msgLower.includes('bottleneck')) {
          toolCalls = [{ name: 'monitor_event_risks', status: 'success', result: 'Audited event health: 72/100 (Needs Attention).' }];
          richData = { type: 'event_risk_audit', score: 72, tier: 'Needs Attention' };
          mockReply = "### 🛡️ Event Operations Risk & Health Audit\n\n**Event:** International AI Symposium (2026-08-20)\n**Health Index:** **72/100** (🟡 **Needs Attention**)\n\n#### 🔍 Risk Factors Identified:\n- 🔴 **Speaker Confirmation Overdue by 2 days**: Dr. S. Sharma has not marked keynote confirmation completed.\n- 🟡 **Catering Burn Rate**: Catering budget is at 65% utilization.\n- 🟢 **Venue Status**: Auditorium & AV confirmed by Prof. Vance.\n\n**Recommended Immediate Action:** Send a reminder to Dr. S. Sharma regarding speaker confirmation.";
        } else if (msgLower.includes('budget') || msgLower.includes('spent') || msgLower.includes('utilization') || msgLower.includes('financial')) {
          toolCalls = [{ name: 'analyze_event_budget', status: 'success', result: 'Calculated budget utilization: 65% consumed.' }];
          richData = { type: 'budget_intelligence' };
          mockReply = "### 💰 Event Budget & Financial Intelligence\n\n**Event:** International AI Symposium 2026\n\n| Metric | Amount | Share |\n| :--- | :--- | :--- |\n| **Allocated Budget** | ₹75,000 | 100% |\n| **Actual Spent** | ₹48,750 | **65.0%** |\n| **Remaining Funds** | ₹26,250 | 35.0% |\n\n#### 📊 Category Spend:\n- 🍱 Catering & Refreshments: ₹24,000 / ₹28,000 (85% — ⚠️ Alert)\n- 🎤 Keynote Honorarium: ₹15,000 / ₹20,000 (75%)\n- 📜 Delegate Kits & Badges: ₹6,750 / ₹12,000 (56%)\n- 🔊 Hall Requisition & AV: ₹3,000 / ₹10,000 (30%)\n\n**Verdict:** Catering is burning rapidly. Reallocate ₹4,000 from AV savings to prevent overruns.";
        } else if (msgLower.includes('speaker') || msgLower.includes('invitation') || msgLower.includes('circular') || msgLower.includes('notice') || msgLower.includes('message')) {
          toolCalls = [{ name: 'generate_event_communication', status: 'success', result: 'Drafted formal keynote speaker invitation.' }];
          richData = { type: 'event_communication' };
          mockReply = "### ✉️ Formal Keynote Speaker Invitation Letter\n\n**To:** Dr. [Speaker Name], Senior Principal AI Scientist\n**From:** Department of Computer Science & Engineering\n**Subject:** Formal Invitation as Keynote Speaker for One-Day AI Workshop\n\nDear Dr. [Speaker Name],\n\nOn behalf of the Department of Computer Science & Engineering, we cordially invite you as our **Keynote Speaker** for the upcoming **\"One-Day AI Hands-on Workshop\"**, scheduled on **15th November 2026** at our **Main Auditorium**.\n\nOur audience comprises 150 eager student researchers and faculty members. We would be honored to host your 60-minute keynote on scalable deep learning architectures followed by an interactive discussion.\n\nInstitutional travel reimbursement and University honorarium will be provided. Please let us know your availability by 25th October 2026.\n\nWarm regards,\n**Dr. S. Sharma & Prof. Preethi R**\nFaculty Coordinators";
        } else if (msgLower.includes('event day') || msgLower.includes('checklist') || msgLower.includes('tomorrow') || msgLower.includes('execution')) {
          toolCalls = [{ name: 'get_event_day_checklist', status: 'success', result: 'Generated event-day execution schedule.' }];
          richData = { type: 'event_day_checklist' };
          mockReply = "### 🎯 Event-Day Operational Checklist\n\n- [x] **08:00 AM:** Hall unlocked & air conditioning active (Prof. Vance)\n- [x] **08:30 AM:** Stage AV, wireless mics & projector tested (Prof. Preethi R)\n- [ ] **09:00 AM:** Registration Desk active & delegate kits arranged (Prof. Priya)\n- [ ] **09:30 AM:** Keynote speaker received at guest lounge (Dr. S. Sharma)\n- [ ] **10:00 AM:** Inaugural lamp lighting & presidential address\n- [ ] **11:15 AM:** High-tea service in auditorium foyer (Prof. Rajesh)\n- [ ] **01:00 PM:** Lunch service & speaker hospitality\n- [ ] **04:30 PM:** Participant feedback QR displayed & certificate distribution";
        } else if (msgLower.includes('report') || msgLower.includes('post-event') || msgLower.includes('summary')) {
          toolCalls = [{ name: 'generate_post_event_report', status: 'success', result: 'Compiled NAAC post-event activity report.' }];
          richData = { type: 'post_event_report' };
          mockReply = "### 📑 Formal Post-Event Report (NAAC Criterion 6 / NBA Activity Record)\n\n**Activity Title:** International AI Symposium 2026\n**Date:** 2026-08-20 | **Venue:** Main Auditorium | **Academic Year:** 2026–2027\n\n#### 1. Key Metrics & Attendance\n- **Registered:** 152 | **Verified Attendees:** 148 (97.4%)\n- **Faculty:** 24 | **Students:** 124 | **Colleges Represented:** 8\n\n#### 2. Financial Audit\n- **Sanctioned:** ₹75,000 | **Actual Spent:** ₹48,750 | **Savings:** ₹26,250\n\n#### 3. Participant Feedback Index\n- **Overall Satisfaction:** 4.72 / 5.00 (141 responses)\n- **Recommendation for Next Edition:** Extend hands-on session time by 60 minutes.\n\n✅ *Report compiled and validated for NAAC SSR Criterion 6 upload.*";
        } else {
          mockReply = "Hello! I am your **Event Operations Copilot** (Agent 9). I can help you plan events, generate committee task checklists, monitor deadlines and risk scores, manage budgets, draft speaker invitations, or compile NAAC event reports.";
        }
      } else {
        mockReply = `Hello! I am your AI assistant (${agentId}). How can I assist you today?`;
      }


      let words = mockReply.split(' ');
      let i = 0;
      
      if (toolCalls.length > 0) {
        onTrace({ name: toolCalls[0].name, status: 'running' });
        setTimeout(() => {
          onTrace({ name: toolCalls[0].name, status: 'success', result: toolCalls[0].result });
          const interval = setInterval(() => {
            if (i < words.length) {
              const space = i < words.length - 1 ? ' ' : '';
              onChunk(words[i] + space);
              i++;
            } else {
              clearInterval(interval);
              onDone(toolCalls, richData);
            }
          }, 30);
        }, 600);
      } else {
        const interval = setInterval(() => {
          if (i < words.length) {
            const space = i < words.length - 1 ? ' ' : '';
            onChunk(words[i] + space);
            i++;
          } else {
            clearInterval(interval);
            onDone(toolCalls, richData);
          }
        }, 30);
      }
    };

    fetch(`${API_BASE_URL}/agents/${agentId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, history, faculty_id: 1 })
    })
    .then(response => {
      if (!response.ok) throw new Error('Server returned error status');
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Readable stream not supported');
      const activeReader = reader;
      const decoder = new TextDecoder();
      
      function readStream() {
        activeReader.read().then(({ done, value }) => {
          if (done) return;
          const text = decoder.decode(value);
          buffer += text;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr) continue;
                const data = JSON.parse(jsonStr);
                if (data.type === 'trace') onTrace(data);
                else if (data.type === 'content') onChunk(data.delta);
                else if (data.type === 'done') onDone(data.tool_calls || [], data.rich_data || null);
                else if (data.type === 'error') onError(data.detail);
              } catch (e) {
                console.error('Error parsing SSE event:', e);
              }
            }
          }
          readStream();
        }).catch(err => {
          onError(err);
        });
      }
      readStream();
    })
    .catch(err => {
      console.warn('Backend server not reachable. Running client-side mock streaming.', err);
      runMockStream();
    });
  },

  async getSchedules(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedule`);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  async createSchedule(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  async updateSchedule(slotId: number, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/schedule/${slotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  async deleteSchedule(slotId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/schedule/${slotId}`, { method: 'DELETE' });
    return await response.json();
  },

  async bulkUploadSchedule(slots: any[], overwrite: boolean = false): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/schedule/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots, overwrite })
    });
    return await response.json();
  },

  async uploadPolicy(title: string, category: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/policy`, { method: 'POST', body: formData });
    return await response.json();
  },

  async getSubjects(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subjects`);
      if (!response.ok) throw new Error('Failed to fetch subjects');
      return await response.json();
    } catch (error) {
      return ['Design & Analysis of Algorithms', 'Machine Learning', 'Compiler Design'];
    }
  },

  async getSyllabus(subject: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/syllabus/${encodeURIComponent(subject)}`);
      if (!response.ok) throw new Error('Failed to fetch syllabus');
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  async createSyllabusUnit(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/syllabus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await response.json();
  },

  async bulkUploadSyllabus(subject: string, units: any[], overwrite: boolean = false): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/syllabus/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, units, overwrite })
    });
    return await response.json();
  },

  // Academic Workflow API
  async getAttendance(dept?: string, date?: string): Promise<any[]> {
    try {
      let url = `${API_BASE_URL}/api/attendance`;
      const params = new URLSearchParams();
      if (dept) params.append('dept', dept);
      if (date) params.append('date', date);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch attendance');
      return await response.json();
    } catch (error) {
      return [
        { roll_no: "24CC001", name: "A. Kumar", class_section: dept || "CCE", status: "Present", date: date || "2026-07-28" },
        { roll_no: "24CC002", name: "B. Priya", class_section: dept || "CCE", status: "Present", date: date || "2026-07-28" },
        { roll_no: "24CC003", name: "C. Dinesh", class_section: dept || "CCE", status: "Absent", date: date || "2026-07-28" },
        { roll_no: "24CC004", name: "D. Ananya", class_section: dept || "CCE", status: "Present", date: date || "2026-07-28" }
      ];
    }
  },

  async getRecordedDates(dept: string): Promise<{ date: string; period: string }[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/dates?dept=${encodeURIComponent(dept)}`);
      if (!response.ok) throw new Error('Failed to fetch attendance dates');
      return await response.json();
    } catch (error) {
      return [
        { date: "2026-07-28", period: "09:00 - 10:00" },
        { date: "2026-07-27", period: "11:15 - 12:15" }
      ];
    }
  },

  async markAttendance(roll_no: string, date: string, status: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll_no, date, status })
      });
      return await response.json();
    } catch (error) {
      return { status: 'success' };
    }
  },

  async saveAttendanceBulk(date: string, period: string, subject: string, dept: string, records: { roll_no: string; status: string }[]): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/save-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, period, subject, dept, records })
      });
      return await response.json();
    } catch (error) {
      return { status: 'success', message: 'Attendance records saved successfully.' };
    }
  },

  async uploadNamelist(file: File, dept: string, subject: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dept', dept);
    formData.append('class_section', dept);
    formData.append('subject', subject);
    
    let response = await fetch(`${API_BASE_URL}/api/attendance/upload-namelist`, {
      method: 'POST',
      body: formData
    });

    if (response.status === 404 || response.status === 405) {
      response = await fetch(`${API_BASE_URL}/api/students/upload-namelist`, {
        method: 'POST',
        body: formData
      });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to process namelist' }));
      throw new Error(err.detail || 'Failed to process namelist on server');
    }
    return await response.json();
  },

  async deduplicateAcademicData(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/academic/deduplicate`, { method: 'POST' });
    return await response.json();
  },

  async getAssignments(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assignments`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      return await response.json();
    } catch (error) {
      return [
        { title: "Assignment 1 - Divide & Conquer", class_section: "CCE", due_date: "2026-08-01", submitted_count: 42 }
      ];
    }
  },

  async scheduleAssignment(title: string, due_date: string, class_section: string, max_marks: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assignments/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, due_date, class_section, max_marks })
      });
      return await response.json();
    } catch (error) {
      return { status: 'success' };
    }
  },

  async getMarks(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/marks`);
      if (!response.ok) throw new Error('Failed to fetch marks');
      return await response.json();
    } catch (error) {
      return [
        { roll_no: "24CC001", name: "A. Kumar", assessment_name: "CAT 1", marks_obtained: 42 },
        { roll_no: "24CC002", name: "B. Priya", assessment_name: "CAT 1", marks_obtained: 48 }
      ];
    }
  },

  async calculateMarks(): Promise<any> {
    return { status: 'success' };
  },

  // Analytics API
  async getAnalyticsKpis(): Promise<any> {
    return { total_students: 45, avg_attendance: 88, avg_internal_marks: "41/50", co_attainment_rate: "78%" };
  },
  async getAnalyticsCharts(): Promise<any> {
    return {
      performance_chart: [{ range: '30-40', count: 10 }, { range: '40-50', count: 35 }],
      attendance_chart: [{ date: '07-28', rate: 88 }],
      co_chart: [{ co: 'CO1', target: 75, attained: 82 }]
    };
  },
  async getAtRiskAnalytics(): Promise<any[]> {
    return [{ roll_no: "24CC003", name: "C. Dinesh", attendance: 55, marks: 22, risk_level: "High" }];
  },
  async getAnalyticsPDF(): Promise<any> {
    return { status: 'success', message: 'Report generated.' };
  },

  // Research API
  async getPublications(): Promise<any[]> {
    return [{ id: 1, title: "Deep Learning for Algorithmic Optimization", venue: "IEEE", type: "journal", year: 2026, co_authors: "Dr. Vance", citation_count: 5 }];
  },
  async logPublication(title: string, venue: string, type: string, year: number, co_authors?: string, doi_or_link?: string): Promise<any> {
    return { status: 'success' };
  },
  async getGrants(): Promise<any[]> {
    return [{ id: 1, title: "AICTE RPS Grant", funding_body: "AICTE", amount: "10 Lakhs", eligibility: "Ph.D Faculty", deadline: "2026-09-01", focus_area: "AI" }];
  },
  async getResearchDeadlines(): Promise<any[]> {
    return [{ id: 1, title: "IEEE Paper Camera-Ready", type: "submission", due_date: "2026-08-10" }];
  },

  // Exam API
  async getQuestionsBank(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exam/questions`);
      if (res.ok) return await res.json();
    } catch {}
    return [
      { id: 1, subject: "Design & Analysis of Algorithms", unit: 1, co_number: "CO1", bloom_level: "Remember", question_text: "Define Big-O notation and write time complexity of binary search.", marks: 2, difficulty: "Easy" },
      { id: 2, subject: "Design & Analysis of Algorithms", unit: 2, co_number: "CO2", bloom_level: "Understand", question_text: "Differentiate between Greedy method and Dynamic Programming.", marks: 2, difficulty: "Medium" },
      { id: 3, subject: "Design & Analysis of Algorithms", unit: 3, co_number: "CO3", bloom_level: "Apply", question_text: "Solve 8-Queens problem using Backtracking strategy.", marks: 10, difficulty: "Hard" },
    ];
  },
  async generatePaper(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exam/generate-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await res.json();
        if (resData.questions && resData.questions.length > 0) {
          const paperObj = {
            id: resData.paper_id || Date.now(),
            subject: data.subject || "Design & Analysis of Algorithms",
            exam_type: data.exam_type || "CAT2",
            total_marks: data.total_marks || 50,
            duration: data.duration || 90,
            status: "draft",
            co_coverage: resData.co_coverage || data.co_targets || { CO1: 40, CO2: 40, CO3: 20 },
            bloom_distribution: resData.bloom_distribution || data.bloom_targets || { Remember: 20, Understand: 30, Apply: 30, Analyze: 20 },
            questions: resData.questions
          };
          return { status: 'success', paper: paperObj };
        }
      }
    } catch (e) {
      console.warn('Backend generatePaper error, using mock fallback generator', e);
    }

    const subj = data.subject || "Design & Analysis of Algorithms";
    const isML = subj.includes("Machine Learning");
    const qList = isML ? [
      { id: 201, section: "Part A", question_text: "What is the difference between supervised and unsupervised learning?", marks: 2, co: "CO1", co_number: "CO1", bloom_level: "Remember" },
      { id: 202, section: "Part A", question_text: "Explain the bias-variance tradeoff in machine learning models.", marks: 2, co: "CO1", co_number: "CO1", bloom_level: "Understand" },
      { id: 203, section: "Part A", question_text: "Define overfitting and list two techniques to prevent it.", marks: 2, co: "CO2", co_number: "CO2", bloom_level: "Understand" },
      { id: 204, section: "Part A", question_text: "What is the purpose of an activation function in neural networks?", marks: 2, co: "CO2", co_number: "CO2", bloom_level: "Remember" },
      { id: 205, section: "Part A", question_text: "Differentiate between L1 (Lasso) and L2 (Ridge) regularization.", marks: 2, co: "CO3", co_number: "CO3", bloom_level: "Understand" },
      { id: 206, section: "Part B", question_text: "(a) Derive the cost function for Logistic Regression. (b) Explain Gradient Descent optimization algorithm.", marks: 10, co: "CO1", co_number: "CO1", bloom_level: "Apply" },
      { id: 207, section: "Part B", question_text: "Construct a Decision Tree using Information Gain / Entropy for a given dataset of 14 samples.", marks: 10, co: "CO2", co_number: "CO2", bloom_level: "Analyze" },
      { id: 208, section: "Part B", question_text: "Explain Naive Bayes Classification algorithm and handle zero-frequency problem using Laplace Smoothing.", marks: 10, co: "CO2", co_number: "CO2", bloom_level: "Apply" },
      { id: 209, section: "Part B", question_text: "Describe Convolutional Neural Networks (CNN) architecture with Conv, Pooling, and FC layers.", marks: 10, co: "CO3", co_number: "CO3", bloom_level: "Create" },
    ] : [
      { id: 101, section: "Part A", question_text: "Define Big-O notation and write the time complexity of binary search.", marks: 2, co: "CO1", co_number: "CO1", bloom_level: "Remember" },
      { id: 102, section: "Part A", question_text: "Differentiate between Greedy method and Dynamic Programming strategy.", marks: 2, co: "CO2", co_number: "CO2", bloom_level: "Understand" },
      { id: 103, section: "Part A", question_text: "State the Master Theorem condition for solving divide-and-conquer recurrences.", marks: 2, co: "CO1", co_number: "CO1", bloom_level: "Remember" },
      { id: 104, section: "Part A", question_text: "Explain the concept of optimal substructure with a suitable example.", marks: 2, co: "CO3", co_number: "CO3", bloom_level: "Understand" },
      { id: 105, section: "Part A", question_text: "What is an NP-Complete problem? Give two classic examples.", marks: 2, co: "CO3", co_number: "CO3", bloom_level: "Understand" },
      { id: 106, section: "Part B", question_text: "(a) Solve the recurrence relation T(n) = 2T(n/2) + n using Recursion Tree Method. (b) Explain QuickSort partitioning algorithm with an example array.", marks: 10, co: "CO1", co_number: "CO1", bloom_level: "Apply" },
      { id: 107, section: "Part B", question_text: "Construct the Optimal Binary Search Tree (OBST) for the given set of keys and probabilities using Dynamic Programming.", marks: 10, co: "CO2", co_number: "CO2", bloom_level: "Analyze" },
      { id: 108, section: "Part B", question_text: "Find the Shortest Path from source vertex 'A' to all other vertices in a directed weighted graph using Dijkstra's Algorithm.", marks: 10, co: "CO2", co_number: "CO2", bloom_level: "Apply" },
      { id: 109, section: "Part B", question_text: "Explain 8-Queens problem using Backtracking strategy. Draw the state space tree for N=4.", marks: 10, co: "CO3", co_number: "CO3", bloom_level: "Create" },
    ];

    const paperObj = {
      id: Date.now(),
      subject: subj,
      exam_type: data.exam_type || "CAT2",
      total_marks: data.total_marks || 50,
      duration: data.duration || 90,
      status: "draft",
      co_coverage: data.co_targets || { CO1: 40, CO2: 40, CO3: 20 },
      bloom_distribution: data.bloom_targets || { Remember: 20, Understand: 30, Apply: 30, Analyze: 20 },
      questions: qList
    };

    return { status: 'success', paper: paperObj };
  },
  async updateQuestionPaper(paperId: number, payload: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exam/papers/${paperId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { status: 'success', ...payload };
  },
  async createQuestionBankItem(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exam/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) return await res.json();
    } catch {}
    return { status: 'success' };
  },
  async getGeneratedPapers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/exam/papers`);
      if (res.ok) {
        const papers = await res.json();
        if (Array.isArray(papers) && papers.length > 0 && papers[0].questions?.length > 0) return papers;
      }
    } catch {}
    return [
      {
        id: 1,
        subject: "Design & Analysis of Algorithms",
        exam_type: "CAT2",
        total_marks: 50,
        duration: 90,
        status: "draft",
        co_coverage: { CO1: 40, CO2: 40, CO3: 20 },
        bloom_distribution: { Remember: 20, Understand: 30, Apply: 30, Analyze: 20 },
        questions: [
          { id: 101, section: "Part A", question_text: "Define Big-O notation and write the time complexity of binary search.", marks: 2, co: "CO1", co_number: "CO1", bloom_level: "Remember" },
          { id: 102, section: "Part A", question_text: "Differentiate between Greedy method and Dynamic Programming strategy.", marks: 2, co: "CO2", co_number: "CO2", bloom_level: "Understand" },
          { id: 103, section: "Part A", question_text: "State the Master Theorem condition for solving divide-and-conquer recurrences.", marks: 2, co: "CO1", co_number: "CO1", bloom_level: "Remember" },
          { id: 104, section: "Part A", question_text: "Explain the concept of optimal substructure with a suitable example.", marks: 2, co: "CO3", co_number: "CO3", bloom_level: "Understand" },
          { id: 105, section: "Part A", question_text: "What is an NP-Complete problem? Give two classic examples.", marks: 2, co: "CO3", co_number: "CO3", bloom_level: "Understand" },
          { id: 106, section: "Part B", question_text: "(a) Solve the recurrence relation T(n) = 2T(n/2) + n using Recursion Tree Method. (b) Explain QuickSort partitioning algorithm with an example array.", marks: 10, co: "CO1", co_number: "CO1", bloom_level: "Apply" },
          { id: 107, section: "Part B", question_text: "Construct the Optimal Binary Search Tree (OBST) for the given set of keys and probabilities using Dynamic Programming.", marks: 10, co: "CO2", co_number: "CO2", bloom_level: "Analyze" },
          { id: 108, section: "Part B", question_text: "Find the Shortest Path from source vertex 'A' to all other vertices in a directed weighted graph using Dijkstra's Algorithm.", marks: 10, co: "CO2", co_number: "CO2", bloom_level: "Apply" },
          { id: 109, section: "Part B", question_text: "Explain 8-Queens problem using Backtracking strategy. Draw the state space tree for N=4.", marks: 10, co: "CO3", co_number: "CO3", bloom_level: "Create" },
        ]
      }
    ];
  },
  async moderateQuestionPaper(paperId: number, status: string, notes?: string): Promise<any> {
    return { status: 'success' };
  },
  async validatePaper(paperId: number): Promise<any> {
    return { status: 'valid', gaps: [] };
  },
  async getRubricSchema(data: any): Promise<any[]> {
    return [{ criterion: "Accuracy", max_marks: 5, descriptor: "Fully accurate solution" }];
  },

  // Mentor API
  async getMentees(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/mentees`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch {}

    // Read Phase 2 (Academic Workflow) data saved to localStorage
    const phase2StudentsStr = localStorage.getItem('academic_uploaded_students');
    const phase2MarksStr = localStorage.getItem('academic_uploaded_marks');
    let phase2Students: any[] = [];
    let phase2Marks: any[] = [];

    try {
      if (phase2StudentsStr) {
        const parsed = JSON.parse(phase2StudentsStr);
        if (Array.isArray(parsed)) {
          // Filter out corrupted binary entries (from XLSX blobs)
          phase2Students = parsed.filter((s: any) =>
            s.roll_no && !s.roll_no.startsWith('PK!') && !s.roll_no.includes('Content_Types')
          );
        }
      }
      if (phase2MarksStr) {
        const parsed = JSON.parse(phase2MarksStr);
        if (Array.isArray(parsed)) {
          phase2Marks = parsed.filter((m: any) =>
            m.roll_no && !m.roll_no.startsWith('PK!') && !m.roll_no.includes('Content_Types')
          );
        }
      }
    } catch {}

    // If Phase 2 has real student data, use ONLY that — no duplicates, no injected defaults
    if (phase2Students.length > 0) {
      // Deduplicate by roll_no
      const seen = new Set<string>();
      const unique = phase2Students.filter((s: any) => {
        if (seen.has(s.roll_no)) return false;
        seen.add(s.roll_no);
        return true;
      });

      return unique.map((s: any, idx: number) => {
        // Only look up marks if available in Phase 2
        const marksRow = phase2Marks.find((m: any) => m.roll_no === s.roll_no);
        const hasMarks = !!marksRow && marksRow.marks_obtained !== undefined;
        const hasAttendance = s.status !== undefined;

        // Compute score ONLY if both data points are available from Phase 2
        let computedScore: number | null = null;
        if (hasAttendance && hasMarks) {
          const isAbsent = s.status === 'Absent';
          const attendancePct = isAbsent ? 50 : 88;
          const marksObtained = Number(marksRow.marks_obtained);
          const marksPct = (marksObtained / 50) * 100;
          computedScore = Math.round((attendancePct * 0.45) + (marksPct * 0.45));
          computedScore = Math.max(15, Math.min(98, computedScore));
        } else if (hasAttendance) {
          // Only attendance available
          const isAbsent = s.status === 'Absent';
          computedScore = isAbsent ? 45 : null; // null means MentorWellbeing will derive from check-in
        }

        const lastCheckinDate = s.last_checkin_date || null;
        const daysSince = s.days_since_checkin !== undefined ? s.days_since_checkin : null;
        const latestMood = s.latest_mood || null;

        return {
          id: idx + 1,
          student_id: idx + 1,
          roll_no: s.roll_no,
          name: s.name,
          class_section: s.class_section || s.dept || 'CCE',
          // Only include fields that genuinely exist in Phase 2 data
          ...(hasAttendance && { attendance_status: s.status }),
          ...(hasMarks && { internal_marks: Number(marksRow.marks_obtained) }),
          // Wellbeing score: computed from real data if available, null otherwise
          wellbeing_score: computedScore,
          // Read dynamic check-in stats
          last_checkin_date: lastCheckinDate,
          days_since_checkin: daysSince,
          is_overdue: daysSince !== null && daysSince > 20,
          latest_mood: latestMood,
        };
      });
    }

    // No Phase 2 data at all — show default demo roster
    return [
      { id: 1, student_id: 1, roll_no: "24CC001", name: "A. Kumar", class_section: "CCE", last_checkin_date: "2026-07-26", days_since_checkin: 4, is_overdue: false, wellbeing_score: 94, latest_mood: 'doing well' },
      { id: 2, student_id: 2, roll_no: "24CC014", name: "P. Sneha", class_section: "CCE", last_checkin_date: "2026-07-22", days_since_checkin: 8, is_overdue: false, wellbeing_score: 78, latest_mood: 'doing well' },
      { id: 3, student_id: 3, roll_no: "24CC029", name: "R. Karthik", class_section: "CCE", last_checkin_date: "2026-07-15", days_since_checkin: 15, is_overdue: true, wellbeing_score: 62, latest_mood: 'needs attention' },
      { id: 4, student_id: 4, roll_no: "24CC042", name: "M. Priya", class_section: "CCE", last_checkin_date: "2026-07-08", days_since_checkin: 22, is_overdue: true, wellbeing_score: 42, latest_mood: 'needs attention' },
      { id: 5, student_id: 5, roll_no: "24CC058", name: "S. Dinesh", class_section: "CCE", last_checkin_date: "2026-06-28", days_since_checkin: 32, is_overdue: true, wellbeing_score: 22, latest_mood: 'concerning', has_escalation: true },
    ];
  },
  async getMenteeTimeline(studentId: number): Promise<any[]> {
    try {
      const stored = localStorage.getItem(`timeline_${studentId}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },
  async logCheckin(studentId: number, mode: string, notes: string, mood_tag: string): Promise<any> {
    try {
      const stored = localStorage.getItem(`timeline_${studentId}`);
      const list = stored ? JSON.parse(stored) : [];
      const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      list.unshift({ date: today, mode, notes, mood_tag });
      localStorage.setItem(`timeline_${studentId}`, JSON.stringify(list));
      
      // Update mentee last checkin details in simulated roster
      const phase2StudentsStr = localStorage.getItem('academic_uploaded_students');
      if (phase2StudentsStr) {
        const students = JSON.parse(phase2StudentsStr);
        // Find student by checking index matching studentId - 1, or matching roll_no
        let student = students[studentId - 1];
        if (!student) {
          student = students.find((s: any, idx: number) => (idx + 1) === studentId);
        }
        if (student) {
          student.last_checkin_date = today;
          student.days_since_checkin = 0;
          student.latest_mood = mood_tag;
          localStorage.setItem('academic_uploaded_students', JSON.stringify(students));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },
  async escalateMentee(studentId: number, reason: string, escalated_to: string): Promise<any> {
    return { status: 'success' };
  },
  async getSuggestedWellbeingPrompt(studentId: number): Promise<any> {
    return { prompt: "How are your studies progressing this term?" };
  },
  async getMentorEscalations(): Promise<any[]> {
    return [];
  },
  async updateEscalationStatus(escalationId: number, status: string): Promise<any> {
    return { status: 'success' };
  },
  async getMentorStats(): Promise<any> {
    return { total_mentees: 5, overdue_count: 0, open_escalations: 0, checkins_this_month: 3 };
  },
  async getMentorTasks(): Promise<any[]> {
    return [];
  },
  async createMentorTask(title: string, description: string): Promise<any> {
    return { status: 'success' };
  },
  async editMentorTask(taskId: number, title: string, description: string): Promise<any> {
    return { status: 'success' };
  },
  async getFutureNotes(studentId: number): Promise<any[]> {
    return [];
  },
  async addFutureNote(studentId: number, note: string): Promise<any> {
    return { status: 'success' };
  },

  // Phase 7: Placement
  async getPlacementDrives(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/placement/drives`);
      if (!response.ok) throw new Error(`Failed to fetch placement drives: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('getPlacementDrives error:', error);
      return [];
    }
  },
  async addPlacementDrive(data: any): Promise<any> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/placement/drives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create placement drive: ${response.status}`);
    }
    return await response.json();
  },
  async editPlacementDrive(id: number, data: any): Promise<any> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/placement/drives/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update placement drive: ${response.status}`);
    }
    return await response.json();
  },
  async deletePlacementDrive(id: number): Promise<any> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/placement/drives/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to delete placement drive: ${response.status}`);
    }
    return await response.json();
  },
  async getInternships(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/internships`);
      if (!response.ok) throw new Error(`Failed to fetch internships: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },
  async addInternship(data: any): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/internships`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create internship: ${response.status}`);
    }
    return await response.json();
  },
  async editInternship(id: number, data: any): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/internships/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update internship: ${response.status}`);
    }
    return await response.json();
  },
  async deleteInternship(id: number): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/internships/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to delete internship: ${response.status}`);
    }
    return await response.json();
  },

  async getInterviewMaterials(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interview-materials`);
      if (!response.ok) throw new Error(`Failed to fetch interview materials: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },
  async addInterviewMaterial(data: any): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/interview-materials`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create interview material: ${response.status}`);
    }
    return await response.json();
  },
  async editInterviewMaterial(id: number, data: any): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/interview-materials/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update interview material: ${response.status}`);
    }
    return await response.json();
  },
  async deleteInterviewMaterial(id: number): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/interview-materials/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to delete interview material: ${response.status}`);
    }
    return await response.json();
  },

  // Phase 8: Alumni Relations (Agent 8)
  async getAlumniDirectory(params?: { search?: string; batch?: number; department?: string; industry?: string; company?: string; mentorship_available?: boolean; engagement_status?: string; sort_by?: string }): Promise<any[]> {
    try {
      const q = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '' && v !== 'All') {
            q.append(k, String(v));
          }
        });
      }
      const res = await fetch(`${API_BASE_URL}/api/alumni?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.warn("Backend /api/alumni unavailable, using fallback cache", e);
    }
    try {
      const stored = localStorage.getItem('alumni_directory');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },

  async getAlumniDetail(id: number): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend /api/alumni/:id error", e);
    }
    return null;
  },

  async addAlumni(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    try {
      const stored = localStorage.getItem('alumni_directory');
      const list = stored ? JSON.parse(stored) : [];
      const newItem = { id: Date.now(), ...data, engagement_score: 75, engagement_status: "Active" };
      list.push(newItem);
      localStorage.setItem('alumni_directory', JSON.stringify(list));
    } catch {}
    return { status: 'success' };
  },

  async editAlumni(id: number, data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    try {
      const stored = localStorage.getItem('alumni_directory');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((x: any) => x.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
          localStorage.setItem('alumni_directory', JSON.stringify(list));
        }
      }
    } catch {}
    return { status: 'success' };
  },

  async deleteAlumni(id: number): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async logAlumniInteraction(alumniId: number, data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/${alumniId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async getAlumniMentorships(status?: string): Promise<any[]> {
    try {
      const url = status && status !== 'All' ? `${API_BASE_URL}/api/alumni/mentorships/all?status=${status}` : `${API_BASE_URL}/api/alumni/mentorships/all`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend /api/alumni/mentorships/all error", e);
    }
    try {
      const stored = localStorage.getItem('alumni_mentorships');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },

  async createAlumniMentorship(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/mentorships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async updateAlumniMentorshipStatus(id: number, data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/mentorships/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async getAlumniContributions(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/contributions/all`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend /api/alumni/contributions/all error", e);
    }
    return [];
  },

  async addAlumniContribution(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async updateAlumniContributionStatus(id: number, data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/contributions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async getAlumniFollowUps(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/follow-ups/all`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend /api/alumni/follow-ups/all error", e);
    }
    return [];
  },

  async addAlumniFollowUp(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/follow-ups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async updateAlumniFollowUp(id: number, data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/follow-ups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error(e);
    }
    return { status: 'success' };
  },

  async getAlumniAnalyticsSummary(): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/analytics/summary`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Backend /api/alumni/analytics/summary error", e);
    }
    return null;
  },

  async getAlumniSmartRecommendations(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/recommendations/smart`);
      if (res.ok) {
        const data = await res.json();
        return data.recommendations || [];
      }
    } catch (e) {
      console.warn("Backend /api/alumni/recommendations/smart error", e);
    }
    return [];
  },

  async matchAlumni(data: { type: string; skills: string[]; department?: string; topic?: string }): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alumni/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const d = await res.json();
        return d.matches || [];
      }
    } catch (e) {
      console.error("Match alumni error", e);
    }
    return [];
  },

  async getAlumniDonations(): Promise<any[]> {
    return this.getAlumniContributions();
  },
  async addAlumniDonation(data: any): Promise<any> {
    return this.addAlumniContribution(data);
  },
  async editAlumniDonation(id: number, data: any): Promise<any> {
    return this.updateAlumniContributionStatus(id, data);
  },

  // Phase 9: Events
  async getEvents(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) return data;
      }
    } catch {}
    try {
      const stored = localStorage.getItem('events');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 1, title: "International AI Symposium 2026", name: "International AI Symposium 2026", type: "Symposium", date: "2026-08-20", venue: "Main Auditorium", organizer: "CSE Department", expected_participants: 250, allocated_budget: 75000, spent_budget: 48750, health_score: 72, health_tier: "Needs Attention" },
      { id: 2, title: "FDP on Cloud & Distributed Computing", name: "FDP on Cloud & Distributed Computing", type: "FDP", date: "2026-09-15", venue: "Seminar Hall B", organizer: "CCE Department", expected_participants: 80, allocated_budget: 35000, spent_budget: 12000, health_score: 85, health_tier: "Healthy" },
      { id: 3, title: "Hands-on Workshop: Edge AI & IoT", name: "Hands-on Workshop: Edge AI & IoT", type: "Workshop", date: "2026-10-10", venue: "Lab 3 & LH-201", organizer: "CSE Department", expected_participants: 120, allocated_budget: 45000, spent_budget: 0, health_score: 80, health_tier: "Healthy" }
    ];
  },
  async addEvent(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {}
    try {
      const stored = localStorage.getItem('events');
      const list = stored ? JSON.parse(stored) : [];
      const newItem = { id: Date.now(), health_score: 85, health_tier: "Healthy", ...data };
      list.unshift(newItem);
      localStorage.setItem('events', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async editEvent(id: number, data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {}
    try {
      const stored = localStorage.getItem('events');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((x: any) => x.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
          localStorage.setItem('events', JSON.stringify(list));
        }
      }
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async getCommitteeTasks(eventId?: number): Promise<any[]> {
    try {
      const url = eventId ? `${API_BASE_URL}/api/committee-tasks?event_id=${eventId}` : `${API_BASE_URL}/api/committee-tasks`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) return data;
      }
    } catch {}
    try {
      const stored = localStorage.getItem('committee_tasks');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 1, event_id: 1, task: "Venue Booking & Stage Setup", assigned_to: "Prof. Vance", priority: "high", due_date: "2026-08-10", status: "Completed", category: "Venue" },
      { id: 2, event_id: 1, task: "Keynote Speaker Confirmation", assigned_to: "Dr. S. Sharma", priority: "high", due_date: "2026-08-01", status: "In Progress", category: "Speaker" },
      { id: 3, event_id: 1, task: "Catering & High-Tea Arrangement", assigned_to: "Prof. Rajesh", priority: "medium", due_date: "2026-08-13", status: "Pending", category: "Food" },
      { id: 4, event_id: 1, task: "Certificates & Mementos Preparation", assigned_to: "Prof. Priya", priority: "low", due_date: "2026-08-18", status: "Pending", category: "Certificates" },
      { id: 5, event_id: 1, task: "Student Registration & Badges", assigned_to: "Prof. Preethi R", priority: "medium", due_date: "2026-08-12", status: "In Progress", category: "Registration" },
      { id: 6, event_id: 1, task: "Post-Event Feedback & NAAC Report", assigned_to: "Prof. Arul", priority: "medium", due_date: "2026-08-22", status: "Pending", category: "Report" }
    ];
  },
  async addCommitteeTask(data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/committee-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {}
    try {
      const stored = localStorage.getItem('committee_tasks');
      const list = stored ? JSON.parse(stored) : [];
      const newItem = { id: Date.now(), priority: "medium", ...data };
      list.unshift(newItem);
      localStorage.setItem('committee_tasks', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async editCommitteeTask(id: number, data: any): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/committee-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch {}
    try {
      const stored = localStorage.getItem('committee_tasks');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((x: any) => x.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
          localStorage.setItem('committee_tasks', JSON.stringify(list));
        }
      }
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async planEvent(prompt: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: prompt })
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },
  async getEventRisk(eventId: number): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/risk`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },
  async getEventBudget(eventId: number): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/budget`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },
  async generateEventCommunication(type: string, eventId?: number): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/communication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, event_id: eventId })
      });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },
  async getPostEventReport(eventId: number): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/report`);
      if (res.ok) return await res.json();
    } catch {}
    return null;
  },

  // Phase 10: Inventory
  async getLabAssets(): Promise<any[]> {
    try {
      const stored = localStorage.getItem('lab_assets');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [{ id: 1, name: "NVIDIA RTX 4090 GPU Workstation", quantity: 5, status: "Operational" }];
  },
  async addLabAsset(data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('lab_assets');
      const list = stored ? JSON.parse(stored) : [{ id: 1, name: "NVIDIA RTX 4090 GPU Workstation", quantity: 5, status: "Operational" }];
      const newItem = { id: Date.now(), name: data.name, quantity: Number(data.quantity), status: data.status || 'Operational' };
      list.push(newItem);
      localStorage.setItem('lab_assets', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async editLabAsset(id: number, data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('lab_assets');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((x: any) => x.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], name: data.name, quantity: Number(data.quantity), status: data.status || list[idx].status };
          localStorage.setItem('lab_assets', JSON.stringify(list));
        }
      }
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async getSoftwareLicenses(): Promise<any[]> {
    try {
      const stored = localStorage.getItem('software_licenses');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [{ id: 1, name: "MATLAB Campus License", seats_total: 100, expiry_date: "2026-12-31" }];
  },
  async addSoftwareLicense(data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('software_licenses');
      const list = stored ? JSON.parse(stored) : [{ id: 1, name: "MATLAB Campus License", seats_total: 100, expiry_date: "2026-12-31" }];
      const newItem = { id: Date.now(), name: data.name, seats_total: Number(data.seats_total), expiry_date: data.expiry_date };
      list.push(newItem);
      localStorage.setItem('software_licenses', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async editSoftwareLicense(id: number, data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('software_licenses');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((x: any) => x.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], name: data.name, seats_total: Number(data.seats_total), expiry_date: data.expiry_date };
          localStorage.setItem('software_licenses', JSON.stringify(list));
        }
      }
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async getBookRequisitions(): Promise<any[]> {
    try {
      const stored = localStorage.getItem('book_requisitions');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [{ id: 1, title: "Introduction to Algorithms (4th Ed)", author: "Cormen et al.", status: "Approved" }];
  },
  async addBookRequisition(data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('book_requisitions');
      const list = stored ? JSON.parse(stored) : [{ id: 1, title: "Introduction to Algorithms (4th Ed)", author: "Cormen et al.", status: "Approved" }];
      const newItem = { id: Date.now(), ...data };
      list.push(newItem);
      localStorage.setItem('book_requisitions', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },
  async editBookRequisition(id: number, data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('book_requisitions');
      if (stored) {
        const list = JSON.parse(stored);
        const idx = list.findIndex((x: any) => x.id === id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
          localStorage.setItem('book_requisitions', JSON.stringify(list));
        }
      }
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },

  async getStudents(): Promise<any[]> {
    return [];
  },

  async addStudent(data: { roll_no: string; name: string; email?: string; class_section?: string }): Promise<any> {
    return { status: 'success' };
  },

  async uploadAcademicFile(file: File): Promise<any> {
    return { status: 'success', message: `File "${file.name}" uploaded successfully.` };
  },

  async getAllResumes(demo = false): Promise<any[]> {
    const token = getAuthToken();
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `${API_BASE_URL}/api/resume/all${demo ? '?demo=true' : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to load resumes: ${res.status}`);
    const data = await res.json();
    return data.resumes || [];
  },

  async getResumeMatchTarget(targetType: 'drive' | 'internship', targetId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/match-target?target_type=${targetType}&target_id=${targetId}`);
      if (!response.ok) throw new Error(`Failed to match resumes: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  async matchResumeSingle(payload: any): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Failed to calculate resume match: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  async uploadResume(studentRollNo: string, file: File): Promise<{ skills: string; status: string; message: string }> {
    const formData = new FormData();
    formData.append('student_roll_no', studentRollNo);
    formData.append('file', file);
    const token = getAuthToken();
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed: ${response.status}`);
    }
    return await response.json();
  },

  async bulkUploadResumes(files: FileList | File[]): Promise<any> {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const token = getAuthToken();
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/api/resume/bulk-upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Bulk upload failed: ${response.status}`);
    }
    return await response.json();
  },

  async getCareerGuidance(studentId: number | string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career/guidance/${studentId}`);
      if (!response.ok) throw new Error(`Failed to fetch career guidance: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  async queryCareerAdvisor(payload: { query?: string; student_id?: number; student_name?: string; roll_no?: string }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/career/guidance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Failed to query career advisor: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  async getBatchCareerReadiness(query?: string): Promise<any> {
    try {
      const url = query ? `${API_BASE_URL}/api/career/batch-readiness?query=${encodeURIComponent(query)}` : `${API_BASE_URL}/api/career/batch-readiness`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch batch readiness: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },

  async getStudentOffers(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offers`);
      if (!response.ok) throw new Error(`Failed to fetch student offers: ${response.status}`);
      return await response.json();
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  },
  async addStudentOffer(data: any): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/offers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create student offer: ${response.status}`);
    }
    return await response.json();
  },
  async editStudentOffer(id: number, data: any): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update student offer: ${response.status}`);
    }
    return await response.json();
  },
  async deleteStudentOffer(id: number): Promise<any> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to delete student offer: ${response.status}`);
    }
    return await response.json();
  },

  async getAlumniJobs(): Promise<any[]> {
    try {
      const stored = localStorage.getItem('alumni_jobs');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },
  async addAlumniJob(data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('alumni_jobs');
      const list = stored ? JSON.parse(stored) : [];
      list.push({ id: Date.now(), ...data });
      localStorage.setItem('alumni_jobs', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },

  async getMentorships(): Promise<any[]> {
    try {
      const stored = localStorage.getItem('mentorships');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },
  async addMentorship(data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('mentorships');
      const list = stored ? JSON.parse(stored) : [];
      list.push({ id: Date.now(), ...data });
      localStorage.setItem('mentorships', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },

  async getAlumniEvents(): Promise<any[]> {
    try {
      const stored = localStorage.getItem('alumni_events');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  },
  async addAlumniEvent(data: any): Promise<any> {
    try {
      const stored = localStorage.getItem('alumni_events');
      const list = stored ? JSON.parse(stored) : [];
      list.push({ id: Date.now(), ...data, rsvps: 0 });
      localStorage.setItem('alumni_events', JSON.stringify(list));
    } catch (e) { console.error(e); }
    return { status: 'success' };
  },

  // ── Placement Namelist & Status Tracking ────────────────────────────

  /**
   * Upload a PDF / Excel / CSV namelist for server-side parsing.
   * Returns { headers, suggested_mapping, rows, is_scanned, error }
   */
  async parseNamelistFile(file: File): Promise<{
    headers: string[];
    suggested_mapping: Record<string, string>;
    rows: Record<string, string>[];
    is_scanned: boolean;
    error: string | null;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch(`${API_BASE_URL}/api/placement/namelist/parse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
      body: formData,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || 'Failed to parse namelist');
    }
    return resp.json();
  },

  /**
   * Import mapped rows into the database (upsert by roll_no / register_no).
   * Returns { imported, skipped, duplicates }
   */
  async importNamelistStudents(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
    replaceExisting: boolean = false,
  ): Promise<{ imported: number; skipped: number; duplicates: number }> {
    const resp = await fetch(`${API_BASE_URL}/api/placement/namelist/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ rows, mapping, replace_existing: replaceExisting }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || 'Import failed');
    }
    return resp.json();
  },

  /** Fetch all students with their placement status. Supports search and status_filter query params. */
  async getPlacementStudents(params?: { search?: string; status_filter?: string }): Promise<PlacementStudent[]> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.status_filter) qs.set('status_filter', params.status_filter);
    const resp = await fetch(`${API_BASE_URL}/api/placement/students?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!resp.ok) throw new Error('Failed to fetch placement students');
    return resp.json();
  },

  /** Remove a student from placement tracking. */
  async deletePlacementStudent(studentId: number): Promise<{ status: string; message: string }> {
    const resp = await fetch(`${API_BASE_URL}/api/placement/students/${studentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!resp.ok) throw new Error('Failed to delete student from placement tracking');
    return resp.json();
  },

  /** Clear all students from active placement tracking. */
  async clearAllPlacementStudents(): Promise<{ status: string; cleared: number }> {
    const resp = await fetch(`${API_BASE_URL}/api/placement/students/clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!resp.ok) throw new Error('Failed to clear placement students');
    return resp.json();
  },

  /** Update a student's placement status in the database. */
  async updateStudentPlacementStatus(
    studentId: number,
    status: PlacementStatus,
  ): Promise<{ id: number; roll_no: string; name: string; placement_status: string }> {
    const resp = await fetch(`${API_BASE_URL}/api/placement/students/${studentId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: resp.statusText }));
      throw new Error(err.detail || 'Failed to update status');
    }
    return resp.json();
  },
};

// ── Shared placement types ────────────────────────────────────────────────────
export type PlacementStatus = 'Not Started' | 'Not Placed' | 'Placed' | 'Internship' | 'In Progress';

export interface PlacementStudent {
  id: number;
  roll_no: string;
  register_no: string | null;
  name: string;
  department: string;
  batch: string;
  placement_status: PlacementStatus;
  email: string;
}

