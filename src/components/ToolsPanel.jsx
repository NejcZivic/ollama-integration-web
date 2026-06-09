import { createSignal, For, Show, onMount } from 'solid-js';
import { Motion, Presence } from 'solid-motionone';
import {
  Wrench, Plus, Trash2, Edit3, Check, X, Loader2, Play, ChevronDown,
  ChevronRight, Code2, Globe, Terminal, ToggleLeft, ToggleRight
} from 'lucide-solid';
import { toolList, loadTools, toolsLoading } from '../api/store';
import { tools as toolsApi } from '../api/client';

const HANDLER_TYPES = ['builtin', 'http', 'script'];
const HANDLER_ICONS = { builtin: Code2, http: Globe, script: Terminal };

const DEFAULT_FORM = {
  name: '', description: '', handler_type: 'script',
  handler_data: '', parameters: '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
  enabled: 1,
};

function ToolCard(props) {
  const [expanded, setExpanded] = createSignal(false);
  const [testing, setTesting] = createSignal(false);
  const [testArgs, setTestArgs] = createSignal('{}');
  const [testResult, setTestResult] = createSignal(null);
  const [testError, setTestError] = createSignal(null);
  const [toggling, setToggling] = createSignal(false);

  const Icon = () => {
    const C = HANDLER_ICONS[props.tool.handler_type] || Wrench;
    return <C size={14} />;
  };

  const runTest = async () => {
    if (!props.tool.id) return;
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const args = JSON.parse(testArgs());
      const res = await toolsApi.test(props.tool.id, args);
      setTestResult(JSON.stringify(res.result, null, 2));
    } catch (e) {
      setTestError(e.message);
    } finally {
      setTesting(false);
    }
  };

  const toggleEnabled = async () => {
    if (!props.tool.id || toggling()) return;
    setToggling(true);
    try {
      await toolsApi.update(props.tool.id, { enabled: props.tool.enabled ? 0 : 1 });
      await loadTools();
    } finally {
      setToggling(false);
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      class="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden"
    >
      <div
        class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div class={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
          ${props.tool.is_builtin ? 'bg-blue-600/20 text-blue-400' : 'bg-violet-600/20 text-violet-400'}`}>
          <Icon />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-slate-200">{props.tool.name}</span>
            <span class={`text-[10px] px-1.5 py-0.5 rounded-full border
              ${props.tool.is_builtin
                ? 'bg-blue-900/30 border-blue-700/40 text-blue-400'
                : 'bg-slate-700/50 border-slate-600/40 text-slate-400'}`}>
              {props.tool.is_builtin ? 'built-in' : props.tool.handler_type}
            </span>
          </div>
          <p class="text-xs text-slate-500 truncate mt-0.5">{props.tool.description}</p>
        </div>

        <div class="flex items-center gap-2">
          <Show when={!props.tool.is_builtin}>
            <button
              onClick={(e) => { e.stopPropagation(); toggleEnabled(); }}
              class={`transition-colors ${props.tool.enabled ? 'text-violet-400' : 'text-slate-600'}`}
            >
              <Show when={props.tool.enabled} fallback={<ToggleLeft size={20} />}>
                <ToggleRight size={20} />
              </Show>
            </button>
          </Show>

          <Show when={!props.tool.is_builtin}>
            <button
              onClick={(e) => { e.stopPropagation(); props.onDelete(props.tool.id); }}
              class="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </Show>

          <ChevronRight size={14} class={`text-slate-500 transition-transform ${expanded() ? 'rotate-90' : ''}`} />
        </div>
      </div>

      <Show when={expanded()}>
        <Motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          class="border-t border-slate-700/40 px-4 py-3 space-y-3"
        >
          <div>
            <p class="text-[10px] text-slate-500 uppercase tracking-wide mb-1 font-semibold">Parameters Schema</p>
            <pre class="text-xs text-slate-300 bg-slate-900/60 rounded-lg px-3 py-2 overflow-x-auto border border-slate-700/30">
              {JSON.stringify(props.tool.parameters || {}, null, 2)}
            </pre>
          </div>

          <Show when={!props.tool.is_builtin && props.tool.id}>
            <div>
              <p class="text-[10px] text-slate-500 uppercase tracking-wide mb-1.5 font-semibold">Test</p>
              <textarea
                value={testArgs()}
                onInput={(e) => setTestArgs(e.target.value)}
                class="w-full bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono outline-none focus:border-violet-500/50 resize-none"
                rows={3}
                placeholder="{}"
              />
              <button
                onClick={runTest}
                disabled={testing()}
                class="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs rounded-lg hover:bg-violet-600/30 transition-all disabled:opacity-50"
              >
                <Show when={testing()} fallback={<Play size={12} />}>
                  <Loader2 size={12} class="animate-spin" />
                </Show>
                Run
              </button>
              <Show when={testResult()}>
                <pre class="mt-2 text-xs text-green-300 bg-green-900/10 border border-green-700/20 rounded-lg px-3 py-2 overflow-x-auto">{testResult()}</pre>
              </Show>
              <Show when={testError()}>
                <p class="mt-2 text-xs text-red-400 bg-red-900/10 border border-red-700/20 rounded-lg px-3 py-2">{testError()}</p>
              </Show>
            </div>
          </Show>
        </Motion.div>
      </Show>
    </Motion.div>
  );
}

function CreateToolModal(props) {
  const [form, setForm] = createSignal({ ...DEFAULT_FORM });
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal('');

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      let params;
      try { params = JSON.parse(form().parameters); } catch { throw new Error('Invalid JSON in parameters'); }
      await toolsApi.create({ ...form(), parameters: params });
      await loadTools();
      props.onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        class="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 class="text-sm font-semibold text-slate-200">Create Custom Tool</h3>
          <button onClick={props.onClose} class="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div class="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Name *</label>
              <input value={form().name} onInput={(e) => update('name', e.target.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60"
                placeholder="my_tool" />
            </div>
            <div class="col-span-2">
              <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Description *</label>
              <input value={form().description} onInput={(e) => update('description', e.target.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60"
                placeholder="What does this tool do?" />
            </div>
            <div>
              <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Handler Type</label>
              <select value={form().handler_type} onChange={(e) => update('handler_type', e.target.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60">
                <For each={['http', 'script']}>{(t) => <option value={t}>{t}</option>}</For>
              </select>
            </div>
            <div class="flex items-center gap-2 pt-5">
              <label class="text-xs text-slate-400">Enabled</label>
              <button onClick={() => update('enabled', form().enabled ? 0 : 1)}
                class={`transition-colors ${form().enabled ? 'text-violet-400' : 'text-slate-600'}`}>
                <Show when={form().enabled} fallback={<ToggleLeft size={22} />}>
                  <ToggleRight size={22} />
                </Show>
              </button>
            </div>
          </div>

          <div>
            <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Handler Data</label>
            <textarea value={form().handler_data} onInput={(e) => update('handler_data', e.target.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono outline-none focus:border-violet-500/60 resize-none"
              rows={3}
              placeholder={form().handler_type === 'http' ? 'https://api.example.com/endpoint' : '// JavaScript code'} />
          </div>

          <div>
            <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Parameters (JSON Schema)</label>
            <textarea value={form().parameters} onInput={(e) => update('parameters', e.target.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono outline-none focus:border-violet-500/60 resize-none"
              rows={5} />
          </div>

          <Show when={error()}>
            <p class="text-xs text-red-400 bg-red-900/10 border border-red-700/20 rounded-lg px-3 py-2">{error()}</p>
          </Show>
        </div>

        <div class="flex justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button onClick={props.onClose}
            class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving() || !form().name || !form().description}
            class="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-xl text-white font-medium flex items-center gap-2 transition-all">
            <Show when={saving()}><Loader2 size={13} class="animate-spin" /></Show>
            Create Tool
          </button>
        </div>
      </Motion.div>
    </div>
  );
}

export default function ToolsPanel() {
  const [showCreate, setShowCreate] = createSignal(false);
  const [filter, setFilter] = createSignal('all');

  onMount(loadTools);

  const filtered = () => {
    const list = toolList();
    if (filter() === 'builtin') return list.filter((t) => t.is_builtin);
    if (filter() === 'custom') return list.filter((t) => !t.is_builtin);
    return list;
  };

  const handleDelete = async (id) => {
    await toolsApi.delete(id);
    await loadTools();
  };

  return (
    <div class="flex flex-col h-full bg-slate-900">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
        <div class="flex items-center gap-2">
          <Wrench size={18} class="text-violet-400" />
          <h2 class="text-sm font-semibold text-slate-200">Custom Tools</h2>
          <span class="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{toolList().length}</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          class="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs text-white font-medium transition-all active:scale-95"
        >
          <Plus size={13} />
          New Tool
        </button>
      </div>

      <div class="flex gap-1 px-4 py-2.5 border-b border-slate-800 flex-shrink-0">
        <For each={['all', 'builtin', 'custom']}>
          {(f) => (
            <button
              onClick={() => setFilter(f)}
              class={`px-3 py-1 text-xs rounded-lg transition-all capitalize
                ${filter() === f ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              {f}
            </button>
          )}
        </For>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        <Show when={toolsLoading()}>
          <div class="flex justify-center py-10"><Loader2 size={20} class="animate-spin text-slate-500" /></div>
        </Show>
        <Show when={!toolsLoading() && filtered().length === 0}>
          <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
            <Wrench size={32} />
            <p class="text-sm">No tools found</p>
          </div>
        </Show>
        <For each={filtered()}>
          {(tool) => <ToolCard tool={tool} onDelete={handleDelete} />}
        </For>
      </div>

      <Show when={showCreate()}>
        <CreateToolModal onClose={() => setShowCreate(false)} />
      </Show>
    </div>
  );
}
