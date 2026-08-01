"""
Placement & Internships Domain Agent Module
Integrated into ARIA Unified Master Agent.
"""

def handle_placement_internships_chat(message: str, faculty_id: int, db: any, history: list = None):
    msg_lower = message.lower()
    
    if "skill" in msg_lower or "resume" in msg_lower or "find student" in msg_lower:
        try:
            from rag.rag_pipeline import rag_pipeline
            if rag_pipeline.initialized:
                resume_collection = rag_pipeline.client.get_or_create_collection(
                    name="student_resumes",
                    embedding_function=rag_pipeline.emb_fn
                )
                results = resume_collection.query(
                    query_texts=[message],
                    n_results=3
                )
                if results and 'documents' in results and results['documents']:
                    matches = []
                    # Deduplicate students if multiple chunks match
                    seen_students = set()
                    
                    if results['metadatas'] and results['metadatas'][0]:
                        for meta in results['metadatas'][0]:
                            if meta['student_id'] not in seen_students:
                                seen_students.add(meta['student_id'])
                                matches.append({
                                    "name": meta['student_name'],
                                    "roll_no": meta['roll_no'],
                                    "skills": meta['skills'],
                                    "resume_link": f"/api/resume/{meta['student_id']}" # We will create this endpoint or handle downloading in frontend
                                })
                    
                    if matches:
                        markdown_text = "Here are the top students matching those skills:\n\n"
                        for m in matches:
                            markdown_text += f"- **{m['name']}** ({m['roll_no']}) - Skills: {m['skills']} \n"
                        
                        return {
                            "text": markdown_text,
                            "tool_calls": [],
                            "rich_data": {"type": "resume_match", "data": matches}
                        }
        except Exception as e:
            print(f"Error querying ChromaDB for resumes: {e}")
            pass

    return {
        "text": "ARIA Master Agent — Placement & Internships: Checked placement drive eligibility and internship records.",
        "tool_calls": [],
        "rich_data": None
    }
