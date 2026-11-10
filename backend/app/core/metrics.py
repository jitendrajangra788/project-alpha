"""In-process metrics for monitoring (Prometheus text + JSON)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict
from typing import Dict

_lock = threading.Lock()
_started_at = time.time()
_request_count = 0
_status_counts: Dict[str, int] = defaultdict(int)
_path_counts: Dict[str, int] = defaultdict(int)
_latency_total_ms = 0.0


def record_request(path: str, method: str, status: int, elapsed_ms: float) -> None:
    global _request_count, _latency_total_ms
    # Normalize dynamic IDs a bit
    safe_path = path
    with _lock:
        _request_count += 1
        _status_counts[str(status)] += 1
        _path_counts[f"{method} {safe_path}"] += 1
        _latency_total_ms += elapsed_ms


def snapshot() -> dict:
    with _lock:
        avg = (_latency_total_ms / _request_count) if _request_count else 0.0
        return {
            "uptime_seconds": round(time.time() - _started_at, 1),
            "request_count": _request_count,
            "avg_latency_ms": round(avg, 2),
            "status_counts": dict(_status_counts),
            "top_paths": dict(sorted(_path_counts.items(), key=lambda kv: kv[1], reverse=True)[:20]),
        }


def prometheus_text() -> str:
    data = snapshot()
    lines = [
        "# HELP careconnect_uptime_seconds Process uptime",
        "# TYPE careconnect_uptime_seconds gauge",
        f"careconnect_uptime_seconds {data['uptime_seconds']}",
        "# HELP careconnect_http_requests_total Total HTTP requests",
        "# TYPE careconnect_http_requests_total counter",
        f"careconnect_http_requests_total {data['request_count']}",
        "# HELP careconnect_http_avg_latency_ms Average request latency",
        "# TYPE careconnect_http_avg_latency_ms gauge",
        f"careconnect_http_avg_latency_ms {data['avg_latency_ms']}",
    ]
    for status, count in data["status_counts"].items():
        lines.append(f'careconnect_http_responses_total{{status="{status}"}} {count}')
    return "\n".join(lines) + "\n"
