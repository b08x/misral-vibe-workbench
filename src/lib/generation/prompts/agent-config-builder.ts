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
      system: `You are an expert system architect performing the CONTEXT_GATHERING phase for a mistral-vibe agent configuration.

PURPOSE: Ground the generation in the provided user requirements. Catalog all constraints and configuration parameters exactly as requested. Do not speculate or assign defaults unless the user explicitly requested them.

${dimensionDirectives}

CATALOG GOALS — extract and record each of the following from user answers:

1. CORE IDENTITY
   - agent name (string, will become TOML [agent].name)
   - agent type (one of: general-purpose | explore | code-reviewer | agentic-software-engineer)
   - version string if specified (default "1.0.0" if not mentioned)

2. CAPABILITIES FLAGS
   - read access: boolean
   - write access: boolean
   - bash/shell access: boolean
   - web fetch/search access: boolean
   - vision/image analysis: boolean

3. CONTEXT & SAMPLING
   - max_tokens (integer)
   - temperature (float)
   - top_p (float)

4. TOOL PERMISSIONS
   - allowed tools array (from agent.tools.allowed)
   - per-tool permission levels (always | ask | deny)
   - per-tool timeout values if specified
   - per-tool allowlist/denylist paths if specified

5. SAFETY & GUARDRAILS
   - require_confirmation (boolean)
   - allow_destructive (boolean)
   - sandbox_mode (boolean)
   - allowed_dirs array (empty = unrestricted)

6. OUTPUT FORMATTING
   - format (markdown | json | plain)
   - verbose (boolean)
   - show_thinking (boolean)

7. MCP SERVER INTEGRATIONS — CATALOG WITH EXTREME CARE
   - List only server names the user explicitly confirmed
   - For each: command, args array, env vars
   - If none confirmed: record "mcp_servers: none"

8. RUNTIME ENVIRONMENT
   - LLM_API_KEY env var name (not the key value)
   - LLM_MODEL identifier string
   - LLM_BASE_URL if custom endpoint
   - PROJECT_ROOT (default ".")
   - PROJECT_TYPE (ruby | python | typescript | other)
   - DEBUG flag
   - VERBOSE flag

9. SESSION PERSISTENCE
   - persist (boolean)
   - storage_path (string)
   - max_history (integer)
   - checkpoint enabled (boolean)
   - checkpoint interval (integer, turns)

10. TEMPLATE INHERITANCE
    - extends field: path to base template if user specified one

CRITICAL: Record "NOT_SPECIFIED" for any field the user did not address. Do not fill gaps with assumptions. Those will be resolved in drafting with documented defaults.`,
      
      user: `ENTITY TYPE: agent
USER ANSWERS:
${JSON.stringify(workspace.session.answers, null, 2)}

Catalog all agent configuration requirements following the 10-goal structure above. Output as a structured JSON object with keys matching each goal section.`
    };
  }

  if (phase === 'drafting') {
    const skeletonPrompt = workspace.generation.skeletonConstraints 
      ? `\nSTRUCTURAL CONSTRAINTS (user-approved component plan — follow exactly):\n${workspace.generation.skeletonConstraints}\n\nGenerate the artifact with this exact section structure. Do not add, remove, or reorder sections.\n`
      : '';

    return {
      system: `You are generating a mistral-vibe agent configuration file during the DRAFTING phase.
The output format is TOML, following the agent-template.md schema exactly.
${skeletonPrompt}
PURPOSE: Synthesize the cataloged context into a complete, valid TOML artifact.

${dimensionDirectives}

STRUCTURAL SCHEMA — follow this section order exactly:

SECTION 1 — [agent] Core Identity
  name = "<string>"          # Agent display name from catalog
  type = "<enum>"            # general-purpose | explore | code-reviewer | agentic-software-engineer
  version = "<semver>"       # Default "1.0.0" if NOT_SPECIFIED

SECTION 2 — [agent.capabilities]
  read = <bool>
  write = <bool>
  bash = <bool>
  web = <bool>
  vision = <bool>
  # Omit any capability cataloged as NOT_SPECIFIED (use false as implicit default,
  # but do not emit it — let mistral-vibe use its own defaults for unspecified caps)

SECTION 3 — [agent.context]
  max_tokens = <int>         # Default 128000 if NOT_SPECIFIED
  temperature = <float>      # Default 0.7 if NOT_SPECIFIED
  top_p = <float>            # Default 0.9 if NOT_SPECIFIED

SECTION 4 — [agent.tools]
  allowed = [
    "<tool_name>",           # Only tools from the verified tool name list:
    ...                      # bash, read_file, write_file, search_replace,
  ]                          # grep, ask_user_question, webfetch, websearch,
                             # codesearch, context7_query-docs,
                             # context7_resolve-library-id

SECTION 5 — [agent.safety]
  require_confirmation = <bool>   # Default true
  allow_destructive = <bool>      # Default false
  sandbox_mode = <bool>           # Default false
  allowed_dirs = [<strings>]      # Empty array = unrestricted

SECTION 6 — [agent.output]
  format = "<enum>"          # markdown | json | plain
  verbose = <bool>
  show_thinking = <bool>

SECTION 7 — [mcp.servers.*] — CONDITIONAL: EMIT ONLY IF CATALOG HAS CONFIRMED SERVERS
  !! HALLUCINATION GUARD: Do NOT generate any [mcp.servers.*] block
     unless the server name appears verbatim in the context catalog
     under "MCP SERVER INTEGRATIONS". If catalog says "mcp_servers: none",
     omit this entire section with no comment. !!

  [mcp.servers.<name>]
  enabled = true
  command = "<string>"
  args = ["<arg>", ...]
  env = { <KEY> = "<value>" }

SECTION 8 — [env]
  LLM_API_KEY = "<env_var_name_only — never the actual key>"
  LLM_MODEL = "<model_id>"
  LLM_BASE_URL = "<url_or_omit_if_NOT_SPECIFIED>"
  PROJECT_ROOT = "<path>"    # Default "."
  PROJECT_TYPE = "<lang>"
  DEBUG = <bool>
  VERBOSE = <bool>

SECTION 9 — [session]
  persist = <bool>
  storage_path = "<path>"    # Default ".vibe/sessions"
  max_history = <int>        # Default 100

  [session.checkpoint]
  enabled = <bool>
  interval = <int>           # turns between checkpoints

TEMPLATE INHERITANCE (emit only if catalog has a non-null "extends" value):
  extends = "<path>"

EMIT RULES:
- Output valid TOML only. No markdown fences. No explanations outside of # comments.
- Comments: factual and descriptive only. No advocacy, no metaphors.
- Sections with all NOT_SPECIFIED fields: emit with documented defaults and a
  # Default applied — user did not specify comment on the section header line.
- Preserve section order exactly as listed above.`,
      
      user: `CONTEXT CATALOG:
${JSON.stringify(workspace.generation.contextMap, null, 2)}

Generate the agent.toml file now.`
    };
  }

  // Review phase
  return {
    system: `You are performing the REVIEW phase for a generated agent.toml configuration.

PURPOSE: Validate syntax, check dimension compliance, audit for failure modes,
and return either the corrected artifact or the original verbatim if no issues found.

${dimensionDirectives}

VALIDATION CHECKLIST — audit each item, mark PASS or FAIL:

SYNTAX:
  [ ] TOML parses without errors
  [ ] No duplicate keys
  [ ] All string values properly quoted
  [ ] All boolean values are true/false (not "true"/"false")
  [ ] All arrays use proper TOML array syntax

SCHEMA COMPLIANCE:
  [ ] agent.type is one of: general-purpose | explore | code-reviewer | agentic-software-engineer
  [ ] agent.output.format is one of: markdown | json | plain
  [ ] agent.context.temperature is float between 0.0 and 2.0
  [ ] agent.context.top_p is float between 0.0 and 1.0
  [ ] All tool names in agent.tools.allowed are from the verified list
  [ ] agent.safety.allowed_dirs is an array (not a string)
  [ ] session.storage_path is present if session.persist = true

MCP HALLUCINATION AUDIT — HIGHEST PRIORITY CHECK:
  [ ] Every [mcp.servers.<name>] block has a traceable confirmed server name
      from the user's Q&A answers
  [ ] No server command or args were invented — all values came from catalog
  [ ] If catalog said "mcp_servers: none" — no MCP sections exist in output

DIMENSION COMPLIANCE:
  [ ] Abstraction Level: NONE — all values are concrete literals, no placeholders
  [ ] Imagery Density: NONE — comments are factual, no metaphors
  [ ] Novelty Injection: NONE — no invented sections, no non-standard keys
  [ ] Constraint Adherence: STRICT — all validation rules satisfied

SRE FAILURE MODE SCAN:
  [ ] Hard Boundary Enforcement: no vague permission values (must be always|ask|deny)
  [ ] Split-Brain: section structure is consistent, no duplicate config paths
  [ ] Self-Revision Loop: output does not discuss or describe itself

IF ANY ITEM IS FAIL:
  Correct the artifact. Return the full corrected TOML.

IF ALL ITEMS ARE PASS:
  Return the original content verbatim. Do not alter formatting or add comments.

Do NOT explain what you checked. Do NOT add preamble. Output ONLY the TOML.`,
    
    user: `DRAFT ARTIFACT:
${draft}

USER REQUIREMENTS:
${JSON.stringify(workspace.session.answers, null, 2)}

Perform the review and return the final valid TOML content.`
  };
}
