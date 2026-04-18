import { 
  VibeWorkspace, 
  SourceProvider, 
  ImportConflict, 
  SkillFile,
  SkillDefinitionState
} from '../../../types';
import { 
  ClaudeCodeParsedSkill 
} from '../parsers/claude-code-parser';
import { 
  GeminiCliParsedSkill 
} from '../parsers/gemini-cli-parser';
import { 
  HermesAgentParsedSkill 
} from '../parsers/hermes-agent-parser';

/**
 * Normalizes provider-specific tool names to mistral-vibe built-ins.
 */
export function normalizeToolNames(
  rawTools: string[],
  provider: SourceProvider
): {
  valid: string[];
  unmapped: string[];
} {
  const BUILT_INS = ['bash', 'read_file', 'write_file', 'search_replace', 'grep', 'ask_user_question'];
  
  const mapping: Record<string, string> = {
    'Bash': 'bash',
    'terminal': 'bash',
    'execute_code': 'bash',
    'Read': 'read_file',
    'ReadFile': 'read_file',
    'Write': 'write_file',
    'WriteFile': 'write_file',
    'SearchReplace': 'search_replace',
    'Grep': 'grep'
  };

  const valid: string[] = [];
  const unmapped: string[] = [];

  for (const raw of rawTools) {
    const norm = mapping[raw] || raw.toLowerCase();
    if (BUILT_INS.includes(norm)) {
      valid.push(norm);
    } else {
      unmapped.push(raw);
    }
  }

  return { valid: Array.from(new Set(valid)), unmapped: Array.from(new Set(unmapped)) };
}

/**
 * Maps parsed skill fields to VibeWorkspace state.
 */
export function mapSkillToWorkspace(
  provider: SourceProvider,
  parsed: ClaudeCodeParsedSkill | GeminiCliParsedSkill | HermesAgentParsedSkill,
  files: SkillFile[]
): {
  mapped: Partial<VibeWorkspace>;
  unmapped_fields: string[];
  conflicts: ImportConflict[];
  warnings: string[];
} {
  const unmapped_fields: string[] = [];
  const conflicts: ImportConflict[] = [];
  const warnings: string[] = [...(parsed as any).warnings || []];

  const skill: Partial<SkillDefinitionState> = {
    skill_name: parsed.name,
    skill_description: parsed.description,
    workflow_approach: 'describe',
    workflow_content: parsed.body,
    user_invocable: true
  };

  // Tool Normalization
  let rawTools: string[] = [];
  if ('allowed_tools' in parsed) {
    rawTools = parsed.allowed_tools;
  }
  const { valid: normalizedTools, unmapped: unmappedTools } = normalizeToolNames(rawTools, provider);
  skill.allowed_tools = normalizedTools;
  
  for (const tool of unmappedTools) {
    unmapped_fields.push(`tool:${tool}`);
    conflicts.push({
      field_name: 'allowed_tools',
      source_value: tool,
      reason: `Mistral-vibe has no built-in equivalent for tool '${tool}'.`,
      suggested_action: 'Check if logic can be moved to a bash script.',
      resolution: 'pending'
    });
  }

  // Provider Specific Mapping
  if (provider === 'claude-code') {
    const cp = parsed as ClaudeCodeParsedSkill;
    if (cp.when_to_use) {
      skill.skill_description += `\n\nWhen to use: ${cp.when_to_use}`;
    }
    if (cp.disable_model_invocation) {
      skill.user_invocable = false;
    }
    if (cp.context === 'fork') {
      unmapped_fields.push('context:fork');
      conflicts.push({
        field_name: 'context',
        source_value: 'fork',
        reason: 'Subagent delegation (context: fork) is not supported in mistral-vibe.',
        suggested_action: 'Implement delegative logic within the workflow steps.',
        resolution: 'pending'
      });
    }
    if (cp.agent) {
      unmapped_fields.push(`agent:${cp.agent}`);
      conflicts.push({
        field_name: 'agent',
        source_value: cp.agent,
        reason: `Subagent target '${cp.agent}' has no equivalent in mistral-vibe.`,
        suggested_action: 'Generic agentic behavior is handled via system prompts.',
        resolution: 'pending'
      });
    }
  }

  if (provider === 'hermes-agent') {
    const hp = parsed as HermesAgentParsedSkill;
    if (hp.version) unmapped_fields.push(`version:${hp.version}`);
    if (hp.platforms.length) unmapped_fields.push(`platforms:${hp.platforms.join(',')}`);
    if (hp.tags.length) unmapped_fields.push(`tags:${hp.tags.join(',')}`);
    if (hp.category) unmapped_fields.push(`category:${hp.category}`);
    if (hp.config_settings.length) {
      unmapped_fields.push('config_settings');
      warnings.push('Hermes config settings detected. These should be manually documented in the workflow.');
    }
  }

  // Prepare Workspace
  const mapped: Partial<VibeWorkspace> = {
    meta: {
      entityType: 'skill',
      outputFormat: 'markdown',
      status: 'review',
      currentSection: 'metadata',
      currentQuestion: null,
      questionsAnswered: Object.keys(skill).filter(k => (skill as any)[k] !== null).length,
      questionsTotal: 15, // Approximation
      sectionsComplete: ['metadata', 'workflow'],
      createdAt: new Date(),
      lastModifiedAt: new Date(),
      generatedAt: null
    } as any,
    skillDefinition: skill as SkillDefinitionState,
    session: {
      answers: {
        skill_name: skill.skill_name,
        skill_description: skill.skill_description,
        allowed_tools: skill.allowed_tools,
        user_invocable: skill.user_invocable,
        workflow_approach: 'describe',
        workflow_content: skill.workflow_content
      },
      history: [],
      currentIndex: 0,
      activeModule: 'skill',
      conversationSummary: null
    }
  };

  return { mapped, unmapped_fields, conflicts, warnings };
}
