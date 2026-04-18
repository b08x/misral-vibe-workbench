import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Alert, AlertDescription, Badge } from '../ui';
import { ArrowLeft, Play, Edit2, CheckCircle, Info, ChevronDown, ChevronUp, FileCode, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ReviewView: React.FC = () => {
  const { workspace, updateWorkspace } = useWorkspace();

  const handleStartGeneration = () => {
    updateWorkspace({ meta: { ...workspace.meta, status: 'generation-config' } });
  };

  const handleEdit = (questionId: string, newValue: any) => {
    const nextAnswers = { ...workspace.session.answers, [questionId]: newValue };
    updateWorkspace({ session: { ...workspace.session, answers: nextAnswers } });
  };

  const ImportProvenanceBanner: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    
    if (!workspace.meta.import_source) return null;
    
    const { provider, skipped_files, unmapped_fields } = workspace.meta.import_source;
    const providerName = provider.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

    return (
      <Alert className="mb-6 bg-muted/30 border-[#28282b] overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Info className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-bold text-text-main flex items-center">
                Imported from {providerName}
              </p>
              <p className="text-[11px] text-text-dim font-mono">
                {skipped_files.length > 0 ? `${skipped_files.length} items skipped` : 'Full bundle imported'} · {unmapped_fields.length} unmapped fields
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-8 px-2 text-[10px] font-mono">
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? 'HIDE DETAILS' : 'VIEW DETAILS'}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-[#28282b] space-y-4 animate-in slide-in-from-top-2 duration-300">
            {skipped_files.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2 flex items-center">
                  <FileCode className="h-3 w-3 mr-1" /> Skipped Files & Assets
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {skipped_files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-bg-deep/50 border border-[#ffffff05]">
                      <span className="text-[10px] font-mono text-text-main truncate max-w-[200px]">{f.path}</span>
                      <Badge variant="secondary" className="text-[8px]">{f.reason}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unmapped_fields.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-2 flex items-center">
                  <Tag className="h-3 w-3 mr-1" /> Unmapped Source Fields
                </p>
                <div className="flex flex-wrap gap-2">
                  {unmapped_fields.map((field, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] font-mono">{field}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Alert>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <ImportProvenanceBanner />
      <header className="flex justify-between items-center mb-8">
        <div>
          <Button variant="ghost" onClick={() => updateWorkspace({ meta: { ...workspace.meta, status: 'questions' } })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Questions
          </Button>
          <h1 className="text-3xl font-bold mt-4 tracking-tight uppercase">Generation Review</h1>
        </div>
        <Button size="lg" onClick={handleStartGeneration} className="orange-gradient text-white">
          <Play className="w-4 h-4 mr-2" /> PROCEED_TO_MODEL_SELECTION
        </Button>
      </header>

      <div className="space-y-6">
        <Card className="border-emerald-500/20 bg-emerald-50/10">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-emerald-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Final Context Catalog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We have synthesized your requirements into a structured context map. 
              The Universal Generation Control Surface will now use this catalog to ground the 3-phase generation flow.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(workspace.session.answers).map(([qid, ans]) => (
            <Card key={qid} className="hover:border-primary/20 transition-all">
              <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {qid.replace(/_/g, ' ')}
                </CardTitle>
                <Edit2 className="w-3 h-3 text-muted-foreground/40" />
              </CardHeader>
              <CardContent className="p-4 pt-1">
                {typeof ans === 'boolean' ? (
                  <div className="font-semibold text-lg">{ans ? 'YES' : 'NO'}</div>
                ) : typeof ans === 'string' && ans.length > 50 ? (
                  <Textarea 
                    defaultValue={ans} 
                    onBlur={(e) => handleEdit(qid, e.target.value)} 
                    className="mt-2 text-sm border-none bg-transparent p-0 shadow-none resize-none focus-visible:ring-0 min-h-[60px]"
                  />
                ) : (
                  <Input 
                    defaultValue={String(ans)} 
                    onBlur={(e) => handleEdit(qid, e.target.value)}
                    className="mt-2 font-semibold text-lg border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
