"""
namelist_parser.py — Parse student namelists from PDF, Excel (.xlsx), and CSV files.

Returns:
  {
    "headers": [...],           # detected column names from the file
    "suggested_mapping": {...}, # maps standard field -> detected header
    "rows": [...],              # list of raw row dicts
    "is_scanned": bool,         # True if PDF had no extractable text
    "error": str | None         # top-level error message if parsing failed
  }
"""

import io
import re
import csv
import logging
from typing import Any

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────
VALID_STATUSES = {"Not Started", "Not Placed", "Placed", "Internship", "In Progress"}

# Comprehensive normalised aliases for the five standard columns
COLUMN_ALIASES: dict[str, list[str]] = {
    "roll_no": [
        "roll_no", "roll no", "roll no.", "roll_no.", "rollno", "roll number", "roll_number",
        "roll", "sl.no", "sl no", "sl. no", "sl.no.", "s.no", "s.no.", "s no", "sno",
        "sr.no", "sr.no.", "sr no", "srno", "serial no", "serial number", "id", "student id",
        "student_id", "studentid", "adm no", "admission no", "r.no", "r.no.", "rno",
        "regd no", "regd.no", "rollnum",
    ],
    "register_no": [
        "register_no", "register no", "register no.", "registerno", "register number",
        "reg no", "reg no.", "reg.no", "reg.no.", "reg_no", "regno", "registration number",
        "registration no", "registration no.", "univ reg no", "university no", "university reg no",
        "anna univ reg no", "au reg no", "univ no", "university reg.no", "regn no", "regn.no",
        "university registration number", "univ. reg. no",
    ],
    "name": [
        "name", "student name", "student_name", "studentname", "name of the student",
        "name of student", "student's name", "candidate name", "name of the candidate",
        "candidate_name", "full name", "full_name", "student", "candidate", "name of candidate",
        "stu name", "stuname", "student_full_name",
    ],
    "department": [
        "department", "dept", "dept.", "branch", "stream", "programme", "course", "major", "discipline",
    ],
    "batch": [
        "batch", "year", "academic year", "ay", "period", "class", "section", "class/section", "degree",
    ],
}


def _normalise(header: str) -> str:
    """Lowercase + strip punctuation/extra spaces for header matching."""
    s = str(header).lower().strip()
    return re.sub(r"\s+", " ", s)


def _suggest_mapping(headers: list[str], sample_rows: list[dict] | None = None) -> dict[str, str]:
    """Return { standard_field: detected_header } for best matches."""
    mapping: dict[str, str] = {}
    norm_headers = {_normalise(h): h for h in headers}

    for field, aliases in COLUMN_ALIASES.items():
        # Pass 1: exact match
        for alias in aliases:
            if alias in norm_headers:
                mapping[field] = norm_headers[alias]
                break
        # Pass 2: substring match
        if field not in mapping:
            for alias in aliases:
                for nh, orig in norm_headers.items():
                    if alias in nh or nh in alias:
                        mapping[field] = orig
                        break
                if field in mapping:
                    break

    # Pass 3: Heuristic value-based fallback if sample_rows are available
    if sample_rows and len(sample_rows) > 0:
        # Check for unmapped 'name'
        if "name" not in mapping:
            for h in headers:
                if h in mapping.values():
                    continue
                # See if values in this column look like human names
                sample_vals = [str(r.get(h, "")).strip() for r in sample_rows[:10] if str(r.get(h, "")).strip()]
                if sample_vals:
                    # Names have letters, length > 2, and are not numbers
                    is_name_col = all(
                        len(v) >= 2 and any(c.isalpha() for c in v) and not v.replace(".", "").isdigit()
                        for v in sample_vals
                    )
                    if is_name_col:
                        mapping["name"] = h
                        break

        # Check for unmapped 'roll_no' or 'register_no'
        if "roll_no" not in mapping and "register_no" not in mapping:
            for h in headers:
                if h in mapping.values():
                    continue
                sample_vals = [str(r.get(h, "")).strip() for r in sample_rows[:10] if str(r.get(h, "")).strip()]
                if sample_vals:
                    # IDs often contain alphanumeric tokens or digits
                    is_id_col = all(
                        len(v) >= 1 and (v.isalnum() or v.replace(".", "").isdigit())
                        for v in sample_vals
                    )
                    if is_id_col:
                        mapping["roll_no"] = h
                        break

    return mapping


# ─────────────────────────────────────────────
# CSV parser
# ─────────────────────────────────────────────
def _parse_csv(content: bytes) -> dict:
    try:
        text = content.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        headers = [h.strip() for h in (reader.fieldnames or []) if h and h.strip()]
        raw_rows = [dict(row) for row in reader]

        # Clean rows
        clean_rows = []
        for r in raw_rows:
            cr = {}
            for k, v in r.items():
                if k:
                    val = str(v).strip() if v is not None else ""
                    if val.endswith(".0") and val[:-2].isdigit():
                        val = val[:-2]
                    cr[k.strip()] = val
            if any(cr.values()):
                clean_rows.append(cr)

        return {
            "headers": headers,
            "suggested_mapping": _suggest_mapping(headers, clean_rows),
            "rows": clean_rows,
            "is_scanned": False,
            "error": None,
        }
    except Exception as exc:
        return {"headers": [], "suggested_mapping": {}, "rows": [], "is_scanned": False, "error": str(exc)}


# ─────────────────────────────────────────────
# Excel parser (Smart banner-skipping header detection)
# ─────────────────────────────────────────────
def _parse_excel(content: bytes) -> dict:
    try:
        import pandas as pd  # installed
        # Read raw without assuming row 0 is header
        df_raw = pd.read_excel(io.BytesIO(content), header=None, dtype=str)
        if df_raw.empty:
            return {"headers": [], "suggested_mapping": {}, "rows": [], "is_scanned": False, "error": "Excel file is empty"}

        best_row = 0
        max_score = -1
        keywords = {
            "name", "student", "roll", "reg", "s.no", "sno", "sl.no", "sr.no",
            "branch", "dept", "batch", "class", "status", "id", "section", "email"
        }

        # Check first 15 rows for header keywords
        max_scan = min(15, len(df_raw))
        for r in range(max_scan):
            row_vals = [
                re.sub(r"\s+", " ", str(c).lower().strip())
                for c in df_raw.iloc[r]
                if pd.notna(c) and str(c).strip() and str(c).strip().lower() != "nan"
            ]
            score = sum(1 for v in row_vals if any(kw in v for kw in keywords))
            if score > max_score and len(row_vals) >= 2:
                max_score = score
                best_row = r

        # Extract headers from best_row
        raw_headers = df_raw.iloc[best_row].tolist()
        headers = []
        for i, c in enumerate(raw_headers):
            val = str(c).strip() if pd.notna(c) and str(c).strip() and str(c).strip().lower() != "nan" else ""
            if not val or val.lower().startswith("unnamed:"):
                headers.append(f"Column_{i+1}")
            else:
                headers.append(val)

        # Slice data
        data_df = df_raw.iloc[best_row + 1:].copy()
        data_df.columns = headers
        data_df = data_df.dropna(how="all")

        raw_rows = data_df.fillna("").to_dict(orient="records")
        clean_rows = []
        for r in raw_rows:
            cr = {}
            for k, v in r.items():
                val = str(v).strip() if v is not None else ""
                if val.lower() == "nan":
                    val = ""
                elif val.endswith(".0") and val[:-2].isdigit():
                    val = val[:-2]
                cr[str(k).strip()] = val
            # Only include rows that have at least one non-empty value
            if any(cr.values()):
                clean_rows.append(cr)

        return {
            "headers": headers,
            "suggested_mapping": _suggest_mapping(headers, clean_rows),
            "rows": clean_rows,
            "is_scanned": False,
            "error": None,
        }
    except Exception as exc:
        logger.exception("Error parsing Excel file")
        return {"headers": [], "suggested_mapping": {}, "rows": [], "is_scanned": False, "error": str(exc)}


# ─────────────────────────────────────────────
# PDF parser — text-based (no OCR)
# ─────────────────────────────────────────────
def _parse_pdf(content: bytes) -> dict:
    extracted_text = ""

    # Try pypdf first, fall back to PyPDF2
    try:
        import pypdf  # type: ignore
        reader = pypdf.PdfReader(io.BytesIO(content))
        for page in reader.pages:
            extracted_text += (page.extract_text() or "") + "\n"
    except Exception:
        try:
            import PyPDF2  # type: ignore
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                extracted_text += (page.extract_text() or "") + "\n"
        except Exception as exc:
            return {
                "headers": [], "suggested_mapping": {}, "rows": [],
                "is_scanned": False,
                "error": f"Could not read PDF: {exc}",
            }

    # If no meaningful text was extracted → likely scanned
    if len(extracted_text.strip()) < 20:
        return {
            "headers": [], "suggested_mapping": {}, "rows": [],
            "is_scanned": True,
            "error": (
                "This PDF appears to be a scanned image with no extractable text. "
                "Please upload a text-readable PDF, or use an Excel / CSV file instead."
            ),
        }

    rows, headers = _extract_rows_from_pdf_text(extracted_text)
    return {
        "headers": headers,
        "suggested_mapping": _suggest_mapping(headers, rows),
        "rows": rows,
        "is_scanned": False,
        "error": None,
    }


def _extract_rows_from_pdf_text(text: str) -> tuple[list[dict], list[str]]:
    """
    Heuristic extraction from raw PDF text.
    Strategy:
      1. Detect header row by looking for keyword patterns.
      2. Parse subsequent lines as data rows aligned to those positions.
      3. Fallback: regex capture of roll numbers and adjacent names.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # ── Approach 1: try to find a table-like header line ──────────────
    header_keywords = {"roll", "register", "reg", "name", "dept", "department",
                       "batch", "student", "s.no", "sl"}
    header_line_idx = -1
    for i, line in enumerate(lines):
        lower = line.lower()
        hits = sum(1 for kw in header_keywords if kw in lower)
        if hits >= 2:
            header_line_idx = i
            break

    if header_line_idx >= 0:
        raw_headers = re.split(r"\s{2,}|\t", lines[header_line_idx])
        raw_headers = [h.strip() for h in raw_headers if h.strip()]
        rows = []
        for line in lines[header_line_idx + 1:]:
            cells = re.split(r"\s{2,}|\t", line)
            cells = [c.strip() for c in cells if c.strip()]
            if not cells:
                continue
            if len(cells) == 1 and re.match(r"^[\d]+$", cells[0]):
                continue
            row = {}
            for j, cell in enumerate(cells):
                header = raw_headers[j] if j < len(raw_headers) else f"col_{j}"
                row[header] = cell
            rows.append(row)
        if rows:
            return rows, raw_headers

    # ── Approach 2: regex-based roll number + name extraction ─────────
    pattern = re.compile(
        r"(?P<roll>\d{4}[A-Z]{2,5}\d{3,5}|[A-Z]{2,5}\d{2,5})\s+"
        r"(?P<name>[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,4})"
        r"(?:\s+(?P<dept>[A-Z]{2,5}))?"
        r"(?:\s+(?P<batch>\d{4}[- ]\d{2,4}))?",
        re.MULTILINE,
    )
    rows = []
    for m in pattern.finditer(text):
        rows.append({
            "roll_no": m.group("roll"),
            "name": m.group("name"),
            "department": m.group("dept") or "",
            "batch": m.group("batch") or "",
        })
    if rows:
        headers = ["roll_no", "name", "department", "batch"]
        return rows, headers

    fallback_rows = [{"raw_text": line} for line in lines[:100]]
    return fallback_rows, ["raw_text"]


# ─────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────
def parse_namelist(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """
    Parse a student namelist file (PDF / Excel / CSV).
    Returns a dict with keys:
      headers, suggested_mapping, rows, is_scanned, error
    """
    name_lower = filename.lower()

    if name_lower.endswith(".csv"):
        return _parse_csv(file_bytes)
    elif name_lower.endswith((".xlsx", ".xls")):
        return _parse_excel(file_bytes)
    elif name_lower.endswith(".pdf"):
        return _parse_pdf(file_bytes)
    else:
        return {
            "headers": [], "suggested_mapping": {}, "rows": [],
            "is_scanned": False,
            "error": f"Unsupported file type: {filename}. Please upload a PDF, Excel (.xlsx), or CSV file.",
        }
