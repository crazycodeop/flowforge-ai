import base64
import io
import logging
from pathlib import Path
from typing import Any

import pypdf
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.factory import get_ai_provider
from app.core.config import get_settings
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


class DocumentExtractResponse(BaseModel):
    title: str
    content: str
    original_filename: str
    detected_type: str
    translated: bool
    document_id: str | None = None


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


@router.delete(
    "/collections/{collection_id}/documents/{document_id}",
    status_code=status.HTTP_200_OK,
)
def delete_document(
    collection_id: str,
    document_id: str,
    db: Session = Depends(get_db),
):
    """Deletes a document from a knowledge collection."""
    doc = db.scalar(
        select(KnowledgeDocument).where(
            KnowledgeDocument.id == document_id,
            KnowledgeDocument.collection_id == collection_id,
        )
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found in collection '{collection_id}'.",
        )

    db.delete(doc)
    db.commit()
    return {"message": f"Document '{document_id}' deleted successfully.", "id": document_id}


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


@router.post("/upload", response_model=DocumentExtractResponse)
async def upload_document(
    file: UploadFile = File(...),
    collection_id: str | None = Form(default=None),
    auto_translate: bool = Form(default=True),
    save_to_collection: bool = Form(default=False),
    db: Session = Depends(get_db),
):
    """Uploads a document (PDF, scanned image, or text file), performs AI OCR & translation to English, and optionally indexes it."""
    filename = file.filename or "uploaded_document"
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty."
        )

    if len(raw_bytes) > 25 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit of 25MB.",
        )

    ext = Path(filename).suffix.lower()
    content_type = file.content_type or ""
    is_image = ext in [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".bmp",
        ".gif",
        ".tiff",
    ] or content_type.startswith("image/")
    is_pdf = ext == ".pdf" or content_type == "application/pdf"

    settings = get_settings()
    detected_type = "image" if is_image else "pdf" if is_pdf else "text"
    extracted_text: str | None = None
    image_base64: str | None = None
    image_mime: str = "image/png"

    # Step 1: Extract content based on format
    if is_image:
        image_base64 = base64.b64encode(raw_bytes).decode("utf-8")
        image_mime = (
            content_type
            if content_type.startswith("image/")
            else ("image/png" if ext == ".png" else "image/jpeg")
        )

    elif is_pdf:
        try:
            reader = pypdf.PdfReader(io.BytesIO(raw_bytes))
            pages_text = [page.extract_text() or "" for page in reader.pages]
            full_pdf_text = "\n\n".join(pages_text).strip()
            if len(full_pdf_text) >= 40:
                extracted_text = full_pdf_text
            else:
                # Scanned image-only PDF: check for embedded images
                try:
                    for page in reader.pages:
                        if hasattr(page, "images") and len(page.images) > 0:
                            first_img = page.images[0]
                            image_base64 = base64.b64encode(first_img.data).decode("utf-8")
                            image_mime = (
                                "image/png"
                                if first_img.name.lower().endswith(".png")
                                else "image/jpeg"
                            )
                            break
                except Exception:
                    pass

                if not image_base64 and full_pdf_text:
                    extracted_text = full_pdf_text
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse PDF document: {str(e)}",
            ) from e

    else:
        # Standard text file (.txt, .md, .csv, etc.)
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                extracted_text = raw_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue

        if extracted_text is None:
            extracted_text = raw_bytes.decode("utf-8", errors="replace")

    # Step 2: Perform AI OCR & English Translation
    system_instruction = (
        "You are an enterprise document intelligence and OCR translation engine.\n"
        "Analyze this document with precision:\n"
        "1. Transcribe all text, policies, conditions, clauses, tables, and rules accurately.\n"
        "2. If the document or text is in ANY language other than English (e.g. Spanish, German, French, "
        "Chinese, Japanese, Arabic, Hindi, Portuguese, Russian, Italian, etc.), translate it into clear, "
        "accurate, professional English.\n"
        "3. Preserve all policy numbers, section codes, dates, monetary amounts, and technical terms.\n"
        "4. Format your output strictly in this exact structure:\n\n"
        "TITLE: [Concise descriptive English title for this document, max 10 words]\n\n"
        "CONTENT:\n"
        "[Clean, structured policy text in English formatted with clear markdown headings and bullet points]"
    )

    # Step 2: Build Multi-Model & Multi-Provider Fallback Cascade
    candidate_providers: list[tuple[str, str | None]] = []
    if image_base64:
        # Multimodal Vision models
        if getattr(settings, "GEMINI_API_KEY", None):
            candidate_providers.extend(
                [
                    ("gemini", "gemini-3.5-flash"),
                    ("gemini", "gemini-3.1-flash-lite"),
                    ("gemini", "gemini-flash-latest"),
                ]
            )
        if getattr(settings, "OPENAI_API_KEY", None):
            candidate_providers.extend(
                [
                    ("openai", "gpt-4o-mini"),
                    ("openai", "gpt-4o"),
                ]
            )
        if not candidate_providers:
            candidate_providers.append((settings.AI_PROVIDER, settings.AI_MODEL))
    else:
        # Text extraction & translation models
        if getattr(settings, "GEMINI_API_KEY", None):
            candidate_providers.extend(
                [
                    ("gemini", "gemini-3.5-flash"),
                    ("gemini", "gemini-3.1-flash-lite"),
                    ("gemini", "gemini-flash-latest"),
                ]
            )
        if getattr(settings, "GROQ_API_KEY", None):
            candidate_providers.extend(
                [
                    ("groq", "qwen/qwen3.8-27b"),
                    ("groq", "openai/gpt-oss-120b"),
                    ("groq", "llama-3.3-70b-versatile"),
                ]
            )
        if getattr(settings, "OPENAI_API_KEY", None):
            candidate_providers.extend(
                [
                    ("openai", "gpt-4o-mini"),
                    ("openai", "gpt-4o"),
                ]
            )
        if not candidate_providers:
            candidate_providers.append((settings.AI_PROVIDER, settings.AI_MODEL))

    res = None
    last_error: Exception | None = None

    for prov_name, model_name in candidate_providers:
        try:
            logging.info("Attempting document extraction with %s (%s)", prov_name, model_name)
            ai_prov = get_ai_provider(prov_name, model=model_name)
            if image_base64:
                prompt_payload = [
                    {"type": "text", "text": system_instruction},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{image_mime};base64,{image_base64}"},
                    },
                ]
                res = ai_prov.complete(prompt_payload)
            elif extracted_text:
                prompt_str = (
                    f"{system_instruction}\n\nDocument text to process:\n{extracted_text[:12000]}"
                )
                res = ai_prov.complete(prompt_str)
            else:
                break

            if res and res.content and res.content.strip():
                logging.info("Document extraction succeeded using %s (%s)", prov_name, model_name)
                break
        except Exception as err:
            logging.warning(
                "Provider %s (%s) failed during document OCR: %s", prov_name, model_name, err
            )
            last_error = err
            continue

    # Step 3: Handle Output or Graceful Degradation Fallback
    raw_output: str = ""
    if res and res.content and res.content.strip():
        raw_output = res.content.strip()
    elif extracted_text and extracted_text.strip():
        # Fall back to raw extracted text if all remote AI calls encountered outages/rate limits
        clean_name = Path(filename).stem.replace("_", " ").replace("-", " ").title()
        raw_output = f"TITLE: {clean_name}\n\nCONTENT:\n{extracted_text.strip()}"
        logging.info("Fell back to raw extracted text for document '%s'", filename)
    else:
        err_msg = (
            str(last_error)
            if last_error
            else "Unable to extract text or visual content from this file format."
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI document extraction and translation failed: {err_msg}",
        )

    # Step 4: Parse Title and Content
    title = None
    content = raw_output

    if "CONTENT:" in raw_output:
        parts = raw_output.split("CONTENT:", 1)
        title_raw = parts[0].replace("TITLE:", "").strip()
        title = title_raw.splitlines()[0].strip() if title_raw else None
        content = parts[1].strip()
    elif raw_output.startswith("TITLE:"):
        lines = raw_output.splitlines()
        title = lines[0].replace("TITLE:", "").strip()
        content = "\n".join(lines[1:]).strip()

    if not title:
        title = Path(filename).stem.replace("_", " ").replace("-", " ").title()

    # Step 4: Optionally Index into Knowledge Base
    saved_doc_id: str | None = None
    if collection_id and save_to_collection:
        coll = db.get(KnowledgeCollection, collection_id)
        if coll:
            doc = KnowledgeDocument(
                collection_id=coll.id,
                title=title,
                content=content,
                doc_metadata={
                    "source": filename,
                    "translated_to_english": True,
                    "detected_type": detected_type,
                },
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            saved_doc_id = doc.id

    return DocumentExtractResponse(
        title=title,
        content=content,
        original_filename=filename,
        detected_type=detected_type,
        translated=True,
        document_id=saved_doc_id,
    )
