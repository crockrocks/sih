import numpy as np
from langchain_core.prompts import PromptTemplate
from config import Config
from retrieval.embeddings import embed_text, embed_batch


# ──────────────────────────────────────────────────────────────
# Low-level math helpers
# ──────────────────────────────────────────────────────────────

def _cosine(a, b):
    a, b = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0


def _skill_overlap(candidate_skills, reference_text):
    if not candidate_skills:
        return 0.0
    ref_lower = reference_text.lower()
    hits = sum(1 for s in candidate_skills if s.lower() in ref_lower)
    return hits / len(candidate_skills)


def _candidate_summary(profile):
    """Compact ~300-char text used for embedding. No LLM."""
    skills = ', '.join((profile.get('skills') or [])[:15])
    position = profile.get('position', '')
    exps = profile.get('experiences') or []
    recent = exps[0].get('company', '') if exps else ''
    return f"{position} {skills} {recent}".strip()[:500]


# ──────────────────────────────────────────────────────────────
# Core scoring — pure embedding math, zero LLM
# ──────────────────────────────────────────────────────────────

def compute_scores(candidate_resume, job_description, expert_profile=None):
    """Returns all 4 scores using cosine similarity + skill overlap. No LLM."""
    cand_vec = embed_text(_candidate_summary(candidate_resume))
    job_vec  = embed_text(job_description[:Config.MAX_JOB_DESC_CHARS])

    relevancy     = _cosine(cand_vec, job_vec) * 100
    overlap       = _skill_overlap(candidate_resume.get('skills', []), job_description)
    profile_score = relevancy * 0.6 + overlap * 100 * 0.4

    if expert_profile:
        expert_vec = embed_text(_candidate_summary(expert_profile))
        matching   = _cosine(cand_vec, expert_vec) * 100
    else:
        matching = relevancy

    overall = relevancy * 0.35 + profile_score * 0.35 + matching * 0.30

    return {
        'Relevancy Score':           round(relevancy, 1),
        'Profile Score':             round(profile_score, 1),
        'Matching Similarity Score': round(matching, 1),
        'Overall Score':             round(overall, 1),
    }


def score_experts_batch(candidate_resume, job_description, experts):
    """
    Rank all experts in a single ONNX batch embed — no LLM calls at all.
    Returns list sorted by Overall Score descending.
    """
    if not experts:
        return []

    cand_summary     = _candidate_summary(candidate_resume)
    job_text         = job_description[:Config.MAX_JOB_DESC_CHARS]
    expert_summaries = [_candidate_summary(e) for e in experts]

    # One batch inference for everything
    all_vecs    = embed_batch([cand_summary, job_text] + expert_summaries)
    cand_vec    = all_vecs[0]
    job_vec     = all_vecs[1]
    expert_vecs = all_vecs[2:]

    relevancy     = _cosine(cand_vec, job_vec) * 100
    overlap       = _skill_overlap(candidate_resume.get('skills', []), job_description)
    profile_score = relevancy * 0.6 + overlap * 100 * 0.4

    results = []
    for expert, exp_vec in zip(experts, expert_vecs):
        matching = _cosine(cand_vec, exp_vec) * 100
        overall  = relevancy * 0.35 + profile_score * 0.35 + matching * 0.30
        results.append({
            'name':     expert.get('name', ''),
            'position': expert.get('position', ''),
            'score':    round(overall, 1),
        })

    return sorted(results, key=lambda x: x['score'], reverse=True)


# ──────────────────────────────────────────────────────────────
# Justification — the only LLM call in the scoring path
# ──────────────────────────────────────────────────────────────

_JUSTIFICATION_PROMPT = PromptTemplate(
    template=(
        "Candidate position: {position}\n"
        "Candidate skills: {skills}\n"
        "Role: {role}\n\n"
        "Score breakdown:\n"
        "  Relevancy Score (semantic match to job): {relevancy}/100\n"
        "  Profile Score (skills overlap + relevancy): {profile}/100\n"
        "  Matching Score (similarity to top expert): {matching}/100\n"
        "  Overall Score: {overall}/100\n\n"
        "In 3 sentences, explain WHY the candidate received this score. "
        "Reference specific skills, experience gaps, or strengths. Be concrete."
    ),
    input_variables=['position', 'skills', 'role', 'relevancy', 'profile', 'matching', 'overall'],
)


def _get_justification(candidate_resume, job_description, scores):
    from llm_factory import get_llm
    skills    = ', '.join((candidate_resume.get('skills') or [])[:10])
    position  = candidate_resume.get('position', 'Unknown')
    job_title = job_description.split('\n')[0][:80]
    try:
        resp = (_JUSTIFICATION_PROMPT | get_llm()).invoke({
            'position': position,
            'skills':   skills,
            'role':     job_title,
            'relevancy': scores['Relevancy Score'],
            'profile':   scores['Profile Score'],
            'matching':  scores['Matching Similarity Score'],
            'overall':   scores['Overall Score'],
        })
        return resp.content.strip()
    except Exception:
        return f"Candidate scores {scores['Overall Score']}/100 for this role."


# ──────────────────────────────────────────────────────────────
# Public interface — backward-compatible with nodes.py callers
# ──────────────────────────────────────────────────────────────

def summary_match(candidate_profile, job_description, expert_profile=None,
                  include_justification=True):
    """
    Returns a parseable score string.
    Scores come from embeddings (instant). Justification from one small LLM call
    only when include_justification=True.
    """
    scores        = compute_scores(candidate_profile, job_description, expert_profile)
    justification = (
        _get_justification(candidate_profile, job_description, scores)
        if include_justification else ''
    )
    lines = [
        f"Matching Similarity Score: {scores['Matching Similarity Score']}/100",
        f"Relevancy Score: {scores['Relevancy Score']}/100",
        f"Profile Score: {scores['Profile Score']}/100",
        f"Overall Score: {scores['Overall Score']}/100",
    ]
    if justification:
        lines.append(justification)
    return '\n'.join(lines)


def parse_scores(match_result):
    scores = {}
    for line in match_result.split('\n'):
        if ':' in line:
            key, _, value = line.partition(':')
            try:
                scores[key.strip()] = float(value.strip().split('/')[0])
            except ValueError:
                pass
    return scores


def format_profile(profile):
    """Compact profile for LLM prompts — stays under MAX_PROFILE_CHARS."""
    skills = ', '.join((profile.get('skills') or [])[:15])

    exps = (profile.get('experiences') or [])[:2]
    exp_lines = [
        f"{e.get('company', '')} ({e.get('duration', '')}): "
        + '; '.join(r[:100] for r in (e.get('responsibilities') or [])[:2])
        for e in exps
    ]

    projs = (profile.get('projects') or [])[:2]
    proj_lines = [
        f"{p.get('name', '')}: {((p.get('details') or [''])[0])[:100]}"
        for p in projs
    ]

    edu = (profile.get('educations') or [])[:2]
    edu_text = ', '.join(f"{e.get('degree', '')} ({e.get('year', '')})" for e in edu)

    text = (
        f"Position: {profile.get('position', '')}\n"
        f"Skills: {skills}\n"
        f"Experience:\n" + '\n'.join(exp_lines) + '\n'
        + f"Projects:\n" + '\n'.join(proj_lines) + '\n'
        + f"Education: {edu_text}"
    )
    return text.strip()[:Config.MAX_PROFILE_CHARS]
