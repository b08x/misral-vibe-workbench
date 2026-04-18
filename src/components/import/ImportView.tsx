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
  AccordionContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
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
  extractFrontmatter,
  extractZipBundle,
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
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  BookOpen,
  GitBranch,
  Upload,
  File
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

  // ZIP State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipInventory, setZipInventory] = useState<SkillFile[] | null>(null);

  const mode = useMemo(() => {
    if (!content.trim()) return null;
    return detectImportMode(content);
  }, [content]);

  const missingPaths = useMemo(() => {
    if (mode !== 'paste-single' || !content.trim()) return [];
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
      const { frontmatter, body } = extractFrontmatter(entrypoint.content);
      
      const bundle = normalizeBundle({
        provider,
        files,
        raw_frontmatter: frontmatter,
        body_text: body,
        missing_references: [] 
      });

      onParsed(bundle);
    } catch (e) {
      if (e instanceof BundleParseError) setError(e.message);
      else setError('An unexpected error occurred during parsing.');
    }
  };

  const handleZipSelect = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setZipError('Only .zip files are supported');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setZipError('File exceeds 10MB limit');
      return;
    }
    setZipLoading(true);
    setZipError(null);
    setZipInventory(null);
    try {
      const files = await extractZipBundle(file);
      setZipInventory(files);
      setZipFile(file);
    } catch (e) {
      if (e instanceof BundleParseError) setZipError(e.message);
      else setZipError('Failed to read zip file');
    } finally {
      setZipLoading(false);
    }
  };

  const handleParseZip = () => {
    if (!zipInventory || !provider) return;
    try {
      const entrypoint = zipInventory.find(f => f.role === 'entrypoint')!;
      const { frontmatter, body } = extractFrontmatter(entrypoint.content);
      const bundle = normalizeBundle({
        provider,
        files: zipInventory,
        raw_frontmatter: frontmatter,
        body_text: body,
        missing_references: []
      });
      onParsed(bundle);
    } catch (e) {
      setZipError('Failed to process bundle');
    }
  };

  const addFile = (path: string, fileContent: string) => {
    setAdditionalFiles([...additionalFiles, { path, content: fileContent }]);
    setActiveMissingPath(null);
  };

  const getFileIcon = (role: string, isBinary: boolean) => {
    if (isBinary) return <ImageIcon className="h-4 w-4 text-destructive" />;
    switch (role) {
      case 'entrypoint': return <FileCode className="h-4 w-4 text-orange-500" />;
      case 'reference': return <FileText className="h-4 w-4 text-blue-400" />;
      case 'template': return <FileBadge className="h-4 w-4 text-purple-400" />;
      case 'script': return <Terminal className="h-4 w-4 text-green-400" />;
      case 'example': return <BookOpen className="h-4 w-4 text-amber-400" />;
      case 'workflow': return <GitBranch className="h-4 w-4 text-indigo-400" />;
      case 'asset': return <ImageIcon className="h-4 w-4 text-text-dim" />;
      default: return <File className="h-4 w-4 text-text-dim" />;
    }
  };

  const zipSummary = useMemo(() => {
    if (!zipInventory) return null;
    const total = zipInventory.length;
    const skipped = zipInventory.filter(f => f.is_binary || f.role === 'unknown').length;
    const needsReview = zipInventory.filter(f => f.role === 'script').length;
    return `${total} files ready · ${skipped} files skipped · ${needsReview} files need review`;
  }, [zipInventory]);

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
              ● {mode === 'paste-multi' ? 'Multi-file bundle' : 'Single SKILL.md'}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="paste" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="paste">Paste Text</TabsTrigger>
          <TabsTrigger value="zip">Upload ZIP</TabsTrigger>
        </TabsList>

        <TabsContent value="paste">
          <Card className="border-mistral-orange/20">
            <CardHeader>
              <CardTitle>Paste your skill bundle</CardTitle>
              <CardDescription>Copy the contents of your skill directory using the delimiter format or a single SKILL.md file.</CardDescription>
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
        </TabsContent>

        <TabsContent value="zip">
          <Card className="border-mistral-orange/20">
            <CardHeader>
              <CardTitle>Upload skill bundle ZIP</CardTitle>
              <CardDescription>Upload a .zip archive containing your skill files. SKILL.md must be at the root or one folder deep.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!zipInventory && !zipLoading && (
                <div 
                  className={cn(
                    "relative border-2 border-dashed border-[#28282b] rounded-xl p-12 flex flex-col items-center justify-center transition-all hover:bg-bg-elevated hover:border-mistral-orange/30 group",
                    zipError && "border-destructive/50 bg-destructive/5"
                  )}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleZipSelect(file);
                  }}
                  onClick={() => document.getElementById('zip-upload')?.click()}
                >
                  <input 
                    id="zip-upload"
                    type="file" 
                    accept=".zip" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleZipSelect(file);
                    }}
                  />
                  <div className="h-16 w-16 rounded-full bg-bg-elevated border border-[#28282b] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="h-8 w-8 text-mistral-orange" />
                  </div>
                  <h3 className="text-lg font-bold text-text-main mb-2">Drop .zip here or click to browse</h3>
                  <p className="text-sm text-text-dim">Accepts .zip files up to 10MB</p>
                </div>
              )}

              {zipLoading && (
                <div className="flex flex-col items-center justify-center p-12 bg-bg-elevated rounded-xl border border-[#28282b]">
                  <Loader2 className="h-10 w-10 text-mistral-orange animate-spin mb-4" />
                  <p className="text-sm text-text-main font-mono">Extracting zip bundle...</p>
                </div>
              )}

              {zipError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Extraction Error</AlertTitle>
                  <AlertDescription>{zipError}</AlertDescription>
                </Alert>
              )}

              {zipInventory && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">Extracted Contents</h3>
                    <Button variant="ghost" size="sm" onClick={() => { setZipInventory(null); setZipFile(null); }} className="h-7 text-[10px]">
                      CHANGE FILE
                    </Button>
                  </div>
                  
                  <div className="border border-[#28282b] rounded-md overflow-hidden bg-black/20">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-bg-elevated border-b border-[#28282b]">
                          <th className="p-3 font-bold text-text-dim tracking-widest uppercase text-[9px]">File Path</th>
                          <th className="p-3 font-bold text-text-dim tracking-widest uppercase text-[9px]">Role</th>
                          <th className="p-3 font-bold text-text-dim tracking-widest uppercase text-[9px]">Size</th>
                          <th className="p-3 font-bold text-text-dim tracking-widest uppercase text-[9px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {zipInventory.map((f) => (
                          <tr key={f.relative_path} className="border-b border-[#28282b]/50 hover:bg-white/5 transition-colors">
                            <td className="p-3 flex items-center space-x-2">
                              {getFileIcon(f.role, f.is_binary)}
                              <span className="truncate max-w-[200px]">{f.relative_path}</span>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-5">
                                {f.role}
                              </Badge>
                            </td>
                            <td className="p-3 text-text-dim">
                              {f.is_binary ? '—' : `${f.size_chars.toLocaleString()} chars`}
                            </td>
                            <td className="p-3">
                              {f.role === 'entrypoint' ? <span className="text-green-500">✅</span> :
                               f.is_binary ? <span className="text-destructive flex items-center" title="Binary skipped">❌ skipped</span> :
                               f.role === 'script' ? <span className="text-amber-500 flex items-center" title="Review required">⚠️ review</span> :
                               f.role === 'unknown' ? <span className="text-amber-500 flex items-center" title="Unknown type">⚠️ unknown</span> :
                               <span className="text-green-500">✅</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-text-dim italic font-mono">{zipSummary}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-end border-t border-[#28282b] pt-6 gap-4">
              <Button 
                disabled={!zipInventory} 
                onClick={handleParseZip}
                className="w-64"
              >
                IMPORT ZIP BUNDLE
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
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
