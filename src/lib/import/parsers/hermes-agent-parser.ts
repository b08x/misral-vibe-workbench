import { SkillFile } from '../../../types';
import { extractFrontmatter } from './bundle-splitter';

export interface HermesAgentParsedSkill {
  name: string | null;
  description: string | null;
  version: string | null;
  platforms: string[];
  tags: string[];
  category: string | null;
  config_settings: Array<{
    key: string;
    description: string;
    default: string | null;
    prompt: string | null;
  }>;
  body: string;
  warnings: string[];
}

/**
 * Parses a skill bundle into a Hermes Agent specific structure.
 */
export function parseHermesAgentSkill(files: SkillFile[]): HermesAgentParsedSkill {
  const warnings: string[] = [];
  const entrypoint = files.find(f => f.role === 'entrypoint');

  if (!entrypoint) {
    return {
      name: null,
      description: null,
      version: null,
      platforms: [],
      tags: [],
      category: null,
      config_settings: [],
      body: '',
      warnings: ['No SKILL.md entrypoint found in bundle.']
    };
  }

  const { frontmatter, body } = extractFrontmatter(entrypoint.content);

  // Extract nested metadata.hermes
  const hermes = (frontmatter.metadata && typeof frontmatter.metadata === 'object') 
    ? (frontmatter.metadata as any).hermes 
    : null;

  const config_settings: HermesAgentParsedSkill['config_settings'] = [];
  let tags: string[] = [];
  let category: string | null = null;

  if (hermes && typeof hermes === 'object') {
    tags = Array.isArray(hermes.tags) ? hermes.tags.map((t: any) => String(t)) : [];
    category = hermes.category ? String(hermes.category) : null;

    if (Array.isArray(hermes.config)) {
      for (const item of hermes.config) {
        if (item && typeof item === 'object') {
          if (!item.description) {
            warnings.push(`Config setting '${item.key || 'unknown'}' lacks a description.`);
          }
          config_settings.push({
            key: item.key ? String(item.key) : 'unknown',
            description: item.description ? String(item.description) : '',
            default: item.default !== undefined ? String(item.default) : null,
            prompt: item.prompt ? String(item.prompt) : null
          });
        }
      }
    }
  }

  if (!category) {
    warnings.push('Category is absent; this affects skill discovery in Hermes.');
  }

  return {
    name: frontmatter.name ? String(frontmatter.name) : null,
    description: frontmatter.description ? String(frontmatter.description) : null,
    version: frontmatter.version ? String(frontmatter.version) : null,
    platforms: Array.isArray(frontmatter.platforms) ? frontmatter.platforms.map((p: any) => String(p)) : [],
    tags,
    category,
    config_settings,
    body,
    warnings
  };
}

/**
 * Parses Hermes agent identity file (SOUL.md).
 */
export function parseSoulMd(content: string): { body: string; warnings: string[] } {
  return {
    body: content.trim(),
    warnings: ['SOUL.md detected — this will be imported as a system-prompt entity, not a skill.']
  };
}

/**
 * Parses ~/.hermes/config.yaml for model and backend hints.
 */
export function parseHermesConfigYaml(content: string): {
  model_hint: string | null;
  terminal_backend: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  let model_hint: string | null = null;
  let terminal_backend: string | null = null;

  // Extremely basic key-value extraction for a few nested keys
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('name:') && line.includes('model:')) {
       // Rough approximation for nested structure
       model_hint = trimmed.split(':')[1].trim();
    }
    if (trimmed.startsWith('backend:')) {
      terminal_backend = trimmed.split(':')[1].trim();
      if (['local', 'docker', 'ssh'].includes(terminal_backend)) {
        warnings.push(`Hermes terminal backend '${terminal_backend}' has no direct mistral-vibe equivalent.`);
      }
    }
    // More specific checks if lines are clearly in sections
    if (line.includes('model:') && !model_hint) {
       // check next line for name
    }
  }

  return { model_hint, terminal_backend, warnings };
}
