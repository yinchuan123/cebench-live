# CEBench-Live 1.0

临床与健康证据评价框架、研究工具和材料初评入口。

[在线评价入口](https://evidenceos.cn/benchmark/) · [GitHub 1.0 发行](https://github.com/yinchuan123/cebench-live/releases/tag/v1.0.0)

CEBench-Live 帮助用户定位证据材料中的问题、了解可核查范围，并安排进一步复核。用户可提交自己的材料；支持的具体格式、解析结果和本次检查范围由入口页面说明。

**1.0 是公开软件与框架的发行版本。** 当前没有人工审定题库、真实系统比较或正式排行榜。自动初评不等同于原文核验、专家评审或临床安全认证。

## 版本与范围

| 层次 | 版本与现状 |
| --- | --- |
| 软件和公开框架发行 | 1.0.0 |
| 方法规划 | 0.2.1-planning：12 个维度、7 条赛道、17 类证据模块；专用量表与效度验证尚待完成 |
| 用户与商业内容 | 0.3：客户需求、价格、复购和服务时限待试点验证 |
| 旧版计算工具 | 0.1.0-draft：10 个维度、26 项子指标，试行权重未经验证 |
| 正式参考与运行 | 0 个人工审定病例；0 个真实系统比较；12 个选题种子仍待审定 |

旧版计算工具与 12 维规划不兼容，不自动产生新版得分。证据交付质量分 Q 不代表证据确定性、治疗效果或患者获益。研究、报告、结局和重复运行不能自动算作独立研究或独立题根。

## 阅读入口

- [对外介绍](outputs/v0.3/临床证据Benchmark对外介绍.md)：评价解决什么问题、交付什么。
- [用户价值与商业方案](outputs/v0.3/临床证据Benchmark用户价值与商业方案.md)：试点与服务规划。
- [框架与路线图](outputs/v0.2/临床与健康证据Benchmark框架与路线图.md)：方法范围与验证要求。
- [方法蓝图](outputs/v0.2/benchmark-blueprint-v0.2.json)和[任务合同模板](outputs/v0.2/task-contract-template-v0.2.json)。
- [计算手册](outputs/v0.1/measurement-handbook.txt)、[来源台账](data/source-register.json)和[检索记录](research/search-audit.txt)。
- [1.0 材料入口范围](docs/v1-product-scope.md)：本地初评、DeepSeek 深评、来源追溯和资料处理说明。

旧版自包含计算演示在 `outputs/v0.1/CEBench-Live-v0.1.html`。`outputs/v0.3/CEBench-Live用户与商业说明.html` 为离线阅读页。两者均可直接用浏览器打开。

## 本地运行与核查

要求 Node.js 22.13 或以上与 Python 3.10 或以上。

```sh
npm ci
npm test
npm run build
npm run package:release
npm run preview
```

`npm test` 核查计算边界、缺失数据和题根配对运算，使用合成数据，不代表医学效度验证。`npm run build` 从本地版本化材料重建报告和网站，并生成发行清单。`npm run package:release` 仅按明确的公开目录清单生成可分发包，排除内部部署目录、环境文件、用户提交和运行数据库。

可单独重建阅读页：

```sh
npm run build:reports
node tools/evaluate-record.js data/evaluation-template.json
node tools/score-metrics.js data/raw-metric-template.json
```

可选的旧版浏览器核查需要 Playwright 浏览器：

```sh
npx playwright install chromium
npm run qa:report
```

首次构建会下载已固定来源和校验值的中英文 OCR 语言资源，后续复用本地资源。

构建不会联网更新医学来源，也不会替代实际来源核查。来源状态以台账中的核查日期、读取方式及限制为准。

## 材料初评与正式评价

材料入口报告实际读到的内容与解析缺口，自动发现的问题保留原文位置和判断依据。没有原始来源或过程记录时，相应项目保持待核查；读到一段文字不代表验证了其引用，读取最终报告不代表核验了检索完整性或真实双审。

规则初评在浏览器执行。DeepSeek 深评需要 EOS 后台集成、负责人私密配置有效模型密钥，以及使用者登录并主动同意。公开代码不含模型密钥。DeepSeek 深评将解析文字及用途发送至模型，并通过 Crossref、Europe PMC 取得可用来源；元数据、摘要和全文取得范围分别标记。模型判断保留为模型判断，不能直接变成人工确认。模型密钥未配置或接口不可用时，页面须说明无法深评，不生成假结果。

独立构建的前端可用于本地规则初评；本仓库不提供包含生产身份、密钥或数据库的独立 EOS 服务器。生产模型是否配置、是否完成真实调用验收，以实际部署记录为准。`.xls` 文件须先转换为 `.xlsx` 或 CSV。

本版不把新上传材料转换为正式 benchmark 排名。正式比较仍需冻结任务、来源参考、评分规则和运行条件，完成独立审定、全部分配任务留档及相应外部验证。正式 RoB、GRADE 或指南评审需要各自的工具、理由及真实人员记录。

请勿在公开 Issue 或 Pull Request 中上传患者身份信息、密码、受限全文或未获授权材料。

## 贡献与引用

报告问题时请注明软件版本、复现步骤、预期与实际行为。涉及真实材料时，提供可公开的最小示例或合成示例。方法建议与软件修复分别记录，新增权重或评分规则不会因代码通过而自动获得效度。

引用信息见 [CITATION.cff](CITATION.cff)，变更见 [CHANGELOG.md](CHANGELOG.md)。

本仓库公开可阅；尚未授予统一的开源使用许可。自写代码、文字及数据的复制、修改和再分发须另获权利人许可。第三方标准、量表、论文、软件和链接资料保留各自权利；本仓库的来源元数据及链接不转授第三方全文或工具使用权。

