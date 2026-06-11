export const live2dConfig = {
  activeModelId: "hiyori",
  models: {
    hiyori: {
      displayName: "Hiyori Momose",
      modelJsonPath: "/public/assets/live2d/hiyori/runtime/hiyori_free_t08.model3.json",
      viewportHeightRatio: 0.88,
      position: { x: 0.52, y: 0.96 },
      motions: {
        idle: "Idle",
        tap: "Tap@Body",
      },
      attribution: {
        character: "Hiyori Momose",
        illustration: "Kani Biimu",
        modeling: "Live2D Inc.",
        source: "https://www.live2d.com/en/learn/sample/",
      },
    },
  },
};
