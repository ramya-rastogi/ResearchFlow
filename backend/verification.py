import re
from urllib.parse import urlparse
from typing import List, Dict, Any

URL_REGEX = re.compile(
    r'https?://[a-zA-Z0-9\-._~:/?#\[\]@!$&\'()*+,;=%]+'
)

def extract_sources(text: str) -> List[str]:
    """Extract all URLs found in a text."""
    if not text:
        return []
    matches = URL_REGEX.findall(text)
    # Clean trailing punctuation often caught in markdown
    cleaned = []
    for m in matches:
        m = m.rstrip(').,;!?\'"')
        if m and m not in cleaned:
            cleaned.append(m)
    return cleaned

def extract_cited_urls(text: str) -> List[str]:
    """Extract inline cited URLs from a report."""
    return extract_sources(text)

def score_source(url: str) -> Dict[str, str]:
    """
    Tiering rules:
    - .gov, .edu, major standards bodies -> "high" ("Government/Academic")
    - Known major news/reference outlets -> "medium" ("Major News/Reference")
    - Personal blogs, medium, blogspot -> "low" ("Blog/Personal")
    - Unclassified -> "unknown" ("Unknown")
    """
    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]

    # High tier
    if domain.endswith(".gov") or domain.endswith(".edu") or domain in ["w3.org", "ieee.org", "who.int", "nih.gov", "cdc.gov", "arxiv.org"]:
        return {
            "url": url,
            "domain": domain,
            "tier": "high",
            "label": "Government/Academic",
            "reason": "Official government, academic, or standards domain"
        }

    # Medium tier
    medium_domains = [
        "reuters.com", "apnews.com", "bbc.co.uk", "bbc.com",
        "nature.com", "wikipedia.org", "nytimes.com", "wsj.com",
        "theguardian.com", "techcrunch.com", "bloomberg.com", "sciencedirect.com"
    ]
    if any(domain == md or domain.endswith("." + md) for md in medium_domains):
        return {
            "url": url,
            "domain": domain,
            "tier": "medium",
            "label": "Major News/Reference",
            "reason": "Known major news or reference outlet"
        }

    # Low tier
    if any(k in domain for k in ["blog", "wordpress.com", "blogspot.com", "medium.com", "substack.com"]):
        return {
            "url": url,
            "domain": domain,
            "tier": "low",
            "label": "Blog/Personal",
            "reason": "Identified as a personal blog or self-published platform"
        }

    return {
        "url": url,
        "domain": domain,
        "tier": "unknown",
        "label": "Unknown",
        "reason": "Could not automatically classify the domain"
    }

def normalize_url(url: str) -> str:
    """Normalize URL by stripping fragments, tracking queries, and trailing slashes."""
    if not url:
        return ""
    clean = url.rstrip(').,;!?\'"/').strip()
    try:
        parsed = urlparse(clean)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed.path.rstrip('/')
        return f"{parsed.scheme.lower()}://{netloc}{path}"
    except Exception:
        return clean.lower()

def verify_citations(report: str, scraped_urls: List[str]) -> Dict[str, Any]:
    """
    Deterministic check:
    - Extracts all cited URLs.
    - Fabricated citations: cited URLs not present in scraped_urls.
    - Citation coverage: share of factual sentences/bullets containing a valid citation.
    """
    if not report:
        return {
            "cited_urls": [],
            "valid_citations": [],
            "fabricated_citations": [],
            "citation_coverage": 0.0,
            "coverage_percentage": 0,
            "total_claims": 0,
            "cited_claims": 0
        }

    cited_urls = extract_cited_urls(report)
    scraped_set = set(u.rstrip('/') for u in scraped_urls)
    scraped_norm_map = {normalize_url(u): u for u in scraped_urls if u}

    fabricated = []
    valid_citations = []
    for u in cited_urls:
        norm = u.rstrip('/')
        norm_key = normalize_url(u)
        if norm in scraped_set or norm_key in scraped_norm_map:
            if u not in valid_citations:
                valid_citations.append(u)
        else:
            if u not in fabricated:
                fabricated.append(u)

    # Break report into lines/sentences to compute coverage
    lines = [line.strip() for line in report.split("\n") if line.strip()]
    claim_lines = [
        l for l in lines 
        if not l.startswith("#") and len(l) > 25 and not l.lower().startswith("sources:")
    ]

    total_claims = len(claim_lines)
    cited_claims = 0
    if total_claims > 0:
        for claim in claim_lines:
            has_match = any(
                valid_url in claim or normalize_url(valid_url) in normalize_url(claim)
                for valid_url in (valid_citations or scraped_urls)
            )
            if has_match:
                cited_claims += 1
        coverage = cited_claims / total_claims
    else:
        coverage = 1.0 if valid_citations else 0.0

    return {
        "cited_urls": cited_urls,
        "valid_citations": valid_citations,
        "fabricated_citations": fabricated,
        "citation_coverage": round(coverage, 2),
        "coverage_percentage": int(round(coverage * 100)),
        "total_claims": total_claims,
        "cited_claims": cited_claims
    }

def apply_trust_score_formula(raw_trust: int, verification: Dict[str, Any]) -> int:
    """
    Visible formula:
    trust_score = raw_model_score
                  - (25 points * count of fabricated citations)
                  - (penalty for coverage < 70%: up to 30 points)
    Clamped to [0, 100].
    """
    num_fabricated = len(verification.get("fabricated_citations", []))
    coverage = verification.get("citation_coverage", 1.0)
    
    # 25 points deducted per fabricated citation
    fabricated_penalty = num_fabricated * 25
    
    # Coverage penalty: if coverage < 0.70, deduct up to 30 points
    coverage_penalty = int(max(0.0, 0.70 - coverage) * 45)
    
    final_score = raw_trust - fabricated_penalty - coverage_penalty
    return max(0, min(100, final_score))

def extract_score(feedback: str) -> int:
    """Extracts score out of 10 from critic's feedback string."""
    match = re.search(r'Score:\s*\*?\*?\s*(\d+(?:\.\d+)?)\s*\*?\*?\s*/\s*10', feedback, re.IGNORECASE)
    if match:
        try:
            return int(round(float(match.group(1))))
        except ValueError:
            return 0
    # Also support 0-100 scale conversion if needed
    match_100 = re.search(r'Trust Score:\s*(\d+)', feedback, re.IGNORECASE)
    if match_100:
        try:
            return int(round(float(match_100.group(1)) / 10.0))
        except ValueError:
            return 0
    return 0
