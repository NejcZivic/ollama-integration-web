import { createSignal, For, Show, onMount } from 'solid-js';
import { Motion } from 'solid-motionone';
import {
  Database, Plus, Trash2, Search, Upload, X, Loader2,
  FileText, ExternalLink, Check, AlertCircle
} from 'lucide-solid';
import { knowledgeList, loadKnowledge, knowledgeLoading } from '../api/store';
import { knowledge as knowledgeApi } from '../api/client';

function DocCard(props) {
  const [expanded, setExpanded] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${props.doc.title}"?`)) return;
    setDeleting(true);
    try {
      await knowledgeApi.delete(props.doc.id);
      await loadKnowledge();
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const truncate = (str, n) => str?.length > n ? str.slice(0, n) + '…' : str;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      class="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden"
    >
      <div
        class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div class="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <FileText size={14} />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-200 truncate">{props.doc.title}</p>
          <p class="text-xs text-slate-500 mt-0.5 line-clamp-1">{truncate(props.doc.content, 80)}</p>
          <div class="flex items-center gap-2 mt-1.5">
            <Show when={props.doc.source}>
              <span class="text-[10px] text-slate-600 flex items-center gap-1">
                <ExternalLink size={9} /> {props.doc.source}
              </span>
            </Show>
            <span class="text-[10px] text-slate-600">{formatDate(props.doc.created_at)}</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting()}
          class="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
        >
          <Show when={deleting()} fallback={<Trash2 size={14} />}>
            <Loader2 size={14} class="animate-spin" />
          </Show>
        </button>
      </div>

      <Show when={expanded()}>
        <div class="border-t border-slate-700/40 px-4 py-3">
          <p class="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{props.doc.content}</p>
        </div>
      </Show>
    </Motion.div>
  );
}

function AddDocModal(props) {
  const [mode, setMode] = createSignal('text');
  const [title, setTitle] = createSignal('');
  const [content, setContent] = createSignal('');
  const [source, setSource] = createSignal('');
  const [file, setFile] = createSignal(null);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal('');

  let fileRef;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (mode() === 'upload') {
        if (!file()) throw new Error('No file selected');
        await knowledgeApi.upload(file(), title() || undefined);
      } else {
        if (!title().trim() || !content().trim()) throw new Error('Title and content are required');
        await knowledgeApi.create({ title: title().trim(), content: content().trim(), source: source().trim() || undefined });
      }
      await loadKnowledge();
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
          <h3 class="text-sm font-semibold text-slate-200">Add Document</h3>
          <button onClick={props.onClose} class="text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div class="flex gap-1 bg-slate-800/50 rounded-xl p-1">
            <For each={['text', 'upload']}>
              {(m) => (
                <button
                  onClick={() => setMode(m)}
                  class={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all capitalize
                    ${mode() === m ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {m === 'text' ? 'Manual Text' : 'Upload File'}
                </button>
              )}
            </For>
          </div>

          <div>
            <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Title</label>
            <input value={title()} onInput={(e) => setTitle(e.target.value)}
              class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60"
              placeholder="Document title" />
          </div>

          <Show when={mode() === 'text'}>
            <div>
              <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Source (optional)</label>
              <input value={source()} onInput={(e) => setSource(e.target.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60"
                placeholder="https://… or filename" />
            </div>
            <div>
              <label class="text-[10px] text-slate-500 uppercase tracking-wide font-semibold block mb-1">Content *</label>
              <textarea value={content()} onInput={(e) => setContent(e.target.value)}
                class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500/60 resize-none"
                rows={6} placeholder="Document content…" />
            </div>
          </Show>

          <Show when={mode() === 'upload'}>
            <div
              class="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/50 transition-colors"
              onClick={() => fileRef?.click()}
            >
              <Show when={file()} fallback={
                <div class="flex flex-col items-center gap-2 text-slate-500">
                  <Upload size={24} />
                  <p class="text-sm">Click to select a file</p>
                  <p class="text-xs">PDF, DOCX, TXT supported</p>
                </div>
              }>
                <div class="flex items-center justify-center gap-2 text-emerald-400">
                  <FileText size={18} />
                  <span class="text-sm font-medium">{file().name}</span>
                </div>
              </Show>
              <input ref={fileRef} type="file" class="hidden" accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </Show>

          <Show when={error()}>
            <p class="text-xs text-red-400 bg-red-900/10 border border-red-700/20 rounded-lg px-3 py-2">{error()}</p>
          </Show>
        </div>

        <div class="flex justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button onClick={props.onClose} class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving()}
            class="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-xl text-white font-medium flex items-center gap-2 transition-all">
            <Show when={saving()}><Loader2 size={13} class="animate-spin" /></Show>
            Add Document
          </button>
        </div>
      </Motion.div>
    </div>
  );
}

export default function KnowledgePanel() {
  const [showAdd, setShowAdd] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchResults, setSearchResults] = createSignal(null);
  const [searching, setSearching] = createSignal(false);

  onMount(loadKnowledge);

  const doSearch = async () => {
    const q = searchQuery().trim();
    if (!q) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const data = await knowledgeApi.search(q);
      setSearchResults(data.results || []);
    } finally {
      setSearching(false);
    }
  };

  const displayList = () => searchResults() ?? knowledgeList();

  return (
    <div class="flex flex-col h-full bg-slate-900">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
        <div class="flex items-center gap-2">
          <Database size={18} class="text-emerald-400" />
          <h2 class="text-sm font-semibold text-slate-200">Knowledge Base</h2>
          <span class="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{knowledgeList().length}</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs text-white font-medium transition-all active:scale-95"
        >
          <Plus size={13} />
          Add Document
        </button>
      </div>

      <div class="px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <div class="flex gap-2">
          <div class="flex-1 flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2">
            <Search size={13} class="text-slate-500 flex-shrink-0" />
            <input
              value={searchQuery()}
              onInput={(e) => { setSearchQuery(e.target.value); if (!e.target.value.trim()) setSearchResults(null); }}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder="Semantic search…"
              class="flex-1 bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none"
            />
            <Show when={searchQuery()}>
              <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} class="text-slate-500 hover:text-white transition-colors">
                <X size={13} />
              </button>
            </Show>
          </div>
          <button
            onClick={doSearch}
            disabled={searching() || !searchQuery().trim()}
            class="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 rounded-xl text-xs text-slate-300 flex items-center gap-1.5 transition-all"
          >
            <Show when={searching()} fallback={<Search size={13} />}>
              <Loader2 size={13} class="animate-spin" />
            </Show>
            Search
          </button>
        </div>
        <Show when={searchResults()}>
          <p class="text-[10px] text-slate-500 mt-2">
            {searchResults().length} result{searchResults().length !== 1 ? 's' : ''} for "{searchQuery()}"
            <button onClick={() => { setSearchResults(null); setSearchQuery(''); }} class="ml-2 text-violet-400 hover:text-violet-300">clear</button>
          </p>
        </Show>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        <Show when={knowledgeLoading()}>
          <div class="flex justify-center py-10"><Loader2 size={20} class="animate-spin text-slate-500" /></div>
        </Show>
        <Show when={!knowledgeLoading() && displayList().length === 0}>
          <div class="flex flex-col items-center justify-center py-16 gap-3 text-slate-600">
            <Database size={32} />
            <p class="text-sm">{searchResults() ? 'No results found' : 'No documents yet'}</p>
          </div>
        </Show>
        <For each={displayList()}>
          {(doc) => (
            <DocCard
              doc={doc}
              score={doc.score}
            />
          )}
        </For>
      </div>

      <Show when={showAdd()}>
        <AddDocModal onClose={() => setShowAdd(false)} />
      </Show>
    </div>
  );
}
