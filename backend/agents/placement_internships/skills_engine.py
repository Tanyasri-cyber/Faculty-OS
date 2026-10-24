"""
Skills Normalization and Requirement Matching Engine.
Provides canonical skill aliasing, requirement extraction from job/role text,
and deterministic matching between student resume skills and target opportunities.
"""
from typing import Optional

SKILL_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "node": "node.js",
    "py": "python",
    "cpp": "c++",
    "c plus plus": "c++",
    "golang": "go",
    "postgres": "postgresql",
    "k8s": "kubernetes",
    "ml": "machine learning",
    "dl": "deep learning",
    "dsa": "data structures",
    "aws": "aws",
    "amazon web services": "aws",
    "gcp": "gcp",
    "google cloud": "gcp",
}

ROLE_SKILL_MAP = {
    "frontend": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Redux"],
    "backend": ["Python", "Node.js", "Java", "SQL", "Docker", "REST API"],
    "full stack": ["React", "Node.js", "JavaScript", "Python", "SQL", "Git"],
    "data science": ["Python", "Machine Learning", "SQL", "Pandas", "Deep Learning"],
    "data engineer": ["SQL", "Python", "ETL", "Docker", "AWS", "Data Structures"],
    "machine learning": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "SQL"],
    "cloud": ["AWS", "Docker", "Kubernetes", "Linux", "CI/CD"],
    "devops": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Python"],
    "qa": ["Selenium", "Python", "Java", "Automated Testing", "SQL"],
    "test": ["Selenium", "Python", "Java", "Automated Testing", "SQL"],
    "mobile": ["React Native", "Flutter", "JavaScript", "Java", "Kotlin"],
    "software": ["Java", "Python", "C++", "Data Structures", "Algorithms", "SQL", "Git"],
    "sde": ["Java", "Python", "C++", "Data Structures", "Algorithms", "SQL", "Git"],
}

KNOWN_SKILLS = [
    "Python", "Java", "C++", "C", "JavaScript", "TypeScript", "React", "Node.js",
    "HTML", "CSS", "SQL", "PostgreSQL", "MongoDB", "AWS", "Docker", "Kubernetes",
    "Machine Learning", "Deep Learning", "TensorFlow", "Pandas", "Linux", "Git",
    "Data Structures", "Algorithms", "REST API", "FastAPI", "Redux", "Next.js",
    "Selenium", "Automated Testing", "Jira", "CI/CD", "React Native", "Flutter",
    "Spring Boot", "Microservices", "ETL", "Figma", "UI/UX"
]

def normalize_skill(skill: str) -> str:
    """Normalize a skill token using canonical lowercase and alias mappings."""
    if not skill:
        return ""
    s = skill.strip().lower()
    return SKILL_ALIASES.get(s, s)

def extract_required_skills(role_or_desc: str, custom_skills: Optional[list[str]] = None) -> list[str]:
    """Extract or map requirements from role text or custom skills list."""
    if custom_skills:
        return [s.strip() for s in custom_skills if s and s.strip()]

    if not role_or_desc or not str(role_or_desc).strip():
        return []

    text_lower = str(role_or_desc).lower()
    required = []

    # 1. Check if any known skill is explicitly mentioned in the string
    for skill in KNOWN_SKILLS:
        if normalize_skill(skill) in text_lower or skill.lower() in text_lower:
            if skill not in required:
                required.append(skill)

    # 2. Check role patterns
    for role_key, skills in ROLE_SKILL_MAP.items():
        if role_key in text_lower:
            for s in skills:
                if s not in required:
                    required.append(s)

    # 3. Default fallback if nothing matched but a non-empty role was given
    if not required and text_lower.strip():
        required = ["Data Structures", "Algorithms", "Python", "Java", "SQL"]

    return required

def match_skills(resume_skills_raw: Optional[str], required_skills: list[str]) -> dict:
    """
    Perform deterministic matching between resume skills and required skills.
    Returns match_score (0-100), matched_skills, missing_skills, and status.
    """
    if not required_skills:
        return {
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "total_required": 0,
            "total_matched": 0,
            "status": "no_requirements"
        }

    if not resume_skills_raw or not str(resume_skills_raw).strip():
        return {
            "match_score": 0,
            "matched_skills": [],
            "missing_skills": required_skills,
            "total_required": len(required_skills),
            "total_matched": 0,
            "status": "missing_resume_skills"
        }

    raw_parts = [p.strip() for p in resume_skills_raw.replace("\n", ",").replace(";", ",").split(",") if p.strip()]
    normalized_resume_map = {normalize_skill(p): p for p in raw_parts}

    matched = []
    missing = []

    for req in required_skills:
        norm_req = normalize_skill(req)
        found = False
        if norm_req in normalized_resume_map:
            matched.append(req)
            found = True
        else:
            for n_res in normalized_resume_map.keys():
                if norm_req in n_res or n_res in norm_req:
                    matched.append(req)
                    found = True
                    break
        if not found:
            missing.append(req)

    score = round((len(matched) / len(required_skills)) * 100) if required_skills else 0
    return {
        "match_score": score,
        "matched_skills": matched,
        "missing_skills": missing,
        "total_required": len(required_skills),
        "total_matched": len(matched),
        "status": "calculated"
    }
