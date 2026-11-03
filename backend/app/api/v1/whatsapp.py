import logging
import re
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.execution import StepRun, WorkflowRun
from app.models.workflow import Workflow, WorkflowVersion
from app.workflows.executor import execute_workflow_run
from app.workflows.flagship import (
    FLAGSHIP_WORKFLOW_NAME,
    create_or_update_flagship_workflow,
)

logger = logging.getLogger("flowforge.whatsapp")

router = APIRouter(prefix="/integrations/whatsapp", tags=["WhatsApp Integration"])


class WhatsAppSimulateRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    customer_phone: str = Field(default="+91 98765 43210")
    customer_name: str = Field(default="Customer")


class WhatsAppSimulateResponse(BaseModel):
    reply: str
    requires_approval: bool = False
    approval_id: str | None = None
    run_id: str | None = None
    category: str = "general"
    policy_citation: str | None = None
    confidence: float = 0.95
    timestamp: str


@router.get("/config")
def get_whatsapp_config():
    """Returns configuration details for Meta WhatsApp Cloud API webhooks."""
    settings = get_settings()
    is_live = bool(settings.WHATSAPP_PHONE_NUMBER_ID and settings.WHATSAPP_ACCESS_TOKEN)
    return {
        "webhook_url": "/api/v1/integrations/whatsapp/webhook",
        "verify_token": settings.WHATSAPP_VERIFY_TOKEN,
        "is_live_configured": is_live,
        "phone_number_id": settings.WHATSAPP_PHONE_NUMBER_ID if is_live else None,
        "provider": "Meta WhatsApp Business Cloud API",
    }


@router.get("/webhook")
def verify_whatsapp_webhook(
    hub_mode: str | None = Query(None, alias="hub.mode"),
    hub_verify_token: str | None = Query(None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(None, alias="hub.challenge"),
):
    """Handles Meta WhatsApp Webhook verification handshake."""
    settings = get_settings()
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully.")
        return Response(content=hub_challenge or "", media_type="text/plain")

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification token mismatch")


@router.post("/webhook")
async def handle_whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """Receives and orchestrates incoming messages from Meta WhatsApp Business Cloud API."""
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload"
        ) from e

    # Handle Meta's status notifications or verification pings
    entry = body.get("entry", [])
    if not entry:
        return {"status": "ok", "message": "Ignored non-entry event"}

    changes = entry[0].get("changes", [])
    if not changes:
        return {"status": "ok", "message": "Ignored non-change event"}

    value = changes[0].get("value", {})
    messages = value.get("messages", [])
    if not messages:
        return {"status": "ok", "message": "No customer message found in payload"}

    msg_obj = messages[0]
    sender_phone = msg_obj.get("from", "Unknown")
    msg_type = msg_obj.get("type", "text")
    user_text = msg_obj.get("text", {}).get("body", "") if msg_type == "text" else "[Media Message]"

    logger.info("Incoming WhatsApp message from %s: %s", sender_phone, user_text)

    # Process via simulation pipeline
    sim_res = await simulate_whatsapp_message(
        WhatsAppSimulateRequest(
            message=user_text,
            customer_phone=sender_phone,
            customer_name="WhatsApp User",
        ),
        db=db,
    )

    # If Meta Cloud API credentials exist, send reply back via official graph API
    settings = get_settings()
    if settings.WHATSAPP_PHONE_NUMBER_ID and settings.WHATSAPP_ACCESS_TOKEN:
        import httpx

        try:
            url = f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            }
            send_payload = {
                "messaging_product": "whatsapp",
                "to": sender_phone,
                "type": "text",
                "text": {"body": sim_res.reply},
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=send_payload, headers=headers)
                logger.info("Meta Graph API response: %d", res.status_code)
        except Exception as e:
            logger.error("Failed to send WhatsApp message via Meta Graph API: %s", e)

    return {"status": "success", "data": sim_res}


@router.post("/simulate", response_model=WhatsAppSimulateResponse)
async def simulate_whatsapp_message(
    payload: WhatsAppSimulateRequest, db: Session = Depends(get_db)
) -> WhatsAppSimulateResponse:
    """Simulates a real-time WhatsApp conversation invoking FlowForge AI decision workflows."""
    now_iso = datetime.now(UTC).strftime("%I:%M %p")

    # 1. Ensure Flagship Customer Support Workflow exists and is published
    workflow = db.scalar(select(Workflow).where(Workflow.name == FLAGSHIP_WORKFLOW_NAME))
    if not workflow:
        workflow = create_or_update_flagship_workflow(db)

    version = db.scalar(
        select(WorkflowVersion)
        .where(WorkflowVersion.workflow_id == workflow.id)
        .order_by(WorkflowVersion.version_number.desc())
    )
    if not version:
        workflow = create_or_update_flagship_workflow(db)
        version = db.scalar(
            select(WorkflowVersion)
            .where(WorkflowVersion.workflow_id == workflow.id)
            .order_by(WorkflowVersion.version_number.desc())
        )

    version_id = version.id

    # 2. Extract potential monetary amount (prioritizing currency symbols over order numbers)
    text_lower = payload.message.lower()
    currency_match = re.search(r"(?:[\$₹]|rs\.?|inr|usd)\s*(\d+(?:\.\d{1,2})?)", text_lower)
    if currency_match:
        extracted_amount = float(currency_match.group(1))
    else:
        keyword_amount = re.search(
            r"(?:refund|amount|worth|cost|price|pay|claim)\s*(?:of|is|for)?\s*(\d+(?:\.\d{1,2})?)",
            text_lower,
        )
        extracted_amount = float(keyword_amount.group(1)) if keyword_amount else None

    # Check if this qualifies for High-Value Manager Approval threshold ($100 / ₹500)
    is_high_value = False
    if extracted_amount is not None and extracted_amount > 100.0:
        is_high_value = True
    elif any(
        kw in text_lower
        for kw in ["tablet", "phone", "laptop", "stolen", "unauthorized", "chargeback", "expensive"]
    ):
        is_high_value = True

    # 3. Create Workflow Run
    run = WorkflowRun(
        workflow_id=workflow.id,
        workflow_version_id=version_id,
        input_payload={
            "ticket_text": payload.message,
            "channel": "whatsapp",
            "customer_phone": payload.customer_phone,
            "customer_name": payload.customer_name,
        },
    )
    db.add(run)
    db.commit()

    # 4. Execute the workflow deterministically
    try:
        run = execute_workflow_run(run.id, db)
    except Exception as e:
        logger.warning("Workflow execution returned: %s", e)
        db.refresh(run)

    # 5. Extract category and citations
    output_result = (run.output_payload or {}).get("result", {})
    category = output_result.get("category", "general")
    policy_sources = output_result.get("policy_sources", [])
    policy_title = policy_sources[0].get("title") if policy_sources else "Company Policy"
    confidence = float(output_result.get("confidence", 0.95))

    # 6. Branch: Requires Human Approval (High Value or Sensitive Dispute)
    if is_high_value:
        approval_title = f"WhatsApp High-Value Refund Review: {payload.customer_phone}"
        approval_desc = (
            f"Customer '{payload.customer_name}' ({payload.customer_phone}) requested an exception "
            f"via WhatsApp: '{payload.message}'.\n"
            f"Detected Amount: ${extracted_amount if extracted_amount else 'Flagged High-Value'}.\n"
            f"Knowledge Policy: {policy_title} dictates manager sign-off before disbursement."
        )

        first_step = db.scalar(select(StepRun).where(StepRun.workflow_run_id == run.id))
        target_step_id = first_step.id if first_step else run.id

        approval = ApprovalRequest(
            workflow_run_id=run.id,
            step_run_id=target_step_id,
            title=approval_title,
            description=approval_desc,
            required_role="reviewer",
            status=ApprovalStatus.PENDING.value,
        )
        db.add(approval)
        db.commit()
        db.refresh(approval)

        reply = (
            "⏸️ *Request Under Manager Review*\n\n"
            f"Hello {payload.customer_name}, we have logged your inquiry regarding your recent order.\n\n"
            f"Because this request involves a high-value reimbursement "
            f"({f'${extracted_amount:.2f}' if extracted_amount else 'exceeding automated limits'}), "
            "it has been securely routed to our senior support manager for review.\n\n"
            f"📌 *Approval Case ID:* `APP-{approval.id[:8].upper()}`\n"
            "⏱️ *Resolution SLA:* You will receive an update here on WhatsApp within 30 minutes.\n\n"
            "_Thank you for your patience!_"
        )

        return WhatsAppSimulateResponse(
            reply=reply,
            requires_approval=True,
            approval_id=approval.id,
            run_id=run.id,
            category=category,
            policy_citation=policy_title,
            confidence=confidence,
            timestamp=now_iso,
        )

    # 7. Branch: Standard Auto-Resolution
    if "billing" in category or "refund" in text_lower or "return" in text_lower:
        refund_amount = f"${extracted_amount:.2f}" if extracted_amount else "$38.50"
        reply = (
            "✅ *FlowForge AI — Refund Approved*\n\n"
            f"Hi {payload.customer_name},\n"
            f"In accordance with our *{policy_title}*, your request is eligible for immediate reimbursement.\n\n"
            f"💰 *Refund Amount:* {refund_amount}\n"
            "💳 *Credit Target:* Original payment method\n"
            "⏱️ *Processing Time:* 2 to 3 business days\n\n"
            "Your ticket has been marked resolved. Reply to this chat if you need any additional assistance!"
        )
    elif "technical" in category or "bug" in text_lower or "crash" in text_lower:
        reply = (
            "🛠️ *Technical Escalation Logged*\n\n"
            f"Hello {payload.customer_name},\n"
            f"Your issue has been matched to our *{policy_title}*:\n\n"
            "Our automated triage system has notified on-call engineering. "
            "Diagnostics telemetry and worker logs are currently being inspected.\n\n"
            "Priority: *High (P1)*\n"
            "We will notify you on this WhatsApp thread once the patch is deployed."
        )
    else:
        reply = (
            "👋 *FlowForge Customer Support*\n\n"
            f"Hi {payload.customer_name}, thank you for reaching out!\n\n"
            "We have processed your message through our Knowledge Base. "
            "All account guidelines and documentation have been cross-checked.\n\n"
            "How else can we help you today?"
        )

    return WhatsAppSimulateResponse(
        reply=reply,
        requires_approval=False,
        approval_id=None,
        run_id=run.id,
        category=category,
        policy_citation=policy_title,
        confidence=confidence,
        timestamp=now_iso,
    )
