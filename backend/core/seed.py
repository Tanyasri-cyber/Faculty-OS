from sqlalchemy.orm import Session
from .models import (
    Faculty, Timetable, SyllabusUnit, PolicyDocument, Student,
    AttendanceRecord, Assignment, Submission, InternalMark,
    COAttainment, FacultyWorkload, Publication, GrantOpportunity,
    ResearchDeadline, QuestionBankItem, QuestionPaper, Rubric,
    Mentee, CheckIn, Escalation,
    Alumni, AlumniInteraction, AlumniMentorship, AlumniEvent,
    AlumniContribution, AlumniFollowUpTask
)
from .database import engine, Base
from .auth import get_password_hash
from rag.rag_pipeline import rag_pipeline
import datetime

def seed_database(db: Session):
    # Ensure all tables are created
    Base.metadata.create_all(bind=engine)

    # Check if demo faculty exists
    demo_email = "demo@faculty.edu"
    faculty = db.query(Faculty).filter(Faculty.email == demo_email).first()
    
    if faculty:
        # Check if we should skip re-seeding (if we have internal marks data)
        internal_marks_count = db.query(InternalMark).count()
        if internal_marks_count > 0:
            print("Database already seeded with full 6-agent MVP data.")
            seed_alumni_data(db)
            seed_rag_policies(db)
            return

    print("Seeding database with full 6-agent MVP data...")
    
    # Clean-up to prevent duplicates if partially seeded
    db.query(Escalation).delete()
    db.query(CheckIn).delete()
    db.query(Mentee).delete()
    db.query(Rubric).delete()
    db.query(QuestionPaper).delete()
    db.query(QuestionBankItem).delete()
    db.query(ResearchDeadline).delete()
    db.query(GrantOpportunity).delete()
    db.query(Publication).delete()
    db.query(FacultyWorkload).delete()
    db.query(COAttainment).delete()
    db.query(InternalMark).delete()
    db.query(Submission).delete()
    db.query(Assignment).delete()
    db.query(AttendanceRecord).delete()
    db.query(Student).delete()
    db.query(SyllabusUnit).delete()
    db.query(Timetable).delete()
    db.query(PolicyDocument).delete()
    if not faculty:
        db.query(Faculty).delete()
    db.commit()
    
    # 1. Create Faculty (if not exists)
    if not faculty:
        faculty = Faculty(
            name="Preethi R",
            email=demo_email,
            department="Computer Science & Engineering",
            designation="Professor & Head",
            password_hash=get_password_hash("demo1234")
        )
        db.add(faculty)
        db.commit()
        db.refresh(faculty)

    # 2. Create Timetable
    timetable_entries = [
        # Monday
        Timetable(faculty_id=faculty.id, day_of_week="Monday", period="09:00 - 10:00", subject="Design & Analysis of Algorithms", class_section="CCE", room="LH-201"),
        Timetable(faculty_id=faculty.id, day_of_week="Monday", period="11:30 - 12:30", subject="Machine Learning", class_section="CSE-B", room="LH-302"),
        # Tuesday
        Timetable(faculty_id=faculty.id, day_of_week="Tuesday", period="10:00 - 11:00", subject="Design & Analysis of Algorithms", class_section="CCE", room="LH-201"),
        Timetable(faculty_id=faculty.id, day_of_week="Tuesday", period="14:00 - 15:30", subject="Machine Learning Lab", class_section="CSE-B", room="Lab-3"),
        # Wednesday
        Timetable(faculty_id=faculty.id, day_of_week="Wednesday", period="09:00 - 10:00", subject="Compiler Design", class_section="CCE", room="LH-203"),
        Timetable(faculty_id=faculty.id, day_of_week="Wednesday", period="11:30 - 12:30", subject="Design & Analysis of Algorithms", class_section="CCE", room="LH-201"),
        # Thursday
        Timetable(faculty_id=faculty.id, day_of_week="Thursday", period="10:00 - 11:00", subject="Machine Learning", class_section="CSE-B", room="LH-302"),
        Timetable(faculty_id=faculty.id, day_of_week="Thursday", period="14:00 - 15:00", subject="Compiler Design", class_section="CCE", room="LH-203"),
        # Friday
        Timetable(faculty_id=faculty.id, day_of_week="Friday", period="09:00 - 10:00", subject="Compiler Design", class_section="CCE", room="LH-203"),
        Timetable(faculty_id=faculty.id, day_of_week="Friday", period="11:30 - 12:30", subject="Machine Learning", class_section="CSE-B", room="LH-302"),
    ]
    
    for entry in timetable_entries:
        db.add(entry)

    # 3. Create Syllabus Units
    syllabus_units = [
        SyllabusUnit(
            subject="Design & Analysis of Algorithms",
            unit_number=1,
            title="Introduction to Algorithms",
            topics="Algorithm specification, asymptotic notations (Big O, Omega, Theta), mathematical analysis of non-recursive and recursive algorithms, recurrence relations, Master Theorem.",
            pdf_url="/syllabus/daa_unit1.pdf"
        ),
        SyllabusUnit(
            subject="Design & Analysis of Algorithms",
            unit_number=2,
            title="Divide-and-Conquer and Greedy Method",
            topics="Binary search, Merge sort, Quick sort, Strassen's matrix multiplication. Greedy Method: General method, Knapsack problem, Job sequencing with deadlines, Minimum cost spanning trees (Prim's and Kruskal's), Optimal merge patterns, Single source shortest paths (Dijkstra's).",
            pdf_url="/syllabus/daa_unit2.pdf"
        ),
        SyllabusUnit(
            subject="Design & Analysis of Algorithms",
            unit_number=3,
            title="Dynamic Programming",
            topics="General method, Multistage graphs, All pairs shortest paths (Floyd-Warshall), Single source shortest paths (Bellman-Ford), Optimal binary search trees, 0/1 Knapsack problem, Reliability design, Traveling salesperson problem.",
            pdf_url="/syllabus/daa_unit3.pdf"
        ),
        SyllabusUnit(
            subject="Design & Analysis of Algorithms",
            unit_number=4,
            title="Backtracking and Branch-and-Bound",
            topics="Backtracking: General method, 8-Queens problem, Sum of subsets, Graph coloring, Hamiltonian cycles. Branch-and-Bound: General method, 0/1 Knapsack problem, Traveling salesperson problem.",
            pdf_url="/syllabus/daa_unit4.pdf"
        ),
        SyllabusUnit(
            subject="Design & Analysis of Algorithms",
            unit_number=5,
            title="NP-Hard and NP-Complete Problems",
            topics="Basic concepts: Non-deterministic algorithms, NP-Hard and NP-Complete classes, Cook's theorem. Decision and Optimization problems, approximation algorithms for Knapsack and TSP.",
            pdf_url="/syllabus/daa_unit5.pdf"
        ),
        SyllabusUnit(
            subject="Machine Learning",
            unit_number=1,
            title="Introduction & Supervised Learning",
            topics="Definition of learning systems, goals and applications, aspects of supervised learning. Linear Regression, Logistic Regression, Gradient Descent optimization, Regularization (L1, L2).",
            pdf_url="/syllabus/ml_unit1.pdf"
        ),
        SyllabusUnit(
            subject="Machine Learning",
            unit_number=2,
            title="Decision Trees & Naive Bayes",
            topics="Decision tree representation, entropy, information gain, ID3 and C4.5 algorithms. Generative vs Discriminative models, Naive Bayes classifier, Laplace smoothing, Bayesian networks.",
            pdf_url="/syllabus/ml_unit2.pdf"
        ),
        SyllabusUnit(
            subject="Machine Learning",
            unit_number=3,
            title="Neural Networks & Deep Learning",
            topics="Perceptron learning rule, Multilayer Perceptrons, Backpropagation algorithm. Activation functions (ReLU, Sigmoid, Tanh). Introduction to Convolutional Neural Networks (CNNs).",
            pdf_url="/syllabus/ml_unit3.pdf"
        ),
    ]

    for unit in syllabus_units:
        db.add(unit)

    # 4. Create Policy Documents
    policies = [
        PolicyDocument(
            title="Faculty Leave Policy Guidelines 2026",
            category="Leave",
            file_path="policies/leave_policy_2026.txt"
        ),
        PolicyDocument(
            title="Internal Assessment Grading Policy",
            category="Academic",
            file_path="policies/grading_policy.txt"
        ),
        PolicyDocument(
            title="Student Attendance and Exam Policy",
            category="Exam",
            file_path="policies/attendance_policy.txt"
        )
    ]

    for policy in policies:
        db.add(policy)

    # 5. Create Students
    students_data = [
        {"roll_no": "24CC001", "name": "A. Kumar", "class_section": "CCE", "email": "kumar.a@student.edu"},
        {"roll_no": "24CC002", "name": "B. Priya", "class_section": "CCE", "email": "priya.b@student.edu"},
        {"roll_no": "24CC003", "name": "C. Dinesh", "class_section": "CCE", "email": "dinesh.c@student.edu"},
        {"roll_no": "24CC004", "name": "D. Ezhil", "class_section": "CCE", "email": "ezhil.d@student.edu"},
        {"roll_no": "24CC005", "name": "E. Farhan", "class_section": "CCE", "email": "farhan.e@student.edu"},
        {"roll_no": "24CC006", "name": "F. Gowri", "class_section": "CSE-B", "email": "gowri.f@student.edu"},
        {"roll_no": "24CC007", "name": "G. Hari", "class_section": "CSE-B", "email": "hari.g@student.edu"},
        {"roll_no": "24CC008", "name": "H. Indhu", "class_section": "CSE-B", "email": "indhu.h@student.edu"},
    ]
    
    students = []
    for s in students_data:
        student = Student(
            roll_no=s["roll_no"],
            name=s["name"],
            class_section=s["class_section"],
            mentor_faculty_id=faculty.id,
            email=s["email"]
        )
        db.add(student)
        students.append(student)
    db.commit()

    # Refresh students to get IDs
    for s in students:
        db.refresh(s)

    # 6. Create Assignments
    assignments = [
        Assignment(title="Assignment 1: Divide & Conquer Analysis", subject="Design & Analysis of Algorithms", class_section="CCE", due_date="2026-07-20", max_marks=10, status="Graded"),
        Assignment(title="Assignment 2: Greedy Knapsack & Prim's", subject="Design & Analysis of Algorithms", class_section="CCE", due_date="2026-08-05", max_marks=10, status="Open"),
        Assignment(title="Assignment 3: Neural Net Backpropagation", subject="Machine Learning", class_section="CSE-B", due_date="2026-08-10", max_marks=20, status="Open"),
    ]
    for a in assignments:
        db.add(a)
    db.commit()
    for a in assignments:
        db.refresh(a)

    # 7. Create Submissions and Attendance records
    dates = ["2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26", "2026-07-27"]
    
    for s in students:
        if s.class_section == "CCE":
            # Graded submissions for Assignment 1
            sub_marks = {"24CC001": 5, "24CC002": 10, "24CC003": 6, "24CC004": 8, "24CC005": 9}
            sub1 = Submission(
                assignment_id=assignments[0].id,
                student_id=s.id,
                submitted_at="2026-07-19 14:32:00",
                marks_obtained=sub_marks.get(s.roll_no, 7),
                status="Graded"
            )
            db.add(sub1)
            
            # Pending or submitted for Assignment 2
            if s.roll_no != "24CC001":  # Kumar hasn't submitted yet
                sub2 = Submission(
                    assignment_id=assignments[1].id,
                    student_id=s.id,
                    submitted_at="2026-07-26 10:15:00",
                    marks_obtained=None,
                    status="Submitted"
                )
                db.add(sub2)

            # Attendance records
            # A. Kumar (24CC001) is absent on 23rd, 24th, and 26th (40% attendance)
            # C. Dinesh (24CC003) is absent on 25th (80% attendance)
            # Others have 100%
            for d in dates:
                status = "Present"
                if s.roll_no == "24CC001" and d in ["2026-07-23", "2026-07-24", "2026-07-26"]:
                    status = "Absent"
                elif s.roll_no == "24CC003" and d == "2026-07-25":
                    status = "Absent"
                
                rec = AttendanceRecord(
                    student_id=s.id,
                    date=d,
                    status=status,
                    period="09:00 - 10:00",
                    subject="Design & Analysis of Algorithms",
                    class_section="CCE"
                )
                db.add(rec)
        else:
            # CSE-B ML
            # Graded submissions for Assignment 3
            if s.roll_no in ["24CC006", "24CC008"]:
                sub3 = Submission(
                    assignment_id=assignments[2].id,
                    student_id=s.id,
                    submitted_at="2026-07-28 09:30:00",
                    marks_obtained=None,
                    status="Submitted"
                )
                db.add(sub3)
            
            # Attendance records
            # G. Hari (24CC007) is absent on 24th and 27th (60% attendance)
            for d in dates:
                status = "Present"
                if s.roll_no == "24CC007" and d in ["2026-07-24", "2026-07-27"]:
                    status = "Absent"
                    
                rec = AttendanceRecord(
                    student_id=s.id,
                    date=d,
                    status=status,
                    period="11:30 - 12:30",
                    subject="Machine Learning",
                    class_section="CSE-B"
                )
                db.add(rec)

    # 8. Create Internal Marks
    # Seed internal marks for CCE students in DAA
    for s in students:
        if s.class_section == "CCE":
            cat1 = 8 if s.roll_no == "24CC001" else (15 if s.roll_no == "24CC002" else (9 if s.roll_no == "24CC003" else (12 if s.roll_no == "24CC004" else 13)))
            cat2 = 7 if s.roll_no == "24CC001" else (14 if s.roll_no == "24CC002" else (10 if s.roll_no == "24CC003" else (11 if s.roll_no == "24CC004" else 14)))
            assignment = 5 if s.roll_no == "24CC001" else (10 if s.roll_no == "24CC002" else (6 if s.roll_no == "24CC003" else (8 if s.roll_no == "24CC004" else 9)))
            lab = 8 if s.roll_no == "24CC001" else (10 if s.roll_no == "24CC002" else (7 if s.roll_no == "24CC003" else (9 if s.roll_no == "24CC004" else 9)))
            attendance_pct = 40 if s.roll_no == "24CC001" else (80 if s.roll_no == "24CC003" else 100)
            
            mark = InternalMark(
                student_id=s.id,
                subject="Design & Analysis of Algorithms",
                cat1_marks=cat1,
                cat2_marks=cat2,
                assignment_marks=assignment,
                lab_marks=lab,
                total_marks=cat1 + cat2 + assignment + lab,
                attendance_percentage=attendance_pct
            )
            db.add(mark)
        else:
            # CSE-B ML
            cat1 = 14 if s.roll_no == "24CC006" else (9 if s.roll_no == "24CC007" else 12)
            cat2 = 13 if s.roll_no == "24CC006" else (8 if s.roll_no == "24CC007" else 13)
            assignment = 9 if s.roll_no == "24CC006" else (6 if s.roll_no == "24CC007" else 8)
            lab = 10 if s.roll_no == "24CC006" else (7 if s.roll_no == "24CC007" else 8)
            attendance_pct = 60 if s.roll_no == "24CC007" else 100
            
            mark = InternalMark(
                student_id=s.id,
                subject="Machine Learning",
                cat1_marks=cat1,
                cat2_marks=cat2,
                assignment_marks=assignment,
                lab_marks=lab,
                total_marks=cat1 + cat2 + assignment + lab,
                attendance_percentage=attendance_pct
            )
            db.add(mark)

    # 9. Create CO Attainment & Workload
    co_attainments = [
        COAttainment(subject="Design & Analysis of Algorithms", co_number="CO1", target_percentage=75, attained_percentage=80),
        COAttainment(subject="Design & Analysis of Algorithms", co_number="CO2", target_percentage=75, attained_percentage=60),
        COAttainment(subject="Design & Analysis of Algorithms", co_number="CO3", target_percentage=75, attained_percentage=95),
        COAttainment(subject="Design & Analysis of Algorithms", co_number="CO4", target_percentage=80, attained_percentage=78),
        COAttainment(subject="Design & Analysis of Algorithms", co_number="CO5", target_percentage=80, attained_percentage=85),
        COAttainment(subject="Machine Learning", co_number="CO1", target_percentage=80, attained_percentage=82),
        COAttainment(subject="Machine Learning", co_number="CO2", target_percentage=80, attained_percentage=78),
        COAttainment(subject="Machine Learning", co_number="CO3", target_percentage=80, attained_percentage=88),
    ]
    for co in co_attainments:
        db.add(co)

    workloads = [
        FacultyWorkload(faculty_id=faculty.id, subject="Design & Analysis of Algorithms", weekly_hours=4, role="Lecture"),
        FacultyWorkload(faculty_id=faculty.id, subject="Machine Learning", weekly_hours=3, role="Lecture"),
        FacultyWorkload(faculty_id=faculty.id, subject="Machine Learning Lab", weekly_hours=3, role="Lab"),
    ]
    for w in workloads:
        db.add(w)

    # 10. Create Publications, Grants & Research Deadlines
    publications = [
        Publication(
            faculty_id=faculty.id,
            title="An Efficient Deep Learning Framework for Brain Tumor Segmentation",
            venue="IEEE Transactions on Medical Imaging",
            type="journal",
            year=2026,
            co_authors="S. Ram, V. Krish",
            doi_or_link="10.1109/TMI.2026.123456",
            citation_count=4
        ),
        Publication(
            faculty_id=faculty.id,
            title="Distributed Consensus Protocols in Wireless Sensor Networks",
            venue="International Journal of Computer Networks",
            type="journal",
            year=2025,
            co_authors="R. Kapoor",
            doi_or_link="10.1016/j.comnet.2025.04.12",
            citation_count=12
        ),
        Publication(
            faculty_id=faculty.id,
            title="A Deep Reinforcement Learning Approach to Autonomous Traffic Control",
            venue="IEEE Transactions on Intelligent Transportation Systems",
            type="journal",
            year=2025,
            co_authors="S. Ram, A. Patel",
            doi_or_link="10.1109/TITS.2025.567890",
            citation_count=8
        ),
    ]
    for p in publications:
        db.add(p)
    db.commit()
    for p in publications:
        db.refresh(p)

    grants = [
        GrantOpportunity(
            title="Research Promotion Scheme (RPS) in AI/ML",
            funding_body="AICTE",
            amount="8 Lakhs",
            eligibility="Full-time faculty with Ph.D. degree & 5 years experience.",
            deadline="2026-08-15",
            focus_area="Machine Learning, Robotics, Computer Vision"
        ),
        GrantOpportunity(
            title="Core Research Grant (CRG)",
            funding_body="SERB",
            amount="35 Lakhs",
            eligibility="Ph.D. degree, regular academic position in India.",
            deadline="2026-09-30",
            focus_area="Data Science, Quantum Computing, IoT"
        ),
        GrantOpportunity(
            title="Early Career Research Award in AI and Robotics",
            funding_body="DST (Department of Science and Technology, India)",
            amount="25 Lakhs",
            eligibility="Full-time faculty with Ph.D. degree within 2 years of appointment.",
            deadline="2026-10-15",
            focus_area="AI, Robotics, Control Systems"
        ),
    ]
    for g in grants:
        db.add(g)

    deadlines = [
        ResearchDeadline(faculty_id=faculty.id, type="submission", title="AICTE RPS Grant Application", due_date="2026-08-15"),
        ResearchDeadline(faculty_id=faculty.id, type="review", title="IEEE Cloud Computing Conference Camera-Ready", due_date="2026-07-30", related_publication_id=publications[0].id),
        ResearchDeadline(faculty_id=faculty.id, type="renewal", title="Patent Renewal: Smart Microgrid Controller", due_date="2026-08-27"),
        ResearchDeadline(faculty_id=faculty.id, type="submission", title="DST Early Career Grant Draft Submission", due_date="2026-09-10"),
    ]
    for d in deadlines:
        db.add(d)

    # 11. Create Question Bank Items
    questions = [
        QuestionBankItem(subject="Design & Analysis of Algorithms", unit=1, co_number="CO1", bloom_level="Remember", question_text="Define Asymptotic Notation and list the three primary types used in algorithm analysis.", marks=5, difficulty="Easy"),
        QuestionBankItem(subject="Design & Analysis of Algorithms", unit=1, co_number="CO1", bloom_level="Understand", question_text="Explain the Master Theorem for solving recurrence relations. Under what conditions is it not applicable?", marks=10, difficulty="Medium"),
        QuestionBankItem(subject="Design & Analysis of Algorithms", unit=2, co_number="CO2", bloom_level="Apply", question_text="Trace the execution of Quick Sort on the array [24, 9, 29, 14, 19, 27]. Show the array after each partitioning step.", marks=10, difficulty="Medium"),
        QuestionBankItem(subject="Design & Analysis of Algorithms", unit=2, co_number="CO2", bloom_level="Analyze", question_text="Compare the greedy Knapsack problem with the 0/1 Knapsack problem. Prove why the greedy approach fails to yield the optimal solution for the 0/1 Knapsack problem.", marks=10, difficulty="Hard"),
        QuestionBankItem(subject="Design & Analysis of Algorithms", unit=3, co_number="CO3", bloom_level="Evaluate", question_text="Given a chain of matrices [10x20, 20x30, 30x40, 40x30], evaluate the optimal parenthesization that minimizes the total multiplication cost using dynamic programming.", marks=15, difficulty="Hard"),
        
        # Machine Learning Questions
        QuestionBankItem(subject="Machine Learning", unit=1, co_number="CO1", bloom_level="Understand", question_text="Describe the differences between Supervised, Unsupervised, and Reinforcement Learning.", marks=5, difficulty="Easy"),
        QuestionBankItem(subject="Machine Learning", unit=1, co_number="CO1", bloom_level="Apply", question_text="Formulate the cost function for Linear Regression with L2 regularization (Ridge) and explain how Gradient Descent optimizes it.", marks=10, difficulty="Medium"),
        QuestionBankItem(subject="Machine Learning", unit=2, co_number="CO2", bloom_level="Apply", question_text="Calculate the Information Gain for a split on a boolean attribute given a set of 14 examples with 9 positive and 5 negative classes.", marks=10, difficulty="Hard"),
        QuestionBankItem(subject="Machine Learning", unit=3, co_number="CO3", bloom_level="Analyze", question_text="Describe the Backpropagation algorithm in multi-layer perceptrons, deriving the weight update rule for output layer weights.", marks=15, difficulty="Hard"),
        QuestionBankItem(subject="Machine Learning", unit=3, co_number="CO3", bloom_level="Understand", question_text="Explain the architecture of a Convolutional Neural Network (CNN) and the function of pooling layers.", marks=10, difficulty="Medium"),
    ]
    for q in questions:
        db.add(q)

    # 12. Create Mentees
    mentees = []
    for s in students:
        if s.roll_no in ["24CC001", "24CC002", "24CC003", "24CC006"]:
            last_checkin = "2026-06-29" if s.roll_no == "24CC001" else ("2026-07-24" if s.roll_no == "24CC002" else ("2026-07-13" if s.roll_no == "24CC003" else "2026-07-25"))
            mentee = Mentee(
                student_id=s.id,
                mentor_faculty_id=faculty.id,
                class_section=s.class_section,
                last_checkin_date=last_checkin
            )
            db.add(mentee)
            mentees.append(mentee)
    db.commit()
    for m in mentees:
        db.refresh(m)

    # 13. Create Check-ins & Escalations
    mentee_map = {}
    for m in mentees:
        s = db.query(Student).filter(Student.id == m.student_id).first()
        if s:
            mentee_map[s.roll_no] = m

    checkins = [
        CheckIn(
            mentee_id=mentee_map["24CC003"].id, # Dinesh
            date="2026-07-13",
            mode="in-person",
            notes="Expressed difficulty in understanding Dynamic Programming and asymptotic analysis in DAA. Advised him to attend remedial sessions. Seems moderately anxious about the upcoming CAT-2 exam.",
            mood_tag="needs attention"
        ),
        CheckIn(
            mentee_id=mentee_map["24CC002"].id, # Priya
            date="2026-07-24",
            mode="chat",
            notes="Doing exceptionally well. Preparing for CAT-2. Enquired about research internship opportunities in medical imaging.",
            mood_tag="doing well"
        ),
        CheckIn(
            mentee_id=mentee_map["24CC001"].id, # Kumar
            date="2026-06-29",
            mode="in-person",
            notes="Missed multiple lab sessions due to personal health reasons. Lacks basic understanding of recursion. Discussed a study plan to catch up, but attendance remains low.",
            mood_tag="needs attention"
        ),
        CheckIn(
            mentee_id=mentee_map["24CC006"].id, # Gowri
            date="2026-07-25",
            mode="chat",
            notes="Checked in on Machine Learning coursework. She is highly motivated and requested advice on publishing her class project.",
            mood_tag="doing well"
        ),
    ]
    for c in checkins:
        db.add(c)
        
    escalations = [
        Escalation(
            mentee_id=mentee_map["24CC003"].id, # Dinesh
            raised_by=faculty.id,
            reason="Student shows high anxiety levels and has missed consecutive tutorial classes due to reported health stress.",
            escalated_to="counselor",
            status="open"
        ),
        Escalation(
            mentee_id=mentee_map["24CC001"].id, # Kumar
            raised_by=faculty.id,
            reason="Attendance has fallen below 40% and student did not respond to multiple email follow-ups. Needs academic and administrative intervention.",
            escalated_to="HOD",
            status="open"
        ),
    ]
    for e in escalations:
        db.add(e)

    db.commit()
    print("Database seeded successfully with all tables!")

    seed_alumni_data(db)

    # Ingest text into RAG
    seed_rag_policies(db)

def seed_rag_policies(db: Session):
    print("Ingesting policies into RAG pipeline...")
    
    # Reset/clear collection to prevent duplicate chunks
    if rag_pipeline.initialized and rag_pipeline.collection:
        try:
            rag_pipeline.client.delete_collection("policy_documents")
            rag_pipeline.collection = rag_pipeline.client.get_or_create_collection(
                name="policy_documents", 
                embedding_function=rag_pipeline.emb_fn
            )
            print("ChromaDB collection 'policy_documents' cleared and recreated.")
        except Exception as e:
            print(f"Failed to clear ChromaDB collection: {e}")
    policy_texts = {
        "Faculty Leave Policy Guidelines 2026": """
        FACULTY LEAVE POLICY GUIDELINES - 2026
        
        1. Casual Leave (CL): 
        All full-time faculty members are entitled to 12 days of Casual Leave per calendar year. 
        A maximum of 3 days of CL can be taken consecutively. Prior approval must be obtained from 
        the Head of the Department (HOD) at least 24 hours in advance. For emergency leaves, oral 
        or email notification is required by 8:30 AM on the day of the leave.
        
        2. Earned Leave (EL):
        Faculty members who have completed 1 year of continuous service are eligible for 10 days of 
        Earned Leave per year. EL can be accumulated up to a maximum of 60 days. Approval for EL 
        must be submitted to the Dean's office at least 15 days in advance through the HOD.
        
        3. Sick Leave (SL):
        Faculty are entitled to 8 days of Sick Leave per year. A medical certificate from a registered 
        medical practitioner is mandatory if Sick Leave extends beyond 2 consecutive days.
        
        4. Duty Leave (DL):
        Duty Leave is provided for academic activities such as attending conferences, workshops, acting as 
        an external examiner, or participating in university valuation. Faculty can avail up to 15 days 
        of Duty Leave per academic year. Written proof (e.g., invitation letter, attendance certificate) 
        must be submitted along with the DL request at least 5 days in advance.
        
        5. Academic Leave substitution:
        In all cases of leave, the faculty member must arrange for class adjustments/substitution with another 
        colleague. The timetable adjustment form signed by both faculty members must be submitted to the HOD.
        """,
        
        "Internal Assessment Grading Policy": """
        INTERNAL ASSESSMENT AND GRADING POLICY - B.TECH CSE
        
        1. Weightage Distribution:
        The total internal assessment marks for any course is 50 marks. This is split as follows:
        - Continuous Assessment Tests (CAT-1 & CAT-2): 30 Marks total (15 Marks each).
        - Assignments & Quizzes: 10 Marks.
        - Laboratory/Practical Work (where applicable) or Mini-Project: 10 Marks.
        If there is no practical component, the 10 marks are allocated to a course project and class participation.
        
        2. Continuous Assessment Tests (CAT):
        CAT-1 is conducted after 30 working days (covering Unit 1 and Unit 2). CAT-2 is conducted after 60 working 
        days (covering Unit 3 and Unit 4). Retest is only allowed in genuine cases (e.g., medical emergency, 
        representing the institution in sports/competitions) and must be approved by the Principal.
        
        3. Assignment Submissions:
        A minimum of 2 assignments must be given per course. Submissions must be graded on a scale of 10 and 
        averaged. Late submission penalty: 10% deduction per day of delay. No assignments are accepted after 
        5 days from the due date.
        
        4. Grade Boundaries:
        Relative grading is applied for classes with more than 30 students. The grades are assigned based on 
        the mean (M) and standard deviation (SD) of the class performance:
        - O (Outstanding): >= M + 1.5 * SD
        - A+ (Excellent): M + 1.0 * SD to M + 1.5 * SD
        - A (Very Good): M + 0.5 * SD to M + 1.0 * SD
        - B+ (Good): M to M + 0.5 * SD
        - B (Above Average): M - 0.5 * SD to M
        - C (Average): M - 1.0 * SD to M - 0.5 * SD
        - U (Re-appear): < M - 1.0 * SD (or less than 50% absolute marks)
        """,
        
        "Student Attendance and Exam Policy": """
        STUDENT ATTENDANCE AND EXAM ELIGIBILITY POLICY
        
        1. Minimum Attendance Requirement:
        Every student is expected to maintain 100% attendance in all courses. However, to accommodate 
        sickness, emergencies, and co-curricular activities, a minimum of 75% attendance is mandatory 
        to be eligible to write the End Semester Examinations.
        
        2. Attendance Condonation:
        Students having attendance between 65% and 74% due to medical reasons or authorized institute-level 
        deputation may apply for condonation. This requires submission of valid medical certificates/letters 
        and payment of the condonation fee. Condonation is limited to twice during the entire program duration.
        Students with less than 65% attendance in any course are strictly barred from writing the examination 
        for that course and must register for the course again (re-run) in subsequent semesters.
        
        3. Duty Attendance (DA):
        DA is granted for representing the department/institute in technical events, sports, or placements. 
        DA requests must be forwarded by the faculty coordinator and approved by the HOD within 3 days of 
        the activity. Late DA requests will not be processed.
        
        4. Detention:
        The detenu list (students ineligible to write exams) is published 5 days before the commencement 
        of the practical exams. No changes or appeals are permitted after the final publication of the detenu list.
        """
    }

    for title, text in policy_texts.items():
        policy_doc = db.query(PolicyDocument).filter(PolicyDocument.title == title).first()
        if policy_doc:
            # Ingest into RAG pipeline
            rag_pipeline.ingest_document(
                title=title,
                text=text,
                category=policy_doc.category,
                source_name=policy_doc.file_path
            )
    print("RAG seeding complete.")


def seed_alumni_data(db: Session):
    if db.query(Alumni).count() > 0:
        return

    print("Seeding Alumni Relations module records...")
    demo_faculty = db.query(Faculty).first()
    faculty_id = demo_faculty.id if demo_faculty else 1

    alumni_list = [
        Alumni(
            name="Siddharth Madhavan",
            email="siddharth.m@google.com",
            phone="+91 98401 23456",
            graduation_year=2020,
            degree="B.Tech",
            department="CSE",
            current_company="Google",
            designation="Senior Software Engineer",
            industry="Cloud & Distributed Systems",
            location="Bengaluru, Karnataka",
            skills="Go, Kubernetes, Distributed Systems, Microservices, GCP, Cloud Architecture",
            linkedin_url="https://linkedin.com/in/siddharth-m-cloud",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            mentorship_available=True,
            mentorship_topics="Distributed Systems, Cloud Architecture, Google SDE Interviews",
            willing_to_refer=True,
            willing_guest_lectures=True,
            engagement_status="Active",
            engagement_score=94,
            last_interaction_date="2026-09-18",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Priya Ramakrishnan",
            email="priya.r@microsoft.com",
            phone="+91 94441 87654",
            graduation_year=2021,
            degree="B.Tech",
            department="CCE",
            current_company="Microsoft",
            designation="Software Engineer II",
            industry="Enterprise Software & AI",
            location="Hyderabad, Telangana",
            skills="C#, .NET Core, Azure DevOps, LLM Integration, React, TypeScript",
            linkedin_url="https://linkedin.com/in/priya-ram-msft",
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
            mentorship_available=True,
            mentorship_topics="Azure Cloud, Fullstack .NET, Women in Tech Mentorship",
            willing_to_refer=True,
            willing_guest_lectures=True,
            engagement_status="Active",
            engagement_score=88,
            last_interaction_date="2026-10-02",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Gowri Shankar",
            email="gowrishankar@amazon.com",
            phone="+91 97910 54321",
            graduation_year=2019,
            degree="B.Tech",
            department="CSE",
            current_company="Amazon",
            designation="Solutions Architect Lead",
            industry="E-Commerce & AWS",
            location="Chennai, Tamil Nadu",
            skills="AWS Solutions, Serverless, DynamoDB, Python, High-Scale Architecture",
            linkedin_url="https://linkedin.com/in/gowri-shankar-aws",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            mentorship_available=True,
            mentorship_topics="AWS Certification, System Design, Solution Architecture",
            willing_to_refer=True,
            willing_guest_lectures=True,
            engagement_status="Active",
            engagement_score=91,
            last_interaction_date="2026-08-15",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Karthik Venkatesh",
            email="karthik.v@zoho.com",
            phone="+91 98840 99887",
            graduation_year=2022,
            degree="B.Tech",
            department="IT",
            current_company="Zoho Corp",
            designation="Lead Product Engineer",
            industry="SaaS & Cloud Applications",
            location="Chennai, Tamil Nadu",
            skills="Java, Spring Boot, PostgreSQL, Microservices, Redis, SaaS Architecture",
            linkedin_url="https://linkedin.com/in/karthik-venkat-zoho",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
            mentorship_available=True,
            mentorship_topics="Product Engineering, Database Scaling, Startup Culture",
            willing_to_refer=True,
            willing_guest_lectures=False,
            engagement_status="Active",
            engagement_score=82,
            last_interaction_date="2026-09-24",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Ananya Sundaram",
            email="ananya.sundar@nvidia.com",
            phone="+91 99400 11223",
            graduation_year=2018,
            degree="M.Tech",
            department="ECE",
            current_company="NVIDIA",
            designation="Senior AI Hardware Engineer",
            industry="Semiconductor & Accelerated Computing",
            location="Bengaluru, Karnataka",
            skills="CUDA, GPU Optimization, PyTorch, Deep Learning, VLSI, Computer Vision",
            linkedin_url="https://linkedin.com/in/ananya-sundaram-ai",
            avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
            mentorship_available=True,
            mentorship_topics="CUDA Programming, AI Research Careers, VLSI Design",
            willing_to_refer=True,
            willing_guest_lectures=True,
            engagement_status="Active",
            engagement_score=95,
            last_interaction_date="2026-10-10",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Varun Natarajan",
            email="varun.nat@razorpay.com",
            phone="+91 97890 33445",
            graduation_year=2023,
            degree="B.Tech",
            department="CSE",
            current_company="Razorpay",
            designation="Fintech Software Engineer",
            industry="Fintech & Payments",
            location="Bengaluru, Karnataka",
            skills="Golang, Kafka, High-Frequency Transactions, Docker, Redis",
            linkedin_url="https://linkedin.com/in/varun-natarajan-fintech",
            avatar_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
            mentorship_available=False,
            mentorship_topics="Fintech Systems, Transaction Processing",
            willing_to_refer=True,
            willing_guest_lectures=False,
            engagement_status="Requires Follow-up",
            engagement_score=68,
            last_interaction_date="2026-06-12",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Deepa Balasubramanian",
            email="deepa.bala@cisco.com",
            phone="+91 94450 77665",
            graduation_year=2019,
            degree="B.Tech",
            department="CCE",
            current_company="Cisco Systems",
            designation="Network Security Specialist",
            industry="Cybersecurity & Networking",
            location="Chennai, Tamil Nadu",
            skills="Network Protocols, Cyber Security, Wireshark, Zero Trust, Python",
            linkedin_url="https://linkedin.com/in/deepa-balasubramanian-cisco",
            avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
            mentorship_available=True,
            mentorship_topics="Cybersecurity certifications, Ethical Hacking, Cisco Routing",
            willing_to_refer=True,
            willing_guest_lectures=True,
            engagement_status="Active",
            engagement_score=85,
            last_interaction_date="2026-09-05",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Rohan Sethuraman",
            email="rohan.sethu@morganstanley.com",
            phone="+91 98410 44332",
            graduation_year=2021,
            degree="B.Tech",
            department="IT",
            current_company="Morgan Stanley",
            designation="Quant Technology Associate",
            industry="Investment Banking & Algorithmic Trading",
            location="Mumbai, Maharashtra",
            skills="C++, Python, Algorithmic Trading, Low Latency, Time Series Analytics",
            linkedin_url="https://linkedin.com/in/rohan-sethu-quant",
            avatar_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
            mentorship_available=True,
            mentorship_topics="Financial Engineering, Quant Prep, C++ Low-Latency",
            willing_to_refer=False,
            willing_guest_lectures=True,
            engagement_status="Active",
            engagement_score=78,
            last_interaction_date="2026-07-20",
            consent_status="Transactional Only"
        ),
        Alumni(
            name="Meera Chandrasekaran",
            email="meera.c@tesla.com",
            phone="+1 510 555 0192",
            graduation_year=2018,
            degree="M.Tech",
            department="MECH",
            current_company="Tesla Motors",
            designation="Senior Autopilot Validation Engineer",
            industry="Automotive & Robotics",
            location="Palo Alto, California, USA",
            skills="Computer Vision, ROS, Embedded C++, Sensor Fusion, Robotics",
            linkedin_url="https://linkedin.com/in/meera-chandra-tesla",
            avatar_url="https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150",
            mentorship_available=True,
            mentorship_topics="Autonomous Vehicles, International MS/PhD Applications, Robotics",
            willing_to_refer=True,
            willing_guest_lectures=True,
            engagement_status="Active",
            engagement_score=92,
            last_interaction_date="2026-09-29",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Aditya Krishnan",
            email="aditya.k@freshworks.com",
            phone="+91 97900 88776",
            graduation_year=2024,
            degree="B.Tech",
            department="CSE",
            current_company="Freshworks",
            designation="Associate Product Manager",
            industry="SaaS & Product Strategy",
            location="Chennai, Tamil Nadu",
            skills="Product Roadmap, User Research, Wireframing, SQL, A/B Testing",
            linkedin_url="https://linkedin.com/in/aditya-krishnan-apm",
            avatar_url="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
            mentorship_available=True,
            mentorship_topics="APM Roles, Breaking into Product Management, Campus to Corporate",
            willing_to_refer=True,
            willing_guest_lectures=True,
            engagement_status="Newly Registered",
            engagement_score=70,
            last_interaction_date="2026-10-15",
            consent_status="Opt-in"
        ),
        Alumni(
            name="Naveen Rajan",
            email="naveen.rajan@uber.com",
            phone="+91 98841 22334",
            graduation_year=2017,
            degree="B.Tech",
            department="CSE",
            current_company="Uber",
            designation="Staff Infrastructure Engineer",
            industry="Ride Sharing & Mobility",
            location="Bengaluru, Karnataka",
            skills="Distributed Storage, Linux Kernels, Apache Spark, Golang, Cassandra",
            linkedin_url="https://linkedin.com/in/naveen-rajan-uber",
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
            mentorship_available=False,
            mentorship_topics="Staff Engineering Path, Large Scale Infrastructure",
            willing_to_refer=True,
            willing_guest_lectures=False,
            engagement_status="Inactive",
            engagement_score=45,
            last_interaction_date="2025-11-10",
            consent_status="Opt-in"
        )
    ]

    for a in alumni_list:
        db.add(a)
    db.commit()
    for a in alumni_list:
        db.refresh(a)

    # Interactions
    interactions = [
        AlumniInteraction(
            alumni_id=alumni_list[0].id,
            faculty_id=faculty_id,
            interaction_type="Guest Lecture",
            date="2026-09-18",
            summary="Delivered keynote on 'Building Scalable Cloud Infrastructure on Kubernetes' for 140 3rd-year CSE students.",
            outcome="Completed"
        ),
        AlumniInteraction(
            alumni_id=alumni_list[1].id,
            faculty_id=faculty_id,
            interaction_type="Mentorship",
            date="2026-10-02",
            summary="Agreed to mentor 3 final-year CCE female candidates for Microsoft Aspire program.",
            outcome="Positive"
        ),
        AlumniInteraction(
            alumni_id=alumni_list[2].id,
            faculty_id=faculty_id,
            interaction_type="Meeting",
            date="2026-08-15",
            summary="Discussed sponsoring department cloud lab credits through AWS Educate.",
            outcome="Follow-up Required"
        ),
        AlumniInteraction(
            alumni_id=alumni_list[4].id,
            faculty_id=faculty_id,
            interaction_type="Campus Visit",
            date="2026-10-10",
            summary="Visited AI/Deep Learning lab, reviewed 6 student capstone projects on computer vision.",
            outcome="Completed"
        )
    ]
    for inter in interactions:
        db.add(inter)

    # Mentorships
    mentorships = [
        AlumniMentorship(
            alumni_id=alumni_list[0].id,
            student_name="Rahul Varma",
            student_roll_no="22CSE045",
            student_department="CSE",
            topic="Distributed Systems & Mock Interview for Google",
            request_date="2026-09-25",
            status="Accepted",
            goals="Review resume, conduct mock system design session on rate limiter architecture",
            meeting_link="https://meet.google.com/xyz-alumni-mentorship",
            session_notes="Initial intro call completed. Student showed strong algorithmic foundations.",
            feedback_rating=5,
            feedback_text="Siddharth provided actionable tips on scalable API design and clean code practices."
        ),
        AlumniMentorship(
            alumni_id=alumni_list[1].id,
            student_name="Sneha Murugan",
            student_roll_no="22CCE012",
            student_department="CCE",
            topic="Fullstack Web Development & Azure Cloud Certification",
            request_date="2026-10-05",
            status="Accepted",
            goals="Guidance on AZ-900 and building production-ready microfrontends",
            meeting_link="https://teams.microsoft.com/l/meetup-join/12345",
            session_notes="Discussed Azure DevOps CI/CD pipelines and student's capstone repository.",
            feedback_rating=5,
            feedback_text="Priya was extremely supportive and walked through real corporate code review practices."
        ),
        AlumniMentorship(
            alumni_id=alumni_list[4].id,
            student_name="Aravind Balaji",
            student_roll_no="22ECE031",
            student_department="ECE",
            topic="CUDA Acceleration & GPU Tensor Processing",
            request_date="2026-10-12",
            status="Pending",
            goals="Seeking advice on optimizing matrix multiplication kernels using CUDA C++",
            meeting_link="",
            session_notes="",
            feedback_rating=None,
            feedback_text=""
        ),
        AlumniMentorship(
            alumni_id=alumni_list[9].id,
            student_name="Kavya Sundar",
            student_roll_no="22CSE088",
            student_department="CSE",
            topic="Associate Product Manager (APM) Career Prep",
            request_date="2026-10-16",
            status="Pending",
            goals="Understand product case studies and resume tailoring for SaaS companies",
            meeting_link="",
            session_notes="",
            feedback_rating=None,
            feedback_text=""
        )
    ]
    for m in mentorships:
        db.add(m)

    # Events
    events = [
        AlumniEvent(
            title="Tech Symposium: Distributed Cloud Architecture at Scale",
            event_type="Guest Lecture",
            date="2026-11-08",
            time="10:30 AM - 12:30 PM",
            venue="Seminar Hall 1 & Live Stream",
            target_audience="3rd & 4th Year CSE/CCE/IT Students",
            coordinator_name="Dr. Preethi R",
            alumni_speaker_id=alumni_list[0].id,
            alumni_speaker_name="Siddharth Madhavan",
            status="Upcoming",
            expected_attendees=160,
            actual_attendees=0,
            description="Deep-dive into microservices resilience, service meshes, and distributed consensus algorithms implemented in hyper-scale cloud providers.",
            feedback_summary=""
        ),
        AlumniEvent(
            title="Annual Alumni Homecoming & Institutional Networking Summit 2026",
            event_type="Alumni Reunion",
            date="2026-12-19",
            time="09:00 AM - 05:00 PM",
            venue="University Auditorium & Campus Grounds",
            target_audience="All Batches (2015-2025), Faculty, Student Council",
            coordinator_name="Alumni Relations Office",
            alumni_speaker_id=None,
            alumni_speaker_name="Distinguished Alumni Panel",
            status="Upcoming",
            expected_attendees=450,
            actual_attendees=0,
            description="Institutional gala connecting distinguished graduates, faculty mentors, incubation startups, and current student innovators.",
            feedback_summary=""
        ),
        AlumniEvent(
            title="AI & Hardware Co-Design: From Silicon to Transformer Models",
            event_type="Industry Workshop",
            date="2026-10-10",
            time="02:00 PM - 05:00 PM",
            venue="VLSI Centre of Excellence, Lab 4",
            target_audience="M.Tech & Final Year B.Tech ECE/CSE",
            coordinator_name="Prof. Sundaram",
            alumni_speaker_id=alumni_list[4].id,
            alumni_speaker_name="Ananya Sundaram",
            status="Completed",
            expected_attendees=80,
            actual_attendees=76,
            description="Interactive hands-on session on GPU kernel profiling and memory bandwidth bottlenecks for LLM inference.",
            feedback_summary="98% rated excellent. Students requested follow-up hands-on hackathon."
        )
    ]
    for ev in events:
        db.add(ev)

    # Contributions
    contributions = [
        AlumniContribution(
            alumni_id=alumni_list[0].id,
            alumni_name="Siddharth Madhavan",
            category="Financial/Scholarship",
            amount=150000.0,
            description="Endowed Merit-cum-Means Scholarship fund for 3 economically underprivileged computer science students.",
            date="2026-08-20",
            status="Approved",
            verified_by="Dean of Student Affairs",
            impact_summary="Sponsored tuition fee and laptop allowance for 3 second-year scholars."
        ),
        AlumniContribution(
            alumni_id=alumni_list[4].id,
            alumni_name="Ananya Sundaram",
            category="Lab Equipment/Sponsorship",
            amount=280000.0,
            description="Facilitated donation of 2 high-performance NVIDIA RTX workstations for AI student research lab.",
            date="2026-09-12",
            status="Approved",
            verified_by="HOD CSE",
            impact_summary="Installed in Lab 4; currently supporting 8 graduate research projects on medical image synthesis."
        ),
        AlumniContribution(
            alumni_id=alumni_list[2].id,
            alumni_name="Gowri Shankar",
            category="Internship/Placement Referral",
            amount=0.0,
            description="Offered 8 priority interview referrals for AWS Solutions Architecture internship batch 2026-27.",
            date="2026-09-28",
            status="Approved",
            verified_by="Placement Officer",
            impact_summary="5 students successfully cleared preliminary screening and are in final rounds."
        ),
        AlumniContribution(
            alumni_id=alumni_list[1].id,
            alumni_name="Priya Ramakrishnan",
            category="Mentoring Hours",
            amount=0.0,
            description="Volunteered 20 hours of 1-on-1 career coaching and technical resume reviews for female engineers.",
            date="2026-10-02",
            status="Completed",
            verified_by="Faculty Mentor Lead",
            impact_summary="Coached 6 mentees; 2 secured summer internships at Microsoft and Cisco."
        )
    ]
    for c in contributions:
        db.add(c)

    # Follow-up tasks
    follow_ups = [
        AlumniFollowUpTask(
            alumni_id=alumni_list[0].id,
            alumni_name="Siddharth Madhavan",
            assigned_to="Dr. Preethi R",
            title="Finalize presentation slides and audio-visual check for Cloud Architecture symposium",
            due_date="2026-11-04",
            priority="High",
            status="Pending",
            notes="Send auditorium technical specs and Zoom link for remote hybrid participants."
        ),
        AlumniFollowUpTask(
            alumni_id=alumni_list[2].id,
            alumni_name="Gowri Shankar",
            assigned_to="Prof. K. Venkatesh",
            title="Follow-up on AWS Educate cloud lab credits approval",
            due_date="2026-10-30",
            priority="Medium",
            status="In Progress",
            notes="Institutional application submitted on portal; awaiting verification ticket confirmation."
        ),
        AlumniFollowUpTask(
            alumni_id=alumni_list[5].id,
            alumni_name="Varun Natarajan",
            assigned_to="Placement Coordinator",
            title="Re-engage for Razorpay campus hiring drive & mock technical interview panel",
            due_date="2026-10-25",
            priority="High",
            status="Overdue",
            notes="Last contacted in June 2026; need to re-verify current corporate contact details and campus drive dates."
        ),
        AlumniFollowUpTask(
            alumni_id=alumni_list[3].id,
            alumni_name="Karthik Venkatesh",
            assigned_to="Dr. Preethi R",
            title="Draft departmental MoU with Zoho Corp for student incubation and product internships",
            due_date="2026-11-15",
            priority="Medium",
            status="Pending",
            notes="Karthik offered to connect our incubation center with Zoho University Relations."
        )
    ]
    for f in follow_ups:
        db.add(f)

    db.commit()
    print("Alumni Relations seeding complete with 11 alumni, interactions, mentorships, events, contributions, and follow-ups.")

