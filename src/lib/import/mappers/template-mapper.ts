import { SkillFile } from '../../../types';

/**
 * Extracts and maps template files from the bundle.
 */
export function mapTemplateFiles(files: SkillFile[]): {
  template_files: Record<string, string>;
  warnings: string[];
} {
  const template_files: Record<string, string> = {};
  const warnings: string[] = [];

  const templates = files.filter(f => f.role === 'template');

  for (const file of templates) {
    // Basic basename extraction
    const parts = file.relative_path.split('/');
    const filename = parts[parts.length - 1];
    
    template_files[filename] = file.content;

    if (file.size_chars > 10000) {
      warnings.push(`Large template file '${filename}' (${file.size_chars} chars) may impact agent interaction quality.`);
    }
  }

  return { template_files, warnings };
}
