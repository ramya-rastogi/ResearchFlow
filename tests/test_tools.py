import pytest
from unittest.mock import patch, MagicMock
from backend.tools import web_search, scrape_url

@patch('backend.tools.tavily')
def test_web_search_formatting(mock_tavily):
    mock_tavily.search.return_value = {
        'results': [
            {'title': 'Quantum Computing Advances', 'url': 'https://example.com/quantum', 'content': 'Summary content of quantum computing breakthrough.'}
        ]
    }
    result = web_search.invoke("quantum computing")
    assert "Title: Quantum Computing Advances" in result
    assert "URL: https://example.com/quantum" in result
    assert "Snippet: Summary content of quantum computing breakthrough." in result

@patch('backend.tools.requests.get')
def test_scrape_url_success_and_stripping(mock_get):
    mock_resp = MagicMock()
    mock_resp.text = """
    <html>
      <head><style>.ad { color: red; }</style></head>
      <body>
        <nav><a href="/">Home</a></nav>
        <p>This is genuine research content about sustainable aviation fuels.</p>
        <script>console.log("tracker");</script>
        <footer>Copyright 2026</footer>
      </body>
    </html>
    """
    mock_resp.raise_for_status.return_value = None
    mock_get.return_value = mock_resp

    result = scrape_url.invoke("https://example.com/fuel")
    assert "This is genuine research content about sustainable aviation fuels." in result
    assert "console.log" not in result
    assert ".ad {" not in result
    assert "Home" not in result
    assert "Copyright 2026" not in result

@patch('backend.tools.requests.get')
def test_scrape_url_failure(mock_get):
    import requests
    mock_get.side_effect = requests.RequestException("Connection timed out")
    result = scrape_url.invoke("https://example.com/error")
    assert "Could not scrape URL" in result
    assert "Connection timed out" in result
