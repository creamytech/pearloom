import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-img-element": "off"
    }
  },
  {
    files: ["src/components/pearloom/editor/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/var\\(--(cream|ink|ink-soft|ink-muted|line|line-soft|card|pl-cream|pl-ink|pl-divider)\\)/]",
          message: "Editor chrome must bind to --pl-chrome-* tokens (CLAUDE-DESIGN.md §2.6)"
        },
        {
          selector: "TemplateElement[value.raw=/var\\(--(cream|ink|ink-soft|ink-muted|line|line-soft|card|pl-cream|pl-ink|pl-divider)\\)/]",
          message: "Editor chrome must bind to --pl-chrome-* tokens (CLAUDE-DESIGN.md §2.6)"
        }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
