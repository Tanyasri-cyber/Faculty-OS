import datetime
from sqlalchemy import Column, Integer, Float, Boolean, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, nullable=False)
    designation = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)

    timetables = relationship("Timetable", back_populates="faculty")

class Timetable(Base):
    __tablename__ = "timetable"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    day_of_week = Column(String, nullable=False)  # Monday, Tuesday, etc.
    period = Column(String, nullable=False)        # 9:00 - 10:00, 10:00 - 11:00, etc.
    subject = Column(String, nullable=False)
    class_section = Column(String, nullable=False)  # CSE-A, CSE-B, etc.
    room = Column(String, nullable=False)

    faculty = relationship("Faculty", back_populates="timetables")

class SyllabusUnit(Base):
    __tablename__ = "syllabus_unit"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True, nullable=False)
    unit_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    topics = Column(Text, nullable=False)
    pdf_url = Column(String, nullable=True)

class PolicyDocument(Base):
    __tablename__ = "policy_document"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Academic, Leave, Exam, etc.
    file_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

class Student(Base):
    __tablename__ = "student"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=True)  # Legacy ID / Register Number
    register_no = Column(String, index=True, nullable=True)             # Formal Register Number
    roll_no = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    class_section = Column(String, nullable=False, default="CSE")
    department = Column(String, nullable=True, default="CSE")
    batch = Column(String, nullable=True, default="2022-2026")
    placement_status = Column(String, nullable=False, default="Not Started") # "Not Started", "In Progress", "Placed", "Internship", "Not Placed"
    is_placement_student = Column(Boolean, nullable=False, default=False)
    mentor_faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=True)
    email = Column(String, nullable=False)

    resumes = relationship("Resume", back_populates="student", cascade="all, delete-orphan")
    internships = relationship("Internship", back_populates="student")
    offers = relationship("StudentOffer", back_populates="student")

class AttendanceRecord(Base):
    __tablename__ = "attendance_record"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id"), nullable=False)
    date = Column(String, nullable=False)
    status = Column(String, nullable=False)  # "Present" or "Absent"
    period = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    class_section = Column(String, nullable=False)

class Assignment(Base):
    __tablename__ = "assignment"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    class_section = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    max_marks = Column(Integer, default=100)
    status = Column(String, default="Open")  # "Scheduled", "Open", "Grading", "Closed"

class Submission(Base):
    __tablename__ = "submission"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignment.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("student.id"), nullable=False)
    submitted_at = Column(String, nullable=False)
    marks_obtained = Column(Integer, nullable=True)
    status = Column(String, default="Submitted")  # "Submitted", "Graded"

class InternalMark(Base):
    __tablename__ = "internal_mark"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id"), nullable=False)
    subject = Column(String, nullable=False)
    cat1_marks = Column(Integer, nullable=True)
    cat2_marks = Column(Integer, nullable=True)
    assignment_marks = Column(Integer, nullable=True)
    lab_marks = Column(Integer, nullable=True)
    total_marks = Column(Integer, nullable=True)
    attendance_percentage = Column(Integer, nullable=True)

class COAttainment(Base):
    __tablename__ = "co_attainment"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    co_number = Column(String, nullable=False)  # "CO1", "CO2", etc.
    target_percentage = Column(Integer, nullable=False)
    attained_percentage = Column(Integer, nullable=False)

class FacultyWorkload(Base):
    __tablename__ = "faculty_workload"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    subject = Column(String, nullable=False)
    weekly_hours = Column(Integer, nullable=False)
    role = Column(String, nullable=False)  # "Lecture", "Lab", "Coordinator"

class Publication(Base):
    __tablename__ = "publication"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    title = Column(String, nullable=False)
    venue = Column(String, nullable=False)
    type = Column(String, nullable=False)  # "journal", "conference", "patent"
    year = Column(Integer, nullable=False)
    co_authors = Column(String, nullable=True)
    doi_or_link = Column(String, nullable=True)
    citation_count = Column(Integer, default=0)

class GrantOpportunity(Base):
    __tablename__ = "grant_opportunity"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    funding_body = Column(String, nullable=False)
    amount = Column(String, nullable=False)
    eligibility = Column(String, nullable=False)
    deadline = Column(String, nullable=False)
    focus_area = Column(String, nullable=False)

class ResearchDeadline(Base):
    __tablename__ = "research_deadline"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    type = Column(String, nullable=False)  # "submission", "review", "renewal"
    title = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    related_publication_id = Column(Integer, ForeignKey("publication.id"), nullable=True)

class QuestionBankItem(Base):
    __tablename__ = "question_bank_item"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    unit = Column(Integer, nullable=False)
    co_number = Column(String, nullable=False)
    bloom_level = Column(String, nullable=False)  # Remember, Understand, Apply, Analyze, Evaluate, Create
    question_text = Column(Text, nullable=False)
    marks = Column(Integer, nullable=False)
    difficulty = Column(String, nullable=False)  # Easy, Medium, Hard

class QuestionPaper(Base):
    __tablename__ = "question_paper"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    exam_type = Column(String, nullable=False)  # CAT1, CAT2, Semester
    total_marks = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=False)
    co_coverage = Column(Text, nullable=True)  # JSON string
    bloom_distribution = Column(Text, nullable=True)  # JSON string
    status = Column(String, default="draft")  # draft, moderated, final
    questions_json = Column(Text, nullable=True)  # JSON string of questions

class Rubric(Base):
    __tablename__ = "rubric"

    id = Column(Integer, primary_key=True, index=True)
    question_paper_id = Column(Integer, ForeignKey("question_paper.id"), nullable=True)
    assignment_id = Column(Integer, ForeignKey("assignment.id"), nullable=True)
    criteria = Column(Text, nullable=False)  # JSON string

class Mentee(Base):
    __tablename__ = "mentee"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id"), unique=True, nullable=False)
    mentor_faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    class_section = Column(String, nullable=False)
    last_checkin_date = Column(String, nullable=True)

class CheckIn(Base):
    __tablename__ = "check_in"

    id = Column(Integer, primary_key=True, index=True)
    mentee_id = Column(Integer, ForeignKey("mentee.id"), nullable=False)
    date = Column(String, nullable=False)
    mode = Column(String, nullable=False)  # in-person, call, chat
    notes = Column(Text, nullable=False)
    mood_tag = Column(String, nullable=False)  # doing well, needs attention, concerning

class Escalation(Base):
    __tablename__ = "escalation"

    id = Column(Integer, primary_key=True, index=True)
    mentee_id = Column(Integer, ForeignKey("mentee.id"), nullable=False)
    raised_by = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    reason = Column(Text, nullable=False)
    escalated_to = Column(String, nullable=False)
    status = Column(String, default="open")  # open, in-progress, resolved
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Resume(Base):
    __tablename__ = "resume"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id"), nullable=False)
    file_path = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    extracted_skills = Column(String, nullable=True) # JSON string or comma separated
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="resumes")

class Alumni(Base):
    __tablename__ = "alumni"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    batch = Column(String, nullable=True)  # e.g., "2024"
    branch = Column(String, nullable=True)  # e.g., "CSE"
    company = Column(String, nullable=True)  # Current employer
    designation = Column(String, nullable=True)  # e.g., "Software Engineer"
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    willing_to_refer = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sponsored_drives = relationship("PlacementDrive", back_populates="alumni_sponsor")
    interview_materials = relationship("InterviewMaterial", back_populates="contributor_alumni")

class PlacementDrive(Base):
    __tablename__ = "placement_drive"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True, nullable=False)
    job_roles = Column(String, nullable=False)  # e.g. "Software Engineer, Frontend Developer"
    eligible_branches = Column(String, nullable=True)  # e.g. "CSE, IT, ECE"
    min_cgpa = Column(Float, nullable=True, default=0.0)
    expected_ctc = Column(String, nullable=True)  # e.g. "12 LPA"
    visit_date = Column(String, nullable=True)  # e.g. "2026-09-15"
    deadline_date = Column(String, nullable=True)
    status = Column(String, default="Scheduled")  # "Scheduled", "Ongoing", "Completed", "Cancelled"
    alumni_sponsor_id = Column(Integer, ForeignKey("alumni.id"), nullable=True)
    alumni_sponsor_name = Column(String, nullable=True)  # Snapshot / fallback if not linked to an alumni row
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    alumni_sponsor = relationship("Alumni", back_populates="sponsored_drives")
    offers = relationship("StudentOffer", back_populates="placement_drive", cascade="all, delete-orphan")
    interview_materials = relationship("InterviewMaterial", back_populates="placement_drive")

class Internship(Base):
    __tablename__ = "internship"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id"), nullable=True)
    student_name = Column(String, nullable=True)  # Name snapshot / fallback
    company = Column(String, index=True, nullable=False)
    role = Column(String, nullable=True)
    duration = Column(String, nullable=True)  # e.g. "6 months"
    stipend = Column(String, nullable=True)  # e.g. "40,000 / month"
    status = Column(String, default="Ongoing")  # "Ongoing", "Completed", "PPO Offered"
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="internships")

class StudentOffer(Base):
    __tablename__ = "student_offer"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id"), nullable=True)
    student_name = Column(String, nullable=True)  # Name snapshot / fallback
    placement_drive_id = Column(Integer, ForeignKey("placement_drive.id"), nullable=True)
    company = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)
    ctc = Column(Float, nullable=False, default=0.0)  # CTC in LPA, e.g. 14.5
    status = Column(String, default="Accepted")  # "Offered", "Accepted", "Declined"
    offer_letter_url = Column(String, nullable=True)
    offered_date = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    student = relationship("Student", back_populates="offers")
    placement_drive = relationship("PlacementDrive", back_populates="offers")

class InterviewMaterial(Base):
    __tablename__ = "interview_material"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)  # e.g. "Google SDE Interview Questions"
    role = Column(String, nullable=True)
    category = Column(String, default="Interview Questions")  # "Interview Questions", "OA Tips", "Preparation Guide"
    content = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    contributor_alumni_id = Column(Integer, ForeignKey("alumni.id"), nullable=True)
    contributor_name = Column(String, nullable=True)  # Snapshot: e.g. "Siddharth M (Class of 2024)"
    placement_drive_id = Column(Integer, ForeignKey("placement_drive.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    contributor_alumni = relationship("Alumni", back_populates="interview_materials")
    placement_drive = relationship("PlacementDrive", back_populates="interview_materials")
