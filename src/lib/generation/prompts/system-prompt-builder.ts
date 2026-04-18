import { 
  VibeWorkspace, 
  GenerationPrompt 
} from '../../../types';
import { 
  UGCSController 
} from '../ugcs-controller';

export function buildSystemPromptPrompt(
  phase: 'context_gathering' | 'drafting' | 'review',
  workspace: VibeWorkspace,
  controller: UGCSController,
  draft?: string
): GenerationPrompt {
  const dimensionDirectives = controller.buildDimensionPrompt(phase);

  if (phase === 'context_gathering') {
    return {
      system: `You are performing the CONTEXT_GATHERING phase for a mistral-vibe system prompt and prompt template configuration.

PURPOSE: Catalog all requirements needed to generate both the TOML metadata block and the markdown body sections. Do not synthesize or speculate.

${dimensionDirectives}

CATALOG GOALS:

1. PROMPT METADATA
   - prompt name (kebab-case string)
   - version string (default "1.0.0")
   - description (one sentence, what this prompt does)
   - category: one of extraction | analysis | generation | classification | transformation | validation

2. GENERATION PARAMETERS
   - temperature (float, default 0.5 for constrained generation)
   - max_tokens (integer)
   - top_p (float, default 1.0)
   - stop_sequences (array of strings, often empty)

3. VARIABLE DEFINITIONS
   For each placeholder the user wants in their template:
   - variable name (snake_case)
   - type: string | array | boolean | integer
   - description of what it holds
   Note: These will become both [prompt.variables] keys AND {{variable_name}} references in the body.

4. SYSTEM ROLE & OBJECTIVE
   - specialized_role: what expert persona the prompt adopts
   - primary_objective: the core task in one sentence
   - constraints: behavioral guardrails (list)
   - output_instruction: how the response should be structured

5. TEMPLATE BODY STRUCTURE
   - What goes in ## Context (background information)
   - What goes in ## Request (the user's task statement)
   - What goes in ## Inputs (the data/content to process)

6. FEW-SHOT EXAMPLES
   - For each example pair: actual input text + desired output text
   - If user provided none: record "examples: none"
   - Do NOT invent examples

7. VALIDATION RULES
   - required variables (array of variable names)
   - per-variable regex checks if the user specified constraints
   - error messages for validation failures

CRITICAL: Record "NOT_SPECIFIED" for any field the user did not address. Do not fill gaps with invented content.`,
      
      user: `ENTITY TYPE: system-prompt
USER ANSWERS:
${JSON.stringify(workspace.session.answers, null, 2)}

Catalog all requirements following the 7-goal structure above. Output as structured JSON with keys matching each goal section.`
    };
  }

  if (phase === 'drafting') {
    const skeletonPrompt = workspace.generation.skeletonConstraints 
      ? `\nSTRUCTURAL CONSTRAINTS (user-approved component plan — follow exactly):\n${workspace.generation.skeletonConstraints}\n\nGenerate the artifact with this exact section structure. Do not add, remove, or reorder sections.\n`
      : '';

    return {
      system: `You are generating a mistral-vibe prompt template during the DRAFTING phase.
The output is a hybrid TOML + Markdown document following prompt-template.md schema exactly.
${skeletonPrompt}
PURPOSE: Synthesize the cataloged context into a complete, valid hybrid artifact.

${dimensionDirectives}

STRUCTURAL SCHEMA — follow this section order and syntax exactly:

═══════════════════════════════════════
PART 1 — TOML CONFIGURATION BLOCK
(emit before any markdown)
═══════════════════════════════════════

[prompt]
name = "<kebab-case-name>"          # From catalog: prompt name
version = "<semver>"                # Default "1.0.0"
description = "<string>"           # One-sentence purpose
category = "<enum>"                 # extraction|analysis|generation|classification|transformation|validation

[prompt.parameters]
temperature = <float>               # From catalog, default 0.5
max_tokens = <int>                  # From catalog
top_p = <float>                     # Default 1.0
stop_sequences = [<strings>]        # Empty array if NOT_SPECIFIED

[prompt.variables]
# Declare each variable as: variable_name = "type description"
# Types: string | array | boolean | integer
{{for each variable in catalog.variable_definitions}}
<variable_name> = "<type>"

═══════════════════════════════════════
PART 2 — SYSTEM MESSAGE (Markdown)
═══════════════════════════════════════

\`\`\`markdown
# System Message

You are a {{specialized_role}}. Your task is to {{primary_objective}}.

## Constraints
{{for each constraint in catalog}}
- <constraint>

## Output Format
{{output_instruction}}
\`\`\`

═══════════════════════════════════════
PART 3 — TEMPLATE BODY (Markdown)
═══════════════════════════════════════

\`\`\`markdown
# Template Body

## Context
{{context_data}}

## Request
{{user_request}}

## Inputs
{{input_data}}

# Result:
\`\`\`

(Note: variable references in markdown must use {{double_braces}} syntax. All {{variable_name}} tokens must correspond to keys in [prompt.variables].)

═══════════════════════════════════════
PART 4 — FEW-SHOT EXAMPLES (TOML)
CONDITIONAL: Omit entire section if catalog says "examples: none"
═══════════════════════════════════════

[[examples]]
input = "<actual input text from catalog>"
output = "<actual desired output from catalog>"

# Repeat [[examples]] block for each example pair.
# Do NOT generate placeholder or invented examples.

═══════════════════════════════════════
PART 5 — VALIDATION RULES (TOML)
═══════════════════════════════════════

[validation]
required = ["<var_name>", ...]      # Variables that must be provided

[[validation.checks]]
variable = "<var_name>"
regex = "<valid_regex>"
message = "<error message if check fails>"

# Repeat [[validation.checks]] for each check in catalog.
# If catalog has no validation checks: emit [validation] with required array only.

EMIT RULES:
- Emit TOML sections without markdown code fences.
- Emit the Markdown body sections inside \`\`\`markdown ... \`\`\` fences.
- Variable references in markdown body: {{double_brace}} syntax.
- TOML variable declarations in [prompt.variables]: snake_case keys only.
- No explanations outside of # comments in TOML sections.
- Comments in TOML: factual and descriptive only. No metaphors.`,
      
      user: `CONTEXT CATALOG:
${JSON.stringify(workspace.generation.contextMap, null, 2)}

Generate the complete prompt template artifact now.`
    };
  }

  // Review phase
  return {
    system: `You are performing the REVIEW phase for a generated mistral-vibe prompt template.
The artifact is a hybrid TOML + Markdown document.

PURPOSE: Validate both the TOML metadata and the Markdown body. Audit variable consistency across sections. Return corrected artifact or original verbatim.

${dimensionDirectives}

VALIDATION CHECKLIST:

TOML SYNTAX:
  [ ] All TOML blocks parse without errors
  [ ] [prompt].name is kebab-case (no spaces, no underscores)
  [ ] [prompt].version is valid semver (e.g. "1.0.0")
  [ ] [prompt].category is one of: extraction|analysis|generation|classification|transformation|validation
  [ ] [prompt.parameters].temperature is float between 0.0 and 2.0
  [ ] [prompt.parameters].stop_sequences is an array
  [ ] All [[examples]] blocks have both "input" and "output" string fields
  [ ] All [[validation.checks]] have: variable, regex, message

VARIABLE CONSISTENCY AUDIT — CRITICAL:
  [ ] List all keys in [prompt.variables]
  [ ] List all {{variable}} references in the markdown body
  [ ] Every {{reference}} in the body exists as a key in [prompt.variables]
  [ ] Every key in [prompt.variables] is referenced at least once in the body
  [ ] [validation].required array contains only names from [prompt.variables]
  [ ] [[validation.checks]].variable values are all in [prompt.variables]

MARKDOWN BODY:
  [ ] ## System Message section is present
  [ ] ## Constraints section is present (even if one item)
  [ ] ## Output Format section is present
  [ ] ## Template Body contains ## Context, ## Request, ## Inputs subsections
  [ ] "# Result:" marker is present at end of Template Body

DIMENSION COMPLIANCE:
  [ ] Abstraction Level: TOML blocks concrete literals; markdown body moderate synthesis
  [ ] Novelty Injection: variable types are only string|array|boolean|integer
  [ ] Constraint Adherence: all validation rules satisfied

SRE FAILURE MODE SCAN:
  [ ] Manifesto Drift: does the ## System Message perform rather than specify? (Flag if it contains more than one analogy per expertise claim)
  [ ] Split-Brain: are there conflicting role definitions across System Message sections?
  [ ] Self-Commentary: does the template describe itself rather than the task?

IF ANY ITEM IS FAIL:
  Correct the artifact. Return the complete corrected document.

IF ALL ITEMS ARE PASS:
  Return the original content verbatim.

Do NOT explain what you checked. Output ONLY the artifact content.`,
    
    user: `DRAFT ARTIFACT:
${draft}

USER REQUIREMENTS:
${JSON.stringify(workspace.session.answers, null, 2)}

Perform the review and return the final content.`
  };
}
