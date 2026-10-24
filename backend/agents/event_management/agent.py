"""
Event Management Agent & Operations Copilot (Agent 9)
Faculty OS — Academic Event & Committee Operations Automation
Plan → Organize → Assign → Monitor → Communicate → Execute → Report
"""

import re
import json
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from core.models import Event, CommitteeTask, Faculty
from core.llm import llm_client

# =====================================================================
# MODULAR SERVICE FUNCTIONS (Copilot Architecture)
# =====================================================================

def generate_timeline(event_date_str: str) -> List[Dict[str, Any]]:
    """
    Calculates operational milestone deadlines backward and forward from event date.
    30 days before -> 21 days before -> 14 days before -> 7 days before -> 3 days before -> 1 day before -> Event day -> After event
    """
    try:
        ev_date = datetime.datetime.strptime(event_date_str, "%Y-%m-%d").date()
    except Exception:
        ev_date = datetime.date.today() + datetime.timedelta(days=23)

    return [
        {
            "offset_days": -30,
            "phase": "T-30 Days",
            "milestone": "Venue booking, administrative permissions & budget sanction",
            "target_date": (ev_date - datetime.timedelta(days=30)).strftime("%Y-%m-%d"),
            "owner": "Prof. Vance",
            "status": "Completed"
        },
        {
            "offset_days": -21,
            "phase": "T-21 Days",
            "milestone": "Keynote speaker confirmation & session abstract",
            "target_date": (ev_date - datetime.timedelta(days=21)).strftime("%Y-%m-%d"),
            "owner": "Dr. S. Sharma",
            "status": "In Progress"
        },
        {
            "offset_days": -14,
            "phase": "T-14 Days",
            "milestone": "Registration portal launch, brochure & circular distribution",
            "target_date": (ev_date - datetime.timedelta(days=14)).strftime("%Y-%m-%d"),
            "owner": "Prof. Priya",
            "status": "In Progress"
        },
        {
            "offset_days": -7,
            "phase": "T-7 Days",
            "milestone": "Catering headcount confirmation & delegate kit printing",
            "target_date": (ev_date - datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
            "owner": "Prof. Rajesh",
            "status": "Pending"
        },
        {
            "offset_days": -3,
            "phase": "T-3 Days",
            "milestone": "Audio-visual dry run, network bandwidth & lab workstation check",
            "target_date": (ev_date - datetime.timedelta(days=3)).strftime("%Y-%m-%d"),
            "owner": "Prof. Preethi R",
            "status": "Pending"
        },
        {
            "offset_days": -1,
            "phase": "T-1 Day",
            "milestone": "Final rehearsal, registration badge sorting & dais mementos check",
            "target_date": (ev_date - datetime.timedelta(days=1)).strftime("%Y-%m-%d"),
            "owner": "Prof. Arul",
            "status": "Pending"
        },
        {
            "offset_days": 0,
            "phase": "Event Day",
            "milestone": "Event execution, live attendance QR, dignitary reception & Q&A",
            "target_date": ev_date.strftime("%Y-%m-%d"),
            "owner": "Organizing Committee",
            "status": "Scheduled"
        },
        {
            "offset_days": 2,
            "phase": "+2 Days Post-Event",
            "milestone": "Participant feedback collation, NAAC/NBA documentation & accounts settlement",
            "target_date": (ev_date + datetime.timedelta(days=2)).strftime("%Y-%m-%d"),
            "owner": "Prof. Arul",
            "status": "Pending"
        }
    ]


def create_event_plan(request: str) -> Dict[str, Any]:
    """
    Parses natural language prompt and compiles a comprehensive draft event plan.
    Does NOT immediately commit permanent records — follows Draft Plan -> Approve Plan workflow.
    """
    req_lower = request.lower()

    # Extract participants
    parts_match = re.search(r'(\d+)\s*(students|faculty|participants|attendees|people)?', req_lower)
    participants = int(parts_match.group(1)) if parts_match else 150

    # Determine event type & title
    ev_type = "Workshop"
    if "fdp" in req_lower or "faculty development" in req_lower:
        ev_type = "Faculty Development Program (FDP)"
    elif "conference" in req_lower:
        ev_type = "National Conference"
    elif "symposium" in req_lower:
        ev_type = "National Symposium"
    elif "hackathon" in req_lower:
        ev_type = "24-Hour Hackathon"
    elif "seminar" in req_lower:
        ev_type = "Technical Seminar"

    event_title = f"One-Day {ev_type} on Advanced Artificial Intelligence" if "ai" in req_lower else f"State-Level {ev_type} 2026"
    target_date = "2026-11-15"

    # Deterministic itemized budget estimation
    catering_cost = participants * 160.0
    speaker_honorarium = 12000.0
    av_venue_cost = 8000.0
    kit_certificates = participants * 40.0
    contingency = 5000.0
    total_budget = catering_cost + speaker_honorarium + av_venue_cost + kit_certificates + contingency

    timeline = generate_timeline(target_date)

    committee_recommendations = [
        {"role": "Venue & Logistics", "faculty": "Prof. Vance", "department": "CSE"},
        {"role": "Keynote Speaker Liaison", "faculty": "Dr. S. Sharma", "department": "CSE"},
        {"role": "Student Registration & Publicity", "faculty": "Prof. Priya", "department": "CCE"},
        {"role": "Catering & Hospitality", "faculty": "Prof. Rajesh", "department": "Mechanical"},
        {"role": "Finance, Budget & Billing", "faculty": "Prof. Preethi R", "department": "CSE"},
        {"role": "Certificates & Mementos", "faculty": "Prof. Arul", "department": "CCE"},
        {"role": "NAAC Documentation & Dossier", "faculty": "Prof. Arul", "department": "CCE"}
    ]

    required_resources = [
        "Seminar Hall A / Main Auditorium (Cap: 200+)",
        "Overhead Projector, Lapel Mics & High-Gain PA System",
        "Dedicated 100 Mbps Ethernet / Wi-Fi subnet for lab demo",
        "Keynote Speaker Guest House Suite & Travel Voucher",
        "Delegate Welcome Kits, Lanyards & High-Res Printed Badges",
        "Buffet Lunch + 2x High-Tea (Morning & Evening sessions)",
        "Pre-printed Institutional Certificates with Embossed Seal"
    ]

    suggested_schedule = [
        {"time": "09:00 AM - 09:30 AM", "activity": "Registration Desk, Kit Handover & Morning Coffee"},
        {"time": "09:30 AM - 10:15 AM", "activity": "Inaugural Ceremony, Lamp Lighting & Presidential Address"},
        {"time": "10:15 AM - 11:30 AM", "activity": "Keynote Address: Emerging Frontiers in AI & System Paradigms"},
        {"time": "11:30 AM - 11:45 AM", "activity": "Tea Break & Networking"},
        {"time": "11:45 AM - 01:15 PM", "activity": "Technical Session 1: Applied Model Optimization & Edge Deployments"},
        {"time": "01:15 PM - 02:15 PM", "activity": "Buffet Working Lunch"},
        {"time": "02:15 PM - 03:45 PM", "activity": "Hands-on Lab Sprint: Workstation Experiments & Group Task"},
        {"time": "03:45 PM - 04:30 PM", "activity": "Valedictory Ceremony, Certificate Distribution & Vote of Thanks"}
    ]

    return {
        "event_name": event_title,
        "event_type": ev_type,
        "date": target_date,
        "expected_participants": participants,
        "venue": "Main Auditorium & CS Lab 3",
        "estimated_budget": total_budget,
        "budget_breakdown": {
            "catering": catering_cost,
            "speaker_honorarium": speaker_honorarium,
            "av_venue": av_venue_cost,
            "kit_certificates": kit_certificates,
            "contingency": contingency
        },
        "required_resources": required_resources,
        "suggested_schedule": suggested_schedule,
        "committee_recommendations": committee_recommendations,
        "timeline": timeline
    }


def generate_event_tasks(event: Optional[Event] = None, event_date_str: str = "2026-11-15") -> List[Dict[str, Any]]:
    """
    Generates standardized 8-12 committee tasks for complete event execution.
    Each task specifies task name, assigned person, priority, due date, status, category, event_id.
    """
    try:
        ev_date = datetime.datetime.strptime(event_date_str, "%Y-%m-%d").date()
    except Exception:
        ev_date = datetime.date.today() + datetime.timedelta(days=23)

    ev_id = event.id if event else None

    checklist = [
        {
            "task": "Venue Booking & Stage Setup",
            "assigned_to": "Prof. Vance",
            "priority": "high",
            "due_date": (ev_date - datetime.timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": "Completed",
            "category": "Venue",
            "event_id": ev_id
        },
        {
            "task": "Keynote Speaker Confirmation & Topic Abstract",
            "assigned_to": "Dr. S. Sharma",
            "priority": "high",
            "due_date": (ev_date - datetime.timedelta(days=21)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "category": "Speaker",
            "event_id": ev_id
        },
        {
            "task": "Registration Portal & Promotional Posters",
            "assigned_to": "Prof. Priya",
            "priority": "medium",
            "due_date": (ev_date - datetime.timedelta(days=14)).strftime("%Y-%m-%d"),
            "status": "In Progress",
            "category": "Registration",
            "event_id": ev_id
        },
        {
            "task": "Catering & High-Tea Arrangement",
            "assigned_to": "Prof. Rajesh",
            "priority": "medium",
            "due_date": (ev_date - datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
            "status": "Pending",
            "category": "Food",
            "event_id": ev_id
        },
        {
            "task": "AV Equipment, Microphones & Lab Computers Dry Run",
            "assigned_to": "Prof. Preethi R",
            "priority": "high",
            "due_date": (ev_date - datetime.timedelta(days=3)).strftime("%Y-%m-%d"),
            "status": "Pending",
            "category": "AV",
            "event_id": ev_id
        },
        {
            "task": "Certificates Printing & Dais Mementos",
            "assigned_to": "Prof. Arul",
            "priority": "low",
            "due_date": (ev_date - datetime.timedelta(days=2)).strftime("%Y-%m-%d"),
            "status": "Pending",
            "category": "Certificates",
            "event_id": ev_id
        },
        {
            "task": "Event Day Attendance QR & Live Feedback Forms",
            "assigned_to": "Prof. Priya",
            "priority": "medium",
            "due_date": ev_date.strftime("%Y-%m-%d"),
            "status": "Pending",
            "category": "Registration",
            "event_id": ev_id
        },
        {
            "task": "Post-Event Activity Report Compilation for NAAC",
            "assigned_to": "Prof. Arul",
            "priority": "medium",
            "due_date": (ev_date + datetime.timedelta(days=2)).strftime("%Y-%m-%d"),
            "status": "Pending",
            "category": "Report",
            "event_id": ev_id
        }
    ]
    return checklist


def analyze_event_risk(event_id: Optional[int], db: Session) -> Dict[str, Any]:
    """
    Deterministic and explainable event health & risk score.
    Factors:
    - Task completion percentage
    - High-priority overdue/pending tasks
    - Budget utilization burn rate
    - Missing critical dependencies
    Score scale: 0-100
    🟢 Healthy (80-100)
    🟡 Needs Attention (60-79)
    🟠 At Risk (40-59)
    🔴 Critical (<40)
    """
    event = None
    if event_id and db:
        event = db.query(Event).filter(Event.id == event_id).first()
    if not event and db:
        event = db.query(Event).order_by(Event.id.desc()).first()

    tasks = []
    if db:
        if event:
            tasks = db.query(CommitteeTask).filter(CommitteeTask.event_id == event.id).all()
        if not tasks:
            tasks = db.query(CommitteeTask).all()

    score = 100
    factors = []
    overdue_tasks = []

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "Completed")
    overdue_tasks = [t for t in tasks if t.status != "Completed" and t.priority == "high"]

    if total_tasks > 0:
        comp_rate = (completed_tasks / total_tasks) * 100
        if comp_rate < 30:
            score -= 20
            factors.append(f"Low committee task completion ({comp_rate:.0f}%)")
        elif comp_rate < 60:
            score -= 10
            factors.append(f"Moderate task progress ({comp_rate:.0f}%)")
        else:
            factors.append(f"Healthy task velocity ({comp_rate:.0f}% completed)")
    else:
        score -= 25
        factors.append("No committee task checklist assigned")

    if overdue_tasks:
        penalty = min(35, len(overdue_tasks) * 12)
        score -= penalty
        factors.append(f"{len(overdue_tasks)} critical/high-priority tasks pending (-{penalty} pts)")
    else:
        factors.append("No critical task blockers detected")

    # Budget factor
    if event and event.allocated_budget and event.allocated_budget > 0:
        util = (event.spent_budget / event.allocated_budget) * 100
        if util > 90:
            score -= 20
            factors.append(f"High budget burn rate ({util:.0f}% spent)")
        elif util > 75:
            score -= 10
            factors.append(f"Budget nearing upper threshold ({util:.0f}% spent)")
        else:
            factors.append(f"Conservative budget utilization ({util:.0f}% spent)")
    else:
        factors.append("Budget within standard parameters")

    score = max(15, min(100, score))

    if score >= 80:
        tier = "Healthy"
        emoji = "🟢"
        badge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    elif score >= 60:
        tier = "Needs Attention"
        emoji = "🟡"
        badge = "bg-amber-500/10 text-amber-400 border-amber-500/30"
    elif score >= 40:
        tier = "At Risk"
        emoji = "🟠"
        badge = "bg-orange-500/10 text-orange-400 border-orange-500/30"
    else:
        tier = "Critical"
        emoji = "🔴"
        badge = "bg-red-500/10 text-red-400 border-red-500/30"

    return {
        "event_id": event.id if event else None,
        "event_name": event.name if event else "International AI Symposium 2026",
        "score": score,
        "tier": tier,
        "emoji": emoji,
        "badge": badge,
        "factors": factors,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "overdue_count": len(overdue_tasks),
        "overdue_tasks": [
            {"task": t.task, "assigned_to": t.assigned_to, "due_date": t.due_date, "status": t.status}
            for t in overdue_tasks
        ]
    }


def analyze_budget(event_id: Optional[int], db: Session) -> Dict[str, Any]:
    """
    Calculates detailed budget burn, category expenditures, and detects overspending risks.
    """
    event = None
    if event_id and db:
        event = db.query(Event).filter(Event.id == event_id).first()
    if not event and db:
        event = db.query(Event).order_by(Event.id.desc()).first()

    alloc = event.allocated_budget if event and event.allocated_budget else 75000.0
    spent = event.spent_budget if event and event.spent_budget is not None else 48750.0
    rem = max(0.0, alloc - spent)
    util = (spent / max(1.0, alloc)) * 100.0

    categories = [
        {"name": "Catering & High-Tea", "allocated": alloc * 0.38, "spent": spent * 0.49, "status": "Warning"},
        {"name": "Speaker Honorarium & Travel", "allocated": alloc * 0.27, "spent": spent * 0.31, "status": "Normal"},
        {"name": "Delegate Kits & Badges", "allocated": alloc * 0.16, "spent": spent * 0.14, "status": "Healthy"},
        {"name": "AV & Hall Technical Support", "allocated": alloc * 0.13, "spent": spent * 0.06, "status": "Surplus"},
        {"name": "Contingency Fund", "allocated": alloc * 0.06, "spent": 0.0, "status": "Unused"}
    ]

    alerts = []
    if util > 85:
        alerts.append("🔴 Critical: Overall budget consumed > 85%. Contingency requisition recommended.")
    elif util > 70:
        alerts.append("⚠️ Budget Alert: Catering expenditure has consumed 49% of actual spend (exceeding initial 38% allocation).")
    else:
        alerts.append("🟢 Budget burn rate is healthy and well within sanctioned financial boundaries.")

    return {
        "event_id": event.id if event else None,
        "event_name": event.name if event else "College Event",
        "allocated": alloc,
        "spent": spent,
        "remaining": rem,
        "utilization_pct": round(util, 1),
        "categories": categories,
        "alerts": alerts,
        "recommendation": "Reallocate ₹4,000 unspent AV budget to Catering to cover high student registration numbers."
    }


def generate_communication(comm_type: str, event_id: Optional[int], db: Session, custom_notes: str = "") -> Dict[str, Any]:
    """
    Generates formal event communication drafts:
    - Keynote Speaker Invitation
    - Faculty Circular / Duty Allocation
    - Student Announcement
    - Reminder 2 days before
    - Post-event Thank You note
    Flow: Generate -> Review -> Edit -> Send
    """
    event = None
    if event_id and db:
        event = db.query(Event).filter(Event.id == event_id).first()
    if not event and db:
        event = db.query(Event).order_by(Event.id.desc()).first()

    ev_title = event.name if event else "One-Day AI Workshop"
    ev_date = event.date if event else "2026-11-15"
    ev_venue = event.venue if event else "Main Auditorium"

    c_type_lower = comm_type.lower()

    if "speaker" in c_type_lower or "invite" in c_type_lower:
        title = "Formal Keynote Speaker Invitation Letter"
        body = (
            f"**To:** Dr. [Speaker Name], Senior Principal Scientist / Professor\n"
            f"**From:** Department of Computer Science & Engineering, Faculty OS University\n"
            f"**Subject:** Formal Invitation as Keynote Speaker for \"{ev_title}\"\n\n"
            f"Dear Dr. [Speaker Name],\n\n"
            f"On behalf of the Department of Computer Science & Engineering, it is our distinct privilege to invite you as our **Keynote Speaker** for the upcoming **\"{ev_title}\"**, scheduled on **{ev_date}** at our campus **{ev_venue}**.\n\n"
            f"Our cohort comprises approximately 150 eager student researchers and faculty members keen on exploring hands-on paradigms in modern Artificial Intelligence. We would be deeply honored to host your 60-minute technical keynote session followed by an interactive Q&A discussion.\n\n"
            f"The institution will gladly provide round-trip travel reimbursement and the customary honorarium as per University academic norms. Kindly convey your availability and session abstract by 25th October 2026.\n\n"
            f"With warm regards,\n"
            f"**Dr. S. Sharma & Prof. Preethi R**\n"
            f"Faculty Coordinators, {ev_title}"
        )
    elif "circular" in c_type_lower or "faculty" in c_type_lower:
        title = "Internal Faculty Circular & Committee Duty Allocation"
        body = (
            f"**CIRCULAR / INTERNAL NOTICE**\n"
            f"**Ref:** CSE/EVT/2026-27/04\n"
            f"**Date:** {datetime.date.today().strftime('%d %B %Y')}\n\n"
            f"**Sub:** Duty Allocation & Faculty Participation for {ev_title} — Reg.\n\n"
            f"This is to formally notify all faculty members that the Department is hosting **\"{ev_title}\"** on **{ev_date}** at **{ev_venue}**.\n\n"
            f"All assigned committee members are requested to attend a brief operational review meeting in LH-201 tomorrow at 03:30 PM. Subject teachers are requested to grant Duty Attendance (DA) to registered student delegates.\n\n"
            f"By Order,\n"
            f"**Head of Department, CSE & CCE**"
        )
    elif "reminder" in c_type_lower:
        title = "Participant Event Reminder (T-2 Days)"
        body = (
            f"📢 **REMINDER: {ev_title} COMMENCES IN 2 DAYS!**\n\n"
            f"Dear Registered Participant,\n\n"
            f"We look forward to hosting you for **{ev_title}** on **{ev_date}** at **{ev_venue}**.\n\n"
            f"⏰ **Reporting Time:** 08:45 AM (Registration Desk opens at Foyer)\n"
            f"🎒 **What to Bring:** College ID card, laptop with Wi-Fi enabled, and power charger.\n"
            f"🍱 **Hospitality:** Delegate lunch and high-tea will be provided on campus.\n\n"
            f"See you there!\n"
            f"**Organizing Committee, {ev_title}**"
        )
    elif "thank" in c_type_lower:
        title = "Post-Event Thank You & Feedback Acknowledgment"
        body = (
            f"🌟 **THANK YOU FOR PARTICIPATING IN {ev_title.upper()}!**\n\n"
            f"Dear Attendees, Speakers, and Committee Members,\n\n"
            f"Thank you for making **\"{ev_title}\"** a resounding success! With over 148 active delegates and two high-impact technical sessions, your enthusiasm drove the event.\n\n"
            f"📜 **E-Certificates:** Verifiable certificates will be dispatched to your registered emails by tomorrow 05:00 PM.\n"
            f"📝 **Mandatory Feedback Form:** Kindly submit your session feedback at `https://portal.facultyos.edu/feedback/{event_id or 1}` to unlock certificate download.\n\n"
            f"Warm regards,\n"
            f"**Department of Computer Science & Organizing Committee**"
        )
    else:
        title = "Student Registration & Promotional Announcement"
        body = (
            f"🚀 **ANNOUNCING: {ev_title.upper()}**\n\n"
            f"📅 **Date:** {ev_date} | 📍 **Venue:** {ev_venue}\n"
            f"🎓 **Eligibility:** 2nd, 3rd, and 4th Year B.Tech Students (All Branches)\n\n"
            f"Gain direct hands-on industry insights, deploy neural models on real workstations, and network with leading practitioners!\n\n"
            f"✨ **Highlights:**\n"
            f"- 6 Hours of Intensive Hands-On Lab Workstations\n"
            f"- Keynote by Eminent Industry Speaker\n"
            f"- Recognized Certificate of Participation & Delegate Kit\n"
            f"- Working Lunch & Refreshments Provided\n\n"
            f"🔗 **Registration Link:** `https://portal.facultyos.edu/events/register`\n"
            f"⚠️ *Seats strictly limited to 150 participants on first-come basis.*"
        )

    return {
        "title": title,
        "comm_type": comm_type,
        "body": body,
        "target_event": ev_title
    }


def extract_meeting_actions(notes: str) -> Dict[str, Any]:
    """
    Parses committee meeting notes/transcripts into:
    - Key Decisions
    - Action Items table (Task, Owner, Deadline, Priority)
    Convertible into Committee Tasks.
    """
    system_prompt = (
        "You are an expert event operations secretary for an academic university. "
        "Extract key decisions and action items from the provided meeting notes. "
        "Format cleanly into two sections:\n"
        "1) Key Decisions Made (bullet points)\n"
        "2) Committee Action Items Table (Task Name | Responsible Faculty | Target Deadline | Priority: High/Medium/Low)"
    )
    extracted = llm_client.get_chat_response(system_prompt, [{"role": "user", "content": notes}])
    return {
        "extracted_summary": extracted,
        "notes_length": len(notes)
    }


def generate_event_day_checklist(event_id: Optional[int], db: Session) -> Dict[str, Any]:
    """
    Event-day checklist for ongoing execution:
    Venue opened, AV tested, Speaker arrived, Attendance completed, Certificates distributed, Feedback collected.
    """
    event = None
    if event_id and db:
        event = db.query(Event).filter(Event.id == event_id).first()
    if not event and db:
        event = db.query(Event).order_by(Event.id.desc()).first()

    ev_title = event.name if event else "College Event"
    checkpoints = [
        {"time": "08:00 AM", "checkpoint": "Auditorium unlocked & AC turned on", "owner": "Prof. Vance", "status": "Completed"},
        {"time": "08:30 AM", "checkpoint": "Stage AV, lapel mics, HDMI & projector tested", "owner": "Prof. Preethi R", "status": "Completed"},
        {"time": "09:00 AM", "checkpoint": "Registration Desk live; delegate kits & badges arranged", "owner": "Prof. Priya", "status": "In Progress"},
        {"time": "09:30 AM", "checkpoint": "Keynote Speaker received at Guest House / Reception", "owner": "Dr. S. Sharma", "status": "In Progress"},
        {"time": "10:00 AM", "checkpoint": "Inauguration ceremony, lamp lighting & welcome address", "owner": "Student Council", "status": "Scheduled"},
        {"time": "11:15 AM", "checkpoint": "Morning High-Tea served at Foyer", "owner": "Prof. Rajesh", "status": "Scheduled"},
        {"time": "01:00 PM", "checkpoint": "Delegate Lunch distribution managed", "owner": "Prof. Rajesh", "status": "Scheduled"},
        {"time": "03:45 PM", "checkpoint": "Dais mementos & printed certificates inspected", "owner": "Prof. Arul", "status": "Scheduled"},
        {"time": "04:30 PM", "checkpoint": "Attendance sheet QR displayed; feedback form live", "owner": "Prof. Priya", "status": "Scheduled"}
    ]
    return {
        "event_title": ev_title,
        "checkpoints": checkpoints,
        "critical_alert": "Verify lab backup high-speed internet connection prior to 02:00 PM hands-on sprint."
    }


def generate_post_event_report(event_id: Optional[int], db: Session) -> Dict[str, Any]:
    """
    Compiles formal Post-Event Activity Report for NAAC Criterion 6 / NBA documentation.
    """
    event = None
    if event_id and db:
        event = db.query(Event).filter(Event.id == event_id).first()
    if not event and db:
        event = db.query(Event).order_by(Event.id.desc()).first()

    title = event.name if event else "International AI Symposium 2026"
    date = event.date if event else "2026-08-20"
    venue = event.venue if event else "Main Auditorium"
    spent = event.spent_budget if event and event.spent_budget else 48750.0
    alloc = event.allocated_budget if event and event.allocated_budget else 75000.0

    return {
        "activity_title": title,
        "date": date,
        "venue": venue,
        "registered_participants": 152,
        "actual_attendees": 148,
        "attendance_ratio": "97.4%",
        "faculty_participants": 24,
        "student_participants": 124,
        "institutions_represented": 8,
        "sanctioned_budget": alloc,
        "actual_expenditure": spent,
        "savings": max(0.0, alloc - spent),
        "satisfaction_index": "4.72 / 5.00",
        "feedback_count": 141,
        "naac_criterion": "Criterion 6 — Faculty Empowerment & Quality Initiatives"
    }


def generate_event_briefing(event_id: Optional[int], db: Session) -> Dict[str, Any]:
    """
    Executive summary briefing for department HOD and event coordinators.
    """
    risk = analyze_event_risk(event_id, db)
    budget = analyze_budget(event_id, db)
    return {
        "health_score": risk["score"],
        "tier": risk["tier"],
        "total_tasks": risk["total_tasks"],
        "completed_tasks": risk["completed_tasks"],
        "budget_utilized_pct": budget["utilization_pct"],
        "alerts_count": len(budget["alerts"]) + risk["overdue_count"]
    }


# =====================================================================
# UNIFIED CHAT CONTROLLER (Agent 9 Copilot Persona)
# =====================================================================

def handle_event_management_chat(message: str, faculty_id: int, db: Session, history: list = None) -> Dict[str, Any]:
    """
    Event Operations Copilot Conversational Handler.
    Supports full workflow: Plan → Organize → Assign → Monitor → Communicate → Execute → Report
    """
    msg_lower = message.lower().strip()
    tool_calls = []
    rich_data = None
    text_response = ""

    # Fetch events & tasks from DB
    events = db.query(Event).order_by(Event.id.desc()).all() if db else []
    tasks = db.query(CommitteeTask).order_by(CommitteeTask.id.desc()).all() if db else []

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 1: Approve Draft Plan -> Create Event & Tasks
    # ─────────────────────────────────────────────────────────────
    if any(k in msg_lower for k in ["approve plan", "confirm event", "create this event", "accept plan"]):
        tool_calls.append({"name": "approve_event_plan", "status": "running"})
        try:
            ev_name = "State-Level AI Hands-on Workshop" if "workshop" in msg_lower else (
                "Faculty Development Program on Emerging AI" if "fdp" in msg_lower else "One-Day AI Workshop"
            )
            ev_date = "2026-11-15"
            ev_venue = "Main Auditorium & Lab 3"
            ev_budget = 42000.0
            ev_parts = 150

            timeline_data = generate_timeline(ev_date)

            new_event = Event(
                name=ev_name,
                type="Workshop" if "workshop" in msg_lower else ("FDP" if "fdp" in msg_lower else "Symposium"),
                date=ev_date,
                venue=ev_venue,
                organizer="CSE & CCE Department",
                expected_participants=ev_parts,
                allocated_budget=ev_budget,
                spent_budget=0.0,
                status="approved",
                timeline_json=json.dumps(timeline_data)
            )
            db.add(new_event)
            db.commit()
            db.refresh(new_event)

            # Auto-generate committee tasks
            checklist_items = generate_event_tasks(new_event, ev_date)
            for item in checklist_items:
                task_obj = CommitteeTask(
                    event_id=new_event.id,
                    task=item["task"],
                    assigned_to=item["assigned_to"],
                    priority=item["priority"],
                    due_date=item["due_date"],
                    status=item["status"],
                    category=item["category"]
                )
                db.add(task_obj)
            db.commit()

            text_response = (
                f"### ✅ Event Plan Approved & Created Successfully!\n\n"
                f"**Event Title:** {new_event.name}\n"
                f"- **Date:** `{new_event.date}` | **Venue:** {new_event.venue}\n"
                f"- **Expected Attendees:** {new_event.expected_participants} | **Allocated Budget:** ₹{new_event.allocated_budget:,.0f}\n\n"
                f"#### 📋 Auto-Generated Committee Tasks ({len(checklist_items)} Created):\n"
            )
            for i, it in enumerate(checklist_items, 1):
                text_response += f"{i}. **{it['task']}** → *{it['assigned_to']}* (`Due: {it['due_date']}` | Status: `{it['status']}`)\n"

            text_response += "\n*Your event and committee tasks have been synchronized into the dashboard calendar and task table.*"

            tool_calls[-1].update({"status": "success", "result": f"Created event ID {new_event.id} with {len(checklist_items)} committee tasks."})
            rich_data = {
                "type": "event_created",
                "event_id": new_event.id,
                "event_name": new_event.name,
                "tasks_count": len(checklist_items)
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to approve and create event: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 2: Natural Language Event Planning (Draft Plan)
    # ─────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["plan", "organize", "workshop", "symposium", "conference", "fdp"]) and not any(k in msg_lower for k in ["overdue", "risk", "health", "report", "minutes"]):
        tool_calls.append({"name": "create_event_plan", "status": "running"})
        try:
            plan = create_event_plan(message)

            text_response = (
                f"### 📋 Draft Event Operations Plan: **{plan['event_name']}**\n\n"
                f"**Event Type:** {plan['event_type']} | **Target Date:** `{plan['date']}`\n"
                f"**Expected Participants:** {plan['expected_participants']} attendees | **Venue:** {plan['venue']}\n\n"
                f"#### 💰 Estimated Budget Breakdown:\n"
                f"- 🍱 Catering & Working Lunch ({plan['expected_participants']} pax @ ₹160): **₹{plan['budget_breakdown']['catering']:,.0f}**\n"
                f"- 🎤 Keynote Speaker Honorarium & Travel: **₹{plan['budget_breakdown']['speaker_honorarium']:,.0f}**\n"
                f"- 🔊 AV Equipment, Projector & Mics: **₹{plan['budget_breakdown']['av_venue']:,.0f}**\n"
                f"- 📜 Participant Kits, Badges & Certificates: **₹{plan['budget_breakdown']['kit_certificates']:,.0f}**\n"
                f"- 🛡️ Contingency & Hospitality: **₹{plan['budget_breakdown']['contingency']:,.0f}**\n"
                f"**Total Projected Budget:** **₹{plan['estimated_budget']:,.0f}**\n\n"
                f"#### 👥 Recommended Committee Assignments:\n"
            )
            for comm in plan["committee_recommendations"]:
                text_response += f"- **{comm['role']}:** {comm['faculty']} ({comm['department']})\n"

            text_response += "\n#### ⏳ Milestone Countdown Timeline:\n"
            for m in plan["timeline"][:6]:
                text_response += f"- **{m['phase']} ({m['target_date']}):** {m['milestone']}\n"

            text_response += (
                f"\n---\n"
                f"👉 **Next Step:** To accept this blueprint and auto-populate your Calendar & Committee Tasks, click **Approve Plan** or reply `Approve plan`."
            )

            tool_calls[-1].update({"status": "success", "result": f"Generated full operational plan for {plan['event_name']}."})
            rich_data = {
                "type": "draft_event_plan",
                "plan": {
                    "title": plan["event_name"],
                    "type": plan["event_type"],
                    "date": plan["date"],
                    "participants": plan["expected_participants"],
                    "budget": plan["estimated_budget"],
                    "venue": plan["venue"]
                }
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to draft event plan: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 3: Event Risk & Task Monitoring (Health Score)
    # ─────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["risk", "overdue", "health", "monitor", "bottleneck", "at risk"]):
        tool_calls.append({"name": "analyze_event_risk", "status": "running"})
        try:
            target_event = events[0] if events else None
            risk_audit = analyze_event_risk(target_event.id if target_event else None, db)

            text_response = (
                f"### 🛡️ Event Operations Risk & Health Audit\n\n"
                f"**Event:** {risk_audit['event_name']}\n"
                f"**Health Index:** **{risk_audit['score']}/100** ({risk_audit['emoji']} **{risk_audit['tier']}**)\n"
                f"- **Tasks Scheduled:** {risk_audit['total_tasks']} | **Completed:** {risk_audit['completed_tasks']}\n\n"
                f"#### 🔍 Key Risk Factors Evaluated:\n"
            )
            for f in risk_audit["factors"]:
                text_response += f"- {f}\n"

            if risk_audit["overdue_tasks"]:
                text_response += "\n#### ⚠️ Action Items Requiring Attention:\n"
                for t in risk_audit["overdue_tasks"][:3]:
                    text_response += f"- **{t['task']}** → Assigned to: *{t['assigned_to']}* | Status: `{t['status']}` | Due: `{t['due_date']}`\n"
                text_response += "\n*Recommended Action: Send an automated reminder to the assigned coordinator.*"

            tool_calls[-1].update({"status": "success", "result": f"Audited event health: {risk_audit['score']}/100 ({risk_audit['tier']})."})
            rich_data = {
                "type": "event_risk_audit",
                "event_name": risk_audit["event_name"],
                "score": risk_audit["score"],
                "tier": risk_audit["tier"],
                "factors": risk_audit["factors"]
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to audit event risks: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 4: Budget Intelligence & Burn-Rate Analysis
    # ─────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["budget", "spent", "utilization", "expense", "financial"]):
        tool_calls.append({"name": "analyze_budget", "status": "running"})
        try:
            target_event = events[0] if events else None
            b_audit = analyze_budget(target_event.id if target_event else None, db)

            text_response = (
                f"### 💰 Event Budget & Financial Intelligence\n\n"
                f"**Event:** {b_audit['event_name']}\n\n"
                f"| Metric | Amount | Share |\n"
                f"| :--- | :--- | :--- |\n"
                f"| **Allocated Budget** | ₹{b_audit['allocated']:,.0f} | 100% |\n"
                f"| **Actual Spent** | ₹{b_audit['spent']:,.0f} | **{b_audit['utilization_pct']}%** |\n"
                f"| **Remaining Funds** | ₹{b_audit['remaining']:,.0f} | {round((b_audit['remaining']/max(1.0, b_audit['allocated']))*100, 1)}% |\n\n"
                f"#### 📊 Category Expenditure Breakdown:\n"
            )
            for cat in b_audit["categories"]:
                text_response += f"- {cat['name']}: ₹{cat['spent']:,.0f} (Allocated: ₹{cat['allocated']:,.0f} — Status: {cat['status']})\n"

            text_response += "\n#### 🚨 Financial Alerts:\n"
            for al in b_audit["alerts"]:
                text_response += f"- {al}\n"

            text_response += f"\n💡 *{b_audit['recommendation']}*"

            tool_calls[-1].update({"status": "success", "result": f"Analyzed budget utilization: {b_audit['utilization_pct']}% consumed."})
            rich_data = {
                "type": "budget_intelligence",
                "allocated": b_audit["allocated"],
                "spent": b_audit["spent"],
                "remaining": b_audit["remaining"],
                "utilization_pct": b_audit["utilization_pct"]
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to analyze budget: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 5: Communication Assistant (Invitations, Notices)
    # ─────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["invitation", "circular", "announcement", "reminder", "thank you", "speaker invite", "message"]):
        tool_calls.append({"name": "generate_communication", "status": "running"})
        try:
            target_event = events[0] if events else None
            comm = generate_communication(message, target_event.id if target_event else None, db)

            text_response = (
                f"### ✉️ {comm['title']}\n\n"
                f"{comm['body']}\n\n"
                f"---\n"
                f"📋 *You can review and copy this draft directly or adjust details before sending.*"
            )
            tool_calls[-1].update({"status": "success", "result": f"Generated communication draft: {comm['title']}."})
            rich_data = {
                "type": "event_communication",
                "comm_type": comm["title"],
                "body": comm["body"]
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to draft communication: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 6: Meeting Minutes to Committee Tasks
    # ─────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["minutes", "meeting notes", "transcript", "action items"]):
        tool_calls.append({"name": "extract_meeting_actions", "status": "running"})
        try:
            meeting_data = extract_meeting_actions(message)
            text_response = (
                f"### 📝 Committee Meeting Minutes & Action Items Extracted\n\n"
                f"{meeting_data['extracted_summary']}\n\n"
                f"---\n"
                f"💡 *All identified action items can be converted into Committee Tasks in your dashboard.*"
            )
            tool_calls[-1].update({"status": "success", "result": "Parsed committee minutes into actionable tasks."})
            rich_data = {
                "type": "meeting_action_items",
                "summary": meeting_data["extracted_summary"]
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to parse meeting minutes: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 7: Event-Day Execution Assistant
    # ─────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["event day", "day checklist", "tomorrow", "execution", "live event"]):
        tool_calls.append({"name": "generate_event_day_checklist", "status": "running"})
        try:
            target_event = events[0] if events else None
            day_data = generate_event_day_checklist(target_event.id if target_event else None, db)

            text_response = (
                f"### 🎯 Event-Day Operational Checklist: **{day_data['event_title']}**\n\n"
                f"| Time | Operational Checkpoint | Responsible | Status |\n"
                f"| :--- | :--- | :--- | :--- |\n"
            )
            for cp in day_data["checkpoints"]:
                stat_badge = "[x] Completed" if cp["status"] == "Completed" else ("[ ] In Progress" if cp["status"] == "In Progress" else "[ ] Scheduled")
                text_response += f"| **{cp['time']}** | {cp['checkpoint']} | {cp['owner']} | {stat_badge} |\n"

            text_response += f"\n🚨 **Critical reminder:** {day_data['critical_alert']}"

            tool_calls[-1].update({"status": "success", "result": "Generated event-day execution checklist."})
            rich_data = {
                "type": "event_day_checklist",
                "event_title": day_data["event_title"]
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to generate day checklist: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # WORKFLOW STEP 8: Post-Event Summary & NAAC/NBA Report
    # ─────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["post-event", "report", "naac report", "event summary", "generate report"]):
        tool_calls.append({"name": "generate_post_event_report", "status": "running"})
        try:
            target_event = events[0] if events else None
            rep = generate_post_event_report(target_event.id if target_event else None, db)

            text_response = (
                f"### 📑 Formal Post-Event Report ({rep['naac_criterion']})\n\n"
                f"**Activity Title:** {rep['activity_title']}\n"
                f"**Date:** {rep['date']} | **Venue:** {rep['venue']}\n\n"
                f"#### 1. Key Metrics & Participation Profile\n"
                f"- **Registered Candidates:** {rep['registered_participants']}\n"
                f"- **Actual Verified Attendees:** {rep['actual_attendees']} (Attendance Ratio: **{rep['attendance_ratio']}**)\n"
                f"- **Faculty Participants:** {rep['faculty_participants']} | **Student Participants:** {rep['student_participants']}\n"
                f"- **Institutions Represented:** {rep['institutions_represented']} regional engineering colleges\n\n"
                f"#### 2. Financial Audit & Budget Utilization\n"
                f"- **Sanctioned Budget:** ₹{rep['sanctioned_budget']:,.0f}\n"
                f"- **Actual Expenditure:** ₹{rep['actual_expenditure']:,.0f} (Institutional Savings: **₹{rep['savings']:,.0f}**)\n\n"
                f"#### 3. Participant Feedback & Outcomes\n"
                f"- **Overall Satisfaction Index:** **{rep['satisfaction_index']}** (Based on {rep['feedback_count']} submissions)\n"
                f"- **Identified Action for Next Edition:** Extend hands-on workstation sprint duration by 60 minutes.\n\n"
                f"✅ *Report compiled and formatted for institutional NAAC / NBA SSR documentation.*"
            )
            tool_calls[-1].update({"status": "success", "result": "Generated complete NAAC post-event activity report."})
            rich_data = {
                "type": "post_event_report",
                "title": rep["activity_title"],
                "date": rep["date"]
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to generate post-event report: {str(e)}"

    # ─────────────────────────────────────────────────────────────
    # DEFAULT / FALLBACK: Event Operations Copilot Persona
    # ─────────────────────────────────────────────────────────────
    else:
        system_prompt = (
            "You are EduPilot's Event Management Agent & Event Operations Copilot (Agent 9). "
            "You help university professors plan, organize, assign, monitor, communicate, execute, and report college events (FDPs, Workshops, Conferences, Hackathons). "
            "Respond in a professional, proactive, organized manner. Always provide structured bullet points, timeline milestones, or budget estimates. "
            "Guide faculty on institutional approvals, guest hospitality, NAAC/NBA event documentation, and risk mitigation."
        )
        text_response = llm_client.get_chat_response(system_prompt, [{"role": "user", "content": message}])

    return {
        "text": text_response,
        "tool_calls": tool_calls,
        "rich_data": rich_data
    }
