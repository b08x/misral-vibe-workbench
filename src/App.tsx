/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { SessionProvider } from './context/SessionContext';
import { EntitySelectionView } from './components/entity-selection/EntitySelectionView';
import { ImportView } from './components/import/ImportView';
import { QAShell } from './components/qa/QAShell';
import { ReviewView } from './components/review/ReviewView';
import { GenerationView } from './components/generation/GenerationView';
import { PreviewView } from './components/preview/PreviewView';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { GenerationConfigView } from './components/generation-config';
import { ComponentPreviewView } from './components/component-preview';
import { Settings, LogOut, Home, Box, Zap, FileText } from 'lucide-react';
import { Button } from './components/ui';
import { cn } from './lib/utils';

const AppContent: React.FC = () => {
  const { workspace, resetWorkspace, updateWorkspace } = useWorkspace();
  const [showSettings, setShowSettings] = useState(false);

  const renderView = () => {
    if (showSettings) return <SettingsPanel />;
    
    switch (workspace.meta.status) {
      case 'entity-selection':
        return <EntitySelectionView />;
      case 'import':
        return (
          <ImportView 
            initialProvider={workspace.meta.pending_import_provider ?? null}
            onImportComplete={() => updateWorkspace({ meta: { status: 'questions' } as any })} 
            onBack={() => updateWorkspace({ meta: { status: 'entity-selection' } as any })}
          />
        );
      case 'questions':
        return <QAShell />;
      case 'review':
        return <ReviewView />;
      case 'generation-config':
        return <GenerationConfigView />;
      case 'component-preview':
        return <ComponentPreviewView />;
      case 'generating':
        return <GenerationView />;
      case 'complete':
        return <PreviewView />;
      default:
        return <EntitySelectionView />;
    }
  };

  return (
    <div className="h-screen flex flex-col antialiased bg-bg-deep text-text-main overflow-hidden border border-[#222]">
      {/* GLOBAL NAVBAR: Technical Header */}
      <nav className="h-12 bg-bg-surface border-b border-[#28282b] flex items-center justify-between px-5 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { resetWorkspace(); setShowSettings(false); }}>
            <div className="w-8 h-8 rounded bg-bg-deep border border-[#444] flex items-center justify-center group-hover:border-mistral-orange transition-colors">
               <Zap className="w-4 h-4 text-mistral-orange fill-current" />
            </div>
            <div className="font-bold tracking-tighter text-sm">
              <span className="text-mistral-orange uppercase">Mistral-Vibe</span> <span className="font-light text-text-main">WORKBENCH</span>
            </div>
          </div>

          {!showSettings && workspace.meta.status !== 'entity-selection' && (
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-text-dim px-3 py-1 rounded bg-bg-deep border border-[#28282b]">
               {workspace.meta.entityType === 'agent' && <Box className="w-3 h-3" />}
               {workspace.meta.entityType === 'skill' && <Zap className="w-3 h-3 text-mistral-amber" />}
               {workspace.meta.entityType === 'system-prompt' && <FileText className="w-3 h-3 text-emerald-500" />}
               ENGINE: {workspace.meta.entityType}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] font-mono text-text-dim">
          <div className="hidden lg:flex gap-4 mr-4">
             <div className="flex items-center gap-1.5"><span className="text-[#00ff88]">●</span> ENGINE: ONLINE</div>
             <div className="flex items-center gap-1.5"><span className="text-[#00ff88]">●</span> LATENCY: 24MS</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className={cn("h-8 px-3 text-[11px] font-mono", showSettings && "bg-bg-elevated text-mistral-orange")}>
             <Settings className="w-3.5 h-3.5 mr-2" /> SETTINGS
          </Button>
          <Button variant="ghost" size="sm" onClick={resetWorkspace} className="h-8 px-3 text-[11px] font-mono">
             <Home className="w-3.5 h-3.5 mr-2" /> EXIT
          </Button>
        </div>
      </nav>

      {/* VIEWPORT */}
      <div className="flex-1 overflow-auto bg-bg-deep relative">
        {/* Subtle Background Glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,_rgba(255,90,31,0.05)_0%,_transparent_70%)]" />
        {renderView()}
      </div>

      {/* GLOBAL FOOTER: Immersive Status Bar */}
      <footer className="h-8 border-t border-[#28282b] flex items-center justify-between px-5 text-[10px] items-center font-mono text-text-dim bg-bg-surface z-50">
         <div className="flex items-center gap-4">
            <div>Mistral-Vibe Workbench v4.2.0-Alpha</div>
            <div className="hidden sm:flex items-center gap-2 border-l border-[#28282b] pl-4">
               <span>SYS: CLEAR</span>
               <span>MEM: 2.4GB</span>
            </div>
         </div>
         
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
               <span>CONTEXT WINDOW:</span>
               <div className="w-24 h-1.5 bg-bg-deep rounded-full overflow-hidden border border-[#28282b]">
                  <div className="h-full bg-mistral-orange w-[42%] shadow-[0_0_5px_rgba(255,90,31,0.5)]" />
               </div>
               <span>42,102 / 128,000</span>
            </div>
            <div className="hidden md:block">UTF-8 | CRLF | TYPESCRIPT</div>
         </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </WorkspaceProvider>
  );
}
