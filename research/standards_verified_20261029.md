# 临床与健康证据 benchmark：标准注册表核查笔记

核实日期：2026-10-29（Asia/Shanghai）。用途：框架设计与首轮协议准备；本文件不是正式标准全文，也不是对任何临床问题的建议。仅对下列已浏览的官网或原始论文作核查；无法确认的状态明确保留，不能据此宣称穷尽全球最新标准。

## 1. 对总体定位的直接结论

1. 可以设计覆盖全部主要临床/健康证据类别的模块化架构，但不能说存在一套已经被全球统一接受、可对所有类别直接打同一总分的标准。
2. 至少分开五层：报告完整性、单项结果偏倚风险、证据体确定性、推荐形成与情境适用性、真实实施与临床效益。报告规范不是偏倚工具，偏倚风险不是确定性，确定性也不直接等于推荐强度。
3. benchmark 应评价被测系统是否正确选用和应用标准。标准本身对研究作出的判断，不能与模型表现分数混在一起。例如“高偏倚风险研究被模型正确识别”应是模型表现好，而非模型低分。
4. 评价单元必须精确到标准需要的层级：研究结果/估计值 × 结局 × 时点 × 效应目标；不能默认一篇文章只对应一个独立研究或一个整体 RoB 标签。证据综合还必须保存试验/队列与多报告的链接和重叠。
5. “最新”要与“成熟、适用、许可允许”同时注册。新草案可作为前瞻性扩展轨道，不能静默替换已冻结赛季的正式评分标准。

## 2. 本次核查发现的关键版本变化

| 标准 | 已核实当前状态 | 对项目的实际影响 | 直接来源 |
|---|---|---|---|
| RoB 2 | 官网当前平行组个体随机版本为 2019-08-22；整群和交叉版本 2021-03-18 修订 | RCT 需按设计选择变体并声明 assignment/adherence 效应目标 | https://www.riskofbias.info/welcome/rob-2-0-tool |
| ROBINS-I V2 | 专门官网写明修订文档 2025-11-20，仍为 draft、可能变动；主页另写 2025-11-30 发布消息 | 保留 2016 已发表工具的冻结轨道；V2 作为显式命名的草案扩展，待治理委员会决定。不得仅写“ROBINS-I 最新版” | https://www.riskofbias.info/welcome/robins-i-v2 ; https://www.riskofbias.info/welcome/home |
| ROBINS-E | 官网当前工具 2024-03-24，针对 follow-up/cohort 暴露研究结果 | 可进入暴露/病因/环境职业健康模块；病例对照不能自动套同一版 | https://www.riskofbias.info/welcome/robins-e-tool |
| QUADAS-3 | 2026-02 正式发表于 Annals；Bristol 明确称当前推荐版；官网所链 latest version 1.2 | 新版框架的诊断准确性默认应更新到 QUADAS-3；评价层级变为估计值级，不能沿用 QUADAS-2 研究级结构后只换名字 | https://www.bristol.ac.uk/population-health-sciences/projects/quadas/quadas-3/ |
| QUADAS-AI | 本次核实到 2024-09-18 开发 protocol；未核实正式最终工具 | 标记 development/unverified final；不得当正式评分标准。AI 诊断按 QUADAS-3，若属于预测模型另用 PROBAST+AI；不能混用 | https://doi.org/10.2196/58202 |
| PROBAST+AI | BMJ 2025-03-24 正式发布；论文明确扩展并替代 PROBAST-2019，涵盖回归和 AI 方法 | 预测模型发展质量、性能评价 RoB 与适用性需分开；不是只限 AI | https://www.bmj.com/content/388/bmj-2024-082505 |
| CONSORT / SPIRIT | 2025 版已正式发布 | 默认更新至 2025；AI、整群、非劣效等扩展须记录与母版的兼容性 | https://www.consort-spirit.org/published-statements ; https://www.consort-spirit.org/extensions |
| TRIPOD+AI | 2024 BMJ 正式发布 | 预测模型报告规范，与 PROBAST+AI 的偏倚/适用性评价配对 | https://pubmed.ncbi.nlm.nih.gov/38626949/ |
| TRIPOD-LLM | 官网有正式 checklist、E&E；原始论文 Nature Medicine 31:60–69（2025），DOI 带 2024 | benchmark 研究自身的报告可参照；报告规范不能充作 LLM 临床可靠性的完整偏倚工具 | https://www.tripod-statement.org/tripod-llm/ ; https://www.tripod-statement.org/wp-content/uploads/2025/01/TRIPOD-LLM-Article.pdf |
| STARD-AI | 2025 正式论文可核实（Nature Medicine） | 已发布，不能与尚未核实最终版的 QUADAS-AI 一并写成“开发中” | https://www.nature.com/articles/s41591-025-03953-8.pdf |
| GRADE | 旧 Handbook 官网明确表示正在由 2024 起可用的 GRADE Book 替代；2025 Cochrane GRADEing 报告也称其为官方源 | 注册具体章节/日期/版本；GRADE 不宜冻结成一份无日期的旧 PDF | https://gdt.gradepro.org/app/handbook/handbook.html ; https://book.gradepro.org/ ; https://www.cochrane.org/sites/default/files/uploads/PDFs/Methods%20reports/2025/Spotlight%20On_GRADEingMG.pdf |
| PRISMA-LSR | 官方扩展 2024 已发布 | 动态证据综合轨道可用，补充 PRISMA2020 的更新披露；不意味着 benchmark 本身自动满足 living SR | https://www.prisma-statement.org/lsr |
| JBI 设计工具 | 官方页面列多设计专用工具，含分析性横断面 2026 修订、准实验 2024 修订、RCT 2023 修订 | 不能将所有 JBI checklist 一律标“2017”；按工具逐一锁版本 | https://jbi.global/critical-appraisal-tools |
| COSMIN | 已核实 PROM 系统综述指南 v2.0（2024）；对应 RoB checklist 2024-08-27，文档自称 version 3 | 区分综述指南版本与 checklist 版本；官网个别翻译标 2026 不足以推出英文核心新版 | https://pmc.ncbi.nlm.nih.gov/articles/PMC11541334/ ; https://www.cosmin.nl/wp-content/uploads/COSMIN-RoB-checklist-for-PROMs-V3_1.pdf |
| WHO guideline handbook | 官网仍提供 2014 第二版及补充章节；GRC 页面标 handbook update under development 2025 | 不虚构一个已发布的“WHO 2025新版”；继续监测更新 | https://www.who.int/publications/i/item/9789241548960 ; https://www.who.int/groups/guidelines-review-committee |

NICE PMG36 官网搜索抓取显示 2026-03-31 更新，但本次直接打开超时；搜索另有镜像显示 2026-10-13。此冲突尚未通过官方实时正文解决，故本项目不能把上述任一日期当作已完成的最终版本锁定。当前入口：https://www.nice.org.uk/process/PMG36 。实际建立英国卫生经济学轨道时须重新下载官方当前正文，保存版本和哈希。

## 3. 证据类型 × 标准层级映射

以下是拟采用映射；“核心”表示适合首版落地，并不表示已完成题库或专家标注。“扩展”表示需专门的领域专家、许可和测量验证。不同临床问题可共享研究设计工具，但还须评价其结局、时间、适用人群和间接性。

| 证据/问题类型 | 报告规范 | 偏倚风险/方法评价 | 证据体或决策层 | 轨道建议 |
|---|---|---|---|---|
| 药物、手术、护理、康复、营养、运动、心理等随机干预研究 | CONSORT2025；协议 SPIRIT2025；适用设计/干预扩展 | RoB2 相应设计版本 | 结局级 GRADE；GRADE EtD | 核心。不能按干预名称改变方法学基准 |
| 非随机干预与真实世界治疗效应 | STROBE 对应设计；常规数据库研究适用 RECORD 等扩展（需进一步逐版核实） | ROBINS-I 已发表工具；V2 draft 分轨；适当准实验可考虑 JBI 专用工具 | 相应 GRADE 指导；EtD | 核心，但预设混杂、target trial 与效应目标；不将全部 RWE 当成同一种设计 |
| 诊断、筛查、分期的准确性 | STARD2015；AI 检测适用 STARD-AI2025 | QUADAS-3 v1.2；比较准确性 QUADAS-C 兼容性需专家确认 | GRADE 检测准确性及检测策略链式证据；不能以准确性代替患者临床获益 | 核心 |
| 筛查策略的获益与伤害 | 原始设计的报告规范 | 按 RCT/非随机效应设计选择；准确性部分另用 QUADAS-3 | GRADE/EtD；过度诊断、假阳性、后续治疗及患者重要结局 | 核心，明确是策略问题而非纯性能问题 |
| 预后因素 | STROBE 与适用预后报告规范 | QUIPS2013 | 专用 GRADE 预后因素指导 | 核心/早期扩展 |
| 整体预后/自然史 | 对应队列报告规范 | 未找到一种能无条件覆盖全部情境的统一工具；Cochrane FAQ 提供适配 QUIPS/PROBAST 的建议 | 预后类 GRADE 指导 | 扩展；任何适配均标“本项目适配，需验证” |
| 诊断/预后预测模型 | TRIPOD+AI2024 | PROBAST+AI2025，保留开发质量、性能 RoB、适用性分别判断 | 校准、区分、临床效用、外部验证、可迁移性；不自动套干预 GRADE | 核心 |
| 病因、伤害、环境/职业/行为暴露 | STROBE 与适用扩展 | ROBINS-E2024 仅适用其 follow-up 范围；其他设计依 JBI 等并预注册 | 因果推断与适用 GRADE 指导；必要时领域框架 | 核心覆盖队列，其余扩展 |
| 患病率/发病率和人群描述 | STROBE；相关新报告扩展逐项核实 | JBI prevalence、对应横断面/队列工具 | 人群代表性、抽样框架、标准化、间接性与估计精度 | 扩展，不强迫解释为因果或治疗效应 |
| 系统综述、Meta分析、NMA | PRISMA2020 + 相应 DTA/NMA/ScR/Search/LSR/IPD 等扩展 | ROBIS；AMSTAR2 限其干预综述适用范围；合成缺失证据适用 ROB ME | 结局级 GRADE；NMA 确定性方案需另锁定 GRADE/CINeMA 版本 | 核心（SR/成对Meta），NMA/DTA/IPD 分阶段 |
| 定性研究与体验证据 | COREQ/SRQR（本次未逐版核查，注册前复核） | JBI qualitative 等 | GRADE-CERQual 对每条综合发现评估 | 扩展，但“健康证据全面覆盖”的必要部分 |
| 混合方法与复杂公共健康干预 | 各原始设计规范；MRC2021 是研发评价框架而非报告清单 | 按组件评估，再评价整合；MMAT 具体版需另核实 | EtD、情境/机制/可及性/公平性；定量与定性证据并置 | 扩展；不能把随机证据层级机械用于所有问题 |
| 卫生经济学与HTA | CHEERS2022；AI 经济学等扩展逐项核实 | JBI economic 或针对模型的专用方法评价；不是 CHEERS 分数 | 本地视角、比较对象、时间范围、价格年、贴现、ICER/净获益、不确定性与公平性 | 扩展；区域规则分轨 |
| 临床实践指南/推荐 | RIGHT；具体更新草案另记 | AGREEII；推荐层可加 AGREE-REX；卫生系统 AGREE-HS | GRADE EtD、证据到推荐链、适用地区和日期 | 核心读解与对齐；完整独立评价需专家 |
| 病例报告/病例系列、罕见病信号 | CARE；系列适用报告规范 | JBI case report/case series | 信号意义、可迁移限制；不得从单病例直接推出疗效确定性 | 扩展 |
| PROMs与其他结局测量工具 | PRISMA-COSMIN for OMIs2024；原始测量研究适用 COSMIN 报告规范 | COSMIN2024/设计适用工具，按测量属性和量表/分量表版本 | 测量属性充分性与证据确定性分开 | 扩展 |
| 器械、数字健康、AI干预 | 根据研究设计使用 CONSORT/SPIRIT；适用 CONSORT-AI/SPIRIT-AI；早期临床评价 DECIDE-AI | 若为 RCT 用 RoB2，预测用 PROBAST+AI，准确性用 QUADAS-3 | 临床效益、流程影响、更新漂移、人因和监管适用性 | 扩展；不能把“器械/AI”误作单一研究设计 |
| 健康系统/政策、实施证据 | 原始设计规范；实施/质量改进相关扩展需逐版核实 | 依据因果设计、定性与复杂干预组件选择 | MRC2021、EtD、实施情境与可行性 | 扩展 |
| 机制、动物/体外、组学、MR、药物警戒等 | 各专用规范，未在本轮完整核查 | 各专用工具，不能按临床疗效工具硬套 | 清楚标注离临床决策的间接性 | 全景架构中预留；不宣称 v1 已有效覆盖 |

补充：临床指南、药品说明书、监管安全通告、试验注册、预印本和正式论文都是不同来源状态。应保存来源身份、日期、地区和撤稿/更正状态；它们不是同一种“研究设计”，也不能用同一种 RoB 工具。

## 4. 个体化维度如何由标准支撑

- 证据适用性：PICO/目标人群、纳排条件、基线风险、共病、合并治疗、器官功能、妊娠/哺乳、年龄与功能状态、既往失败史、结局与随访窗口、临床与资源情境；依据 GRADE 间接性、工具适用性与 EtD。
- 绝对获益与伤害：从可迁移的相对效应与有来源的个体基线风险得到绝对效应，并显示假设和不确定性。不得把基线风险改变自动说成已证实治疗效应异质性。
- 偏好与负担：患者重视的结局、风险权衡、治疗负担、依从可行性、费用与获得性；依据 EtD 中价值、资源、公平性、可接受性和可行性；没有唯一偏好时应允许多个合理选择。
- 个体差异与公平：仅在临床上相关时对信息变化作出响应；无关人口标签变化应保持结论稳定。不得用群体标签无依据推断个体风险。
- 对未知和冲突的处理：资料缺失要识别补充信息需求，证据不可迁移要标出边界；不同地区指南发生冲突时，要根据地区、适用范围、日期和证据链解释，不能机械以“较新”或某一国指南为唯一真值。
- 个体化正确性不是“提到病人的信息”。应以专家审核的成对病例/反事实病例检验：真正改变决策的条件改变时是否改变、无关条件改变时是否稳定、证据不足时是否避免伪精确。

## 5. 拟采用的动态治理方案（项目设计建议，非外部标准要求）

建议为每一标准注册以下字段：standard_id、名称、family、purpose_layer、unit_of_assessment、适用设计/问题、明确不适用情形、版本/文档日期、出版日期、官网与 DOI、retrieved_at、effective_from、status（formal/draft/development/superseded）、supersedes、语言/获认可翻译、许可、文件哈希、适配说明、专家签字、下一次复核时间。

每项任务同时锁定：临床证据截止日、标准截止日、地区规则、病例版本、评分规则版本、专家参考判断版本、模型与工具版本。历史赛季按原版本重跑；新标准生效后在新赛季重标，桥接公共锚题验证分数漂移。

触发：标准发布/修订、重要勘误/撤稿、指南更新、药品安全事件或关键新研究 → 自动抓取候选变更 → 人工核实与影响分析 → 双人重标受影响任务 → 仲裁 → 发布新 manifest 与 changelog → 保留旧版复现。推荐按月检查来源、按季度发版；安全事件可加急。这里是 roadmap 建议，本次没有创建任何后台自动化。

应保留“未更新”“无需改变”“需要改变”“证据不足无法决定”几类任务，避免动态轨道奖励系统见新文献就改答案。更新后正确维持结论也是能力。

标准更新不只影响 checklist：如 QUADAS-3 从研究级转为估计值级，就涉及数据结构、参考标注和分母变化；不能只更新版本字符串。

## 6. 专家参考标准与评分边界

- 先由两位独立领域/方法专家应用相关标准，保存结论与定位证据；分歧由第三位仲裁。保留原始分歧与合理判断范围。不是所有标准都要求同样流程，这是 benchmark 的质量控制设计；AGREEII 官方手册确实建议至少两位、最好四位评价者。
- 领域专家负责临床语义，方法专家负责标准与统计；个体化任务加入患者/公众代表审阅偏好和沟通维度；区域专家审阅当地可实施性。
- 不要求生成与某个唯一措辞一样的答案；对存在专业合理分歧的 GRADE、RoB、推荐判断，参考答案应包含可接受区间、必要理由与不可接受错误。
- 自动评价可检查结构、数值、引用位置、工具适配与规则一致性；临床高风险与方法判断须有人类校验。LLM-as-judge 需要盲法抽检、不同模型/长度/语言偏差检验与专家一致性校准，不能把裁判 LLM 当作临床金标准。
- 报告各层的表现与置信区间、严重错误率；不把不同工具的 Low/Some concerns/Serious 等标签当作可直接相加的跨设计质量分。
- AMSTAR2 原始论文明确反对把条目相加为总质量分。可以统计模型逐条判断是否正确，但必须保持原工具的关键缺陷/总体信心逻辑。
- STROBE 官方明确不是观察研究质量评价工具；RIGHT 官网明确不是指南质量评价工具；CHEERS2022 是经济学报告规范。这三个常见误用应成为 benchmark 的专门陷阱题。

## 7. 许可与可持续性

风险偏倚工具官网标明 RoB2、ROBINS-I、ROBINS-E、ROB ME 为 CC BY-NC-ND 4.0。研究中引用与按原工具应用，不等于可在商业系统中任意复制、修改、翻译和再分发全文。立项阶段把许可纳入注册表，并将自主编写的能力评价 rubric 与官方工具文本分开；需要的商业许可应按实际使用方式解决。

基准的可持续性依赖方法专家和临床/患者治理，不只是持续抓取网页；“动态”应有实际变更日志、重标记录和发布节律作为证据。

## 8. 其余直接来源与使用范围

- ROBIS 官方：https://www.bristol.ac.uk/population-health-sciences/projects/robis/ — 系统综述偏倚风险，与原始研究工具不同。
- AMSTAR2 原始论文：https://pmc.ncbi.nlm.nih.gov/articles/PMC5833365/ — 干预综述批判性评价，反对条目相加总分。
- GRADE 工作组：https://www.gradeworkinggroup.org/ — 明确 EtD 的健康与情境条件，含价值、资源、公平性、可接受性、可行性。
- GRADE-CERQual：https://www.cerqual.org/overall-confidence-in-the-evidence/ — 定性综合发现的信心；方法局限、连贯性、数据充分性、相关性四个组件。
- PRISMA 扩展总表：https://www.prisma-statement.org/extensions — 含已发布与开发中的扩展；更新 PRISMA-NMA/ScR/P/AI 等状态不能混为一谈。
- PRISMA-NMA：https://www.prisma-statement.org/nma — 已发布版2015；官方扩展总页另列更新中。
- PRISMA-DTA：https://www.prisma-statement.org/dta — statement2018、E&E2020。
- PRISMA-COSMIN for OMIs2024：https://pmc.ncbi.nlm.nih.gov/articles/PMC11286641/ — 测量工具综述报告规范。
- AGREEII 官方：https://www.agreetrust.org/resource-centre/agree-ii/ — 指南评价工具；官网同时列 AGREE-REX、AGREE-HS 等工具。
- AGREEII 官方手册：https://www.agreetrust.org/wp-content/uploads/2013/06/AGREE_II_Users_Manual_and_23-item_Instrument_ENGLISH.pdf — 至少两位、最好四位评价者；23条、6域及总体评价。不能凭网页/路径年份推断当前手册版本。
- RIGHT 官网：https://www.right-statement.org/ — 指南报告规范；首页显示首次更新的 protocol，未据此认定正式更新已发布。
- CHEERS2022 原始E&E：https://doi.org/10.1016/j.jval.2021.10.008 — 替代2013，报告规范，不充作经济学方法质量工具。
- STROBE 官网：https://www.strobe-statement.org/ — 队列/病例对照/横断面报告规范；明示不是研究质量工具。
- CARE 官网：https://www.care-statement.org/downloads — 2013 checklist，2017 E&E。
- QUIPS 原始论文：https://doi.org/10.7326/0003-4819-158-4-201302190-00009 — 预后因素偏倚风险。
- Cochrane Prognosis FAQ：https://methods.cochrane.org/prognosis/faq — 设计适配与整体预后缺口；页面仍写 PROBAST 而未反映 PROBAST+AI，版本判断以更新后的原始工具来源为准。
- MRC-NIHR 复杂干预框架2021原始论文：https://www.bmj.com/content/374/bmj.n2061.full — 关注情境、机制、利益相关者、可行性和实施，不是统一质量打分工具。
- PAHO/WHO 适配实施手册第二版：https://www.who.int/publications/i/item/9789275127537 — 本地适配、制度化与实施方面的补充。
- EQUATOR 报告规范目录：https://equator-network.org/reporting-guidelines/index.html — 用于候选发现和状态交叉核查，最终锁定仍回到各规范原始来源。

## 9. 本轮未完成事项

未全文下载和计算所有工具文档哈希；未核实所有工具的现行商业许可/翻译授权；未就“全球公认”实施任何系统调查；未逐版核实 MMAT、CINeMA、RECORD、SQUIRE、COREQ/SRQR、所有器械/监管/药物警戒/基因组学等专用模块；未形成独立专家正式认可的 standard-to-task crosswalk；未创建题库金标准或实际运行模型。上述属于 roadmap 工作，不能以本次框架笔记替代。
