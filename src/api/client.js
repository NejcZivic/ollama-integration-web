const BASE = '/api';

async function request(method, path, body, signal) {
  const init = { method, signal };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const conversations = {
  list: () => request('GET', '/conversations'),
  get: (id) => request('GET', `/conversations/${id}`),
  create: (data) => request('POST', '/conversations', data),
  update: (id, data) => request('PUT', `/conversations/${id}`, data),
  delete: (id) => request('DELETE', `/conversations/${id}`),
};

export function sendMessageStream(conversationId, { content, files = [], use_tools = true }, handlers) {
  const controller = new AbortController();

  (async () => {
    const form = new FormData();
    form.append('content', content || '');
    form.append('use_tools', String(use_tools));
    for (const file of files) form.append('files', file);

    let res;
    try {
      res = await fetch(`${BASE}/conversations/${conversationId}/chat/stream`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name !== 'AbortError') handlers.onError?.(e.message);
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      handlers.onError?.(err.error || res.statusText);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedError = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop();

      for (const part of parts) {
        if (!part.trim()) continue;
        const lines = part.split('\n');
        let event = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) event = line.slice(7).trim();
          else if (line.startsWith('data: ')) data = line.slice(6);
        }
        try {
          const parsed = JSON.parse(data);
          if (event === 'chunk') handlers.onChunk?.(parsed.content);
          else if (event === 'tool_start') handlers.onToolStart?.(parsed);
          else if (event === 'tool_progress') handlers.onToolProgress?.(parsed);
          else if (event === 'tool_result') handlers.onToolResult?.(parsed);
          else if (event === 'error') { receivedError = true; handlers.onError?.(parsed.message); }
          else if (event === 'done' && !receivedError) handlers.onDone?.(parsed);
          else if (event === 'title') handlers.onTitle?.(parsed);
        } catch {}
      }
    }
  })();

  return { abort: () => controller.abort() };
}

export const models = {
  list: () => request('GET', '/models'),
  show: (name) => request('GET', `/models/${encodeURIComponent(name)}`),
  delete: (name) => request('DELETE', `/models/${encodeURIComponent(name)}`),
  pull: (model, onProgress) => {
    const controller = new AbortController();
    (async () => {
      const res = await fetch(`${BASE}/models/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
        signal: controller.signal,
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();
        for (const part of parts) {
          if (part.startsWith('data: ')) {
            try { onProgress?.(JSON.parse(part.slice(6))); } catch {}
          }
        }
      }
    })();
    return { abort: () => controller.abort() };
  },
};

export const tools = {
  list: () => request('GET', '/tools'),
  builtins: () => request('GET', '/tools/builtins'),
  create: (data) => request('POST', '/tools', data),
  update: (id, data) => request('PUT', `/tools/${id}`, data),
  delete: (id) => request('DELETE', `/tools/${id}`),
  test: (id, args) => request('POST', `/tools/${id}/test`, { args }),
};

export const knowledge = {
  list: () => request('GET', '/knowledge'),
  get: (id) => request('GET', `/knowledge/${id}`),
  create: (data) => request('POST', '/knowledge', data),
  update: (id, data) => request('PUT', `/knowledge/${id}`, data),
  delete: (id) => request('DELETE', `/knowledge/${id}`),
  search: (q, top_k = 5) => request('GET', `/knowledge/search?q=${encodeURIComponent(q)}&top_k=${top_k}`),
  upload: (file, title) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    return request('POST', '/knowledge/upload', form);
  },
};

export const search = {
  web: (q, limit = 5) => request('GET', `/search?q=${encodeURIComponent(q)}&limit=${limit}`),
};

export const images = {
  generate: ({ model, prompt, options }, signal) =>
    request('POST', '/images/generate', { model, prompt, options }, signal),
};

export const health = {
  check: () => request('GET', '/health'),
};
