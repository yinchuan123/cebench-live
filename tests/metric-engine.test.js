"use strict";
/* SYNTHETIC FIXTURES ONLY. These tests are not clinical data, real runs,
 * product measurements, or evidence for a leaderboard. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const engine = require("../tools/metric-engine.js");
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/metric-catalog.json"), "utf8"));
const clone = x => structuredClone(x);
const metric = id => catalog.metrics.find(x => x.id === id);

function fixture(id) {
  const m = metric(id);
  const op = m.score_transform.op;
  let values;
  if (op === "percent") values = { numerator: 8, denominator: 10 };
  if (op === "identity_anchored") values = { rubric_score: 75 };
  if (op === "balanced_rate_percent")
    values = { change_correct: 8, change_total: 10, retain_correct: 9, retain_total: 10 };
  const obs = {
    metric_id: id,
    status: "complete",
    synthetic: true,
    ...values,
    reviewer1: { id: "SYNTHETIC-REVIEWER-1", judgment: clone(values), reason: "Synthetic fixture; no clinical review occurred." },
    reviewer2: { id: "SYNTHETIC-REVIEWER-2", judgment: clone(values), reason: "Synthetic fixture; no clinical review occurred." },
    adjudication: {
      status: "adjudicated",
      adjudicator_id: "SYNTHETIC-THIRD-REVIEWER",
      decision: clone(values),
      reason: "Synthetic audit example only, not real adjudication."
    },
    reference_item_ids: ["SYNTHETIC-REFERENCE-ITEM"],
    source_locators: [{
      source_id: "SYNTHETIC-SOURCE",
      locator: "Synthetic Table A, row 1",
      evidence_note: "Synthetic expected result. No medical source is represented."
    }]
  };
  if (op === "identity_anchored") obs.anchor_reason = "Synthetic 75-point anchor example.";
  if (id === "D7.1") obs.flags = { required_event_count: 10, right_censored_count: 0, all_sla_windows_matured: true };
  return obs;
}
function replaceValues(obs, values) {
  Object.assign(obs, values);
  Object.assign(obs.reviewer1.judgment, values);
  Object.assign(obs.reviewer2.judgment, values);
  Object.assign(obs.adjudication.decision, values);
  return obs;
}
function allFixtures() { return catalog.metrics.map(m => fixture(m.id)); }

test("percent transform preserves exact raw numerator/denominator", () => {
  const r = engine.scoreMetric(metric("D3.1"), fixture("D3.1"), "core");
  assert.equal(r.score, 80);
  assert.equal(r.status, "complete");
  assert.deepEqual(r.errors, []);
});
test("anchored rubric is identity, not a percent-correct claim", () => {
  assert.equal(engine.scoreMetric(metric("D5.2"), fixture("D5.2"), "core").score, 75);
});
test("balanced temporal response requires both event classes", () => {
  assert.ok(Math.abs(engine.scoreMetric(metric("D8.3"), fixture("D8.3"), "live").score - 85) < 1e-12);
  const obs = replaceValues(fixture("D8.3"), { retain_correct: 0, retain_total: 0 });
  assert.equal(engine.scoreMetric(metric("D8.3"), obs, "live").score, null);
});
test("omitted performance is zero; untested, invalid and absent are null", () => {
  const m = metric("D3.1");
  assert.equal(engine.scoreMetric(m, { metric_id: m.id, status: "omitted" }, "core").score, 0);
  for (const status of ["not_tested", "invalid"]) {
    assert.equal(engine.scoreMetric(m, { metric_id: m.id, status }, "core").score, null);
  }
  assert.equal(engine.scoreMetric(m, undefined, "core").score, null);
});
test("null, strings, booleans, NaN, infinities and unsafe or fractional counts never coerce to scores", () => {
  for (const bad of [null, "", "8", true, NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const obs = replaceValues(fixture("D3.1"), { numerator: bad });
    const r = engine.scoreMetric(metric("D3.1"), obs, "core");
    assert.equal(r.score, null, String(bad));
    assert.equal(r.status, "invalid");
  }
});
test("all denominator failures and numerator above total are rejected", () => {
  for (const values of [
    { denominator: 0 }, { denominator: null }, { denominator: "10" },
    { denominator: -1 }, { numerator: 11, denominator: 10 }
  ]) {
    const obs = replaceValues(fixture("D3.1"), values);
    assert.equal(engine.scoreMetric(metric("D3.1"), obs, "core").score, null);
  }
});
test("non-anchor rubric and missing anchor reason are invalid", () => {
  assert.equal(engine.scoreMetric(metric("D5.2"), replaceValues(fixture("D5.2"), { rubric_score: 74 }), "core").score, null);
  const obs = fixture("D5.2");
  delete obs.anchor_reason;
  assert.equal(engine.scoreMetric(metric("D5.2"), obs, "core").score, null);
});
test("complete observations need two distinct reviewers and their raw judgments", () => {
  for (const mutate of [
    o => { delete o.reviewer1; },
    o => { o.reviewer2.id = " synthetic-reviewer-1 "; },
    o => { delete o.reviewer2.judgment; },
    o => { o.reviewer2.judgment.denominator = null; },
    o => { o.reviewer1.reason = ""; }
  ]) {
    const obs = fixture("D3.1"); mutate(obs);
    assert.equal(engine.scoreMetric(metric("D3.1"), obs, "core").score, null);
  }
});
test("adjudication must be final, independent, reasoned and match final counts", () => {
  for (const mutate of [
    o => { delete o.adjudication; },
    o => { o.adjudication.status = "pending"; },
    o => { o.adjudication.adjudicator_id = o.reviewer1.id; },
    o => { delete o.adjudication.reason; },
    o => { o.adjudication.decision.numerator = 7; }
  ]) {
    const obs = fixture("D3.1"); mutate(obs);
    assert.equal(engine.scoreMetric(metric("D3.1"), obs, "core").score, null);
  }
});
test("reviewers can disagree if a third reviewer adjudicates the final measurement", () => {
  const obs = fixture("D3.1");
  obs.reviewer2.judgment.numerator = 7;
  assert.equal(engine.scoreMetric(metric("D3.1"), obs, "core").score, 80);
});
test("reference items and source evidence locators cannot be empty", () => {
  for (const mutate of [
    o => { o.reference_item_ids = []; },
    o => { o.reference_item_ids = ["   "]; },
    o => { o.reference_item_ids = ["same", "same"]; },
    o => { o.source_locators = []; },
    o => { o.source_locators[0].locator = ""; },
    o => { delete o.source_locators[0].evidence_note; }
  ]) {
    const obs = fixture("D3.1"); mutate(obs);
    assert.equal(engine.scoreMetric(metric("D3.1"), obs, "core").score, null);
  }
});
test("D7 no events stays untested, never 100 or an omitted zero", () => {
  for (const status of ["complete", "omitted"]) {
    const obs = fixture("D7.1");
    obs.status = status;
    obs.flags.required_event_count = 0;
    const r = engine.scoreMetric(metric("D7.1"), obs, "live");
    assert.equal(r.score, null);
    assert.equal(r.status, "not_tested");
  }
});
test("D7 right censoring and immature SLA windows withhold point scores", () => {
  for (const changes of [
    { right_censored_count: 1 },
    { all_sla_windows_matured: false }
  ]) {
    const obs = fixture("D7.1"); Object.assign(obs.flags, changes);
    const r = engine.scoreMetric(metric("D7.1"), obs, "live");
    assert.equal(r.score, null);
    assert.equal(r.status, "not_tested");
  }
});
test("D7 event flags are strict, and overdue nonresponses stay in denominator", () => {
  const m = metric("D7.1");
  let obs = fixture("D7.1");
  delete obs.flags;
  assert.equal(engine.scoreMetric(m, obs, "live").score, null);
  obs = fixture("D7.1"); obs.flags.all_sla_windows_matured = "true";
  assert.equal(engine.scoreMetric(m, obs, "live").status, "invalid");
  obs = fixture("D7.1"); obs.flags.required_event_count = 11;
  assert.equal(engine.scoreMetric(m, obs, "live").score, null);
  obs = replaceValues(fixture("D7.1"), { numerator: 0 });
  assert.equal(engine.scoreMetric(m, obs, "live").score, 0);
});
test("D8 consistently wrong repeats have zero correct-and-consistent score", () => {
  const obs = replaceValues(fixture("D8.1"), { numerator: 0 });
  obs.note = "Synthetic example: all answers identical, all wrong.";
  assert.equal(engine.scoreMetric(metric("D8.1"), obs, "core").score, 0);
});
test("disabled D7 and D8 temporal module remain null in core", () => {
  assert.equal(engine.scoreMetric(metric("D7.1"), fixture("D7.1"), "core").status, "disabled");
  assert.equal(engine.scoreMetric(metric("D8.3"), fixture("D8.3"), "core").score, null);
});
test("aggregate applies all fixed subweights and returns core disabled dimension null", () => {
  const r = engine.aggregateDimensions(catalog, allFixtures(), "core");
  assert.equal(r.valid, true);
  assert.equal(r.complete, true);
  assert.equal(r.measured_dimension_weight, 100);
  assert.equal(r.scores.D7, null);
  assert.equal(r.scores.D3, 80);
  assert.equal(r.scores.D5, 78);
  assert.equal(r.scores.D10, 75);
  assert.deepEqual(r.disabled_dimensions, ["D7"]);
});
test("live dimensions include temporal response while keeping proposed weights fixed", () => {
  const r = engine.aggregateDimensions(catalog, allFixtures(), "live");
  assert.equal(r.complete, true);
  assert.equal(r.scores.D8, 0.4 * 80 + 0.3 * 80 + 0.3 * 85);
  assert.equal(r.scores.D7, 80);
});
test("one missing required metric nulls its dimension without redistributing", () => {
  const observations = allFixtures().filter(x => x.metric_id !== "D3.2");
  const r = engine.aggregateDimensions(catalog, observations, "core");
  assert.equal(r.scores.D3, null);
  assert.equal(r.complete, false);
  assert.equal(r.measured_dimension_weight, 90);
  assert.deepEqual(r.dimension_details.D3.missing_metrics, ["D3.2"]);
  assert.equal(r.scores.D5, 78);
});
test("duplicate observation cannot silently overwrite a measurement", () => {
  const obs = allFixtures(); obs.push(fixture("D3.1"));
  const r = engine.aggregateDimensions(catalog, obs, "core");
  assert.equal(r.scores.D3, null);
  assert.equal(r.valid, false);
});
test("unknown observation or malformed input fails closed", () => {
  const obs = allFixtures(); obs.push({ metric_id: "UNKNOWN", status: "complete" });
  const r = engine.aggregateDimensions(catalog, obs, "core");
  assert.equal(r.valid, false);
  assert.equal(r.scores.D1, null);
  assert.equal(engine.aggregateDimensions(catalog, null, "core").valid, false);
  assert.equal(engine.aggregateDimensions(catalog, [], "unknown").valid, false);
});
test("catalog numeric, duplicate, unsupported or sum failures never score", () => {
  for (const mutate of [
    c => { c.profiles.core.dimension_weights.D1 = null; },
    c => { c.profiles.core.dimension_weights.D1 = "15"; },
    c => { c.profiles.core.dimension_weights.D1 = 16; },
    c => { c.metrics[0].within_dimension_weights.core = 0.49; },
    c => { c.metrics[0].within_dimension_weights.core = NaN; },
    c => { c.metrics[0].score_transform.op = "execute"; },
    c => { c.metrics.push(clone(c.metrics[0])); }
  ]) {
    const c = clone(catalog); mutate(c);
    const r = engine.aggregateDimensions(c, allFixtures(), "core");
    assert.equal(r.valid, false);
    assert.equal(r.scores.D1, null);
  }
});
test("expression strings are documentation only and are never executed", () => {
  const m = clone(metric("D3.1"));
  m.score_transform.expression = "globalThis.__UNSAFE_CEB_TEST = true; throw new Error('must not run')";
  assert.equal(engine.scoreMetric(m, fixture("D3.1"), "core").score, 80);
  assert.equal(globalThis.__UNSAFE_CEB_TEST, undefined);
});
test("UMD exposes same functions in browser context without external libraries", () => {
  const sandbox = {};
  // Only this project's own authored implementation is loaded for packaging verification.
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../tools/metric-engine.js"), "utf8"), sandbox);
  assert.equal(typeof sandbox.CEBenchMetricEngine.scoreMetric, "function");
  assert.equal(typeof sandbox.CEBenchMetricEngine.aggregateDimensions, "function");
  const r = sandbox.CEBenchMetricEngine.scoreMetric(metric("D3.1"), fixture("D3.1"), "core");
  assert.equal(r.score, 80);
});
test("scoring does not mutate catalog, observations, or raw counts", () => {
  const c = clone(catalog), obs = allFixtures();
  const before = JSON.stringify({ c, obs });
  engine.aggregateDimensions(c, obs, "live");
  assert.equal(JSON.stringify({ c, obs }), before);
});

test("blank raw-metric template remains unmeasured and cannot produce complete dimensions", () => {
  const template = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/raw-metric-template.json"), "utf8"));
  assert.equal(template.actual_run, false);
  const r = engine.aggregateDimensions(catalog, template.metric_observations, template.selected_profile);
  assert.equal(r.valid, true);
  assert.equal(r.complete, false);
  assert.equal(r.measured_dimension_weight, 0);
  assert.ok(Object.values(r.scores).every(x => x === null));
});
test("all explicitly synthetic schema examples pass their intended transform only", () => {
  const template = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/raw-metric-template.json"), "utf8"));
  for (const obs of template.synthetic_examples) {
    assert.equal(obs.synthetic, true);
    const r = engine.scoreMetric(metric(obs.metric_id), obs, "live");
    assert.equal(r.status, "complete", JSON.stringify(r.errors));
  }
});
test("malformed inactive catalog entries do not throw and selected invalid profiles fail closed", () => {
  const c = clone(catalog);
  c.profiles.unused = null;
  assert.doesNotThrow(() => engine.aggregateDimensions(c, [], "core"));
  c.profiles.core = null;
  assert.equal(engine.aggregateDimensions(c, [], "core").valid, false);
});
