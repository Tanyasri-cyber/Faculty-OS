"""
Placement & Internships Domain Agent (Career Advisor AI).
Integrated into ARIA Unified Master Agent and standalone Career Advisor endpoints.
Generates personalized career guidance using actual student resume skills, missing skills,
placement drives, internships, and interview prep materials from the database.
"""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from core.models import Student, Resume, PlacementDrive, Internship, InterviewMaterial, StudentOffer
from .skills_engine import (
    extract_required_skills,
    match_skills,
    normalize_skill,
    KNOWN_SKILLS,
)

def find_student_in_db(db: Session, text: str) -> Optional[Student]:
    """Identify a student from text by roll number, exact name, or partial name."""
    if not text:
        return None
    
    text_clean = text.strip()
    text_lower = text_clean.lower()
    students = db.query(Student).all()

    # 1. Exact or partial roll number match (e.g. 24CC001, 24cc001, 001)
    for s in students:
        if s.roll_no and s.roll_no.lower() in text_lower:
            return s

    # 2. Exact student name match
    for s in students:
        if s.name and s.name.lower() in text_lower:
            return s

    # 3. Last name or significant token match (e.g. "Kumar", "Priya", "Dinesh", "Ezhil")
    for s in students:
        if s.name:
            tokens = [t.lower() for t in s.name.replace(".", " ").split() if len(t) > 2]
            for tok in tokens:
                if tok in text_lower:
                    return s

    return None

def search_interview_materials(
    db: Session,
    company: Optional[str] = None,
    role: Optional[str] = None,
    skills: Optional[List[str]] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """Query InterviewMaterial from database matching target company, role, or skills."""
    all_materials = db.query(InterviewMaterial).order_by(InterviewMaterial.created_at.desc()).all()
    if not all_materials:
        return []

    results = []
    seen_ids = set()

    for m in all_materials:
        score = 0
        m_company = (m.company or "").lower()
        m_title = (m.title or "").lower()
        m_role = (m.role or "").lower()
        m_content = (m.content or "").lower()

        # Company match gives highest weight
        if company and (company.lower() in m_company or m_company in company.lower()):
            score += 10

        # Role match
        if role and (role.lower() in m_role or role.lower() in m_title):
            score += 5

        # Missing skills / technical keywords match
        if skills:
            for s in skills:
                s_lower = s.lower()
                if s_lower in m_title or s_lower in m_content or s_lower in m_role:
                    score += 2

        if score > 0 and m.id not in seen_ids:
            seen_ids.add(m.id)
            results.append((score, {
                "id": m.id,
                "title": m.title,
                "company": m.company,
                "role": m.role or "General",
                "category": m.category or "Interview Questions",
                "contributor_name": m.contributor_name or "Alumni Network",
                "content_snippet": (m.content[:160] + "...") if m.content and len(m.content) > 160 else (m.content or "Comprehensive interview guidance available."),
            }))

    # Sort descending by relevance score
    results.sort(key=lambda x: x[0], reverse=True)
    matched_items = [item[1] for item in results[:limit]]

    # If no specific match was found, return the top general materials from the database
    if not matched_items:
        matched_items = [
            {
                "id": m.id,
                "title": m.title,
                "company": m.company,
                "role": m.role or "General",
                "category": m.category or "Interview Questions",
                "contributor_name": m.contributor_name or "Alumni Network",
                "content_snippet": (m.content[:160] + "...") if m.content and len(m.content) > 160 else (m.content or "General preparation guide."),
            }
            for m in all_materials[:limit]
        ]

    return matched_items

def generate_student_career_guidance(
    student: Student,
    db: Session,
    target_drive_id: Optional[int] = None,
    target_internship_id: Optional[int] = None,
    specific_query: Optional[str] = None
) -> Dict[str, Any]:
    """Generate detailed, actionable career guidance for a specific student."""
    # 1. Fetch student's resume & skills
    resume = db.query(Resume).filter(Resume.student_id == student.id).first()
    resume_skills_raw = resume.extracted_skills if resume else None

    # 2. Fetch all placement drives and internships
    drives = db.query(PlacementDrive).order_by(PlacementDrive.created_at.desc()).all()
    internships = db.query(Internship).order_by(Internship.created_at.desc()).all()
    offers = db.query(StudentOffer).all()

    # Case A: Missing resume or no skills on file
    if not resume_skills_raw or not resume_skills_raw.strip():
        # Identify in-demand skills from current database drives
        drive_skill_counts: Dict[str, int] = {}
        for d in drives:
            req = extract_required_skills(f"{d.job_roles} {d.eligible_branches or ''}")
            for sk in req:
                drive_skill_counts[sk] = drive_skill_counts.get(sk, 0) + 1

        top_needed_skills = sorted(drive_skill_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        skills_summary = ", ".join([f"**{sk}**" for sk, _ in top_needed_skills]) if top_needed_skills else "**Data Structures, Python, SQL, Git**"

        general_materials = search_interview_materials(db, limit=3)
        materials_text = ""
        for m in general_materials:
            materials_text += f"- 📘 **{m['title']}** ({m['company']} — {m['category']})\n  _{m['content_snippet']}_\n"

        markdown = f"""### ⚠️ Career Guidance Profile: {student.name} ({student.roll_no})
**Class Section:** {student.class_section} | **Email:** {student.email}

> **Notice:** No technical skills or parsed resume were detected on file for {student.name}.

#### 1. Immediate Action Required: Resume Upload
To receive automated matching and qualify for campus placement shortlists, {student.name} should upload their technical resume:
- **Resume Upload Portal:** `/submit-resume`
- Ensure the resume clearly lists programming languages, tools, frameworks, and completed projects.

#### 2. High-ROI Target Skills for Upcoming Campus Drives
Based on active drives in the database ({len(drives)} scheduled drives including {', '.join([d.company_name for d in drives[:2]]) if drives else 'tech recruiters'}), the most demanded skills to prioritize are:
- {skills_summary}

#### 3. Recommended Preparatory Materials
While updating the resume, review these high-yield interview materials from our repository:
{materials_text or "- Core DSA & Coding Interview Material available in Interview Prep Hub."}

#### 4. Actionable Next Steps
1. **Upload Resume:** Submit current resume at `/submit-resume`.
2. **Foundational Prep:** Complete baseline DSA and SQL practice sets.
3. **Faculty Check-in:** Schedule a brief review with mentor/placement coordinator.
"""
        return {
            "text": markdown,
            "tool_calls": [],
            "rich_data": {
                "type": "career_advisor_guidance",
                "status": "missing_resume_skills",
                "student": {"id": student.id, "name": student.name, "roll_no": student.roll_no, "skills": None},
                "opportunities": [],
                "skill_gaps": [sk for sk, _ in top_needed_skills],
                "recommended_materials": general_materials,
                "action_steps": ["Upload resume at /submit-resume", "Prepare foundational DSA and SQL", "Review placement requirements"]
            }
        }

    # Case B: Student has resume skills on file
    student_skills_list = [s.strip() for s in resume_skills_raw.replace("\n", ",").replace(";", ",").split(",") if s.strip()]

    # Evaluate matches against all drives
    drive_matches = []
    for d in drives:
        req_skills = extract_required_skills(f"{d.job_roles} {d.eligible_branches or ''}")
        analysis = match_skills(resume_skills_raw, req_skills)
        drive_matches.append({
            "type": "placement_drive",
            "id": d.id,
            "company": d.company_name,
            "role": d.job_roles,
            "ctc": d.expected_ctc or "Market standard",
            "visit_date": d.visit_date or "To be announced",
            "status": d.status,
            "match_score": analysis["match_score"],
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
            "total_required": analysis["total_required"],
        })

    # Evaluate matches against internships
    internship_matches = []
    for i in internships:
        req_skills = extract_required_skills(i.role or "Software Engineering Intern")
        analysis = match_skills(resume_skills_raw, req_skills)
        internship_matches.append({
            "type": "internship",
            "id": i.id,
            "company": i.company,
            "role": i.role or "Intern",
            "duration": i.duration or "Flexible",
            "stipend": i.stipend or "Competitive",
            "match_score": analysis["match_score"],
            "matched_skills": analysis["matched_skills"],
            "missing_skills": analysis["missing_skills"],
            "total_required": analysis["total_required"],
        })

    # Combine and sort all opportunities
    all_opportunities = sorted(drive_matches + internship_matches, key=lambda x: x["match_score"], reverse=True)

    # High fit (>= 70%) and Moderate/Reach fit (40% - 69%)
    high_fit = [o for o in all_opportunities if o["match_score"] >= 70]
    moderate_fit = [o for o in all_opportunities if 40 <= o["match_score"] < 70]
    needs_prep = [o for o in all_opportunities if o["match_score"] < 40]

    # Aggregate and prioritize critical missing skills
    missing_skill_frequency: Dict[str, int] = {}
    for o in (high_fit + moderate_fit):
        for ms in o["missing_skills"]:
            missing_skill_frequency[ms] = missing_skill_frequency.get(ms, 0) + 1

    top_missing_skills = sorted(missing_skill_frequency.items(), key=lambda x: x[1], reverse=True)

    # Search targeted interview materials for the top opportunities and missing skills
    target_companies = [o["company"] for o in all_opportunities[:3]]
    target_roles = [o["role"] for o in all_opportunities[:3]]
    key_missing_list = [ms for ms, _ in top_missing_skills[:4]]
    
    recommended_materials = []
    for comp in target_companies:
        mats = search_interview_materials(db, company=comp, skills=key_missing_list, limit=2)
        for m in mats:
            if not any(rm["id"] == m["id"] for rm in recommended_materials):
                recommended_materials.append(m)

    if len(recommended_materials) < 3:
        # Fill with additional relevant materials by role or missing skills
        extra_mats = search_interview_materials(db, role=target_roles[0] if target_roles else None, skills=key_missing_list, limit=4)
        for m in extra_mats:
            if not any(rm["id"] == m["id"] for rm in recommended_materials):
                recommended_materials.append(m)

    # Compose Rich Markdown Response
    markdown = f"""### 🎯 Personalized Career Guidance: {student.name} ({student.roll_no})
**Department:** {student.class_section} | **Current Skills On File:** {resume_skills_raw}

---

#### 1. Top Recommended Placement & Internship Opportunities
"""
    if high_fit:
        markdown += "**🌟 Strong Fit (Direct Matches >= 70%):**\n"
        for o in high_fit:
            matched_str = ", ".join([f"`✓ {s}`" for s in o["matched_skills"]]) or "Baseline skills"
            missing_str = ", ".join([f"`✗ {s}`" for s in o["missing_skills"]]) if o["missing_skills"] else "None (Full match!)"
            extra_meta = f"CTC: **{o['ctc']}** | Date: **{o['visit_date']}**" if o["type"] == "placement_drive" else f"Duration: **{o['duration']}**"
            markdown += f"- **{o['company']} — {o['role']}** ({o['match_score']}% Match)\n"
            markdown += f"  - {extra_meta}\n"
            markdown += f"  - Matched: {matched_str}\n"
            if o["missing_skills"]:
                markdown += f"  - Missing: {missing_str}\n"

    if moderate_fit:
        markdown += "\n**🚀 Near-Match Opportunities (Target with minor upskilling):**\n"
        for o in moderate_fit[:3]:
            matched_str = ", ".join([f"`✓ {s}`" for s in o["matched_skills"]])
            missing_str = ", ".join([f"`✗ {s}`" for s in o["missing_skills"]])
            markdown += f"- **{o['company']} — {o['role']}** ({o['match_score']}% Match) | Missing: {missing_str}\n"

    if not high_fit and not moderate_fit:
        markdown += "Currently active drives have specialized skill requirements differing from the student's primary stack. See prioritized upskilling below.\n"

    markdown += "\n#### 2. Prioritized Skill Gaps to Close\n"
    if top_missing_skills:
        for sk, count in top_missing_skills[:5]:
            markdown += f"- **{sk}**: Required by **{count}** target opportunity/opportunities. Adding this will significantly boost shortlist probability.\n"
    else:
        markdown += "- No critical skill gaps identified for current strong-fit targets. Focus on mock interviews and problem-solving speed.\n"

    markdown += "\n#### 3. Recommended Interview Prep Materials from Database\n"
    if recommended_materials:
        for m in recommended_materials[:3]:
            markdown += f"- 📘 **{m['title']}** ({m['company']} — {m['category']})\n"
            markdown += f"  - _Shared by {m['contributor_name']}:_ {m['content_snippet']}\n"
    else:
        markdown += "- General interview guides and DSA questions available in the Interview Prep Hub.\n"

    # Actionable Next Steps
    top_target = all_opportunities[0] if all_opportunities else None
    target_comp_name = top_target["company"] if top_target else "campus recruiters"
    top_missing_single = top_missing_skills[0][0] if top_missing_skills else "advanced problem solving"

    markdown += f"""
#### 4. Actionable Next Steps (Roadmap)
1. **Immediate Focus (This Week):**
   - Study `{recommended_materials[0]['title'] if recommended_materials else 'interview question banks'}` in the Interview Prep Hub.
   - Build a targeted mini-project or review core concepts in **{top_missing_single}**.
2. **Drive Readiness (Next 2 Weeks):**
   - Target **{target_comp_name}** requirements by completing 15-20 relevant coding/system design questions.
   - Update resume on portal (`/submit-resume`) once the new skills are practiced.
3. **Mock Interview & Feedback:**
   - Schedule a mock technical round with faculty mentor ({student.mentor_faculty_id or 'Placement Coordinator'}).
"""

    return {
        "text": markdown,
        "tool_calls": [],
        "rich_data": {
            "type": "career_advisor_guidance",
            "status": "success",
            "student": {
                "id": student.id,
                "name": student.name,
                "roll_no": student.roll_no,
                "class_section": student.class_section,
                "skills": student_skills_list,
            },
            "top_opportunity": all_opportunities[0] if all_opportunities else None,
            "opportunities": all_opportunities[:5],
            "skill_gaps": [sk for sk, _ in top_missing_skills],
            "recommended_materials": recommended_materials,
            "action_steps": [
                f"Study recommended interview materials for {target_comp_name}",
                f"Bridge skill gap in {top_missing_single}",
                "Complete mock interview with mentor",
            ]
        }
    }

def generate_batch_career_guidance(query: str, db: Session) -> Dict[str, Any]:
    """Generate batch-level placement readiness and curriculum alignment guidance."""
    students = db.query(Student).all()
    drives = db.query(PlacementDrive).order_by(PlacementDrive.created_at.desc()).all()
    internships = db.query(Internship).order_by(Internship.created_at.desc()).all()
    materials = db.query(InterviewMaterial).order_by(InterviewMaterial.created_at.desc()).all()

    # Pre-fetch resumes
    resumes_by_student: Dict[int, Optional[str]] = {}
    for r in db.query(Resume).all():
        resumes_by_student[r.student_id] = r.extracted_skills

    # Overall batch readiness analysis
    total_students = len(students)
    students_with_resume = sum(1 for s in students if resumes_by_student.get(s.id))
    missing_resume_count = total_students - students_with_resume

    drive_summaries = []
    global_missing_counts: Dict[str, int] = {}

    for d in drives:
        req_skills = extract_required_skills(f"{d.job_roles} {d.eligible_branches or ''}")
        high_matches = []
        for s in students:
            r_skills = resumes_by_student.get(s.id)
            analysis = match_skills(r_skills, req_skills)
            if analysis["match_score"] >= 65:
                high_matches.append({
                    "name": s.name,
                    "roll_no": s.roll_no,
                    "score": analysis["match_score"],
                    "missing": analysis["missing_skills"]
                })
            for ms in analysis["missing_skills"]:
                global_missing_counts[ms] = global_missing_counts.get(ms, 0) + 1

        high_matches.sort(key=lambda x: x["score"], reverse=True)
        drive_summaries.append({
            "id": d.id,
            "company": d.company_name,
            "role": d.job_roles,
            "ctc": d.expected_ctc or "Market standard",
            "visit_date": d.visit_date or "TBA",
            "required_skills": req_skills,
            "ready_candidates": high_matches
        })

    top_batch_missing = sorted(global_missing_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # Format Markdown
    markdown = f"""### 📊 Batch Career & Placement Advisory Overview
**Total Enrolled Students:** {total_students} | **Resumes on File:** {students_with_resume} | **Missing Resumes:** {missing_resume_count}

---

#### 1. Upcoming Placement Drives & Candidate Readiness
"""
    for ds in drive_summaries:
        ready_names = ", ".join([f"{c['name']} ({c['score']}%)" for c in ds["ready_candidates"][:3]]) if ds["ready_candidates"] else "No direct matches >= 65% yet"
        req_tags = ", ".join(ds["required_skills"])
        markdown += f"- **{ds['company']} — {ds['role']}** (CTC: {ds['ctc']}, Visit: {ds['visit_date']})\n"
        markdown += f"  - Required Skills: `{req_tags}`\n"
        markdown += f"  - Top Ready Candidates: **{ready_names}**\n"

    markdown += "\n#### 2. Critical Skill Gaps Across Batch\n"
    if top_batch_missing:
        for sk, count in top_batch_missing:
            markdown += f"- **{sk}**: Missing in **{count}** candidate evaluations across current drives.\n"
    else:
        markdown += "- All candidates meet core requirements for currently scheduled drives.\n"

    markdown += "\n#### 3. Available Interview Prep Materials in Hub\n"
    if materials:
        for m in materials[:3]:
            markdown += f"- 📘 **{m.title}** ({m.company} — {m.category})\n"
    else:
        markdown += "- No specific materials uploaded yet in the Interview Hub.\n"

    markdown += f"""
#### 4. Actionable Next Steps for Placement Cell & Faculty
1. **Targeted Bridge Workshops:** Organize short bootcamp sessions covering **{', '.join([sk for sk, _ in top_batch_missing[:3]]) if top_batch_missing else 'DSA and System Design'}**.
2. **Resume Collection Drive:** Follow up with the **{missing_resume_count}** students who haven't uploaded resumes via `/submit-resume`.
3. **Drive-Specific Mock Interviews:** Schedule peer mock interviews based on the questions in `{materials[0].title if materials else 'Interview Prep Hub'}`.
"""

    return {
        "text": markdown,
        "tool_calls": [],
        "rich_data": {
            "type": "batch_career_advisory",
            "total_students": total_students,
            "students_with_resume": students_with_resume,
            "drives": drive_summaries,
            "top_missing_skills": top_batch_missing,
            "available_materials_count": len(materials)
        }
    }

def handle_placement_internships_chat(message: str, faculty_id: int, db: any, history: list = None) -> Dict[str, Any]:
    """
    Main entrypoint for Career Advisor AI in Placement & Internships.
    Eliminates generic/static responses and delivers rich, personalized guidance.
    """
    if not message or not str(message).strip():
        return {
            "text": "Hello! I am your **Career Advisor AI**. Ask me for personalized guidance for any student (e.g., *'Career guidance for A. Kumar'*), skill gap analysis, or drive preparation advice.",
            "tool_calls": [],
            "rich_data": None
        }

    msg_lower = message.lower().strip()

    # 1. Check if user is asking about a specific student
    student = find_student_in_db(db, message)
    if student:
        return generate_student_career_guidance(student, db, specific_query=message)

    # 2. Check for specific interview prep material queries
    if any(kw in msg_lower for kw in ["material", "materials", "question", "interview prep", "oa tips", "prep guide", "sample question"]):
        target_company = None
        for comp in ["google", "amazon", "meta", "stripe", "persistcorp", "microsoft"]:
            if comp in msg_lower:
                target_company = comp
                break
        
        mats = search_interview_materials(db, company=target_company, limit=5)
        if mats:
            comp_header = f" for **{target_company.title()}**" if target_company else ""
            md = f"### 📚 Curated Interview Prep Materials{comp_header}\n\nHere are the available materials from our database:\n\n"
            for m in mats:
                md += f"- 📘 **{m['title']}**\n"
                md += f"  - Company: **{m['company']}** | Role: **{m['role']}** | Category: `{m['category']}`\n"
                md += f"  - Contributor: _{m['contributor_name']}_\n"
                md += f"  - Summary: {m['content_snippet']}\n\n"
            md += "You can view full details in the **Interview Prep Hub** or ask me how to prepare for specific roles."
            return {
                "text": md,
                "tool_calls": [],
                "rich_data": {"type": "materials_search", "data": mats}
            }

    # 3. Check if user explicitly asked for career advice for a named person NOT in DB
    common_non_student_terms = {
        "the", "all", "our", "batch", "drive", "drives", "interview", "interviews",
        "google", "amazon", "meta", "microsoft", "stripe", "persistcorp", "testcorp",
        "sde", "frontend", "backend", "internship", "internships", "placement", "placements",
        "questions", "materials", "prep", "preparation", "help"
    }
    for prefix in ["guidance for ", "advice for ", "career roadmap for ", "profile of ", "student "]:
        if prefix in msg_lower:
            candidate_name = msg_lower.split(prefix)[-1].strip().split()[0].strip("?.,!\"'")
            if candidate_name and len(candidate_name) > 2 and candidate_name not in common_non_student_terms:
                all_students = db.query(Student).all()
                student_names = ", ".join([f"**{s.name}** ({s.roll_no})" for s in all_students[:6]])
                return {
                    "text": f"### 🔍 Student Search Result\nCould not locate student matching query **\"{candidate_name}\"** in the database.\n\n**Available Enrolled Students:**\n{student_names}\n\nPlease ask with one of the enrolled student names or roll numbers (e.g. *'Career advice for A. Kumar'*).",
                    "tool_calls": [],
                    "rich_data": {"type": "student_not_found", "query": candidate_name}
                }

    # 4. Default to comprehensive batch guidance / drive readiness overview
    return generate_batch_career_guidance(message, db)
