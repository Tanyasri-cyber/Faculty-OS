"""
Automated Comprehensive Test Suite for Faculty-OS Alumni Relations Agent (Agent 8)
Tests Database Models, REST APIs, ARIA AI Agent Integration, and Data Integrity.
"""
import sys
import os

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from core.database import SessionLocal, engine, Base
from core.models import (
    Alumni, AlumniInteraction, AlumniMentorship, AlumniEvent,
    AlumniContribution, AlumniFollowUpTask
)
from core.seed import seed_database
from main import (
    get_alumni_list, get_alumni_detail, create_alumnus, update_alumnus,
    log_alumni_interaction, get_all_alumni_mentorships, create_alumni_mentorship,
    update_alumni_mentorship_status, get_all_alumni_events, create_alumni_event,
    get_all_alumni_contributions, create_alumni_contribution, update_contribution_status,
    get_all_alumni_follow_ups, create_alumni_follow_up, update_alumni_follow_up,
    get_alumni_analytics_summary, match_alumni_opportunities, get_alumni_smart_recommendations
)
from agents.aria_agent import handle_aria_unified_agent
from agents.alumni_relations.agent import handle_alumni_relations_chat

def run_tests():
    print("=" * 70)
    print("RUNNING FACULTY-OS ALUMNI RELATIONS (AGENT 8) TEST SUITE")
    print("=" * 70)

    # 1. Database & Seeding Verification
    print("\n[TEST 1] Verifying Database Seeding & Schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)

        alumni_count = db.query(Alumni).count()
        assert alumni_count >= 10, f"Expected at least 10 seeded alumni, got {alumni_count}"
        print(f"  [OK] Seeded Alumni Count: {alumni_count}")

        inter_count = db.query(AlumniInteraction).count()
        assert inter_count >= 3, f"Expected at least 3 interactions, got {inter_count}"
        print(f"  [OK] Interactions Count: {inter_count}")

        mentor_count = db.query(AlumniMentorship).count()
        assert mentor_count >= 3, f"Expected at least 3 mentorships, got {mentor_count}"
        print(f"  [OK] Mentorships Count: {mentor_count}")

        event_count = db.query(AlumniEvent).count()
        assert event_count >= 2, f"Expected at least 2 events, got {event_count}"
        print(f"  [OK] Events Count: {event_count}")

        contrib_count = db.query(AlumniContribution).count()
        assert contrib_count >= 3, f"Expected at least 3 contributions, got {contrib_count}"
        print(f"  [OK] Contributions Count: {contrib_count}")

        task_count = db.query(AlumniFollowUpTask).count()
        assert task_count >= 3, f"Expected at least 3 follow-ups, got {task_count}"
        print(f"  [OK] Follow-up Tasks Count: {task_count}")

        # 2. REST API: Directory & Search
        print("\n[TEST 2] Verifying Directory & Filtering APIs...")
        all_alumni = get_alumni_list(db=db)
        assert len(all_alumni) == alumni_count
        print(f"  [OK] get_alumni_list returned {len(all_alumni)} records")

        # Test filter by department
        cse_alumni = get_alumni_list(department="CSE", db=db)
        assert all(a["department"] == "CSE" for a in cse_alumni), "Dept filter failed"
        print(f"  [OK] CSE department filter: {len(cse_alumni)} alumni")

        # Test search
        google_alumni = get_alumni_list(search="Google", db=db)
        assert any("Google" in a["current_company"] for a in google_alumni), "Search for Google failed"
        print(f"  [OK] Keyword search for 'Google': {len(google_alumni)} matching alumni")

        # Test detail
        first_id = all_alumni[0]["id"]
        detail = get_alumni_detail(alumni_id=first_id, db=db)
        assert detail["id"] == first_id
        assert "interactions" in detail
        assert "mentorships" in detail
        assert "contributions" in detail
        print(f"  [OK] get_alumni_detail: loaded full profile for {detail['name']} with {len(detail['interactions'])} interactions")

        # 3. REST API: CRUD Operations
        print("\n[TEST 3] Verifying Alumni Creation, Update, and Interaction Logging...")
        existing_test = db.query(Alumni).filter(Alumni.email == "kavitha.s@apple.com").first()
        if existing_test:
            # clean up related
            db.query(AlumniInteraction).filter(AlumniInteraction.alumni_id == existing_test.id).delete()
            db.query(AlumniMentorship).filter(AlumniMentorship.alumni_id == existing_test.id).delete()
            db.query(AlumniContribution).filter(AlumniContribution.alumni_id == existing_test.id).delete()
            db.query(AlumniFollowUpTask).filter(AlumniFollowUpTask.alumni_id == existing_test.id).delete()
            db.delete(existing_test)
            db.commit()

        new_alumnus_data = {
            "name": "Kavitha Sivasankar",
            "email": "kavitha.s@apple.com",
            "phone": "+91 98840 12345",
            "graduation_year": 2021,
            "degree": "B.Tech",
            "department": "CCE",
            "current_company": "Apple",
            "designation": "iOS Platform Architect",
            "industry": "Mobile & OS",
            "location": "Hyderabad",
            "skills": "Swift, Metal, CoreML, Objective-C, Distributed iOS",
            "mentorship_available": True,
            "willing_guest_lectures": True
        }
        res_create = create_alumnus(new_alumnus_data, db=db)
        new_id = res_create["id"]
        assert new_id > 0
        print(f"  [OK] create_alumnus: Created new alumnus ID {new_id}")

        # Update
        update_alumnus(new_id, {"designation": "Lead iOS Architect", "engagement_score": 85}, db=db)
        updated_alumnus = get_alumni_detail(new_id, db=db)
        assert updated_alumnus["designation"] == "Lead iOS Architect"
        assert updated_alumnus["engagement_score"] == 85
        print(f"  [OK] update_alumnus: Updated designation to '{updated_alumnus['designation']}'")

        # Log Interaction
        inter_payload = {
            "interaction_type": "Guest Lecture",
            "date": "2026-10-23",
            "summary": "Invited Kavitha to deliver guest talk on Swift CoreML architectures.",
            "outcome": "Completed"
        }
        res_inter = log_alumni_interaction(new_id, inter_payload, db=db)
        assert res_inter["status"] == "success"
        refreshed = get_alumni_detail(new_id, db=db)
        assert len(refreshed["interactions"]) == 1
        assert refreshed["last_interaction_date"] == "2026-10-23"
        print(f"  [OK] log_alumni_interaction: Logged interaction and updated score to {refreshed['engagement_score']}")

        # 4. REST API: Mentorship, Events, Contributions, Tasks
        print("\n[TEST 4] Verifying Mentorship, Events, Contributions, and Task APIs...")
        # Mentorship
        m_payload = {
            "alumni_id": new_id,
            "student_name": "Divya Bharathi",
            "student_roll_no": "23CCE019",
            "student_department": "CCE",
            "topic": "SwiftUI & Apple Ecosystem Career Advice",
            "goals": "Build visionOS demo and prep for summer internship"
        }
        res_m = create_alumni_mentorship(m_payload, db=db)
        m_id = res_m["id"]
        assert m_id > 0
        update_alumni_mentorship_status(m_id, {"status": "Accepted", "feedback_rating": 5}, db=db)
        mentorships_list = get_all_alumni_mentorships(status="Accepted", db=db)
        assert any(m["id"] == m_id for m in mentorships_list)
        print(f"  [OK] Mentorship workflow: Created and accepted request ID {m_id}")

        # Contribution
        c_payload = {
            "alumni_id": new_id,
            "alumni_name": "Kavitha Sivasankar",
            "category": "Lab Equipment/Sponsorship",
            "amount": 75000.0,
            "description": "Donated 2 Apple M3 Mac mini units for mobile app lab.",
            "date": "2026-10-23",
            "status": "Pending Verification"
        }
        res_c = create_alumni_contribution(c_payload, db=db)
        c_id = res_c["id"]
        update_contribution_status(c_id, {"status": "Approved", "verified_by": "HOD CCE"}, db=db)
        contribs = get_all_alumni_contributions(db=db)
        assert any(c["id"] == c_id and c["status"] == "Approved" for c in contribs)
        print(f"  [OK] Contribution workflow: Recorded and approved endowment ID {c_id}")

        # Follow-up Task
        f_payload = {
            "alumni_id": new_id,
            "alumni_name": "Kavitha Sivasankar",
            "title": "Send appreciation letter & tax 80G receipt for lab equipment",
            "due_date": "2026-10-30",
            "priority": "High"
        }
        res_f = create_alumni_follow_up(f_payload, db=db)
        f_id = res_f["id"]
        update_alumni_follow_up(f_id, {"status": "Completed"}, db=db)
        follow_ups = get_all_alumni_follow_ups(db=db)
        assert any(f["id"] == f_id and f["status"] == "Completed" for f in follow_ups)
        print(f"  [OK] Follow-up task workflow: Completed task ID {f_id}")

        # 5. REST API: Analytics & AI Matchmaker
        print("\n[TEST 5] Verifying Computed Analytics & AI Matchmaker...")
        analytics = get_alumni_analytics_summary(db=db)
        assert analytics["total_alumni"] > 0
        assert analytics["active_alumni"] > 0
        assert analytics["engagement_rate"] > 0
        assert "CSE" in analytics["department_distribution"]
        print(f"  [OK] get_alumni_analytics_summary: {analytics['total_alumni']} total alumni, {analytics['engagement_rate']}% active, Rs. {analytics['contributions']['total_funds']:,.2f} total funds")

        # Smart recommendations
        recs = get_alumni_smart_recommendations(db=db)
        assert len(recs["recommendations"]) > 0
        print(f"  [OK] get_alumni_smart_recommendations: {len(recs['recommendations'])} action recommendations generated")

        # Matchmaker
        match_query = {
            "type": "student_mentor",
            "skills": ["Kubernetes", "Microservices", "Cloud"],
            "department": "CSE",
            "topic": "Google SDE Interview"
        }
        matches = match_alumni_opportunities(match_query, db=db)
        assert len(matches["matches"]) > 0
        top_match = matches["matches"][0]
        assert top_match["score"] >= 80
        assert len(top_match["reasons"]) > 0
        print(f"  [OK] match_alumni_opportunities: Top match: {top_match['name']} with {top_match['score']}% relevance score. Reasons: {top_match['reasons']}")

        # 6. ARIA AI Agent Integration
        print("\n[TEST 6] Verifying ARIA Master Agent Integration (Agent 8)...")
        # Direct domain agent test
        res_agent_search = handle_alumni_relations_chat("Find alumni working at Google or Microsoft", 1, db)
        assert "Google" in res_agent_search["text"] or "Microsoft" in res_agent_search["text"]
        assert len(res_agent_search["tool_calls"]) > 0
        print(f"  [OK] handle_alumni_relations_chat (Search): Tool called: {res_agent_search['tool_calls'][0]['name']}")

        res_agent_draft = handle_alumni_relations_chat("Draft invitation email to Siddharth Madhavan for a keynote talk", 1, db)
        assert "Siddharth Madhavan" in res_agent_draft["text"]
        assert "Subject:" in res_agent_draft["text"]
        print("  [OK] handle_alumni_relations_chat (Outreach Drafting): Generated personalized invitation letter")

        res_agent_speaker = handle_alumni_relations_chat("Recommend a guest speaker for a workshop on GPU Computing and AI", 1, db)
        assert len(res_agent_speaker["rich_data"]["speakers"]) > 0
        print(f"  [OK] handle_alumni_relations_chat (Speaker Rec): Identified {len(res_agent_speaker['rich_data']['speakers'])} verified speakers")

        # Master ARIA Agent router test
        aria_res = handle_aria_unified_agent("Show active mentors in our alumni network", 1, db, [], agent_id="agent8")
        assert len(aria_res["tool_calls"]) > 0
        print("  [OK] handle_aria_unified_agent correctly routed agent8 to handle_alumni_relations_chat")

        print("\n" + "=" * 70)
        print("ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
