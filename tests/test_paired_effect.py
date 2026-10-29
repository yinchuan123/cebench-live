"""SYNTHETIC FIXTURES ONLY: these are not real model or human results."""

from __future__ import annotations

import copy
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest


TOOL = Path(__file__).resolve().parents[1] / "tools" / "paired-effect.py"
SPEC = importlib.util.spec_from_file_location("paired_effect", TOOL)
paired_effect = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(paired_effect)


def synthetic_fixture():
    """Invented arithmetic fixture; never claim these scores are measured."""
    meta = {
        "track": "SYNTHETIC_TRACK", "profile": "SYNTHETIC_PROFILE",
        "mode": "SYNTHETIC_MODE", "conditions_id": "SYNTHETIC_EQUAL_CONDITIONS",
    }
    return {
        "record_kind": "synthetic_test_fixture",
        "meta_a": copy.deepcopy(meta), "meta_b": copy.deepcopy(meta),
        "assertions": {
            "human_adjudicated": True, "topic_root_aggregated": True, "one_to_one_pairs": True,
        },
        "pairs": [
            {"topic_root_id": "SYNTHETIC_ROOT_1", "stratum": "SYNTHETIC_S1", "quality_a": 80, "quality_b": 70, "critical_a": 0, "critical_b": 1},
            {"topic_root_id": "SYNTHETIC_ROOT_2", "stratum": "SYNTHETIC_S1", "quality_a": 60, "quality_b": 65, "critical_a": 1, "critical_b": 0},
            {"topic_root_id": "SYNTHETIC_ROOT_3", "stratum": "SYNTHETIC_S2", "quality_a": 90, "quality_b": 80, "critical_a": 0, "critical_b": 0},
            {"topic_root_id": "SYNTHETIC_ROOT_4", "stratum": "SYNTHETIC_S2", "quality_a": 70, "quality_b": 75, "critical_a": 0, "critical_b": 0},
        ],
    }


class PairedEffectTests(unittest.TestCase):
    def summarize(self, data=None, **kwargs):
        return paired_effect.summarize(data or synthetic_fixture(), bootstrap_samples=1000, **kwargs)

    def test_paired_macro_effect_and_risk_denominator(self):
        result = self.summarize()
        self.assertTrue(result["synthetic"])
        self.assertEqual(result["n_topic_roots"], 4)
        self.assertEqual(result["quality_difference_a_minus_b"]["estimate"], 2.5)
        risk = result["critical_error_risk_difference_a_minus_b"]
        self.assertEqual(risk["estimate"], 0)
        self.assertEqual(risk["risk_a"], .25)
        self.assertEqual(risk["risk_b"], .25)
        self.assertEqual(risk["count_a"], 1)
        self.assertTrue(result["bootstrap"]["ci_available"])

    def test_fixed_seed_and_input_row_order_invariance(self):
        fixture = synthetic_fixture()
        first = self.summarize(fixture, seed=71)
        fixture["pairs"].reverse()
        self.assertEqual(first, self.summarize(fixture, seed=71))

    def test_a_b_resampled_together_and_stratum_sizes_preserved(self):
        fixture = synthetic_fixture()
        # Constant effects within each stratum, different effects across strata.
        # Preserving n_h makes every draw equal the known empirical macro mean.
        for i, row in enumerate(fixture["pairs"]):
            row["quality_a"] = row["quality_b"] + (10 if i < 2 else -2)
            row["critical_a"] = row["critical_b"]
        result = self.summarize(fixture)
        self.assertEqual(result["quality_difference_a_minus_b"]["ci_95_percentile"], [4, 4])
        self.assertEqual(result["critical_error_risk_difference_a_minus_b"]["ci_95_percentile"], [0, 0])
        self.assertTrue(any("degenerate" in note for note in result["limitations"]))

    def test_macro_mean_does_not_equalize_strata(self):
        fixture = synthetic_fixture()
        extra = copy.deepcopy(fixture["pairs"][0])
        extra["topic_root_id"] = "SYNTHETIC_ROOT_5"
        fixture["pairs"].append(extra)
        result = self.summarize(fixture)
        self.assertEqual(result["quality_difference_a_minus_b"]["estimate"], 4)
        self.assertEqual(result["strata_n"], {"SYNTHETIC_S1": 3, "SYNTHETIC_S2": 2})

    def test_sparse_stratum_refuses_ci_but_keeps_points(self):
        fixture = synthetic_fixture()
        fixture["pairs"].pop()
        result = self.summarize(fixture)
        self.assertFalse(result["bootstrap"]["ci_available"])
        self.assertEqual(result["bootstrap"]["executed_samples"], 0)
        self.assertIn("fewer than 2", result["bootstrap"]["ci_refusal_reason"])
        self.assertIsNone(result["quality_difference_a_minus_b"]["ci_95_percentile"])
        self.assertEqual(result["quality_difference_a_minus_b"]["estimate"], 5)

    def test_duplicate_root_rejected_even_across_strata(self):
        fixture = synthetic_fixture()
        fixture["pairs"][2]["topic_root_id"] = fixture["pairs"][0]["topic_root_id"]
        with self.assertRaisesRegex(paired_effect.InputError, "duplicate topic_root_id"):
            self.summarize(fixture)

    def test_different_meta_rejected_for_each_matching_condition(self):
        for key in paired_effect.META_KEYS:
            with self.subTest(key=key):
                fixture = synthetic_fixture()
                fixture["meta_b"][key] += "_DIFFERENT"
                with self.assertRaisesRegex(paired_effect.InputError, "metadata differ"):
                    self.summarize(fixture)

    def test_missing_null_nan_infinity_and_bool_quality_rejected(self):
        for value in (None, math.nan, math.inf, -math.inf, True, "80", -1, 101, 10 ** 500):
            with self.subTest(value=repr(value)):
                fixture = synthetic_fixture()
                fixture["pairs"][0]["quality_a"] = value
                with self.assertRaises(paired_effect.InputError):
                    self.summarize(fixture)
        fixture = synthetic_fixture()
        del fixture["pairs"][0]["quality_a"]
        with self.assertRaises(paired_effect.InputError):
            self.summarize(fixture)

    def test_critical_indicator_is_not_claim_count_or_boolean(self):
        for value in (2, -1, .5, 1.0, True, None):
            with self.subTest(value=value):
                fixture = synthetic_fixture()
                fixture["pairs"][0]["critical_a"] = value
                with self.assertRaises(paired_effect.InputError):
                    self.summarize(fixture)

    def test_pseudo_independent_counts_and_weights_rejected(self):
        for key in ("n", "weight", "outcome_id", "run_id", "claim_count"):
            with self.subTest(key=key):
                fixture = synthetic_fixture()
                fixture["pairs"][0][key] = 100
                with self.assertRaisesRegex(paired_effect.InputError, "unexpected"):
                    self.summarize(fixture)

    def test_required_adjudication_and_aggregation_declarations(self):
        for key in paired_effect.ASSERTION_KEYS:
            fixture = synthetic_fixture()
            fixture["assertions"][key] = False
            with self.assertRaisesRegex(paired_effect.InputError, "must all be true"):
                self.summarize(fixture)

    def test_invalid_record_kind_type_is_rejected_cleanly(self):
        for value in ([], {}, None, True, "unverified_scores"):
            fixture = synthetic_fixture()
            fixture["record_kind"] = value
            with self.assertRaisesRegex(paired_effect.InputError, "record_kind"):
                self.summarize(fixture)

    def test_empty_pairs_bad_identifiers_and_invalid_draws(self):
        fixture = synthetic_fixture()
        fixture["pairs"] = []
        with self.assertRaises(paired_effect.InputError):
            self.summarize(fixture)
        for key in ("stratum", "topic_root_id"):
            fixture = synthetic_fixture()
            fixture["pairs"][0][key] = " "
            with self.assertRaises(paired_effect.InputError):
                self.summarize(fixture)
        with self.assertRaises(paired_effect.InputError):
            paired_effect.summarize(synthetic_fixture(), bootstrap_samples=999)

    def test_percentile_interpolation(self):
        self.assertEqual(paired_effect.percentile([0, 10], .025), .25)
        self.assertEqual(paired_effect.percentile([10, 0], .975), 9.75)

    def test_cli_stdin_synthetic_json_and_no_output_artifact(self):
        process = subprocess.run(
            [sys.executable, str(TOOL), "-", "--bootstrap-samples", "1000", "--seed", "7"],
            input=json.dumps(synthetic_fixture()), text=True, capture_output=True, check=False,
        )
        self.assertEqual(process.returncode, 0, process.stderr)
        result = json.loads(process.stdout)
        self.assertTrue(result["synthetic"])
        self.assertEqual(result["bootstrap"]["seed"], 7)
        self.assertEqual(process.stderr, "")

    def test_cli_nan_and_duplicate_json_keys_rejected(self):
        bad_jsons = [
            json.dumps(synthetic_fixture()).replace('"quality_a": 80', '"quality_a": NaN', 1),
            '{"record_kind":"synthetic_test_fixture","record_kind":"synthetic_test_fixture"}',
        ]
        for text in bad_jsons:
            process = subprocess.run(
                [sys.executable, str(TOOL), "-", "--bootstrap-samples", "1000"],
                input=text, text=True, capture_output=True, check=False,
            )
            self.assertEqual(process.returncode, 2)
            self.assertEqual(process.stdout, "")
            self.assertIn("paired-effect:", process.stderr)


if __name__ == "__main__":
    unittest.main()
