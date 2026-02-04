#!/usr/bin/env python3
"""
Reproducible Cerebras streaming benchmark.

Measures:
- TTFT (time to first token) based on client wall clock
- ITL (inter-token latency) based on client wall clock
- E2E (end-to-end) wall clock
- API usage + completion_time when available

Example:
  python scripts/benchmark_cerebras.py --model gpt-oss-120b --runs 3 --prompt "Should we pivot to B2B?"
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import time
from typing import Any, Dict, List, Optional

from cerebras.cloud.sdk import Cerebras


def _percentile(values: List[float], pct: float) -> Optional[float]:
    if not values:
        return None
    xs = sorted(values)
    idx = int(round((len(xs) - 1) * pct))
    return xs[max(0, min(idx, len(xs) - 1))]


def run_once(client: Cerebras, model: str, system: str, prompt: str) -> Dict[str, Any]:
    start = time.perf_counter()
    first = None
    prev = None
    itls: List[float] = []
    chunks = 0

    final_usage = None
    final_time_info = None

    stream = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        stream=True,
    )

    for chunk in stream:
        now = time.perf_counter()

        # Usage + timing typically appear near the end of stream
        if hasattr(chunk, "usage") and chunk.usage:
            final_usage = chunk.usage
        if hasattr(chunk, "time_info") and chunk.time_info:
            final_time_info = chunk.time_info

        content = getattr(chunk.choices[0].delta, "content", None)
        if content:
            chunks += 1
            if first is None:
                first = now
            else:
                if prev is not None:
                    itls.append(now - prev)
            prev = now

    end = time.perf_counter()

    ttft_ms = (first - start) * 1000 if first is not None else None
    e2e_ms = (end - start) * 1000

    itl_avg_ms = (sum(itls) / len(itls)) * 1000 if itls else None
    itl_p50_ms = (_percentile(itls, 0.50) * 1000) if itls else None
    itl_p95_ms = (_percentile(itls, 0.95) * 1000) if itls else None

    prompt_tokens = getattr(final_usage, "prompt_tokens", None) if final_usage else None
    completion_tokens = getattr(final_usage, "completion_tokens", None) if final_usage else None
    total_tokens = getattr(final_usage, "total_tokens", None) if final_usage else None

    completion_time = getattr(final_time_info, "completion_time", None) if final_time_info else None
    api_tps = (completion_tokens / completion_time) if completion_tokens and completion_time and completion_time > 0 else None

    return {
        "model": model,
        "ttftMs": int(round(ttft_ms)) if ttft_ms is not None else None,
        "itlAvgMs": int(round(itl_avg_ms)) if itl_avg_ms is not None else None,
        "itlP50Ms": int(round(itl_p50_ms)) if itl_p50_ms is not None else None,
        "itlP95Ms": int(round(itl_p95_ms)) if itl_p95_ms is not None else None,
        "e2eMs": int(round(e2e_ms)),
        "chunks": chunks,
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "totalTokens": total_tokens,
        "completionTimeSec": completion_time,
        "apiTokensPerSecond": api_tps,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="gpt-oss-120b")
    parser.add_argument("--runs", type=int, default=3)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--system", default="You are a helpful assistant.")
    args = parser.parse_args()

    api_key = os.environ.get("CEREBRAS_API_KEY")
    if not api_key:
        raise SystemExit("Missing CEREBRAS_API_KEY in environment.")

    client = Cerebras(api_key=api_key)

    results: List[Dict[str, Any]] = []
    for i in range(args.runs):
        res = run_once(client, args.model, args.system, args.prompt)
        res["run"] = i + 1
        results.append(res)
        print(json.dumps(res))

    # Summary
    e2e = [r["e2eMs"] for r in results if isinstance(r.get("e2eMs"), int)]
    ttft = [r["ttftMs"] for r in results if isinstance(r.get("ttftMs"), int)]
    api_tps = [r["apiTokensPerSecond"] for r in results if isinstance(r.get("apiTokensPerSecond"), (int, float))]

    summary = {
        "model": args.model,
        "runs": args.runs,
        "e2eMs_p50": int(round(statistics.median(e2e))) if e2e else None,
        "ttftMs_p50": int(round(statistics.median(ttft))) if ttft else None,
        "apiTokensPerSecond_p50": float(statistics.median(api_tps)) if api_tps else None,
    }
    print(json.dumps({"summary": summary}))


if __name__ == "__main__":
    main()

