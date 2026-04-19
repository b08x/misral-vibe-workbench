import { AgentConfigState, ValidationError, ValidationWarning } from '../../types';

export class ArtifactValidator {
  static validateAgentConfig(config: AgentConfigState): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Rule 1 — active_model known list:
    const KNOWN_MODELS = [
      'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
      'devstral-2', 'codestral-latest', 'open-mistral-nemo'
    ];

    if (config.model_name) {
      if (!KNOWN_MODELS.includes(config.model_name)) {
        errors.push({
          field: 'active_model',
          message: `active_model must reference a configured model. Got: ${config.model_name}`,
          severity: 'error'
        });
      }
    }

    // Rule 2 — Whitelist-Takes-Precedence consistency:
    if (config.enabled_tools && config.enabled_tools.length > 0 && config.disabled_tools && config.disabled_tools.length > 0) {
      warnings.push({
        field: 'disabled_tools',
        message: 'disabled_tools has no effect when enabled_tools is populated. The whitelist takes precedence.'
      });
    }

    // Rule 3 — system_prompt_id builtin vs custom:
    const BUILTIN_PROMPTS = ['cli', 'explore', 'plan', 'review'];
    if (config.system_prompt_id && !BUILTIN_PROMPTS.includes(config.system_prompt_id)) {
      warnings.push({
        field: 'system_prompt_id',
        message: `Custom system prompt ID "${config.system_prompt_id}" detected. Ensure the corresponding file exists in the prompts/ directory.`
      });
    }

    return { errors, warnings };
  }
}
