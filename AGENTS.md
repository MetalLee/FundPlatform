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

<!-- BEGIN:project-ui-interaction-rules -->
# UI interaction rules

Pages and controls that trigger routing or backend requests must provide clear loading feedback and polished transitions.

- Use the shared route/navigation loading pattern, such as `PendingLink`, for in-app page switches instead of plain links when the navigation is user-triggered from primary UI.
- Add route-level `loading.tsx` skeletons for pages that fetch server data or may wait on Supabase/API calls.
- Buttons that trigger backend requests must show a pending state, disable duplicate submission where appropriate, and expose `aria-busy` for accessibility.
- Page content changes should use subtle motion-safe transitions that do not shift layout or obscure financial data.
- Loading states should use skeletons or compact spinners that match the surrounding shadcn/ui surface; avoid blocking full-screen overlays unless the whole workflow is blocked.
- Respect `prefers-reduced-motion`; animations and transitions must degrade gracefully for reduced-motion users.
<!-- END:project-ui-interaction-rules -->
