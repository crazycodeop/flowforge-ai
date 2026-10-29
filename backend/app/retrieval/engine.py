import math
import re
from collections import Counter
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.knowledge import KnowledgeCollection, KnowledgeDocument


def _tokenize(text: str) -> list[str]:
    """Extracts lowercase alphanumeric tokens from text."""
    return re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())


def calculate_relevance_score(query: str, text: str) -> float:
    """Calculates normalized lexical similarity score (0.0 to 1.0) using term overlap and token frequency."""
    q_tokens = _tokenize(query)
    d_tokens = _tokenize(text)

    if not q_tokens or not d_tokens:
        return 0.0

    q_counts = Counter(q_tokens)
    d_counts = Counter(d_tokens)

    # Exact phrase bonus
    phrase_bonus = 0.25 if query.lower().strip() in text.lower() else 0.0

    # Overlap and term frequency (cosine-like similarity between term frequency vectors)
    intersection = set(q_counts.keys()) & set(d_counts.keys())
    if not intersection:
        return phrase_bonus

    dot_product = sum(q_counts[t] * d_counts[t] for t in intersection)
    q_norm = math.sqrt(sum(c * c for c in q_counts.values()))
    d_norm = math.sqrt(sum(c * c for c in d_counts.values()))

    if q_norm == 0.0 or d_norm == 0.0:
        return phrase_bonus

    cosine = dot_product / (q_norm * d_norm)
    score = min(1.0, (cosine * 0.75) + phrase_bonus)
    return round(score, 4)


def search_knowledge_base(
    db: Session,
    collection_name: str,
    query: str,
    top_k: int = 3,
    score_threshold: float = 0.2,
) -> dict[str, Any]:
    """Retrieves relevant passages and source citations from a knowledge collection."""
    # Find collection
    collection = db.scalar(
        select(KnowledgeCollection).where(KnowledgeCollection.name == collection_name)
    )
    if not collection:
        return {
            "passages": [],
            "sources": [],
            "query": query,
            "collection_name": collection_name,
            "count": 0,
            "warning": f"Collection '{collection_name}' not found.",
        }

    # Fetch all documents in collection
    docs = db.scalars(
        select(KnowledgeDocument).where(KnowledgeDocument.collection_id == collection.id)
    ).all()

    candidates: list[dict[str, Any]] = []

    for doc in docs:
        # Split document into paragraphs/passages
        paragraphs = [p.strip() for p in doc.content.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [doc.content.strip()]

        for p_idx, passage in enumerate(paragraphs):
            score = calculate_relevance_score(query, f"{doc.title} {passage}")
            if score >= score_threshold:
                candidates.append(
                    {
                        "passage": passage,
                        "document_id": doc.id,
                        "title": doc.title,
                        "score": score,
                        "metadata": doc.doc_metadata,
                        "passage_index": p_idx,
                    }
                )

    # Sort candidates by score descending
    candidates.sort(key=lambda c: c["score"], reverse=True)
    selected = candidates[:top_k]

    passages = [c["passage"] for c in selected]
    sources = [
        {
            "document_id": c["document_id"],
            "title": c["title"],
            "score": c["score"],
            "metadata": c["metadata"],
        }
        for c in selected
    ]

    return {
        "passages": passages,
        "sources": sources,
        "query": query,
        "collection_name": collection_name,
        "count": len(passages),
    }
