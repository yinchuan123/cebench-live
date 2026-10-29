# 临床/健康证据 benchmark 竞争格局核验补充

核验日期：2026-10-29（Asia/Shanghai）。本文件补充已有 `landscape.json`，属于定向原始来源核查；不是穷尽检索，未运行模型评测、未独立复现任何开发团队性能数字。

## 对框架定位的直接影响

不能单独以“多维”“个体化”“动态”“端到端系统综述”“GRADE”作为首创证明。已有相关工作分别覆盖这些方向。可争取的贡献是：跨证据设计的标准路由、逐层证据来源与数值审计、个体化的成对对照测试、正确更新与稳定性、预算受控的系统比较，以及这些能力联合后的外部效度。是否优于现有 benchmark，需要内容效度、增量错误检出率、专家一致性和跨机构复现验证。

## 八项最应进入正式方案的已核验事实

### 1. LiveMedBench 已明确提出每周更新，且包含患者情境适用性

- 原始摘要：[arXiv:2602.10367](https://arxiv.org/abs/2602.10367)，2026-02-10。**读取层级：原始摘要**。
- 官方项目：[GitHub README](https://github.com/ZhilingYan/LiveMedBench)。**读取层级：官方代码仓库说明与文件清单，未执行**。
- 团队报告 2,756 例、38 专科、16,702 rubric 标准、中英双语；采用每周采集真实在线临床病例的流程，五轴包括准确、完整、沟通、情境意识和安全。仓库声明 MIT。
- 因此不能称我们的项目是首个动态医疗 benchmark 或首个关注患者约束的 benchmark。
- 限制：其“contamination-free”是作者描述；有时间分割不能证明所有模型训练信息完全不可污染。此次未审计每周发布历史、原社区授权或持续维护履约，不把流程说明当持续更新已充分验证。

### 2. MedSynth 已将证据确定性和推荐强度纳入评价

- 原稿：[MedSynth: Evaluating LLMs on Certainty of Evidence and Strength of Recommendations in Medical Evidence Synthesis](https://openreview.net/pdf?id=hh9GCECH9i)。**读取层级：原始 PDF 搜索索引正文；直接 open 触发浏览器验证，未逐页读取 PDF**。
- 索引显示匿名 ACL submission，分 Literature Understanding、Study Quality Assessment、Cross-Study Evidence Synthesis；CES 明确要求分别判断证据确定性与推荐强度。
- 稿内给出匿名代码地址：[anonymous.4open.science/r/MedSynth-628](https://anonymous.4open.science/r/MedSynth-628/)。**该匿名代码站此次未读取，许可、下载完整性和正式发表状态未确认**。
- 因此不能称我们的项目首个测量 GRADE 确定性或推荐强度；但亦不能把此匿名稿当正式发表或医学公认标准。名称与 2025 年同名 synthetic dialogue 数据集不同，引用时必须写完整标题。

### 3. SciConBench 已有 live 科学结论综合与 clean-room 访问控制

- 原始摘要：[arXiv:2606.11337](https://arxiv.org/abs/2606.11337)，2026-06-09，页面状态 Under Submission。**读取层级：原始摘要与版本记录**。
- 官方代码：[SciConBench](https://github.com/hayoungjungg/SciConBench)。**读取层级：官方 README 与文件清单，未执行**。
- 摘要报告 9.11K 问题和专家综述结论；代码以原子事实 precision/recall/F1 评价，控制 web access 防止直接获取参考结论。README 声明 HF 数据每月新增样本，代码 MIT。
- 因此“living evidence synthesis”以及冻结/滚动题与答案泄露防护不能当我们的单项首创。
- 限制：作者参考结论不是不可争议真相；此处未独立审计 monthly release 履约、数据底层权利或 judge 校准结果。

### 4. MedSR-Bench 已覆盖协议到结论的端到端 SR 评价，但公开数据目前是 RCT/RoB1 导向

- 官方数据卡：[halfmorepiece/MedSR-Bench](https://huggingface.co/datasets/halfmorepiece/MedSR-Bench)。**读取层级：完整官方数据卡与可见样本结构**。
- 官方代码：[MedSR-Copilot](https://github.com/MAGIC-AI4Med/MedSR-Copilot)，[LICENSE](https://raw.githubusercontent.com/MAGIC-AI4Med/MedSR-Copilot/main/LICENSE)。**读取层级：官方代码说明与 Apache 2.0 许可，未执行**。
- 原稿：[medRxiv v2](https://www.medrxiv.org/content/10.64898/2026.07.30.26359375v2.full)。**读取层级：原始搜索索引；全文直接读取 403**。
- 数据卡报告 100 SR/24 医学领域，含 retrieval、screening、extraction、RoB、synthesis 标签；1,297 included RCT records、2,144 analysis groups，RoB 子集明确采用 Cochrane RoB 1.0 五域。数据卡声明 Apache 2.0。
- 不能把 records、analysis groups 或 extraction samples 当独立试验数。不能声称首个 end-to-end SR benchmark。跨诊断、预测、观察性、定性、经济学等证据设计是我们应实证覆盖的扩展方向。

### 5. MedEvidence 已评价“给同一组研究能否得到专家 SR 结论”

- 官方项目：[MedEvidence](https://zy-f.github.io/website-med-evidence/)，标注 ICLR 2026。**读取层级：官方项目正文**。
- 原稿：[arXiv:2505.22787](https://arxiv.org/abs/2505.22787)，2025-05-28；[官方代码与 JSONL 使用说明](https://github.com/zy-f/med-evidence)。**读取层级：官方 README 与 MIT 仓库标签，未执行**。
- 项目配对 100 SR 与其原始研究，测试 24 个模型，关注不确定证据和设计缺陷；代码包含 fulltext JSONL 的评测入口。
- 因此“多篇文献综合”“不确定性”“根据研究质量调整结论”都已有直接先例。我们的区分应是规范化方法审计和可复算链条，而非只对齐参考结论。
- 仓库 MIT 不自动覆盖被引用全文的所有再分发权利。

### 6. HealthBench / Professional 已有多维情境 rubric 和真实医生工作任务

- [HealthBench 原始论文](https://arxiv.org/abs/2505.08775)，2025-05；[Professional 原始论文](https://arxiv.org/abs/2604.27470)，2026-04-30。**读取层级：原始摘要与官方 PDF 摘要正文**。
- [OpenAI 官方 Professional 数据卡](https://huggingface.co/datasets/openai/healthbench-professional)。**读取层级：完整官方数据卡**。
- HealthBench 有 5,000 健康对话；Professional 有 525 个医生任务，分 consult、writing、research，数据卡 MIT，并保留小型 private holdout。
- 关键复现限制：Professional 卡明确称论文使用内部评测实现，不发布正式外部等价实现；simple-evals 是参考实现并可匹配部分设置。因此“开放数据”不等于“精确复现原论文全部条件”。
- 我们可以验证完全公开评分器、参考数值和独立复现是否提供增量优势；不能把医生 rubric adherence 解释成临床获益。

### 7. EvidenceBench 与 RoBBR 已对来源定位和偏倚判断拆任务，许可也不同

- [EvidenceBench 官方代码](https://github.com/EvidenceBench/EvidenceBench)，[分层许可](https://raw.githubusercontent.com/EvidenceBench/EvidenceBench/main/LICENSE.md)。**读取层级：官方 README、数据结构、完整许可标题**。
- EvidenceBench 原版 426 datapoints，100k 版 107,461 datapoints，主任务为假设相关句子检索。代码 MIT；原版 test 为 CC BY，train/dev 为 CC BY-NC-SA，100k 为 CC BY-NC。
- [RoBBR 原始论文](https://arxiv.org/abs/2411.18831)，2024-11-28；[官方代码](https://github.com/RoBBR-Benchmark/RoBBR)，[许可](https://raw.githubusercontent.com/RoBBR-Benchmark/RoBBR/main/LICENSE.md)。**读取层级：原始摘要、官方 README 与许可**。
- RoBBR README 明确拆分支持句检索、支持判断选择、RoB 判定；标签为 low/high/unclear，代码 MIT、数据 CC BY-NC 4.0。论文摘要与 README 对任务计数措辞不同，应引用版本和具体任务而非混用数字。
- 我们不能称首个来源定位或 RoB benchmark；也不能把这些数据打包后统一标“全部可商业使用”。

### 8. MedHELM 已覆盖广泛任务分类，临床/健康“全面”不是空白区

- [官方项目现页](https://medhelm.org/)，[Stanford v2.0.0](https://crfm.stanford.edu/helm/medhelm/v2.0.0/)，[原始论文](https://arxiv.org/abs/2505.23802)。**读取层级：两个官方项目页面、原始摘要；Nature 正文未读取**。
- 共同 taxonomy：5 类、22 子类、121 临床任务，含 personalized instructions、literature research 和 research quality。不能说其只有医考问答或没有个体化。
- 当前独立项目页面为 31 datasets，Stanford v2 页为 35 benchmarks，既有本地研究记录指正式论文为 37；这些数字不可直接合并，必须绑定网页/论文版本与“datasets/benchmarks”计数单位。代码当前声明 Apache 2.0，部分数据私有/受限。
- 我们的可检验优势是临床证据方法学覆盖与证据链可核验程度，并非笼统任务总数超过它。

## 补充基线与相邻项目

| 项目 | 可确认的作用 | 原始来源 / 读取层级 | 此次未确认 |
|---|---|---|---|
| MedQA / MedMCQA / PubMedQA / MultiMedQA | 经典医考、单摘要研究 QA、消费健康问答；MultiMedQA 已有人类多轴评价 | [MedQA 原论文](https://arxiv.org/abs/2009.13081)、[MedMCQA PMLR](https://proceedings.mlr.press/v174/pal22a.html)、[PubMedQA 官方](https://pubmedqa.github.io/)、[MultiMedQA Nature](https://www.nature.com/articles/s41586-023-06291-2)；摘要/项目正文 | 各底层语料再分发权、全部当前维护状态 |
| MedXpertQA | 4,460 题、17 专科、11 身体系统，文本及多模态高难题，ICML 2025 | [官方项目](https://medxpertqa.github.io/)，完整项目正文，MIT 标签 | 底层试题/图像权利及真实临床效度 |
| MedAgentBench | FHIR 虚拟 EHR 中 300 个 patient-specific 任务、100 患者；评 agent 查询与动作 | [项目](https://stanfordmlgroup.github.io/projects/medagentbench/)、[代码](https://github.com/stanfordmlgroup/MedAgentBench)、[原论文](https://arxiv.org/abs/2501.14654)；官方正文/摘要，MIT | 已发现 v2 PubMed 条目但未读 v2 全文，不把旧项目数字当 v2 参数 |
| TrialReviewBench / TrialMind | 已有 search/screening/extraction 评测，100 SR 和 2,220 关联研究；有 human-AI 用户实验 | [原论文全文](https://pmc.ncbi.nlm.nih.gov/articles/PMC12331930/)、[代码](https://github.com/RyanWangZf/TrialMind-SLR)，全文可见/官方 README，代码 MIT | HF 数据底层许可；未独立复现用户研究 |
| MedBrowseComp | 从 live 医学知识库检索并综合多跳事实，超过 1,000 human-curated 问题 | [原始摘要](https://arxiv.org/abs/2505.14963)，2025-05-20，摘要 | 项目为 JS 页面，本次未读取可用数据、完整许可或后续发表状态 |
| MedMeta | 81 meta-analysis，摘要→结论；Golden/Negated-RAG 等条件 | [原稿全文](https://arxiv.org/html/2605.09661v1)，2026-05-10，全文已读取 | 此次未找到并核验其独立数据/代码许可；论文 CC BY 4.0 不等于数据许可 |
| TrialBench | 临床试验风险/设计预测数据集，23 数据集/8 任务 | [原论文](https://www.nature.com/articles/s41597-025-05680-8.pdf)、[团队页](https://www.sunlab.org/research/clinical-trials)，摘要/团队正文 | 不应与证据质量评测 TrialReviewBench 混淆 |
| MEDSYN / LitBench | 多模态复杂病例综合；癫痫多文献来源+片段+缺失证据拒答 | [MEDSYN ACL](https://aclanthology.org/2026.findings-acl.1183/)、[LitBench 原始 PubMed 条目](https://pubmed.ncbi.nlm.nih.gov/42818145/)，原始摘要 | 非全面 SR 方法审计；LitBench 为 medRxiv 2026-09 预印本 |

## 优势论证应怎样做成实验

| 拟议贡献 | 公平的已有对照 | 能支持优势的结果 | 不能支持优势的结果 |
|---|---|---|---|
| 跨证据设计与标准路由 | 按相同任务/来源/人工预算比较；纳入上述最强直接先例 | 诊断、预测、观察性、定性、经济学等新增任务经外部专家确认，工具适用性错误检出率提高 | 仅列更多名词/题量 |
| 证据来源到数值到结论完整审计 | 结论匹配、citation-only、extraction-only 分别作为消融 | 能额外识别重复队列、错误合并、单位/方向/时间点错误、certainty 越级 | 输出长或引用多 |
| 个体化对照敏感性 | HealthBench/MedHELM/LiveMedBench 情境评分作基础参照 | 改变肾功能、风险、偏好、资源时按证据适当改变；仅换无关特征保持稳定；缺关键数据会追问 | 语言听起来个性化 |
| 正确动态更新 | SciConBench/LiveMedBench 更新设计及固定时间窗对照 | 更新事件的检出/正确整合延迟、无关新证据不乱改、撤稿后纠错、旧版本可重跑 | 每周抓新题或排行榜刷新 |
| 评测本身可信 | 双人独立+仲裁、跨机构专家、开放评分器与盲法复现 | 高一致性、错误严重度效度、增量错误检出、参考答案争议被透明修正 | 自己的方法用自己的 judge 得分高 |

最稳妥的定位句：拟建立以当前适用的国际方法学标准为基础、覆盖多种临床与健康证据设计、同时检验证据生成与个体决策、支持可复现动态更新的模块化评测框架。联合能力的覆盖与增量效度是研究假设，待外部验证。

## 仍待后续核验

1. MedSynth 正式录用/作者/版本与匿名代码许可；不能将匿名 ACL 稿日期仅按搜索 crawl 时间认定。
2. LiveMedBench 的逐周可重现版本历史、原社区使用许可，以及动态标签的人类审核细节。
3. 各项目 dataset 许可与底层全文/指南权利分别登记；代码 MIT/Apache 标签不足以解决底层材料再分发。
4. 正式竞争分析需保存检索策略/截止时间、按预设纳入规则补检，避免把本次“未见某功能”写成“该项目没有某功能”。

