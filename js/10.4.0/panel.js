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
