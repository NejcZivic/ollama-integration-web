import { createSignal, For, Show, onMount } from 'solid-js';
import { Motion } from 'solid-motionone';
import {
  ChevronDown, Check, Loader2, RefreshCw, Cpu, Download, Trash2, AlertCircle, ImageIcon, X
} from 'lucide-solid';
import { modelList, selectedModel, setSelectedModel, loadModels, modelsLoading, isImageGenModelName } from '../api/store';
import { models as modelsApi } from '../api/client';
import { activeConversationId, convList } from '../api/store';
import { conversations as convApi } from '../api/client';

function formatSize(bytes) {
  if (!bytes) return '';
  const gb = bytes / 1e9;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

export function ModelSelector() {
  const [open, setOpen] = createSignal(false);
  const [pullName, setPullName] = createSignal('');
  const [pulling, setPulling] = createSignal(false);
  const [pullProgress, setPullProgress] = createSignal('');
  const [pullError, setPullError] = createSignal('');
  const [deleteConfirm, setDeleteConfirm] = createSignal(null);

  onMount(loadModels);

  const selectModel = async (name) => {
    setSelectedModel(name);
    setOpen(false);
    const id = activeConversationId();
    if (id) {
      try {
        await convApi.update(id, { model: name });
      } catch {}
    }
  };

  const handlePull = async () => {
    if (!pullName().trim()) return;
    setPulling(true);
    setPullError('');
    setPullProgress('Starting…');
    modelsApi.pull(pullName().trim(), (progress) => {
      setPullProgress(progress.status + (progress.completed && progress.total
        ? ` ${Math.round((progress.completed / progress.total) * 100)}%`
        : ''));
      if (progress.status === 'success') {
        setPulling(false);
        setPullProgress('');
        setPullName('');
        loadModels();
      }
    });
  };

  return (
    <div class="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        class="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl text-sm text-slate-300 hover:border-violet-500/50 hover:text-white transition-all"
      >
        <Show when={isImageGenModelName(selectedModel())} fallback={<Cpu size={14} class="text-violet-400" />}>
          <ImageIcon size={14} class="text-pink-400" />
        </Show>
        <span class="max-w-[120px] truncate text-xs font-medium">{selectedModel()}</span>
        <ChevronDown size={13} class={`transition-transform ${open() ? 'rotate-180' : ''}`} />
      </button>

      <Show when={open()}>
        <Motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          class="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
        >
          <div class="p-3 border-b border-slate-800 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Models</span>
            <button onClick={() => { loadModels(); }} class="text-slate-500 hover:text-white transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          <div class="max-h-56 overflow-y-auto p-2 space-y-0.5">
            <Show when={modelsLoading()}>
              <div class="flex justify-center py-6"><Loader2 size={18} class="animate-spin text-slate-500" /></div>
            </Show>
            <For each={modelList()}>
              {(model) => (
                <div class="flex items-center gap-1">
                  <button
                    onClick={() => selectModel(model.name)}
                    class={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all hover:bg-slate-800
                      ${selectedModel() === model.name ? 'bg-violet-600/15 text-violet-300' : 'text-slate-300'}`}
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <Show when={isImageGenModelName(model.name)}>
                        <ImageIcon size={11} class="text-pink-400 shrink-0" />
                      </Show>
                      <div class="min-w-0">
                        <p class="text-xs font-medium truncate">{model.name}</p>
                        <Show when={model.size}>
                          <p class="text-[10px] text-slate-500">{formatSize(model.size)}</p>
                        </Show>
                      </div>
                    </div>
                    <Show when={selectedModel() === model.name}>
                      <Check size={13} class="text-violet-400 shrink-0" />
                    </Show>
                  </button>

                  <Show when={deleteConfirm() === model.name} fallback={
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(model.name); }}
                      class="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                      title="Delete model"
                    >
                      <Trash2 size={11} />
                    </button>
                  }>
                    <div class="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={async () => { await modelsApi.delete(model.name); setDeleteConfirm(null); loadModels(); }}
                        class="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Confirm delete"
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        class="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Cancel"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
          <div class="p-3 border-t border-slate-800">
            <p class="text-[10px] text-slate-500 mb-2 uppercase tracking-wide font-semibold">Pull model</p>
            <div class="flex gap-2">
              <input
                value={pullName()}
                onInput={(e) => setPullName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePull()}
                placeholder="e.g. mistral:7b"
                class="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-violet-500/60"
              />
              <button
                onClick={handlePull}
                disabled={pulling() || !pullName().trim()}
                class="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg text-xs text-white font-medium flex items-center gap-1 transition-all"
              >
                <Show when={pulling()} fallback={<Download size={12} />}>
                  <Loader2 size={12} class="animate-spin" />
                </Show>
                Pull
              </button>
            </div>
            <Show when={pullProgress()}>
              <p class="text-[10px] text-violet-400 mt-2">{pullProgress()}</p>
            </Show>
            <Show when={pullError()}>
              <p class="text-[10px] text-red-400 mt-2">{pullError()}</p>
            </Show>
          </div>
        </Motion.div>
      </Show>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      </Show>
    </div>
  );
}
