import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useSkeletonGeneration } from '../../hooks/useSkeletonGeneration';
import { 
  Card, CardContent, CardHeader, CardTitle, 
  Button, Input, Alert, AlertTitle, AlertDescription 
} from '../ui';
import { 
  FileText, Layout, Activity, Hash, AlertCircle, 
  Plus, Trash2, GripVertical, ArrowLeft, Zap, 
  Loader2, CheckCircle2, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { PreviewSection } from '../../types';

export const ComponentPreviewView: React.FC = () => {
  const { workspace, updateWorkspace } = useWorkspace();
  const { 
    isGenerating, error, rawResponse, preview, retry, 
    updateSection, removeSection, reorderSections, addSection, approveAndProceed 
  } = useSkeletonGeneration();

  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const goBack = () => {
    updateWorkspace({ meta: (prev: any) => ({ ...prev, status: 'generation-config' }) });
  };

  if (isGenerating) {
    return (
      <div className="max-w-3xl mx-auto py-24 flex flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-mistral-orange/20 blur-3xl rounded-full scale-150 animate-pulse" />
          <Loader2 className="w-16 h-16 text-mistral-orange animate-spin relative" />
        </div>
        <h2 className="text-2xl font-bold mb-2 tracking-tight uppercase">Architecting Component Plan...</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          The skeleton call uses your configured drafting model to map sections, dimensions, and register choices.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6">
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Skeleton Generation Failed</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>

        {rawResponse && (
          <details className="mb-8 bg-bg-deep border border-red-500/20 rounded p-4 text-[10px] font-mono">
            <summary className="cursor-pointer text-red-400 uppercase font-bold mb-2">View Raw LLM Response</summary>
            <pre className="whitespace-pre-wrap opacity-70">{rawResponse}</pre>
          </details>
        )}

        <div className="flex gap-4">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Config
          </Button>
          <Button onClick={retry} className="flex-1">
            <Zap className="w-4 h-4 mr-2" /> Retry Planning
          </Button>
          <Button variant="ghost" onClick={() => updateWorkspace({ meta: (prev: any) => ({ ...prev, status: 'generating' }) })} className="text-muted-foreground">
            Skip & Generate Anyway
          </Button>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('sourceIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'));
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const sections = [...preview.sections];
    const [moved] = sections.splice(sourceIndex, 1);
    sections.splice(targetIndex, 0, moved);
    
    reorderSections(sections.map(s => s.id));
  };

  const getTokenColor = (tokens: number) => {
    if (tokens < 800) return 'bg-emerald-500';
    if (tokens < 1500) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      {/* Header */}
      <header className="mb-10">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-[10px] font-mono uppercase text-text-dim hover:text-text-main mb-6 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> PREVIOUS_STEP: CONFIG
        </button>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-3 tracking-tight uppercase flex items-center gap-3">
              <Layout className="w-8 h-8 text-mistral-orange" /> Component Preview
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Inspect and adjust the structural skeleton of your artifact. 
              These sections act as hard constraints for the final generation.
            </p>
          </div>
          <div className="hidden lg:block text-right">
            <div className="text-[10px] font-mono uppercase text-text-dim mb-1">Status</div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
              <CheckCircle2 className="w-4 h-4" /> Plan Validated
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Left Column: Sections List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Hash className="w-4 h-4 text-mistral-orange" /> Planned Sections
            </h3>
            <span className="text-[10px] font-mono text-text-dim">Reorder via Drag Handle</span>
          </div>

          <div className="space-y-3">
            {preview.sections.map((section, idx) => (
              <Card 
                key={section.id} 
                draggable={section.editable}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, idx)}
                className={cn(
                  'border-[#28282b] group transition-all',
                  !section.editable && 'border-primary/20 bg-primary/5'
                )}
              >
                <div className="p-4 flex gap-4">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    {section.editable ? (
                      <div className="cursor-grab active:cursor-grabbing text-text-dim group-hover:text-mistral-orange transition-colors">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="text-primary/40">
                        <Hash className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Input
                          value={section.label}
                          onChange={(e) => updateSection(section.id, { label: e.target.value })}
                          className="bg-transparent border-none p-0 h-auto text-sm font-bold focus-visible:ring-0 shadow-none hover:bg-white/5 transition-colors rounded px-1 -ml-1"
                        />
                        <p className="text-xs text-text-dim mt-1">{section.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!section.editable && (
                          <span className="text-[8px] font-bold uppercase tracking-tighter bg-primary/20 text-primary px-1.5 py-0.5 rounded">REQUIRED</span>
                        )}
                        {section.editable && (
                          <button 
                            onClick={() => removeSection(section.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-text-dim hover:text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      {Object.entries(section.dimensionHints).map(([dim, val]) => (
                        <div key={dim} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1a1a1c] border border-[#28282b] text-[9px] font-mono text-text-dim">
                          <span className="opacity-50 uppercase">{dim.charAt(0)}</span>
                          <span className="text-text-main uppercase tracking-tight">{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <textarea
                        placeholder="Add specific user notes / constraints for this section..."
                        value={section.userNotes || ''}
                        onChange={(e) => updateSection(section.id, { userNotes: e.target.value })}
                        className="w-full bg-bg-deep border-[#28282b] rounded p-2 text-[11px] font-mono placeholder:opacity-30 min-h-[60px] resize-none focus:outline-none focus:border-mistral-orange/50 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {!isAdding ? (
            <Button 
              variant="outline" 
              className="w-full mt-4 border-dashed border-[#28282b] text-text-dim hover:text-mistral-orange hover:border-mistral-orange/50 hover:bg-mistral-orange/5"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Custom Section
            </Button>
          ) : (
            <Card className="border-mistral-orange/30 bg-mistral-orange/5 p-4 mt-4">
              <div className="space-y-3">
                <Input 
                  placeholder="Section Label (e.g. ## Use Cases)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="text-sm font-bold bg-bg-deep border-[#28282b]"
                />
                <Input 
                  placeholder="Brief description of intent"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="text-xs bg-bg-deep border-[#28282b]"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => {
                    if (newLabel.trim()) {
                      addSection(newLabel, newDesc);
                      setNewLabel('');
                      setNewDesc('');
                      setIsAdding(false);
                    }
                  }}>Confirm Section</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Summary Panel */}
        <div className="space-y-6">
          <Card className="border-[#28282b] bg-bg-deep/50 sticky top-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-mistral-orange" /> Plan Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono uppercase font-bold text-text-dim">
                  {preview.entityType}
                </span>
                <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-mono uppercase font-bold text-primary">
                  {preview.outputFormat}
                </span>
                {workspace.meta.import_source && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono uppercase font-bold text-amber-500">
                    Imported: {workspace.meta.import_source.provider.replace('-', ' ')}
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-[10px] font-mono uppercase text-text-dim mb-2">Synthesis Frame</h4>
                <p className="text-xs italic text-text-dim leading-relaxed">"{preview.dimensionSummary}"</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end mb-1">
                  <h4 className="text-[10px] font-mono uppercase text-text-dim">Estimated Tokens</h4>
                  <span className="text-xs font-bold font-mono">{preview.estimatedTokens}</span>
                </div>
                <div className="w-full h-1.5 bg-[#28282b] rounded-full overflow-hidden">
                  <div 
                    className={cn('h-full transition-all duration-500', getTokenColor(preview.estimatedTokens))}
                    style={{ width: `${Math.min(100, (preview.estimatedTokens / 2000) * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-text-dim font-mono flex justify-between">
                  <span>Light</span>
                  <span>Heavy</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#28282b] flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase text-text-dim">Total Sections</span>
                <span className="text-lg font-bold font-mono">{preview.sections.length}</span>
              </div>

              <Alert className="bg-primary/5 border-primary/20 py-2">
                <Info className="w-3 h-3 text-primary" />
                <AlertDescription className="text-[10px] text-primary/80 leading-snug">
                  Drafting phase will strictly match these sections. Use "User Notes" to preserve specific phrasing or logic.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Actions */}
      <footer className="pt-8 border-t border-[#28282b] flex justify-between items-center">
        <Button variant="ghost" onClick={goBack} className="font-mono text-xs">
          <ArrowLeft className="w-3 h-3 mr-2" /> REVERT_TO_MODEL_CONFIG
        </Button>
        <Button size="lg" onClick={approveAndProceed} className="h-12 px-12 font-bold tracking-tight">
          PROCEED_TO_GENERATION <Zap className="w-4 h-4 ml-2" />
        </Button>
      </footer>
    </div>
  );
};
