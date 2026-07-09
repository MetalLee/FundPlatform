<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-development-rules -->
# Project development rules

Do not use a brainstorming workflow for later development work in this repository. When the requested change is clear, inspect the relevant code, make the change, and verify it directly.
<!-- END:project-development-rules -->

<!-- BEGIN:project-i18n-rules -->
# UI i18n rules

All user-facing UI text in `apps/web` must support both Chinese and English.

- Put page, navigation, component label, action, status, empty/error/loading, and mock-data text in `apps/web/app/[lang]/dictionaries.ts`.
- Pages under `apps/web/app/[lang]/` must read copy from `getDictionary(lang)` and pass localized labels into shared components.
- Shared UI components must not hardcode display text when the text is visible to users; accept labels, title, description, or children from callers instead.
- When adding a new route or component, add Chinese and English copy in the same change and verify both `/zh/...` and `/en/...` routes.
<!-- END:project-i18n-rules -->
