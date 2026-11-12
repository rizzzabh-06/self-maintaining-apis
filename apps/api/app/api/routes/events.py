"""FastAPI routes for Server-Sent Events (SSE) streaming."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from apps.api.app.core.events import event_broadcaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.get("/stream")
async def stream_events(request: Request) -> StreamingResponse:
    """Stream real-time system events (webhooks, scans, migrations) to clients via SSE."""
    queue = await event_broadcaster.subscribe()

    async def event_generator() -> AsyncGenerator[str, None]:
        # Initial ping on connect to establish stream
        yield f"event: connected\ndata: {json.dumps({'message': 'Connected to live event stream'})}\n\n"

        try:
            while True:
                # Check for client disconnect
                if await request.is_disconnected():
                    break

                try:
                    # Wait up to 15s for an event, or emit a heartbeat keep-alive
                    event_msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    event_type = event_msg.get("type", "message")
                    payload = json.dumps(event_msg)
                    yield f"event: {event_type}\ndata: {payload}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive comment to prevent proxy timeouts
                    yield ": keep-alive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await event_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/status")
def get_stream_status():
    """Diagnostic check for SSE stream readiness."""
    return {
        "status": "ready",
        "active_subscribers": len(event_broadcaster._subscribers),
    }

