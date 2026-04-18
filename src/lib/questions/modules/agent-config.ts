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
          type: 'select',
          required: true,
          config: {
            options: [
              { value: 'general-purpose', label: 'General Purpose' },
              { value: 'explore', label: 'Explore' },
              { value: 'code-reviewer', label: 'Code Reviewer' },
              { value: 'agentic-software-engineer', label: 'Agentic Software Engineer' }
            ]
          }
        },
        {
          id: 'agent_version',
          prompt: 'Version string (e.g. 1.0.0)',
          type: 'text',
          required: false,
          default_value: '1.0.0'
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
