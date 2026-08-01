"""
ARIA Master AI Agent (Academic Resource & Insight Assistant)
Unified Single AI Agent combining all 10 operational modules of Faculty OS.
"""

from typing import List, Dict, Any
from sqlalchemy.orm import Session

from agents.faculty_assistant.agent import handle_faculty_assistant_chat
from agents.academic_workflow.agent import handle_academic_workflow_chat
from agents.analytics.agent import handle_analytics_chat
from agents.research_grants.agent import handle_research_grants_chat
from agents.exam_assessment.agent import handle_exam_assessment_chat
from agents.mentor_wellbeing.agent import handle_mentor_wellbeing_chat
from agents.placement_internships.agent import handle_placement_internships_chat
from agents.alumni_relations.agent import handle_alumni_relations_chat
from agents.event_management.agent import handle_event_management_chat
from agents.inventory_resources.agent import handle_inventory_resources_chat

def handle_aria_unified_agent(
    message: str, 
    faculty_id: int, 
    db: Session, 
    history: List[Dict[str, str]] = None,
    agent_id: str = "agent1"
) -> Dict[str, Any]:
    """
    Unified entry point for ARIA Master AI Agent.
    Routes queries explicitly by agent_id for module-specific assistants,
    and falls back to keyword routing for the universal assistant (agent1).
    """
    msg_lower = message.lower().strip()
    
    # Extract just the user query without the context for keyword matching
    # Context usually starts with [Context: ...]\n\nUser: ...
    user_query = msg_lower
    if "user:" in msg_lower:
        user_query = msg_lower.split("user:")[-1].strip()

    # Explicit routing based on agent_id
    if agent_id == "agent2":
        return handle_academic_workflow_chat(message, faculty_id, db, history)
    elif agent_id == "agent3":
        return handle_analytics_chat(message, faculty_id, db, history)
    elif agent_id == "agent4":
        return handle_research_grants_chat(message, faculty_id, db, history)
    elif agent_id == "agent5":
        return handle_exam_assessment_chat(message, faculty_id, db, history)
    elif agent_id == "agent6":
        return handle_mentor_wellbeing_chat(message, faculty_id, db, history)
    elif agent_id == "agent7":
        return handle_alumni_relations_chat(message, faculty_id, db, history)
    elif agent_id == "agent8":
        return handle_placement_internships_chat(message, faculty_id, db, history)
    elif agent_id == "agent9":
        return handle_event_management_chat(message, faculty_id, db, history)
    elif agent_id == "agent10":
        return handle_inventory_resources_chat(message, faculty_id, db, history)
        
    # Domain Intent Router for All 10 Phases (for agent1 / universal queries)
    if any(kw in user_query for kw in ["placement", "internship", "drive", "job", "company", "interview"]):
        res = handle_placement_internships_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["alumni", "directory", "donation", "reunion", "graduate"]):
        res = handle_alumni_relations_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["event", "committee", "fdp", "workshop", "conference", "budget"]):
        res = handle_event_management_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["inventory", "asset", "gpu", "license", "equipment", "requisition", "lab"]):
        res = handle_inventory_resources_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["attendance", "mark", "internal", "syllabus", "unit", "course", "lesson"]):
        res = handle_academic_workflow_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["nba", "naac", "accreditation", "analytics", "co-po", "attainment", "stat"]):
        res = handle_analytics_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["grant", "publication", "paper", "research", "ieee", "scopus", "funding"]):
        res = handle_research_grants_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["question paper", "rubric", "exam", "bloom", "assessment", "moderation"]):
        res = handle_exam_assessment_chat(message, faculty_id, db, history)
    elif any(kw in user_query for kw in ["mentee", "wellbeing", "health", "checkin", "mood", "escalation", "counsel"]):
        res = handle_mentor_wellbeing_chat(message, faculty_id, db, history)
    else:
        # Fallback to general faculty assistant / ARIA core
        res = handle_faculty_assistant_chat(message, faculty_id, db, history)

    return res

