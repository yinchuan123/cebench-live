/* CEBench-Live metric engine v0.1.0-draft.
 * All transforms and weights are proposed, not validated clinical instruments.
 * This module validates structure; it cannot establish that submitted evidence is true.
 * It never evaluates catalog expression strings, fetches sources, or executes external code.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CEBenchMetricEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TYPES = Object.freeze({
    direct_rate: "percent",
    anchored_human_rubric: "identity_anchored",
    balanced_direct_rate: "balanced_rate_percent"
  });
  var ANCHORS = [0, 25, 50, 75, 100];
  var EPS = 1e-9;

  function object(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function text(v) { return typeof v === "string" && v.trim().length > 0; }
  function finite(v) { return typeof v === "number" && Number.isFinite(v); }
  function count(v) { return finite(v) && Number.isSafeInteger(v) && v >= 0; }
  function identity(v) { return text(v) ? v.trim().toLowerCase() : ""; }
  function own(o, key) { return Object.prototype.hasOwnProperty.call(o, key); }
  function emptyScores(catalog) {
    var result = {};
    var profileNames = object(catalog) && object(catalog.profiles) ? Object.keys(catalog.profiles) : [];
    profileNames.forEach(function (p) {
      var weights = object(catalog.profiles[p]) ? catalog.profiles[p].dimension_weights : null;
      if (object(weights)) Object.keys(weights).forEach(function (d) { result[d] = null; });
    });
    return result;
  }
  function outcome(metric, score, status, errors, reasons) {
    return {
      metric_id: metric && text(metric.id) ? metric.id : null,
      score: score,
      status: status,
      errors: errors || [],
      reasons: reasons || []
    };
  }
  function measurementKeys(op) {
    if (op === "percent") return ["numerator", "denominator"];
    if (op === "identity_anchored") return ["rubric_score"];
    if (op === "balanced_rate_percent") return ["change_correct", "change_total", "retain_correct", "retain_total"];
    return [];
  }
  function validateMeasurement(data, op, label) {
    var errors = [];
    if (!object(data)) return [label + " must be an object"];
    if (op === "percent") {
      if (!count(data.numerator)) errors.push(label + ".numerator must be a nonnegative safe integer");
      if (!count(data.denominator) || data.denominator === 0) errors.push(label + ".denominator must be a positive safe integer");
      if (count(data.numerator) && count(data.denominator) && data.numerator > data.denominator)
        errors.push(label + ".numerator exceeds denominator");
    } else if (op === "identity_anchored") {
      if (!finite(data.rubric_score) || ANCHORS.indexOf(data.rubric_score) === -1)
        errors.push(label + ".rubric_score must be one of 0,25,50,75,100");
    } else if (op === "balanced_rate_percent") {
      ["change", "retain"].forEach(function (kind) {
        var good = data[kind + "_correct"];
        var total = data[kind + "_total"];
        if (!count(good)) errors.push(label + "." + kind + "_correct must be a nonnegative safe integer");
        if (!count(total) || total === 0) errors.push(label + "." + kind + "_total must be a positive safe integer");
        if (count(good) && count(total) && good > total)
          errors.push(label + "." + kind + "_correct exceeds total");
      });
    } else {
      errors.push("Unknown transform; no expression is evaluated");
    }
    return errors;
  }
  function sameMeasurement(a, b, op) {
    return measurementKeys(op).every(function (key) { return a[key] === b[key]; });
  }
  function validateEvidence(obs, op) {
    var errors = [];
    ["reviewer1", "reviewer2"].forEach(function (key) {
      var reviewer = obs[key];
      if (!object(reviewer) || !text(reviewer.id)) errors.push(key + ".id is required");
      if (!object(reviewer) || !text(reviewer.reason)) errors.push(key + ".reason is required");
      errors = errors.concat(validateMeasurement(reviewer && reviewer.judgment, op, key + ".judgment"));
    });
    if (object(obs.reviewer1) && object(obs.reviewer2) &&
        identity(obs.reviewer1.id) && identity(obs.reviewer1.id) === identity(obs.reviewer2.id))
      errors.push("reviewer1 and reviewer2 must be different people");

    var adjudication = obs.adjudication;
    if (!object(adjudication) || adjudication.status !== "adjudicated")
      errors.push("adjudication.status must equal adjudicated");
    if (!object(adjudication) || !text(adjudication.adjudicator_id))
      errors.push("adjudication.adjudicator_id is required");
    if (!object(adjudication) || !text(adjudication.reason))
      errors.push("adjudication.reason is required");
    if (object(adjudication) && text(adjudication.adjudicator_id)) {
      var judge = identity(adjudication.adjudicator_id);
      if ((object(obs.reviewer1) && judge === identity(obs.reviewer1.id)) ||
          (object(obs.reviewer2) && judge === identity(obs.reviewer2.id)))
        errors.push("adjudicator must be independent of both reviewers");
    }
    errors = errors.concat(validateMeasurement(adjudication && adjudication.decision, op, "adjudication.decision"));
    if (object(adjudication) && object(adjudication.decision) &&
        !sameMeasurement(obs, adjudication.decision, op))
      errors.push("top-level measurement must match adjudication.decision");

    if (!Array.isArray(obs.reference_item_ids) || obs.reference_item_ids.length === 0 ||
        obs.reference_item_ids.some(function (v) { return !text(v); })) {
      errors.push("reference_item_ids must be a nonempty array of nonempty strings");
    } else {
      var unique = new Set(obs.reference_item_ids.map(function (v) { return v.trim(); }));
      if (unique.size !== obs.reference_item_ids.length) errors.push("reference_item_ids must not contain duplicates");
    }
    if (!Array.isArray(obs.source_locators) || obs.source_locators.length === 0 ||
        obs.source_locators.some(function (v) {
          return !object(v) || !text(v.source_id) || !text(v.locator) || !text(v.evidence_note);
        })) errors.push("source_locators require source_id, locator and evidence_note");
    if (op === "identity_anchored" && !text(obs.anchor_reason))
      errors.push("anchor_reason is required for anchored rubric");
    return errors;
  }

  /* D7.1 uses complete, mature follow-up only. Pending events are retained as
   * censored observations, never converted to successful or overdue events. */
  function liveReadiness(metric, obs) {
    if (metric.id !== "D7.1") return null;
    var f = obs.flags;
    if (!object(f)) return { status: "not_tested", reasons: ["D7.1 requires explicit event and SLA flags"] };
    var errors = [];
    if (!count(f.required_event_count)) errors.push("flags.required_event_count must be a nonnegative safe integer");
    if (!count(f.right_censored_count)) errors.push("flags.right_censored_count must be a nonnegative safe integer");
    if (typeof f.all_sla_windows_matured !== "boolean") errors.push("flags.all_sla_windows_matured must be boolean");
    if (count(f.required_event_count) && count(f.right_censored_count) && f.right_censored_count > f.required_event_count)
      errors.push("right_censored_count exceeds required_event_count");
    if (errors.length) return { status: "invalid", errors: errors };
    if (f.required_event_count === 0) return { status: "not_tested", reasons: ["No required update event; live performance was not tested"] };
    if (f.right_censored_count > 0 || f.all_sla_windows_matured === false)
      return { status: "not_tested", reasons: ["SLA follow-up is right-censored or immature; D7.1 point score is withheld"] };
    if (obs.status === "complete" && obs.denominator !== f.required_event_count)
      return { status: "invalid", errors: ["D7.1 denominator must equal all preregistered required events, including overdue nonresponses"] };
    return null;
  }

  function scoreMetric(metric, observation, profile) {
    if (!object(metric) || !text(metric.id) || !text(metric.dimension))
      return outcome(metric, null, "invalid", ["Valid metric identity and dimension are required"]);
    if (!text(profile) || !object(metric.within_dimension_weights) ||
        !own(metric.within_dimension_weights, profile))
      return outcome(metric, null, "invalid", ["Metric has no weight for this profile"]);
    var weight = metric.within_dimension_weights[profile];
    if (!finite(weight) || weight < 0 || weight > 1)
      return outcome(metric, null, "invalid", ["Metric weight must be finite in [0,1]"]);
    if (weight === 0) return outcome(metric, null, "disabled", [], ["Metric is disabled in this frozen profile"]);
    var op = object(metric.score_transform) ? metric.score_transform.op : null;
    if (!own(TYPES, metric.type) || TYPES[metric.type] !== op)
      return outcome(metric, null, "invalid", ["Unsupported type/transform pair; expressions are not executed"]);
    if (observation === undefined || observation === null)
      return outcome(metric, null, "not_tested", [], ["Required observation is missing"]);
    if (!object(observation) || observation.metric_id !== metric.id)
      return outcome(metric, null, "invalid", ["Observation metric_id does not match metric"]);
    var obs = observation;
    if (obs.status === "not_tested") return outcome(metric, null, "not_tested", [], ["Observation marked not_tested"]);
    if (obs.status === "invalid") return outcome(metric, null, "invalid", ["Observation marked invalid"]);
    if (obs.status !== "complete" && obs.status !== "omitted")
      return outcome(metric, null, "invalid", ["Unknown observation status"]);

    var readiness = liveReadiness(metric, obs);
    if (readiness) return outcome(metric, null, readiness.status, readiness.errors, readiness.reasons);
    if (obs.status === "omitted")
      return outcome(metric, 0, "omitted", [], ["Required delivery was omitted; zero is a performance result, not missing data"]);

    var errors = validateMeasurement(obs, op, "observation").concat(validateEvidence(obs, op));
    if (errors.length) return outcome(metric, null, "invalid", errors);
    var value;
    if (op === "percent") value = 100 * obs.numerator / obs.denominator;
    else if (op === "identity_anchored") value = obs.rubric_score;
    else if (op === "balanced_rate_percent")
      value = 50 * (obs.change_correct / obs.change_total + obs.retain_correct / obs.retain_total);
    if (!finite(value) || value < 0 || value > 100)
      return outcome(metric, null, "invalid", ["Computed score is outside [0,100]"]);
    return outcome(metric, value, "complete", []);
  }

  function aggregateDimensions(catalog, observations, profile) {
    var allScores = emptyScores(catalog);
    var result = {
      profile: profile,
      scores: allScores,
      metric_results: [],
      dimension_details: {},
      errors: [],
      disabled_dimensions: [],
      complete: false,
      valid: false,
      measured_dimension_weight: 0,
      notice: "Proposed draft scoring; structural validation is not clinical adjudication or verification of source authenticity."
    };
    if (!object(catalog) || !object(catalog.profiles) || !own(catalog.profiles, profile) ||
        !object(catalog.profiles[profile]) || !object(catalog.profiles[profile].dimension_weights) ||
        !Array.isArray(catalog.metrics)) {
      result.errors.push("Catalog/profile is not valid");
      return result;
    }
    if (!Array.isArray(observations)) {
      result.errors.push("observations must be an array");
      return result;
    }
    var dw = catalog.profiles[profile].dimension_weights;
    var dimensions = Object.keys(dw);
    if (dimensions.length !== 10 || dimensions.some(function (d) { return !/^D(?:10|[1-9])$/.test(d); }))
      result.errors.push("All ten dimension IDs D1 through D10 must be present");
    var dimWeightSum = 0;
    dimensions.forEach(function (dim) {
      if (!finite(dw[dim]) || dw[dim] < 0 || dw[dim] > 100)
        result.errors.push("Invalid dimension weight: " + dim);
      else dimWeightSum += dw[dim];
    });
    if (Math.abs(dimWeightSum - 100) > EPS) result.errors.push("Dimension weights must sum to 100");

    var metricMap = new Map();
    var dimMetrics = new Map();
    dimensions.forEach(function (dim) { dimMetrics.set(dim, []); });
    catalog.metrics.forEach(function (m) {
      if (!object(m) || !text(m.id) || !text(m.dimension)) {
        result.errors.push("Invalid metric entry");
        return;
      }
      if (metricMap.has(m.id)) result.errors.push("Duplicate catalog metric: " + m.id);
      metricMap.set(m.id, m);
      if (!dimMetrics.has(m.dimension)) result.errors.push("Metric references unknown dimension: " + m.id);
      else dimMetrics.get(m.dimension).push(m);
      if (!object(m.within_dimension_weights) || !own(m.within_dimension_weights, profile) ||
          !finite(m.within_dimension_weights[profile]) || m.within_dimension_weights[profile] < 0 ||
          m.within_dimension_weights[profile] > 1)
        result.errors.push("Invalid within-dimension weight: " + m.id);
      if (!object(m.score_transform) || !own(TYPES, m.type) || TYPES[m.type] !== m.score_transform.op)
        result.errors.push("Unsupported metric transform: " + m.id);
    });
    dimensions.forEach(function (dim) {
      var sum = dimMetrics.get(dim).reduce(function (s, m) {
        return s + (object(m.within_dimension_weights) && finite(m.within_dimension_weights[profile]) ?
          m.within_dimension_weights[profile] : 0);
      }, 0);
      var target = dw[dim] === 0 ? 0 : 1;
      if (Math.abs(sum - target) > EPS)
        result.errors.push("Fixed subweights do not sum to " + target + ": " + dim);
      if (dw[dim] === 0) result.disabled_dimensions.push(dim);
    });
    if (result.errors.length) return result;

    var observationMap = new Map();
    var duplicateObservations = new Set();
    var unknownObservation = false;
    observations.forEach(function (obs) {
      if (!object(obs) || !text(obs.metric_id) || !metricMap.has(obs.metric_id)) {
        result.errors.push("Observation has unknown or missing metric_id");
        unknownObservation = true;
        return;
      }
      if (observationMap.has(obs.metric_id)) {
        duplicateObservations.add(obs.metric_id);
        result.errors.push("Duplicate observation: " + obs.metric_id);
      } else observationMap.set(obs.metric_id, obs);
    });
    /* An unknown record cannot be assigned to a dimension safely. Fail closed. */
    if (unknownObservation) return result;

    dimensions.forEach(function (dim) {
      if (dw[dim] === 0) {
        result.scores[dim] = null;
        result.dimension_details[dim] = { status: "disabled", missing_metrics: [], score: null };
        dimMetrics.get(dim).forEach(function (m) {
          result.metric_results.push(outcome(m, null, "disabled", []));
        });
        return;
      }
      var missing = [];
      var score = 0;
      var dimInvalid = false;
      dimMetrics.get(dim).forEach(function (m) {
        var mr;
        if (duplicateObservations.has(m.id))
          mr = outcome(m, null, "invalid", ["Duplicate metric observation"]);
        else mr = scoreMetric(m, observationMap.get(m.id), profile);
        result.metric_results.push(mr);
        if (m.within_dimension_weights[profile] === 0) return;
        if (mr.score === null) missing.push(m.id);
        else score += m.within_dimension_weights[profile] * mr.score;
        if (mr.status === "invalid") {
          dimInvalid = true;
          mr.errors.forEach(function (e) { result.errors.push(m.id + ": " + e); });
        }
      });
      if (missing.length) result.scores[dim] = null;
      else {
        result.scores[dim] = score;
        result.measured_dimension_weight += dw[dim];
      }
      result.dimension_details[dim] = {
        status: dimInvalid ? "invalid" : missing.length ? "not_tested" : "complete",
        missing_metrics: missing,
        score: result.scores[dim]
      };
    });
    result.valid = result.errors.length === 0;
    result.complete = result.valid && dimensions.every(function (d) { return dw[d] === 0 || result.scores[d] !== null; });
    return result;
  }

  return Object.freeze({
    version: "0.1.0-draft",
    scoreMetric: scoreMetric,
    aggregateDimensions: aggregateDimensions
  });
});
