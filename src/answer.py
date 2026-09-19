"""
Stage 6B: Natural Language Question Answering (RAG) over saved video vault.

Retrieves matching notes/reels using src.search, optionally retrieves live real-time web context,
and synthesizes a grounded comparative answer using Groq (Llama 3.3 70B) or local Ollama LLM.
"""
import logging
from typing import Any

import requests
from dotenv import load_dotenv

from src import config
from src.search import retrieve_context

load_dotenv()
logger = logging.getLogger(__name__)


class AnswerError(Exception):
    """Raised when question answering fails."""
    pass


def fetch_live_web_context(query: str, max_results: int = 3) -> str:
    """Fetch live real-time search snippets to compare against historical reel data."""
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            if not results:
                return ""
            snippets = []
            for r in results:
                title = r.get("title", "")
                body = r.get("body", "")
                href = r.get("href", "")
                snippets.append(f"- [{title}]({href}): {body}")
            return "\n".join(snippets)
    except Exception as e:
        logger.warning(f"Live web search failed: {e}")
        return ""


def build_rag_prompt(question: str, contexts: list[dict[str, Any]], live_web_context: str = "") -> str:
    """Build a grounded prompt for the LLM comparing saved reel contexts and live situation."""
    context_blocks = []
    for i, c in enumerate(contexts, 1):
        block = [
            f"[Reel {i}] {c['title']}",
            f"Category: {c['category']}",
            f"URL: {c['source_url']}",
        ]
        if c.get("summary"):
            block.append(f"Summary: {c['summary']}")
        if c.get("transcript"):
            block.append(f"Transcript:\n{c['transcript']}")
        if c.get("captions"):
            block.append(f"Visual Scene Descriptions:\n{c['captions']}")
        context_blocks.append("\n".join(block))

    all_context = "\n\n---\n\n".join(context_blocks)

    live_section = ""
    if live_web_context.strip():
        live_section = f"""

=== LIVE REAL-TIME WEB DATA (TODAY) ===
{live_web_context}
=== END LIVE DATA ===
"""

    prompt = f"""You are ReelToReal, an intelligent multimodal AI assistant analyzing saved Instagram Reels and YouTube Shorts.

Instructions:
1. Answer the question directly and helpfully based on the SAVED REELS CONTEXT.
2. If LIVE REAL-TIME WEB DATA is provided, compare what was recorded in the reel vs the current situation today (e.g., price changes, new updates, current status).
3. If visual details from frames or spoken audio transcript help answer the question, cite them.
4. At the end of your answer, mention the reel title and URL as source reference.
5. If the context does not contain enough information, state what you know and clearly explain what is missing without hallucinating.

=== SAVED REELS CONTEXT ===
{all_context}
=== END SAVED REELS CONTEXT ==={live_section}

Question: {question}

Helpful Grounded & Comparative Answer:"""
    return prompt


def _answer_with_groq(prompt: str, api_key: str, model_name: str | None = None) -> str:
    """Generate answer using Groq API."""
    import groq
    client = groq.Groq(api_key=api_key)
    model = model_name or config.GROQ_MODEL or "llama-3.3-70b-versatile"
    
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are ReelToReal, an expert assistant that analyzes video vault content, compares past video claims with real-time reality, and provides clear, grounded answers.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=600,
    )
    return completion.choices[0].message.content.strip()


def _answer_with_ollama(prompt: str, model_name: str | None = None) -> str:
    """Generate answer using local Ollama LLM."""
    llm_model = model_name or config.OLLAMA_LLM_MODEL
    url = f"{config.OLLAMA_HOST}/api/generate"
    payload = {
        "model": llm_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 400,
        },
    }
    resp = requests.post(url, json=payload, timeout=90)
    resp.raise_for_status()
    return resp.json().get("response", "").strip()


def answer_question(
    question: str,
    category: str | None = None,
    top_k: int = 3,
    model: str | None = None,
    enable_live_search: bool = True,
) -> dict[str, Any]:
    """
    Answer a natural language question over the vault, comparing historical reel data with live reality.

    Args:
        question: User's natural language query.
        category: Optional category filter.
        top_k:    Number of top relevant notes to retrieve.
        model:    Override model name.
        enable_live_search: Whether to fetch live web data for situational comparison.

    Returns:
        Dict with keys: question, answer, sources, provider, has_results.
    """
    contexts = retrieve_context(question, top_k=top_k, category=category)

    if not contexts:
        return {
            "question": question,
            "answer": "I couldn't find any saved reels in your vault related to that topic.",
            "sources": [],
            "provider": "none",
            "has_results": False,
        }

    # Fetch live web snippets if enabled
    live_web_context = ""
    if enable_live_search:
        live_web_context = fetch_live_web_context(question, max_results=3)

    prompt = build_rag_prompt(question, contexts, live_web_context)
    provider = "ollama"
    answer_text = ""

    # 1. Primary: Try Groq if GROQ_API_KEY is present
    groq_key = config.GROQ_API_KEY
    if groq_key:
        try:
            answer_text = _answer_with_groq(prompt, groq_key, model)
            provider = f"groq ({config.GROQ_MODEL})"
        except Exception as e:
            logger.warning(f"Groq generation failed ({e}), falling back to Ollama...")

    # 2. Fallback: Local Ollama
    if not answer_text:
        try:
            answer_text = _answer_with_ollama(prompt, model)
            provider = f"ollama ({config.OLLAMA_LLM_MODEL})"
        except requests.RequestException as e:
            raise AnswerError(
                f"Failed to communicate with LLM provider (Ollama & Groq): {e}"
            ) from e

    sources = [
        {
            "video_id": c["video_id"],
            "title": c["title"],
            "category": c["category"],
            "source_url": c["source_url"],
            "note_path": c["note_path"],
        }
        for c in contexts
    ]

    return {
        "question": question,
        "answer": answer_text,
        "sources": sources,
        "provider": provider,
        "has_results": True,
    }

