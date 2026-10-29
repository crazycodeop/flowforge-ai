from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.knowledge import KnowledgeCollection, KnowledgeDocument
from app.retrieval.engine import search_knowledge_base
from app.workflows.flagship import seed_flagship_knowledge_base

router = APIRouter(prefix="/knowledge", tags=["Knowledge & Retrieval"])


class CollectionCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = None


class DocumentCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    document_count: int = 0


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    collection_id: str
    title: str
    content: str
    metadata: dict[str, Any] = Field(alias="doc_metadata", default_factory=dict)


class SearchRequest(BaseModel):
    collection_name: str
    query: str
    top_k: int = 3
    score_threshold: float = 0.2


@router.get("/collections", response_model=list[CollectionResponse])
def list_collections(db: Session = Depends(get_db)):
    """Lists all knowledge collections with their document counts."""
    stmt = (
        select(
            KnowledgeCollection.id,
            KnowledgeCollection.name,
            KnowledgeCollection.description,
            func.count(KnowledgeDocument.id).label("document_count"),
        )
        .outerjoin(KnowledgeDocument, KnowledgeDocument.collection_id == KnowledgeCollection.id)
        .group_by(KnowledgeCollection.id)
        .order_by(KnowledgeCollection.name)
    )
    rows = db.execute(stmt).all()
    return [
        CollectionResponse(
            id=r.id,
            name=r.name,
            description=r.description,
            document_count=r.document_count,
        )
        for r in rows
    ]


@router.post("/collections", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(payload: CollectionCreateRequest, db: Session = Depends(get_db)):
    """Creates a new knowledge collection."""
    existing = db.scalar(
        select(KnowledgeCollection).where(KnowledgeCollection.name == payload.name)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Collection '{payload.name}' already exists.",
        )

    coll = KnowledgeCollection(name=payload.name, description=payload.description)
    db.add(coll)
    db.commit()
    db.refresh(coll)
    return CollectionResponse(
        id=coll.id, name=coll.name, description=coll.description, document_count=0
    )


@router.get("/collections/{collection_id}/documents", response_model=list[DocumentResponse])
def list_documents(
    collection_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Lists documents within a specific knowledge collection."""
    coll = db.get(KnowledgeCollection, collection_id)
    if not coll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collection '{collection_id}' not found.",
        )

    stmt = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.collection_id == collection_id)
        .order_by(KnowledgeDocument.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    docs = db.scalars(stmt).all()
    return [
        DocumentResponse(
            id=d.id,
            collection_id=d.collection_id,
            title=d.title,
            content=d.content,
            doc_metadata=d.doc_metadata,
        )
        for d in docs
    ]


@router.post(
    "/collections/{collection_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_document(
    collection_id: str,
    payload: DocumentCreateRequest,
    db: Session = Depends(get_db),
):
    """Adds a reference document to a knowledge collection."""
    coll = db.get(KnowledgeCollection, collection_id)
    if not coll:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Collection '{collection_id}' not found.",
        )

    doc = KnowledgeDocument(
        collection_id=collection_id,
        title=payload.title,
        content=payload.content,
        doc_metadata=payload.metadata,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DocumentResponse(
        id=doc.id,
        collection_id=doc.collection_id,
        title=doc.title,
        content=doc.content,
        doc_metadata=doc.doc_metadata,
    )


@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_knowledge(db: Session = Depends(get_db)):
    """Seeds official FlowForge support policies and SLA guidelines."""
    coll = seed_flagship_knowledge_base(db)
    return {
        "message": f"Successfully seeded knowledge collection '{coll.name}'",
        "collection_id": coll.id,
    }


@router.post("/search")
def search_knowledge(payload: SearchRequest, db: Session = Depends(get_db)):
    """Runs a test retrieval search against a knowledge collection."""
    return search_knowledge_base(
        db=db,
        collection_name=payload.collection_name,
        query=payload.query,
        top_k=payload.top_k,
        score_threshold=payload.score_threshold,
    )
