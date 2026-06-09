import { createSignal, createEffect, onCleanup } from 'solid-js';
import { conversations, models as modelsApi, tools as toolsApi, knowledge as knowledgeApi, health } from './client';

export const [activeConversationId, setActiveConversationId] = createSignal(null);
export const [sidebarOpen, setSidebarOpen] = createSignal(true);
export const [activePanel, setActivePanel] = createSignal('chat');
export const [ollamaStatus, setOllamaStatus] = createSignal('unknown');

export const [convList, setConvList] = createSignal([]);
export const [convLoading, setConvLoading] = createSignal(false);

export async function loadConversations() {
  setConvLoading(true);
  try {
    const data = await conversations.list();
    setConvList(data.conversations || []);
  } finally {
    setConvLoading(false);
  }
}

export async function createConversation(model) {
  const conv = await conversations.create({ title: 'New Conversation', model });
  setConvList((prev) => [conv, ...prev]);
  setActiveConversationId(conv.id);
  return conv;
}

export async function deleteConversation(id) {
  await conversations.delete(id);
  setConvList((prev) => prev.filter((c) => c.id !== id));
  if (activeConversationId() === id) setActiveConversationId(null);
}

export async function renameConversation(id, title) {
  const updated = await conversations.update(id, { title });
  setConvList((prev) => prev.map((c) => (c.id === id ? updated : c)));
}

export function updateConvTitle(id, title) {
  setConvList((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
}

export const [modelList, setModelList] = createSignal([]);
export const [selectedModel, setSelectedModel] = createSignal('llama3.2');
export const [modelsLoading, setModelsLoading] = createSignal(false);

const IMAGE_GEN_FAMILIES = new Set(['stable-diffusion', 'flux', 'wuerstchen', 'imagen']);
const IMAGE_GEN_NAME_PATTERNS = ['diffusion', 'flux', 'dall-e', 'dalle', 'sdxl', 'sd3', 'wuerstchen'];

export function isImageGenModelName(name) {
  if (!name) return false;

  const info = modelList().find((m) => m.name === name);
  if (info?.details?.family) {
    const family = info.details.family.toLowerCase();
    if (IMAGE_GEN_FAMILIES.has(family) || IMAGE_GEN_NAME_PATTERNS.some((p) => family.includes(p))) {
      return true;
    }
    const chatFamilies = ['llama', 'mistral', 'gemma', 'phi', 'qwen', 'deepseek', 'falcon', 'starcoder', 'mamba', 'bert'];
    if (chatFamilies.some((f) => family.includes(f))) return false;
  }

  const lower = name.toLowerCase();
  return IMAGE_GEN_NAME_PATTERNS.some((p) => lower.includes(p));
}

export async function loadModels() {
  setModelsLoading(true);
  try {
    const data = await modelsApi.list();
    setModelList(data.models || []);
    if (data.models?.length && !data.models.find((m) => m.name === selectedModel())) {
      setSelectedModel(data.models[0].name);
    }
  } finally {
    setModelsLoading(false);
  }
}

export const [toolList, setToolList] = createSignal([]);
export const [toolsLoading, setToolsLoading] = createSignal(false);

export async function loadTools() {
  setToolsLoading(true);
  try {
    const data = await toolsApi.list();
    setToolList(data.tools || []);
  } finally {
    setToolsLoading(false);
  }
}

export const [knowledgeList, setKnowledgeList] = createSignal([]);
export const [knowledgeLoading, setKnowledgeLoading] = createSignal(false);

export async function loadKnowledge() {
  setKnowledgeLoading(true);
  try {
    const data = await knowledgeApi.list();
    setKnowledgeList(data.documents || []);
  } finally {
    setKnowledgeLoading(false);
  }
}

export async function checkHealth() {
  try {
    const data = await health.check();
    setOllamaStatus(data.ollama === 'connected' ? 'ok' : 'error');
  } catch {
    setOllamaStatus('error');
  }
}
