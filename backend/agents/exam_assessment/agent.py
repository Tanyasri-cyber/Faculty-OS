import json
from sqlalchemy.orm import Session
from core.models import QuestionBankItem, QuestionPaper, Rubric, SyllabusUnit
from core.llm import llm_client

def handle_exam_assessment_chat(message: str, faculty_id: int, db: Session, history: list = None):
    msg_lower = message.lower()
    user_query = msg_lower.split("user:")[-1].strip() if "user:" in msg_lower else msg_lower
    tool_calls = []
    rich_data = None
    text_response = ""

    is_part_b = "part b" in user_query
    is_part_a = "part a" in user_query

    if any(k in user_query for k in ["question paper", "generate paper", "generate a paper", "part b", "part a", "questions", "generate"]):
        tool_calls.append({"name": "generate_question_paper", "status": "running"})
        try:
            q_part_a = [
                { "id": 101, "section": "Part A", "question_text": "Define Big-O notation and write the time complexity of binary search.", "marks": 2, "co": "CO1", "bloom_level": "Remember" },
                { "id": 102, "section": "Part A", "question_text": "Differentiate between Greedy method and Dynamic Programming strategy.", "marks": 2, "co": "CO2", "bloom_level": "Understand" },
                { "id": 103, "section": "Part A", "question_text": "State the Master Theorem condition for solving divide-and-conquer recurrences.", "marks": 2, "co": "CO1", "bloom_level": "Remember" },
                { "id": 104, "section": "Part A", "question_text": "Explain the concept of optimal substructure with a suitable example.", "marks": 2, "co": "CO3", "bloom_level": "Understand" },
                { "id": 105, "section": "Part A", "question_text": "What is an NP-Complete problem? Give two classic examples.", "marks": 2, "co": "CO3", "bloom_level": "Understand" }
            ]
            q_part_b = [
                { "id": 106, "section": "Part B", "question_text": "(a) Solve the recurrence relation T(n) = 2T(n/2) + n using Recursion Tree Method. (b) Explain QuickSort partitioning algorithm with an example array.", "marks": 10, "co": "CO1", "bloom_level": "Apply" },
                { "id": 107, "section": "Part B", "question_text": "Construct the Optimal Binary Search Tree (OBST) for the given set of keys and probabilities using Dynamic Programming.", "marks": 10, "co": "CO2", "bloom_level": "Analyze" },
                { "id": 108, "section": "Part B", "question_text": "Find the Shortest Path from source vertex 'A' to all other vertices in a directed weighted graph using Dijkstra's Algorithm.", "marks": 10, "co": "CO2", "bloom_level": "Apply" },
                { "id": 109, "section": "Part B", "question_text": "Explain 8-Queens problem using Backtracking strategy. Draw the state space tree for N=4.", "marks": 10, "co": "CO3", "bloom_level": "Create" }
            ]

            if is_part_b and not is_part_a:
                selected = q_part_b
                section_desc = "Part B (Descriptive) only"
            elif is_part_a and not is_part_b:
                selected = q_part_a
                section_desc = "Part A (Short Answer) only"
            else:
                selected = q_part_a + q_part_b
                section_desc = "Part A & Part B"

            co_distribution = {}
            bloom_distribution = {}
            for q in selected:
                co_distribution[q["co"]] = co_distribution.get(q["co"], 0) + q["marks"]
                bloom_distribution[q["bloom_level"]] = bloom_distribution.get(q["bloom_level"], 0) + q["marks"]

            total_marks_sum = sum(q["marks"] for q in selected)
            if total_marks_sum > 0:
                for k in co_distribution:
                    co_distribution[k] = int((co_distribution[k] / total_marks_sum) * 100)
                for k in bloom_distribution:
                    bloom_distribution[k] = int((bloom_distribution[k] / total_marks_sum) * 100)

            paper = QuestionPaper(
                subject="Design & Analysis of Algorithms",
                exam_type="CAT2",
                total_marks=total_marks_sum,
                duration=90 if total_marks_sum >= 40 else 45,
                co_coverage=json.dumps(co_distribution),
                bloom_distribution=json.dumps(bloom_distribution),
                status="draft",
                questions_json=json.dumps(selected)
            )
            db.add(paper)
            db.commit()
            db.refresh(paper)

            tool_calls[-1].update({"status": "success", "result": f"Generated {section_desc} paper (ID: {paper.id})."})
            text_response = (
                f"I have drafted a new **{section_desc} Question Paper** for **Design & Analysis of Algorithms**:\n"
                f"- Total Marks: **{total_marks_sum} Marks** | Duration: **{paper.duration} Mins**\n"
                f"- Status: **Draft** (ID: {paper.id})\n\n"
                f"**Bloom Taxonomy Coverage:**\n"
            )
            for level, pct in bloom_distribution.items():
                text_response += f"- {level}: **{pct}%**\n"
            text_response += "\nThe drafted paper has been loaded on the left panel."

            rich_data = {
                "type": "question_paper_draft",
                "paper_id": paper.id,
                "subject": paper.subject,
                "exam_type": paper.exam_type,
                "total_marks": paper.total_marks,
                "duration": paper.duration,
                "co_coverage": co_distribution,
                "bloom_distribution": bloom_distribution,
                "questions": selected
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to generate question paper draft: {str(e)}"
            
    elif "rubric" in msg_lower:
        tool_calls.append({"name": "generate_rubric", "status": "running"})
        try:
            # Create a simple rubric
            rubric_criteria = [
                {"criterion": "Correctness & Logic", "max_marks": 5, "descriptor": "Complete mathematical proof of algorithm correctness."},
                {"criterion": "Asymptotic Analysis", "max_marks": 3, "descriptor": "Correct identification of worst-case and best-case runtimes."},
                {"criterion": "Formatting & Code Style", "max_marks": 2, "descriptor": "Clear pseudocode with appropriate indentation and variable names."}
            ]
            
            tool_calls[-1].update({"status": "success", "result": "Generated rubric criteria."})
            text_response = "Here is the drafted grading rubric for your assignment / question:\n\n"
            for r in rubric_criteria:
                text_response += f"- **{r['criterion']}** (Max: **{r['max_marks']} Marks**): {r['descriptor']}\n"
            
            rich_data = {
                "type": "rubric_draft",
                "criteria": rubric_criteria
            }
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to generate rubric draft: {str(e)}"
            
    elif "moderate" in msg_lower or "approve" in msg_lower:
        tool_calls.append({"name": "moderate_paper", "status": "running"})
        try:
            paper = db.query(QuestionPaper).order_by(QuestionPaper.id.desc()).first()
            if paper:
                paper.status = "moderated"
                db.commit()
                tool_calls[-1].update({"status": "success", "result": f"Moderated paper {paper.id} successfully."})
                text_response = f"The status of Question Paper (ID: **{paper.id}**) has been updated to **Moderated**. It is ready for the department audit."
                rich_data = {
                    "type": "paper_moderation",
                    "paper_id": paper.id,
                    "status": "moderated"
                }
            else:
                tool_calls[-1].update({"status": "success", "result": "No draft paper found."})
                text_response = "I couldn't find any draft question papers in the system to moderate. Please generate a paper first!"
        except Exception as e:
            tool_calls[-1].update({"status": "error", "error": str(e)})
            text_response = f"Failed to moderate question paper: {str(e)}"
            
    else:
        system_prompt = (
            "You are EduPilot's Exam & Assessment Design Agent. You help the faculty member design question papers aligned to Bloom's taxonomy and CO/PO metrics. "
            "Respond in a detailed, structured, academic tone. Focus on compliance, question banking, and rubrics."
        )
        text_response = llm_client.get_chat_response(system_prompt, [{"role": "user", "content": message}])

    return {
        "text": text_response,
        "tool_calls": tool_calls,
        "rich_data": rich_data
    }
