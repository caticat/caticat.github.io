import { siteConfig } from "./config/site.config.js";
import { live2dConfig } from "./config/live2d.config.js";
import { assistantConfig } from "./config/assistant.config.js";
import { createRandomDialogueProvider } from "./features/assistant/providers/randomDialogueProvider.js";
import { mountLive2DStage } from "./features/live2d/Live2DStage.js";

const activeModel = live2dConfig.models[live2dConfig.activeModelId];
const dialogueProvider = createRandomDialogueProvider(assistantConfig);

document.title = siteConfig.title;
document.querySelector("#site-title").textContent = siteConfig.title;
document.querySelector("#site-subtitle").textContent = siteConfig.subtitle;
document.querySelector("#site-links").innerHTML = siteConfig.links
  .map((link) => `<a href="${link.href}" target="_blank" rel="noreferrer">${link.label}</a>`)
  .join("");

const bubble = document.querySelector("#assistant-bubble");
const status = document.querySelector("#live2d-status");

function showDialogue(trigger) {
  bubble.textContent = dialogueProvider.reply({ trigger });
  bubble.classList.add("is-visible");
}

showDialogue("load");

mountLive2DStage({
  canvas: document.querySelector("#live2d-canvas"),
  status,
  model: activeModel,
  onTap: () => showDialogue("tap"),
});

document.querySelector("#site-footer").innerHTML = `
  <span>${activeModel.attribution.character}</span>
  <span>Illustration: ${activeModel.attribution.illustration}</span>
  <span>Modeling: ${activeModel.attribution.modeling}</span>
  <a href="${activeModel.attribution.source}" target="_blank" rel="noreferrer">Live2D Sample Data</a>
`;
