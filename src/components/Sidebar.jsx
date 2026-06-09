import { createSignal, For, Show, onMount } from 'solid-js';
import { Motion, Presence } from 'solid-motionone';
import {
  MessageSquare, Plus, Trash2, Edit3, Check, X,
  ChevronRight, Loader2, Bot, Search
} from 'lucide-solid';
import {
  convList, activeConversationId, setActiveConversationId,
  loadConversations, createConversation, deleteConversation, renameConversation,
  selectedModel, convLoading, setActivePanel
} from '../api/store';

function ConvItem(props) {
  const [editing, setEditing] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal('');
  const [hovering, setHovering] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);

  const isActive = () => activeConversationId() === props.conv.id;

  const startEdit = (e) => {
    e.stopPropagation();
    setEditTitle(props.conv.title);
    setEditing(true);
  };

  const submitEdit = async () => {
    if (editTitle().trim()) await renameConversation(props.conv.id, editTitle().trim());
    setEditing(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirmDelete()) { setConfirmDelete(true); return; }
    await deleteConversation(props.conv.id);
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <Motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirmDelete(false); }}
      onClick={() => !editing() && (setActivePanel('chat'), setActiveConversationId(props.conv.id))}
      class={`group relative flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all
        ${isActive()
          ? 'bg-violet-600/20 border border-violet-500/30 text-white'
          : 'hover:bg-slate-800/70 border border-transparent text-slate-400 hover:text-slate-200'}`}
    >
      <MessageSquare size={15} class={`flex-shrink-0 mt-0.5 ${isActive() ? 'text-violet-400' : ''}`} />

      <div class="flex-1 min-w-0">
        <Show when={!editing()} fallback={
          <input
            value={editTitle()}
            onInput={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            onBlur={submitEdit}
            autofocus
            class="w-full bg-slate-700 text-white text-xs px-2 py-0.5 rounded outline-none border border-violet-500/50"
          />
        }>
          <p class="text-xs font-medium leading-tight truncate">{props.conv.title}</p>
          <p class="text-[10px] text-slate-500 mt-0.5">{formatDate(props.conv.updated_at)}</p>
        </Show>
      </div>

      <Show when={(hovering() || isActive()) && !editing()}>
        <div class="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={startEdit}
            class="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors"
          >
            <Edit3 size={11} />
          </button>
          <button
            onClick={handleDelete}
            class={`p-1 rounded transition-colors ${confirmDelete()
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'hover:bg-slate-700 text-slate-500 hover:text-red-400'}`}
          >
            <Show when={confirmDelete()} fallback={<Trash2 size={11} />}>
              <Check size={11} />
            </Show>
          </button>
        </div>
      </Show>
    </Motion.div>
  );
}

export default function Sidebar(props) {
  const [searchQuery, setSearchQuery] = createSignal('');

  onMount(loadConversations);

  const filteredConvs = () => {
    const q = searchQuery().toLowerCase();
    if (!q) return convList();
    return convList().filter((c) => c.title.toLowerCase().includes(q));
  };

  const handleNew = async () => {
    setActivePanel('chat');
    await createConversation(selectedModel());
  };

  return (
    <div class={`flex flex-col h-full bg-slate-950 border-r border-slate-800 transition-all duration-300
      ${props.open ? 'w-64' : 'w-0 overflow-hidden'}`}>

      <div class="px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Bot size={15} class="text-white" />
          </div>
          <span class="text-sm font-semibold text-slate-200">AI Chat</span>
        </div>
        <button
          onClick={handleNew}
          class="w-7 h-7 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 flex items-center justify-center text-violet-400 hover:text-violet-300 transition-all active:scale-95"
          title="New conversation"
        >
          <Plus size={14} />
        </button>
      </div>

      <div class="px-3 mb-2 flex-shrink-0">
        <div class="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
          <Search size={13} class="text-slate-500 flex-shrink-0" />
          <input
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.target.value)}
            placeholder="Search…"
            class="flex-1 bg-transparent text-slate-300 text-xs placeholder-slate-500 outline-none"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
        <Show when={convLoading()}>
          <div class="flex justify-center py-8">
            <Loader2 size={18} class="text-slate-500 animate-spin" />
          </div>
        </Show>

        <Show when={!convLoading() && filteredConvs().length === 0}>
          <p class="text-center text-xs text-slate-600 py-8">No conversations yet</p>
        </Show>

        <For each={filteredConvs()}>
          {(conv) => <ConvItem conv={conv} />}
        </For>
      </div>
    </div>
  );
}
