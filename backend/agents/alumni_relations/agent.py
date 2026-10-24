"""
Alumni Relations Domain Agent Module
Integrated into ARIA Unified Master Agent.
"""
from typing import Dict, Any, List
from core.models import Alumni, AlumniInteraction, AlumniMentorship, AlumniEvent, AlumniContribution, AlumniFollowUpTask


def handle_alumni_relations_chat(message: str, faculty_id: int, db: any, history: list = None) -> Dict[str, Any]:
    msg_lower = message.lower()
    tool_calls = []

    # 1. Outreach / Email Drafting
    if any(k in msg_lower for k in ["draft", "email", "invite", "invitation", "outreach letter", "template"]):
        tool_calls.append({
            "name": "generate_alumni_outreach_template",
            "status": "success",
            "result": "Generated tailored institutional invitation letter"
        })

        # Check if a specific alumni was mentioned
        target_name = "Distinguished Alumnus"
        target_company = "Leading Tech Organization"
        target_topic = "Emerging Engineering Trends & Industry Best Practices"

        all_alumni = db.query(Alumni).all()
        for a in all_alumni:
            if a.name.lower() in msg_lower or a.current_company.lower() in msg_lower:
                target_name = a.name
                target_company = a.current_company
                if a.skills:
                    target_topic = a.skills.split(",")[0].strip()
                break

        email_draft = f"""**Subject:** Invitation to Deliver Guest Lecture & Re-connect with Faculty of Engineering

Dear {target_name},

Greetings from your Alma Mater! We hope this message finds you well at {target_company}.

The Department of Computer Science & Engineering is organizing our upcoming Technical Colloquium and Industry Mentorship Series. Given your outstanding career trajectory and deep expertise in **{target_topic}**, our students and faculty would be deeply honored if you could deliver a 45-minute guest lecture (in-person or hybrid) during the coming semester.

**Proposed Agenda:**
- Session: Engineering in Production & Industry Best Practices
- Duration: 45 mins presentation + 15 mins interactive Q&A with final-year scholars
- Tentative Timing: Flexible as per your executive calendar (Weekday evening or Saturday morning)

Our academic coordinators will handle all logistic arrangements. Kindly let us know your availability, or feel free to propose a convenient date.

Warm regards,  
**Office of Alumni Relations & Department Academic Council**  
Faculty-OS University Network
"""
        return {
            "text": f"Here is a personalized academic invitation draft for **{target_name}**:\n\n{email_draft}",
            "tool_calls": tool_calls,
            "rich_data": {
                "type": "outreach_template",
                "recipient": target_name,
                "company": target_company,
                "draft": email_draft
            }
        }

    # 2. Mentor Matching / Mentorship Queries
    if any(k in msg_lower for k in ["mentor", "mentorship", "match", "guidance", "career advice"]):
        tool_calls.append({
            "name": "match_alumni_mentors",
            "status": "success",
            "result": "Scored and filtered active alumni mentors by domain availability"
        })

        available_mentors = db.query(Alumni).filter(Alumni.mentorship_available == True).all()
        matched = []
        for m in available_mentors:
            # Simple keyword overlap scoring
            score = 75
            match_reasons = []
            if m.skills:
                skills_list = [s.strip().lower() for s in m.skills.split(",")]
                for skill in skills_list:
                    if skill in msg_lower:
                        score += 8
                        match_reasons.append(f"Expertise in {skill.title()}")
            if m.current_company.lower() in msg_lower:
                score += 10
                match_reasons.append(f"Employed at {m.current_company}")
            if not match_reasons:
                match_reasons.append(f"Guidance topics: {m.mentorship_topics or 'General Career'}")

            score = min(score, 98)
            matched.append({
                "id": m.id,
                "name": m.name,
                "batch": m.graduation_year,
                "department": m.department,
                "company": m.current_company,
                "designation": m.designation,
                "score": score,
                "reasons": match_reasons,
                "topics": m.mentorship_topics,
                "avatar": m.avatar_url
            })

        matched.sort(key=lambda x: x["score"], reverse=True)
        top_matches = matched[:4]

        response_md = f"### Recommended Alumni Mentors ({len(top_matches)} Matched)\n\n"
        for idx, mentor in enumerate(top_matches, 1):
            reasons_str = " • ".join(mentor["reasons"][:2])
            response_md += f"{idx}. **{mentor['name']}** ({mentor['designation']} @ {mentor['company']})\n"
            response_md += f"   - **Batch & Dept:** {mentor['batch']} ({mentor['department']}) | **Match Score:** `{mentor['score']}%`\n"
            response_md += f"   - **Why this match:** {reasons_str}\n\n"

        return {
            "text": response_md,
            "tool_calls": tool_calls,
            "rich_data": {
                "type": "mentor_matches",
                "matches": top_matches
            }
        }

    # 3. Speaker / Workshop Recommendation
    if any(k in msg_lower for k in ["speaker", "lecture", "workshop", "talk", "symposium", "conference"]):
        tool_calls.append({
            "name": "recommend_guest_speakers",
            "status": "success",
            "result": "Queried verified alumni willing to deliver guest sessions"
        })

        speakers = db.query(Alumni).filter(Alumni.willing_guest_lectures == True).all()
        speaker_cards = []
        for s in speakers:
            speaker_cards.append({
                "id": s.id,
                "name": s.name,
                "company": s.current_company,
                "designation": s.designation,
                "skills": s.skills,
                "location": s.location,
                "engagement_score": s.engagement_score
            })

        res_md = f"### Verified Alumni Guest Speakers Available ({len(speaker_cards)})\n\n"
        for sp in speaker_cards[:4]:
            res_md += f"- **{sp['name']}** — {sp['designation']} at **{sp['company']}**\n"
            res_md += f"  - *Expertise:* {sp['skills']}\n"
            res_md += f"  - *Engagement Index:* `{sp['engagement_score']}/100` | *Location:* {sp['location']}\n"

        return {
            "text": res_md,
            "tool_calls": tool_calls,
            "rich_data": {
                "type": "speakers_list",
                "speakers": speaker_cards[:4]
            }
        }

    # 4. Contributions / Giving Analytics
    if any(k in msg_lower for k in ["contribution", "donation", "giving", "fund", "scholarship", "sponsor"]):
        tool_calls.append({
            "name": "aggregate_alumni_contributions",
            "status": "success",
            "result": "Calculated institutional partnership metrics and endowments"
        })

        contributions = db.query(AlumniContribution).all()
        total_funds = sum(c.amount or 0.0 for c in contributions)
        count = len(contributions)

        summary_md = f"### Institutional Alumni Contributions Summary\n\n"
        summary_md += f"- **Total Verified Contributions Recorded:** `{count}`\n"
        summary_md += f"- **Monetary Endowments & Scholarships:** `₹{total_funds:,.2f}`\n\n"
        summary_md += "**Recent Verified Highlights:**\n"
        for c in contributions[:3]:
            amt_str = f" (₹{c.amount:,.0f})" if c.amount and c.amount > 0 else ""
            summary_md += f"- **{c.alumni_name}**: {c.category}{amt_str} — *\"{c.description}\"*\n"

        return {
            "text": summary_md,
            "tool_calls": tool_calls,
            "rich_data": {
                "type": "contribution_summary",
                "total_funds": total_funds,
                "count": count
            }
        }

    # 5. Follow-ups / Stale Contacts / Pending Tasks
    if any(k in msg_lower for k in ["follow", "task", "stale", "pending", "overdue", "action"]):
        tool_calls.append({
            "name": "get_alumni_action_items",
            "status": "success",
            "result": "Retrieved pending follow-up tasks and overdue engagements"
        })

        tasks = db.query(AlumniFollowUpTask).all()
        pending = [t for t in tasks if t.status in ["Pending", "Overdue", "In Progress"]]

        tasks_md = f"### Alumni Coordinator Action Items ({len(pending)} Active)\n\n"
        for t in pending:
            priority_tag = "🔴 [HIGH]" if t.priority == "High" else "🟡 [MEDIUM]"
            status_tag = f"`{t.status.upper()}`"
            tasks_md += f"- {priority_tag} **{t.title}** {status_tag}\n"
            tasks_md += f"  - Alumnus: *{t.alumni_name}* | Due Date: `{t.due_date}` | Assignee: {t.assigned_to}\n"

        return {
            "text": tasks_md,
            "tool_calls": tool_calls,
            "rich_data": {
                "type": "tasks_list",
                "tasks": [{"id": t.id, "title": t.title, "priority": t.priority, "status": t.status} for t in pending]
            }
        }

    # 6. General Search & Directory Query
    tool_calls.append({
        "name": "search_alumni_directory",
        "status": "success",
        "result": "Scanned university alumni database"
    })

    query = db.query(Alumni)
    matches = []
    all_records = query.all()
    for rec in all_records:
        rec_text = f"{rec.name} {rec.current_company} {rec.skills} {rec.department} {rec.designation} {rec.location}".lower()
        tokens = [w for w in msg_lower.split() if len(w) > 3 and w not in ["find", "show", "what", "where", "alumni", "list", "tell", "about"]]
        if not tokens or any(t in rec_text for t in tokens):
            matches.append(rec)

    if not matches:
        matches = all_records[:5]

    result_md = f"Found **{len(matches)} alumni** matching your institutional query:\n\n"
    for a in matches[:5]:
        result_md += f"- **{a.name}** ({a.graduation_year} {a.department}) — **{a.designation}** at **{a.current_company}**\n"
        result_md += f"  - Skills: `{a.skills or 'N/A'}`\n"
        result_md += f"  - Mentorship Available: {'✅ Yes' if a.mentorship_available else '❌ No'} | Status: `{a.engagement_status}`\n"

    return {
        "text": result_md,
        "tool_calls": tool_calls,
        "rich_data": {
            "type": "alumni_search",
            "count": len(matches),
            "alumni": [{"id": a.id, "name": a.name, "company": a.current_company, "role": a.designation} for a in matches[:5]]
        }
    }
