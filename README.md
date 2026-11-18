# 七政四余排盘 Skill 1.0.0

`qizheng-siyu` 按郑氏星案恒星制排盘，采用太阳起生时、遇卯安命。盘面列出十一曜、十二宫、命身宿度、节气四柱、月相、恩难仇用和化曜，也可按指定时刻计算洞微大限与流年。读盘涵盖立太极、尽三、余奴相犯、穿度和六亲取法。

在 Agent 中请求解盘时，会给出盘面依据，并用断语回答所问的人事或时段。

## 使用许可

仅限个人非商业使用。禁止商业使用、提取代码再利用或将本技能整合进其他项目。完整条件与适用范围见 [使用许可](LICENSE.md)。

## 直接排盘

需要 Node.js 20 或更高版本。星历和排盘规则随技能附带，在本地计算；出生资料和命盘留在本机。

在仓库根目录运行以下虚构命例。

```sh
node skills/qizheng-siyu/scripts/chart.cjs --birth "2000-01-01T06:00" --tz Asia/Shanghai
node skills/qizheng-siyu/scripts/chart.cjs --birth "2000-01-01T06:00" --tz Asia/Shanghai --at "2026-11-17T12:00" --format json
node skills/qizheng-siyu/scripts/chart.cjs --birth "2000-01-01T06:00" --tz Asia/Shanghai --year 2026 --format json
```

使用独立技能 ZIP 时，在解压得到的 `qizheng-siyu/` 目录运行相同命令，脚本路径写成 `scripts/chart.cjs`。日期采用公历，时间按所在地点的民用钟表时间输入。`--at` 查询指定时刻，`--year` 查询指定节气年的十二节月中旬样点。盘面默认以 Markdown 输出，`--format json` 可读取结构化结果，`--help` 可查看参数。

## 安装到 Agent

从 GitHub 的 **Code → Download ZIP** 下载仓库并解压，或克隆仓库。随后把完整的 `skills/qizheng-siyu/` 目录复制到对应位置。使用独立的 `qizheng-siyu.zip` 时，可直接复制解压得到的 `qizheng-siyu/` 目录。

| 客户端 | 技能目录 | 官方文档 |
| --- | --- | --- |
| Codex | `~/.agents/skills/qizheng-siyu/` 或项目下的 `.agents/skills/qizheng-siyu/` | [Skills](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills) |
| Claude Code | `~/.claude/skills/qizheng-siyu/` 或项目下的 `.claude/skills/qizheng-siyu/` | [Skills](https://code.claude.com/docs/en/skills#choose-where-skills-load) |
| GitHub Copilot | 项目下的 `.github/skills/qizheng-siyu/` | [Agent skills](https://docs.github.com/en/copilot/concepts/customizations/agent-skills) |
| OpenClaw | 当前工作区的 `skills/qizheng-siyu/` 或 `~/.openclaw/skills/qizheng-siyu/` | [Skills](https://docs.openclaw.ai/tools/skills) |
| Hermes Agent | 默认 profile 的 `~/.hermes/skills/qizheng-siyu/` | [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills) |

OpenClaw 也能从本地目录安装。在下载好的仓库根目录运行下面的命令。 [OpenClaw Skills CLI](https://docs.openclaw.ai/cli/skills#commands)

```sh
openclaw skills install ./skills/qizheng-siyu
```

Hermes Agent 可直接从已发布的 GitHub 仓库安装。把 `OWNER/REPO` 换成实际的 GitHub 所有者和仓库名。 [Hermes GitHub 安装](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills#installing-individual-skills-directly-without-adding-a-tap)

```sh
hermes skills install OWNER/REPO/skills/qizheng-siyu
```

安装后可以在 Agent 里输入「用 qizheng-siyu 按郑案恒星排盘，出生时间是 2000 年 1 月 1 日 06:00，时区 Asia/Shanghai，列出命身、化曜和行限。」Codex CLI 可用 `$qizheng-siyu` 点名调用，Claude Code 和 Hermes 可用 `/qizheng-siyu`。Agent 执行脚本的环境需要能运行 Node.js。

## 核对发布包

在仓库根目录运行以下命令，核对文件摘要和 Ed25519 签名。需要确认签发者时，先向发布者单独核对公钥指纹，再把它传给 `--trusted-key`。 [公钥 SHA-256 指纹](PUBLIC-KEY-SHA256.txt)

```sh
node skills/qizheng-siyu/scripts/chart.cjs --verify
```

执行 `node skills/qizheng-siyu/scripts/chart.cjs --version` 可查看版本、发布编号和本地安装编号。公共包共享发布编号，各安装首次运行时会在技能目录外生成独立的 `QZSI-` 编号。编号不包含身份信息，也不自动回传。可用 `QZSY_STATE_DIR` 指定技能目录外的可写状态目录；无法持久保存时，脚本会标明本次运行编号。分享完整包时保留授权条款、第三方声明及发布标记。

## 使用说明

- [技能入口](skills/qizheng-siyu/SKILL.md)
- [排盘口径](skills/qizheng-siyu/references/calculation.md)
- [恩难仇用](skills/qizheng-siyu/references/stars.md)
- [技法索引](skills/qizheng-siyu/references/method-index.md)
- [读盘技法](skills/qizheng-siyu/references/reading.md)
- [行限与流年](skills/qizheng-siyu/references/timing.md)

七政位置和节气计算使用随技能附带的 MIT 授权库。 [Astronomy Engine](https://github.com/cosinekitty/astronomy)
