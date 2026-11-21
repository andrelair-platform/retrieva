import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "next-env.d.ts",
    // Storybook build artifact — never lint the minified output.
    "storybook-static/**",
  ]),
  {
    rules: {
      // Pre-existing React hooks issues: downgrade to warnings (need dedicated refactoring)
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },

  // ---------------------------------------------------------------------------
  // clean-code.md deterministic floor (TypeScript row), type-aware.
  // See minicloud-gitops#2353. Enforced on all app .ts/.tsx (not tests/stories).
  // ---------------------------------------------------------------------------
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "**/*.stories.tsx",
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/tests/**",
      "e2e/**",
      ".storybook/**",
      "**/*.config.{ts,mts}",
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      complexity: ["error", 10],
      "max-params": ["error", 4],
      "max-depth": ["error", 4],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
      // Error handling: an unhandled promise is a real bug class (UI handlers/effects).
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "default", format: ["camelCase"], leadingUnderscore: "allowSingleOrDouble" },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allowSingleOrDouble",
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allowSingleOrDouble",
        },
        // PascalCase params = a component passed as a prop (`{ icon: Icon }` → `<Icon/>`).
        {
          selector: "parameter",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allowSingleOrDouble",
        },
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "property", format: null }, // snake_case API/wire fields are legitimate
        { selector: "import", format: null },
      ],
      // Ban debug `console.log`; allow genuine `console.error`/`warn` (error
      // boundaries surface the caught error — there is no in-browser logger).
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },

  // max-lines-per-function does not fit JSX — a React component's render markup
  // legitimately runs long, and splitting it only to satisfy a line count forces
  // sub-component extraction that churns the render tree. `complexity` still
  // enforces the real signal (branching); the line cap stays on .ts logic only.
  { files: ["**/*.tsx"], rules: { "max-lines-per-function": "off" } },
]);

export default eslintConfig;
