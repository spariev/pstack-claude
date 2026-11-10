// Mistral Vibe packaging contracts: the native Agent Plugins 1.0 bundle under
// plugins/pstack/vibe/ follows the rules Vibe's plugin loader enforces, the
// bundled skills mirror the shared tree, and the mapping covers the
// Claude-specific terms the skills use.
import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { agentSkills, loadModels, vibeAgentToml } from "../tools/generate.mjs";
import { PLUGIN, SKILLS } from "../tools/plugin.mjs";
import { roleSkills, RUNTIMES, validateVibeManifest, vibeModelNamesSection, VIBE_BUNDLE } from "../tools/runtimes.mjs";
import { walk } from "../tools/validate-skills.mjs";
import { mappingCoverage } from "./mapping-coverage.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const vibe = RUNTIMES.find((runtime) => runtime.name === "Mistral Vibe");
const mapping = readFileSync(join(repoRoot, vibe.tools), "utf8");
const models = loadModels();

mappingCoverage(vibe, [
  ["AskUserQuestion", "`ask_user_question`"],
  ["subagent_type", "`subagent_type`"],
  ["run_in_background", "`run_in_background: true`"],
  ["TodoWrite", "`TodoWrite`"],
  ["TaskCreate", "`TaskCreate`"],
  ["readonly", "`readonly: true`"],
  ["the `Skill` tool", "the `skill` tool"],
  ["the `Agent` tool", "the `task` tool"],
  ["plugin-dev", "`vibe:skill-creator`"],
  ["CLAUDE.md", "`CLAUDE.md`"],
  ["pstack:poteto-agent", "`pstack:poteto-agent`"],
  ["general-purpose", "`general-purpose`"],
  ["isolation: \\\"worktree\\\"", "`isolation: \\\"worktree\\\"`"],
  [".claude/skills", ".agents/skills"],
  ["${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects", "`${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/`"],
  ["`loop`", "`loop`"],
]);

describe("Mistral Vibe plugin bundle", () => {
  const manifestPath = `${VIBE_BUNDLE}/plugin.json`;
  const manifest = JSON.parse(readFileSync(join(repoRoot, manifestPath), "utf8"));
  const options = {
    read: (rel) => readFileSync(join(repoRoot, rel), "utf8"),
    pathExists: (rel) => existsSync(join(repoRoot, rel)),
    agentSkills: (dir) => agentSkills(join(repoRoot, dir)),
  };

  test("validateVibeManifest passes on the committed bundle", () => {
    expect(() => validateVibeManifest(manifest, options)).not.toThrow();
  });

  test("the manifest carries exactly one version field, stamped from VERSION", () => {
    const text = readFileSync(join(repoRoot, manifestPath), "utf8");
    expect(text.match(/"version"\s*:/g)).toHaveLength(1);
    expect(manifest.version).toBe(readFileSync(join(repoRoot, "VERSION"), "utf8").trim());
  });

  test("the bundled skills mirror the shared tree byte for byte", () => {
    const shared = agentSkills(join(repoRoot, SKILLS)).map((skill) => skill.name).sort();
    const bundledRoot = join(repoRoot, `${VIBE_BUNDLE}/skills`);
    const bundled = agentSkills(bundledRoot).map((skill) => skill.name).sort();
    expect(bundled).toEqual(shared);
    for (const file of walk(bundledRoot)) {
      const rel = file.slice(bundledRoot.length + 1);
      expect(readFileSync(file, "utf8")).toBe(readFileSync(join(repoRoot, SKILLS, rel), "utf8"));
    }
  });

  test("no symlinks anywhere in the bundle, since Vibe rejects escaping links", () => {
    expect(lstatSync(join(repoRoot, VIBE_BUNDLE)).isSymbolicLink()).toBe(false);
    for (const file of walk(join(repoRoot, VIBE_BUNDLE))) {
      expect(lstatSync(file).isSymbolicLink()).toBe(false);
    }
  });

  test("every shared plugin agent has a generated TOML equal to vibeAgentToml of its source", () => {
    const agentsDir = join(repoRoot, PLUGIN, "agents");
    const sources = readdirSync(agentsDir).filter((file) => file.endsWith(".md")).sort();
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      const name = source.replace(/\.md$/, "");
      const tomlPath = join(repoRoot, `${VIBE_BUNDLE}/ai.mistral.vibe/agents/${name}.toml`);
      expect(existsSync(tomlPath)).toBe(true);
      const text = readFileSync(tomlPath, "utf8");
      expect(text).toBe(vibeAgentToml(readFileSync(join(agentsDir, source), "utf8")));
      expect(text).toContain("schema_version = 1");
      expect(text).toContain('agent_type = "subagent"');
      const description = JSON.parse(text.match(/^description = ("(?:[^"\\]|\\.)*")$/m)[1]);
      expect(description.length).toBeGreaterThan(0);
      expect(description.length).toBeLessThanOrEqual(300);
      for (const line of text.split("\n")) {
        const key = line.match(/^([A-Za-z_][A-Za-z0-9_]*) = /)?.[1];
        if (key) expect(key).toBe(key.toLowerCase());
      }
    }
  });

  test("Vibe stamps no preamble on any skill", () => {
    expect(vibe.preamble).toBeNull();
  });
});

describe("vibe-tools.md Model names", () => {
  const section = vibeModelNamesSection(models);

  test("names no Claude alias, names the sheet, and names every role-model skill", () => {
    expect(section).not.toMatch(/`(?:opus|fable|sonnet|haiku)`/);
    expect(section).toContain("`${VIBE_HOME:-$HOME/.vibe}/pstack-models.md`");
    for (const skill of roleSkills(models)) expect(section).toContain(`\`${skill}\``);
  });

  test("is the section the mapping file carries", () => {
    expect(mapping).toContain(section);
  });
});
