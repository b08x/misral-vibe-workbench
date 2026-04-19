import { AgentConfigState, SkillDefinitionState, SystemPromptState } from '../../types';

export class TOMLSerializer {
  static serialize(config: AgentConfigState): string {
    let toml = '';
    
    // --- [metadata] block ---
    if (config.agent_type) toml += `agent_type = "${config.agent_type}"\n`;

    // --- [safety] block ---
    if (config.safety_level) toml += `safety_level = "${config.safety_level}"\n`;

    // --- [config] block ---
    // model_name maps to active_model in TOML
    if (config.model_name) toml += `active_model = "${config.model_name}"\n`;
    if (config.system_prompt_id) toml += `system_prompt_id = "${config.system_prompt_id}"\n`;
    
    // --- Tool lists: Whitelist-Takes-Precedence ---
    if (config.enabled_tools && config.enabled_tools.length > 0) {
      toml += `enabled_tools = [${config.enabled_tools.map(t => `"${t}"`).join(', ')}]\n`;
    } else if (config.disabled_tools && config.disabled_tools.length > 0) {
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

export class SubagentSerializer {
  static serialize(config: any): string {
    let toml = '';

    // 1. [subagent]
    toml += '[subagent]\n';
    toml += `role = "${config.role || 'extraction'}"\n`;
    toml += `chunk_id = ${config.chunk_id || 1}\n`;
    toml += `total_chunks = ${config.total_chunks || 1}\n\n`;

    // 2. [subagent.scope]
    toml += '[subagent.scope]\n';
    toml += `files = [${(config.scope_files || []).map((f: string) => `"${f}"`).join(', ')}]\n`;
    toml += `types = [${(config.scope_types || []).map((t: string) => `"${t}"`).join(', ')}]\n`;
    if (config.scope_max_files) toml += `max_files = ${config.scope_max_files}\n`;
    toml += '\n';

    // 3. [subagent.mode]
    toml += '[subagent.mode]\n';
    toml += `deep = ${config.mode_deep ?? false}\n`;
    toml += `semantic = ${config.mode_semantic ?? true}\n`;
    toml += `hyperedges = ${config.mode_hyperedges ?? true}\n\n`;

    // 4. [subagent.output]
    toml += '[subagent.output]\n';
    toml += `format = "${config.output_format || 'json'}"\n`;
    toml += `schema_version = "${config.output_schema_version || '1.0'}"\n`;
    toml += `require_nodes = ${config.output_require_nodes ?? true}\n`;
    toml += `require_edges = ${config.output_require_edges ?? true}\n`;
    toml += `require_confidence = ${config.output_require_confidence ?? true}\n\n`;

    // 5. [subagent.error_handling]
    toml += '[subagent.error_handling]\n';
    toml += `retry_on_fail = ${config.retry_on_fail ?? true}\n`;
    toml += `max_retries = ${config.max_retries ?? 2}\n`;
    toml += `log_failures = ${config.log_failures ?? true}\n\n`;

    // 6. [extraction.edge_rules]
    toml += '[extraction.edge_rules]\n';
    toml += `extracted = [${(config.edge_extracted || ['calls', 'import', 'reference', 'cite', 'defines']).map((e: string) => `"${e}"`).join(', ')}]\n`;
    toml += `inferred = [${(config.edge_inferred || ['implements', 'shares_data_with', 'conceptually_related_to', 'semantically_similar_to', 'wraps']).map((e: string) => `"${e}"`).join(', ')}]\n`;
    toml += `ambiguous = [${(config.edge_ambiguous || ['flag_for_review']).map((e: string) => `"${e}"`).join(', ')}]\n\n`;

    // 7. [extraction.confidence]
    toml += '[extraction.confidence]\n';
    toml += `extracted = ${config.confidence_extracted || 1.0}\n`;
    toml += `inferred_high = ${config.confidence_inferred_high || 0.9}\n`;
    toml += `inferred_mid = ${config.confidence_inferred_mid || 0.7}\n`;
    toml += `inferred_low = ${config.confidence_inferred_low || 0.5}\n`;
    toml += `ambiguous = ${config.confidence_ambiguous || 0.2}\n\n`;

    // 8. [extraction.node_id]
    toml += '[extraction.node_id]\n';
    toml += `format = "${config.node_id_format || '{stem}_{entity}'}"\n`;
    toml += `stem = "${config.node_id_stem_rule || 'lowercase(Path).suffix_removed'}"\n`;
    toml += `entity = "${config.node_id_entity_rule || 'symbol_name_normalized'}"\n\n`;

    // 9. [extraction.semantic_similarity]
    toml += '[extraction.semantic_similarity]\n';
    toml += `enabled = ${config.semantic_similarity_enabled ?? true}\n\n`;

    // 10. [extraction.hyperedges]
    toml += '[extraction.hyperedges]\n';
    toml += `enabled = ${config.hyperedges_enabled ?? true}\n`;
    toml += `min_nodes = ${config.hyperedges_min_nodes || 3}\n`;
    toml += `max_per_chunk = ${config.hyperedges_max_per_chunk || 3}\n\n`;

    // 11. [file_handlers.*]
    if (config.handler_code_enabled) {
      toml += '[file_handlers.code]\n';
      toml += `extensions = [".py", ".ts", ".js", ".go", ".rs", ".rb", ".java"]\n`;
      toml += `focus = ["semantic edges AST cannot find", "call relationships", "shared data structures", "architecture patterns"]\n`;
      toml += `skip = ["imports (AST already has these)"]\n\n`;
    }

    if (config.handler_document_enabled) {
      toml += '[file_handlers.document]\n';
      toml += `extensions = [".md", ".txt", ".rst", ".adoc"]\n`;
      toml += `extract = ["named concepts", "entities", "citations", "rationale (WHY decisions made)"]\n\n`;
    }

    // 12. [context]
    toml += '[context]\n';
    toml += `domain_hint = "${config.context_domain_hint || ''}"\n`;
    toml += `prompt = "${config.context_prompt || ''}"\n\n`;

    toml += '[context.frontmatter]\n';
    toml += `propagate = [${(config.context_frontmatter_propagate || ['source_url', 'captured_at', 'author', 'contributor']).map((f: string) => `"${f}"`).join(', ')}]\n`;

    return toml;
  }
}
