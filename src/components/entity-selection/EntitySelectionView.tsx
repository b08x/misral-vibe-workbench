import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '../ui';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Bot, Zap, TextQuote, Settings2, Box, FileText, ShieldAlert, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export const EntitySelectionView: React.FC = () => {
  const { updateWorkspace } = useWorkspace();

  const handleSelect = (type: 'agent' | 'skill' | 'system-prompt') => {
    updateWorkspace({
      meta: {
        entityType: type,
        outputFormat: type === 'agent' ? 'toml' : 'markdown',
        status: 'questions',
        currentSection: null,
        currentQuestion: null,
        questionsAnswered: 0,
        questionsTotal: 0,
        sectionsComplete: [],
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        generatedAt: null
      },
      session: {
        answers: {},
        history: [],
        currentIndex: 0,
        activeModule: '',
        conversationSummary: null
      }
    });
  };

  const entities = [
    {
      id: 'agent',
      title: 'Agent Configuration',
      description: 'Generate agent.toml files for mistral-vibe agents, including tool permissions and model settings.',
      icon: Box,
      color: 'text-mistral-orange',
      bg: 'bg-mistral-orange/10',
      border: 'hover:border-mistral-orange/50'
    },
    {
      id: 'skill',
      title: 'Skill Definition',
      description: 'Define complex multi-step workflows in SKILL.md format with YAML frontmatter metadata.',
      icon: Zap,
      color: 'text-mistral-amber',
      bg: 'bg-mistral-amber/10',
      border: 'hover:border-mistral-amber/50'
    },
    {
      id: 'system-prompt',
      title: 'System Prompt',
      description: 'Create highly specialized identity and expertise documents to guide agent behavior.',
      icon: FileText,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'hover:border-emerald-500/50'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto py-20 px-6 relative">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-2xl h-px bg-gradient-to-r from-transparent via-mistral-orange/20 to-transparent" />
      
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold tracking-tighter mb-4 text-text-main">
          MISTRAL-VIBE <span className="text-mistral-orange">WORKBENCH</span>
        </h1>
        <p className="text-xs font-mono uppercase tracking-[0.3em] text-text-dim">
          Behavioral Artifact Synthesis Engine • UGCS v3.0
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {entities.map((entity) => (
          <Card key={entity.id} className={cn("group hover:translate-y-[-4px] transition-all duration-300 bg-bg-surface/50 backdrop-blur border-[#28282b]", entity.border)} onClick={() => handleSelect(entity.id as any)}>
            <CardHeader className="relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                 <entity.icon className="w-32 h-32" />
              </div>
              <div className={`w-12 h-12 rounded-lg ${entity.bg} flex items-center justify-center mb-6 border border-[#ffffff05]`}>
                <entity.icon className={`w-6 h-6 ${entity.color}`} />
              </div>
              <CardTitle className="text-lg uppercase tracking-tight font-bold group-hover:text-mistral-orange transition-colors">{entity.title}</CardTitle>
              <CardDescription className="leading-relaxed normal-case font-sans tracking-normal mt-2 text-text-dim">{entity.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-4">
              <Button variant="outline" className="w-full group-hover:bg-mistral-orange group-hover:text-white transition-all">INITIALIZE SEQUENCE</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[#28282b]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase font-mono tracking-widest">
            <span className="bg-bg-deep px-4 text-text-dim">or import from an existing agent tool</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => updateWorkspace({ meta: { status: 'import', pending_import_provider: 'claude-code' } as any })}
            className="border-[#28282b] bg-bg-surface/30 hover:bg-bg-elevated hover:border-orange-500/30 group"
          >
            <Box className="w-3 h-3 mr-2 text-orange-500 group-hover:scale-110 transition-transform" />
            Claude Code
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => updateWorkspace({ meta: { status: 'import', pending_import_provider: 'gemini-cli' } as any })}
            className="border-[#28282b] bg-bg-surface/30 hover:bg-bg-elevated hover:border-blue-500/30 group"
          >
            <Sparkles className="w-3 h-3 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
            Gemini CLI
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => updateWorkspace({ meta: { status: 'import', pending_import_provider: 'hermes-agent' } as any })}
            className="border-[#28282b] bg-bg-surface/30 hover:bg-bg-elevated hover:border-purple-500/30 group"
          >
            <ShieldAlert className="w-3 h-3 mr-2 text-purple-500 group-hover:scale-110 transition-transform" />
            Hermes Agent
          </Button>
        </div>
      </div>

      <div className="mt-16 p-8 border border-[#28282b] rounded-xl bg-bg-surface/30 backdrop-blur-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <ShieldAlert className="w-24 h-24" />
        </div>
        <h3 className="text-xs font-mono font-bold flex items-center gap-3 mb-4 text-mistral-orange uppercase tracking-widest">
          <Settings2 className="w-4 h-4" /> Architectural Protocol
        </h3>
        <p className="text-xs text-text-dim leading-relaxed font-mono">
          Artifacts are generated through a strict 3-phase behavioral alignment workflow. 
          UGCS Phase-Mapping ensures that [Imagery Density], [Abstraction Level], and [Constraint Adherence] 
          are monitored in real-time. Failure modes like 'Thundering Herd' (metaphor runaway) 
          are detected and corrected via autonomous intervention primitives.
        </p>
      </div>
    </div>
  );
};
