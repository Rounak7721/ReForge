import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Throwaway verification scripts. Git-ignored, never shipped, and held to
      // a different standard than committed code — linting them turns the
      // pre-commit gate red for files that do not exist in the repo.
      "scripts/_scratch/**",
    ],
  },
];

export default eslintConfig;
