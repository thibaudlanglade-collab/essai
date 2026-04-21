from fastapi import APIRouter
import config

router = APIRouter()

@router.get("/debug/test-llm")
async def test_llm():
    """Test the LLM connection from inside the running server process."""
    import os
    import httpx

    key = config.OPENAI_API_KEY
    result = {
        "key_loaded": bool(key),
        "key_prefix": key[:12] + "..." if key else "EMPTY",
        "OPENAI_BASE_URL_env": os.environ.get("OPENAI_BASE_URL", "not set"),
    }

    # Raw HTTP call — no SDK, just httpx directly
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": "Say: OK"}],
                    "max_tokens": 5,
                },
                timeout=15,
            )
        result["http_status"] = resp.status_code
        result["response_body"] = resp.json()
        result["response_url"] = str(resp.url)
    except Exception as e:
        result["error"] = str(e)

    return result
