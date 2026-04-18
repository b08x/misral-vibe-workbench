import { QuestionModule } from '../../../types';

export const systemPromptModule: QuestionModule = {
  id: 'system-prompt',
  name: 'System Prompt',
  description: 'Mistral-vibe system prompt definition (system.md)',
  entity_type: 'system-prompt',
  sections: [
    {
      id: 'metadata',
      title: 'Prompt Metadata',
      questions: [
        {
          id: 'prompt_name',
          prompt: "What is this prompt's identifier?",
          help_text: "Use kebab-case, e.g. 'code-review-prompt'",
          type: 'text',
          required: true,
          placeholder: 'my-extraction-prompt'
        },
        {
          id: 'prompt_category',
          prompt: "What category best describes this prompt's task?",
          type: 'select',
          required: true,
          config: {
            options: [
              { value: 'extraction', label: 'Extraction' },
              { value: 'analysis', label: 'Analysis' },
              { value: 'generation', label: 'Generation' },
              { value: 'classification', label: 'Classification' },
              { value: 'transformation', label: 'Transformation' },
              { value: 'validation', label: 'Validation' }
            ]
          }
        },
        {
          id: 'prompt_version',
          prompt: 'Version string',
          type: 'text',
          required: false,
          default_value: '1.0.0'
        }
      ]
    },
    {
      id: 'variables',
      title: 'Template Variables',
      questions: [
        {
          id: 'prompt_variables',
          prompt: 'What named placeholders does this prompt need? List each with its type.',
          help_text: 'Example: codebase_context: string, target_symbols: array',
          type: 'textarea',
          required: true,
          multiline: true,
          placeholder: 'codebase_context: string\ntarget_symbols: array'
        }
      ]
    },
    {
      id: 'few-shot',
      title: 'Few-Shot Examples',
      questions: [
        {
          id: 'has_examples',
          prompt: 'Do you have input/output example pairs to include?',
          type: 'boolean',
          required: true,
          default_value: false
        }
      ]
    },
    {
      id: 'validation',
      title: 'Validation Rules',
      questions: [
        {
          id: 'has_validation',
          prompt: 'Should any variables be required or validated with a regex?',
          type: 'boolean',
          required: true,
          default_value: false
        }
      ]
    },
    {
      id: 'parameters',
      title: 'Generation Parameters',
      questions: [
        {
          id: 'generation_temperature',
          prompt: 'What temperature should this prompt use?',
          help_text: '0.0–2.0, default 0.5',
          type: 'text',
          required: false,
          placeholder: '0.5'
        },
        {
          id: 'generation_max_tokens',
          prompt: 'Maximum tokens for responses?',
          help_text: 'default 4096',
          type: 'text',
          required: false,
          placeholder: '4096'
        }
      ]
    },
    {
      id: 'legacy-identity',
      title: 'Core Identity (Legacy support)',
      questions: [
        {
          id: 'prompt_purpose',
          prompt: 'Define the primary objective of this prompt in one sentence.',
          type: 'textarea',
          required: true,
          multiline: true
        },
        {
          id: 'expert_domains',
          prompt: 'Which domains should the persona be an expert in?',
          type: 'list',
          required: true
        },
        {
          id: 'communication_style',
          prompt: 'Style of communication?',
          type: 'select',
          required: true,
          config: {
            options: [
              { value: 'professional', label: 'Professional' },
              { value: 'conversational', label: 'Conversational' },
              { value: 'technical', label: 'Technical' },
              { value: 'socratic', label: 'Socratic' }
            ]
          }
        },
        {
          id: 'response_format',
          prompt: 'Primary response format?',
          type: 'select',
          required: true,
          config: {
            options: [
              { value: 'concise', label: 'Concise' },
              { value: 'detailed', label: 'Detailed' },
              { value: 'step-by-step', label: 'Step-by-Step' },
              { value: 'analytical', label: 'Analytical' }
            ]
          }
        }
      ]
    },
    {
      id: 'legacy-constraints',
      title: 'Constraints (Legacy support)',
      questions: [
        {
          id: 'constraints',
          prompt: 'Behavioral constraints?',
          type: 'list',
          required: false
        }
      ]
    }
  ]
};
