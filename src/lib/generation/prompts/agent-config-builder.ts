import { 
  VibeWorkspace, 
  GenerationPrompt 
} from '../../../types';
import { 
  UGCSController 
} from '../ugcs-controller';

export function buildAgentConfigPrompt(
  phase: 'context_gathering' | 'drafting' | 'review',
  workspace: VibeWorkspace,
  controller: UGCSController,
  draft?: string
): GenerationPrompt {
  const dimensionDirectives = controller.buildDimensionPrompt(phase);

  if (phase === 'context_gathering') {
    return {
      system: `You are an expert system architect performing the CONTEXT_GATHERING phase
for a Mistral Vibe agent configuration.

PURPOSE: Ground the generation in the provided user requirements. Catalog
all configuration parameters exactly as provided. Do not speculate. Do not
assign defaults unless the user explicitly requested them. Record
"NOT_SPECIFIED" for every field the user did not address.

TARGET SCHEMA: The output artifact is an agent.toml using four namespaces:
  [metadata]           — identity layer consumed by AgentManager
  [safety]             — risk profile and HITL gate
  [config]             — runtime VibeConfig overrides
  [config.tools.*]     — per-tool granular permission blocks

UGCS DIMENSION DIRECTIVES — CONTEXT_GATHERING PHASE:
${dimensionDirectives}

CATALOG GOALS — extract and record each of the following from user answers,
organized by target namespace:

GOAL 1 — [metadata] NAMESPACE KEYS
  display_name      String    Human-readable UI name for the agent.
  description       String    Functional summary of the agent's purpose.
  agent_type        Enum      Must be: AGENT | SUBAGENT
                              - AGENT: user-selectable via --agent flag or UI cycle
                              - SUBAGENT: programmatic delegation only via task tool;
                                cannot be selected at CLI
  install_required  Boolean   If true, agent is hidden until /leaninstall trigger.
                              Default false if not specified.

GOAL 2 — [safety] NAMESPACE KEYS
  level             Enum      Must be: SAFE | NEUTRAL | DESTRUCTIVE | YOLO
                              - SAFE: read-only, no write or destructive ops
                              - NEUTRAL: standard HITL gate, ASK for modifications
                              - DESTRUCTIVE: file writes auto-approved, bash gated
                              - YOLO: all tool executions auto-approved (CI/CD only)
                              Catalog the safety posture the user requested.

GOAL 3 — [config] NAMESPACE KEYS
  active_model      String    LLM backend routing. e.g. "mistral-large-latest"
  system_prompt_id  String    References a .md template in prompts/ directory.
                              e.g. "cli", "explore". Record verbatim.
  auto_approve      Boolean   Bypasses HITL _approval_lock.
                              CRITICAL: record this accurately. true = significant
                              system risk increase. Default false.
  enabled_tools     Array     String array of tool names to whitelist.
                              WHITELIST-TAKES-PRECEDENCE: if non-empty, all tools
                              not listed are disabled.
  disabled_tools    Array     String array of tool names to blacklist.
                              Only relevant if enabled_tools is empty.
                              Do NOT catalog both populated simultaneously —
                              flag as conflict if user specified both.

GOAL 4 — [config.tools.<tool_name>] NAMESPACE KEYS
  For each tool the user flagged for non-default behavior, catalog:
    tool_name       String    The exact tool identifier (e.g. "bash", "write_file")
    permission      Enum      Must be: ALWAYS | NEVER | ASK
    allowlist       Array     Glob patterns for path-based restrictions.
                              e.g. ["plans/*", "reports/*.md"]
                              Record verbatim. Do not expand or interpret globs.

  HALLUCINATION GUARD: Only catalog [config.tools.*] entries for tools the
  user explicitly named. If the user mentioned no tool-level overrides,
  record: "tool_overrides: none"

CRITICAL OUTPUT RULES:
- Output as a structured JSON object with keys: metadata, safety, config, tool_overrides
- Record "NOT_SPECIFIED" for any field the user did not address
- Do not fill gaps with assumptions
- If a user provided an invalid enum value (e.g. safety level "STRICT"), flag it:
  { "level": "INVALID: 'STRICT' — must be SAFE | NEUTRAL | DESTRUCTIVE | YOLO" }`,
      
      user: `ENTITY TYPE: agent
TARGET NAMESPACES: [metadata] [safety] [config] [config.tools.*]

USER ANSWERS:
${JSON.stringify(workspace.session.answers, null, 2)}

Catalog all agent configuration requirements following the 4-goal namespace
structure above. Output as a structured JSON object with keys:
  metadata, safety, config, tool_overrides`
    };
  }

  if (phase === 'drafting') {
    const skeletonPrompt = workspace.generation.skeletonConstraints
      ? `\nSTRUCTURAL CONSTRAINTS (user-approved component plan — follow exactly):\n${workspace.generation.skeletonConstraints}\n\nGenerate the artifact with this exact section structure. Do not add, remove, or reorder sections.\n`
      : '';

    return {
      system: `You are generating a Mistral Vibe agent configuration file during the DRAFTING phase.
The output format is TOML using the canonical four-namespace schema.

${skeletonPrompt}

PURPOSE: Synthesize the cataloged context map into a complete, valid TOML artifact.
Do not invent keys. Do not add sections outside the four namespaces.
Do not emit any section not present in the approved component plan.

UGCS DIMENSION DIRECTIVES — DRAFTING PHASE:
${dimensionDirectives}

STRUCTURAL SCHEMA — emit sections in this exact order:

──────────────────────────────────────────────────────────
SECTION 1 — [metadata]    REQUIRED
──────────────────────────────────────────────────────────
[metadata]
display_name = "<string>"    # Human-readable name for terminal UI and logs
description  = "<string>"    # Functional summary for AgentManager categorization
agent_type   = "<enum>"      # AGENT | SUBAGENT
install_required = <bool>    # Default: false if NOT_SPECIFIED

  AGENT vs SUBAGENT semantics (emit as a comment above agent_type):
  # AGENT: user-selectable via --agent flag or interactive cycle
  # SUBAGENT: programmatic delegation only — cannot be selected at CLI

──────────────────────────────────────────────────────────
SECTION 2 — [safety]    REQUIRED
──────────────────────────────────────────────────────────
[safety]
level = "<enum>"    # SAFE | NEUTRAL | DESTRUCTIVE | YOLO

  Emit a single inline comment describing the HITL behavior for the chosen level:
  # SAFE        → read-only; no write or destructive operations permitted
  # NEUTRAL     → standard HITL gate; system modifications require explicit ASK
  # DESTRUCTIVE → file writes auto-approved; bash and system commands remain gated
  # YOLO        → all tool executions auto-approved; intended for headless CI/CD only

──────────────────────────────────────────────────────────
SECTION 3 — [config]    REQUIRED
──────────────────────────────────────────────────────────
[config]
active_model     = "<string>"   # LLM backend identifier
system_prompt_id = "<string>"   # Filename stem in prompts/ directory
auto_approve     = <bool>       # Bypasses HITL _approval_lock;
                                # MiddlewarePipeline (TurnLimit, PriceLimit) remains active
enabled_tools = [               # Whitelist-Takes-Precedence:
  "<tool>",                     # if non-empty, unlisted tools are disabled
  ...
]
# disabled_tools: emit ONLY if enabled_tools is empty AND user specified blacklist
# disabled_tools = ["<tool>", ...]

  DEFAULT RULES (emit only if catalog value is NOT_SPECIFIED):
  active_model     → "mistral-large-latest"
  system_prompt_id → "cli"
  auto_approve     → false
  enabled_tools    → [] (empty array; all tools available per safety level default)

──────────────────────────────────────────────────────────
SECTION 4 — [config.tools.<tool_name>]    CONDITIONAL
──────────────────────────────────────────────────────────
Emit one block per tool in tool_overrides catalog.
If tool_overrides is "none", omit this section entirely — do not emit an empty block.

[config.tools.<tool_name>]
permission = "<enum>"       # ALWAYS | NEVER | ASK
                            # Overrides the safety-level default for this tool only
allowlist  = ["<glob>"]     # Path-based restriction. Omit if NOT_SPECIFIED.
                            # Example: ["reports/*"] restricts write_file to reports/

  HALLUCINATION GUARD: Do NOT emit a [config.tools.*] block for any tool
  not present in the tool_overrides section of the context catalog.
  Inventing tool permission blocks is a critical failure mode.

──────────────────────────────────────────────────────────
EMIT RULES:
- Output valid TOML only. No markdown fences. No explanations outside # comments.
- Comments must be factual and descriptive. No metaphors. No advocacy.
- Sections with all NOT_SPECIFIED values: emit with documented defaults and a
  # Default applied — user did not specify
  comment on the section header line.
- Section order is fixed: [metadata] → [safety] → [config] → [config.tools.*]
- Do not emit [config.tools.*] blocks that were not in the approved skeleton plan.`,

      user: `CONTEXT CATALOG:
${JSON.stringify(workspace.generation.contextMap, null, 2)}

${skeletonPrompt}

Generate the agent.toml file now.
Output TOML only — no preamble, no explanation, no markdown code fences.`
    };
  }

  // Review phase
  return {
    system: `You are performing the REVIEW phase for a generated agent.toml configuration.

PURPOSE: Validate syntax, audit schema compliance, check for hallucinated
tool blocks, and return either the corrected artifact or the original
verbatim if no issues are found.

UGCS DIMENSION DIRECTIVES — REVIEW PHASE:
${dimensionDirectives}

VALIDATION CHECKLIST — audit each item, mark PASS or FAIL:

SYNTAX:
  [ ] TOML parses without errors
  [ ] No duplicate section headers
  [ ] All string values properly quoted
  [ ] All boolean values are true/false (not "true"/"false")
  [ ] All arrays use proper TOML array syntax

SCHEMA COMPLIANCE — [metadata]:
  [ ] display_name is a non-empty string
  [ ] description is a non-empty string
  [ ] agent_type is exactly: AGENT | SUBAGENT (case-sensitive)
  [ ] install_required is a boolean

SCHEMA COMPLIANCE — [safety]:
  [ ] level is exactly one of: SAFE | NEUTRAL | DESTRUCTIVE | YOLO (case-sensitive)

SCHEMA COMPLIANCE — [config]:
  [ ] active_model is a non-empty string
  [ ] system_prompt_id is a non-empty string
  [ ] auto_approve is a boolean (not a string)
  [ ] enabled_tools is an array of strings (may be empty)
  [ ] disabled_tools is NOT present if enabled_tools is non-empty
      (Whitelist-Takes-Precedence rule: co-presence is a conflict)

SCHEMA COMPLIANCE — [config.tools.*]:
  [ ] permission is exactly one of: ALWAYS | NEVER | ASK (case-sensitive)
  [ ] allowlist is an array of strings if present (not a single string)
  [ ] Each tool block header uses valid TOML dotted key syntax:
      [config.tools.bash] not [config][tools][bash]

HALLUCINATION AUDIT — HIGHEST PRIORITY:
  [ ] Every [config.tools.<n>] block has a matching entry in USER REQUIREMENTS
      tool_overrides section
  [ ] No tool block was invented that the user did not mention
  [ ] If tool_overrides was "none" in the catalog — zero [config.tools.*]
      blocks exist in the artifact

SECTION ORDER AUDIT:
  [ ] [metadata] appears first
  [ ] [safety] appears second
  [ ] [config] appears third
  [ ] [config.tools.*] blocks appear last

ORPHANED SECTIONS AUDIT:
  [ ] No [agent] section (belongs to different schema)
  [ ] No [agent.capabilities] section (belongs to different schema)
  [ ] No [agent.context] section (belongs to different schema)
  [ ] No [env] section (belongs to companion agent.toml — not this artifact)
  [ ] No [session] section (belongs to companion agent.toml — not this artifact)
  [ ] No [mcp.servers.*] section (belongs to companion agent.toml — not this artifact)

IF ANY ITEM IS FAIL:
  Correct the artifact. Return the full corrected TOML.
  Do not explain what you changed.

IF ALL ITEMS PASS:
  Return the original content verbatim.
  Do not alter formatting. Do not add comments.

Do NOT add preamble. Output ONLY the TOML.`,

    user: `DRAFT ARTIFACT:
${draft}

USER REQUIREMENTS (context catalog):
${JSON.stringify(workspace.generation.contextMap, null, 2)}

Perform the review and return the final valid TOML content.`
  };
}
