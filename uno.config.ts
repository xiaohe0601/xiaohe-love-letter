import { presetLegacyCompat } from "@unocss/preset-legacy-compat";
import { defineConfig, presetAttributify, presetIcons, presetMini, transformerVariantGroup } from "unocss";

export default defineConfig({
  presets: [
    presetMini(),
    presetAttributify({
      prefixedOnly: true
    }),
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: {
        "display": "inline-block",
        "vertical-align": "middle"
      }
    }),
    presetLegacyCompat({
      commaStyleColorFunction: true,
      legacyColorSpace: true
    })
  ],
  transformers: [
    transformerVariantGroup()
  ]
});