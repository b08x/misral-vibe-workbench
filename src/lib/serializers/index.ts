import { AgentConfigState, SkillDefinitionState, SystemPromptState } from '../../types';

export class TOMLSerializer {
  static serialize(config: AgentConfigState): string {
    let toml = '';
    
    if (config.model_name) toml += `active_model = "${config.model_name}"\n`;
    if (config.system_prompt_id) toml += `system_prompt_id = "${config.system_prompt_id}"\n`;
    
    if (config.disabled_tools && config.disabled_tools.length > 0) {
      toml += `disabled_tools = [${config.disabled_tools.map(t => `"${t}"`).join(', ')}]\n`;
    }

    if (config.tool_permissions) {
      for (const [tool, perm] of Object.entries(config.tool_permissions)) {
        toml += `\n[tools.${tool}]\n`;
        toml += `permission = "${(perm as any).permission}"\n`;
        if ((perm as any).default_timeout) toml += `default_timeout = ${(perm as any).default_timeout}\n`;
      }
    }

    return toml;
  }
}

export class MarkdownSerializer {
  static serializeSkill(skill: SkillDefinitionState): string {
    let md = '---\n';
    md += `name: ${skill.skill_name}\n`;
    md += `description: ${skill.skill_description}\n`;
    md += `user-invocable: ${skill.user_invocable}\n`;
    if (skill.allowed_tools && skill.allowed_tools.length > 0) {
      md += `allowed-tools:\n${skill.allowed_tools.map(t => `  - ${t}`).join('\n')}\n`;
    }
    md += '---\n\n';
    md += `# ${skill.skill_name?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Skill\n\n`;
    md += `## Overview\n${skill.skill_description}\n\n`;
    md += `## Workflow\n${skill.workflow_content}\n`;
    
    return md;
  }

  static serializeSystemPrompt(prompt: SystemPromptState): string {
    return this.serializePromptTemplate(prompt);
  }

  static serializePromptTemplate(prompt: SystemPromptState): string {
    let output = '';

    // 1. TOML Config Block
    output += '[prompt]\n';
    output += `name = "${prompt.prompt_name || 'unnamed-prompt'}"\n`;
    output += `version = "${prompt.prompt_version || '1.0.0'}"\n`;
    output += `description = "${prompt.prompt_purpose || ''}"\n`;
    output += `category = "${prompt.prompt_category || 'general'}"\n\n`;

    if (prompt.prompt_parameters) {
      output += '[prompt.parameters]\n';
      output += `temperature = ${prompt.prompt_parameters.temperature}\n`;
      output += `max_tokens = ${prompt.prompt_parameters.max_tokens}\n`;
      output += `top_p = ${prompt.prompt_parameters.top_p}\n`;
      output += `stop_sequences = [${(prompt.prompt_parameters.stop_sequences || []).map((s: string) => `"${s}"`).join(', ')}]\n\n`;
    }

    if (prompt.prompt_variables) {
      output += '[prompt.variables]\n';
      for (const [key, type] of Object.entries(prompt.prompt_variables)) {
        output += `${key} = "${type}"\n`;
      }
      output += '\n';
    }

    // 2. System Message (Markdown)
    output += '```markdown\n# System Message\n\n';
    output += `You are a ${prompt.expert_domains?.join(', ') || 'specialized expert'}. Your task is to ${prompt.prompt_purpose}.\n\n`;
    if (prompt.constraints && prompt.constraints.length > 0) {
      output += '## Constraints\n';
      output += prompt.constraints.map(c => `- ${c}`).join('\n') + '\n\n';
    }
    output += '## Output Format\n';
    output += `${prompt.response_format || 'Standard markdown response'}\n`;
    output += '```\n\n';

    // 3. Template Body (Markdown)
    output += '```markdown\n# Template Body\n\n';
    output += '## Context\n{{context_data}}\n\n';
    output += '## Request\n{{user_request}}\n\n';
    output += '## Inputs\n{{input_data}}\n\n';
    output += '# Result:\n';
    output += '```\n\n';

    // 4. Few-Shot Examples (TOML)
    if (prompt.few_shot_examples && prompt.few_shot_examples.length > 0) {
      for (const example of prompt.few_shot_examples) {
        output += '[[examples]]\n';
        output += `input = """${example.input}"""\n`;
        output += `output = """${example.output}"""\n\n`;
      }
    }

    // 5. Validation Rules (TOML)
    if (prompt.validation_required || (prompt.validation_checks && prompt.validation_checks.length > 0)) {
      output += '[validation]\n';
      if (prompt.validation_required) {
        output += `required = [${prompt.validation_required.map(v => `"${v}"`).join(', ')}]\n\n`;
      }

      if (prompt.validation_checks && prompt.validation_checks.length > 0) {
        for (const check of prompt.validation_checks) {
          output += '[[validation.checks]]\n';
          output += `variable = "${check.variable}"\n`;
          output += `regex = "${check.regex.replace(/\\/g, '\\\\')}"\n`;
          output += `message = "${check.message}"\n\n`;
        }
      }
    }

    return output;
  }
}
