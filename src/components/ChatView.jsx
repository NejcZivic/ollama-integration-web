import { createSignal, createEffect, onMount, onCleanup, For, Show, createMemo, batch, on } from 'solid-js';
import { Motion, Presence } from 'solid-motionone';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import hljs from 'highlight.js';
import 'katex/dist/katex.min.css';
import {
  Send, Paperclip, X, Loader2, Wrench, Globe, Database,
  ChevronDown, RotateCcw, Copy, Check, User, Bot, AlertCircle, ImageIcon
} from 'lucide-solid';
import { sendMessageStream, conversations as convApi, images as imagesApi } from '../api/client';
import { activeConversationId, selectedModel, setSelectedModel, isImageGenModelName, updateConvTitle } from '../api/store';

marked.use(markedKatex({ throwOnError: false }));
marked.setOptions({
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

function renderMarkdown(text) {
  return marked.parse(text || '');
}

function MessageBubble(props) {
  const [copied, setCopied] = createSignal(false);
  const isUser = () => props.role === 'user';

  const copyText = () => {
    navigator.clipboard.writeText(props.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, easing: 'ease-out' }}
      class={`group flex gap-3 ${isUser() ? 'flex-row-reverse' : 'flex-row'} mb-5`}
    >
      <div class={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5
        ${isUser() ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
        <Show when={isUser()} fallback={<Bot size={15} />}>
          <User size={15} />
        </Show>
      </div>

      <div class={`max-w-[80%] ${isUser() ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <Show when={props.tool_calls?.length}>
          <div class="flex flex-wrap gap-1.5 mb-1">
            <For each={props.tool_calls}>
              {(tc) => (
                <span class="inline-flex items-center gap-1 text-xs bg-slate-700/60 border border-slate-600/50 text-slate-300 px-2 py-0.5 rounded-full">
                  <Wrench size={10} />
                  {tc.name}
                </span>
              )}
            </For>
          </div>
        </Show>

        <Show when={props.images?.length}>
          <div class="flex flex-wrap gap-2 mb-2">
            <For each={props.images}>
              {(img) => (
                <img
                  src={img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`}
                  class="max-w-[300px] max-h-[220px] rounded-xl border border-slate-700 object-cover cursor-zoom-in"
                  alt="attachment"
                />
              )}
            </For>
          </div>
        </Show>

        <Show when={props._imageDataUrls?.length}>
          <div class="flex flex-wrap gap-2 mb-2">
            <For each={props._imageDataUrls}>
              {(src) => (
                <img
                  src={src}
                  class="max-w-[300px] max-h-[220px] rounded-xl border border-violet-700/40 object-cover cursor-zoom-in"
                  alt="pasted image"
                />
              )}
            </For>
          </div>
        </Show>

        <Show when={props.attachments?.length}>
          <div class="flex flex-wrap gap-2 mb-2">
            <For each={props.attachments}>
              {(att) => (
                <span class="inline-flex items-center gap-1.5 text-xs bg-slate-700/60 border border-slate-600/40 text-slate-300 px-2.5 py-1 rounded-lg">
                  <Paperclip size={11} />
                  {att.name}
                </span>
              )}
            </For>
          </div>
        </Show>

        <Show when={props.content}>
          <div class={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${isUser()
              ? 'bg-violet-600/90 text-white rounded-tr-sm'
              : 'bg-slate-800/80 border border-slate-700/50 text-slate-100 rounded-tl-sm'}`}>
            <Show when={!isUser()} fallback={
              <p class="whitespace-pre-wrap">{props.content}</p>
            }>
              <div class="prose prose-sm max-w-none text-slate-100"
                innerHTML={renderMarkdown(props.content)} />
            </Show>

            <Show when={!isUser()}>
              <button
                onClick={copyText}
                class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <Show when={copied()} fallback={<Copy size={13} />}>
                  <Check size={13} class="text-green-400" />
                </Show>
              </button>
            </Show>
          </div>
        </Show>
      </div>
    </Motion.div>
  );
}

function ToolProgress(props) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      class="mb-3 pl-11"
    >
      <div class="flex items-center gap-2 text-xs">
        <Show when={!props.done} fallback={
          <span class="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
            <Check size={9} class="text-emerald-400" />
          </span>
        }>
          <span class="w-4 h-4 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
            <Loader2 size={9} class="text-violet-400 animate-spin" />
          </span>
        </Show>
        <span class={props.done ? 'text-slate-500' : 'text-slate-300'}>
          <span class="font-medium text-violet-300">{props.name}</span>
          {props.done ? ' — done' : ' — running…'}
        </span>
      </div>


      <Show when={props.steps?.length}>
        <div class="mt-1.5 ml-6 space-y-0.5 border-l border-slate-700/60 pl-3">
          <For each={props.steps}>
            {(step, i) => (
              <Motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                class={`text-[11px] leading-relaxed ${i() === props.steps.length - 1 && !props.done ? 'text-slate-300' : 'text-slate-500'}`}
              >
                {step}
              </Motion.div>
            )}
          </For>
        </div>
      </Show>
    </Motion.div>
  );
}

function StreamingBubble(props) {
  return (
    <div class="flex gap-3 mb-5">
      <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs bg-slate-700 text-slate-300 mt-0.5">
        <Bot size={15} />
      </div>
      <div class="max-w-[80%] flex flex-col gap-1 items-start">
        <div class="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-800/80 border border-slate-700/50 text-slate-100 text-sm leading-relaxed">
          <Show when={props.content} fallback={
            <div class="flex items-center gap-1.5 h-5">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay:0ms" />
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay:150ms" />
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style="animation-delay:300ms" />
            </div>
          }>
            <div class="prose prose-sm max-w-none text-slate-100"
              innerHTML={renderMarkdown(props.content)} />
          </Show>
        </div>
      </div>
    </div>
  );
}

export default function ChatView() {
  const [messages, setMessages] = createSignal([]);
  const [input, setInput] = createSignal('');
  const [files, setFiles] = createSignal([]);
  const [filePreviews, setFilePreviews] = createSignal([]);
  const [streaming, setStreaming] = createSignal(false);
  const [streamContent, setStreamContent] = createSignal('');
  const [activeTools, setActiveTools] = createSignal([]);
  const [useTools, setUseTools] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal(null);
  const [pasteFlash, setPasteFlash] = createSignal(false);

  let messagesEndRef;
  let fileInputRef;
  let textareaRef;
  let streamController = null;
  let imageGenController = null;

  createEffect(() => {
    const fileList = files();
    setFilePreviews((prev) => {
      prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      return fileList.map((f) => ({
        name: f.name,
        isImage: f.type.startsWith('image/'),
        url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      }));
    });
  });

  onCleanup(() => {
    filePreviews().forEach((p) => p.url && URL.revokeObjectURL(p.url));
  });

  const convId = activeConversationId;

  createEffect(on(convId, (id) => {
    if (!id) {
      batch(() => { setMessages([]); setLoading(false); setError(null); });
      return;
    }

    let cancelled = false;
    onCleanup(() => { cancelled = true; });

    batch(() => { setLoading(true); setError(null); });

    convApi.get(id)
      .then((data) => {
        if (cancelled) return;
        batch(() => {
          setMessages(data.messages || []);
          setLoading(false);
          if (data.model) setSelectedModel(data.model);
        });
      })
      .catch((e) => {
        if (cancelled) return;
        batch(() => { setError(e.message); setLoading(false); });
      });
  }, { defer: false }));

  createEffect(() => {
    messages();
    streamContent();
    setTimeout(() => messagesEndRef?.scrollIntoView({ behavior: 'smooth' }), 50);
  });

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const text = input().trim();
    const attachedFiles = files();
    if ((!text && !attachedFiles.length) || streaming()) return;
    if (!convId()) return;

    const imageDataUrls = await Promise.all(
      attachedFiles
        .filter((f) => f.type.startsWith('image/'))
        .map((f) => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(f);
        }))
    );

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      _imageDataUrls: imageDataUrls,
      attachments: attachedFiles
        .filter((f) => !f.type.startsWith('image/'))
        .map((f) => ({ name: f.name, mime: f.type, size: f.size })),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setFiles([]);
    setStreaming(true);
    setStreamContent('');
    setActiveTools([]);
    setError(null);

    if (isImageGenModelName(selectedModel())) {
      imageGenController = new AbortController();
      try {
        const result = await imagesApi.generate(
          { model: selectedModel(), prompt: text },
          imageGenController.signal,
        );
        batch(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: '',
              images: result.images,
            },
          ]);
          setStreaming(false);
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          batch(() => { setError(err.message); setStreaming(false); setStreamContent(''); });
        } else {
          batch(() => { setStreaming(false); setStreamContent(''); });
        }
      } finally {
        imageGenController = null;
      }
      return;
    }

    streamController = sendMessageStream(
      convId(),
      { content: text, files: attachedFiles, use_tools: useTools() },
      {
        onChunk: (chunk) => setStreamContent((prev) => prev + chunk),
        onToolStart: (t) => setActiveTools((prev) => [...prev, { name: t.name, args: t.args, done: false, steps: [] }]),
        onToolProgress: (t) => setActiveTools((prev) =>
          prev.map((a) => a.name === t.name ? { ...a, steps: [...(a.steps || []), t.step] } : a)
        ),
        onToolResult: (t) => setActiveTools((prev) =>
          prev.map((a) => a.name === t.name ? { ...a, result: t.result, done: true } : a)
        ),
        onDone: (data) => {
          batch(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.content,
                images: data.images?.length ? data.images : null,
                tool_calls: data.tools_used?.length ? data.tools_used : null,
              },
            ]);
            setStreamContent('');
            setActiveTools([]);
            setStreaming(false);
          });
        },
        onError: (msg) => {
          batch(() => { setError(msg); setStreaming(false); setStreamContent(''); });
        },
        onTitle: (data) => {
          if (data.title) updateConvTitle(convId(), data.title);
        },
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (!imageItems.length) return;
    e.preventDefault();
    const pastedFiles = imageItems.map((item) => {
      const blob = item.getAsFile();
      return new File([blob], `paste-${Date.now()}.${item.type.split('/')[1] || 'png'}`, { type: item.type });
    });
    setFiles((prev) => [...prev, ...pastedFiles]);
    setPasteFlash(true);
    setTimeout(() => setPasteFlash(false), 800);
  };

  const abort = () => {
    streamController?.abort();
    imageGenController?.abort();
    batch(() => { setStreaming(false); setStreamContent(''); });
  };

  return (
    <div class="flex flex-col h-full bg-slate-900">
      <div class="flex-1 overflow-y-auto px-4 py-6">
        <Show when={!convId()}>
          <div class="flex flex-col items-center justify-center h-full text-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Bot size={32} class="text-violet-400" />
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-200 mb-1">AI Assistant</h2>
              <p class="text-slate-500 text-sm">Select a conversation or create a new one</p>
            </div>
          </div>
        </Show>

        <Show when={loading() && !messages().length}>
          <div class="flex justify-center items-center py-20">
            <Loader2 size={24} class="text-violet-400 animate-spin" />
          </div>
        </Show>

        <Show when={error()}>
          <Motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            class="mx-auto max-w-lg bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 flex items-center gap-3 mb-4 text-sm text-red-300"
          >
            <AlertCircle size={16} class="flex-shrink-0" />
            {error()}
            <button onClick={() => setError(null)} class="ml-auto text-red-400 hover:text-red-200">
              <X size={14} />
            </button>
          </Motion.div>
        </Show>

        <Show when={convId() && !(loading() && !messages().length)}>
          <div class="max-w-3xl mx-auto">
            <For each={messages()}>
              {(msg) => <MessageBubble {...msg} />}
            </For>

            <For each={activeTools()}>
              {(t) => <ToolProgress {...t} />}
            </For>

            <Show when={streaming()}>
              <StreamingBubble content={streamContent()} />
            </Show>

            <div ref={messagesEndRef} />
          </div>
        </Show>
      </div>

      <Show when={convId()}>
        <div class="border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3">
          <div class="max-w-3xl mx-auto">
            <Show when={filePreviews().length}>
              <div class="flex flex-wrap gap-2 mb-2">
                <For each={filePreviews()}>
                  {(preview, idx) => (
                    <div class={`relative group flex items-center gap-1.5 border rounded-lg overflow-hidden text-xs text-slate-300
                      ${preview.isImage ? 'border-slate-600/60 bg-slate-800/60 p-0' : 'bg-slate-800 border-slate-700 px-2.5 py-1'}`}>
                      <Show when={preview.isImage} fallback={
                        <>
                          <Paperclip size={11} />
                          <span class="max-w-[120px] truncate">{preview.name}</span>
                        </>
                      }>
                        <img src={preview.url} alt={preview.name}
                          class="w-16 h-16 object-cover" />
                      </Show>
                      <button
                        onClick={() => removeFile(idx())}
                        class={`flex-shrink-0 transition-colors hover:text-white
                          ${preview.isImage
                            ? 'absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center text-white/70 opacity-0 group-hover:opacity-100'
                            : 'text-slate-500 ml-1'}`}
                      >
                        <X size={preview.isImage ? 9 : 11} />
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <div class="flex items-end gap-2">
              <div class={`flex-1 bg-slate-800/80 border rounded-2xl px-4 py-3 flex items-end gap-2 transition-colors
                ${pasteFlash() ? 'border-violet-400/80 bg-violet-900/10' : 'border-slate-700/60 focus-within:border-violet-500/60'}`}>
                <textarea
                  ref={textareaRef}
                  value={input()}
                  onInput={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={isImageGenModelName(selectedModel()) ? 'Describe the image you want to generate…' : 'Send a message… (paste image with Ctrl+V)'}
                  rows={1}
                  class="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm resize-none outline-none leading-relaxed max-h-40"
                  style="height: 24px"
                />

                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <Show when={!isImageGenModelName(selectedModel())}>
                    <button
                      onClick={() => setUseTools((v) => !v)}
                      title={useTools() ? 'Tools enabled' : 'Tools disabled'}
                      class={`p-1.5 rounded-lg transition-colors ${useTools()
                        ? 'text-violet-400 bg-violet-500/15 hover:bg-violet-500/25'
                        : 'text-slate-500 hover:bg-slate-700'}`}
                    >
                      <Wrench size={15} />
                    </button>
                  </Show>

                  <button
                    onClick={() => fileInputRef?.click()}
                    class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <Paperclip size={15} />
                  </button>
                  <input ref={fileInputRef} type="file" multiple class="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileChange} />
                </div>
              </div>

              <Show when={streaming()} fallback={
                <button
                  onClick={handleSubmit}
                  disabled={!input().trim() && !files().length}
                  class="w-11 h-11 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all active:scale-95"
                  title={isImageGenModelName(selectedModel()) ? 'Generate image' : 'Send message'}
                >
                  <Show when={isImageGenModelName(selectedModel())} fallback={<Send size={17} />}>
                    <ImageIcon size={17} />
                  </Show>
                </button>
              }>
                <button
                  onClick={abort}
                  class="w-11 h-11 rounded-2xl bg-slate-700 hover:bg-red-600 flex items-center justify-center text-white transition-all"
                >
                  <X size={17} />
                </button>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
