import json
from langchain_core.prompts import PromptTemplate
from config import Config
from retrieval.qdrant_client import hybrid_search
from score import summary_match, parse_scores, format_profile
from llm_factory import get_llm


def _get_llm():
    return get_llm()


# ──────────────────────────────────────────────────────────────
# NODE 1: Intent Router
# ──────────────────────────────────────────────────────────────

_INTENT_PROMPT = PromptTemplate(
    template="""You are an intent classifier for a recruitment assistant.

Classify the following recruiter query into exactly one of these intents:
- "screen"              → score/evaluate a candidate against a job
- "generate_questions"  → produce interview questions for a candidate/role
- "compare"             → compare multiple candidates against each other

Query: {query}

Respond with ONLY one word: screen, generate_questions, or compare.""",
    input_variables=['query'],
)


def intent_router_node(state: dict) -> dict:
    llm = _get_llm()
    response = (_INTENT_PROMPT | llm).invoke({'query': state['query']})
    raw = response.content.strip().lower()
    intent = raw if raw in {'screen', 'generate_questions', 'compare'} else 'screen'
    return {'intent': intent}


# ──────────────────────────────────────────────────────────────
# NODE 2: Resume Screener (wraps existing score.py)
# ──────────────────────────────────────────────────────────────

def resume_screener_node(state: dict) -> dict:
    job_description = state['job_data'].get('fullDescription', '')[:Config.MAX_JOB_DESC_CHARS]
    raw_result = summary_match(state['candidate_data'], job_description, None)
    scores = parse_scores(raw_result)
    explanation_lines = [
        line for line in raw_result.split('\n')
        if line.strip() and '/' not in line and 'Score' not in line
    ]
    return {
        'answer': {
            'scores': scores,
            'explanation': ' '.join(explanation_lines).strip(),
            'raw_llm_output': raw_result,
            'intent': 'screen',
        }
    }


# ──────────────────────────────────────────────────────────────
# NODE 3: Qdrant Retriever
# ──────────────────────────────────────────────────────────────

def qdrant_retriever_node(state: dict) -> dict:
    candidate_data = state['candidate_data']
    job_data = state['job_data']
    query = (
        f"{candidate_data.get('position', '')} "
        f"{' '.join(candidate_data.get('skills', [])[:10])} "
        f"{job_data.get('title', '')} "
        f"{job_data.get('fullDescription', '')[:300]}"
    ).strip()

    resume_results = hybrid_search(query=query, collection=Config.QDRANT_RESUMES_COLLECTION, top_k=3)
    job_results    = hybrid_search(query=query, collection=Config.QDRANT_JOBS_COLLECTION,   top_k=2)

    context = [
        r.get('text', '')[:Config.MAX_CONTEXT_CHARS_PER_DOC]
        for r in resume_results + job_results
    ]
    return {'retrieved_context': context}


# ──────────────────────────────────────────────────────────────
# NODE 4: Relevance Grader
# ──────────────────────────────────────────────────────────────

_RELEVANCE_PROMPT = PromptTemplate(
    template="""You are a relevance judge for a recruitment RAG system.

Query: {query}

Retrieved context:
{context}

Is the retrieved context SUFFICIENT to answer the query with confidence?
Consider: does the context contain relevant skills, experience, or job requirements
that meaningfully overlap with the query?

Answer with ONLY: YES or NO""",
    input_variables=['query', 'context'],
)


def relevance_grader_node(state: dict) -> dict:
    context_text = '\n---\n'.join(state.get('retrieved_context', []))
    if not context_text.strip():
        return {'is_relevant': False}
    llm = _get_llm()
    response = (_RELEVANCE_PROMPT | llm).invoke({
        'query': state['query'],
        'context': context_text,
    })
    return {'is_relevant': response.content.strip().upper() == 'YES'}


# ──────────────────────────────────────────────────────────────
# NODE 5: Query Rewriter
# ──────────────────────────────────────────────────────────────

_REWRITE_PROMPT = PromptTemplate(
    template="""You are a search query optimizer for a recruitment system.

The following query failed to retrieve relevant results. Rewrite it to be
more specific, using different terminology or expanding abbreviations.

Original query: {query}
Retry number: {retry_count}

Return ONLY the improved query string, nothing else.""",
    input_variables=['query', 'retry_count'],
)


def query_rewriter_node(state: dict) -> dict:
    llm = _get_llm()
    response = (_REWRITE_PROMPT | llm).invoke({
        'query': state['query'],
        'retry_count': str(state.get('retry_count', 0)),
    })
    return {
        'query': response.content.strip(),
        'retry_count': state.get('retry_count', 0) + 1,
    }


# ──────────────────────────────────────────────────────────────
# NODE 6: Answer Generator
# Dispatches to specialist helpers based on intent.
# ──────────────────────────────────────────────────────────────

_QUESTION_PROMPT = PromptTemplate(
    template="""You are an expert technical interviewer.

Generate 8 targeted interview questions for this candidate applying for this role.
Mix behavioral (2), technical depth (4), and situational (2) questions.

Candidate Profile:
{candidate_profile}

Job Description:
{job_description}

Retrieved Context (similar candidates/roles):
{context}

Return a JSON array of objects, each with:
  "type": "behavioral"|"technical"|"situational"
  "question": string
  "rationale": string

Return ONLY valid JSON.""",
    input_variables=['candidate_profile', 'job_description', 'context'],
)

_COMPARE_PROMPT = PromptTemplate(
    template="""You are a senior recruiter comparing candidates.

Primary candidate under review:
{candidate_profile}

Job Description:
{job_description}

Similar candidates retrieved from the talent pool:
{context}

Return JSON:
{{
  "ranking": "strong|average|weak",
  "differentiators": ["...", "..."],
  "recommendation": "proceed|hold|reject",
  "justification": "..."
}}

Return ONLY valid JSON.""",
    input_variables=['candidate_profile', 'job_description', 'context'],
)


def _parse_json_response(content: str) -> dict | list:
    raw = content.strip()
    if raw.startswith('```'):
        parts = raw.split('```')
        raw = parts[1]
        if raw.startswith('json'):
            raw = raw[4:]
    return json.loads(raw.strip())


def answer_generator_node(state: dict) -> dict:
    intent = state.get('intent', 'screen')
    context = state.get('retrieved_context', [])
    context_text           = '\n---\n'.join(context)
    candidate_profile_text = format_profile(state['candidate_data'])
    job_description        = state['job_data'].get('fullDescription', '')[:Config.MAX_JOB_DESC_CHARS]

    if intent == 'screen':
        answer = state.get('answer', {})
        answer['context_used'] = context[:3]
        answer['retrieval_retries'] = state.get('retry_count', 0)
        return {'answer': answer}

    llm = _get_llm()

    if intent == 'generate_questions':
        response = (_QUESTION_PROMPT | llm).invoke({
            'candidate_profile': candidate_profile_text,
            'job_description': job_description,
            'context': context_text,
        })
        try:
            questions = _parse_json_response(response.content)
        except (json.JSONDecodeError, IndexError):
            questions = [{'type': 'technical', 'question': response.content.strip(), 'rationale': ''}]
        return {'answer': {'questions': questions, 'intent': 'generate_questions', 'context_used': context[:3]}}

    if intent == 'compare':
        response = (_COMPARE_PROMPT | llm).invoke({
            'candidate_profile': candidate_profile_text,
            'job_description': job_description,
            'context': context_text,
        })
        try:
            comparison = _parse_json_response(response.content)
        except json.JSONDecodeError:
            comparison = {'raw': response.content.strip()}
        return {'answer': {'comparison': comparison, 'intent': 'compare', 'context_used': context[:3]}}

    return {'answer': state.get('answer', {})}
