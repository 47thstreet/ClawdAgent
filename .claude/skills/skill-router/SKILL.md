---
name: "Skill Router"
description: "Intelligent skill router and summoner. Analyzes user intent and invokes the best matching skill(s) from the installed collection. Use when the user says 'route this', 'find the right skill', 'which skill should I use', or when you need to match a task to the optimal skill."
---

# Skill Router

Analyzes user intent and summons the best-matching installed skill(s). Acts as a dispatcher that maps tasks to skills so the user doesn't need to know skill names.

## How to Route

### Step 1: Scan installed skills

List all available skills from the system-reminder skill list in the current conversation context. Each skill has a name and trigger description.

### Step 2: Score relevance

For each candidate skill, score on:
1. **Keyword overlap** — does the user's request contain words from the skill's trigger description?
2. **Domain match** — is the task in the same domain as the skill?
3. **Specificity** — prefer specific skills over generic ones (e.g. `react-pdf` over `pdf` for React PDF generation)

### Step 3: Select and invoke

- **Single clear match**: Invoke the skill directly using the Skill tool.
- **2-3 strong matches**: Present the top matches with one-line descriptions. Ask user to pick, or recommend one.
- **No match**: Say so. Offer to use `find-skills` to search for installable skills, or handle the task directly.

## Routing Rules

1. **Never guess** — if confidence is low, present options instead of auto-invoking.
2. **Prefer composed skills** — if a task spans multiple skills (e.g. "build a Next.js app with tests"), invoke them sequentially: `next-best-practices` then `unit-testing`.
3. **Respect specificity** — `next-cache-components` beats `next-best-practices` for caching questions. `react-native` beats `react` for mobile.
4. **Skip meta-skills** — don't route to `skill-router`, `find-skills`, `skill-builder`, `skill-creator`, or `23-progressive-disclosure` unless explicitly asked.

## Quick Reference: Domain Keywords

| Domain | Keywords | Top Skills |
|--------|----------|------------|
| React/Next.js | react, next, RSC, SSR, app router | `next-best-practices`, `vercel-react-best-practices`, `react` |
| Mobile | react native, expo, iOS, android | `react-native`, `vercel-react-native-skills` |
| Documents | PDF, Word, Excel, PowerPoint, slides | `pdf`, `docx`, `xlsx`, `pptx` |
| Design/UI | UI, UX, design, styling, theme | `ui-ux-pro-max`, `frontend-design`, `web-design-guidelines`, `theme-factory` |
| Testing | test, jest, playwright, e2e, QA | `unit-testing`, `webapp-testing`, `dogfood` |
| DevOps/CI | deploy, GitHub Actions, CI/CD, release | `deploy-to-vercel`, `github-workflow-automation`, `github-release-management` |
| Git | branch, merge, PR, rebase, worktree | `git-expert`, `git-guide` |
| AI/ML | model, train, fine-tune, inference | numbered skills `01`-`20` (use progressive-disclosure mapping) |
| Security | pentest, audit, vulnerability, OSINT | `21-security-testing` |
| API/SDK | Claude API, Anthropic SDK, AI SDK | `claude-api`, `ai-sdk` |
| Media | image, video, animation, GIF | `ai-image-generation`, `ai-video-generation`, `slack-gif-creator`, `algorithmic-art` |
| Browser | automate, scrape, navigate, click | `agent-browser`, `browser`, `electron` |
| Docs/Writing | documentation, internal comms, paper | `doc-coauthoring`, `internal-comms`, `20-ml-paper-writing` |
| MCP | MCP server, tool, protocol | `mcp-builder`, `mcp` |
| Swarm/Multi-agent | swarm, orchestrate, multi-agent, hive | `swarm-orchestration`, `hive-mind-advanced`, `swarm-advanced` |

## Example Routing

**User**: "I need to create a PDF report from some data"
**Route**: Invoke `pdf` skill

**User**: "Help me write unit tests for my React components"
**Route**: Invoke `unit-testing` skill (more specific than `react`)

**User**: "Deploy my Next.js app"
**Route**: Invoke `deploy-to-vercel` skill

**User**: "Build a beautiful landing page with animations"
**Route**: Invoke `frontend-design` skill, suggest `ui-ux-pro-max` for design system guidance

**User**: "I want to generate AI images for my project"
**Route**: Invoke `ai-image-generation` skill
