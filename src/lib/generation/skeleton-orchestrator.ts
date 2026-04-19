import { VibeWorkspace, ComponentPreview, PreviewSection } from '../../types';
import { ModelProvider } from '../providers/registry';
import { UGCSController } from './ugcs-controller';
import { buildSkeletonPrompt } from './skeleton-prompt-builder';

/**
 * SkeletonGenerationError: Thrown when the response cannot be parsed as a ComponentPreview.
 */
export class SkeletonGenerationError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string
  ) {
    super(message);
    this.name = 'SkeletonGenerationError';
  }
}

/**
 * SkeletonOrchestrator: Manages the pre-generation skeleton plan call.
 * Uses the drafting model configuration as the most capable model for structural planning.
 */
export class SkeletonOrchestrator {
  private controller: UGCSController;

  constructor(
    private workspace: VibeWorkspace,
    private provider: ModelProvider,
    private apiKey: string
  ) {
    this.controller = new UGCSController(workspace.meta.entityType);
  }

  /**
   * Generates the skeleton plan.
   * Returns a ComponentPreview object with stable IDs assigned to all sections.
   */
  async generate(): Promise<ComponentPreview> {
    const prompt = buildSkeletonPrompt(this.workspace, this.controller);
    const modelConfig = this.workspace.workbench_settings.phase_models.drafting;

    const result = await this.provider.generate(
      prompt,
      modelConfig.model,
      this.apiKey,
      { temperature: modelConfig.temperature }
    );

    let preview: ComponentPreview;
    try {
      // Clean up potential markdown blocks if the model ignored system prompts
      const cleaned = result.content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      preview = JSON.parse(cleaned);
    } catch (e) {
      throw new SkeletonGenerationError(
        'Failed to parse skeleton plan as valid JSON.',
        result.content
      );
    }

    // Validate structure (basic check)
    if (!preview.sections || !Array.isArray(preview.sections)) {
      throw new SkeletonGenerationError(
        'Skeleton plan is missing the "sections" array.',
        result.content
      );
    }

    // Assign stable IDs to all sections and ensure order is set
    preview.sections = preview.sections.map((section, index) => {
      let id = section.id;
      if (!id) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          id = crypto.randomUUID();
        } else {
          id = `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
      }
      
      return {
        ...section,
        id,
        order: typeof section.order === 'number' ? section.order : index,
        editable: typeof section.editable === 'boolean' ? section.editable : true
      };
    });

    // Sort by order initially
    preview.sections.sort((a, b) => a.order - b.order);

    return {
      ...preview,
      entityType: this.workspace.meta.entityType,
      outputFormat: this.workspace.meta.outputFormat,
      generatedAt: new Date(),
      userApproved: false
    };
  }
}
