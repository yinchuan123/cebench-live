(function (root) {
  'use strict';
  function evaluate(config, record, weightsOverride) {
    const profile=config.profiles[record.score_profile];
    if(!profile) throw new Error('未知评分profile');
    const weights = weightsOverride || profile.weights;
    const issues = [];
    const allowed = new Set(config.dimensions.map(d => d.id));
    if (Object.keys(weights).some(k => !allowed.has(k))) throw new Error('未知权重维度');
    const sum = config.dimensions.reduce((s,d) => {
      const w = weights[d.id];
      if (typeof w !== 'number' || !Number.isFinite(w) || w < 0) throw new Error('每个维度权重必须为非负数');
      return s + w;
    }, 0);
    if (Math.abs(sum - 100) > 1e-8) throw new Error('权重合计必须为100');
    const scores = record.scores || {};
    if (Object.keys(scores).some(k => !allowed.has(k))) throw new Error('未知评分维度');
    let measuredWeight=0, observed=0;
    for (const d of config.dimensions) {
      const v=scores[d.id];
      if(weights[d.id]===0) continue;
      if(v===null || v===undefined) {issues.push(d.id+'未测'); continue;}
      if(typeof v!=='number' || !Number.isFinite(v) || v<0 || v>100) throw new Error(d.id+'分数必须在0–100');
      measuredWeight+=weights[d.id]; observed+=weights[d.id]*v/100;
    }
    const gateStates=record.gates || {};
    if(Object.keys(gateStates).some(k=>!config.gates.some(g=>g.id===k))) throw new Error('未知门槛');
    for(const g of config.gates) {
      if(!['pass','fail','untested'].includes(gateStates[g.id]??'untested')) throw new Error('无效门槛状态');
      if(gateStates[g.id]!=='pass') issues.push(g.id+(gateStates[g.id]==='fail'?'失败':'待审定'));
    }
    if(!config.tracks.some(t=>t.id===record.track)) throw new Error('未知赛道');
    if(!config.run_modes.some(t=>t.id===record.run_mode)) throw new Error('未知运行模式');
    if(!config.enabled_tracks.includes(record.track)) issues.push('该赛道尚未启用');
    if(record.score_profile==='live' && !['temporal_replay','prospective_live'].includes(record.run_mode)) issues.push('Live-Q需要时间评测模式');
    if(record.critical_errors!==null && record.critical_errors!==undefined && (!Number.isInteger(record.critical_errors)||record.critical_errors<0)) throw new Error('重大错误数无效');
    if(record.critical_errors===undefined || record.critical_errors===null) issues.push('重大错误数未审定');
    else if(record.critical_errors>0) issues.push('存在重大错误');
    if(record.actual_run!==true) issues.push('不是已验证真实运行');
    if(record.reference_adjudicated!==true) issues.push('参考未审定');
    if(record.dual_review_complete!==true) issues.push('独立双审未完成');
    if(!record.frozen_protocol_id) issues.push('冻结协议ID缺失');
    if(!record.reference_id) issues.push('参考证据包ID缺失');
    const reviewers=(record.reviewers||[]).filter(r=>r.reviewer_id && r.independent===true && r.review_record);
    if(new Set(reviewers.map(r=>r.reviewer_id)).size<2) issues.push('独立评审凭据不足');
    const measuredDims=config.dimensions.filter(d=>weights[d.id]>0 && scores[d.id]!==null && scores[d.id]!==undefined);
    for(const d of measuredDims) if(!(record.metric_observations||[]).some(m=>m.dimension_id===d.id && m.evidence_location && m.review_record)) issues.push(d.id+'评分凭据缺失');
    if(weightsOverride) issues.push('探索权重不能正式入榜');
    const complete=Math.abs(measuredWeight-100)<1e-8;
    const gateFailed=config.gates.some(g=>gateStates[g.id]==='fail') || (record.critical_errors||0)>0;
    const auditCandidate=complete && issues.length===0;
    const eligible=auditCandidate && config.status==='validated_protocol';
    return {
      score:complete ? Number(observed.toFixed(4)) : null,
      measured_weight:Number(measuredWeight.toFixed(4)),
      score_bounds:[Number(observed.toFixed(4)),Number((observed+100-measuredWeight).toFixed(4))],
      profile:record.score_profile,
      audit_candidate:auditCandidate,
      eligible,
      status:gateFailed?'门槛失败':issues.length?'待评价／未具备排名资格':eligible?'可提交正式独立审计':'字段检查完整；草案协议尚未验证，不能正式入榜',
      issues,
      exploratory_weights:!!weightsOverride,
      interpretation:'证据交付质量；不等于证据确定性、跨病种临床效应或安全认证'
    };
  }
  if(typeof module!=='undefined' && module.exports) module.exports={evaluate};
  else root.CEBenchScore={evaluate};
})(typeof globalThis!=='undefined'?globalThis:this);
