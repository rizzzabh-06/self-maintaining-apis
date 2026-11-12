"""In-memory event broadcaster for Server-Sent Events (SSE)."""

from __future__ import annotations

import asyncio
import datetime
import json
import logging
from typing import Any, AsyncGenerator, Dict, List

logger = logging.getLogger(__name__)


class EventBroadcaster:
    """Manages active SSE client connections and dispatches broadcast events."""

    def __init__(self, max_queue_size: int = 100) -> None:
        self._subscribers: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()
        self._max_queue_size = max_queue_size

    async def subscribe(self) -> asyncio.Queue:
        """Register a new client queue."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=self._max_queue_size)
        async with self._lock:
            self._subscribers.append(queue)
            logger.debug("SSE client subscribed. Total clients: %d", len(self._subscribers))
        return queue

    async def unsubscribe(self, queue: asyncio.Queue) -> None:
        """Unregister a client queue."""
        async with self._lock:
            if queue in self._subscribers:
                self._subscribers.remove(queue)
                logger.debug("SSE client unsubscribed. Total clients: %d", len(self._subscribers))

    async def broadcast(self, event_type: str, data: Dict[str, Any]) -> None:
        """Broadcast an event to all connected clients."""
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        async with self._lock:
            dead_queues = []
            for queue in self._subscribers:
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    dead_queues.append(queue)
                except Exception as exc:
                    logger.warning("Error putting event onto client queue: %s", exc)
                    dead_queues.append(queue)

            for dead in dead_queues:
                if dead in self._subscribers:
                    self._subscribers.remove(dead)

    def broadcast_sync(self, event_type: str, data: Dict[str, Any]) -> None:
        """Thread-safe synchronous broadcast dispatch."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(event_type, data))
        except RuntimeError:
            # When called from a background thread or without an active loop
            try:
                asyncio.run(self.broadcast(event_type, data))
            except Exception as e:
                logger.warning("Failed to broadcast sync event: %s", e)


event_broadcaster = EventBroadcaster()

