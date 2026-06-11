import { createRandomDialogueProvider } from "./providers/randomDialogueProvider.js";

export function createAssistantProvider(config) {
  switch (config.provider.type) {
    case "random":
      return createRandomDialogueProvider(config);
    default:
      throw new Error(`Unsupported assistant provider: ${config.provider.type}`);
  }
}
