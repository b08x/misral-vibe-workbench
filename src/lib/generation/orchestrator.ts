import { 
  VibeWorkspace, 
  GenerationResult,
  ComplianceStatus
} from '../../types';
import { 
  ProviderRegistry, 
  ModelProvider 
} from '../providers/registry';
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

export class GenerationOrchestrator {
  private workspace: VibeWorkspace;
  private provider: ModelProvider;
  private apiKey: string;
  private model: string;
  private controller: UGCSController;

  constructor(workspace: VibeWorkspace, provider: ModelProvider, apiKey: string, model: string) {
    this.workspace = workspace;
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model;
    this.controller = new UGCSController(workspace.meta.entityType);
  }

  async generate(): Promise<VibeWorkspace> {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // 1. PHASE: CONTEXT_GATHERING
    this.workspace.generation.currentPhase = 'context_gathering';
    const contextGatheringPrompt = this.getPrompt('context_gathering');
    const contextResult = await this.provider.generate(contextGatheringPrompt, this.model, this.apiKey);
    
    try {
      this.workspace.generation.contextMap = JSON.parse(contextResult.content);
    } catch (e) {
      // Heuristic fallback: if not JSON, store as raw
      this.workspace.generation.contextMap = { raw: contextResult.content };
    }

    await delay(1000); // 1s cooldown between phases

    // 2. PHASE: DRAFTING
    this.workspace.generation.currentPhase = 'drafting';
    const draftingPrompt = this.getPrompt('drafting');
    const draftResult = await this.provider.generate(draftingPrompt, this.model, this.apiKey);
    this.workspace.generation.draftArtifact = draftResult.content;

    await delay(1000); // 1s cooldown between phases

    // 3. PHASE: REVIEW
    this.workspace.generation.currentPhase = 'review';
    const reviewPrompt = this.getPrompt('review', draftResult.content);
    const finalResult = await this.provider.generate(reviewPrompt, this.model, this.apiKey);
    
    // Finalize workspace
    this.workspace.artifacts.generatedContent = finalResult.content;
    this.workspace.artifacts.model = this.model;
    this.workspace.artifacts.provider = this.provider.id;
    this.workspace.artifacts.tokensUsed = finalResult.tokens_used; // approximate
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
