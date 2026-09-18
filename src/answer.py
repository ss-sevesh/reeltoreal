"""
Stage 6B: Natural Language Question Answering (RAG) over saved video vault.

Retrieves matching notes/reels using src.search and synthesizes a grounded answer
with citations using the local Ollama LLM (qwen2.5:1.5b).
"""
import requests
from typing import Any

from src import config
from src.search import retrieve_context


class AnswerError(Exception):
    """Raised when question answering fails."""
    pass


def build_rag_prompt(question: str, contexts: list[dict[str, Any]]) -> str:
    """Build a grounded prompt for the LLM using retrieved reel contexts."""
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

    prompt = f"""You are ReelToReal, an AI assistant answering questions about the user's saved Instagram Reels and YouTube Shorts vault.

Instructions:
1. Answer the question directly and concisely based ONLY on the provided context below.
2. If visual details from frames or spoken audio transcript help answer the question, cite them.
3. At the end of your answer, mention the reel title and URL as source reference.
4. If the provided context does not contain enough information to answer, state clearly that you don't have that information in your saved reels. Do NOT hallucinate.

=== SAVED REELS CONTEXT ===
{all_context}
=== END CONTEXT ===

Question: {question}

Helpful Grounded Answer:"""
    return prompt


def answer_question(
    question: str,
    category: str | None = None,
    top_k: int = 3,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Answer a natural language question over the vault.

    Args:
        question: User's natural language query.
        category: Optional category filter (animal, food, travel, etc.).
        top_k:    Number of top relevant notes to retrieve for grounding.
        model:    Override Ollama LLM model name.

    Returns:
        Dict with keys: question, answer, sources, has_results.
    """
    contexts = retrieve_context(question, top_k=top_k, category=category)

    if not contexts:
        return {
            "question": question,
            "answer": "I couldn't find any saved reels in your vault related to that topic.",
            "sources": [],
            "has_results": False,
        }

    prompt = build_rag_prompt(question, contexts)
    llm_model = model or config.OLLAMA_LLM_MODEL
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

    try:
        resp = requests.post(url, json=payload, timeout=90)
        resp.raise_for_status()
    except requests.RequestException as e:
        raise AnswerError(
            f"Failed to communicate with Ollama at {config.OLLAMA_HOST} (model: {llm_model}): {e}"
        ) from e

    answer_text = resp.json().get("response", "").strip()

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
        "has_results": True,
    }
