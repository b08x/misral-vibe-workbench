import { VibeWorkspace } from '../../types';
import { UGCSController } from './ugcs-controller';
import generationControlSurface from '../../config/generation_control_surface.json';

/**
 * Builds the system + user prompt for the skeleton generation call.
 * The skeleton call asks the LLM to output ONLY a structured JSON plan
 * (not the full artifact), describing the sections it would generate,
 * what each section will cover, and which dimension registers apply.
 *
 * SYSTEM prompt instructs the model to:
 *   - Return ONLY valid JSON matching ComponentPreview structure
 *   - Use the UGCS output type profile for the entity type to determine section shape
 *   - Flag which sections are structurally required vs optional
 *   - Estimate token count based on section complexity
 *   - Never start generating the actual artifact content
 *
 * USER prompt passes:
 *   - All accumulated Q&A answers from workspace.session.answers
 *   - Entity type and output format
 *   - Active UGCS dimension directives for this entity type
 *   - Explicit schema of ComponentPreview / PreviewSection JSON shape
 *
 * Returns: { system: string, user: string }
 */
export function buildSkeletonPrompt(
  workspace: VibeWorkspace,
  controller: UGCSController
): { system: string; user: string } {
  const { entityType, outputFormat } = workspace.meta;
  const answers = workspace.session.answers;

  const serializedAnswers = Object.entries(answers)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

  if (entityType === 'agent') {
    const system = `You are a structural architect for Mistral Vibe agent configuration artifacts.

Your task is to generate a COMPONENT PLAN (skeleton) for a new agent.toml file.
You are NOT generating the full TOML. You are generating a JSON plan describing
the sections that will be generated, what each section will contain, and which
UGCS dimension registers apply to each.

TARGET FORMAT: TOML with four canonical namespaces.
The section plan MUST reflect this structure exactly — no other section
organization is valid for an agent artifact.

THE FOUR CANONICAL NAMESPACES (in this order):

  NAMESPACE 1 — [metadata]      REQUIRED · editable: false
    Purpose: Discovery and identity layer for the AgentManager.
    Keys: display_name, description, agent_type, install_required, safety (from [safety])
    Note: safety.level is architecturally coupled to [metadata] identity.
          Surface it as part of this section in the plan summary.

  NAMESPACE 2 — [safety]        REQUIRED · editable: false
    Purpose: Risk profile and default Human-in-the-Loop (HITL) gate behavior.
    Keys: level (enum: SAFE | NEUTRAL | DESTRUCTIVE | YOLO)

  NAMESPACE 3 — [config]        REQUIRED · editable: false
    Purpose: Runtime VibeConfig overrides applied on agent activation.
    Keys: active_model, system_prompt_id, auto_approve, enabled_tools, disabled_tools
    Rule: If enabled_tools is non-empty, Whitelist-Takes-Precedence applies —
          any tool not listed is disabled. Surface this rule in the description.

  NAMESPACE 4 — [config.tools.<tool_name>]    CONDITIONAL · editable: true
    Purpose: Granular per-tool permission overrides above the safety-level default.
    Keys per block: permission (enum: ALWAYS | NEVER | ASK), allowlist (glob array)
    Rule: Emit one block per tool listed in enabled_tools that the user flagged
          for non-default permission or path restriction.
    Hallucination guard: Do NOT plan a [config.tools.*] block for any tool
    the user did not explicitly mention. If user provided no tool overrides,
    omit this namespace entirely with editable: true and order set to 4.

DIMENSION REGISTER RULES FOR AGENT_TOML:
  Abstraction Level   → NONE    (all planned values are concrete literals)
  Imagery Density     → NONE    (descriptions are factual, no metaphors)
  Novelty Injection   → NONE    (no invented sections, no non-standard keys)
  Constraint Adherence→ STRICT  (all TOML keys must be valid schema members)
  Intensity           → FLAT    (neutral professional register throughout)

STRICT OUTPUT CONSTRAINTS:
1. Return ONLY the JSON object. No preamble. No markdown fences. No explanation.
2. Follow the ComponentPreview schema exactly (see user prompt).
3. sections array must be ordered: [metadata] → [safety] → [config] → [config.tools.*]
4. Required namespaces (1–3) must always appear, even if user skipped questions.
   Use NOT_SPECIFIED in the description to flag gaps for the drafting phase.
5. estimatedTokens = 200 + (150 × number of sections)
6. dimensionSummary: one paragraph explaining UGCS register choices for this
   specific synthesis — reference the user's agent_type and safety_level choices.`;

    const user = `INPUT CONTEXT:
Entity Type: agent
Output Format: toml

USER ANSWERS:
${serializedAnswers}

COMPONENT PREVIEW SCHEMA:

interface PreviewSection {
  id: string           // Stable UUID — generate with crypto.randomUUID()
  label: string        // TOML namespace label e.g. "[metadata]", "[safety]",
                       // "[config]", "[config.tools.bash]"
  description: string  // What keys this section will contain and why.
                       // Reference user answers where applicable.
                       // Use "NOT_SPECIFIED — default will apply" for any
                       // key the user did not address.
  dimensionHints: {
    abstraction?: string   // "none" | "low" | "moderate" | "high"
    imagery?: string       // "none" | "moderate" | "high"
    intensity?: string     // "flat" | "measured" | "vibrant"
  }
  editable: boolean    // false = structurally required, cannot be removed
  order: number        // 0-indexed render order
}

interface ComponentPreview {
  entityType: string           // "agent"
  outputFormat: string         // "toml"
  sections: PreviewSection[]
  dimensionSummary: string     // Specific UGCS register rationale for this synthesis
  estimatedTokens: number      // 200 + (150 × sections.length)
}

GENERATE SKELETON PLAN NOW.`;

    return { system, user };
  }

  // Retrieve recommended sections from the active output type profile
  const profileKey = entityType === 'skill' ? 'SKILL_MD' : 
                    entityType === 'system-prompt' ? 'SYSTEM_PROMPT_MD' : '';
  
  const profile = (generationControlSurface.file_profiles as any)[profileKey];
  const recommendedSections = profile?.recommended_sections || [];
  const dimensionDirectives = controller.getDimensionDirectives('drafting');

  const componentPreviewSchema = `
interface PreviewSection {
  id: string                   // Stable UUID
  label: string                // Display name: e.g. "## Identity & Role"
  description: string          // Brief description of section content
  dimensionHints: {            // UGCS dimensions for this section
    abstraction?: string       // "low", "moderate", "high"
    imagery?: string           // "none", "moderate", "high"
    intensity?: string         // "flat", "measured", "vibrant"
  }
  editable: boolean            // Flag structurally required sections
  order: number                // Rendering order starting from 0
}

interface ComponentPreview {
  entityType: string
  outputFormat: string         // 'toml' | 'markdown' | 'yaml'
  sections: PreviewSection[]
  dimensionSummary: string     // Plain-English summary of UGCS choices
  estimatedTokens: number      // Total expected tokens: 200 + (150 * sections.length)
}
`;

  const system = `
You are a structural architect for LLM context artifacts.
Your task is to generate a COMPONENT PLAN (skeleton) for a new ${entityType} artifact.
You are NOT generating the full artifact. You are generating a JSON plan describing the sections and their configuration.

STRICT CONSTRAINTS:
1. Return ONLY the JSON object. No preamble. No markdown fences. No explanations.
2. Follow the ComponentPreview schema exactly.
3. Use the ${entityType} profile to determine basic section shape.
4. Recommended sections for this type are: ${recommendedSections.join(', ')}. Adapt these based on the user's answers.
5. Flag sections as editable: false if they are strictly required for the artifact to function (e.g. Identity section in a prompt).
6. Estimate total tokens as: 200 base + (150 * number of sections).
7. dimensionSummary should be a specific, one-paragraph summary of how the UGCS registers (Abstraction, Imagery, Intensity, Constraints) will be applied to this specific synthesis.

SCHEMA:
${componentPreviewSchema}
`;

  let importContext = '';
  if (workspace.meta.import_source) {
    const src = workspace.meta.import_source;
    const files = src.original_files.map(f => `- ${f.path} [${f.role}]`).join('\n');
    const scripts = workspace.skillDefinition?.script_files ? Object.keys(workspace.skillDefinition.script_files).join(', ') : 'None';
    const templates = workspace.skillDefinition?.template_files ? Object.keys(workspace.skillDefinition.template_files).join(', ') : 'None';
    
    importContext = `
IMPORTANT: THIS IS AN IMPORTED ENTITY
Source Provider: ${src.provider}
Original Assets Found:
${files}

Templates Present: ${templates}
Scripts Present: ${scripts}
Unmapped Metadata: ${src.unmapped_fields.join(', ') || 'None'}

ARCHITECTURAL GUIDANCE FOR IMPORT:
1. Prioritize sections that existed in the original files where logical.
2. If templates or scripts are present, ensure the plan includes sections for "Tooling/Integration" path or "Script Reference".
3. Use the unmapped metadata to inform description fields or dimension hints.
`;
  }

  const user = `
INPUT CONTEXT:
Entity Type: ${entityType}
Output Format: ${outputFormat}
${importContext}

USER ANSWERS:
${serializedAnswers}

UGCS DIMENSION DIRECTIVES (DRAFTING PHASE):
${dimensionDirectives}

GENERATE SKELETON PLAN NOW.
`;

  return { system, user };
}
