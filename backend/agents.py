from typing import TypedDict, List, Dict, Any, Optional
import asyncio
import re
import uuid
import time
import logging
from datetime import datetime

from langgraph.graph import StateGraph, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

try:
    from .tools import web_search, scrape_url
    from .llm import get_llm
    from .config import MAX_REVISIONS, TRUST_THRESHOLD
    from .verification import (
        score_source,
        verify_citations,
        apply_trust_score_formula,
        normalize_url,
    )
except ImportError:
    from tools import web_search, scrape_url
    from llm import get_llm
    from config import MAX_REVISIONS, TRUST_THRESHOLD
    from verification import (
        score_source,
        verify_citations,
        apply_trust_score_formula,
        normalize_url,
    )

logger = logging.getLogger(__name__)

class ResearchState(TypedDict, total=False):
    job_id: Optional[str]
    topic: str
    search_results: str
    scraped_content: str
    report: str
    feedback: str
    initial_report: Optional[str]
    initial_feedback: Optional[str]
    trust_score: int
    quality_score: int
    sources: List[Dict[str, Any]]
    logs: List[Dict[str, Any]]
    iteration: int
    step: str
    pinned_urls: List[str]
    excluded_urls: List[str]
    revisions: List[Dict[str, Any]]
    verification: Dict[str, Any]

_log_listener = None

def set_log_listener(fn):
    global _log_listener
    _log_listener = fn

async def emit_live_log(job_id: Optional[str], log_entry: Dict[str, Any]):
    if _log_listener and job_id:
        try:
            res = _log_listener(job_id, log_entry)
            if asyncio.iscoroutine(res):
                await res
        except Exception as e:
            logger.debug(f"Failed to emit live log: {e}")

async def ainvoke_with_retry(
    chain,
    inputs: Dict[str, Any],
    job_id: Optional[str] = None,
    max_retries: int = 4,
    base_delay: float = 25.0,
    logs: Optional[List[Dict[str, Any]]] = None,
    agent_name: str = "System",
) -> Any:
    delay = base_delay
    for attempt in range(1, max_retries + 1):
        try:
            return await chain.ainvoke(inputs)
        except Exception as e:
            err_msg = str(e)
            is_429 = (
                "429" in err_msg
                or "rate limit" in err_msg.lower()
                or "rate_limited" in err_msg.lower()
            )
            is_transient = is_429 or any(code in err_msg for code in ["500", "502", "503", "504", "overloaded"])

            if is_transient and attempt < max_retries:
                reason = "Rate limit (429)" if is_429 else "Transient service error"
                warn_msg = f"{reason} encountered. Waiting {int(delay)}s for quota to reset before retrying (attempt {attempt}/{max_retries})..."
                logger.warning(warn_msg)
                warn_log = make_log(agent_name, warn_msg, "warning")
                if logs is not None:
                    logs.append(warn_log)
                if job_id:
                    await emit_live_log(job_id, warn_log)
                await asyncio.sleep(delay)
                delay = min(delay * 1.5, 60.0)
            else:
                raise e

def make_log(agent: str, message: str, log_type: str = "info", source_url: Optional[str] = None) -> Dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "timestamp": time.time(),
        "agent": agent,
        "type": log_type,
        "message": message,
        "source_url": source_url,
    }

async def search_node(state: ResearchState) -> Dict[str, Any]:
    topic = state.get("topic", "")
    current_year = datetime.now().year
    pinned = state.get("pinned_urls") or []
    excluded = state.get("excluded_urls") or []

    logs = [make_log("SearchAgent", f"Starting multi-query search for topic: '{topic}'", "info")]
    if pinned:
        logs.append(make_log("SearchAgent", f"Applying {len(pinned)} pinned URLs", "info"))
    if excluded:
        logs.append(make_log("SearchAgent", f"Filtering out {len(excluded)} excluded URLs", "info"))

    # Two concurrent queries: base topic + topic with current year
    queries = [
        topic,
        f"{topic} latest research findings {current_year}"
    ]

    async def execute_query(q: str):
        return await asyncio.to_thread(web_search.invoke, q)

    raw_results = await asyncio.gather(*[execute_query(q) for q in queries])
    combined_results = "\n\n----\n\n".join(raw_results)

    # Extract all discovered URLs
    extracted_urls = re.findall(r'URL:\s*(https?://[^\s\n\r]+)', combined_results)
    
    # Deduplicate while preserving order and canonical path
    seen_canonicals = set()
    unique_discovered = []
    for u in extracted_urls:
        clean_u = u.rstrip(').,;!?\'"').strip()
        canon_u = normalize_url(clean_u)
        is_excluded = clean_u in excluded or canon_u in excluded or any(normalize_url(e) == canon_u for e in excluded)
        if clean_u and canon_u not in seen_canonicals and not is_excluded:
            seen_canonicals.add(canon_u)
            unique_discovered.append(clean_u)

    # Pinned URLs are prioritized and placed first
    valid_pinned = [
        p for p in pinned 
        if p not in excluded and normalize_url(p) not in excluded and not any(normalize_url(e) == normalize_url(p) for e in excluded)
    ]
    final_urls = []
    seen_final_canon = set()
    for p in valid_pinned:
        cp = normalize_url(p)
        if cp not in seen_final_canon:
            seen_final_canon.add(cp)
            final_urls.append(p)

    for u in unique_discovered:
        cu = normalize_url(u)
        if cu not in seen_final_canon:
            seen_final_canon.add(cu)
            final_urls.append(u)
        if len(final_urls) >= 5:
            break

    final_urls = final_urls[:5]

    sources: List[Dict[str, Any]] = []
    for i, u in enumerate(final_urls):
        tier_info = score_source(u)
        sources.append({
            "url": u,
            "title": f"Source {i+1}",
            "status": "pending",
            "tier": tier_info["tier"],
            "label": tier_info["label"],
            "reason": tier_info["reason"],
            "pinned": u in valid_pinned
        })

    logs.append(make_log("SearchAgent", f"Selected {len(sources)} unique sources for analysis", "success"))

    return {
        "step": "search",
        "search_results": combined_results,
        "sources": sources,
        "logs": logs,
        "iteration": state.get("iteration", 0),
        "pinned_urls": valid_pinned,
        "excluded_urls": excluded,
    }

async def scrape_node(state: ResearchState) -> Dict[str, Any]:
    sources = state.get("sources", [])
    logs = [make_log("ReaderAgent", f"Scraping {len(sources)} sources in parallel...", "info")]

    async def scrape_one(src: Dict[str, Any]):
        url = src["url"]
        try:
            content = await asyncio.wait_for(
                asyncio.to_thread(scrape_url.invoke, url),
                timeout=12.0
            )
            return url, content[:2000]
        except Exception as e:
            return url, f"Could not scrape URL: {str(e)}"

    results = await asyncio.gather(*[scrape_one(s) for s in sources])

    scraped_entries = []
    updated_sources = []
    for (url, content), src in zip(results, sources):
        src_copy = dict(src)
        if "Could not scrape" not in content and len(content.strip()) >= 100:
            scraped_entries.append(f"[{url}]\n{content.strip()}")
            src_copy["status"] = "scraped"
            logs.append(make_log("ReaderAgent", f"Successfully scraped {url}", "success", source_url=url))
        else:
            src_copy["status"] = "failed"
            logs.append(make_log("ReaderAgent", f"Failed or insufficient content for {url}", "warning", source_url=url))
        updated_sources.append(src_copy)

    combined_scraped = "\n\n".join(scraped_entries)

    return {
        "step": "read",  # Keeps frontend step tracker active on 'read'
        "scraped_content": combined_scraped,
        "sources": updated_sources,
        "logs": logs,
    }

async def write_node(state: ResearchState) -> Dict[str, Any]:
    topic = state.get("topic", "")
    scraped_content = state.get("scraped_content", "")
    scraped_urls = [s["url"] for s in state.get("sources", []) if s.get("status") == "scraped"]

    writer_prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an expert research analyst. Write based ONLY on the provided sources.\n"
            "Every single factual claim MUST have an inline citation in the exact format (https://...). "
            "The cited URL MUST be one of the URLs provided in the sources list. "
            "NEVER invent facts or citations.\n"
            "Structure the report with the following exact sections:\n"
            "## Summary\n"
            "## Key Findings\n"
            "## Conclusion\n\n"
            "If including comparison tables, format them using standard GitHub Flavored Markdown table syntax with a blank line before and after the table, and each row on its own distinct line (never join rows with ||).\n\n"
            "At the end of the report, list a '## Sources' section with the valid URLs used."
        )),
        ("human", (
            "Topic: {topic}\n\n"
            "Scraped Sources Content:\n{research}\n\n"
            "Provide the detailed, verified research report:"
        ))
    ])

    llm = get_llm("writer")
    chain = writer_prompt | llm | StrOutputParser()

    logs: List[Dict[str, Any]] = []
    job_id = state.get("job_id")
    report = await ainvoke_with_retry(
        chain,
        {
            "topic": topic,
            "research": scraped_content if scraped_content else "No scraped content available."
        },
        job_id=job_id,
        logs=logs,
        agent_name="WriterAgent"
    )

    # Deterministic verification
    verification = verify_citations(report, scraped_urls)
    logs.extend([
        make_log("WriterAgent", "Initial research draft generated.", "success"),
        make_log(
            "Verification",
            f"Citation Coverage: {verification['coverage_percentage']}% | "
            f"Fabricated Citations: {len(verification['fabricated_citations'])}",
            "info" if len(verification['fabricated_citations']) == 0 else "warning"
        )
    ])

    return {
        "step": "write",
        "report": report,
        "initial_report": state.get("initial_report") or report,
        "verification": verification,
        "logs": logs,
    }

async def critic_node(state: ResearchState) -> Dict[str, Any]:
    report = state.get("report", "")
    iteration = state.get("iteration", 0)
    scraped_urls = [s["url"] for s in state.get("sources", []) if s.get("status") == "scraped"]

    # Ensure deterministic verification is fresh
    verification = verify_citations(report, scraped_urls)

    sources_summary = "\n".join([
        f"- {s.get('title', 'Source')}: {s['url']}"
        for s in state.get("sources", []) if s.get("status") == "scraped"
    ]) or "No scraped sources available."

    critic_prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a strict, fair research fact-checker and quality auditor.\n"
            "Evaluate how thoroughly and accurately the report synthesizes the retrieved web sources, verifies claims with inline citations, and presents a clear, logical structure.\n\n"
            "EVALUATION CRITERIA:\n"
            "- Trust Score (0-100): Evaluates factual grounding in the PROVIDED sources and inline citation completeness. Do not penalize the report for not citing external sources that were not retrieved.\n"
            "- Quality Score (0-100): Evaluates analytical depth, clarity, structure, and professional writing tone.\n\n"
            "You MUST respond EXACTLY in the following format with no markdown bolding in the score lines:\n"
            "Trust Score: [0-100]\n"
            "Quality Score: [0-100]\n\n"
            "Issues:\n"
            "- [Specific issue 1]\n"
            "- [Specific issue 2]\n"
        )),
        ("human", (
            "Available Retrieved Sources:\n{sources}\n\n"
            "Research Report to Review:\n{report}"
        ))
    ])

    llm = get_llm("critic")
    chain = critic_prompt | llm | StrOutputParser()

    logs: List[Dict[str, Any]] = []
    job_id = state.get("job_id")

    async def get_scores_and_feedback():
        raw_output = await ainvoke_with_retry(
            chain,
            {"report": report, "sources": sources_summary},
            job_id=job_id,
            logs=logs,
            agent_name="CriticAgent"
        )
        trust_m = re.search(r'(?:\*\*|\#\#)?\s*Trust Score\s*(?:\*\*|\#\#)?\s*[:=\-]?\s*(\d+)', raw_output, re.IGNORECASE)
        quality_m = re.search(r'(?:\*\*|\#\#)?\s*Quality Score\s*(?:\*\*|\#\#)?\s*[:=\-]?\s*(\d+)', raw_output, re.IGNORECASE)
        if trust_m and quality_m:
            return int(trust_m.group(1)), int(quality_m.group(1)), raw_output
        return None, None, raw_output

    raw_trust, raw_quality, feedback_text = await get_scores_and_feedback()

    # Retry once if parsing failed
    if raw_trust is None or raw_quality is None:
        logger.warning("Critic score parsing failed on first attempt. Retrying once...")
        raw_trust, raw_quality, feedback_text = await get_scores_and_feedback()

    # If still failed, use 0 and log a warning; NEVER silently default to 75
    if raw_trust is None or raw_quality is None:
        logger.warning("Critic score parsing failed after retry. Setting scores to 0.")
        raw_trust = 0
        raw_quality = 0
        logs.append(make_log("CriticAgent", "Failed to parse critic score after retry; recorded 0.", "error"))

    # Combine model's trust score with deterministic verification formula
    final_trust = apply_trust_score_formula(raw_trust, verification)
    final_quality = min(100, max(0, raw_quality))

    # Enrich feedback with deterministic findings
    feedback_additions = [
        f"\n\nDeterministic Verification Details:",
        f"- Citation Coverage: {verification['coverage_percentage']}% ({verification['cited_claims']}/{max(1, verification['total_claims'])} claims cited)",
        f"- Fabricated Citations: {len(verification['fabricated_citations'])}"
    ]
    if verification['fabricated_citations']:
        feedback_additions.append(f"  Unrecognized URLs: {', '.join(verification['fabricated_citations'])}")

    # Check if revision limit is reached and final score is below threshold
    if iteration >= MAX_REVISIONS and final_trust < TRUST_THRESHOLD:
        limit_msg = "Revision limit reached; final score below threshold"
        feedback_additions.append(f"- {limit_msg}")
        logs.append(make_log("CriticAgent", limit_msg, "warning"))

    full_feedback = feedback_text + "\n" + "\n".join(feedback_additions)
    logs.append(make_log(
        "CriticAgent",
        f"Evaluated (Iteration {iteration}) - Trust: {final_trust}/100, Quality: {final_quality}/100",
        "success" if final_trust >= TRUST_THRESHOLD else "warning"
    ))

    # Keep track of all revisions
    revisions = list(state.get("revisions") or [])
    revisions.append({
        "iteration": iteration,
        "score": final_trust,
        "quality_score": final_quality,
        "feedback": full_feedback,
    })

    return {
        "step": "critic",
        "feedback": full_feedback,
        "initial_feedback": state.get("initial_feedback") or full_feedback,
        "trust_score": final_trust,
        "quality_score": final_quality,
        "verification": verification,
        "revisions": revisions,
        "logs": logs,
    }

async def revise_node(state: ResearchState) -> Dict[str, Any]:
    topic = state.get("topic", "")
    current_report = state.get("report", "")
    feedback = state.get("feedback", "")
    scraped_content = state.get("scraped_content", "")
    iteration = state.get("iteration", 0) + 1

    reviser_prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are an expert research editor and fact-checker. Revise the report to address the critic's feedback while preserving and strengthening its factual integrity.\n\n"
            "MANDATORY CITATION RULES:\n"
            "1. Every factual statement, statistic, and key finding MUST include an inline citation in the exact format (https://...). "
            "The cited URL MUST be one of the URLs provided in the Available Sources.\n"
            "2. PRESERVE all existing valid inline citations from the previous draft. DO NOT strip or delete valid citations.\n"
            "3. If multiple points originate from the same source, it is completely valid and expected to cite that source for each claim. Never remove a citation just because the source is cited multiple times.\n"
            "4. NEVER fabricate or invent URLs or external sources.\n"
            "5. Address the specific quality and clarity issues raised in the feedback.\n\n"
            "Structure the report with the following exact sections:\n"
            "## Summary\n"
            "## Key Findings\n"
            "## Conclusion\n"
            "## Sources\n"
            "(In the Sources section, list all valid URLs cited in the text as bullet points.)\n\n"
            "If including comparison tables, format them using standard GitHub Flavored Markdown table syntax with a blank line before and after the table, and each row on its own distinct line (never join rows with ||)."
        )),
        ("human", (
            "Topic: {topic}\n\n"
            "Current Report:\n{report}\n\n"
            "Critic Feedback & Verification Details:\n{feedback}\n\n"
            "Available Scraped Sources:\n{sources}\n\n"
            "Produce the revised, fact-checked report with complete inline citations:"
        ))
    ])

    llm = get_llm("writer")
    chain = reviser_prompt | llm | StrOutputParser()

    logs: List[Dict[str, Any]] = []
    job_id = state.get("job_id")
    revised_report = await ainvoke_with_retry(
        chain,
        {
            "topic": topic,
            "report": current_report,
            "feedback": feedback,
            "sources": scraped_content[:25000] if scraped_content else "No sources available."
        },
        job_id=job_id,
        logs=logs,
        agent_name="ReviserAgent"
    )

    log_msg = f"Revision #{iteration} generated. Routing back to critic for verification..."
    logs.append(make_log("ReviserAgent", log_msg, "info"))
    return {
        "step": "revise",
        "report": revised_report,
        "iteration": iteration,
        "logs": logs,
    }

def route_after_critic(state: ResearchState) -> str:
    trust_score = state.get("trust_score", 0)
    iteration = state.get("iteration", 0)

    if trust_score >= TRUST_THRESHOLD or iteration >= MAX_REVISIONS:
        return END
    return "revise"

def build_research_graph():
    workflow = StateGraph(ResearchState)

    workflow.add_node("search", search_node)
    workflow.add_node("scrape", scrape_node)
    workflow.add_node("write", write_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("revise", revise_node)

    workflow.set_entry_point("search")
    workflow.add_edge("search", "scrape")
    workflow.add_edge("scrape", "write")
    workflow.add_edge("write", "critic")
    workflow.add_edge("revise", "critic")
    workflow.add_conditional_edges("critic", route_after_critic)

    return workflow.compile()

research_graph = build_research_graph()
