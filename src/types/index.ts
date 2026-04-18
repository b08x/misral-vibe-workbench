/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// MISTRAL-VIBE WORKBENCH — TYPE DEFINITIONS
// ============================================================================

export interface VibeWorkspace {
  meta: WorkspaceMeta;
  agentConfig?: AgentConfigState;
  skillDefinition?: SkillDefinitionState;
  systemPrompt?: SystemPromptState;
  toolConfig?: ToolConfigState;
  session: SessionState;
  artifacts: ArtifactState;
  generation: GenerationState;
  validation: ValidationState | null;
  workbench_settings: WorkbenchModelSettings;
}

export interface WorkspaceMeta {
  entityType: 'agent' | 'skill' | 'system-prompt' | 'tool';
  outputFormat: 'toml' | 'markdown' | 'yaml';
  status: 'entity-selection' | 'questions' | 'review' | 'generation-config' | 'component-preview' | 'generating' | 'complete' | 'error';
  currentSection: string | null;
  currentQuestion: string | null;
  questionsAnswered: number;
  questionsTotal: number;
  sectionsComplete: string[];
  createdAt: Date;
  lastModifiedAt: Date;
  generatedAt: Date | null;
}

export interface SessionState {
  answers: Record<string, any>;
  history: QuestionHistoryEntry[];
  currentIndex: number;
  activeModule: string;
  conversationSummary: string | null;
}

export interface QuestionHistoryEntry {
  questionId: string;
  answer: any;
  timestamp: Date;
}

export interface ArtifactState {
  generatedContent: string | null;
  additionalFiles: Record<string, string>;
  model: string | null;
  provider: string | null;
  tokensUsed: number | null;
  generationTime: number | null;
  componentPreview?: ComponentPreview;
  phase_models_used?: {
    context_gathering: PhaseModelConfig
    drafting: PhaseModelConfig
    review: PhaseModelConfig
  }
}

export interface GenerationResult {
  content: string;
  model: string;
  provider: string;
  tokens_used: number;
  generation_time: number;
  dimensionCompliance?: Record<string, ComplianceStatus>;
  interventionsApplied?: InterventionRecord[];
}

// GENERATION SYSTEM MODELS
export interface PhaseModelConfig {
  provider: string      // provider ID matching ProviderRegistry key
  model: string         // model ID from fetched ModelInfo list
  temperature: number
  max_tokens?: number
}

export interface WorkbenchModelSettings {
  phase_models: {
    context_gathering: PhaseModelConfig
    drafting: PhaseModelConfig
    review: PhaseModelConfig
  }
  // Populated after key validation. Keyed by provider ID.
  available_models: Record<string, ModelInfo[]>
  // Validation state per provider key
  key_status: Record<string, 'unset' | 'validating' | 'valid' | 'invalid'>
}

export interface ModelInfo {
  id: string;
  name: string;
  context_window: number;
  supports_streaming: boolean;
  supports_json_mode: boolean;
}

export interface GenerationState {
  currentPhase: 'context_gathering' | 'drafting' | 'review' | null;
  dimensionCompliance: Record<string, ComplianceStatus>;
  failureModeDetected: string[] | null;
  interventionsApplied: InterventionRecord[] | null;
  contextMap: Record<string, any> | null;
  draftArtifact: string | null;
  generationTime: number;
  skeletonConstraints?: string;
}

export interface GenerationPrompt {
  system: string;
  user: string;
}

export interface ComplianceStatus {
  dimension: string;
  targetRegister: string;
  actualRegister: string;
  compliant: boolean;
  notes: string;
}

export interface InterventionRecord {
  failureMode: string;
  telemetry: string;
  intervention: string;
  result: string;
  timestamp: Date;
}

/**
 * A single editable section/component in the artifact skeleton.
 */
export interface PreviewSection {
  id: string;                   // stable uuid, used as React key and edit target
  label: string;                // display name: e.g. "## Identity & Role"
  description: string;          // brief description of what this section will contain
  dimensionHints: {            // which UGCS dimensions apply to this section
    abstraction?: string;       // e.g. "low", "moderate"
    imagery?: string;
    intensity?: string;
  };
  editable: boolean;            // false for sections the LLM flags as structurally required
  order: number;                // current render order (user can reorder)
  userNotes?: string;           // freeform user annotation injected as context
}

/**
 * The full skeleton preview of the artifact to be generated.
 * Produced by a lightweight pre-generation LLM call.
 * Stored in workspace.artifacts.componentPreview.
 */
export interface ComponentPreview {
  entityType: string;
  outputFormat: string;         // 'toml' | 'md'
  sections: PreviewSection[];
  dimensionSummary: string;     // short plain-English summary of UGCS register choices
  estimatedTokens: number;      // rough estimate for user transparency
  generatedAt: Date;
  userApproved: boolean;        // set to true when user clicks "Proceed to Generation"
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  validatedAt: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface AgentConfigState {
  agent_name: string | null;
  agent_purpose: string | null;
  agent_type: 'general-purpose' | 'explore' | 'code-reviewer' | 'agentic-software-engineer' | null;
  agent_version: string | null;
  model_provider: ModelProviderType | null;
  model_name: string | null;
  temperature: number | null;
  provider_config: ProviderConfig | null;
  capabilities: {
    read: boolean;
    write: boolean;
    bash: boolean;
    web: boolean;
    vision: boolean;
  } | null;
  context_settings: {
    max_tokens: number;
    temperature: number;
    top_p: number;
  } | null;
  safety_settings: {
    require_confirmation: boolean;
    allow_destructive: boolean;
    sandbox_mode: boolean;
    allowed_dirs: string[];
  } | null;
  output_settings: {
    format: 'markdown' | 'json' | 'plain';
    verbose: boolean;
    show_thinking: boolean;
  } | null;
  mcp_servers: Array<{
    name: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  }> | null;
  env_settings: {
    llm_api_key_var: string;
    llm_model: string;
    llm_base_url: string | null;
    project_root: string;
    project_type: string;
    debug: boolean;
    verbose: boolean;
  } | null;
  session_settings: {
    persist: boolean;
    storage_path: string;
    max_history: number;
    checkpoint_enabled: boolean;
    checkpoint_interval: number;
  } | null;
  extends_template: string | null;
  needs_custom_prompt: boolean | null;
  system_prompt_id: string | null;
  custom_prompt_content: string | null;
  custom_prompt_approach: 'generate' | 'provide' | 'reference' | null;
  prompt_description: string | null;
  prompt_tone: 'professional' | 'conversational' | 'technical' | 'educational' | null;
  tool_permission_strategy: 'permissive' | 'restrictive' | 'custom' | null;
  enabled_tools: string[] | null;
  disabled_tools: string[] | null;
  tool_permissions: Record<string, ToolPermissionConfig> | null;
  has_skills: boolean | null;
  skill_ids: string[] | null;
}

export type ModelProviderType = 'mistral' | 'anthropic' | 'openai' | 'google' | 'openrouter' | 'llamacpp' | 'custom';

export interface ProviderConfig {
  provider: ModelProviderType;
  name?: string;
  api_base?: string;
  api_key_env_var?: string;
  backend?: string;
}

export interface ToolPermissionConfig {
  permission: 'always' | 'ask' | 'deny';
  default_timeout?: number;
  allowlist?: string[];
  denylist?: string[];
  sensitive_patterns?: string[];
  max_matches?: number;
}

export interface SkillDefinitionState {
  skill_name: string | null;
  skill_description: string | null;
  license: string | null;
  compatibility: string | null;
  user_invocable: boolean | null;
  allowed_tools: string[] | null;
  workflow_approach: 'describe' | 'provide' | 'qa' | null;
  workflow_description: string | null;
  workflow_content: string | null;
  workflow_has_conditions: boolean | null;
  workflow_conditions: string | null;
  workflow_error_handling: 'abort' | 'continue' | 'ask' | null;
  workflow_purpose: string | null;
  workflow_inputs: string | null;
  workflow_outputs: string | null;
  workflow_steps_count: number | null;
  workflow_steps: WorkflowStep[] | null;
  has_examples: boolean | null;
  example_scenarios: string | null;
  has_templates: boolean | null;
  template_files: Record<string, string> | null;
  has_scripts: boolean | null;
  script_files: Record<string, string> | null;
}

export interface WorkflowStep {
  step_number: number;
  description: string;
  tools_used: string[];
  has_conditions: boolean;
  condition_description?: string;
}

export interface SystemPromptState {
  prompt_id: string | null;
  prompt_purpose: string | null;
  expert_domains: string[] | null;
  technical_depth: 'beginner' | 'intermediate' | 'expert' | null;
  communication_style: 'professional' | 'conversational' | 'technical' | 'educational' | 'socratic' | null;
  response_format: 'concise' | 'detailed' | 'step-by-step' | 'analytical' | null;
  has_constraints: boolean | null;
  constraints: string[] | null;
  has_priorities: boolean | null;
  priorities: string[] | null;
  has_examples: boolean | null;
  good_examples: string | null;
  bad_examples: string | null;
}

export interface ToolConfigState {
  tool_name: string | null;
  permission: 'always' | 'ask' | 'deny' | null;
  bash?: BashToolConfig;
  read_file?: ReadFileToolConfig;
  grep?: GrepToolConfig;
}

export interface BashToolConfig {
  default_timeout: number;
  allowlist: string[];
  denylist: string[];
}

export interface ReadFileToolConfig {
  sensitive_patterns: string[];
}

export interface GrepToolConfig {
  default_max_matches: number;
  exclude_patterns: string[];
}

export interface QuestionModule {
  id: string;
  name: string;
  description: string;
  entity_type: 'agent' | 'skill' | 'system-prompt' | 'tool';
  trigger_condition?: (workspace: VibeWorkspace) => boolean;
  sections: QuestionSection[];
  generation_hints?: GenerationHints;
}

export interface QuestionSection {
  id: string;
  title: string;
  description?: string;
  show_if?: (answers: Record<string, any>) => boolean;
  questions: Question[];
  icon?: string;
  estimatedTime?: number;
}

export interface Question {
  id: string;
  prompt: string;
  help_text?: string;
  type: QuestionType;
  required: boolean;
  validation?: ValidationRules;
  config?: QuestionConfig;
  follow_ups?: FollowUp[];
  default_value?: any | ((workspace: VibeWorkspace) => any);
  placeholder?: string;
  autocomplete?: string[];
  multiline?: boolean;
}

export type QuestionType = 
  | 'text'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'boolean'
  | 'number'
  | 'slider'
  | 'key-value'
  | 'list'
  | 'code'
  | 'file-upload';

export interface ValidationRules {
  pattern?: string;
  min_length?: number;
  max_length?: number;
  min?: number;
  max?: number;
  step?: number;
  min_items?: number;
  max_items?: number;
  unique_items?: boolean;
}

export type QuestionConfig = 
  | SelectConfig
  | MultiSelectConfig
  | SliderConfig
  | KeyValueConfig;

export interface SelectConfig {
  options: SelectOption[];
  allow_custom?: boolean;
  searchable?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface MultiSelectConfig {
  options: SelectOption[];
  min_selections?: number;
  max_selections?: number;
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  marks?: Record<number, string>;
  show_value?: boolean;
}

export interface KeyValueConfig {
  key_label?: string;
  value_label?: string;
  key_placeholder?: string;
  value_placeholder?: string;
}

export interface FollowUp {
  condition: (answer: any, workspace: VibeWorkspace) => boolean;
  questions: Question[];
}

export interface GenerationHints {
  context_keys: string[];
  style_guidance: string;
  validation_rules: string[];
}

export const BUILT_IN_TOOLS = [
  'bash',
  'read_file',
  'write_file',
  'search_replace',
  'grep',
  'ask_user_question'
] as const;
