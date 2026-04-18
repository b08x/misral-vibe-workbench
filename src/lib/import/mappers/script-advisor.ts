import { SkillFile } from '../../../types';

export interface ScriptAdvisory {
  script_path: string;
  content: string;
  inferred_purpose: string;
  bash_tool_suggestion: string;
  has_network_calls: boolean;
  has_file_writes: boolean;
}

/**
 * Analyzes scripts in the bundle and provides configuration advisories.
 */
export function analyzeScripts(files: SkillFile[]): ScriptAdvisory[] {
  const scriptFiles = files.filter(f => f.role === 'script');
  const advisories: ScriptAdvisory[] = [];

  for (const file of scriptFiles) {
    const lines = file.content.split('\n');
    let inferred_purpose = 'Unknown script purpose';
    
    // 1. Check first comment or shebang
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#!') || trimmed.startsWith('//') || trimmed.startsWith('#')) {
        const text = trimmed.replace(/^#!|^\/\/*|^\#+/, '').trim();
        if (text && !text.includes('/bin/')) {
          inferred_purpose = text;
          break;
        }
      }
    }
    
    // Fallback to filename
    if (inferred_purpose === 'Unknown script purpose') {
      const parts = file.relative_path.split('/');
      inferred_purpose = parts[parts.length - 1].split('.')[0];
    }

    // Heuristics
    const has_network_calls = /curl|wget|fetch|requests|axios|socket/i.test(file.content);
    const has_file_writes = /write|save|>\s|>>\s|\.open\(.*'w'/i.test(file.content);

    const bash_tool_suggestion = `Add bash tool with allowlist: ['./${file.relative_path}'] — runs ${inferred_purpose}`;

    advisories.push({
      script_path: file.relative_path,
      content: file.content,
      inferred_purpose,
      bash_tool_suggestion,
      has_network_calls,
      has_file_writes
    });
  }

  return advisories;
}
