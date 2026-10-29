#!/usr/bin/env python3
"""Paired topic-root effect summaries; no models, network, or output files.

Input JSON schema (all pairs must already be adjudicated and aggregated):
{
  "record_kind": "human_adjudicated_topic_root_pairs",
  "meta_a": {"track":"T2", "profile":"Core-Q", "mode":"fixed_corpus",
             "conditions_id":"FROZEN_COMMON_CONDITIONS_ID"},
  "meta_b": {"track":"T2", "profile":"Core-Q", "mode":"fixed_corpus",
             "conditions_id":"FROZEN_COMMON_CONDITIONS_ID"},
  "assertions": {"human_adjudicated":true, "topic_root_aggregated":true,
                 "one_to_one_pairs":true},
  "pairs": [{"topic_root_id":"ROOT_ID", "stratum":"STRATUM_ID",
             "quality_a":0, "quality_b":0, "critical_a":0, "critical_b":0}]
}

The schema example is structural, not a real result. Tests use record_kind
"synthetic_test_fixture", which is preserved prominently in the output.

Estimand: the mean A-minus-B difference, giving each supplied topic root one
equal weight. Stratified resampling preserves the observed stratum sizes;
it does not give equal weight to strata or target an external population.
Each root's A/B quality and critical indicators are resampled together.
The 95% percentile CIs are marginal, unadjusted, conditional on this frozen
reference/scoring/conditions and on the supplied root summaries. They do not
estimate rater, stochastic-run, or reference-construction variance not already
captured by an appropriate design. A small sample is not made sufficient by
requesting many bootstrap draws. No pass/fail, p value, or clinical effect is
inferred. Matching declarations cannot verify the declarations themselves.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


META_KEYS = {"track", "profile", "mode", "conditions_id"}
PAIR_KEYS = {
    "topic_root_id", "stratum", "quality_a", "quality_b", "critical_a", "critical_b"
}
ASSERTION_KEYS = {"human_adjudicated", "topic_root_aggregated", "one_to_one_pairs"}
INPUT_KEYS = {"record_kind", "meta_a", "meta_b", "assertions", "pairs"}
KINDS = {"human_adjudicated_topic_root_pairs", "synthetic_test_fixture"}


class InputError(ValueError):
    """The submitted data are not eligible for this paired summary tool."""


def _object(value: Any, name: str, required: set[str]) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise InputError(f"{name} must be a JSON object")
    missing = required - value.keys()
    extra = value.keys() - required
    if missing or extra:
        raise InputError(
            f"{name} fields mismatch; missing={sorted(missing)}, unexpected={sorted(extra)}. "
            "Counts, weights, outcome rows, and repeated-run rows are not independent roots."
        )
    return value


def _identifier(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value or value != value.strip():
        raise InputError(f"{name} must be a nonempty string with no surrounding whitespace")
    return value


def _quality(value: Any, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise InputError(f"{name} must be a finite number in [0,100]")
    try:
        number = float(value)
    except (OverflowError, ValueError):
        raise InputError(f"{name} must be a finite number in [0,100]") from None
    if not math.isfinite(number) or not 0 <= number <= 100:
        raise InputError(f"{name} must be a finite number in [0,100]")
    return number


def validate(data: Any) -> tuple[dict[str, str], list[dict[str, Any]]]:
    data = _object(data, "input", INPUT_KEYS)
    if not isinstance(data["record_kind"], str) or data["record_kind"] not in KINDS:
        raise InputError("record_kind must declare adjudicated topic-root pairs or synthetic_test_fixture")
    meta_a = _object(data["meta_a"], "meta_a", META_KEYS)
    meta_b = _object(data["meta_b"], "meta_b", META_KEYS)
    for side, meta in (("a", meta_a), ("b", meta_b)):
        for key in sorted(META_KEYS):
            _identifier(meta[key], f"meta_{side}.{key}")
    if meta_a != meta_b:
        changed = sorted(key for key in META_KEYS if meta_a[key] != meta_b[key])
        raise InputError(f"A/B metadata differ: {changed}; do not pool different conditions or profiles")
    assertions = _object(data["assertions"], "assertions", ASSERTION_KEYS)
    if any(assertions[key] is not True for key in ASSERTION_KEYS):
        raise InputError("human_adjudicated, topic_root_aggregated, and one_to_one_pairs must all be true")
    pairs = data["pairs"]
    if not isinstance(pairs, list) or not pairs:
        raise InputError("pairs must be a nonempty list of one-to-one topic-root summaries")
    seen: set[str] = set()
    normalized = []
    for index, pair in enumerate(pairs):
        pair = _object(pair, f"pairs[{index}]", PAIR_KEYS)
        root_id = _identifier(pair["topic_root_id"], f"pairs[{index}].topic_root_id")
        if root_id in seen:
            raise InputError(f"duplicate topic_root_id {root_id!r}; repeated outcomes/runs are not independent n")
        seen.add(root_id)
        stratum = _identifier(pair["stratum"], f"pairs[{index}].stratum")
        item = {"topic_root_id": root_id, "stratum": stratum}
        for key in ("quality_a", "quality_b"):
            item[key] = _quality(pair[key], f"pairs[{index}].{key}")
        for key in ("critical_a", "critical_b"):
            if type(pair[key]) is not int or pair[key] not in (0, 1):
                raise InputError(f"pairs[{index}].{key} must be integer 0/1: any major error in that root")
            item[key] = pair[key]
        normalized.append(item)
    return dict(meta_a), normalized


def percentile(values: list[float], fraction: float) -> float:
    """Linear interpolation at (B-1)*p; caller supplies a nonempty sample."""
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    return ordered[lower] + (position - lower) * (ordered[upper] - ordered[lower])


def summarize(data: Any, bootstrap_samples: int = 10_000, seed: int = 20261029) -> dict[str, Any]:
    if type(bootstrap_samples) is not int or not 1_000 <= bootstrap_samples <= 1_000_000:
        raise InputError("bootstrap_samples must be an integer between 1000 and 1000000")
    if type(seed) is not int:
        raise InputError("seed must be an integer")
    meta, pairs = validate(data)
    # Canonical ordering makes the fixed-seed result invariant to JSON row order.
    pairs.sort(key=lambda row: (row["stratum"], row["topic_root_id"]))
    n = len(pairs)
    strata: dict[str, list[tuple[float, int]]] = defaultdict(list)
    for pair in pairs:
        strata[pair["stratum"]].append(
            (pair["quality_a"] - pair["quality_b"], pair["critical_a"] - pair["critical_b"])
        )
    delta = math.fsum(pair["quality_a"] - pair["quality_b"] for pair in pairs) / n
    rd = math.fsum(pair["critical_a"] - pair["critical_b"] for pair in pairs) / n
    result: dict[str, Any] = {
        "record_kind": data["record_kind"],
        "synthetic": data["record_kind"] == "synthetic_test_fixture",
        "status": "descriptive_paired_summary_not_validation",
        "meta": meta,
        "unit": "independent_adjudicated_topic_root_as_declared",
        "n_topic_roots": n,
        "strata_n": {key: len(rows) for key, rows in sorted(strata.items())},
        "quality_difference_a_minus_b": {
            "estimate": delta,
            "unit": "Q points on the frozen 0-100 profile",
            "mean_a": math.fsum(pair["quality_a"] for pair in pairs) / n,
            "mean_b": math.fsum(pair["quality_b"] for pair in pairs) / n,
            "ci_95_percentile": None,
            "favorable_direction": "positive",
        },
        "critical_error_risk_difference_a_minus_b": {
            "estimate": rd,
            "unit": "proportion of topic roots with any major error",
            "risk_a": sum(pair["critical_a"] for pair in pairs) / n,
            "risk_b": sum(pair["critical_b"] for pair in pairs) / n,
            "count_a": sum(pair["critical_a"] for pair in pairs),
            "count_b": sum(pair["critical_b"] for pair in pairs),
            "ci_95_percentile": None,
            "estimate_percentage_points": 100 * rd,
            "ci_95_percentage_points": None,
            "favorable_direction": "negative",
        },
        "bootstrap": {
            "method": "stratified paired topic-root percentile bootstrap",
            "confidence_level": 0.95,
            "seed": seed,
            "requested_samples": bootstrap_samples,
            "executed_samples": 0,
            "ci_available": False,
            "ci_refusal_reason": None,
            "stratum_weights": "observed n_stratum / total n; every root has equal weight",
            "intervals": "marginal unadjusted; not simultaneous and not multiplicity-corrected",
        },
        "assumptions": [
            "Each row is one pre-adjudicated one-to-one pair, aggregated over all nested outcomes, claims, raters and runs within that topic root.",
            "Roots are independent sampling units within prespecified strata; all compared metadata and conditions were frozen before evaluation.",
            "The estimand is the empirical case-mix macro mean, not an equally weighted stratum mean or a population-standardized clinical effect.",
            "A/B metadata and human adjudication are caller declarations; this tool cannot independently audit them.",
            "Selection, failed outputs, missingness and adjudication rules must have been resolved consistently before root summaries are supplied.",
        ],
        "limitations": [
            f"Only {n} topic roots were supplied. Sample-size sufficiency has not been established; no universal n cutoff is assumed.",
            "Percentile bootstrap intervals can be unstable or under-cover with few roots, sparse strata, rare errors or a degenerate empirical distribution.",
            "No unobserved rater, stochastic-run or reference uncertainty is added; use a planned multilevel design/model where needed.",
            "No power calculation, equivalence/noninferiority claim, p value, leaderboard eligibility or clinical safety certification is produced.",
        ],
    }
    sparse = [key for key, rows in sorted(strata.items()) if len(rows) < 2]
    if sparse:
        result["bootstrap"]["ci_refusal_reason"] = (
            "At least one stratum has fewer than 2 topic roots: " + ", ".join(sparse)
            + ". Point estimates only; do not merge strata after seeing results to obtain an interval."
        )
        return result
    rng = random.Random(seed)
    quality_draws: list[float] = []
    critical_draws: list[float] = []
    groups = [rows for _, rows in sorted(strata.items())]
    for _ in range(bootstrap_samples):
        sampled = [rows[rng.randrange(len(rows))] for rows in groups for _ in range(len(rows))]
        quality_draws.append(math.fsum(item[0] for item in sampled) / n)
        critical_draws.append(math.fsum(item[1] for item in sampled) / n)
    q_ci = [percentile(quality_draws, 0.025), percentile(quality_draws, 0.975)]
    rd_ci = [percentile(critical_draws, 0.025), percentile(critical_draws, 0.975)]
    result["quality_difference_a_minus_b"]["ci_95_percentile"] = q_ci
    result["critical_error_risk_difference_a_minus_b"]["ci_95_percentile"] = rd_ci
    result["critical_error_risk_difference_a_minus_b"]["ci_95_percentage_points"] = [100 * value for value in rd_ci]
    result["bootstrap"].update({"executed_samples": bootstrap_samples, "ci_available": True})
    if len(set(quality_draws)) == 1 or len(set(critical_draws)) == 1:
        result["limitations"].append(
            "At least one empirical bootstrap distribution is degenerate. Its zero-width interval does not establish zero uncertainty or zero event risk."
        )
    return result


def _reject_constant(value: str) -> None:
    raise InputError(f"non-finite JSON constant {value} is not permitted")


def _unique_object(items: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in items:
        if key in result:
            raise InputError(f"duplicate JSON object key {key!r}")
        result[key] = value
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Read adjudicated one-to-one topic-root JSON; print paired effects and conditional stratified bootstrap CIs.",
        epilog="No real data are bundled. Synthetic fixtures are for tests only. No network access or output-file writing is performed.",
    )
    parser.add_argument("input", nargs="?", default="-", help="explicit input JSON path, or - for stdin (default)")
    parser.add_argument("--bootstrap-samples", type=int, default=10_000, help="resamples, 1000–1000000 (default: 10000)")
    parser.add_argument("--seed", type=int, default=20261029, help="fixed random seed (default: 20261029)")
    args = parser.parse_args(argv)
    try:
        content = sys.stdin.read() if args.input == "-" else Path(args.input).read_text(encoding="utf-8")
        data = json.loads(content, parse_constant=_reject_constant, object_pairs_hook=_unique_object)
        result = summarize(data, bootstrap_samples=args.bootstrap_samples, seed=args.seed)
        print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
        return 0
    except (InputError, json.JSONDecodeError, OSError, UnicodeError) as error:
        print(f"paired-effect: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
