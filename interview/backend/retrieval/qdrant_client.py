from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from typing import List, Dict, Any, Optional
import uuid
import numpy as np
from config import Config
from retrieval.embeddings import embed_text, build_bm25, bm25_scores

_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(host=Config.QDRANT_HOST, port=Config.QDRANT_PORT)
    return _client


def ensure_collections() -> None:
    client = get_qdrant_client()
    existing = {c.name for c in client.get_collections().collections}
    for name in [Config.QDRANT_RESUMES_COLLECTION, Config.QDRANT_JOBS_COLLECTION]:
        if name not in existing:
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(
                    size=Config.DENSE_VECTOR_SIZE,
                    distance=Distance.COSINE,
                ),
            )


def _resume_to_text(resume_doc: dict) -> str:
    skills = ', '.join(resume_doc.get('skills', []))
    experiences = ' '.join(
        f"{e.get('company', '')} {e.get('duration', '')} {' '.join(e.get('responsibilities', []))}"
        for e in resume_doc.get('experiences', [])
    )
    education = ' '.join(
        f"{e.get('degree', '')} {e.get('institution', '')} {e.get('year', '')}"
        for e in resume_doc.get('educations', [])
    )
    projects = ' '.join(
        f"{p.get('name', '')} {' '.join(p.get('details', []))}"
        for p in resume_doc.get('projects', [])
    )
    certs = ', '.join(resume_doc.get('certifications', []))
    return (
        f"Name: {resume_doc.get('name', '')} "
        f"Position: {resume_doc.get('position', '')} "
        f"Skills: {skills} "
        f"Experience: {experiences} "
        f"Education: {education} "
        f"Projects: {projects} "
        f"Certifications: {certs}"
    )


def _job_to_text(job_doc: dict) -> str:
    return (
        f"Title: {job_doc.get('title', '')} "
        f"Description: {job_doc.get('fullDescription', '')} "
        f"Level: {job_doc.get('level', '')} "
        f"Pay: {job_doc.get('pay', '')}"
    )


def upsert_resume(resume_doc: dict, mongo_id: str) -> None:
    client = get_qdrant_client()
    text = _resume_to_text(resume_doc)
    vector = embed_text(text)
    point = PointStruct(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, mongo_id)),
        vector=vector,
        payload={
            'mongo_id': mongo_id,
            'email': resume_doc.get('email', ''),
            'name': resume_doc.get('name', ''),
            'position': resume_doc.get('position', ''),
            'text': text,
        },
    )
    client.upsert(collection_name=Config.QDRANT_RESUMES_COLLECTION, points=[point])


def upsert_job(job_doc: dict, mongo_id: str) -> None:
    client = get_qdrant_client()
    text = _job_to_text(job_doc)
    vector = embed_text(text)
    point = PointStruct(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, mongo_id)),
        vector=vector,
        payload={
            'mongo_id': mongo_id,
            'title': job_doc.get('title', ''),
            'text': text,
        },
    )
    client.upsert(collection_name=Config.QDRANT_JOBS_COLLECTION, points=[point])


def hybrid_search(
    query: str,
    collection: str,
    top_k: int = 5,
    dense_prefetch: int = 20,
    filter_payload: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    client = get_qdrant_client()
    query_vector = embed_text(query)

    qdrant_filter = None
    if filter_payload:
        qdrant_filter = Filter(
            must=[
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filter_payload.items()
            ]
        )

    response = client.query_points(
        collection_name=collection,
        query=query_vector,
        limit=dense_prefetch,
        query_filter=qdrant_filter,
        with_payload=True,
    )
    hits = response.points

    if not hits:
        return []

    corpus = [h.payload.get('text', '') for h in hits]
    bm25 = build_bm25(corpus)
    sparse = bm25_scores(bm25, query)

    dense = np.array([h.score for h in hits])
    dense_norm = (dense - dense.min()) / (dense.max() - dense.min() + 1e-9)
    sparse_norm = (sparse - sparse.min()) / (sparse.max() - sparse.min() + 1e-9)
    fused = 0.5 * dense_norm + 0.5 * sparse_norm

    ranked = np.argsort(fused)[::-1][:top_k]
    return [hits[i].payload for i in ranked]
