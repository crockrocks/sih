from typing import TypedDict, List


class ScreeningState(TypedDict):
    query: str
    intent: str                    # "screen" | "generate_questions" | "compare"
    candidate_data: dict
    job_data: dict
    retrieved_context: List[str]
    retry_count: int               # max = Config.MAX_RETRIEVAL_RETRIES
    is_relevant: bool
    answer: dict
    ragas_scores: dict
