import os
import json
import asyncio
from fastapi import FastAPI, Depends, HTTPException, status, Body, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Optional

from core.database import get_db, engine, Base
from core.models import (
    Faculty, Student, AttendanceRecord, Assignment, Submission, InternalMark,
    COAttainment, FacultyWorkload, Publication, GrantOpportunity, ResearchDeadline,
    QuestionBankItem, QuestionPaper, Rubric, Mentee, CheckIn, Escalation, Resume,
    Alumni, PlacementDrive, Internship, StudentOffer, InterviewMaterial
)
from core.auth import verify_password, create_access_token, verify_token
from core.seed import seed_database
from agents.faculty_assistant.agent import handle_faculty_assistant_chat
from agents.academic_workflow.agent import handle_academic_workflow_chat
from agents.analytics.agent import handle_analytics_chat
from agents.research_grants.agent import handle_research_grants_chat
from agents.exam_assessment.agent import handle_exam_assessment_chat
from agents.mentor_wellbeing.agent import handle_mentor_wellbeing_chat
from agents.aria_agent import handle_aria_unified_agent

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EduPilot Backend", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP, allow all origins. Can narrow in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def startup_event():
    # ── Auto-migrate student table columns (idempotent) ────────────────
    import sqlite3 as _sqlite3
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "edupilot.db"))
    if os.path.exists(db_path):
        try:
            _conn = _sqlite3.connect(db_path)
            _cur = _conn.cursor()
            _existing = [col[1] for col in _cur.execute("PRAGMA table_info(student)").fetchall()]
            _migrations = [
                ("register_no", "TEXT"),
                ("department", "TEXT"),
                ("batch", "TEXT"),
                ("placement_status", 'TEXT NOT NULL DEFAULT "Not Started"'),
                ("is_placement_student", "INTEGER NOT NULL DEFAULT 0"),
            ]
            for _col, _def in _migrations:
                if _col not in _existing:
                    _cur.execute(f"ALTER TABLE student ADD COLUMN {_col} {_def}")
            _conn.commit()
            _conn.close()
        except Exception as _me:
            print(f"[startup] student migration warning: {_me}")

    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "EduPilot API"}

# Auth API
@app.post("/auth/login")
def login(payload: dict = Body(...), db: Session = Depends(get_db)):
    email = payload.get("email")
    password = payload.get("password")
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required"
        )
        
    faculty = db.query(Faculty).filter(Faculty.email == email).first()
    if not faculty or not verify_password(password, faculty.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    access_token = create_access_token(data={"sub": faculty.email, "id": faculty.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": faculty.id,
            "name": faculty.name,
            "email": faculty.email,
            "department": faculty.department,
            "designation": faculty.designation
        }
    }

@app.get("/auth/me")
def get_current_user(token: str = Depends(verify_token), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    email = token.get("sub")
    faculty = db.query(Faculty).filter(Faculty.email == email).first()
    if not faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faculty member not found"
        )
    return {
        "id": faculty.id,
        "name": faculty.name,
        "email": faculty.email,
        "department": faculty.department,
        "designation": faculty.designation
    }

# Schedule CRUD API

@app.get("/api/schedule")
def get_schedule(token: Optional[dict] = Depends(verify_token), db: Session = Depends(get_db)):
    faculty_id = 1
    if token:
        faculty_id = token.get("id", 1)

    from core.models import Timetable
    schedules = db.query(Timetable).filter(Timetable.faculty_id == faculty_id).all()
    return [
        {
            "id": s.id,
            "day_of_week": s.day_of_week,
            "period": s.period,
            "subject": s.subject,
            "class_section": s.class_section,
            "room": s.room
        }
        for s in schedules
    ]

@app.post("/api/schedule")
def create_schedule(payload: dict = Body(...), token: Optional[dict] = Depends(verify_token), db: Session = Depends(get_db)):
    faculty_id = 1
    if token:
        faculty_id = token.get("id", 1)

    day_of_week = payload.get("day_of_week")
    period = payload.get("period")
    subject = payload.get("subject")
    class_section = payload.get("class_section")
    room = payload.get("room")

    if not all([day_of_week, period, subject, class_section, room]):
        raise HTTPException(status_code=400, detail="Missing required fields")

    from core.models import Timetable
    new_slot = Timetable(
        faculty_id=faculty_id,
        day_of_week=day_of_week,
        period=period,
        subject=subject,
        class_section=class_section,
        room=room
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)

    return {
        "id": new_slot.id,
        "day_of_week": new_slot.day_of_week,
        "period": new_slot.period,
        "subject": new_slot.subject,
        "class_section": new_slot.class_section,
        "room": new_slot.room
    }

@app.put("/api/schedule/{slot_id}")
def update_schedule(slot_id: int, payload: dict = Body(...), token: Optional[dict] = Depends(verify_token), db: Session = Depends(get_db)):
    faculty_id = 1
    if token:
        faculty_id = token.get("id", 1)

    from core.models import Timetable
    slot = db.query(Timetable).filter(Timetable.id == slot_id, Timetable.faculty_id == faculty_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Schedule slot not found")

    if "day_of_week" in payload:
        slot.day_of_week = payload["day_of_week"]
    if "period" in payload:
        slot.period = payload["period"]
    if "subject" in payload:
        slot.subject = payload["subject"]
    if "class_section" in payload:
        slot.class_section = payload["class_section"]
    if "room" in payload:
        slot.room = payload["room"]

    db.commit()
    db.refresh(slot)

    return {
        "id": slot.id,
        "day_of_week": slot.day_of_week,
        "period": slot.period,
        "subject": slot.subject,
        "class_section": slot.class_section,
        "room": slot.room
    }

@app.delete("/api/schedule/{slot_id}")
def delete_schedule(slot_id: int, token: Optional[dict] = Depends(verify_token), db: Session = Depends(get_db)):
    faculty_id = 1
    if token:
        faculty_id = token.get("id", 1)

    from core.models import Timetable
    slot = db.query(Timetable).filter(Timetable.id == slot_id, Timetable.faculty_id == faculty_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Schedule slot not found")

    db.delete(slot)
    db.commit()

    return {"status": "success", "message": f"Deleted slot {slot_id}"}

@app.post("/api/schedule/bulk")
def bulk_upload_schedule(payload: dict = Body(...), token: Optional[dict] = Depends(verify_token), db: Session = Depends(get_db)):
    faculty_id = 1
    if token:
        faculty_id = token.get("id", 1)

    slots_data = payload.get("slots")
    if not isinstance(slots_data, list):
        raise HTTPException(status_code=400, detail="slots must be a list")

    from core.models import Timetable
    
    # Delete existing schedules for this faculty if requested (overwrite mode)
    overwrite = payload.get("overwrite", False)
    if overwrite:
        db.query(Timetable).filter(Timetable.faculty_id == faculty_id).delete()

    added_slots = []
    for slot_data in slots_data:
        day_of_week = slot_data.get("day_of_week")
        period = slot_data.get("period")
        subject = slot_data.get("subject")
        class_section = slot_data.get("class_section")
        room = slot_data.get("room")

        if not all([day_of_week, period, subject, class_section, room]):
            continue

        new_slot = Timetable(
            faculty_id=faculty_id,
            day_of_week=day_of_week,
            period=period,
            subject=subject,
            class_section=class_section,
            room=room
        )
        db.add(new_slot)
        added_slots.append(new_slot)

    db.commit()
    return {
        "status": "success",
        "count": len(added_slots),
        "message": f"Successfully imported {len(added_slots)} schedule slots."
    }

# Policy Upload API

@app.post("/api/policy")
async def upload_policy(
    title: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not title or not category:
        raise HTTPException(status_code=400, detail="Title and Category are required")
        
    try:
        content = await file.read()
        text_content = content.decode("utf-8", errors="ignore")
        
        # Save file locally
        policies_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "policies")
        os.makedirs(policies_dir, exist_ok=True)
        
        safe_filename = "".join([c if c.isalnum() or c in (".", "_", "-") else "_" for c in file.filename])
        file_path = os.path.join("policies", safe_filename)
        abs_file_path = os.path.join(policies_dir, safe_filename)
        
        with open(abs_file_path, "w", encoding="utf-8") as f:
            f.write(text_content)
            
        from core.models import PolicyDocument
        
        existing = db.query(PolicyDocument).filter(PolicyDocument.title == title).first()
        if existing:
            existing.category = category
            existing.file_path = file_path
            policy_doc = existing
        else:
            policy_doc = PolicyDocument(
                title=title,
                category=category,
                file_path=file_path
            )
            db.add(policy_doc)
            
        db.commit()
        db.refresh(policy_doc)
        
        # Ingest document chunks into RAG
        from rag.rag_pipeline import rag_pipeline
        rag_pipeline.ingest_document(
            title=title,
            text=text_content,
            category=category,
            source_name=file_path
        )
        
        return {
            "status": "success",
            "id": policy_doc.id,
            "title": policy_doc.title,
            "category": policy_doc.category,
            "file_path": policy_doc.file_path,
            "message": "Policy successfully uploaded and ingested into RAG pipeline."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Policy upload failed: {str(e)}")

# Syllabus CRUD API

@app.get("/api/subjects")
def get_subjects(token: Optional[dict] = Depends(verify_token), db: Session = Depends(get_db)):
    faculty_id = 1
    if token:
        faculty_id = token.get("id", 1)
        
    from core.models import Timetable
    subjects = db.query(Timetable.subject).filter(Timetable.faculty_id == faculty_id).distinct().all()
    return [s[0] for s in subjects if s[0]]

@app.get("/api/syllabus/{subject}")
def get_syllabus(subject: str, db: Session = Depends(get_db)):
    from core.models import SyllabusUnit
    units = db.query(SyllabusUnit).filter(SyllabusUnit.subject == subject).all()
    return [
        {
            "id": u.id,
            "subject": u.subject,
            "unit_number": u.unit_number,
            "title": u.title,
            "topics": u.topics,
            "pdf_url": u.pdf_url
        }
        for u in units
    ]

@app.post("/api/syllabus")
def create_syllabus_unit(payload: dict = Body(...), db: Session = Depends(get_db)):
    subject = payload.get("subject")
    unit_number = payload.get("unit_number")
    title = payload.get("title")
    topics = payload.get("topics")
    pdf_url = payload.get("pdf_url")
    
    if not all([subject, unit_number, title, topics]):
        raise HTTPException(status_code=400, detail="Missing required fields")
        
    from core.models import SyllabusUnit
    new_unit = SyllabusUnit(
        subject=subject,
        unit_number=int(unit_number),
        title=title,
        topics=topics,
        pdf_url=pdf_url
    )
    db.add(new_unit)
    db.commit()
    db.refresh(new_unit)
    return {
        "id": new_unit.id,
        "subject": new_unit.subject,
        "unit_number": new_unit.unit_number,
        "title": new_unit.title,
        "topics": new_unit.topics,
        "pdf_url": new_unit.pdf_url
    }

@app.post("/api/syllabus/bulk")
def bulk_upload_syllabus(payload: dict = Body(...), db: Session = Depends(get_db)):
    subject = payload.get("subject")
    units_data = payload.get("units")
    overwrite = payload.get("overwrite", False)
    
    if not subject or not isinstance(units_data, list):
        raise HTTPException(status_code=400, detail="Invalid payload")
        
    from core.models import SyllabusUnit
    
    if overwrite:
        db.query(SyllabusUnit).filter(SyllabusUnit.subject == subject).delete()
        
    added_units = []
    for u_data in units_data:
        unit_number = u_data.get("unit_number")
        title = u_data.get("title")
        topics = u_data.get("topics")
        pdf_url = u_data.get("pdf_url")
        
        if not all([unit_number, title, topics]):
            continue
            
        new_unit = SyllabusUnit(
            subject=subject,
            unit_number=int(unit_number),
            title=title,
            topics=topics,
            pdf_url=pdf_url
        )
        db.add(new_unit)
        added_units.append(new_unit)
        
    db.commit()
    return {
        "status": "success",
        "count": len(added_units),
        "message": f"Successfully imported {len(added_units)} syllabus units for {subject}."
    }

# Agent Chat endpoints

@app.post("/agents/chat")
def general_agent_chat(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    General agent chat endpoint.
    Accepts: { agent_id, message, session_id, history }
    """
    agent_id = payload.get("agent_id")
    message = payload.get("message", "")
    history = payload.get("history", [])
    
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")
        
    return handle_aria_unified_agent(message, 1, db, history, agent_id)

@app.post("/agents/{agent_id}/chat")
def agent_chat_stream(agent_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Streamed chat for ARIA Unified Agent via Server-Sent Events (SSE)
    """
    message = payload.get("message", "")
    history = payload.get("history", [])
    faculty_id = payload.get("faculty_id", 1) 

    async def event_generator():
        try:
            agent_result = handle_aria_unified_agent(message, faculty_id, db, history, agent_id)

            text_response = agent_result["text"]
            tool_calls = agent_result["tool_calls"]
            rich_data = agent_result["rich_data"]

            # Stream the tool trace visual
            if tool_calls:
                for tc in tool_calls:
                    yield f"data: {json.dumps({'type': 'trace', 'name': tc['name'], 'status': 'running'})}\n\n"
                    await asyncio.sleep(0.3)
                    yield f"data: {json.dumps({'type': 'trace', 'name': tc['name'], 'status': tc['status'], 'result': tc.get('result', '')})}\n\n"
                    await asyncio.sleep(0.1)

            # Stream words
            words = text_response.split(" ")
            for i, word in enumerate(words):
                space = " " if i < len(words) - 1 else ""
                yield f"data: {json.dumps({'type': 'content', 'delta': word + space})}\n\n"
                await asyncio.sleep(0.01)

            # Yield final done response
            yield f"data: {json.dumps({'type': 'done', 'tool_calls': tool_calls, 'rich_data': rich_data})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/agents/faculty-assistant/chat")
def legacy_faculty_assistant_chat_stream(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Legacy backward compatibility stream mapping"""
    return agent_chat_stream("agent1", payload, db)


# ==========================================
# REST API FOR ACADEMIC WORKFLOW (AGENT 2)
# ==========================================

@app.get("/api/attendance")
def get_attendance(class_section: str = "CCE", date: str = None, db: Session = Depends(get_db)):
    if not date:
        latest_date_row = db.query(AttendanceRecord.date).filter(
            AttendanceRecord.class_section == class_section
        ).order_by(AttendanceRecord.date.desc()).first()
        
        if not latest_date_row:
            return []
        date = latest_date_row[0]
        
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.class_section == class_section,
        AttendanceRecord.date == date
    ).all()
    
    res = []
    for r in records:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        res.append({
            "id": r.id,
            "roll_no": student.roll_no if student else "N/A",
            "name": student.name if student else "N/A",
            "date": r.date,
            "status": r.status,
            "period": r.period,
            "subject": r.subject,
            "class_section": r.class_section
        })
    return res

@app.get("/api/attendance/dates")
def get_recorded_dates(class_section: str = "CCE", db: Session = Depends(get_db)):
    rows = db.query(AttendanceRecord.date, AttendanceRecord.period).filter(
        AttendanceRecord.class_section == class_section
    ).distinct().all()
    return [{"date": r[0], "period": r[1]} for r in rows]

@app.post("/api/attendance/mark")
def mark_attendance(payload: dict = Body(...), db: Session = Depends(get_db)):
    roll_no = payload.get("roll_no")
    date = payload.get("date", datetime.date.today().strftime("%Y-%m-%d"))
    status = payload.get("status", "Present")
    subject = payload.get("subject", "Design & Analysis of Algorithms")
    class_section = payload.get("class_section", "CSE-A")
    period = payload.get("period", "09:00 - 10:00")

    student = db.query(Student).filter(Student.roll_no == roll_no).first()
    if not student:
         raise HTTPException(status_code=404, detail="Student not found")

    # Update or insert
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.date == date,
        AttendanceRecord.subject == subject
    ).first()

    if record:
        record.status = status
    else:
        record = AttendanceRecord(
            student_id=student.id,
            date=date,
            status=status,
            period=period,
            subject=subject,
            class_section=class_section
        )
        db.add(record)
    
    db.commit()
    return {"status": "success", "message": f"Attendance marked for {roll_no} as {status}."}

@app.post("/api/attendance/bulk-save")
def bulk_save_attendance(payload: dict = Body(...), db: Session = Depends(get_db)):
    date = payload.get("date", datetime.date.today().strftime("%Y-%m-%d"))
    period = payload.get("period", "09:00 - 10:00")
    subject = payload.get("subject", "Design & Analysis of Algorithms")
    class_section = payload.get("class_section", "CCE")
    records = payload.get("records", [])

    for r_data in records:
        roll_no = r_data.get("roll_no")
        status = r_data.get("status", "Present")
        if not roll_no:
            continue
            
        student = db.query(Student).filter(Student.roll_no == roll_no).first()
        if not student:
            continue
            
        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.date == date,
            AttendanceRecord.subject == subject,
            AttendanceRecord.period == period
        ).first()
        
        if record:
            record.status = status
        else:
            record = AttendanceRecord(
                student_id=student.id,
                date=date,
                status=status,
                period=period,
                subject=subject,
                class_section=class_section
            )
            db.add(record)
            db.flush()
            
        all_att = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student.id,
            AttendanceRecord.subject == subject
        ).all()
        
        if all_att:
            p_count = sum(1 for a in all_att if a.status == "Present")
            pct = int((p_count / len(all_att)) * 100)
            
            mark = db.query(InternalMark).filter(
                InternalMark.student_id == student.id,
                InternalMark.subject == subject
            ).first()
            if mark:
                mark.attendance_percentage = pct
            else:
                mark = InternalMark(
                    student_id=student.id,
                    subject=subject,
                    attendance_percentage=pct
                )
                db.add(mark)
                
    db.commit()
    return {"status": "success", "message": f"Successfully stored daily attendance for {len(records)} students."}

@app.get("/api/assignments")
def get_assignments(db: Session = Depends(get_db)):
    assigns = db.query(Assignment).all()
    res = []
    for a in assigns:
        # Get submissions count
        subs = db.query(Submission).filter(Submission.assignment_id == a.id).all()
        res.append({
            "id": a.id,
            "title": a.title,
            "subject": a.subject,
            "class_section": a.class_section,
            "due_date": a.due_date,
            "max_marks": a.max_marks,
            "status": a.status,
            "submissions_count": len(subs),
            "graded_count": len([s for s in subs if s.status == "Graded"])
        })
    return res

@app.post("/api/assignments/schedule")
def schedule_assignment(payload: dict = Body(...), db: Session = Depends(get_db)):
    title = payload.get("title")
    subject = payload.get("subject", "Design & Analysis of Algorithms")
    class_section = payload.get("class_section", "CSE-A")
    due_date = payload.get("due_date")
    max_marks = payload.get("max_marks", 10)

    if not title or not due_date:
        raise HTTPException(status_code=400, detail="Title and due date are required")

    new_assign = Assignment(
        title=title,
        subject=subject,
        class_section=class_section,
        due_date=due_date,
        max_marks=max_marks,
        status="Open"
    )
    db.add(new_assign)
    db.commit()
    db.refresh(new_assign)
    
    # Auto-seed submissions for students in that class section
    students = db.query(Student).filter(Student.class_section == class_section).all()
    for s in students:
        # Just create blank pending submissions
        sub = Submission(
            assignment_id=new_assign.id,
            student_id=s.id,
            submitted_at="-",
            marks_obtained=None,
            status="Pending"
        )
        db.add(sub)
    db.commit()

    return {"status": "success", "id": new_assign.id, "message": f"Assignment scheduled for {class_section}."}

@app.get("/api/marks")
def get_marks(class_section: str = "CCE", db: Session = Depends(get_db)):
    marks = db.query(InternalMark).join(
        Student, Student.id == InternalMark.student_id
    ).filter(Student.class_section == class_section).all()
    res = []
    for m in marks:
        student = db.query(Student).filter(Student.id == m.student_id).first()
        res.append({
            "id": m.id,
            "roll_no": student.roll_no if student else "N/A",
            "name": student.name if student else "N/A",
            "subject": m.subject,
            "cat1_marks": m.cat1_marks,
            "cat2_marks": m.cat2_marks,
            "assignment_marks": m.assignment_marks,
            "lab_marks": m.lab_marks,
            "total_marks": m.total_marks,
            "attendance_percentage": m.attendance_percentage
        })
    return res

@app.post("/api/marks/calculate")
def calculate_marks(payload: dict = Body(...), db: Session = Depends(get_db)):
    # Re-sums the marks
    marks = db.query(InternalMark).all()
    for m in marks:
        m.total_marks = (m.cat1_marks or 0) + (m.cat2_marks or 0) + (m.assignment_marks or 0) + (m.lab_marks or 0)
    db.commit()
    return {"status": "success", "message": "Calculated total marks successfully."}

@app.get("/api/reminders")
def get_reminders_list():
    return [
        {"id": 1, "task": "Grade DAA Assignment 2 (Greedy)", "due": "2026-08-05", "urgency": "high"},
        {"id": 2, "task": "Syllabus mapping validation for CAT2 papers", "due": "2026-08-06", "urgency": "medium"},
        {"id": 3, "task": "Mentee check-in with A. Kumar (overdue)", "due": "2026-07-30", "urgency": "high"}
    ]


@app.post("/api/students/upload-namelist")
async def upload_namelist(
    file: UploadFile = File(...),
    class_section: str = Form("CSE-A"),
    subject: str = Form("Design & Analysis of Algorithms"),
    db: Session = Depends(get_db)
):
    import re
    import json
    import io
    from core.llm import llm_client

    filename = file.filename.lower()
    contents = await file.read()
    
    students_to_process = []
    
    # helper for regex fallback
    def regex_parse_students(text: str, default_sec: str) -> list:
        parsed = []
        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue
            email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', line)
            email = email_match.group(0) if email_match else None
            
            roll_match = re.search(r'\b([0-9]{2}[A-Za-z]{2,3}[0-9]{3,5})\b', line)
            if not roll_match:
                roll_match = re.search(r'\b([A-Za-z]+[0-9]+[A-Za-z0-9]*|[0-9]+[A-Za-z]+[A-Za-z0-9]*)\b', line)
                
            if roll_match:
                roll_no = roll_match.group(1).upper()
                if len(roll_no) < 4:
                    continue
                temp_line = line.replace(roll_match.group(0), "")
                if email:
                    temp_line = temp_line.replace(email, "")
                
                temp_line = re.sub(r'[,;|\t:_\-\(\)\[\]]', ' ', temp_line).strip()
                words = temp_line.split()
                name_words = [w for w in words if w.isalpha() or '.' in w]
                filtered_words = []
                for w in name_words:
                    w_lower = w.lower()
                    if w_lower in ["cse-a", "cse-b", "cse", "ece", "eee", "mech", "civil", "it", "section"]:
                        continue
                    filtered_words.append(w)
                name = " ".join(filtered_words)
                if not name or len(name) < 2:
                    name = "Student " + roll_no
                    
                parsed.append({
                    "roll_no": roll_no,
                    "name": name,
                    "email": email or f"{roll_no.lower()}@student.edu",
                    "class_section": default_sec
                })
        return parsed

    # 1. Parse based on file type
    if filename.endswith(".csv"):
        import csv
        try:
            decoded = contents.decode("utf-8")
        except UnicodeDecodeError:
            decoded = contents.decode("latin-1")
            
        reader = csv.reader(io.StringIO(decoded))
        try:
            headers = next(reader)
            headers = [h.strip().lower() for h in headers]
            roll_idx, name_idx, email_idx, sec_idx = -1, -1, -1, -1
            for idx, h in enumerate(headers):
                if "roll" in h:
                    roll_idx = idx
                elif "name" in h:
                    name_idx = idx
                elif "email" in h:
                    email_idx = idx
                elif "section" in h or "class" in h:
                    sec_idx = idx
                    
            if roll_idx == -1 or name_idx == -1:
                roll_idx, name_idx = 0, 1
                email_idx = 2 if len(headers) > 2 else -1
                sec_idx = 3 if len(headers) > 3 else -1
                reader = csv.reader(io.StringIO(decoded)) # Reset to start if headers are data
                
            for row in reader:
                if not row or len(row) <= max(roll_idx, name_idx):
                    continue
                roll_no = row[roll_idx].strip()
                name = row[name_idx].strip()
                if not roll_no or not name:
                    continue
                email = row[email_idx].strip() if (email_idx != -1 and len(row) > email_idx) else f"{roll_no.lower()}@student.edu"
                row_sec = row[sec_idx].strip() if (sec_idx != -1 and len(row) > sec_idx) else class_section
                students_to_process.append({
                    "roll_no": roll_no,
                    "name": name,
                    "email": email,
                    "class_section": row_sec
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        import openpyxl
        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            sheet = wb.active
            rows = list(sheet.iter_rows(values_only=True))
            
            if not rows:
                raise HTTPException(status_code=400, detail="Empty Excel file uploaded")
                
            header_idx = -1
            roll_col, name_col, email_col, sec_col = -1, -1, -1, -1
            
            # Step A: Attempt standard header-based matching
            for idx, r in enumerate(rows[:15]):
                cells = [str(c).lower().strip() if c is not None else "" for c in r]
                r_idx = next((i for i, c in enumerate(cells) if any(x in c for x in ["roll", "reg", "admission", "student id", "r.no", "id"])), -1)
                n_idx = next((i for i, c in enumerate(cells) if any(x in c for x in ["name", "fullname", "student name", "candidate"])), -1)
                if r_idx != -1 and n_idx != -1:
                    header_idx = idx
                    roll_col = r_idx
                    name_col = n_idx
                    email_col = next((i for i, c in enumerate(cells) if any(x in c for x in ["email", "mail", "e-mail"])), -1)
                    sec_col = next((i for i, c in enumerate(cells) if any(x in c for x in ["section", "class", "sec"])), -1)
                    break
                    
            # Step B: If headers are not matched, perform statistical column classification
            if roll_col == -1 or name_col == -1:
                num_cols = len(rows[0]) if rows else 0
                col_scores = []
                for col_idx in range(num_cols):
                    roll_score = 0
                    name_score = 0
                    email_score = 0
                    for r in rows[:40]:
                        if col_idx >= len(r) or r[col_idx] is None:
                            continue
                        val = str(r[col_idx]).strip()
                        if not val:
                            continue
                        if "@" in val and "." in val:
                            email_score += 1.5
                        elif len(val) >= 4 and len(val) <= 15 and any(c.isdigit() for c in val) and any(c.isalpha() for c in val):
                            roll_score += 1.0
                        elif val.isdigit() and len(val) >= 4 and len(val) <= 12:
                            roll_score += 0.7
                        elif len(val) >= 3 and len(val) <= 40 and all(x.isalpha() or x.isspace() or x=='.' for x in val):
                            name_score += 1.0
                    col_scores.append({'roll': roll_score, 'name': name_score, 'email': email_score})
                    
                if num_cols > 0:
                    roll_col = max(range(num_cols), key=lambda i: col_scores[i]['roll'])
                    name_col = max(range(num_cols), key=lambda i: col_scores[i]['name'])
                    email_col = max(range(num_cols), key=lambda i: col_scores[i]['email'])
                    
                    if col_scores[email_col]['email'] == 0:
                        email_col = -1
                    if roll_col == name_col:
                        name_col = next((i for i in sorted(range(num_cols), key=lambda i: col_scores[i]['name'], reverse=True) if i != roll_col), 1 if roll_col != 1 else 0)
                
                header_idx = 0

            start_row = header_idx + 1 if header_idx != -1 else 0
            for r in rows[start_row:]:
                if not r or len(r) <= max(roll_col, name_col):
                    continue
                roll_no = str(r[roll_col]).strip() if r[roll_col] is not None else ""
                name = str(r[name_col]).strip() if r[name_col] is not None else ""
                
                if not roll_no or roll_no.lower() == "none" or not name or name.lower() == "none":
                    continue
                if not re.search(r'[A-Za-z0-9]', roll_no):
                    continue
                if any(x in roll_no.lower() for x in ["roll", "reg", "name"]):
                    continue
                    
                email = str(r[email_col]).strip() if (email_col != -1 and email_col < len(r) and r[email_col] is not None) else f"{roll_no.lower()}@student.edu"
                sec = str(r[sec_col]).strip() if (sec_col != -1 and sec_col < len(r) and r[sec_col] is not None) else class_section
                students_to_process.append({
                    "roll_no": roll_no,
                    "name": name,
                    "email": email,
                    "class_section": sec
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {str(e)}")

    elif filename.endswith(".pdf"):
        import pypdf
        try:
            reader = pypdf.PdfReader(io.BytesIO(contents))
            pdf_text = ""
            for page in reader.pages:
                pdf_text += page.extract_text() + "\n"
                
            if not pdf_text.strip():
                raise HTTPException(status_code=400, detail="No readable text found in PDF file.")
                
            # If Claude LLM is available, use it for intelligent parsing
            if llm_client.client:
                system_prompt = (
                    "You are an expert data extraction assistant. "
                    "Extract a list of students from the provided raw text. "
                    "Identify the roll number, student name, email, and class section for each student. "
                    "Return ONLY a valid JSON list of objects. Each object must have these keys: "
                    "'roll_no' (string), 'name' (string), 'email' (string), 'class_section' (string). "
                    f"If email is not found, construct it like 'roll_no@student.edu' (lowercase). "
                    f"If class_section is not found, default to '{class_section}'. "
                    "Do not output markdown code blocks, comments, or any text other than raw JSON."
                )
                messages = [{"role": "user", "content": f"Extract students from this text:\n\n{pdf_text}"}]
                response = llm_client.get_chat_response(system_prompt, messages)
                
                # clean response in case it contains markdown blocks
                if "```" in response:
                    parts = response.split("```")
                    for p in parts:
                        p_clean = p.strip()
                        if p_clean.startswith("json"):
                            p_clean = p_clean[4:].strip()
                        if p_clean.startswith("[") and p_clean.endswith("]"):
                            response = p_clean
                            break
                try:
                    students_to_process = json.loads(response)
                except Exception:
                    students_to_process = regex_parse_students(pdf_text, class_section)
            else:
                students_to_process = regex_parse_students(pdf_text, class_section)
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    else:
        # Fallback as text file
        try:
            text = contents.decode("utf-8")
        except UnicodeDecodeError:
            text = contents.decode("latin-1")
        students_to_process = regex_parse_students(text, class_section)

    if not students_to_process:
        raise HTTPException(status_code=400, detail="No student data could be extracted from the uploaded file. Please verify the format.")

    students_created = 0
    students_updated = 0
    
    for s_data in students_to_process:
        roll_no = s_data.get("roll_no", "").strip()
        name = s_data.get("name", "").strip()
        if not roll_no or not name:
            continue
            
        email = s_data.get("email", "").strip() or f"{roll_no.lower()}@student.edu"
        row_sec = s_data.get("class_section", "").strip() or class_section
        
        student = db.query(Student).filter(Student.roll_no == roll_no).first()
        if student:
            student.name = name
            student.email = email
            student.class_section = row_sec
            students_updated += 1
        else:
            student = Student(
                roll_no=roll_no,
                name=name,
                email=email,
                class_section=row_sec
            )
            db.add(student)
            db.flush()
            students_created += 1
            
        dates = db.query(AttendanceRecord.date).filter(
            AttendanceRecord.class_section == row_sec
        ).distinct().all()
        dates = [d[0] for d in dates]
        if not dates:
            dates = ["2026-07-27"]
            
        for dt in dates:
            att = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == student.id,
                AttendanceRecord.date == dt,
                AttendanceRecord.subject == subject
            ).first()
            if not att:
                existing_att = db.query(AttendanceRecord).filter(
                    AttendanceRecord.date == dt,
                    AttendanceRecord.subject == subject,
                    AttendanceRecord.class_section == row_sec
                ).first()
                period = existing_att.period if existing_att else "09:00 - 10:00"
                
                att = AttendanceRecord(
                    student_id=student.id,
                    date=dt,
                    status="Present",
                    period=period,
                    subject=subject,
                    class_section=row_sec
                )
                db.add(att)
                
        mark = db.query(InternalMark).filter(
            InternalMark.student_id == student.id,
            InternalMark.subject == subject
        ).first()
        if not mark:
            mark = InternalMark(
                student_id=student.id,
                subject=subject,
                cat1_marks=None,
                cat2_marks=None,
                assignment_marks=None,
                lab_marks=None,
                total_marks=None,
                attendance_percentage=100
            )
            db.add(mark)
            
        assignments = db.query(Assignment).filter(
            Assignment.class_section == row_sec
        ).all()
        for assign in assignments:
            sub = db.query(Submission).filter(
                Submission.assignment_id == assign.id,
                Submission.student_id == student.id
            ).first()
            if not sub:
                sub = Submission(
                    assignment_id=assign.id,
                    student_id=student.id,
                    submitted_at="-",
                    marks_obtained=None,
                    status="Pending"
                )
                db.add(sub)
                
    db.commit()
    return {
        "status": "success",
        "message": f"Namelist processed: {students_created} students created, {students_updated} updated.",
        "created": students_created,
        "updated": students_updated
    }


@app.post("/api/academic/deduplicate")
def deduplicate_academic_data(db: Session = Depends(get_db)):
    from sqlalchemy import func
    
    # 1. Deduplicate AttendanceRecord
    dups_att = db.query(
        AttendanceRecord.student_id, AttendanceRecord.date, AttendanceRecord.subject, AttendanceRecord.period
    ).group_by(
        AttendanceRecord.student_id, AttendanceRecord.date, AttendanceRecord.subject, AttendanceRecord.period
    ).having(func.count(AttendanceRecord.id) > 1).all()
    
    removed_att = 0
    for s_id, dt, subj, prd in dups_att:
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == s_id,
            AttendanceRecord.date == dt,
            AttendanceRecord.subject == subj,
            AttendanceRecord.period == prd
        ).order_by(AttendanceRecord.id.asc()).all()
        for r in records[1:]:
            db.delete(r)
            removed_att += 1
            
    # 2. Deduplicate InternalMark
    dups_mark = db.query(
        InternalMark.student_id, InternalMark.subject
    ).group_by(
        InternalMark.student_id, InternalMark.subject
    ).having(func.count(InternalMark.id) > 1).all()
    
    removed_mark = 0
    for s_id, subj in dups_mark:
        records = db.query(InternalMark).filter(
            InternalMark.student_id == s_id,
            InternalMark.subject == subj
        ).order_by(InternalMark.id.asc()).all()
        for r in records[1:]:
            db.delete(r)
            removed_mark += 1
            
    # 3. Deduplicate Submission
    dups_sub = db.query(
        Submission.student_id, Submission.assignment_id
    ).group_by(
        Submission.student_id, Submission.assignment_id
    ).having(func.count(Submission.id) > 1).all()
    
    removed_sub = 0
    for s_id, a_id in dups_sub:
        records = db.query(Submission).filter(
            Submission.student_id == s_id,
            Submission.assignment_id == a_id
        ).order_by(Submission.id.asc()).all()
        for r in records[1:]:
            db.delete(r)
            removed_sub += 1
            
    db.commit()
    return {
        "status": "success",
        "message": f"Removed {removed_att + removed_mark + removed_sub} duplicate records.",
        "removed_attendance": removed_att,
        "removed_marks": removed_mark,
        "removed_submissions": removed_sub,
        "total_removed": removed_att + removed_mark + removed_sub
    }



# ==========================================
# REST API FOR ANALYTICS (AGENT 3)
# ==========================================

@app.get("/api/analytics/kpis")
def get_analytics_kpis(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    attendance_records = db.query(AttendanceRecord).all()
    present_count = len([r for r in attendance_records if r.status == "Present"])
    avg_attendance = int((present_count / len(attendance_records)) * 100) if attendance_records else 100
    
    marks = db.query(InternalMark).all()
    avg_marks = int(sum([m.total_marks for m in marks]) / len(marks)) if marks else 0
    
    co_att = db.query(COAttainment).all()
    attained_count = len([c for c in co_att if c.attained_percentage >= c.target_percentage])
    co_attainment_rate = int((attained_count / len(co_att)) * 100) if co_att else 0

    return {
        "total_students": total_students,
        "avg_attendance": avg_attendance,
        "avg_internal_marks": f"{avg_marks}/50",
        "co_attainment_rate": f"{co_attainment_rate}%"
    }

@app.get("/api/analytics/charts")
def get_analytics_charts(db: Session = Depends(get_db)):
    # Performance distribution: ranges 0-10, 10-20, 20-30, 30-40, 40-50
    marks = db.query(InternalMark).all()
    distribution = {"0-10": 0, "10-20": 0, "20-30": 0, "30-40": 0, "40-50": 0}
    for m in marks:
        val = m.total_marks or 0
        if val <= 10: distribution["0-10"] += 1
        elif val <= 20: distribution["10-20"] += 1
        elif val <= 30: distribution["20-30"] += 1
        elif val <= 40: distribution["30-40"] += 1
        else: distribution["40-50"] += 1
    
    performance_chart = [{"range": k, "count": v} for k, v in distribution.items()]
    
    # Attendance trend (by date)
    attendance_records = db.query(AttendanceRecord).all()
    dates_map = {}
    for r in attendance_records:
        dates_map.setdefault(r.date, []).append(r.status)
    attendance_chart = []
    for date, statuses in sorted(dates_map.items()):
        presents = len([s for s in statuses if s == "Present"])
        attendance_chart.append({
            "date": date,
            "rate": int((presents / len(statuses)) * 100)
        })
        
    # CO attainments
    co_records = db.query(COAttainment).all()
    co_chart = [{"co": c.co_number, "target": c.target_percentage, "attained": c.attained_percentage} for c in co_records]

    return {
        "performance_chart": performance_chart,
        "attendance_chart": attendance_chart,
        "co_chart": co_chart
    }

@app.get("/api/analytics/at-risk")
def get_at_risk_analytics(db: Session = Depends(get_db)):
    marks = db.query(InternalMark).filter(InternalMark.attendance_percentage < 75).all()
    res = []
    for m in marks:
        student = db.query(Student).filter(Student.id == m.student_id).first()
        if student:
            res.append({
                "roll_no": student.roll_no,
                "name": student.name,
                "attendance": m.attendance_percentage,
                "marks": m.total_marks,
                "risk_level": "High" if m.attendance_percentage < 50 else "Medium"
            })
    return res

@app.get("/api/analytics/report/pdf")
def get_analytics_pdf():
    return {
        "status": "success",
        "url": "/reports/nba_attainment_draft.pdf",
        "message": "Styled Draft PDF report generated on Letterhead."
    }


# ==========================================
# REST API FOR RESEARCH & GRANTS (AGENT 4)
# ==========================================

@app.get("/api/research/publications")
def get_publications(db: Session = Depends(get_db)):
    pubs = db.query(Publication).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "venue": p.venue,
            "type": p.type,
            "year": p.year,
            "co_authors": p.co_authors,
            "doi_or_link": p.doi_or_link,
            "citation_count": p.citation_count
        }
        for p in pubs
    ]

@app.post("/api/research/publications")
def log_publication(payload: dict = Body(...), db: Session = Depends(get_db)):
    title = payload.get("title")
    venue = payload.get("venue")
    type_ = payload.get("type", "journal")
    year = payload.get("year", 2026)
    co_authors = payload.get("co_authors")
    doi_or_link = payload.get("doi_or_link")

    if not title or not venue:
        raise HTTPException(status_code=400, detail="Title and venue are required")

    new_pub = Publication(
        faculty_id=1,
        title=title,
        venue=venue,
        type=type_,
        year=year,
        co_authors=co_authors,
        doi_or_link=doi_or_link,
        citation_count=0
    )
    db.add(new_pub)
    db.commit()
    db.refresh(new_pub)
    return {"status": "success", "id": new_pub.id, "message": "Publication logged successfully."}

@app.get("/api/research/grants")
def get_grants(db: Session = Depends(get_db)):
    grants = db.query(GrantOpportunity).all()
    return [
        {
            "id": g.id,
            "title": g.title,
            "funding_body": g.funding_body,
            "amount": g.amount,
            "eligibility": g.eligibility,
            "deadline": g.deadline,
            "focus_area": g.focus_area
        }
        for g in grants
    ]

@app.get("/api/research/deadlines")
def get_research_deadlines(db: Session = Depends(get_db)):
    deadlines = db.query(ResearchDeadline).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "type": d.type,
            "due_date": d.due_date
        }
        for d in deadlines
    ]


# ==========================================
# REST API FOR EXAM & ASSESSMENT (AGENT 5)
# ==========================================

@app.get("/api/exam/questions")
def get_questions_bank(db: Session = Depends(get_db)):
    items = db.query(QuestionBankItem).all()
    return [
        {
            "id": i.id,
            "subject": i.subject,
            "unit": i.unit,
            "co_number": i.co_number,
            "bloom_level": i.bloom_level,
            "question_text": i.question_text,
            "marks": i.marks,
            "difficulty": i.difficulty
        }
        for i in items
    ]

@app.post("/api/exam/questions")
def add_question(payload: dict = Body(...), db: Session = Depends(get_db)):
    subject = payload.get("subject", "Design & Analysis of Algorithms")
    unit = payload.get("unit")
    co_number = payload.get("co_number")
    bloom_level = payload.get("bloom_level")
    question_text = payload.get("question_text")
    marks = payload.get("marks")
    difficulty = payload.get("difficulty", "Medium")

    if not all([unit, co_number, bloom_level, question_text, marks]):
        raise HTTPException(status_code=400, detail="Missing required question parameters")

    new_q = QuestionBankItem(
        subject=subject,
        unit=unit,
        co_number=co_number,
        bloom_level=bloom_level,
        question_text=question_text,
        marks=marks,
        difficulty=difficulty
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return {"status": "success", "id": new_q.id, "message": "Question added to bank."}

@app.post("/api/exam/generate-paper")
def generate_paper(payload: dict = Body(...), db: Session = Depends(get_db)):
    subject = payload.get("subject", "Design & Analysis of Algorithms")
    exam_type = payload.get("exam_type", "CAT2")
    total_marks = payload.get("total_marks", 50)
    duration = payload.get("duration", 90)
    co_targets = payload.get("co_targets", {"CO1": 40, "CO2": 40, "CO3": 20})
    bloom_targets = payload.get("bloom_targets", {"Remember": 20, "Understand": 20, "Apply": 30, "Analyze": 30})

    # Select fitting questions from bank
    qb = db.query(QuestionBankItem).filter(QuestionBankItem.subject == subject).all()
    selected = []
    current_marks = 0
    for q in qb:
        if current_marks + q.marks <= total_marks:
            selected.append({
                "id": q.id,
                "question_text": q.question_text,
                "marks": q.marks,
                "co": q.co_number,
                "bloom_level": q.bloom_level,
                "section": "Part A" if q.marks <= 5 else "Part B"
            })
            current_marks += q.marks

    if len(selected) == 0:
        if "Machine Learning" in subject:
            selected = [
                { "id": 201, "section": "Part A", "question_text": "What is the difference between supervised and unsupervised learning?", "marks": 2, "co": "CO1", "bloom_level": "Remember" },
                { "id": 202, "section": "Part A", "question_text": "Explain the bias-variance tradeoff in machine learning models.", "marks": 2, "co": "CO1", "bloom_level": "Understand" },
                { "id": 203, "section": "Part A", "question_text": "Define overfitting and list two techniques to prevent it.", "marks": 2, "co": "CO2", "bloom_level": "Understand" },
                { "id": 204, "section": "Part A", "question_text": "What is the purpose of an activation function in neural networks?", "marks": 2, "co": "CO2", "bloom_level": "Remember" },
                { "id": 205, "section": "Part A", "question_text": "Differentiate between L1 (Lasso) and L2 (Ridge) regularization.", "marks": 2, "co": "CO3", "bloom_level": "Understand" },
                { "id": 206, "section": "Part B", "question_text": "(a) Derive the cost function for Logistic Regression. (b) Explain Gradient Descent optimization algorithm.", "marks": 10, "co": "CO1", "bloom_level": "Apply" },
                { "id": 207, "section": "Part B", "question_text": "Construct a Decision Tree using Information Gain / Entropy for a given dataset of 14 samples.", "marks": 10, "co": "CO2", "bloom_level": "Analyze" },
                { "id": 208, "section": "Part B", "question_text": "Explain Naive Bayes Classification algorithm and handle zero-frequency problem using Laplace Smoothing.", "marks": 10, "co": "CO2", "bloom_level": "Apply" },
                { "id": 209, "section": "Part B", "question_text": "Describe Convolutional Neural Networks (CNN) architecture with Conv, Pooling, and FC layers.", "marks": 10, "co": "CO3", "bloom_level": "Create" }
            ]
        else:
            selected = [
                { "id": 101, "section": "Part A", "question_text": "Define Big-O notation and write the time complexity of binary search.", "marks": 2, "co": "CO1", "bloom_level": "Remember" },
                { "id": 102, "section": "Part A", "question_text": "Differentiate between Greedy method and Dynamic Programming strategy.", "marks": 2, "co": "CO2", "bloom_level": "Understand" },
                { "id": 103, "section": "Part A", "question_text": "State the Master Theorem condition for solving divide-and-conquer recurrences.", "marks": 2, "co": "CO1", "bloom_level": "Remember" },
                { "id": 104, "section": "Part A", "question_text": "Explain the concept of optimal substructure with a suitable example.", "marks": 2, "co": "CO3", "bloom_level": "Understand" },
                { "id": 105, "section": "Part A", "question_text": "What is an NP-Complete problem? Give two classic examples.", "marks": 2, "co": "CO3", "bloom_level": "Understand" },
                { "id": 106, "section": "Part B", "question_text": "(a) Solve the recurrence relation T(n) = 2T(n/2) + n using Recursion Tree Method. (b) Explain QuickSort partitioning algorithm with an example array.", "marks": 10, "co": "CO1", "bloom_level": "Apply" },
                { "id": 107, "section": "Part B", "question_text": "Construct the Optimal Binary Search Tree (OBST) for the given set of keys and probabilities using Dynamic Programming.", "marks": 10, "co": "CO2", "bloom_level": "Analyze" },
                { "id": 108, "section": "Part B", "question_text": "Find the Shortest Path from source vertex 'A' to all other vertices in a directed weighted graph using Dijkstra's Algorithm.", "marks": 10, "co": "CO2", "bloom_level": "Apply" },
                { "id": 109, "section": "Part B", "question_text": "Explain 8-Queens problem using Backtracking strategy. Draw the state space tree for N=4.", "marks": 10, "co": "CO3", "bloom_level": "Create" }
            ]

    paper = QuestionPaper(
        subject=subject,
        exam_type=exam_type,
        total_marks=total_marks,
        duration=duration,
        co_coverage=json.dumps(co_targets),
        bloom_distribution=json.dumps(bloom_targets),
        status="draft",
        questions_json=json.dumps(selected)
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    return {
        "status": "success",
        "paper_id": paper.id,
        "paper": {
            "id": paper.id,
            "subject": paper.subject,
            "exam_type": paper.exam_type,
            "total_marks": paper.total_marks,
            "duration": paper.duration,
            "co_coverage": co_targets,
            "bloom_distribution": bloom_targets,
            "status": paper.status,
            "questions": selected
        },
        "questions": selected,
        "co_coverage": co_targets,
        "bloom_distribution": bloom_targets
    }

@app.get("/api/exam/papers")
def get_generated_papers(db: Session = Depends(get_db)):
    papers = db.query(QuestionPaper).all()
    res = []
    for p in papers:
        res.append({
            "id": p.id,
            "subject": p.subject,
            "exam_type": p.exam_type,
            "total_marks": p.total_marks,
            "duration": p.duration,
            "status": p.status,
            "co_coverage": json.loads(p.co_coverage) if p.co_coverage else {},
            "bloom_distribution": json.loads(p.bloom_distribution) if p.bloom_distribution else {},
            "questions": json.loads(p.questions_json) if p.questions_json else []
        })
    return res

@app.post("/api/exam/papers/{paper_id}/moderate")
def moderate_question_paper(paper_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    status_ = payload.get("status", "moderated")
    paper = db.query(QuestionPaper).filter(QuestionPaper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    paper.status = status_
    db.commit()
    return {"status": "success", "paper_id": paper.id, "new_status": status_}

@app.post("/api/exam/generate-rubric")
def get_rubric_schema(payload: dict = Body(...)):
    # Generates rubric criteria
    return [
        {"criterion": "Technical Correctness", "max_marks": 5, "descriptor": "Algorithm correctly solves all edge cases."},
        {"criterion": "Analysis Proof", "max_marks": 3, "descriptor": "Detailed recursive trace and step explanation."},
        {"criterion": "Syntax & Clarity", "max_marks": 2, "descriptor": "Clean pseudocode with readable parameters."}
    ]


# ==========================================
# REST API FOR MENTOR & WELLBEING (AGENT 6)
# ==========================================

@app.get("/api/mentor/mentees")
def get_mentees_list(db: Session = Depends(get_db)):
    mentees = db.query(Mentee).all()
    res = []
    for m in mentees:
        student = db.query(Student).filter(Student.id == m.student_id).first()
        if student:
            mark_rec = db.query(InternalMark).filter(InternalMark.student_id == student.id).first()
            att_pct = mark_rec.attendance_percentage if mark_rec else 85
            marks_val = mark_rec.total_marks if mark_rec else 40

            marks_pct = (marks_val / 50.0) * 100.0 if marks_val is not None else 80.0
            is_overdue = "4 weeks" in str(m.last_checkin_date) or str(m.last_checkin_date) == "2026-06-29"
            computed_score = int((att_pct * 0.45) + (marks_pct * 0.45) + (10 if not is_overdue else -10))
            computed_score = max(15, min(98, computed_score))
            if computed_score < 50:
                is_overdue = True

            res.append({
                "id": m.id,
                "student_id": student.id,
                "roll_no": student.roll_no,
                "name": student.name,
                "class_section": m.class_section,
                "last_checkin_date": m.last_checkin_date,
                "days_since_checkin": 28 if is_overdue else 6,
                "is_overdue": is_overdue,
                "wellbeing_score": computed_score,
                "attendance_percentage": att_pct,
                "internal_marks": marks_val
            })
    return res

@app.get("/api/mentor/timeline/{student_id}")
def get_mentee_timeline(student_id: int, db: Session = Depends(get_db)):
    mentee = db.query(Mentee).filter(Mentee.student_id == student_id).first()
    if not mentee:
        raise HTTPException(status_code=404, detail="Mentee not found")
    checkins = db.query(CheckIn).filter(CheckIn.mentee_id == mentee.id).order_by(CheckIn.date.desc()).all()
    return [
        {
            "id": c.id,
            "date": c.date,
            "mode": c.mode,
            "notes": c.notes,  # sensitive data visible only in mentor view
            "mood_tag": c.mood_tag
        }
        for c in checkins
    ]

@app.post("/api/mentor/checkin")
def log_checkin_record(payload: dict = Body(...), db: Session = Depends(get_db)):
    student_id = payload.get("student_id")
    mode = payload.get("mode", "in-person")
    notes = payload.get("notes", "")
    mood_tag = payload.get("mood_tag", "doing well")
    date = datetime.date.today().strftime("%Y-%m-%d")

    mentee = db.query(Mentee).filter(Mentee.student_id == student_id).first()
    if not mentee:
        raise HTTPException(status_code=404, detail="Mentee not found")

    new_checkin = CheckIn(
        mentee_id=mentee.id,
        date=date,
        mode=mode,
        notes=notes,
        mood_tag=mood_tag
    )
    db.add(new_checkin)
    
    # Update last checkin date on Mentee
    mentee.last_checkin_date = f"{date} (today)"
    db.commit()

    return {"status": "success", "message": "Wellbeing check-in logged."}

@app.post("/api/mentor/escalate")
def escalate_mentee(payload: dict = Body(...), db: Session = Depends(get_db)):
    student_id = payload.get("student_id")
    reason = payload.get("reason")
    escalated_to = payload.get("escalated_to", "counselor")

    if not reason:
        raise HTTPException(status_code=400, detail="Escalation reason is required")

    mentee = db.query(Mentee).filter(Mentee.student_id == student_id).first()
    if not mentee:
        raise HTTPException(status_code=404, detail="Mentee not found")

    new_esc = Escalation(
        mentee_id=mentee.id,
        raised_by=1,
        reason=reason,
        escalated_to=escalated_to,
        status="open"
    )
    db.add(new_esc)
    db.commit()
    return {"status": "success", "message": f"Case escalated to {escalated_to}."}

@app.get("/api/mentor/suggest-prompt/{student_id}")
def get_suggested_wellbeing_prompt(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Empirical check on attendance to make prompt context-aware
    mark = db.query(InternalMark).filter(InternalMark.student_id == student_id).first()
    attendance_str = ""
    if mark and mark.attendance_percentage < 75:
         attendance_str = f"your DAA attendance of {mark.attendance_percentage}% is slightly low"
    else:
         attendance_str = "how the semester classes are going"

    prompt = f"Hi {student.name}, I was reviewing our mentee check-in list and wanted to check in on you. I noticed {attendance_str}. Is there anything bothering you or any support you need from my side?"
    return {"prompt": prompt}

# --- RESUME MATCHING ENDPOINTS ---
import os
import shutil
from PyPDF2 import PdfReader
from fastapi import UploadFile, File, Form

RESUME_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "resumes")
os.makedirs(RESUME_UPLOAD_DIR, exist_ok=True)

def extract_text_from_pdf(file_path: str) -> str:
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            if page.extract_text():
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

def extract_skills_from_text(text: str) -> str:
    # A simple keyword extraction for MVP
    common_skills = ["Python", "Java", "C++", "React", "Node.js", "Machine Learning", "Deep Learning", "SQL", "MongoDB", "CAD", "AWS", "Docker", "Kubernetes", "HTML", "CSS", "JavaScript"]
    found_skills = [skill for skill in common_skills if skill.lower() in text.lower()]
    return ", ".join(found_skills)

@app.post("/api/resume/upload")
async def upload_resume(
    student_roll_no: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    student_roll_no = student_roll_no.strip()
    student = db.query(Student).filter(Student.roll_no == student_roll_no).first()
    if not student:
        student = Student(
            roll_no=student_roll_no,
            name=f"Student {student_roll_no}",
            class_section="CSE",
            email=f"{student_roll_no.lower()}@faculty.edu"
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    file_path = os.path.join(RESUME_UPLOAD_DIR, f"{student.roll_no}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = extract_text_from_pdf(file_path)
    extracted_skills = extract_skills_from_text(extracted_text)

    # Attempt to extract student name from PDF header if auto-enrolled with placeholder
    if student.name.startswith("Student "):
        lines = [l.strip() for l in extracted_text.split("\n") if l.strip()]
        if lines and len(lines[0]) < 40 and not any(kw in lines[0].lower() for kw in ["resume", "curriculum", "vitae", "profile", "contact", "email"]):
            student.name = lines[0]
            db.commit()

    # Save to DB
    existing_resume = db.query(Resume).filter(Resume.student_id == student.id).first()
    if existing_resume:
        existing_resume.file_path = file_path
        existing_resume.extracted_text = extracted_text
        existing_resume.extracted_skills = extracted_skills
    else:
        new_resume = Resume(
            student_id=student.id,
            file_path=file_path,
            extracted_text=extracted_text,
            extracted_skills=extracted_skills
        )
        db.add(new_resume)
    db.commit()

    # Ingest to ChromaDB
    try:
        from rag.rag_pipeline import rag_pipeline
        if rag_pipeline.initialized:
            resume_collection = rag_pipeline.client.get_or_create_collection(
                name="student_resumes",
                embedding_function=rag_pipeline.emb_fn
            )
            chunks = rag_pipeline.chunk_text(extracted_text, chunk_size=300, overlap=50)
            ids = [f"resume_{student.id}_{i}" for i in range(len(chunks))]
            metadatas = [{
                "student_id": student.id,
                "student_name": student.name,
                "roll_no": student.roll_no,
                "skills": extracted_skills
            } for _ in range(len(chunks))]
            
            try:
                resume_collection.delete(where={"student_id": student.id})
            except Exception:
                pass

            if chunks:
                resume_collection.add(documents=chunks, metadatas=metadatas, ids=ids)
    except Exception as e:
        print(f"Failed to ingest resume to ChromaDB: {e}")

    return {"status": "success", "message": "Resume uploaded successfully", "skills": extracted_skills, "student": student.name, "roll_no": student.roll_no}

@app.post("/api/resume/bulk-upload")
async def bulk_upload_resumes(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    results = []
    for file in files:
        # Extract roll number from filename (e.g. "24CC028_Resume.pdf" -> "24CC028")
        base_name = os.path.splitext(file.filename)[0]
        parts = [p.strip() for p in base_name.split("_") if p.strip()]
        roll_no = parts[0] if parts else base_name

        student = db.query(Student).filter(Student.roll_no == roll_no).first()
        if not student:
            candidate_name = None
            if len(parts) > 1 and parts[1].lower() not in ("resume", "cv", "pdf"):
                candidate_name = parts[1]
            student_name = candidate_name if candidate_name else f"Student {roll_no}"

            student = Student(
                roll_no=roll_no,
                name=student_name,
                class_section="CSE",
                email=f"{roll_no.lower()}@faculty.edu"
            )
            db.add(student)
            db.commit()
            db.refresh(student)

        file_path = os.path.join(RESUME_UPLOAD_DIR, f"{student.roll_no}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        text = extract_text_from_pdf(file_path)
        skills = extract_skills_from_text(text)

        # Attempt to improve student name if placeholder
        if student.name.startswith("Student "):
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            if lines and len(lines[0]) < 40 and not any(kw in lines[0].lower() for kw in ["resume", "curriculum", "vitae", "profile", "contact", "email"]):
                student.name = lines[0]
                db.commit()
        
        existing_resume = db.query(Resume).filter(Resume.student_id == student.id).first()
        if existing_resume:
            existing_resume.file_path = file_path
            existing_resume.extracted_text = text
            existing_resume.extracted_skills = skills
        else:
            db.add(Resume(student_id=student.id, file_path=file_path, extracted_text=text, extracted_skills=skills))
        db.commit()
        
        results.append({
            "filename": file.filename,
            "status": "success",
            "student": student.name,
            "roll_no": student.roll_no,
            "skills": skills
        })
    return {"status": "success", "results": results}

from agents.placement_internships.skills_engine import (
    SKILL_ALIASES,
    ROLE_SKILL_MAP,
    KNOWN_SKILLS,
    normalize_skill,
    extract_required_skills,
    match_skills,
)
from agents.placement_internships.agent import (
    generate_student_career_guidance,
    generate_batch_career_guidance,
    handle_placement_internships_chat,
)

DEMO_SAMPLE_SKILLS = [
    "React, JavaScript, TypeScript, HTML, CSS, Redux, Next.js",
    "Python, SQL, Node.js, Docker, AWS, REST API, FastAPI",
    "Java, C++, Data Structures, Algorithms, SQL, Git",
    "Python, Machine Learning, Deep Learning, SQL, Pandas, TensorFlow",
    "AWS, Docker, Kubernetes, Linux, Python, CI/CD, Terraform",
    "React Native, Flutter, JavaScript, Mobile Development, Java, Kotlin",
    "HTML, CSS, JavaScript, React, UI/UX, Figma",
]

@app.get("/api/resume/all")
def get_all_resumes(
    demo: bool = Query(False, description="Set to true to return sample demo resumes for testing"),
    db: Session = Depends(get_db)
):
    """
    Returns only uploaded resumes by default.
    Only students who have an actual uploaded resume are returned.
    If demo=true, sample demo resumes are returned for testing.
    """
    if demo:
        students = db.query(Student).all()
        results = []
        for idx, student in enumerate(students):
            skills = DEMO_SAMPLE_SKILLS[idx % len(DEMO_SAMPLE_SKILLS)]
            results.append({
                "id": None,
                "student_id": student.id,
                "student_name": student.name,
                "roll_no": student.roll_no,
                "skills": skills,
                "has_resume": True,
                "demo_skills": True,
            })
        return {"resumes": results, "demo_mode": True}

    # Only return resumes that have actually been uploaded (excluding simulated dummy records)
    uploaded_resumes = (
        db.query(Resume)
        .join(Student, Resume.student_id == Student.id)
        .filter(~Resume.file_path.like("simulated_%"))
        .all()
    )

    results = []
    for r in uploaded_resumes:
        student = r.student
        if not student:
            continue
        results.append({
            "id": r.id,
            "student_id": student.id,
            "student_name": student.name,
            "roll_no": student.roll_no,
            "skills": r.extracted_skills,
            "has_resume": True,
            "demo_skills": False,
        })

    return {"resumes": results, "demo_mode": False}

@app.get("/api/resume/match-target")
def match_resumes_to_target(
    target_type: str = Query(..., description="'drive' or 'internship'"),
    target_id: int = Query(..., description="ID of placement drive or internship"),
    db: Session = Depends(get_db)
):
    """Match all uploaded resumes in DB against a placement drive or ongoing internship."""
    target_type = target_type.lower().strip()
    company_name = ""
    role_name = ""
    req_context = ""

    if target_type in ("drive", "placement", "placement_drive"):
        drive = db.query(PlacementDrive).filter(PlacementDrive.id == target_id).first()
        if not drive:
            raise HTTPException(status_code=404, detail="Placement drive not found")
        company_name = drive.company_name
        role_name = drive.job_roles
        req_context = f"{drive.job_roles} {drive.eligible_branches or ''}"
    elif target_type in ("internship", "ongoing_internship"):
        internship = db.query(Internship).filter(Internship.id == target_id).first()
        if not internship:
            raise HTTPException(status_code=404, detail="Internship not found")
        company_name = internship.company
        role_name = internship.role or "Intern"
        req_context = internship.role or ""
    else:
        raise HTTPException(status_code=400, detail="Invalid target_type. Must be 'drive' or 'internship'")

    required_skills = extract_required_skills(req_context)
    resumes = db.query(Resume).filter(~Resume.file_path.like("simulated_%")).all()

    matches = []
    for r in resumes:
        student = db.query(Student).filter(Student.id == r.student_id).first()
        analysis = match_skills(r.extracted_skills, required_skills)
        matches.append({
            "resume_id": r.id,
            "student_id": student.id if student else None,
            "student_name": student.name if student else "Unknown",
            "roll_no": student.roll_no if student else "Unknown",
            "skills": r.extracted_skills,
            "match_score": analysis["match_score"],
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
            "total_required": analysis["total_required"],
            "total_matched": analysis["total_matched"],
            "status": analysis["status"]
        })

    # Sort descending by match_score
    matches.sort(key=lambda m: m["match_score"], reverse=True)

    return {
        "target": {
            "id": target_id,
            "type": target_type,
            "company": company_name,
            "role": role_name,
            "required_skills": required_skills
        },
        "matches": matches
    }

@app.post("/api/resume/match")
def match_resume_single(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Calculate match score and skill breakdown for arbitrary resume skills or target requirements."""
    resume_skills = payload.get("resume_skills")
    resume_id = payload.get("resume_id")

    if resume_id and not resume_skills:
        res = db.query(Resume).filter(Resume.id == resume_id).first()
        if res:
            resume_skills = res.extracted_skills

    required_skills = payload.get("required_skills")
    if not required_skills:
        role = payload.get("role") or payload.get("job_roles") or ""
        drive_id = payload.get("drive_id")
        internship_id = payload.get("internship_id")
        if drive_id:
            d = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
            if d:
                role = f"{d.job_roles} {d.eligible_branches or ''}"
        elif internship_id:
            i = db.query(Internship).filter(Internship.id == internship_id).first()
            if i:
                role = i.role or ""
        required_skills = extract_required_skills(role)

    result = match_skills(resume_skills, required_skills)
    result["required_skills"] = required_skills
    return result


# ==========================================
# CAREER ADVISOR AI
# ==========================================

@app.get("/api/career/guidance/{student_id}")
def get_career_guidance_for_student(student_id: int, db: Session = Depends(get_db)):
    """Generate personalized career guidance for a student by ID."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return generate_student_career_guidance(student, db)

@app.post("/api/career/guidance")
def get_career_guidance_query(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Generate personalized guidance by student_id, student_name, roll_no, or custom query."""
    student_id = payload.get("student_id")
    student_name = payload.get("student_name")
    roll_no = payload.get("roll_no")
    query = payload.get("query") or payload.get("message") or ""

    student = None
    if student_id:
        student = db.query(Student).filter(Student.id == student_id).first()
    elif roll_no:
        student = db.query(Student).filter(Student.roll_no == roll_no).first()
    elif student_name:
        student = db.query(Student).filter(Student.name.ilike(f"%{student_name}%")).first()

    if student:
        return generate_student_career_guidance(student, db, specific_query=query)

    # If no specific student parameter, use the Career Advisor AI engine
    return handle_placement_internships_chat(query, faculty_id=1, db=db)

@app.get("/api/career/batch-readiness")
def get_batch_readiness(query: str = "", db: Session = Depends(get_db)):
    """Generate batch-wide placement readiness, drive matches, and critical skill gaps."""
    return generate_batch_career_guidance(query, db)


# ==========================================
# PLACEMENT DRIVES
# ==========================================

@app.get("/api/placement/drives")
def get_placement_drives(db: Session = Depends(get_db)):
    """Return all placement drives ordered by visit date descending."""
    drives = db.query(PlacementDrive).order_by(PlacementDrive.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "company_name": d.company_name,
            # convenience alias so the frontend can use either field name
            "company": d.company_name,
            "job_roles": d.job_roles,
            "role": d.job_roles,
            "eligible_branches": d.eligible_branches,
            "min_cgpa": d.min_cgpa,
            "expected_ctc": d.expected_ctc,
            "visit_date": d.visit_date,
            "date": d.visit_date,
            "deadline_date": d.deadline_date,
            "status": d.status,
            "alumni_sponsor_id": d.alumni_sponsor_id,
            "alumni_sponsor_name": d.alumni_sponsor_name,
            "alumni_sponsor": d.alumni_sponsor_name,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
        }
        for d in drives
    ]

@app.post("/api/placement/drives")
def create_placement_drive(
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a new placement drive record."""
    company_name = payload.get("company_name") or payload.get("company")
    job_roles = payload.get("job_roles") or payload.get("role")

    if not company_name:
        raise HTTPException(status_code=400, detail="company_name is required")
    if not job_roles:
        raise HTTPException(status_code=400, detail="job_roles is required")

    drive = PlacementDrive(
        company_name=company_name,
        job_roles=job_roles,
        eligible_branches=payload.get("eligible_branches"),
        min_cgpa=payload.get("min_cgpa", 0.0),
        expected_ctc=payload.get("expected_ctc"),
        visit_date=payload.get("visit_date") or payload.get("date"),
        deadline_date=payload.get("deadline_date"),
        status=payload.get("status", "Scheduled"),
        alumni_sponsor_name=payload.get("alumni_sponsor_name") or payload.get("alumni_sponsor"),
    )
    db.add(drive)
    db.commit()
    db.refresh(drive)

    return {
        "id": drive.id,
        "company_name": drive.company_name,
        "company": drive.company_name,
        "job_roles": drive.job_roles,
        "role": drive.job_roles,
        "eligible_branches": drive.eligible_branches,
        "min_cgpa": drive.min_cgpa,
        "expected_ctc": drive.expected_ctc,
        "visit_date": drive.visit_date,
        "date": drive.visit_date,
        "deadline_date": drive.deadline_date,
        "status": drive.status,
        "alumni_sponsor_name": drive.alumni_sponsor_name,
        "alumni_sponsor": drive.alumni_sponsor_name,
    }

@app.put("/api/placement/drives/{drive_id}")
def update_placement_drive(
    drive_id: int,
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Update an existing placement drive record by ID."""
    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")

    # Accept either field name variant
    if "company_name" in payload or "company" in payload:
        drive.company_name = payload.get("company_name") or payload.get("company")
    if "job_roles" in payload or "role" in payload:
        drive.job_roles = payload.get("job_roles") or payload.get("role")
    if "eligible_branches" in payload:
        drive.eligible_branches = payload["eligible_branches"]
    if "min_cgpa" in payload:
        drive.min_cgpa = payload["min_cgpa"]
    if "expected_ctc" in payload:
        drive.expected_ctc = payload["expected_ctc"]
    if "visit_date" in payload or "date" in payload:
        drive.visit_date = payload.get("visit_date") or payload.get("date")
    if "deadline_date" in payload:
        drive.deadline_date = payload["deadline_date"]
    if "status" in payload:
        drive.status = payload["status"]
    if "alumni_sponsor_name" in payload or "alumni_sponsor" in payload:
        drive.alumni_sponsor_name = payload.get("alumni_sponsor_name") or payload.get("alumni_sponsor")

    db.commit()
    db.refresh(drive)

    return {
        "id": drive.id,
        "company_name": drive.company_name,
        "company": drive.company_name,
        "job_roles": drive.job_roles,
        "role": drive.job_roles,
        "eligible_branches": drive.eligible_branches,
        "min_cgpa": drive.min_cgpa,
        "expected_ctc": drive.expected_ctc,
        "visit_date": drive.visit_date,
        "date": drive.visit_date,
        "deadline_date": drive.deadline_date,
        "status": drive.status,
        "alumni_sponsor_name": drive.alumni_sponsor_name,
        "alumni_sponsor": drive.alumni_sponsor_name,
    }

@app.delete("/api/placement/drives/{drive_id}")
@app.delete("/api/drives/{drive_id}")
def delete_placement_drive(
    drive_id: int,
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Delete a placement drive record by ID."""
    drive = db.query(PlacementDrive).filter(PlacementDrive.id == drive_id).first()
    if not drive:
        raise HTTPException(status_code=404, detail="Placement drive not found")
    db.delete(drive)
    db.commit()
    return {"status": "success", "message": "Placement drive deleted"}

# ==========================================
# INTERNSHIPS
# ==========================================

@app.get("/api/internships")
@app.get("/api/placement/internships")
def get_internships(db: Session = Depends(get_db)):
    """Return all internships ordered by created_at descending."""
    internships = db.query(Internship).order_by(Internship.created_at.desc()).all()
    return [
        {
            "id": i.id,
            "student_id": i.student_id,
            "student_name": i.student_name,
            "company": i.company,
            "role": i.role,
            "duration": i.duration,
            "stipend": i.stipend,
            "status": i.status,
            "start_date": i.start_date,
            "end_date": i.end_date,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        }
        for i in internships
    ]

@app.post("/api/internships")
@app.post("/api/placement/internships")
def create_internship(
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a new internship record."""
    company = payload.get("company")
    if not company or not str(company).strip():
        raise HTTPException(status_code=400, detail="company is required")

    internship = Internship(
        student_id=payload.get("student_id"),
        student_name=payload.get("student_name") or payload.get("name"),
        company=str(company).strip(),
        role=payload.get("role"),
        duration=payload.get("duration"),
        stipend=payload.get("stipend"),
        status=payload.get("status", "Ongoing"),
        start_date=payload.get("start_date"),
        end_date=payload.get("end_date"),
    )
    db.add(internship)
    db.commit()
    db.refresh(internship)

    return {
        "id": internship.id,
        "student_id": internship.student_id,
        "student_name": internship.student_name,
        "company": internship.company,
        "role": internship.role,
        "duration": internship.duration,
        "stipend": internship.stipend,
        "status": internship.status,
        "start_date": internship.start_date,
        "end_date": internship.end_date,
        "created_at": internship.created_at.isoformat() if internship.created_at else None,
        "updated_at": internship.updated_at.isoformat() if internship.updated_at else None,
    }

@app.put("/api/internships/{internship_id}")
@app.put("/api/placement/internships/{internship_id}")
def update_internship(
    internship_id: int,
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Update an existing internship record by ID."""
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    if "company" in payload:
        val = str(payload.get("company", "")).strip()
        if not val:
            raise HTTPException(status_code=400, detail="company cannot be empty")
        internship.company = val
    if "student_name" in payload or "name" in payload:
        internship.student_name = payload.get("student_name") or payload.get("name")
    if "student_id" in payload:
        internship.student_id = payload.get("student_id")
    if "role" in payload:
        internship.role = payload.get("role")
    if "duration" in payload:
        internship.duration = payload.get("duration")
    if "stipend" in payload:
        internship.stipend = payload.get("stipend")
    if "status" in payload:
        internship.status = payload.get("status")
    if "start_date" in payload:
        internship.start_date = payload.get("start_date")
    if "end_date" in payload:
        internship.end_date = payload.get("end_date")

    db.commit()
    db.refresh(internship)

    return {
        "id": internship.id,
        "student_id": internship.student_id,
        "student_name": internship.student_name,
        "company": internship.company,
        "role": internship.role,
        "duration": internship.duration,
        "stipend": internship.stipend,
        "status": internship.status,
        "start_date": internship.start_date,
        "end_date": internship.end_date,
        "created_at": internship.created_at.isoformat() if internship.created_at else None,
        "updated_at": internship.updated_at.isoformat() if internship.updated_at else None,
    }

@app.delete("/api/internships/{internship_id}")
@app.delete("/api/placement/internships/{internship_id}")
def delete_internship(
    internship_id: int,
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Delete an internship record by ID."""
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    db.delete(internship)
    db.commit()
    return {"status": "success", "message": "Internship deleted"}

# ==========================================
# STUDENT OFFERS
# ==========================================

@app.get("/api/offers")
@app.get("/api/placement/offers")
@app.get("/api/student-offers")
def get_student_offers(db: Session = Depends(get_db)):
    """Return all student placement offers ordered by created_at descending."""
    offers = db.query(StudentOffer).order_by(StudentOffer.created_at.desc()).all()
    return [
        {
            "id": o.id,
            "student_id": o.student_id,
            "student_name": o.student_name,
            "placement_drive_id": o.placement_drive_id,
            "company": o.company,
            "role": o.role,
            "ctc": o.ctc,
            "status": o.status,
            "offer_letter_url": o.offer_letter_url,
            "offered_date": o.offered_date,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
        }
        for o in offers
    ]

@app.post("/api/offers")
@app.post("/api/placement/offers")
@app.post("/api/student-offers")
def create_student_offer(
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a new student offer record."""
    company = payload.get("company")
    role = payload.get("role")

    if not company or not str(company).strip():
        raise HTTPException(status_code=400, detail="company is required")
    if not role or not str(role).strip():
        raise HTTPException(status_code=400, detail="role is required")

    ctc_val = 0.0
    if "ctc" in payload and payload["ctc"] is not None and str(payload["ctc"]).strip() != "":
        try:
            ctc_val = float(payload["ctc"])
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="ctc must be a valid number")

    offer = StudentOffer(
        student_id=payload.get("student_id"),
        student_name=payload.get("student_name") or payload.get("name"),
        placement_drive_id=payload.get("placement_drive_id"),
        company=str(company).strip(),
        role=str(role).strip(),
        ctc=ctc_val,
        status=payload.get("status", "Accepted"),
        offer_letter_url=payload.get("offer_letter_url"),
        offered_date=payload.get("offered_date") or payload.get("date"),
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    return {
        "id": offer.id,
        "student_id": offer.student_id,
        "student_name": offer.student_name,
        "placement_drive_id": offer.placement_drive_id,
        "company": offer.company,
        "role": offer.role,
        "ctc": offer.ctc,
        "status": offer.status,
        "offer_letter_url": offer.offer_letter_url,
        "offered_date": offer.offered_date,
        "created_at": offer.created_at.isoformat() if offer.created_at else None,
        "updated_at": offer.updated_at.isoformat() if offer.updated_at else None,
    }

@app.put("/api/offers/{offer_id}")
@app.put("/api/placement/offers/{offer_id}")
@app.put("/api/student-offers/{offer_id}")
def update_student_offer(
    offer_id: int,
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Update an existing student offer record by ID."""
    offer = db.query(StudentOffer).filter(StudentOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Student offer not found")

    if "company" in payload:
        val = str(payload.get("company", "")).strip()
        if not val:
            raise HTTPException(status_code=400, detail="company cannot be empty")
        offer.company = val
    if "role" in payload:
        val = str(payload.get("role", "")).strip()
        if not val:
            raise HTTPException(status_code=400, detail="role cannot be empty")
        offer.role = val
    if "ctc" in payload and payload["ctc"] is not None and str(payload["ctc"]).strip() != "":
        try:
            offer.ctc = float(payload["ctc"])
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="ctc must be a valid number")
    if "student_name" in payload or "name" in payload:
        offer.student_name = payload.get("student_name") or payload.get("name")
    if "student_id" in payload:
        offer.student_id = payload.get("student_id")
    if "placement_drive_id" in payload:
        offer.placement_drive_id = payload.get("placement_drive_id")
    if "status" in payload:
        offer.status = payload["status"]
    if "offer_letter_url" in payload:
        offer.offer_letter_url = payload["offer_letter_url"]
    if "offered_date" in payload or "date" in payload:
        offer.offered_date = payload.get("offered_date") or payload.get("date")

    db.commit()
    db.refresh(offer)

    return {
        "id": offer.id,
        "student_id": offer.student_id,
        "student_name": offer.student_name,
        "placement_drive_id": offer.placement_drive_id,
        "company": offer.company,
        "role": offer.role,
        "ctc": offer.ctc,
        "status": offer.status,
        "offer_letter_url": offer.offer_letter_url,
        "offered_date": offer.offered_date,
        "created_at": offer.created_at.isoformat() if offer.created_at else None,
        "updated_at": offer.updated_at.isoformat() if offer.updated_at else None,
    }

@app.delete("/api/offers/{offer_id}")
@app.delete("/api/placement/offers/{offer_id}")
@app.delete("/api/student-offers/{offer_id}")
def delete_student_offer(
    offer_id: int,
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Delete a student offer record by ID."""
    offer = db.query(StudentOffer).filter(StudentOffer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Student offer not found")
    db.delete(offer)
    db.commit()
    return {"status": "success", "message": "Student offer deleted"}

# ==========================================
# INTERVIEW PREP MATERIALS
# ==========================================

@app.get("/api/interview-materials")
@app.get("/api/placement/interview-materials")
@app.get("/api/interview-prep")
def get_interview_materials(db: Session = Depends(get_db)):
    """Return all interview preparation materials ordered by created_at descending."""
    materials = db.query(InterviewMaterial).order_by(InterviewMaterial.created_at.desc()).all()
    
    # Auto-seed initial demo materials if table is empty
    if not materials:
        seed_items = [
            InterviewMaterial(
                company="Google",
                title="Google SDE Interview Questions",
                role="SDE",
                category="Interview Questions",
                contributor_name="Siddharth M (Class of 2024)",
                content="Key focus areas: Data Structures & Algorithms (Graphs, DP, Trees), System Design fundamentals, and Behavioral leadership principles. Typical 4-5 rounds including coding and Googleyness.",
            ),
            InterviewMaterial(
                company="Amazon",
                title="Amazon OA Tips & Tricks",
                role="SDE 1",
                category="OA Tips",
                contributor_name="Preethi (Class of 2025)",
                content="Online Assessment overview: 1) Work Styles assessment reflecting 16 Leadership Principles, 2) Debugging section speed tips, 3) Two LeetCode Medium coding questions focusing on Arrays, HashMaps, and BFS/DFS.",
            ),
        ]
        for item in seed_items:
            db.add(item)
        db.commit()
        materials = db.query(InterviewMaterial).order_by(InterviewMaterial.created_at.desc()).all()

    return [
        {
            "id": m.id,
            "company": m.company,
            "title": m.title,
            "role": m.role,
            "category": m.category,
            "content": m.content,
            "file_url": m.file_url,
            "contributor_alumni_id": m.contributor_alumni_id,
            "contributor_name": m.contributor_name,
            "placement_drive_id": m.placement_drive_id,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        }
        for m in materials
    ]

@app.post("/api/interview-materials")
@app.post("/api/placement/interview-materials")
@app.post("/api/interview-prep")
def create_interview_material(
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Create a new interview preparation material record."""
    title = payload.get("title")
    company = payload.get("company")

    if not title or not str(title).strip():
        raise HTTPException(status_code=400, detail="title is required")
    if not company or not str(company).strip():
        raise HTTPException(status_code=400, detail="company is required")

    material = InterviewMaterial(
        company=str(company).strip(),
        title=str(title).strip(),
        role=payload.get("role"),
        category=payload.get("category", "Interview Questions"),
        content=payload.get("content"),
        file_url=payload.get("file_url"),
        contributor_alumni_id=payload.get("contributor_alumni_id"),
        contributor_name=payload.get("contributor_name"),
        placement_drive_id=payload.get("placement_drive_id"),
    )
    db.add(material)
    db.commit()
    db.refresh(material)

    return {
        "id": material.id,
        "company": material.company,
        "title": material.title,
        "role": material.role,
        "category": material.category,
        "content": material.content,
        "file_url": material.file_url,
        "contributor_alumni_id": material.contributor_alumni_id,
        "contributor_name": material.contributor_name,
        "placement_drive_id": material.placement_drive_id,
        "created_at": material.created_at.isoformat() if material.created_at else None,
        "updated_at": material.updated_at.isoformat() if material.updated_at else None,
    }

@app.put("/api/interview-materials/{material_id}")
@app.put("/api/placement/interview-materials/{material_id}")
@app.put("/api/interview-prep/{material_id}")
def update_interview_material(
    material_id: int,
    payload: dict = Body(...),
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Update an existing interview material record by ID."""
    material = db.query(InterviewMaterial).filter(InterviewMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Interview material not found")

    if "title" in payload:
        val = str(payload.get("title", "")).strip()
        if not val:
            raise HTTPException(status_code=400, detail="title cannot be empty")
        material.title = val
    if "company" in payload:
        val = str(payload.get("company", "")).strip()
        if not val:
            raise HTTPException(status_code=400, detail="company cannot be empty")
        material.company = val
    if "role" in payload:
        material.role = payload.get("role")
    if "category" in payload:
        material.category = payload.get("category")
    if "content" in payload:
        material.content = payload.get("content")
    if "file_url" in payload:
        material.file_url = payload.get("file_url")
    if "contributor_name" in payload:
        material.contributor_name = payload.get("contributor_name")
    if "contributor_alumni_id" in payload:
        material.contributor_alumni_id = payload.get("contributor_alumni_id")
    if "placement_drive_id" in payload:
        material.placement_drive_id = payload.get("placement_drive_id")

    db.commit()
    db.refresh(material)

    return {
        "id": material.id,
        "company": material.company,
        "title": material.title,
        "role": material.role,
        "category": material.category,
        "content": material.content,
        "file_url": material.file_url,
        "contributor_alumni_id": material.contributor_alumni_id,
        "contributor_name": material.contributor_name,
        "placement_drive_id": material.placement_drive_id,
        "created_at": material.created_at.isoformat() if material.created_at else None,
        "updated_at": material.updated_at.isoformat() if material.updated_at else None,
    }

@app.delete("/api/interview-materials/{material_id}")
@app.delete("/api/placement/interview-materials/{material_id}")
@app.delete("/api/interview-prep/{material_id}")
def delete_interview_material(
    material_id: int,
    token: Optional[dict] = Depends(verify_token),
    db: Session = Depends(get_db),
):
    """Delete an interview material record by ID."""
    material = db.query(InterviewMaterial).filter(InterviewMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Interview material not found")
    db.delete(material)
    db.commit()
    return {"status": "success", "message": "Interview material deleted"}




# ==========================================
# PLACEMENT NAMELIST & STATUS TRACKING
# ==========================================
from agents.placement_internships.namelist_parser import parse_namelist, VALID_STATUSES

_PLACEMENT_IMPORT_LIMIT = 500  # max rows per import

@app.post("/api/placement/namelist/parse")
async def placement_parse_namelist(
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token),
):
    """
    Accept a PDF, Excel (.xlsx), or CSV file and return extracted headers,
    a suggested column mapping, and a preview of the rows.
    No data is written to the database.
    """
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > 20 * 1024 * 1024:  # 20 MB guard
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 20 MB.")

    result = parse_namelist(content, file.filename or "upload")
    return result


@app.post("/api/placement/namelist/import")
def placement_import_namelist(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """
    Commit mapped rows to the student table (upsert by roll_no or register_no).
    payload = {
      "rows": [...],
      "mapping": { "roll_no": ..., "name": ..., "register_no": ..., "department": ..., "batch": ... },
      "replace_existing": bool  # if True, previous placement students are cleared from the active placement list
    }
    """
    rows = payload.get("rows", [])
    mapping = payload.get("mapping", {})
    replace_existing = payload.get("replace_existing", False)

    if not rows:
        raise HTTPException(status_code=400, detail="No rows provided.")

    if len(rows) > _PLACEMENT_IMPORT_LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"Too many rows ({len(rows)}). Maximum per import is {_PLACEMENT_IMPORT_LIMIT}.",
        )

    # If replace_existing is selected, clear placement flag from previous students
    if replace_existing:
        db.query(Student).filter(Student.is_placement_student == True).update({"is_placement_student": False})
        db.commit()

    imported = skipped = duplicates = 0

    for idx, raw_row in enumerate(rows):
        if not raw_row or not any(str(v).strip() for v in raw_row.values()):
            skipped += 1
            continue

        # 1. Resolve student name
        name = str(raw_row.get(mapping.get("name", ""), "") or "").strip()
        if not name:
            # Fallback 1: check any key with "name"
            for k, v in raw_row.items():
                if "name" in k.lower() and str(v).strip():
                    name = str(v).strip()
                    break
        if not name:
            # Fallback 2: first text value with >=2 alpha characters
            for k, v in raw_row.items():
                val = str(v).strip()
                if len(val) >= 2 and any(c.isalpha() for c in val) and not val.replace(".", "").isdigit():
                    if not any(kw in k.lower() for kw in ["dept", "batch", "branch", "year"]):
                        name = val
                        break

        # If still no name, skip
        if not name or len(name) < 2:
            skipped += 1
            continue

        # 2. Resolve roll_no and register_no
        roll_no = str(raw_row.get(mapping.get("roll_no", ""), "") or "").strip()
        register_no = str(raw_row.get(mapping.get("register_no", ""), "") or "").strip()

        # Clean float .0 formatting from Excel
        if roll_no.endswith(".0") and roll_no[:-2].isdigit():
            roll_no = roll_no[:-2]
        if register_no.endswith(".0") and register_no[:-2].isdigit():
            register_no = register_no[:-2]

        # Fallback for roll/register if both are missing
        if not roll_no and not register_no:
            for k, v in raw_row.items():
                kl = k.lower()
                val = str(v).strip()
                if val.endswith(".0") and val[:-2].isdigit():
                    val = val[:-2]
                if val and any(x in kl for x in ["reg", "univ"]):
                    register_no = val
                    break
                elif val and any(x in kl for x in ["roll", "sno", "s.no", "sl.no", "id", "serial"]):
                    roll_no = val
                    break

        # Fallback 2: Generate sequential student ID if neither roll nor reg exists
        if not roll_no and not register_no:
            roll_no = f"STU{idx + 1:03d}"

        # Resolve department and batch
        department = str(raw_row.get(mapping.get("department", ""), "") or "").strip() or "CSE"
        batch = str(raw_row.get(mapping.get("batch", ""), "") or "").strip() or "2022-2026"

        effective_roll = roll_no or register_no
        email_fallback = f"{effective_roll.lower().replace(' ', '')}@student.edu"

        # Upsert: find existing student by roll_no or register_no
        existing: Student | None = None
        if roll_no:
            existing = db.query(Student).filter(Student.roll_no == roll_no).first()
        if existing is None and register_no:
            existing = db.query(Student).filter(Student.register_no == register_no).first()

        if existing:
            existing.is_placement_student = True
            existing.name = name
            if register_no:
                existing.register_no = register_no
            if department and department != "CSE":
                existing.department = department
            if batch and batch != "2022-2026":
                existing.batch = batch
            duplicates += 1
        else:
            new_student = Student(
                student_id=register_no or effective_roll,
                roll_no=effective_roll,
                register_no=register_no or None,
                name=name,
                class_section=department,
                department=department,
                batch=batch,
                placement_status="Not Started",
                is_placement_student=True,
                email=email_fallback,
            )
            db.add(new_student)
            imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "duplicates": duplicates}


@app.get("/api/placement/students")
def placement_list_students(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Return all students enrolled in placement tracking (excludes un-enrolled demo students)."""
    # Only return students explicitly enrolled in placement tracking
    q = db.query(Student).filter(Student.is_placement_student == True)

    if search:
        like = f"%{search}%"
        q = q.filter(
            (Student.name.ilike(like))
            | (Student.roll_no.ilike(like))
            | (Student.register_no.ilike(like))
            | (Student.department.ilike(like))
        )

    if status_filter and status_filter in VALID_STATUSES:
        q = q.filter(Student.placement_status == status_filter)

    students = q.order_by(Student.name).all()

    return [
        {
            "id": s.id,
            "roll_no": s.roll_no,
            "register_no": s.register_no,
            "name": s.name,
            "department": s.department or s.class_section or "CSE",
            "batch": s.batch or "2022-2026",
            "placement_status": s.placement_status or "Not Started",
            "email": s.email,
        }
        for s in students
    ]


@app.delete("/api/placement/students/{student_id}")
def placement_delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Remove a student from placement tracking."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    student.is_placement_student = False
    db.commit()
    return {"status": "success", "message": f"Student {student.name} removed from placement tracking."}


@app.post("/api/placement/students/clear")
def placement_clear_all_students(
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Clear all students from active placement tracking."""
    count = db.query(Student).filter(Student.is_placement_student == True).update({"is_placement_student": False})
    db.commit()
    return {"status": "success", "cleared": count}


@app.patch("/api/placement/students/{student_id}/status")
def placement_update_student_status(
    student_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    token_data: dict = Depends(verify_token),
):
    """Update a student's placement_status. Valid values: Not Started, Not Placed, Placed, Internship, In Progress."""
    new_status = str(payload.get("status", "")).strip()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.placement_status = new_status
    student.is_placement_student = True
    db.commit()
    return {
        "id": student.id,
        "roll_no": student.roll_no,
        "name": student.name,
        "placement_status": student.placement_status,
    }


# ==========================================
# UNIFIED FRONTEND STATIC FILES & SPA ROUTING
# ==========================================
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST_DIR):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    images_dir = os.path.join(FRONTEND_DIST_DIR, "images")
    if os.path.exists(images_dir):
        app.mount("/images", StaticFiles(directory=images_dir), name="static_images")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        # Allow API routes, docs, and backend static paths to fall through
        if full_path.startswith(("api/", "auth/", "agents/", "health", "docs", "openapi.json", "redoc", "reports/")):
            raise HTTPException(status_code=404, detail="API route not found")
        
        target_file = os.path.join(FRONTEND_DIST_DIR, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
            
        index_file = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend dist index.html not found")

