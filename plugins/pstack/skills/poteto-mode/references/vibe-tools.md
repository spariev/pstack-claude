# Mistral Vibe tool mapping for pstack

Mistral Vibe loads pstack as a native Agent Plugins 1.0 plugin (`~/.vibe/plugins/pstack`), with skills namespaced as `pstack:<name>`. Its tools differ from Claude Code's. Use the tools and parameters available in the current session if they differ from this guide.

| Claude Code action | Mistral Vibe action |
| --- | --- |
| Read, write, edit, and search files | `read_file`, `write_file`, `edit`, and `grep` (there is no `Glob` tool; list directories with `bash`) |
| Run a shell command | `bash` |
| Fetch a URL or search the web | `web_fetch` and `web_search` |
| Invoke a skill with the `Skill` tool | the `skill` tool with the namespaced name, for example `pstack:poteto-mode`; user-invocable skills also answer to `/pstack:<name>` |
| Dispatch a subagent with the `Agent`/`Task` tool and `subagent_type` | the `task` tool with `agent: "pstack:<name>"`, for example `pstack:poteto-agent`, from this plugin's `ai.mistral.vibe/agents/*.toml`. `general-purpose` has no equivalent: use `pstack:poteto-agent` for writing delegates and state "read-only" in the task for exploration. |
| `run_in_background: true` | No equivalent: `task` runs in the foreground and returns when the subagent finishes. Wait for the result. |
| Track tasks with `TaskCreate` / `TaskUpdate`, or `TodoWrite` | `todo` with the `todos` list |
| `AskUserQuestion` | `ask_user_question`, or ask in the reply when the host cannot show questions |
| `SendMessage` | Vibe has no tool to message a running subagent; `task` is foreground-only, so wait for its result. |
| `ScheduleWakeup` and the `loop` skill | No equivalent: Vibe's hooks cover tool calls and agent turns, not scheduled wake-ups. Say that scheduling is unavailable. |
| `readonly: true` | No parameter: plugin subagents ship fixed `enabled_tools`; state the read-only scope in the task prompt. |
| `isolation: \"worktree\"` | No parameter: create a git worktree with `bash` for each concurrent writer. |
| `CLAUDE.md` | Vibe has no `CLAUDE.md`; it injects project context automatically. Standing instructions go in `~/.vibe/config.toml` prompts, not `CLAUDE.md`. |
| Search Claude Code transcripts under `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/` | Vibe's session transcripts: the `transcript_path` field of hook payloads and the session store under `${VIBE_HOME:-$HOME/.vibe}/`. Never read Claude Code's projects directory; it holds Claude Code history, not this session's. |
| `plugin-dev:skill-development` | Vibe ships the built-in `vibe:skill-creator` skill (`/vibe:skill-creator`). |
| Project skills under `.claude/skills/` | `./.vibe/skills/` or `./.agents/skills/` in a trusted project, `~/.vibe/skills/` or `~/.agents/skills/` at user level; plugin skills from `~/.vibe/plugins/pstack/skills/` as `pstack:<name>`. |

Vibe's `task` tool takes no per-call `model` parameter, so a role's model cannot be passed on dispatch: the subagent runs its own `active_model` or the session model. Set the session model with `/model`. The plugin's subagents ship no `active_model`, so role models apply through the session and the sheet below. `inherit-parent` and `auto` do not exist on Vibe; there is no `model` field to omit.

Vibe has no session-start hook (its hooks are `pre_tool`, `post_tool`, and `post_agent` only), so pstack's automatic routing does not load. Invoke `poteto-mode` explicitly with `/pstack:poteto-mode`. A running session pins the plugin's content; run `/reload-plugins` or start a new session after an update.

## Model names

Skills name Claude defaults (a single-role default for code/prose/judgment, a worker model for feature and refactoring code, plus a diverse-model panel for diverse-model panels; each model-consuming skill lists its own in a Models section). These slugs do not resolve on Mistral Vibe. Substitute your configured Mistral Vibe models:

- Single-model roles: your primary Mistral Vibe model (for example `mistral-large-latest`).
- Roles that default to the Claude worker model (`feature, refactoring`): your fast Vibe coding model (for example `devstral-2-latest`).
- Roles that default to the strongest Claude model (`strongest judgment`): your strongest Mistral Vibe model (for example `mistral-large-latest`).
- Diverse-model panels (`arena`, `architect`, `interrogate`): the adversarial signal comes from model diversity, so use the distinct Mistral Vibe models available to you. A good default panel on Mistral Vibe is `mistral-large-latest`, `devstral-2-latest`, `mistral-medium-3.5`, `ministral-8b-latest`. If your Vibe configuration reaches only one model family, vary the thinking level and note in the verdict that diversity was reduced.

Vibe's `task` tool takes no per-call `model`: it dispatches `agent: "pstack:<name>"` and the subagent runs its own `active_model` or the session model (`/model`). The plugin's subagents ship no `active_model`, so role models apply through the session and the sheet. The model sheet is `${VIBE_HOME:-$HOME/.vibe}/pstack-models.md`; read it before a skill that needs a role model (`architect`, `arena`, `how`, `interrogate`, `no-comments`, `poteto-mode`, `reflect`, `swarm`, `thermos`, `why`). `inherit-parent` and `auto` do not exist on Vibe; there is no `model` field to omit.

`/setup-pstack` writes the configured model list. On Mistral Vibe, set it to your Vibe model aliases.

## Per-skill notes

| Skill | On Mistral Vibe |
| --- | --- |
| `poteto-mode` | Invoke `/pstack:poteto-mode` explicitly; no session-start hook routes to it. |
| `setup-pstack` | The sheet is `${VIBE_HOME:-$HOME/.vibe}/pstack-models.md`, read by the agent before a role-model skill; the `session hook` line does not apply. |
| `why` | Run independent investigators with `task` and wait for each result. |
