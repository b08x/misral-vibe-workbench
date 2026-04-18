import { SkillFile } from '../../../types';
import { extractFrontmatter } from './bundle-splitter';

export interface ClaudeCodeParsedSkill {
  name: string | null;
  description: string | null;
  when_to_use: string | null;
  context: 'fork' | 'inline' | null;
  agent: string | null;
  allowed_tools: string[];
  disable_model_invocation: boolean;
  body: string;
  warnings: string[];
}

/**
 * Parses a skill bundle into a Claude Code specific structure.
 */
export function parseClaudeCodeSkill(files: SkillFile[]): ClaudeCodeParsedSkill {
  const warnings: string[] = [];
  const entrypoint = files.find(f => f.role === 'entrypoint');

  if (!entrypoint) {
    return {
      name: null,
      description: null,
      when_to_use: null,
      context: 'inline',
      agent: null,
      allowed_tools: [],
      disable_model_invocation: false,
      body: '',
      warnings: ['No SKILL.md entrypoint found in bundle.']
    };
  }

  const { frontmatter, body } = extractFrontmatter(entrypoint.content);

  // Derive name from path if missing in frontmatter
  let name = frontmatter.name ? String(frontmatter.name) : null;
  if (!name && entrypoint.relative_path.includes('/')) {
    const parts = entrypoint.relative_path.split('/');
    if (parts.length > 1) {
      name = parts[parts.length - 2]; // parent directory name
    }
  }

  const description = frontmatter.description ? String(frontmatter.description) : null;
  if (!description) {
    warnings.push('Skill description is missing. Claude uses this for auto-invocation.');
  }

  // Claude-specific allowed-tools is space-separated
  let allowed_tools: string[] = [];
  const allowedToolsRaw = frontmatter['allowed-tools'];
  if (typeof allowedToolsRaw === 'string') {
    allowed_tools = allowedToolsRaw.split(/\s+/).filter(t => t.length > 0);
  } else if (Array.isArray(allowedToolsRaw)) {
    allowed_tools = allowedToolsRaw.map(t => String(t));
  }

  const contextRaw = frontmatter.context;
  const context: 'fork' | 'inline' = (contextRaw === 'fork' || contextRaw === 'inline') 
    ? contextRaw 
    : 'inline';

  return {
    name,
    description,
    when_to_use: frontmatter.when_to_use ? String(frontmatter.when_to_use) : null,
    context,
    agent: frontmatter.agent ? String(frontmatter.agent) : null,
    allowed_tools,
    disable_model_invocation: frontmatter['disable-model-invocation'] === true,
    body,
    warnings
  };
}

/**
 * Parses Claude context files (CLAUDE.md, AGENTS.md).
 * Strips agent-context comment markers.
 */
export function parseClaudeMd(content: string): { body: string; warnings: string[] } {
  const warnings: string[] = [];
  let body = content
    .replace(/<!--\s*agent-context\s*-->/gi, '')
    .trim();
  
  return { body, warnings };
}
