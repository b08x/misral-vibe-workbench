import { unzipSync, strFromU8 } from 'fflate';
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

/**
 * Extracts a SkillFile[] from a browser File object pointing to a .zip archive.
 *
 * - Reads the file as ArrayBuffer, passes to fflate.unzipSync
 * - Strips macOS artifacts (__MACOSX/, .DS_Store)
 * - Detects and strips top-level wrapper directory (GitHub zip structure)
 * - Finds SKILL.md (required) — throws BundleParseError if absent
 * - Converts each file's bytes to string with strFromU8; marks binary files
 *   (strFromU8 throws) as is_binary: true, content: ''
 * - Calls classifyFileRole for each path
 * - Returns SkillFile[] with SKILL.md as index 0
 *
 * Uses async because file.arrayBuffer() is async.
 * fflate.unzipSync is synchronous — acceptable for skill bundles (<10MB).
 */
export async function extractZipBundle(file: File): Promise<SkillFile[]> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let unzipped: Record<string, Uint8Array>;
  
  try {
    unzipped = unzipSync(uint8);
  } catch (e) {
    throw new BundleParseError('Failed to unzip archive. File may be corrupted.', file.name);
  }

  const paths = Object.keys(unzipped).filter(p => {
    const isMacArtifact = p.includes('__MACOSX/') || p.endsWith('.DS_Store');
    const isHidden = p.split('/').some(segment => segment.startsWith('.'));
    const isDirectory = p.endsWith('/');
    return !isMacArtifact && !isHidden && !isDirectory;
  });

  if (paths.length === 0) {
    throw new BundleParseError('Zip archive is empty or contains only hidden files.', file.name);
  }

  // Top-level strip detection (GitHub zip structure)
  let prefixToStrip = '';
  const firstPath = paths[0];
  const firstSegment = firstPath.split('/')[0];
  
  if (firstSegment && !firstSegment.includes('.')) {
    const allSharePrefix = paths.every(p => p.startsWith(firstSegment + '/'));
    if (allSharePrefix) {
      prefixToStrip = firstSegment + '/';
    }
  }

  const skillFiles: SkillFile[] = [];
  let entrypointIndex = -1;

  for (const path of paths) {
    const bytes = unzipped[path];
    const relativePath = prefixToStrip ? path.substring(prefixToStrip.length) : path;
    
    let content = '';
    let is_binary = false;
    
    try {
      content = strFromU8(bytes);
    } catch (e) {
      is_binary = true;
      content = '';
    }

    const role = classifyFileRole(relativePath);
    const skillFile: SkillFile = {
      relative_path: relativePath,
      content,
      role,
      size_chars: content.length,
      is_binary
    };

    if (role === 'entrypoint' || relativePath.toLowerCase() === 'skill.md') {
      skillFile.role = 'entrypoint';
      skillFiles.unshift(skillFile);
      entrypointIndex = 0;
    } else {
      skillFiles.push(skillFile);
    }
  }

  // Ensure SKILL.md exists
  const hasSkillMd = skillFiles.some(f => f.role === 'entrypoint');
  if (!hasSkillMd) {
    throw new BundleParseError('No SKILL.md found in zip archive root or one level deep.', file.name);
  }

  // Final sort to ensure entrypoint is at index 0 (if unshift didn't already handle it perfectly)
  return skillFiles.sort((a, b) => {
    if (a.role === 'entrypoint') return -1;
    if (b.role === 'entrypoint') return 1;
    return a.relative_path.localeCompare(b.relative_path);
  });
}

// --- TESTS (inline, for verification only) ---
// assert: splitBundle('') throws BundleParseError
// assert: parseDelimitedBundle('--- SKILL.md ---\nContent\n--- other.md ---\nMore') correctly handles 'More'
// assert: extractFrontmatter('---\nkey: val\n---\nBody') returns body: 'Body'
// assert: extractFrontmatter('---\nkey: val\n---') returns body: ''
// assert: classifyFileRole('SKILL.md') === 'entrypoint'
// assert: classifyFileRole('references/deep/nested.md') === 'reference'
