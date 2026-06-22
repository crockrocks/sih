"""
RAGAS evaluation + MLflow logging.
Gracefully degrades if ragas has a version-compatibility import error.
"""
import os
import sys
from typing import List
from config import Config


# ── Compatibility shim: ragas 0.4.x tries to import a module that newer
# langchain-community no longer ships. Inject an empty stub before ragas loads.
import types
_stub = types.ModuleType('langchain_community.chat_models.vertexai')
sys.modules.setdefault('langchain_community.chat_models.vertexai', _stub)

_RAGAS_AVAILABLE = False
try:
    import mlflow
    from ragas import evaluate
    from ragas.metrics import Faithfulness, AnswerRelevancy
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from langchain_core.embeddings import Embeddings
    from datasets import Dataset
    from retrieval.embeddings import embed_text, embed_batch
    _RAGAS_AVAILABLE = True
except Exception as _e:
    print(f'[ragas] import failed — evaluation disabled: {_e}')


if _RAGAS_AVAILABLE:
    class _LocalEmbeddings(Embeddings):
        def embed_documents(self, texts: List[str]) -> List[List[float]]:
            return embed_batch(texts)

        def embed_query(self, text: str) -> List[float]:
            return embed_text(text)

    def _get_ragas_llm():
        from llm_factory import get_llm
        return LangchainLLMWrapper(get_llm())

    def _get_ragas_embeddings():
        return LangchainEmbeddingsWrapper(_LocalEmbeddings())


def compute_and_log_ragas(
    query: str,
    answer: str,
    contexts: List[str],
    run_name: str = 'screening_run',
) -> dict:
    if not _RAGAS_AVAILABLE:
        return {}

    mlflow.set_tracking_uri(Config.MLFLOW_TRACKING_URI)
    mlflow.set_experiment(Config.MLFLOW_EXPERIMENT_NAME)

    data = {
        'user_input': [query],
        'response': [answer],
        'retrieved_contexts': [contexts if contexts else ['No context retrieved']],
    }
    dataset = Dataset.from_dict(data)

    results = evaluate(
        dataset,
        metrics=[
            Faithfulness(llm=_get_ragas_llm()),
            AnswerRelevancy(llm=_get_ragas_llm(), embeddings=_get_ragas_embeddings()),
        ],
    )

    scores = {
        'faithfulness': float(results['faithfulness']),
        'answer_relevancy': float(results['answer_relevancy']),
    }

    with mlflow.start_run(run_name=run_name):
        mlflow.log_params({'query_length': len(query), 'num_contexts': len(contexts)})
        mlflow.log_metrics(scores)

    return scores
