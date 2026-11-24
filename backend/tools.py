from langchain.tools import tool
import requests
from bs4 import BeautifulSoup
from tavily import TavilyClient
import os
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

try:
    from .config import TAVILY_API_KEY
except ImportError:
    from config import TAVILY_API_KEY

tavily = TavilyClient(api_key=TAVILY_API_KEY)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type(Exception),
    reraise=True
)
def _tavily_search_with_retry(query: str, max_results: int = 5):
    return tavily.search(query=query, max_results=max_results)

@tool
def web_search(query: str) -> str:
    """Search the web for recent and reliable information on a topic. Returns Titles, URLs and snippets."""
    try:
        results = _tavily_search_with_retry(query=query, max_results=5)
        out = []
        for r in results.get("results", []):
            title = r.get("title", "")
            url = r.get("url", "")
            snippet = r.get("content", "")[:300]
            out.append(f"Title: {title}\nURL: {url}\nSnippet: {snippet}\n")
        return "\n----\n".join(out)
    except Exception as e:
        return f"Search error: {str(e)}"

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=4),
    retry=retry_if_exception_type(requests.RequestException),
    reraise=True
)
def _scrape_with_retry(url: str, timeout: int = 8) -> str:
    resp = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    return soup.get_text(separator=" ", strip=True)

@tool
def scrape_url(url: str) -> str:
    """Scrape and return clean text content from a given URL for deeper reading."""
    try:
        text = _scrape_with_retry(url, timeout=8)
        return text[:3000]
    except Exception as e:
        return f"Could not scrape URL: {str(e)}"
