import { SkillFile } from '../../../types';
import { extractFrontmatter } from './bundle-splitter';

export interface GeminiCliParsedSkill {
  name: string | null;
  description: string | null;
  body: string;
  at_imports: string[];
  warnings: string[];
}

/**
 * Parses a skill bundle into a Gemini CLI specific structure.
 */
export function parseGeminiCliSkill(files: SkillFile[]): GeminiCliParsedSkill {
  const warnings: string[] = [];
  const entrypoint = files.find(f => f.role === 'entrypoint');

  if (!entrypoint) {
    return {
      name: null,
      description: null,
      body: '',
      at_imports: [],
      warnings: ['No SKILL.md entrypoint found in bundle.']
    };
  }

  const { frontmatter, body } = extractFrontmatter(entrypoint.content);

  // Scan body for @at_imports
  const at_imports: string[] = [];
  const atImportRegex = /@([a-zA-Z0-9_\-\.\/]+)/g;
  let match;
  while ((match = atImportRegex.exec(body)) !== null) {
    const path = match[1];
    if (path.includes('/') || path.includes('.')) {
      at_imports.push(path);
    }
  }

  // Check if @imports exist in bundle
  const availablePaths = new Set(files.map(f => f.relative_path.toLowerCase()));
  for (const imp of at_imports) {
    if (!availablePaths.has(imp.toLowerCase())) {
      warnings.push(`Imported file '@${imp}' mentioned in body is not present in the bundle.`);
    }
  }

  return {
    name: frontmatter.name ? String(frontmatter.name) : null,
    description: frontmatter.description ? String(frontmatter.description) : null,
    body,
    at_imports,
    warnings
  };
}

/**
 * Parses Gemini context files (GEMINI.md, AGENT.md, etc.).
 */
export function parseGeminiMd(content: string): { body: string; warnings: string[] } {
  const warnings: string[] = [];
  const atImportRegex = /@([a-zA-Z0-9_\-\.\/]+)/g;
  let match;
  while ((match = atImportRegex.exec(content)) !== null) {
    const path = match[1];
    if (path.includes('/') || path.includes('.')) {
      warnings.push(`Detected @-import directive: ${path}`);
    }
  }

  return { 
    body: content.trim(), 
    warnings 
  };
}
