window.__tmBuildingsConfig = {
  templates: {
    classic2: {
      base: { floors: 100, floorHeight: 100, color: "#d8cfbf" },
      roof: { type: "gable", color: "#7a3326", height: 2.4 },
      windows: { rows: 2, width: 1.05, height: 1.35 }
    }
  },
  buildings: {
    "mein-haus": {
      match: { chunk: [3970, 1024], index: 20 },
      template: "classic2",
      sides: { 0: { color: "#c9b79d" }, 2: { windows: { rows: 1, cols: 2 } } },
      parts: [{ type: "box", position: [0, 1.1, 0], size: [1.8, 2.2, 0.2], color: "#6b4a2f" }]
    }
  }
};

