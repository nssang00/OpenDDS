plugins/
└── measure-tool/
    ├── plugin.json         ← 플러그인 메타데이터 (필수)
    ├── plugin.js           ← 실행 로직 (필수)
    ├── panel.html          ← UI 패널 (옵션)
    ├── icon.png            ← 아이콘 이미지 (옵션)
    └── style.css           ← 플러그인 전용 스타일 (옵션)

{
  "id": "measure-tool",
  "name": "Measure Tool",
  "entry": "plugin.js",
  "hooks": ["onMapInit", "onMapClick"],
  "ui": {
    "button": {
      "label": "Measure",
      "icon": "icon.png"
    },
    "panel": "panel.html"
  }
}



// plugins/measure-tool/index.js
import React from "react";

export default function MeasurePanel() {
  return (
    <div>
      <h3>거리 측정 도구</h3>
      <button onClick={() => window.pluginAPI.startDraw("LineString")}>측정 시작</button>
    </div>
  );
}


async function loadPluginPanel(id) {
  const manifest = await fetch(`/plugins/${id}/plugin.json`).then(r => r.json());
  const mod = await import(`/plugins/${id}/${manifest.panel}`);
  const container = document.createElement("div");
  container.className = "plugin-panel";
  document.querySelector("#sidebar").appendChild(container);

  if (manifest.framework === "react") {
    const React = await import("https://esm.sh/react");
    const ReactDOM = await import("https://esm.sh/react-dom");
    ReactDOM.render(React.createElement(mod.default), container);

  } else if (manifest.framework === "vue") {
    const { createApp } = await import("https://unpkg.com/vue@3/dist/vue.esm-browser.js");
    createApp(mod.default).mount(container);

  } else if (manifest.framework === "vanilla") {
    mod.default(container); // el: div
  }
}
