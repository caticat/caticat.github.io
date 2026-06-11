export const assistantConfig = {
  initialDelayMs: 1200,
  fallbackMessage: "我在这里。",
  dialogues: {
    load: [
      "今天也慢慢来。",
      "页面已经准备好了。",
      "这里会先用随机对话，之后可以换成 AI。",
    ],
    tap: [
      "嗯？你刚刚点了我。",
      "我会记住这个交互点，之后可以接到 AI 回复。",
      "现在是随机回复模式。",
      "换模型时，不需要改这里的逻辑。",
    ],
    idle: [
      "我在等你的下一步。",
      "这个位置之后可以显示 AI 的回答。",
    ],
  },
};
