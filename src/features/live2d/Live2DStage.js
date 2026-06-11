const runtimeScripts = [
  "/public/vendor/live2d-runtime/pixi.min.js",
  "/public/vendor/live2d-runtime/live2dcubismcore.min.js",
  "/public/vendor/live2d-runtime/cubism4.min.js",
];

export async function mountLive2DStage({ canvas, status, model, onTap }) {
  if (!canvas) {
    return;
  }

  status.textContent = "Loading Live2D...";

  try {
    await loadRuntime();

    const app = new window.PIXI.Application({
      view: canvas,
      autoStart: true,
      resizeTo: canvas.parentElement,
      backgroundAlpha: 0,
      antialias: true,
    });

    const live2dModel = await window.PIXI.live2d.Live2DModel.from(model.modelJsonPath);
    app.stage.addChild(live2dModel);
    fitModel(live2dModel, app.renderer, model);

    window.addEventListener("resize", () => fitModel(live2dModel, app.renderer, model));

    live2dModel.eventMode = "static";
    live2dModel.cursor = "pointer";
    live2dModel.on("pointertap", () => {
      playMotion(live2dModel, model.motions.tap);
      onTap?.();
    });

    playMotion(live2dModel, model.motions.idle);
    status.textContent = "";
  } catch (error) {
    status.textContent = "Live2D 加载失败，检查网络和模型资源路径。";
    console.error(error);
  }
}

function fitModel(live2dModel, renderer, model) {
  const width = renderer.width;
  const height = renderer.height;
  const targetHeight = height * model.viewportHeightRatio;

  live2dModel.scale.set(1);
  const naturalHeight = live2dModel.height || 1;
  live2dModel.scale.set(targetHeight / naturalHeight);
  live2dModel.anchor.set(0.5, 1);
  live2dModel.x = width * model.position.x;
  live2dModel.y = height * model.position.y;
}

function playMotion(live2dModel, motionGroup) {
  if (!motionGroup || !live2dModel.motion) {
    return;
  }

  live2dModel.motion(motionGroup).catch(() => {});
}

async function loadRuntime() {
  if (window.PIXI?.live2d) {
    return;
  }

  for (const src of runtimeScripts) {
    await loadScript(src);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}
