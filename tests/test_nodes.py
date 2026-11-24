import pytest
from unittest.mock import patch, AsyncMock
from backend.agents import (
    search_node,
    scrape_node,
    write_node,
    critic_node,
    revise_node,
)
from backend.verification import verify_citations, apply_trust_score_formula

@pytest.mark.asyncio
@patch('backend.agents.asyncio.to_thread')
async def test_search_node_dedupe_and_exclusions(mock_to_thread):
    mock_to_thread.side_effect = [
        "Title: T1\nURL: https://nature.com/article1\nSnippet: S1\n----\nTitle: T2\nURL: https://badsite.com/spam\nSnippet: S2\n",
        "Title: T3\nURL: https://nature.com/article1\nSnippet: S3\n----\nTitle: T4\nURL: https://bbc.com/news1\nSnippet: S4\n"
    ]
    state = {
        "topic": "Fusion Energy",
        "pinned_urls": ["https://mit.edu/fusion"],
        "excluded_urls": ["https://badsite.com/spam"]
    }
    result = await search_node(state)

    assert result["step"] == "search"
    urls = [s["url"] for s in result["sources"]]
    # Pinned URL should be first
    assert urls[0] == "https://mit.edu/fusion"
    # Excluded URL must be filtered out
    assert "https://badsite.com/spam" not in urls
    # Nature article should only appear once (deduped)
    assert urls.count("https://nature.com/article1") == 1
    # Badges/tier attached
    assert result["sources"][0]["tier"] == "high"

@pytest.mark.asyncio
@patch('backend.agents.asyncio.to_thread')
async def test_scrape_node_status_and_short_skipped(mock_to_thread):
    def fake_scrape(fn, url):
        if "good" in url:
            return "This is a comprehensive research publication with plenty of detailed text data." * 5
        elif "short" in url:
            return "Too short"  # under 100 chars
        else:
            return "Could not scrape URL: 404 Not Found"

    mock_to_thread.side_effect = fake_scrape

    state = {
        "sources": [
            {"url": "https://example.com/good", "title": "Good Source", "status": "pending"},
            {"url": "https://example.com/short", "title": "Short Source", "status": "pending"},
            {"url": "https://example.com/bad", "title": "Bad Source", "status": "pending"}
        ]
    }
    result = await scrape_node(state)
    assert result["step"] == "read"
    sources_dict = {s["url"]: s["status"] for s in result["sources"]}
    assert sources_dict["https://example.com/good"] == "scraped"
    assert sources_dict["https://example.com/short"] == "failed"
    assert sources_dict["https://example.com/bad"] == "failed"
    assert "[https://example.com/good]" in result["scraped_content"]

@pytest.mark.asyncio
@patch('backend.agents.get_llm')
async def test_write_node_generation_and_verification(mock_get_llm):
    mock_runnable = AsyncMock()
    mock_runnable.ainvoke.return_value = (
        "## Summary\nRecent tests show 10x gains in net power (https://nature.com/fusion).\n\n"
        "## Key Findings\n- Major milestone accomplished (https://nature.com/fusion).\n\n"
        "## Conclusion\nFusion is approaching viability.\n\n"
        "## Sources\n- https://nature.com/fusion"
    )
    with patch('backend.agents.ChatPromptTemplate.from_messages') as mock_prompt:
        mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_runnable
        state = {
            "topic": "Fusion",
            "scraped_content": "[https://nature.com/fusion]\nPlasma density was sustained.",
            "sources": [{"url": "https://nature.com/fusion", "status": "scraped"}]
        }
        res = await write_node(state)
        assert res["step"] == "write"
        assert "## Summary" in res["report"]
        assert res["verification"]["coverage_percentage"] > 0
        assert len(res["verification"]["fabricated_citations"]) == 0

@pytest.mark.asyncio
@patch('backend.agents.get_llm')
async def test_critic_node_parsing_and_fabricated_penalty(mock_get_llm):
    mock_runnable = AsyncMock()
    mock_runnable.ainvoke.return_value = (
        "Trust Score: 95\nQuality Score: 90\n\nIssues:\n- Minor formatting note."
    )
    with patch('backend.agents.ChatPromptTemplate.from_messages') as mock_prompt:
        mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_runnable
        report_with_fake = (
            "## Summary\nBreakthrough achieved (https://fake-hallucination.com/bogus).\n\n"
            "## Key Findings\n- New catalyst discovered (https://fake-hallucination.com/bogus).\n\n"
            "## Conclusion\nDone."
        )
        state = {
            "report": report_with_fake,
            "iteration": 0,
            "sources": [{"url": "https://nature.com/real", "status": "scraped"}]
        }
        res = await critic_node(state)
        assert res["step"] == "critic"
        # Trust score must be penalized by at least 25 points for fabricated citation
        assert res["trust_score"] <= 70
        assert "fake-hallucination.com" in res["feedback"]

@pytest.mark.asyncio
@patch('backend.agents.get_llm')
async def test_critic_node_parse_failure_fallback_to_zero(mock_get_llm):
    mock_runnable = AsyncMock()
    # Output that does not contain 'Trust Score: X'
    mock_runnable.ainvoke.return_value = "This report is interesting and nicely written with great points."
    with patch('backend.agents.ChatPromptTemplate.from_messages') as mock_prompt:
        mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_runnable
        state = {
            "report": "## Summary\nText",
            "iteration": 0,
            "sources": []
        }
        res = await critic_node(state)
        # Never silently defaults to 75, falls back to 0 on parsing failure!
        assert res["trust_score"] == 0
        assert res["quality_score"] == 0

@pytest.mark.asyncio
@patch('backend.agents.get_llm')
async def test_revise_node(mock_get_llm):
    mock_runnable = AsyncMock()
    mock_runnable.ainvoke.return_value = "## Summary\nRevised text with correct citation (https://example.com)."
    with patch('backend.agents.ChatPromptTemplate.from_messages') as mock_prompt:
        mock_prompt.return_value.__or__.return_value.__or__.return_value = mock_runnable
        state = {
            "topic": "Biofuel",
            "report": "Old draft",
            "feedback": "Needs citation",
            "scraped_content": "[https://example.com]\nBiofuel facts",
            "iteration": 0
        }
        res = await revise_node(state)
        assert res["step"] == "revise"
        assert res["iteration"] == 1
        assert "Revised text" in res["report"]

@pytest.mark.asyncio
@patch('backend.agents.asyncio.to_thread')
async def test_search_node_canonical_query_param_dedupe(mock_to_thread):
    mock_to_thread.side_effect = [
        "Title: A1\nURL: https://news.com/story?ref=1\nSnippet: S1\n----\nTitle: A2\nURL: https://news.com/story?ref=2\nSnippet: S2\n",
        "Title: A3\nURL: https://news.com/story\nSnippet: S3\n----\nTitle: A4\nURL: https://other.com/page\nSnippet: S4\n"
    ]
    state = {"topic": "AI", "pinned_urls": [], "excluded_urls": []}
    result = await search_node(state)
    urls = [s["url"] for s in result["sources"]]
    # Should only have 1 instance of news.com/story despite different query params
    assert len(urls) == 2
    assert "https://other.com/page" in urls

def test_verify_citations_normalized_matching():
    scraped = ["https://example.com/article"]
    report = (
        "## Summary\n"
        "This is a key claim from the research publication (https://example.com/article?tracking=123).\n\n"
        "## Key Findings\n"
        "- Finding number one here (https://example.com/article).\n\n"
        "## Conclusion\n"
        "Final summary sentence."
    )
    result = verify_citations(report, scraped)
    assert len(result["valid_citations"]) >= 1
    assert len(result["fabricated_citations"]) == 0
    assert result["coverage_percentage"] > 0

@pytest.mark.asyncio
async def test_ainvoke_with_retry_handles_429():
    from backend.agents import ainvoke_with_retry
    mock_chain = AsyncMock()
    # First attempt raises 429 rate limit error, second succeeds
    mock_chain.ainvoke.side_effect = [
        Exception('Error response 429 while fetching https://api.mistral.ai/v1/chat/completions: {"message": "Rate limit exceeded"}'),
        "Success response after retry"
    ]
    logs = []
    res = await ainvoke_with_retry(
        mock_chain,
        {"input": "test"},
        max_retries=3,
        base_delay=0.01,
        logs=logs,
        agent_name="TestAgent"
    )
    assert res == "Success response after retry"
    assert mock_chain.ainvoke.call_count == 2
    assert any("rate limit" in log["message"].lower() for log in logs)

