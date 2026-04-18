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

  // Retrieve recommended sections from the active output type profile
  const profileKey = entityType === 'agent' ? 'AGENT_TOML' : 
                    entityType === 'skill' ? 'SKILL_MD' : 
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

  const serializedAnswers = Object.entries(answers)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join('\n');

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
