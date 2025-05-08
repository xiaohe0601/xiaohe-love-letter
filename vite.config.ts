import path from "node:path";
import process from "node:process";
import Vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import type { PluginOption, TerserOptions } from "vite";
import { defineConfig, loadEnv } from "vite";

function r(...paths: string[]) {
  return path.resolve(process.cwd(), ".", ...paths);
}

function buildPlugins(): PluginOption[] {
  return [
    AutoImport({
      dts: "./types/auto-imports.d.ts",
      imports: [
        "vue",
        "@vueuse/core"
      ],
      dirs: [
        "src/composables",
        "src/utils"
      ],
      vueTemplate: true
    }),
    Components({
      dts: "./types/components.d.ts",
      dirs: [
        "src/components"
      ],
      directoryAsNamespace: true,
      collapseSamePrefixes: true
    }),
    Vue(),
    UnoCSS()
  ];
}

function buildTerserOptions(mode: string, env: Record<string, string>) {
  const options: TerserOptions = {};

  if (mode === "development") {
    options.compress = false;
  } else {
    options.compress = {
      keep_infinity: true,
      drop_console: env.VITE_ENABLE_DROP_CONSOLE === "true",
      drop_debugger: true
    };
  }

  return options;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    base: env.VITE_BASE_URL,
    resolve: {
      alias: {
        "@": r("src")
      }
    },
    plugins: buildPlugins(),
    server: {
      host: true,
      port: 5173
    },
    build: {
      minify: "terser",
      target: "es6",
      cssTarget: "chrome61",
      terserOptions: buildTerserOptions(mode, env)
    }
  };
});