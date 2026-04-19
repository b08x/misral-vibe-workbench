import { QuestionModule } from '../../../types';

export const agentConfigModule: QuestionModule = {
  id: 'agent-config',
  name: 'Agent Configuration',
  description: 'Mistral-vibe agent configuration (agent.toml)',
  entity_type: 'agent',
  sections: [
    {
      id: 'identity',
      title: 'Agent Identity',
      questions: [
        {
          id: 'agent_name',
          prompt: 'What is the name of your agent?',
          type: 'text',
          required: true,
          placeholder: 'research-assistant'
        },
        {
          id: 'agent_type',
          prompt: 'What type of agent is this?',
          help_text: 'AGENT agents are user-selectable via --agent or the interactive cycle. SUBAGENT agents are restricted to programmatic delegation via the task tool only.',
          type: 'select',
          required: true,
          config: {
            options: [
              {
                value: 'AGENT',
                label: 'Agent',
                description: 'User-selectable. Supports interactive UI and direct invocation.'
              },
              {
                value: 'SUBAGENT',
                label: 'Subagent',
                description: 'Programmatic only. Spawned by the task tool; cannot be selected at the CLI.'
              }
            ]
          }
        },
        {
          id: 'agent_version',
          prompt: 'Version string (e.g. 1.0.0)',
          type: 'text',
          required: false,
          default_value: '1.0.0'
        },
        {
          id: 'safety_level',
          prompt: 'What safety posture should this agent operate under?',
          help_text: 'Governs the Human-in-the-Loop (HITL) gate for all tool actions. Applies as the default; individual tool blocks can override via [config.tools.<name>] permission.',
          type: 'select',
          required: true,
          default_value: 'NEUTRAL',
          config: {
            options: [
              {
                value: 'SAFE',
                label: 'Safe',
                description: 'Read-only. No write or destructive operations permitted. Use for chat or plan modes.'
              },
              {
                value: 'NEUTRAL',
                label: 'Neutral',
                description: 'Standard profile. All system modifications require explicit ASK confirmation.'
              },
              {
                value: 'DESTRUCTIVE',
                label: 'Destructive',
                description: 'High-velocity refactoring. File writes auto-approved; bash remains gated.'
              },
              {
                value: 'YOLO',
                label: 'YOLO',
                description: 'All tool executions auto-approved. Intended for headless CI/CD pipelines only.'
              }
            ]
          }
        }
      ]
    },
    {
      id: 'model',
      title: 'Model & Prompt',
      questions: [
        {
          id: 'active_model',
          prompt: 'Which model backend should this agent use?',
          help_text: 'Must reference a model configured in your mistral-vibe environment. Validated against the known model list.',
          type: 'select',
          required: true,
          config: {
            options: [
              { value: 'mistral-large-latest',  label: 'Mistral Large (Latest)',  description: 'Highest capability. Use for complex reasoning and planning agents.' },
              { value: 'mistral-medium-latest', label: 'Mistral Medium (Latest)', description: 'Balanced performance and cost.' },
              { value: 'mistral-small-latest',  label: 'Mistral Small (Latest)',  description: 'Lightweight. Use for focused, single-task agents.' },
              { value: 'devstral-2',            label: 'Devstral 2',             description: 'Optimized for code generation and software engineering tasks.' },
              { value: 'codestral-latest',      label: 'Codestral (Latest)',     description: 'Code completion and fill-in-the-middle. High velocity refactoring.' },
              { value: 'open-mistral-nemo',     label: 'Mistral Nemo',           description: 'Open-weight. Use for local or air-gapped deployments.' }
            ]
          }
        },
        {
          id: 'system_prompt_id',
          prompt: 'Which system prompt template should this agent load?',
          help_text: 'References a .md file in the prompts/ directory. The value is the filename without extension.',
          type: 'select',
          required: false,
          config: {
            options: [
              { value: 'cli',     label: 'cli',     description: 'Default CLI-context prompt. Covers standard tool use and response formatting.' },
              { value: 'explore', label: 'explore', description: 'Background exploration prompt. Designed for SUBAGENT isolation contexts.' },
              { value: 'plan',    label: 'plan',    description: 'Planning mode. Read-only posture; no write tool invocations.' },
              { value: 'review',  label: 'review',  description: 'Code review context. Structured output, diff-aware analysis.' }
            ],
            allow_custom: true
          }
        }
      ]
    },
    {
      id: 'capabilities',
      title: 'Capabilities',
      questions: [
        {
          id: 'capabilities_web',
          prompt: 'Does this agent need web fetch or search access?',
          type: 'boolean',
          required: true,
          default_value: false
        },
        {
          id: 'capabilities_vision',
          prompt: 'Does this agent need to analyze images?',
          type: 'boolean',
          required: true,
          default_value: false,
          follow_ups: [
            {
              condition: (answer: any) => answer === true,
              questions: [
                {
                  id: 'vision_image_types',
                  prompt: 'What image types should be supported?',
                  type: 'text',
                  required: true,
                  placeholder: 'jpeg, png, webp'
                }
              ]
            }
          ]
        },
        {
          id: 'enabled_tools',
          prompt: 'Which tools should be explicitly enabled?',
          help_text: 'Whitelist-Takes-Precedence: if any tools are selected here, all unlisted tools are automatically disabled. Leave empty to manage access via the disabled list instead.',
          type: 'multi-select',
          required: false,
          config: {
            options: [
              { value: 'bash',              label: 'bash',              description: 'Shell command execution. Highest risk — decomposed and validated against denylist.' },
              { value: 'read_file',         label: 'read_file',         description: 'Read file contents from the project tree.' },
              { value: 'write_file',        label: 'write_file',        description: 'Write or overwrite files. Pair with allowlist paths for safety.' },
              { value: 'search_replace',    label: 'search_replace',    description: 'In-place text substitution within existing files.' },
              { value: 'grep',              label: 'grep',              description: 'Pattern search across files.' },
              { value: 'ask_user_question', label: 'ask_user_question', description: 'HITL prompt: pause execution and request input from the user.' },
              { value: 'task',              label: 'task',              description: 'Delegate work to a subagent. Required for orchestrator-type agents.' }
            ]
          }
        },
        {
          id: 'disabled_tools',
          prompt: 'Which tools should be explicitly disabled?',
          help_text: 'Only applies when no tools are selected in the whitelist above. If enabled_tools is populated, this field has no effect.',
          type: 'multi-select',
          required: false,
          show_if: (answers: Record<string, any>) =>
            !answers.enabled_tools || answers.enabled_tools.length === 0,
          config: {
            options: [
              { value: 'bash',              label: 'bash',              description: 'Prevent all shell execution.' },
              { value: 'read_file',         label: 'read_file',         description: 'Prevent file reads.' },
              { value: 'write_file',        label: 'write_file',        description: 'Prevent all file writes.' },
              { value: 'search_replace',    label: 'search_replace',    description: 'Prevent in-place edits.' },
              { value: 'grep',              label: 'grep',              description: 'Prevent pattern search.' },
              { value: 'ask_user_question', label: 'ask_user_question', description: 'Prevent HITL interruptions (use in fully autonomous modes only).' },
              { value: 'task',              label: 'task',              description: 'Prevent subagent delegation.' }
            ]
          }
        }
      ]
    },
    {
      id: 'mcp-tools',
      title: 'MCP Tools',
      show_if: (answers: Record<string, any>) => answers.capabilities_web === true || answers.enabled_tools?.some((t: string) => t.includes('mcp')),
      questions: [
        {
          id: 'mcp_servers_confirmed',
          prompt: "List any MCP server names this agent should connect to (or 'none').",
          help_text: 'This is high-risk — only name servers you have configured.',
          type: 'text',
          required: true,
          placeholder: 'none'
        }
      ]
    },
    {
      id: 'session',
      title: 'Session Persistence',
      questions: [
        {
          id: 'session_persist',
          prompt: 'Should this agent persist session state between runs?',
          type: 'boolean',
          required: true,
          default_value: false,
          follow_ups: [
            {
              condition: (answer: any) => answer === true,
              questions: [
                {
                  id: 'session_storage_path',
                  prompt: 'Where should sessions be stored?',
                  help_text: 'default: .vibe/sessions',
                  type: 'text',
                  required: false,
                  placeholder: '.vibe/sessions'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'templates',
      title: 'Template Inheritance',
      questions: [
        {
          id: 'extends_template',
          prompt: 'Does this agent extend a base template?',
          help_text: 'Provide path or leave blank.',
          type: 'text',
          required: false,
          placeholder: ''
        }
      ]
    }
  ]
};
