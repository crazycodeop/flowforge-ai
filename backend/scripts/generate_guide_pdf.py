"""
Generates FlowForge_AI_Interview_Guide.pdf using ReportLab.
High-quality, styled PDF with custom colors, tables, callout boxes, and headers.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

PDF_FILENAME = "FlowForge_AI_Interview_Guide.pdf"


def generate_pdf():
    doc = SimpleDocTemplate(
        PDF_FILENAME,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()

    # Custom palette
    PRIMARY_PURPLE = colors.HexColor("#7E22CE")
    DARK_BG = colors.HexColor("#111827")
    TEXT_MAIN = colors.HexColor("#1F2937")
    TEXT_MUTED = colors.HexColor("#4B5563")
    colors.HexColor("#059669")
    LIGHT_BG = colors.HexColor("#F3F4F6")
    BORDER_COLOR = colors.HexColor("#E5E7EB")
    CALLOUT_BG = colors.HexColor("#FAF5FF")

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=PRIMARY_PURPLE,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "DocSubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=TEXT_MUTED,
        spaceAfter=14,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=DARK_BG,
        spaceBefore=14,
        spaceAfter=6,
    )

    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=PRIMARY_PURPLE,
        spaceBefore=10,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_MAIN,
        spaceAfter=6,
    )

    quote_style = ParagraphStyle(
        "PitchQuote",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=10,
        leading=14.5,
        textColor=DARK_BG,
    )

    bullet_style = ParagraphStyle(
        "BulletText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_MAIN,
        leftIndent=14,
        spaceAfter=3,
    )

    qa_q_style = ParagraphStyle(
        "QAQuestion",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=DARK_BG,
        spaceBefore=8,
        spaceAfter=3,
    )

    qa_a_style = ParagraphStyle(
        "QAAnswer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_MUTED,
        leftIndent=10,
        spaceAfter=8,
    )

    story = []

    # Title & Header
    story.append(
        Paragraph("FlowForge AI — Interview Presentation & Live Demo Playbook", title_style)
    )
    story.append(
        Paragraph(
            "Enterprise-Grade Visual AI Workflow Orchestration & Distributed State Engine",
            subtitle_style,
        )
    )
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_PURPLE, spaceAfter=14))

    # Section 1: The 30-Second Elevator Pitch
    story.append(Paragraph("1. The 30-Second Elevator Pitch (The Hook)", h1_style))
    pitch_text = (
        '<b>"Most AI tools are fragile script wrappers that crash in production when external LLMs lag or APIs timeout. '
        "I engineered FlowForge AI—an enterprise-grade visual workflow orchestration engine with a PostgreSQL-backed state machine, "
        "distributed Celery/Redis background execution, semantic RAG policy grounding, and Human-in-the-Loop (HITL) approval gates. "
        "It guarantees that high-stakes AI pipelines never execute critical decisions without cryptographic auditability, schema validation, "
        'and authorized human oversight."</b>'
    )
    pitch_table = Table([[Paragraph(pitch_text, quote_style)]], colWidths=[530])
    pitch_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CALLOUT_BG),
                ("BOX", (0, 0), (-1, -1), 1, PRIMARY_PURPLE),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(pitch_table)
    story.append(Spacer(1, 12))

    # Section 2: Architecture Highlights
    story.append(Paragraph("2. Enterprise Architectural Pillars", h1_style))
    arch_data = [
        [
            Paragraph("<b>Pillar</b>", body_style),
            Paragraph("<b>Implementation Details & Engineering Defense</b>", body_style),
        ],
        [
            Paragraph("<b>PostgreSQL Source of Truth</b>", body_style),
            Paragraph(
                "Workflows, step run states, execution timelines, and human approval requests are durably managed in PostgreSQL with ACID guarantees. Redis is strictly a transient message broker.",
                body_style,
            ),
        ],
        [
            Paragraph("<b>Acyclic Graph Validation</b>", body_style),
            Paragraph(
                "Applies Kahn's Algorithm (Topological Sort) to validate DAGs, detect cycles, find orphan/unreachable nodes, and enforce depth limits prior to publishing.",
                body_style,
            ),
        ],
        [
            Paragraph("<b>Immutable Version Snapshots</b>", body_style),
            Paragraph(
                "Published workflow versions are frozen with a SHA-256 checksum snapshot so running workflows are insulated against breaking schema edits.",
                body_style,
            ),
        ],
        [
            Paragraph("<b>Worker Lease Watchdog</b>", body_style),
            Paragraph(
                "Celery tasks acquire TTL leases in PostgreSQL. If a container or worker terminates mid-run, orphaned tasks are automatically recovered without corrupting state.",
                body_style,
            ),
        ],
        [
            Paragraph("<b>Strict AI Guardrails</b>", body_style),
            Paragraph(
                "All AI outputs are parsed through Pydantic V2 schemas with extra fields forbidden. Raw LLM responses never directly execute code or bypass permission checks.",
                body_style,
            ),
        ],
    ]
    arch_table = Table(arch_data, colWidths=[150, 380])
    arch_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(arch_table)
    story.append(Spacer(1, 14))

    # Section 3: 5-Minute Live Demo Playbook
    story.append(Paragraph("3. Five-Minute Live Technical Demo Playbook", h1_style))
    story.append(
        Paragraph(
            "Follow this step-by-step script during technical screenings or portfolio presentations:",
            body_style,
        )
    )

    demo_steps = [
        (
            "Step 1: Dashboard & Multi-Tenancy (0:00 - 0:45)",
            [
                "Open http://localhost:5173 and showcase the modern dark-mode application shell.",
                "Demonstrate the organization switcher: show multi-tenant workspace isolation partitioning workflows, executions, and settings.",
            ],
        ),
        (
            "Step 2: Knowledge Base Grounding (0:45 - 1:30)",
            [
                "Navigate to /knowledge. Showcase the seeded collections: <b>support_policies</b> and <b>it_runbooks</b>.",
                "Point out Document POL-BILL-001 (Refund & Billing Policy) with the explicit $100 manager approval ceiling.",
                "Explain: <i>'Workflows query this store via vector/semantic search to ground AI decisions in verified corporate policies.'</i>",
            ],
        ),
        (
            "Step 3: Visual Workflow Builder Canvas (1:30 - 2:30)",
            [
                "Open /workflows and launch the <b>Automated Customer Support & SLA Triage</b> workflow.",
                "Showcase the React Flow DAG canvas: Trigger &rarr; AI Intent Classifier &rarr; Knowledge Retrieval &rarr; Structured Extractor &rarr; Output.",
                "Click on a node to show the slide-out <b>Node Inspector</b>, explaining how each node validates parameters in real-time.",
            ],
        ),
        (
            "Step 4: Autonomous Execution vs. Human-in-the-Loop (2:30 - 4:00)",
            [
                "<b>Workflow A (Autonomous):</b> Show the completed execution for damaged goods (< $100). Highlights zero-human triage in &lt; 3s.",
                "<b>Workflow B (Human-in-the-Loop):</b> Trigger or open a run with a $450 claim on the <b>High-Value Refund Approval Pipeline</b>.",
                "Show how the conditional node routes &gt; $100 claims into the <b>Finance Manager Approval Gate</b>, pausing the execution safely.",
                "Navigate to <b>/approvals</b>. Show the live pending request card with full claim metadata, and click <b>Approve</b>.",
                "Return to Executions to show the state automatically transition to COMPLETED with an audited disbursement receipt.",
            ],
        ),
        (
            "Step 5: Operational Monitoring & Audit Trail (4:00 - 5:00)",
            [
                "Open the <b>Executions Timeline</b>. Show step-by-step latency, token cost accounting, and masked PII (e.g. sk-••••••••).",
                "Conclude: <i>'FlowForge AI provides production dependability: deterministic DAGs, ACID state management, and real governance.'</i>",
            ],
        ),
    ]

    for step_title, bullets in demo_steps:
        story.append(Paragraph(f"<b>{step_title}</b>", h2_style))
        for bullet in bullets:
            story.append(Paragraph(f"&bull; {bullet}", bullet_style))
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # Section 4: Deep Dive Comparison
    story.append(Paragraph("4. Core Workflows Comparison Architecture", h1_style))
    wf_comp_data = [
        [
            Paragraph("<b>Feature / Dimension</b>", body_style),
            Paragraph("<b>Workflow 1: Autonomous Triage</b>", body_style),
            Paragraph("<b>Workflow 2: High-Value Approval</b>", body_style),
        ],
        [
            Paragraph("<b>Primary Objective</b>", body_style),
            Paragraph("Instant customer support triage & response", body_style),
            Paragraph("Financial refund disbursement governance", body_style),
        ],
        [
            Paragraph("<b>Human Intervention</b>", body_style),
            Paragraph("<b>Zero (Fully automated)</b>", body_style),
            Paragraph("<b>Mandatory for claims &gt; $100</b>", body_style),
        ],
        [
            Paragraph("<b>Decision Node</b>", body_style),
            Paragraph("AI Intent Classifier (categories: billing/tech)", body_style),
            Paragraph("Condition Node (&gt; $100 threshold router)", body_style),
        ],
        [
            Paragraph("<b>Grounded Policies</b>", body_style),
            Paragraph("Retrieval node querying <i>support_policies</i>", body_style),
            Paragraph("Bound by Policy POL-BILL-001 ($100 cap)", body_style),
        ],
        [
            Paragraph("<b>Failure Mode Handling</b>", body_style),
            Paragraph("Auto-retries on external inference timeouts", body_style),
            Paragraph("24-hour timeout escalation if reviewer is offline", body_style),
        ],
    ]
    wf_comp_table = Table(wf_comp_data, colWidths=[120, 205, 205])
    wf_comp_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(wf_comp_table)
    story.append(Spacer(1, 14))

    # Section 5: Top Technical Interview Questions & Model Answers
    story.append(
        Paragraph("5. High-Impact Technical Interview Questions & Model Answers", h1_style)
    )

    qa_list = [
        (
            "Q1: Why build an orchestration engine from scratch instead of using LangChain or Flowise?",
            '"Frameworks like LangChain or CrewAI are convenient for prototypes but lack enterprise durability. If a worker crashes mid-chain, execution state is lost. FlowForge AI models workflows as formal distributed state machines committed directly to PostgreSQL. Every step transition, attempt count, and token cost is ACID-durable, providing zero-loss crash recovery, deterministic retries, and cryptographic auditability."',
        ),
        (
            "Q2: How do you prevent cyclic dependencies or infinite loops on the visual canvas?",
            '"Before a draft workflow can be published or executed, its graph passes through our validator using Kahn\'s Algorithm (Topological Sort). It verifies in-degrees, detects cycle participants, checks reachability from trigger nodes, and validates branching handles. Any malformed DAG is rejected with exact node and edge identifiers before reaching the database."',
        ),
        (
            "Q3: How do you handle Celery worker crashes during a running task?",
            '"When a Celery worker claims an execution step, it acquires a bounded lease with a TTL in PostgreSQL. A Celery supervisor periodically queries for active steps whose heartbeats have expired. Orphaned tasks are transitioned back to QUEUED up to their configured retry ceiling, preventing unhandled job blackholes."',
        ),
        (
            "Q4: How do you ensure untrusted LLM outputs do not compromise system integrity?",
            '"We treat all AI model responses as untrusted user input. We enforce strict JSON schema extraction via Pydantic V2 models with extra fields forbidden. Raw LLM responses never directly invoke internal database commands or bypass security checks. Furthermore, all sensitive keys and PII are masked in audit timeline outputs."',
        ),
        (
            "Q5: How does the system achieve tenant isolation in a multi-tenant setup?",
            '"Workflows, execution histories, and reference documents include an organization_id foreign key. Every API route verifies tenant boundaries using FastAPI dependency injection (get_current_tenant). Database queries are scoped at the ORM layer, preventing cross-tenant data leakage while allowing shared global blueprint templates."',
        ),
    ]

    for q, a in qa_list:
        story.append(Paragraph(q, qa_q_style))
        story.append(Paragraph(a, qa_a_style))

    # Build PDF
    doc.build(story)
    print(f"Successfully generated {PDF_FILENAME}")


if __name__ == "__main__":
    generate_pdf()
