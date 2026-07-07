// ---------------------------------------------------------------------------
// Types (inline — compatible with @opencode-ai/plugin, no runtime dependency)
// ---------------------------------------------------------------------------

interface PluginInput {
  directory: string
  project?: { id: string; name?: string }
}

interface SessionStartInput {
  sessionID: string
  projectID: string
  directory: string
  title: string
  agent?: string
  model?: { providerID: string; modelID: string }
}

interface SessionStartOutput {
  context: string[]
}

interface Hooks {
  "session.start"?: (input: SessionStartInput, output: SessionStartOutput) => Promise<void>
}

interface PluginOptions {
  /** Override the wing name (defaults to basename of project directory). */
  wing?: string
  /** Control verbosity of the injected recall context. "full" (default) or "compact". */
  verbosity?: "full" | "compact"
}

// ---------------------------------------------------------------------------
// Wing inference
// ---------------------------------------------------------------------------

function inferWing(directory: string, options?: PluginOptions): string | undefined {
  if (options?.wing) return options.wing
  const idx = directory.lastIndexOf("/")
  return idx === -1 ? directory : directory.slice(idx + 1)
}

// ---------------------------------------------------------------------------
// Recall context builders
// ---------------------------------------------------------------------------

function buildRecallFull(wing: string | undefined): string {
  const scope = wing ? ` scoped to **wing="${wing}"**` : ""
  const searchHint = wing
    ? `Use \`mempalace_search\` with \`wing="${wing}"\` for targeted results.`
    : "Use \`mempalace_search\` (wing-free) for broad results."

  return [
    "## MemPalace Recall Protocol",
    "",
    "You have access to MemPalace — your persistent, verbatim memory system.",
    "**Search before answering** when the user asks about past work, people,",
    "projects, decisions, or prior sessions.",
    "",
    `### Session-start recall${scope}`,
    "",
    "1. **Search first** — Before forming your first substantive answer, call",
    `   \`mempalace_search\`${scope} to surface past decisions, conventions, and patterns.`,
    `   ${searchHint}`,
    "2. **Check diary** — Call `mempalace_diary_read` for recent session continuity",
    "   (who worked on what, recent decisions, blockers).",
    "3. **Quote verbatim** — Never summarize or paraphrase palace results.",
    "   Return the drawer's exact stored words. That is the whole point.",
    "4. **No guessing** — If the palace has nothing on the topic, say so clearly.",
    "   Do not invent answers from model memory.",
    "5. **Record after** — After substantive sessions, write continuity via",
    "   `mempalace_diary_write`. Check whether auto-save hooks already ran first.",
    "",
    "### When to search",
    "",
    "- The user asks about past work, decisions, or \"what did we do?\"",
    "- Mentions a person, project, or entity that may have changed over time",
    "- References something from an earlier session",
    "- A fact might be stale or was walked back",
    "",
    "Skip recall for pure greenfield tasks: rename a variable, fix a typo,",
    "or write brand-new code with no memory relevance.",
  ].join("\n")
}

function buildRecallCompact(wing: string | undefined): string {
  const scope = wing ? ` scoped to wing="${wing}"` : ""

  return [
    `## MemPalace Recall${scope}`,
    "Search the palace before answering about past work, people, or decisions.",
    `mempalace_search${wing ? ` + wing="${wing}"` : ""} → mempalace_diary_read`,
    "Quote verbatim. No guessing. Skip for greenfield tasks.",
  ].join("\n")
}

function buildRecall(wing: string | undefined, options?: PluginOptions): string {
  return options?.verbosity === "compact" ? buildRecallCompact(wing) : buildRecallFull(wing)
}

// ---------------------------------------------------------------------------
// Plugin export
// ---------------------------------------------------------------------------

export default {
  id: "@opencode-ai/plugin-mempalace",
  server: async (input: PluginInput, options?: PluginOptions): Promise<Hooks> => {
    const wing = inferWing(input.directory, options)

    return {
      "session.start": async (_input: SessionStartInput, output: SessionStartOutput) => {
        output.context.push(buildRecall(wing, options))
      },
    }
  },
}
