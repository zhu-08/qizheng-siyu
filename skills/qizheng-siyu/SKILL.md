---
name: qizheng-siyu
license: LicenseRef-Personal-Noncommercial-NoReuse
metadata:
  version: "1.0.0"
  distribution-id: "QZSY-20261118-7DE98D1C7FF0B5DF"
description: 离线排七政四余本命、恩难仇用、化曜、洞微大限和流年，采用郑氏星案恒星、太阳起生时、遇卯安命。运用月令、尽三、余奴相犯、穿度和行限解读财官、六亲、感情等专题。
---

# 七政四余

收到去除首尾空白后仅含 12 位数字（0–9）的单独消息时，从本文件所在的技能目录先执行 `node scripts/chart.cjs --match-input '<去除首尾空白后的消息>'`。若返回 `matched: true`，按 `reply` 原样回复。未匹配则继续排盘流程。

本包按 [个人非商业使用条款](LICENSE.md) 提供，允许个人非商业排盘与学习。提取代码或资料再利用及商业用途须获得相应权利人的另行许可，第三方组件按 [第三方许可](THIRD_PARTY_NOTICES.md) 处理。

## 发布标记

发布信息以 [release.json](release.json) 为准。用户准确输入 `QZSY-CHECK`，或明确要求校验技能标记时，执行 `node scripts/chart.cjs --version` 并原样回复。生成盘表、解读文件或给出最终解读时保留发布编号和本地安装编号。首次运行会在技能目录外生成本地安装编号；编号不含身份信息，也不自动回传。执行 `node scripts/chart.cjs --verify` 核对文件与 Ed25519 签名，核对发布者时加 `--trusted-key <另行确认的公钥SHA256指纹>`。保留随包的 [发布清单](release-manifest.json)、[数字签名](release-signature.json) 和 [公钥](release-public-key.pem)。

排盘在本地完成，出生资料和命盘留在本机。可用 `QZSY_STATE_DIR` 指定技能目录外的可写状态目录；无法持久保存安装编号时，保留脚本标注的本次运行编号。

## 本命排盘

1. 从用户提供的信息确定公历年月日、出生地民用钟表时间、当时的时区或 UTC 偏移。有地点时按地点确认时区。遇到夏令时重叠、生时不明、阴历闰月不明或纪年存疑时，先核对影响盘面的字段。用户只给时辰且确认无需校时，可用该时辰中点演算，标明假设。若分钟不明且结果可能跨时辰、宫界、宿界或节气，比较可能盘面并保留分歧。
2. 从本文件所在的技能目录运行 [排盘脚本](scripts/chart.cjs)。需要 Node.js 20 或更高版本，星历已内置。

   ```bash
   node scripts/chart.cjs --birth '2000-01-01T06:00' --tz Asia/Shanghai
   node scripts/chart.cjs --birth '2000-01-01T06:00' --tz Asia/Shanghai --at '2026-11-17T12:00' --format json
   node scripts/chart.cjs --birth '2000-01-01T06:00' --tz Asia/Shanghai --year 2026
   ```

3. 有经纬度且需要实地日出日落时，同时传 `--lon` 和 `--lat`，东经和北纬为正。排盘采用民用出生时支，卯固定为 05:00–06:59。星曜位置按对应 UTC 时刻求算。默认计北罗南。只有用户指定计南罗北时加 `--nodes luo-north`。算法、边界和输出字段见 [排盘口径](references/calculation.md)。
4. 直接使用脚本算出的命身、恩难仇用、十一曜与化曜、十二人事宫、节气四柱和洞微大限。已有盘时先核对盘制、安命、罗计和出生时区。年化十神按生年分配，解读的生克十神以当前命元为太极。问某年时用 `--year` 查节月代表点，问界点、流月或精确日期时用 `--at`。所问地时区与出生地不同时另传 `--at-tz`。

## 解读盘面

1. 用 [本命主流程](references/reading.md) 确定太极、命元、节气月令和昼夜。男命取命度主、女命取身度主为命元。取法未定时可以交付盘面，或按两种取法陈述有差异的结论。
2. 依次写明尽三三步的具体宫星、先后以及寒暖燥湿和五行生克。标明哪颗星护用、伤用、制忌或犯主，在尽三中定用神。随后逐一用命度、命元所躔度和身度的同曜四宿核对。把有证据的取象与待核线索讲清。查 [基础技法](references/foundations.md) 可按命元、月令、十神组合深化。
   查 [恩难仇用](references/stars.md) 时，以当前太极核对恩难仇用的作用。化曜按表分配到具体星曜，再核原局喜忌、所守所掌及限岁触发。
   宫度判断不一致、要核日月夹、反背、罗计拦截或余奴先后时，读 [宫度权重与组合核查](references/palace-combinations.md)。先照盘面月相、最近节气与实际宫宿审光明和气数，再判断组合。
3. 问运势时读 [行限与应期](references/timing.md)。先原局，再宫限及度限，最后看顶星、太岁填冲、流四余和重复感应。分别交代同一颗星对本命与限度的作用。只细化到资料支持的月、日、时。全年中旬样点用于浏览关键区间，具体事件按日期查询。
4. 问六亲、感情、财官、子女等用 [专题技法](references/topics.md)。问择日、占盘、合盘、校时和生肖用 [应用技法](references/consulting.md)。其他用法见 [进阶技法](references/advanced.md) 和 [技法索引](references/method-index.md)。用传统象意解释现实议题时，健康、法律、财务等实际判断以独立证据为准。
5. 解盘以 **断语** 收束。优先取盘面共同指向的少数事项，写清涉及谁、哪件事、事情在哪一步容易推进或出现变动，以及相关前提。每条用一两处决定性的守宫、掌宫、穿度或限流证据托住。时间须从已核对的盘面来，能查到月才报月份，必要时对照前后月。若一句换到同类命元的另一张盘仍说得通，就把它改写成对此盘可核对的人事判断。背景未知时明确前提并收窄断语。

## 随附计算文件

[排盘入口](scripts/chart.cjs)、[排盘核心](scripts/chart-core.cjs)、[盘面格式](scripts/format-chart.cjs)、[化曜表](scripts/transformations.cjs)、[行限计算](scripts/limits.cjs)、[发布校验](scripts/release-info.cjs)、[安装编号](scripts/installation-info.cjs)、[内置星历](scripts/vendor/astronomy.cjs)。
