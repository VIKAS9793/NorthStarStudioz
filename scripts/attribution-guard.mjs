#!/usr/bin/env node
/**
 * Ownership guard: commits and pull requests carry the owner's identity only.
 *
 * Blocks AI-assistant attribution (Claude/Anthropic co-author trailers,
 * "Generated with" lines, session links, robot emoji) and any commit author or
 * committer other than the owner. The one exception is GitHub Dependabot, and
 * only for commits that change dependency manifests and nothing else.
 *
 * Modes:
 *   --claude-hook           read a Claude Code PreToolUse payload on stdin and
 *                           deny git commit/push and GitHub commit/PR calls
 *                           that break the rule
 *   --commit-msg <file>     git commit-msg hook
 *   --range <rev-range>     check every commit in a range (pre-push hook, CI)
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const OWNER_NAME = "Vikas Sahani";
const OWNER_EMAILS = [
  /^vikassahani17@gmail\.com$/i,
  /^(\d+\+)?VIKAS9793@users\.noreply\.github\.com$/i,
];

const FORBIDDEN = [
  [/co-authored-by:[^\n]*(claude|anthropic)/i, "Claude/Anthropic co-author trailer"],
  [/noreply@anthropic\.com/i, "Anthropic noreply address"],
  [/generated (with|by)\W*\[?\s*claude/i, '"Generated with Claude" line'],
  [/claude[- ]session\s*:/i, "Claude-Session trailer"],
  [/claude\.ai\/code/i, "Claude session link"],
  [/claude\.com\/claude-code/i, "Claude Code link"],
  [/\u{1F916}/u, "robot emoji attribution"],
];

// Dependabot's fixed GitHub identity, and the only files its commits may touch.
const BOT_NAME = "dependabot[bot]";
const BOT_EMAIL = "49699333+dependabot[bot]@users.noreply.github.com";
const BOT_FILES = [/^package\.json$/, /^package-lock\.json$/, /^\.github\/workflows\/[\w.-]+\.ya?ml$/];

const isOwnerEmail = (email) => OWNER_EMAILS.some((re) => re.test(email.trim()));
// GitHub writes the profile name as displayed (e.g. "VIKAS SAHANI") on web merges.
const isOwnerName = (name) =>
  name.trim().replace(/\s+/g, " ").toLowerCase() === OWNER_NAME.toLowerCase();

function textProblems(text, where) {
  return FORBIDDEN.filter(([re]) => re.test(text)).map(([, why]) => `${where}: ${why}`);
}

function git(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function identityProblems() {
  const name = git(["config", "user.name"]);
  const email = git(["config", "user.email"]);
  const out = [];
  if (name !== OWNER_NAME) out.push(`git user.name is "${name}", expected "${OWNER_NAME}"`);
  if (!isOwnerEmail(email)) out.push(`git user.email is "${email}", expected the owner's address`);
  return out;
}

function rangeProblems(range) {
  // Fail closed: a range git cannot read (bad ref, shallow clone) is an error,
  // not an empty list of commits.
  let raw;
  try {
    raw = execFileSync("git", ["log", "--format=%H%x1f%an%x1f%ae%x1f%cn%x1f%ce%x1f%B%x1e", range], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    return [`cannot read commit range "${range}": ${String(err.stderr || err.message).trim()}`];
  }
  const out = [];
  for (const rec of raw.split("\x1e")) {
    if (!rec.trim()) continue;
    const [sha, an, ae, cn, ce, body = ""] = rec.replace(/^\n/, "").split("\x1f");
    const id = sha.slice(0, 7);
    if (an === BOT_NAME && ae === BOT_EMAIL) {
      const files = git(["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", sha]);
      const outside = files.split("\n").filter((f) => f && !BOT_FILES.some((re) => re.test(f)));
      if (!files || outside.length) {
        out.push(`${id}: Dependabot commit changes non-dependency files: ${outside.join(", ")}`);
      }
    } else if (!isOwnerName(an) || !isOwnerEmail(ae)) {
      out.push(`${id}: author is ${an} <${ae}>`);
    }
    if (!isOwnerName(cn) || !isOwnerEmail(ce)) {
      // GitHub's web-flow committer is allowed for merges made on github.com.
      if (!/^noreply@github\.com$/i.test(ce)) out.push(`${id}: committer is ${cn} <${ce}>`);
    }
    out.push(...textProblems(body, `${id} message`));
  }
  return out;
}

function pushRange() {
  const upstream = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  if (upstream) return `${upstream}..HEAD`;
  if (git(["rev-parse", "--verify", "--quiet", "origin/main"])) return "origin/main..HEAD";
  return "HEAD";
}

function stringsIn(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringsIn(v, out));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => stringsIn(v, out));
  return out;
}

function claudeHook() {
  const payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  const tool = payload.tool_name ?? "";
  const input = payload.tool_input ?? {};
  let problems = [];

  if (tool === "Bash") {
    const cmd = String(input.command ?? "");
    const isCommit = /\bgit\b[^\n;&|]*\bcommit\b/.test(cmd);
    const isPush = /\bgit\b[^\n;&|]*\bpush\b/.test(cmd);
    if (!isCommit && !isPush) return;
    if (/--no-verify\b/.test(cmd) || /\bcommit\b[^\n;&|]*\s-n\b/.test(cmd)) {
      problems.push("hook bypass (--no-verify) is not allowed");
    }
    if (/core\.hooksPath/i.test(cmd)) problems.push("changing core.hooksPath is not allowed");
    if (/GIT_(AUTHOR|COMMITTER)_(NAME|EMAIL)=/.test(cmd))
      problems.push("overriding the git identity is not allowed");
    const author = cmd.match(/--author[= ]\s*["']?([^"'\n]+)["']?/);
    if (author && !author[1].includes(OWNER_NAME))
      problems.push(`--author "${author[1]}" is not the owner`);
    if (isCommit) {
      problems.push(...textProblems(cmd, "commit command"));
      const file = cmd.match(/(?:-F|--file)[= ]\s*["']?([^\s"']+)/);
      if (file && existsSync(file[1]))
        problems.push(...textProblems(readFileSync(file[1], "utf8"), "commit message file"));
      problems.push(...identityProblems());
    }
    if (isPush) problems.push(...rangeProblems(pushRange()));
  } else if (
    /^mcp__github__(create_pull_request|update_pull_request|push_files|create_or_update_file|delete_file|merge_pull_request)$/.test(
      tool,
    )
  ) {
    const fields = { ...input };
    delete fields.content; // file contents are code, not attribution
    delete fields.files;
    problems.push(...textProblems(stringsIn(fields).join("\n"), tool.replace("mcp__github__", "")));
  } else {
    return;
  }

  problems = [...new Set(problems)];
  if (!problems.length) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Ownership guard: only ${OWNER_NAME}'s identity may appear in commits and pull requests. Remove: ${problems.join("; ")}.`,
      },
    }),
  );
}

const [mode, arg] = process.argv.slice(2);
if (mode === "--claude-hook") {
  claudeHook();
} else if (mode === "--commit-msg" || mode === "--range") {
  const problems =
    mode === "--commit-msg"
      ? [...textProblems(readFileSync(arg, "utf8"), "commit message"), ...identityProblems()]
      : rangeProblems(arg || pushRange());
  if (problems.length) {
    console.error(`ownership guard: blocked.\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
} else {
  console.error(
    "usage: attribution-guard.mjs --claude-hook | --commit-msg <file> | --range <rev-range>",
  );
  process.exit(64);
}
