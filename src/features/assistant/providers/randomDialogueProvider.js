export function createRandomDialogueProvider(config) {
  return {
    async reply({ trigger, signal }) {
      signal?.throwIfAborted();
      const messages = config.dialogues[trigger] ?? config.dialogues.idle ?? [];
      if (messages.length === 0) {
        return config.fallbackMessage;
      }

      return messages[Math.floor(Math.random() * messages.length)];
    },
  };
}
