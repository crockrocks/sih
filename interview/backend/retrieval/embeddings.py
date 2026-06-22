from fastembed import TextEmbedding
from rank_bm25 import BM25Okapi
from typing import List
import numpy as np
from config import Config

_dense_model: TextEmbedding | None = None


def get_dense_model() -> TextEmbedding:
    global _dense_model
    if _dense_model is None:
        _dense_model = TextEmbedding(Config.EMBEDDING_MODEL)
    return _dense_model


def embed_text(text: str) -> List[float]:
    model = get_dense_model()
    result = list(model.embed([text]))
    return result[0].tolist()


def embed_batch(texts: List[str]) -> List[List[float]]:
    model = get_dense_model()
    return [v.tolist() for v in model.embed(texts)]


def build_bm25(corpus: List[str]) -> BM25Okapi:
    tokenized = [doc.lower().split() for doc in corpus]
    return BM25Okapi(tokenized)


def bm25_scores(bm25: BM25Okapi, query: str) -> np.ndarray:
    return bm25.get_scores(query.lower().split())
