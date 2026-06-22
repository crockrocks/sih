import fitz
import re
import json
from langchain_core.prompts import PromptTemplate
from llm_factory import get_llm
from config import Config


def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ''
    for page in doc:
        text += page.get_text()
    return text


# ──────────────────────────────────────────────────────────────
# Phase 1: regex extraction — no LLM, instant
# ──────────────────────────────────────────────────────────────

def _extract_easy_fields(text):
    email    = re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', text, re.I)
    phone    = re.search(r'(\+?[\d][\d\s\-(). ]{7,14}[\d])', text)
    linkedin = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w-]+', text, re.I)
    github   = re.search(r'(?:https?://)?(?:www\.)?github\.com/[\w-]+', text, re.I)
    return {
        'Email':        email.group().strip()    if email    else '',
        'Phone':        phone.group().strip()    if phone    else '',
        'LinkedIn URL': linkedin.group().strip() if linkedin else '',
        'GitHub URL':   github.group().strip()   if github   else '',
    }


# ──────────────────────────────────────────────────────────────
# Phase 2: LLM for structured fields only (easy fields excluded)
# ──────────────────────────────────────────────────────────────

_PARSE_PROMPT = PromptTemplate(
    template="""You are a resume parser. Extract structured information from the resume below.

Return a JSON object with exactly these fields:
- Name: full name
- Position: job title if mentioned, else empty string
- Skills: array of technical and professional skills
- Experiences: array of objects with keys company, duration, responsibilities (array of strings)
- Education: array of objects with keys institution, degree, year
- Projects: array of objects with keys name, details (array of strings)
- Certifications: string, one per line

Return ONLY valid JSON. No explanation, no markdown.

Resume:
{resume_text}""",
    input_variables=['resume_text'],
)


def initialize_llm():
    return get_llm()


def parse_resume(text):
    # Phase 1: trivial fields via regex
    easy_fields = _extract_easy_fields(text)

    # Phase 2: LLM on truncated text for structured fields
    llm       = get_llm()
    truncated = text[:Config.MAX_RESUME_TEXT_CHARS]
    response  = (_PARSE_PROMPT | llm).invoke({'resume_text': truncated})
    raw       = response.content if hasattr(response, 'content') else ''

    if not raw:
        return {**easy_fields}

    clean = re.sub(r'```(?:json)?', '', raw).strip()
    try:
        j_start = clean.find('{')
        j_end   = clean.rfind('}') + 1
        if j_start == -1 or j_end == 0:
            raise ValueError('No JSON found')
        parsed = json.loads(clean[j_start:j_end])
    except (json.JSONDecodeError, ValueError) as e:
        print(f'JSON parsing failed: {e}')
        parsed = {}

    _normalise_parsed(parsed)

    # Regex results override LLM for trivial fields
    for field, value in easy_fields.items():
        if value:
            parsed[field] = value

    return parsed


def _normalise_parsed(data: dict) -> None:
    """Normalise nested object keys to lowercase in-place.

    The LLM sometimes returns PascalCase keys (Company, Duration, …) even
    though the prompt asks for lowercase. This guarantees a stable contract
    so the frontend never has to guess the casing.
    """
    key_map = {
        'Company': 'company', 'Duration': 'duration', 'Responsibilities': 'responsibilities',
        'Institution': 'institution', 'Degree': 'degree', 'Year': 'year',
        'Name': 'name', 'Details': 'details',
    }
    for section in ('Experiences', 'Education', 'Projects'):
        for item in data.get(section) or []:
            for old, new in key_map.items():
                if old in item:
                    item[new] = item.pop(old)
