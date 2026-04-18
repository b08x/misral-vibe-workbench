import { 
  SourceProvider, 
  SkillFile, 
  ImportedBundle, 
  VibeWorkspace,
  SystemPromptState
} from '../../types';
import { parseClaudeCodeSkill } from './parsers/claude-code-parser';
import { parseGeminiCliSkill } from './parsers/gemini-cli-parser';
import { parseHermesAgentSkill, parseSoulMd } from './parsers/hermes-agent-parser';
import { mapSkillToWorkspace } from './mappers/skill-mapper';
import { mapTemplateFiles } from './mappers/template-mapper';
import { analyzeScripts } from './mappers/script-advisor';

/**
 * Orchestrates the full normalization process from parsed files to ImportedBundle.
 */
export function normalizeBundle(
  bundle: {
    provider: SourceProvider;
    files: SkillFile[];
    raw_frontmatter: Record<string, any>;
    body_text: string;
    missing_references: string[];
  }
): ImportedBundle {
  const { provider, files, raw_frontmatter, body_text, missing_references } = bundle;
  const entrypoint = files[0];
  
  // 1. Detect Entity Type
  let detected_entity_type: 'agent' | 'skill' | 'system-prompt' = 'skill';
  if (entrypoint.relative_path.toLowerCase() === 'soul.md') {
    detected_entity_type = 'system-prompt';
  } else if (provider === 'claude-code' && !Object.keys(raw_frontmatter).length) {
    detected_entity_type = 'system-prompt';
  } else if (!raw_frontmatter.name && !raw_frontmatter.description) {
    detected_entity_type = 'system-prompt';
  }

  // 2. Map Workspace
  let mapped_workspace: Partial<VibeWorkspace> = {};
  let unmapped_fields: string[] = [];
  let conflicts: any[] = [];
  let import_warnings: string[] = [];

  if (detected_entity_type === 'skill') {
    let parsedSkill: any;
    if (provider === 'claude-code') parsedSkill = parseClaudeCodeSkill(files);
    else if (provider === 'gemini-cli') parsedSkill = parseGeminiCliSkill(files);
    else parsedSkill = parseHermesAgentSkill(files);

    const skillResult = mapSkillToWorkspace(provider, parsedSkill, files);
    mapped_workspace = skillResult.mapped;
    unmapped_fields = skillResult.unmapped_fields;
    conflicts = skillResult.conflicts;
    import_warnings = skillResult.warnings;

    // Advanced skill components
    const templates = mapTemplateFiles(files);
    if (Object.keys(templates.template_files).length) {
      if (mapped_workspace.skillDefinition) {
        mapped_workspace.skillDefinition.has_templates = true;
        mapped_workspace.skillDefinition.template_files = templates.template_files;
      }
      import_warnings.push(...templates.warnings);
    }

    const scripts = analyzeScripts(files);
    for (const script of scripts) {
      import_warnings.push(`Script Advisory: ${script.bash_tool_suggestion}`);
    }
  } else {
    // System Prompt Mapping
    const prompt_purpose = body_text.substring(0, 500).split('\n')[0] || 'Imported System Prompt';
    const systemPrompt: Partial<SystemPromptState> = {
      prompt_purpose: body_text,
      prompt_id: `imported-${Date.now()}`
    };

    mapped_workspace = {
      meta: {
        entityType: 'system-prompt',
        outputFormat: 'markdown',
        status: 'review',
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        generatedAt: null
      } as any,
      systemPrompt: systemPrompt as SystemPromptState,
      session: {
        answers: { prompt_purpose: body_text },
        history: [],
        currentIndex: 0,
        activeModule: 'system-prompt',
        conversationSummary: null
      }
    };
  }

  // 3. Aggregate Missing References
  for (const missing of missing_references) {
    import_warnings.push(`Missing reference file: '${missing}' — relative mapping may be incomplete.`);
  }

  // 4. Compute Confidence
  let confidence = 1.0;
  confidence -= (conflicts.length * 0.15);
  confidence -= (unmapped_fields.length * 0.05);
  if (missing_references.length > 0) confidence -= 0.10;
  confidence = Math.max(0, confidence);

  return {
    source_provider: provider,
    detected_entity_type,
    files,
    entrypoint,
    raw_frontmatter,
    body_text,
    missing_references,
    mapped_workspace,
    unmapped_fields,
    conflicts,
    confidence,
    import_warnings
  };
}
