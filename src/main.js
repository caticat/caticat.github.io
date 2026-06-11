import { siteConfig } from "./config/site.config.js";
import { live2dConfig } from "./config/live2d.config.js";
import { assistantConfig } from "./config/assistant.config.js";
import { createAssistantProvider } from "./features/assistant/assistantProvider.js";
import { mountLive2DStage } from "./features/live2d/Live2DStage.js";

const activeModel = live2dConfig.models[live2dConfig.activeModelId];
const assistantProvider = createAssistantProvider(assistantConfig);

document.title = siteConfig.title;
document.querySelector("#site-title").textContent = siteConfig.title;
document.querySelector("#site-subtitle").textContent = siteConfig.subtitle;
document.querySelector("#site-links").innerHTML = siteConfig.links
  .map((link) => {
    const externalAttributes = link.external
      ? ' target="_blank" rel="noreferrer"'
      : "";
    return `<a href="${link.href}"${externalAttributes}>${link.label}</a>`;
  })
  .join("");

const bubble = document.querySelector("#assistant-bubble");
const status = document.querySelector("#live2d-status");
let hideDialogueTimer;
let idleDialogueTimer;
let dialogueRequest;

async function showDialogue(trigger) {
  dialogueRequest?.abort();
  dialogueRequest = new AbortController();

  let message;
  try {
    message = await assistantProvider.reply({
      trigger,
      signal: dialogueRequest.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    console.error(error);
    message = assistantConfig.fallbackMessage;
  }

  window.clearTimeout(hideDialogueTimer);
  bubble.textContent = message;
  bubble.classList.add("is-visible");
  hideDialogueTimer = window.setTimeout(() => {
    bubble.classList.remove("is-visible");
  }, assistantConfig.visibleDurationMs);
}

function scheduleIdleDialogue() {
  window.clearTimeout(idleDialogueTimer);

  const { min, max } = assistantConfig.idleIntervalMs;
  const delay = Math.round(min + Math.random() * (max - min));
  idleDialogueTimer = window.setTimeout(() => {
    if (!document.hidden) {
      void showDialogue("idle");
    }
    scheduleIdleDialogue();
  }, delay);
}

window.setTimeout(() => void showDialogue("load"), assistantConfig.initialDelayMs);
scheduleIdleDialogue();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.clearTimeout(idleDialogueTimer);
    return;
  }

  scheduleIdleDialogue();
});

mountLive2DStage({
  canvas: document.querySelector("#live2d-canvas"),
  status,
  model: activeModel,
  onTap: () => {
    void showDialogue("tap");
    scheduleIdleDialogue();
  },
});

document.querySelector("#site-footer").innerHTML = `
  <span>${activeModel.attribution.character}</span>
  <span>Illustration: ${activeModel.attribution.illustration}</span>
  <span>Modeling: ${activeModel.attribution.modeling}</span>
  <a href="${activeModel.attribution.source}" target="_blank" rel="noreferrer">Live2D Sample Data</a>
`;
