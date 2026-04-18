import { 
  SkillFile, 
  SkillFileRole, 
  ImportMode 
} from '../../../types';

export class BundleParseError extends Error {
  constructor(
    message: string,
    public readonly raw_input_preview: string  // first 200 chars of input
  ) {
    super(message);
    this.name = 'BundleParseError';
  }
}

/**
 * Inspects rawText and returns 'paste-multi' if delimiter pattern is found,
 * otherwise 'paste-single'.
 */
export function detectImportMode(rawText: string): ImportMode {
  const lines = rawText.split('\n');
  const delimiterRegex = /^--- .+ ---$/;
  for (const line of lines) {
    if (delimiterRegex.test(line.trim())) {
      return 'paste-multi';
    }
  }
  return 'paste-single';
}

/**
 * Assigns a SkillFileRole based on relative path.
 */
export function classifyFileRole(relativePath: string): SkillFileRole {
  const normPath = relativePath.toLowerCase().replace(/\\/g, '/');
  const parts = normPath.split('/');
  const filename = parts[parts.length - 1];
  const extIndex = filename.lastIndexOf('.');
  const ext = extIndex !== -1 ? filename.substring(extIndex) : '';

  if (normPath === 'skill.md') return 'entrypoint';

  if (normPath.startsWith('references/') || normPath.startsWith('docs/')) {
    return 'reference';
  }

  if (normPath.startsWith('templates/') || 
      filename.includes('template') || 
      filename.includes('-template.')) {
    return 'template';
  }

  const scriptExts = ['.sh', '.py', '.js', '.ts', '.rb'];
  if (normPath.startsWith('scripts/') || scriptExts.includes(ext)) {
    return 'script';
  }

  const assetExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.pdf'];
  if (normPath.startsWith('assets/') || assetExts.includes(ext)) {
    return 'asset';
  }

  if (normPath.startsWith('examples/') || 
      filename.includes('example') || 
      filename.includes('sample')) {
    return 'example';
  }

  if (normPath.startsWith('workflows/') || 
      ((ext === '.yaml' || ext === '.yml') && parts.length > 1)) {
    return 'workflow';
  }

  return 'unknown';
}

/**
 * Internal helper to create a SkillFile object.
 */
function createFileObject(path: string, contentLines: string[]): SkillFile {
  let content = contentLines.join('\n');
  const role = classifyFileRole(path);
  
  let is_binary = false;
  const trimmed = content.trim();
  
  // Binary detection
  if (trimmed === '[binary — skip]' || trimmed === '[binary]') {
    is_binary = true;
    content = '';
  } else if (role === 'asset' && trimmed === '') {
    is_binary = true;
    content = '';
  }

  return {
    relative_path: path,
    content,
    role,
    size_chars: content.length,
    is_binary
  };
}

/**
 * Splits a multi-file paste into an array of SkillFile objects.
 */
export function parseDelimitedBundle(rawText: string): SkillFile[] {
  if (!rawText.trim()) {
    throw new BundleParseError('Input is empty', '');
  }

  const lines = rawText.split('\n');
  const files: SkillFile[] = [];
  let currentFile: { path: string; contentLines: string[] } | null = null;
  const delimiterRegex = /^--- (.+) ---$/;

  for (const line of lines) {
    const match = line.trim().match(delimiterRegex);

    if (match) {
      if (currentFile) {
        files.push(createFileObject(currentFile.path, currentFile.contentLines));
      }
      const newPath = match[1].trim();
      
      // Validation: first file must be SKILL.md
      if (files.length === 0 && newPath.toLowerCase() !== 'skill.md') {
        throw new BundleParseError(
          `First file must be SKILL.md, found: ${newPath}`, 
          rawText.substring(0, 200)
        );
      }
      
      currentFile = { path: newPath, contentLines: [] };
    } else if (currentFile) {
      currentFile.contentLines.push(line);
    }
  }

  if (currentFile) {
    files.push(createFileObject(currentFile.path, currentFile.contentLines));
  }

  if (files.length === 0) {
    return parseSingleFile(rawText);
  }

  return files;
}

/**
 * Wraps plain SKILL.md text into a single-element SkillFile array.
 */
export function parseSingleFile(rawText: string): SkillFile[] {
  return [{ 
    relative_path: 'SKILL.md', 
    content: rawText, 
    role: 'entrypoint', 
    size_chars: rawText.length, 
    is_binary: false 
  }];
}

/**
 * Top-level dispatcher for bundle parsing.
 */
export function splitBundle(rawText: string): SkillFile[] {
  if (!rawText || !rawText.trim()) {
    throw new BundleParseError('Empty input provided', '');
  }
  const mode = detectImportMode(rawText);
  if (mode === 'paste-multi') {
    return parseDelimitedBundle(rawText);
  }
  return parseSingleFile(rawText);
}

/**
 * Minimal YAML parser for skill frontmatter.
 */
export function extractFrontmatter(skillMdContent: string): { frontmatter: Record<string, any>; body: string } {
  const lines = skillMdContent.split('\n');
  let startIdx = -1;
  let endIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '---') {
      if (startIdx === -1) {
        startIdx = i;
      } else {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx !== -1 && endIdx !== -1) {
    const frontmatterLines = lines.slice(startIdx + 1, endIdx);
    const bodyText = lines.slice(endIdx + 1).join('\n');
    const frontmatter: Record<string, any> = {};

    for (const line of frontmatterLines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim();
        let val = line.substring(colonIdx + 1).trim();

        // Type conversion
        if (val === 'true') {
          frontmatter[key] = true;
        } else if (val === 'false') {
          frontmatter[key] = false;
        } else if (!isNaN(Number(val)) && val !== '') {
          frontmatter[key] = Number(val);
        } else if (val.startsWith('[') && val.endsWith(']')) {
          const inner = val.substring(1, val.length - 1);
          frontmatter[key] = inner.split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => s.replace(/^['"]|['"]$/g, ''));
        } else {
          // Quote stripping
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          frontmatter[key] = val;
        }
      }
    }

    return { frontmatter, body: bodyText };
  }

  return { frontmatter: {}, body: skillMdContent };
}

/**
 * Scans body text for relative file path references.
 */
export function extractReferencedPaths(bodyText: string): string[] {
  const paths = new Set<string>();

  // Gemini-style: @references/filename.md
  const geminiRegex = /@([a-zA-Z0-9_\-\.\/]+)/g;
  let match;
  while ((match = geminiRegex.exec(bodyText)) !== null) {
    paths.add(match[1]);
  }

  // Markdown links: [label](references/filename.md)
  const mdLinkRegex = /\[[^\]]*\]\(([^)]+)\)/g;
  while ((match = mdLinkRegex.exec(bodyText)) !== null) {
    const link = match[1];
    if (link.includes('/') || link.includes('.')) {
      paths.add(link);
    }
  }

  // Prose references
  const prosePrefixes = ['Read ', 'See ', 'read ', 'see ', 'from '];
  const lines = bodyText.split('\n');
  for (const line of lines) {
    for (const prefix of prosePrefixes) {
      let idx = line.indexOf(prefix);
      while (idx !== -1) {
        const start = idx + prefix.length;
        let end = start;
        while (end < line.length && !/[\s,;]/.test(line[end])) {
          end++;
        }
        const path = line.substring(start, end);
        // Minimum heuristic for a path vs a word
        if (path.includes('/') || path.includes('.')) {
          paths.add(path);
        }
        idx = line.indexOf(prefix, end);
      }
    }
  }

  return Array.from(paths);
}

// --- TESTS (inline, for verification only) ---
// assert: splitBundle('') throws BundleParseError
// assert: parseDelimitedBundle('--- SKILL.md ---\nContent\n--- other.md ---\nMore') correctly handles 'More'
// assert: extractFrontmatter('---\nkey: val\n---\nBody') returns body: 'Body'
// assert: extractFrontmatter('---\nkey: val\n---') returns body: ''
// assert: classifyFileRole('SKILL.md') === 'entrypoint'
// assert: classifyFileRole('references/deep/nested.md') === 'reference'
