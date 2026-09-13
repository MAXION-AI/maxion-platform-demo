import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

export default tseslint.config(
	{
		ignores: ["dist/**", "artifacts/**", "node_modules/**"],
	},
	{
		files: ["**/*.{ts,tsx}"],
		linterOptions: {
			noInlineConfig: true,
			reportUnusedDisableDirectives: "error",
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
			"react-hooks": reactHooks,
		},
		rules: {
			"@typescript-eslint/ban-ts-comment": "error",
			"no-console": "error",
			"no-debugger": "error",
			"no-warning-comments": ["error", { terms: ["todo", "fixme"], location: "anywhere" }],
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "error",
		},
	},
)
