import * as React from 'react';
import { useState, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  Button,
  Badge,
  Textarea,
  Alert,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '../ui';
import { 
  SourceProvider, 
  ImportedBundle, 
  SkillFile, 
  ImportConflict,
  BundleInventoryItem
} from '../../types';
import { 
  detectImportMode, 
  splitBundle, 
  extractReferencedPaths,
  BundleParseError 
} from '../../lib/import/parsers/bundle-splitter';
import { normalizeBundle } from '../../lib/import/normalizer';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Box, 
  Terminal, 
  Sparkles, 
  Shield, 
  Check, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  Plus, 
  Info,
  FileCode,
  FileText,
  FileBadge,
  ArrowLeft
} from 'lucide-react';
import { cn } from '../../lib/utils';

type ImportStep = 'provider-select' | 'file-input' | 'preview';

interface ImportViewProps {
  initialProvider?: SourceProvider | null;
  onImportComplete: () => void;
  onBack: () => void;
}

export const ImportView: React.FC<ImportViewProps> = ({ initialProvider, onImportComplete, onBack }) => {
  const [step, setStep] = useState<ImportStep>(initialProvider ? 'file-input' : 'provider-select');
  const [provider, setProvider] = useState<SourceProvider | null>(initialProvider ?? null);
  const [bundle, setBundle] = useState<ImportedBundle | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const { updateWorkspace } = useWorkspace();

  const handleProviderSelect = (p: SourceProvider) => {
    setProvider(p);
    setStep('file-input');
  };

  const handleParsed = (newBundle: ImportedBundle) => {
    setBundle(newBundle);
    setStep('preview');
  };

  const handleImport = () => {
    if (!bundle) return;
    
    // Deep merge mapped workspace
    updateWorkspace(bundle.mapped_workspace);
    
    // Record provenance
    updateWorkspace({
      meta: {
        import_source: {
          provider: bundle.source_provider,
          original_files: bundle.files.map(f => ({ path: f.relative_path, role: f.role })),
          unmapped_fields: bundle.unmapped_fields,
          skipped_files: bundle.files
            .filter(f => f.is_binary || f.role === 'unknown')
            .map(f => ({ path: f.relative_path, reason: f.is_binary ? 'binary-asset' : 'unknown-role' })),
          partial_files: [] // Future refinement
        }
      } as any
    });

    onImportComplete();
  };

  const handleBack = () => {
    if (step === 'provider-select' || (step === 'file-input' && initialProvider)) {
      onBack();
    } else if (step === 'file-input') {
      setStep('provider-select');
    } else if (step === 'preview') {
      setStep('file-input');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center space-x-4 mb-8">
        <div className="h-10 w-1 pt-1 bg-mistral-orange shadow-[0_0_10px_rgba(255,90,31,0.5)]" />
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Import Skill Bundle</h1>
          <p className="text-sm text-text-dim font-mono">STEP {step === 'provider-select' ? '1' : step === 'file-input' ? '2' : '3'} OF 3</p>
        </div>
      </div>

      {step === 'provider-select' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ProviderCard 
            id="claude"
            title="Claude Code"
            description="Import from .claude/skills/ — SKILL.md, templates, scripts, examples"
            supported={['SKILL.md', 'CLAUDE.md', 'AGENTS.md']}
            hint=".claude/skills/<skill-name>/"
            icon={<Box className="text-orange-500" />}
            color="border-orange-500/20 hover:border-orange-500/50"
            onSelect={() => handleProviderSelect('claude-code')}
          />
          <ProviderCard 
            id="gemini"
            title="Gemini CLI"
            description="Import from .gemini/skills/ — SKILL.md with @file references"
            supported={['SKILL.md', 'GEMINI.md', 'AGENT.md', 'AGENTS.md']}
            hint=".gemini/skills/<skill-name>/"
            icon={<Sparkles className="text-blue-500" />}
            color="border-blue-500/20 hover:border-blue-500/50"
            onSelect={() => handleProviderSelect('gemini-cli')}
          />
          <ProviderCard 
            id="hermes"
            title="Hermes Agent"
            description="Import from ~/.hermes/skills/ — SKILL.md, SOUL.md, config.yaml"
            supported={['SKILL.md', 'SOUL.md', 'config.yaml']}
            hint="~/.hermes/skills/<cat>/<name>/"
            icon={<Shield className="text-purple-500" />}
            color="border-purple-500/20 hover:border-purple-500/50"
            onSelect={() => handleProviderSelect('hermes-agent')}
          />
        </div>
      )}

      {step === 'file-input' && provider && (
        <FileInputStep 
          provider={provider} 
          onParsed={handleParsed} 
          onBack={handleBack} 
        />
      )}

      {step === 'preview' && bundle && (
        <PreviewStep 
          bundle={bundle} 
          onConfirm={handleImport} 
          onBack={handleBack} 
        />
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

interface ProviderCardProps {
  id: string;
  title: string;
  description: string;
  supported: string[];
  hint: string;
  icon: React.ReactNode;
  color: string;
  onSelect: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ title, description, supported, hint, icon, color, onSelect }) => (
  <Card 
    className={cn("cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] h-full flex flex-col", color)}
    onClick={onSelect}
  >
    <CardHeader>
      <div className="h-12 w-12 rounded-lg bg-bg-elevated border border-[#28282b] flex items-center justify-center mb-4">
        {icon}
      </div>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex-1">
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2">Supported Files</p>
          <div className="flex flex-wrap gap-2">
            {supported.map(f => (
              <Badge key={f} variant="secondary" className="font-mono text-[10px]">{f}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2">Directory Structure</p>
          <code className="text-[11px] text-orange-400 bg-black/40 p-2 rounded block break-all font-mono">
            {hint}
          </code>
        </div>
      </div>
    </CardContent>
    <CardFooter>
      <Button variant="ghost" className="w-full justify-between pr-2 text-text-main group">
        SELECT PROVIDER
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </CardFooter>
  </Card>
);

const FileInputStep: React.FC<{ provider: SourceProvider; onParsed: (bundle: ImportedBundle) => void; onBack: () => void }> = ({ provider, onParsed, onBack }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<Array<{ path: string; content: string }>>([]);
  const [activeMissingPath, setActiveMissingPath] = useState<string | null>(null);

  const mode = useMemo(() => {
    if (!content.trim()) return null;
    return detectImportMode(content);
  }, [content]);

  const missingPaths = useMemo(() => {
    if (mode !== 'paste-single' || !content.trim()) return [];
    // Extract body (assuming standard format or use splitter helper)
    // For simplicity, we just use extractReferencedPaths on the whole thing if single
    return extractReferencedPaths(content);
  }, [content, mode]);

  const nextMissingPath = missingPaths.find(p => !additionalFiles.some(af => af.path === p));

  const handleParse = () => {
    try {
      setError(null);
      let fullText = content;
      for (const af of additionalFiles) {
        fullText += `\n--- ${af.path} ---\n${af.content}`;
      }
      
      const files = splitBundle(fullText);
      const entrypoint = files[0];
      
      // Simple frontmatter/body split for normalization input
      // In a real app, we'd reuse lib logic
      const bundle = normalizeBundle({
        provider,
        files,
        raw_frontmatter: {}, // Normalizer will re-parse
        body_text: entrypoint.content,
        missing_references: [] // Normalizer will detect
      });

      onParsed(bundle);
    } catch (e) {
      if (e instanceof BundleParseError) setError(e.message);
      else setError('An unexpected error occurred during parsing.');
    }
  };

  const addFile = (path: string, fileContent: string) => {
    setAdditionalFiles([...additionalFiles, { path, content: fileContent }]);
    setActiveMissingPath(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="pl-0 text-text-dim hover:text-text-main">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Provider Selection
        </Button>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-bg-elevated border-[#28282b]">
            PROVIDER: {provider.toUpperCase()}
          </Badge>
          {mode && (
            <Badge variant="success" className="animate-pulse">
              ● {mode === 'paste-multi' ? 'Multi-file bundle detected' : 'Single SKILL.md detected'}
            </Badge>
          )}
        </div>
      </div>

      <Card className="border-mistral-orange/20">
        <CardHeader>
          <CardTitle>Paste your skill bundle</CardTitle>
          <CardDescription>Copy the contents of your skill directory. Use context files (CLAUDE.md, GEMINI.md, SOUL.md) to import as system prompts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="--- SKILL.md ---
name: my-skill
...
"
            className="min-h-[400px] text-[13px] font-mono leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {error && (
            <Alert variant="destructive" className="animate-in head-shake duration-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Parse Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {additionalFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Additional Files Added</p>
              <div className="flex flex-wrap gap-2">
                {additionalFiles.map(f => (
                  <Badge key={f.path} variant="outline" className="font-mono text-[10px] flex items-center pr-1">
                    {f.path}
                    <button 
                      className="ml-1 hover:text-destructive" 
                      onClick={() => setAdditionalFiles(additionalFiles.filter(x => x.path !== f.path))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {mode === 'paste-single' && nextMissingPath && !activeMissingPath && (
            <Button 
              variant="outline" 
              className="w-full border-dashed border-text-dim/30 text-text-dim hover:border-mistral-orange/50 hover:text-mistral-orange"
              onClick={() => setActiveMissingPath(nextMissingPath)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add referenced file: {nextMissingPath}
            </Button>
          )}

          {activeMissingPath && (
            <div className="space-y-2 p-4 rounded-lg bg-bg-elevated border border-[#28282b] animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-main font-mono">{activeMissingPath}</span>
                <Button variant="ghost" size="sm" onClick={() => setActiveMissingPath(null)}><X className="h-3 w-3" /></Button>
              </div>
              <Textarea 
                placeholder={`Paste content for ${activeMissingPath}...`}
                className="min-h-[150px] font-mono text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    addFile(activeMissingPath, (e.target as HTMLTextAreaElement).value);
                  }
                }}
                autoFocus
              />
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-text-dim font-mono italic">Press Ctrl+Enter to save</p>
                <Button size="sm" onClick={(e) => {
                  const ta = (e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement);
                  addFile(activeMissingPath, ta.value);
                }}>Add File</Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between border-t border-[#28282b] pt-6">
          <p className="text-xs text-text-dim italic">Delimiter format: --- filename --- followed by content</p>
          <Button 
            disabled={!content.trim()} 
            onClick={handleParse}
            className="w-48"
          >
            PARSE BUNDLE
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const PreviewStep: React.FC<{ bundle: ImportedBundle; onConfirm: () => void; onBack: () => void }> = ({ bundle, onConfirm, onBack }) => {
  const [resolutions, setResolutions] = useState<Record<string, 'accepted' | 'dismissed'>>({});
  const [openItems, setOpenItems] = useState<string[]>([]);

  const confidenceColor = bundle.confidence >= 0.8 ? 'success' : bundle.confidence >= 0.5 ? 'warning' : 'destructive';
  
  const mappedRows = useMemo(() => {
    const rows: Array<{ field: string; val: any; dest: string; status: 'mapped' | 'advisory' | 'skipped' }> = [];
    const fm = bundle.raw_frontmatter;
    
    if (bundle.detected_entity_type === 'skill') {
      rows.push({ field: 'name', val: fm.name || '(from dir)', dest: 'skill_name', status: 'mapped' });
      rows.push({ field: 'description', val: fm.description || 'MISSING', dest: 'skill_description', status: fm.description ? 'mapped' : 'advisory' });
      const tools = bundle.mapped_workspace?.skillDefinition?.allowed_tools || [];
      rows.push({ field: 'allowed-tools', val: tools.join(', ') || 'NONE', dest: 'allowed_tools', status: 'mapped' });
    } else {
      rows.push({ field: 'SOUL.md', val: 'Agent Identity', dest: 'prompt_purpose', status: 'mapped' });
    }

    return rows;
  }, [bundle]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="pl-0 text-text-dim hover:text-text-main">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Edit Parsed Files
        </Button>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">Mapping Confidence</p>
            <Badge variant={confidenceColor} className="text-sm px-3 py-1 mt-1">
              {Math.round(bundle.confidence * 100)}% Match
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PANEL A: Mapped Fields */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Check className="mr-2 h-5 w-5 text-green-500" />
              Mapped Fields
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mappedRows.map(row => (
                <div key={row.field} className="group p-3 rounded bg-bg-elevated border border-[#28282b] hover:border-text-dim/20 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-widest">{row.field}</span>
                    <Badge variant={row.status === 'mapped' ? 'success' : row.status === 'advisory' ? 'warning' : 'destructive'} className="text-[9px] h-4">
                      {row.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-main font-medium truncate mb-2">{String(row.val)}</p>
                  <div className="flex items-center text-[10px] text-text-dim">
                    <ArrowLeft className="h-2.5 w-2.5 mr-1" />
                    <span className="font-mono text-orange-400">{row.dest}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PANEL B: Bundle Inventory */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <FileCode className="mr-2 h-5 w-5 text-blue-500" />
              Bundle Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-2">
              {bundle.files.map((file, idx) => (
                <div key={file.relative_path} className="rounded border border-[#28282b] bg-bg-elevated overflow-hidden">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {file.role === 'entrypoint' ? <FileBadge className="h-4 w-4 text-orange-500 shrink-0" /> : 
                       file.role === 'script' ? <Terminal className="h-4 w-4 text-green-500 shrink-0" /> :
                       <FileText className="h-4 w-4 text-text-dim shrink-0" />}
                      <div className="overflow-hidden">
                        <p className="text-xs font-mono text-text-main truncate">{file.relative_path}</p>
                        <p className="text-[10px] text-text-dim">{file.role.toUpperCase()}</p>
                      </div>
                    </div>
                    <Badge variant={file.is_binary ? 'destructive' : 'secondary'} className="text-[8px]">
                      {file.is_binary ? 'SKIPPED' : 'IMPORTED'}
                    </Badge>
                  </div>
                  {file.role === 'script' && (
                    <div className="px-3 pb-3 border-t border-white/5 pt-2">
                      <div className="bg-black/30 rounded p-2 text-[10px] font-mono text-green-400/80 leading-relaxed border border-green-500/10">
                        {/* Mocking advisory for scripts as it was generated in lib */}
                        Advisory: Runs {file.relative_path.split('/').pop()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PANEL C: Missing References */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {bundle.missing_references.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3 flex items-center">
                  <X className="mr-1 h-3 w-3" /> Missing References ({bundle.missing_references.length})
                </p>
                <div className="space-y-2">
                  {bundle.missing_references.map(ref => (
                    <div key={ref} className="text-[11px] font-mono p-2 rounded bg-amber-500/5 border border-amber-500/10 text-amber-200/70">
                      ⚠️ {ref}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-3">Import Warnings</p>
              <Accordion>
                {bundle.import_warnings.map((warning, i) => (
                  <AccordionItem key={i} className="border-t">
                    <AccordionTrigger isOpen={openItems.includes(`w-${i}`)} onClick={() => toggleItem(`w-${i}`)}>
                      <span className="text-[11px] text-left pr-4">{warning.split(' — ')[0].substring(0, 40)}...</span>
                    </AccordionTrigger>
                    <AccordionContent isOpen={openItems.includes(`w-${i}`)}>
                      <p className="text-xs text-text-dim font-mono leading-relaxed">{warning}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </CardContent>
        </Card>
      </div>

      {bundle.conflicts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-main uppercase tracking-widest border-t border-[#28282b] pt-8">Conflicts Requiring Resolution</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundle.conflicts.map((conflict, idx) => (
              <ConflictCard 
                key={idx} 
                conflict={conflict} 
                resolution={resolutions[conflict.field_name] || 'pending'}
                onResolve={(res) => setResolutions({...resolutions, [conflict.field_name]: res})} 
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between border-t border-[#28282b] pt-8 gap-4">
        <Button variant="link" onClick={() => window.location.reload()} className="text-text-dim hover:text-text-main pl-0">
          Start Fresh Instead
        </Button>
        <div className="flex items-center space-x-4">
          <p className="text-xs text-text-dim text-right hidden md:block">
            Found {bundle.files.length} files. {bundle.conflicts.length} conflicts.
          </p>
          <Button size="lg" onClick={onConfirm} className="w-full md:w-64">
            IMPORT & CONTINUE
          </Button>
        </div>
      </div>
    </div>
  );
};

const ConflictCard: React.FC<{ conflict: ImportConflict; resolution: 'pending' | 'accepted' | 'dismissed'; onResolve: (res: 'accepted' | 'dismissed') => void }> = ({ conflict, resolution, onResolve }) => (
  <Card className={cn("border-l-4", 
    resolution === 'accepted' ? "border-l-green-500 bg-green-500/5" : 
    resolution === 'dismissed' ? "border-l-text-dim/20 opacity-60" : "border-l-amber-500 bg-amber-500/5"
  )}>
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start">
        <CardTitle className="text-sm font-mono text-orange-400">{conflict.field_name}</CardTitle>
        <Badge variant={resolution === 'pending' ? 'warning' : 'secondary'} className="text-[9px] uppercase tracking-tighter">
          {resolution}
        </Badge>
      </div>
      <CardDescription className="text-xs normal-case font-sans mt-2">{conflict.reason}</CardDescription>
    </CardHeader>
    <CardContent className="pb-2">
      <div className="text-[11px] p-2 rounded bg-black/40 font-mono text-text-main border border-white/5 break-all max-h-24 overflow-y-auto">
        Source: {String(conflict.source_value)}
      </div>
      <div className="flex items-center mt-3 text-[10px] text-text-dim italic">
        <Info className="h-3 w-3 mr-1 text-blue-400" />
        {conflict.suggested_action}
      </div>
    </CardContent>
    <CardFooter className="flex justify-end space-x-2 pt-0">
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn("text-[10px] h-7", resolution === 'dismissed' && "text-text-main")}
        onClick={() => onResolve('dismissed')}
      >
        DISMISS
      </Button>
      <Button 
        variant={resolution === 'accepted' ? "secondary" : "outline"} 
        size="sm" 
        className="text-[10px] h-7"
        onClick={() => onResolve('accepted')}
      >
        {resolution === 'accepted' ? <Check className="h-3 w-3 mr-1" /> : null}
        ACCEPT
      </Button>
    </CardFooter>
  </Card>
);
