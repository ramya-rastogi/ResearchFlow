from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ResearchRequest(BaseModel):
    topic: str
    pinnedUrls: Optional[List[str]] = Field(default_factory=list)
    excludedUrls: Optional[List[str]] = Field(default_factory=list)

class SteerRequest(BaseModel):
    pinnedUrls: Optional[List[str]] = Field(default_factory=list)
    excludedUrls: Optional[List[str]] = Field(default_factory=list)

class SourceItem(BaseModel):
    url: str
    title: Optional[str] = None
    domain: Optional[str] = None
    tier: Optional[str] = "unknown"
    label: Optional[str] = "Unknown"
    reason: Optional[str] = ""
    status: Optional[str] = "pending"  # pending, scraped, failed
    pinned: Optional[bool] = False

class RevisionItem(BaseModel):
    iteration: int
    score: int
    quality_score: Optional[int] = None
    feedback: str

class VerificationData(BaseModel):
    cited_urls: List[str] = Field(default_factory=list)
    valid_citations: List[str] = Field(default_factory=list)
    fabricated_citations: List[str] = Field(default_factory=list)
    citation_coverage: float = 0.0
    coverage_percentage: int = 0
    total_claims: int = 0
    cited_claims: int = 0

class JobScores(BaseModel):
    trust_score: int = 0
    quality_score: int = 0
    final_score: int = 0  # 1-10 scale
    citation_coverage: int = 0

class JobResult(BaseModel):
    initial_report: Optional[str] = None
    initial_score: Optional[int] = None
    initial_feedback: Optional[str] = None
    revised_report: Optional[str] = None
    revised_score: Optional[int] = None
    revised_feedback: Optional[str] = None
    final_report: Optional[str] = None
    was_revised: bool = False
    sources: List[SourceItem] = Field(default_factory=list)
    search_results: Optional[str] = None
    scraped_content: Optional[str] = None
    revisions: List[RevisionItem] = Field(default_factory=list)
    verification: Optional[VerificationData] = None

class LogEntry(BaseModel):
    id: str
    agent: str
    type: str = "info"  # info, success, warning, error
    message: str
    source_url: Optional[str] = None
    timestamp: float

class JobStatus(BaseModel):
    job_id: str
    id: Optional[str] = None
    topic: str
    status: str  # "running", "completed", "failed"
    step: str    # "search", "read", "write", "critic", "revise", "done", "error"
    result: Optional[JobResult] = None
    results: Optional[JobResult] = None
    scores: Optional[JobScores] = None
    sources: Optional[List[SourceItem]] = Field(default_factory=list)
    steering: Optional[Dict[str, Any]] = None
    logs: List[LogEntry] = Field(default_factory=list)
    created_at: float
    updated_at: float

class HistoryEntry(BaseModel):
    job_id: str
    topic: str
    status: str
    final_score: Optional[int] = None
    trust_score: Optional[int] = None
    quality_score: Optional[int] = None
    was_revised: bool = False
    created_at: float
