import { createSignal, onMount, Show } from 'solid-js';
import { Motion } from 'solid-motionone';
import {
  MessageSquare, Wrench, Database, Cpu, PanelLeftClose,
  PanelLeftOpen, Plus
} from 'lucide-solid';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ToolsPanel from './components/ToolsPanel';
import KnowledgePanel from './components/KnowledgePanel';
import { ModelSelector } from './components/ModelSelector';
import {
  sidebarOpen, setSidebarOpen, activePanel, setActivePanel,
  ollamaStatus, checkHealth, selectedModel, createConversation
} from './api/store';
import './index.css';

const NAV_ITEMS = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'tools', icon: Wrench, label: 'Tools' },
  { id: 'knowledge', icon: Database, label: 'Knowledge' },
];

function NavButton(props) {
  const active = () => activePanel() === props.id;
  return (
    <button
      onClick={() => setActivePanel(props.id)}
      title={props.label}
      class={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all group
        ${active()
          ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
    >
      <props.icon size={18} />
      <span class="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {props.label}
      </span>
      <Show when={active()}>
        <span class="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-violet-500" />
      </Show>
    </button>
  );
}

export default function App() {
  onMount(() => {
    checkHealth();
    const iv = setInterval(checkHealth, 30000);
    return () => clearInterval(iv);
  });

  const handleNewChat = () => {
    setActivePanel('chat');
    createConversation(selectedModel());
  };

  return (
    <div class="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      <div class="flex flex-col items-center gap-1.5 w-14 border-r border-slate-800 bg-slate-950 py-3 flex-shrink-0 z-10">
        <div class="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center mb-2 pulse-glow">
          <Cpu size={17} class="text-white" />
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title="Toggle sidebar"
          class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
        >
          <Show when={sidebarOpen()} fallback={<PanelLeftOpen size={18} />}>
            <PanelLeftClose size={18} />
          </Show>
        </button>
        <div class="w-6 border-t border-slate-800 my-1" />
        <nav class="flex flex-col gap-1.5">
          {NAV_ITEMS.map((item) => (
            <NavButton id={item.id} icon={item.icon} label={item.label} />
          ))}
        </nav>
        <div class="flex-1" />
        <div
          title={`Ollama: ${ollamaStatus()}`}
          class={`w-2 h-2 rounded-full mb-2 transition-colors ${
            ollamaStatus() === 'ok' ? 'bg-emerald-400' :
            ollamaStatus() === 'error' ? 'bg-red-400' :
            'bg-slate-600'
          }`}
        />
      </div>

      <Sidebar open={sidebarOpen()} />

      <div class="flex-1 flex flex-col min-w-0">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex-shrink-0">
          <div class="flex items-center gap-2"></div>
          <div class="flex items-center gap-2">
            <Show when={activePanel() === 'chat'}>
              <button
                onClick={handleNewChat}
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700"
              >
                <Plus size={13} />
                New chat
              </button>
            </Show>
            <ModelSelector />
          </div>
        </div>
        <div class="flex-1 overflow-hidden">
          <Show when={activePanel() === 'chat'}>
            <ChatView />
          </Show>
          <Show when={activePanel() === 'tools'}>
            <ToolsPanel />
          </Show>
          <Show when={activePanel() === 'knowledge'}>
            <KnowledgePanel />
          </Show>
        </div>
      </div>
    </div>
  );
}
