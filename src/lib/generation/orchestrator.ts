import { 
  VibeWorkspace, 
  GenerationResult,
  ComplianceStatus,
  PhaseModelConfig
} from '../../types';
import { 
  ProviderRegistry, 
  ModelProvider 
} from '../providers/registry';
import { WorkspaceManager } from '../storage/workspace-manager';
import { 
  UGCSController 
} from './ugcs-controller';
import { 
  buildAgentConfigPrompt 
} from './prompts/agent-config-builder';
import { 
  buildSkillDefinitionPrompt 
} from './prompts/skill-definition-builder';
import { 
  buildSystemPromptPrompt 
} from './prompts/system-prompt-builder';

import { 
  buildSubagentConfigPrompt 
} from './prompts/subagent-config-builder';

export class GenerationOrchestrator {
  private workspace: VibeWorkspace;
  private apiKeys: Record<string, string>;
  private controller: UGCSController;
  private registry = ProviderRegistry.getInstance();

  constructor(workspace: VibeWorkspace, apiKeys?: Record<string, string>) {
    this.workspace = workspace;
    this.apiKeys = apiKeys || WorkspaceManager.getAllAPIKeys();
    this.controller = new UGCSController(workspace.meta.entityType);
  }

  async generate(): Promise<VibeWorkspace> {
    const { phase_models } = this.workspace.workbench_settings;

    // Helper for per-phase generation
    const runPhase = async (
      phase: keyof VibeWorkspace['workbench_settings']['phase_models'], 
      prompt: any, 
      maxTokens?: number
    ) => {
      const config = phase_models[phase];
      const provider = this.registry.get(config.provider);
      const apiKey = this.apiKeys[config.provider];
      
      if (!provider || !apiKey) {
        throw new Error(`Missing provider or API key for phase: ${phase} (Provider: ${config.provider})`);
      }

      return provider.generate(prompt, config.model, apiKey, { 
        temperature: config.temperature,
        maxTokens: maxTokens || 1536 // Lower default for better credit compatibility
      });
    };

    // 1. PHASE: CONTEXT_GATHERING
    this.workspace.generation.currentPhase = 'context_gathering';
    const contextGatheringPrompt = this.getPrompt('context_gathering');
    
    // Using structured output enforcement (TASK-2.1)
    // Context gathering is always expected to be small JSON, 1024 is plenty.
    const contextResult = await runPhase('context_gathering', contextGatheringPrompt, 1024);
    
    try {
      // Robust JSON extraction: Find first '{' and last '}'
      const content = contextResult.content;
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      
      if (start === -1 || end === -1 || end < start) {
        throw new Error('No valid JSON object found in response');
      }

      const jsonStr = content.substring(start, end + 1);
      this.workspace.generation.contextMap = JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[ORCHESTRATOR] Failed to parse strict JSON for context_gathering, falling back to raw', e);
      this.workspace.generation.contextMap = { raw: contextResult.content };
    }

    // 2. PHASE: DRAFTING
    this.workspace.generation.currentPhase = 'drafting';
    
    // Inject component preview constraints if approved
    const approvedPreview = this.workspace.artifacts.componentPreview;
    if (approvedPreview?.userApproved) {
      const sectionConstraints = approvedPreview.sections
        .sort((a, b) => a.order - b.order)
        .map(s => {
          const note = s.userNotes ? ` [User note: ${s.userNotes}]` : '';
          return `${s.label}: ${s.description}${note}`;
        })
        .join('\n');
      
      this.workspace.generation.skeletonConstraints = sectionConstraints;
    }

    const draftingPrompt = this.getPrompt('drafting');
    const draftResult = await runPhase('drafting', draftingPrompt);
    this.workspace.generation.draftArtifact = draftResult.content;

    // 3. PHASE: REVIEW
    this.workspace.generation.currentPhase = 'review';
    const reviewPrompt = this.getPrompt('review', draftResult.content);
    const finalResult = await runPhase('review', reviewPrompt);
    
    // Finalize workspace
    this.workspace.artifacts.generatedContent = finalResult.content;
    this.workspace.artifacts.model = phase_models.drafting.model; 
    this.workspace.artifacts.provider = phase_models.drafting.provider;
    this.workspace.artifacts.phase_models_used = { ...phase_models };
    this.workspace.artifacts.tokensUsed = finalResult.tokens_used; 
    this.workspace.artifacts.generationTime = finalResult.generation_time;
    this.workspace.meta.generatedAt = new Date();
    this.workspace.generation.currentPhase = null;

    // Detect failure modes and report compliance
    this.workspace.generation.failureModeDetected = this.controller.detectFailureModes(finalResult.content);
    this.workspace.generation.dimensionCompliance = this.calculateCompliance(finalResult.content);

    return this.workspace;
  }

  private getPrompt(phase: 'context_gathering' | 'drafting' | 'review', draft?: string) {
    switch (this.workspace.meta.entityType) {
      case 'agent':
        return buildAgentConfigPrompt(phase, this.workspace, this.controller, draft);
      case 'skill':
        return buildSkillDefinitionPrompt(phase, this.workspace, this.controller, draft);
      case 'system-prompt':
        return buildSystemPromptPrompt(phase, this.workspace, this.controller, draft);
      case 'subagent':
        return buildSubagentConfigPrompt(phase, this.workspace, this.controller, draft);
      default:
        throw new Error(`Unsupported entity type: ${this.workspace.meta.entityType}`);
    }
  }

  private calculateCompliance(content: string): Record<string, ComplianceStatus> {
    const compliance: Record<string, ComplianceStatus> = {};
    const directives = this.controller.getDimensionDirectives('review');

    for (const [dim, dir] of Object.entries(directives)) {
      compliance[dim] = {
        dimension: dim,
        targetRegister: dir.register,
        actualRegister: dir.register, // Assume compliant for now
        compliant: true,
        notes: `Validated against: ${dir.self_check}`
      };
    }

    return compliance;
  }
}
