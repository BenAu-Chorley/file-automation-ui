# UI Alignment Migration Guide

## Purpose

Use this guide when migrating another application so its UI, styling, layout, and interaction patterns align with the CSRC Internal frontend.

This document is written for two audiences:

- Copilot in a fresh session that needs enough context to plan and implement the migration.
- An engineer reviewing or steering the migration work.

This guide is intentionally generic so it can be reused for future applications that use a similar frontend stack.

## Scope

### In scope

- Visual alignment to the Internal frontend's shared design language.
- Theme tokens, colours, surfaces, borders, radii, and dark-mode behaviour.
- Shared layout patterns such as app shell, page headers, form pages, and responsive list/table behaviour.
- Shared UI component conventions such as buttons, form fields, feedback states, and page-level composition.
- UX consistency for loading, error, empty, and navigation states.
- Planning and sequencing the migration in a way that reduces rework.

### Out of scope

- Migrating logos, favicons, or other brand assets by default.
- Rewriting backend behaviour or feature business logic unless a UI migration cannot proceed without a small supporting change.
- Recreating this application's exact route structure in the target app when the target app has different domain needs.

## Read This First

If you are Copilot in a new session, use this order:

1. Read this guide fully before proposing changes.
2. Inspect the target application's stack and constraints.
3. Compare the target application's layout, theming, component library, and form stack against the reference system described below.
4. Produce a migration plan before editing code.
5. Migrate shared foundations first, then page scaffolds, then feature-specific screens.
6. Validate each migrated slice immediately with the narrowest available checks.

## Reference System Source Of Truth

These files define the Internal frontend conventions that future migrations should mirror.

| Area | Source files | Why they matter |
| --- | --- | --- |
| Stack and validation commands | `package.json` | Defines runtime, tooling, and the standard lint, typecheck, and test commands. |
| Global Next.js behaviour | `next.config.ts` | Defines the `/internal` base path, security headers, and rewrite assumptions that affect UI integration. |
| Root composition | `src/app/layout.tsx`, `src/context/app-providers.tsx` | Defines how providers are mounted and which app-wide contexts are always present. |
| Theme and tokens | `src/app/globals.css`, `tailwind.config.ts`, `src/context/theme-provider.tsx` | Defines semantic tokens, dark mode, and Tailwind token mapping. |
| Class composition | `src/lib/utils.ts` | Defines the `cn()` helper pattern used across shared components. |
| Authenticated shell | `src/app/(protected)/layout.tsx`, `src/components/layout/auth-gate.tsx`, `src/components/layout/app-shell.tsx` | Defines the protected route shell, loading and redirect behaviour, and the main navigation experience. |
| Navigation model | `src/config/navigation/main-navigation.ts` | Defines the information architecture and access-controlled navigation items. |
| Page structure | `src/components/patterns/page-shell.tsx`, `src/components/layout/page-form-frame.tsx` | Defines the standard page spacing, headers, and form-page composition. |
| Shared UI components | `src/components/ui/button.tsx`, `src/components/ui/*` | Defines the common primitive layer and variant patterns. |
| Shared form layer | `src/components/forms/index.ts`, `src/components/forms/form-field-shell.tsx` | Defines the standard field wrappers and exported form building blocks. |
| Shared feedback and list states | `src/components/feedback/status-feedback.tsx`, `src/components/patterns/responsive-data-table.tsx` | Defines message tones, empty and error states, and responsive desktop/mobile data presentation. |

## Reference System Overview

### Technical baseline

The Internal frontend currently uses:

- Next.js 16 App Router.
- React 19.
- TypeScript in strict mode.
- Tailwind CSS v4.
- Radix UI primitives wrapped in shared components.
- React Hook Form for forms.
- TanStack Query for server state.
- `next-themes` for dark-mode switching.
- `class-variance-authority` for component variants.
- `clsx` plus `tailwind-merge` via `cn()` for class composition.

This matters because a target application may support one of three migration shapes:

- Direct adoption: the target stack is close enough that shared patterns can be ported with minor adaptation.
- Visual adaptation: the target stack differs, so the migration should preserve the look and behaviour without copying component internals directly.
- Hybrid migration: shared tokens and layout patterns can be ported directly, while feature components need target-specific adapters.

### App-wide provider contract

The root app composition is:

1. `ThemeProvider`
2. `QueryClientProvider`
3. `AuthProvider`

This order matters because many protected screens assume theme state, query state, and authenticated user state are available globally.

### Security and implementation constraints

The Internal frontend is opinionated about styling and security:

- Styling is class-based rather than inline-style based.
- The repo has a CSP style scan command that checks for `style={}` usage, `<style>` blocks, and `next/image` imports.
- Future migrations should preserve the same discipline even if the target app is less strict, because the goal is consistency with this frontend's implementation model as well as its visuals.

## Design Tokens And Styling Rules

### Token model

The design system is driven by semantic CSS variables in `src/app/globals.css`, then mapped into Tailwind in `tailwind.config.ts`.

Primary semantic tokens include:

- `background`
- `foreground`
- `card`
- `popover`
- `primary`
- `secondary`
- `muted`
- `accent`
- `destructive`
- `border`
- `input`
- `ring`
- `teams.brand`
- `teams.brandAlt`
- `teams.surface`
- `teams.surfaceAlt`

Use the semantic meaning of a token, not the raw HSL value, when translating the design into a target app.

### Radius model

The border-radius system is based on a single root token:

- `--radius: 0.6rem`

Tailwind then derives:

- `lg = var(--radius)`
- `md = calc(var(--radius) - 2px)`
- `sm = calc(var(--radius) - 4px)`

If the target app uses its own radius tokens, map them to this shape rather than hard-coding individual component radii.

### Dark mode

Dark mode is class-based, using `next-themes` with `attribute="class"` and `defaultTheme="system"`.

Migration rule:

- Preserve the semantic token model across light and dark themes.
- Do not build separate one-off component colours for dark mode.
- Do not rely on component-local overrides when the token layer can express the same intent.

### Typography and spacing conventions

The repo does not define a heavy custom typography scale. It largely relies on Tailwind defaults plus repeated conventions.

Common patterns include:

- Page titles: `text-2xl` to `sm:text-3xl`, `font-semibold`, `tracking-tight`
- Body labels and buttons: `text-sm`, `font-medium`
- Helper text and descriptions: `text-xs`, `text-muted-foreground`
- Dense internal spacing: `space-y-2`
- Page and section spacing: `space-y-4` and `space-y-6`

Migration rule:

- Match these conventions consistently rather than overdesigning a new scale.
- When a target app already has a typographic system, align it to these patterns at the component level before rewriting every screen.

### Class composition

Shared components use a `cn()` helper that combines `clsx` and `tailwind-merge`.

Migration rule:

- Preserve a single standard class-composition helper in the target app.
- Avoid manual string concatenation when variants or conditional styling are involved.

### Styling do/don't rules

Do:

- Use semantic tokens.
- Prefer shared utility classes and component variants.
- Let shared primitives own repeated visual decisions.

Do not:

- Hard-code colours where a semantic token exists.
- Introduce inline styles unless the target app has a compelling technical reason and the exception is deliberate.
- Create duplicate button, input, or card styles for single features when the shared layer can be extended.

## Layout And Navigation Contracts

### Protected route shell

Protected pages are composed through:

1. `src/app/(protected)/layout.tsx`
2. `AuthGate`
3. `AppShell`

The important behaviour is not only visual. The shell also defines:

- The loading state while authentication resolves.
- Redirect behaviour for unauthenticated users.
- Recovery of post-login navigation.

Migration rule:

- Align shell behaviour before polishing feature screens. If the target app has a different auth mechanism, preserve the same user-facing loading and redirect experience where practical.

### App shell pattern

The app shell provides:

- A sticky header.
- Primary navigation in a sidebar on large screens.
- A sheet-based navigation panel on smaller screens.
- A compact/expanded sidebar toggle on desktop.
- Theme toggle, user profile access, and sign-out controls in the header.

The shell uses cards, borders, muted surfaces, and accent/primary states to create hierarchy rather than heavy decorative styling.

Migration rule:

- Recreate the hierarchy first: sticky header, card-based sidebar, responsive navigation treatment, and a consistent main content region.
- Avoid feature-by-feature layout drift. The shell should feel like a single shared frame around all protected screens.

### Navigation model

Navigation items are centrally defined and may be filtered by user group membership.

Behaviour to preserve:

- Active item detection supports exact matches and child-route matches.
- Active items receive differentiated border, background, and text treatments.
- Non-active items use softer hover states rather than competing for attention.

Migration rule:

- Keep the information architecture centralised.
- Do not scatter navigation definitions throughout page files.

### Page shell pattern

Pages commonly use:

- `PageShell` for page-level vertical spacing.
- `PageHeader` for title, description, and actions.
- `PageFormFrame` for separating form content from its actions.

Migration rule:

- Move the target app onto shared page framing before doing detailed restyles.
- Standard page structure creates most of the perceived consistency users notice.

## Shared Component And UX Inventory

### Button contract

The shared button layer uses `class-variance-authority` with these core variants:

- `default`
- `secondary`
- `outline`
- `ghost`

And these common sizes:

- `default`
- `sm`
- `lg`
- `icon`

Expected behaviour includes:

- Clear focus-visible states.
- Consistent rounded corners.
- Reduced opacity for disabled states.
- Small press feedback through `active:scale-[0.99]`.

Migration rule:

- Normalise button variants early. If buttons are inconsistent across the target app, every page will continue to feel mismatched even after layout changes.

### Form field contract

`FormFieldShell` defines a repeatable field layout:

1. Label
2. Required indicator when applicable
3. Input control
4. Description text when present
5. Footer content when needed
6. Error text when no custom footer is used

Supporting conventions:

- Labels are `text-sm font-medium`.
- Descriptions use `text-xs text-muted-foreground`.
- Errors use `text-xs text-destructive`.
- Internal field spacing uses `space-y-2`.

The exported form layer in `src/components/forms/index.ts` includes both standalone field components and React Hook Form-integrated wrappers.

Migration rule:

- Unify field rendering first. Mixed label spacing, helper text placement, and error treatment are a common source of visual inconsistency.

### Feedback states

`status-feedback.tsx` defines two lightweight feedback patterns:

- `InlineFeedback`
- `ListStatePanel`

Tone model:

- `neutral`
- `success`
- `error`

Migration rule:

- Reuse a small tone system rather than inventing bespoke empty-state and error-state components per feature.

### Responsive data table pattern

`ResponsiveDataTable` is a strong reference pattern for list-heavy screens.

Desktop behaviour:

- Standard table layout.
- Built-in loading, error, and empty states.
- Optional row actions.
- Optional clickable rows.

Mobile behaviour:

- Each row becomes a bordered card.
- Cards show a strong title, optional badge, then label/value pairs.
- Row actions can appear beneath the content.

Interaction behaviour to preserve:

- Keyboard support for row navigation.
- Interactive child elements do not accidentally trigger row navigation.
- Selected or active rows receive a distinct accent treatment.

Migration rule:

- If the target app has desktop-only data tables, fixing responsive list behaviour is a high-value alignment task.

### General primitive layer

The shared `src/components/ui` layer includes the standard primitives that most screens should build on:

- `alert`
- `button`
- `card`
- `checkbox`
- `dialog`
- `dropdown-menu`
- `form`
- `input`
- `select`
- `separator`
- `sheet`
- `skeleton`
- `switch`
- `tabs`
- `textarea`
- `toast`

Migration rule:

- Prefer extending this layer or building equivalents in the target app before restyling entire feature areas.

## UX Conventions To Preserve

These conventions are part of the Internal frontend's feel, even when they are not captured in a formal design system.

### Loading states

- Route-level loading states should feel deliberate, not like blank screens.
- Shared skeletons or status panels should be used consistently.

### Error states

- Error states should be visible, concise, and placed where the user can act on them.
- Retry actions should appear close to the failed content when applicable.

### Empty states

- Empty states should explain the absence of data without overwhelming the page.
- Reuse shared panel patterns where possible.

### Interaction density

- Interfaces favour clear grouping, moderate whitespace, and restrained accents.
- Borders and subtle background shifts provide structure more often than strong fills.

### Accessibility

- Focus-visible states matter.
- Active navigation should expose `aria-current`.
- Interactive rows should remain keyboard-usable.
- Labels and action names should stay explicit.

## Migration Workflow For A Target Application

Use this sequence unless the target app has a strong technical constraint that forces a different order.

### Phase 1: Audit the target app

Gather the minimum information needed to plan accurately:

- Framework and router model.
- Styling approach.
- Theme mechanism.
- Component library or design system in use.
- Form library.
- Data table or list patterns.
- Auth and protected-route shell model.
- Test and validation commands.
- Any CSP or security constraints that affect styling.

Output from this phase:

- A gap analysis against this guide.
- A migration plan ordered by shared foundations first.

### Phase 2: Map foundations

Identify the target app's equivalents for:

- Global layout shell.
- Theme tokens.
- Base primitives such as buttons, inputs, cards, alerts, and dialogs.
- Form wrappers.
- Shared feedback states.
- Tables and mobile list behaviour.

Decide which parts should be:

- Ported directly.
- Reimplemented visually in the target stack.
- Left alone because they already match closely enough.

### Phase 3: Migrate tokens and shared primitives

Do this before feature pages.

Priority order:

1. Theme tokens and dark mode.
2. Button, card, input, select, textarea, checkbox, alert, dialog, tabs, sheet.
3. Shared class composition helper.
4. Shared form-field wrapper.
5. Shared feedback and list-state components.

Why this order matters:

- Feature screens will be cheaper to align once the shared building blocks already match the reference system.

### Phase 4: Migrate shell and page scaffolding

Bring the target app in line with the reference app shell and page structure:

- Header structure.
- Sidebar and mobile navigation treatment.
- Protected layout wrapper.
- Page shell spacing.
- Page header and form-page framing.

Do not skip this step. If the shell still feels different, the application will not feel aligned even if individual controls match.

### Phase 5: Migrate feature screens

Tackle feature areas screen by screen using the shared foundations already in place.

Within each feature:

1. Replace page framing.
2. Replace local one-off controls with shared primitives.
3. Align forms to the shared field contract.
4. Align tables and list states to the responsive-data-table pattern or an equivalent.
5. Align loading, error, and empty states.
6. Update tests for the touched slice.

### Phase 6: Polish and close gaps

After the structural work is done, close the remaining experience gaps:

- Responsive behaviour.
- Light and dark theme parity.
- Focus states and keyboard navigation.
- Copy consistency for helper text and state messaging.
- Removal of obsolete bespoke styling that no longer matches the shared system.

## Gap Analysis Checklist

Use this checklist when analysing a target app.

### Stack and architecture

- [ ] What framework and router does the target app use?
- [ ] Can the target app support a shared app shell pattern similar to the Internal frontend?
- [ ] Does the target app already have global providers that affect theming, data fetching, or auth?
- [ ] Are there CSP or other security rules that affect styling or image usage?

### Styling and theme

- [ ] Does the target app already use semantic theme tokens?
- [ ] Is dark mode token-driven or component-local?
- [ ] Is there an existing class-composition helper?
- [ ] Are colours hard-coded in feature files that should be converted to semantic tokens?
- [ ] Are radii and spacing consistent enough to map cleanly to the Internal frontend's conventions?

### Shared component layer

- [ ] Is there already a shared button, card, alert, dialog, sheet, tabs, input, select, and textarea layer?
- [ ] Are button variants standardised across the app?
- [ ] Do forms share one field wrapper pattern for labels, helper text, and errors?
- [ ] Are list-state and inline feedback components centralised?

### Page structure and navigation

- [ ] Is navigation centrally configured?
- [ ] Is there a consistent active-nav treatment?
- [ ] Are protected routes wrapped consistently?
- [ ] Do pages share a common title, description, and actions layout?
- [ ] Do form pages separate content from action areas consistently?

### Feature UI patterns

- [ ] Are desktop tables usable on mobile, or do they need a responsive card/list treatment?
- [ ] Are loading states consistent across routes and list views?
- [ ] Are error and empty states styled consistently?
- [ ] Are there one-off controls or patterns that should be replaced with shared primitives?

### Validation and verification

- [ ] What are the narrowest available lint, typecheck, test, and visual verification commands?
- [ ] Which feature areas are high risk because they are form-heavy, data-table-heavy, or auth-gated?
- [ ] Which shared components need tests added or updated as part of the migration?

## Do / Don't Rules

### Do

- Do use semantic tokens as the styling source of truth.
- Do align shared primitives before aligning feature screens.
- Do normalise forms with one field wrapper pattern.
- Do preserve the shell hierarchy and page framing.
- Do keep responsive desktop and mobile treatments intentionally paired.
- Do preserve accessible states such as focus-visible rings, explicit labels, and active navigation semantics.
- Do validate each migrated slice immediately.

### Don't

- Do not treat UI alignment as a reason to rewrite unrelated business logic.
- Do not port logos or brand assets by default.
- Do not hard-code colours or per-feature spacing values when shared tokens or shared layout patterns should own them.
- Do not keep duplicate button, form-field, or feedback implementations if they serve the same purpose.
- Do not postpone responsive and dark-mode review until the end.
- Do not widen the scope from UI alignment into a general product redesign.

## Definition Of Done For A Migration Slice

A migrated slice is done when:

- It uses the target app's aligned token and primitive layer rather than bespoke styling.
- It matches the Internal frontend's page structure and visual hierarchy closely enough to feel consistent.
- It preserves accessibility and keyboard behaviour.
- It has appropriate loading, error, and empty-state treatment.
- It passes the narrowest relevant validation commands.
- Any touched shared component tests are updated or added.

## Verification Guidance

When implementing a migration in a target app, validate with the narrowest relevant checks available.

Preferred order:

1. Focused feature or component tests for the touched slice.
2. Narrow typecheck or lint command if available.
3. Full project `lint`, `typecheck`, or `test` commands when narrower validation is not available.
4. Manual responsive and light/dark review.

For this reference repo, the main commands are:

- `npm run lint`
- `npm run typecheck`
- `npm run test`

Additional constraint to remember:

- `npm run security:csp-style-scan` exists to catch inline-style and related violations.

## Copilot Session Starter Prompt

Use the template below in a fresh Copilot session when you want to apply this guide to a target application.

```text
Read UI-ALIGNMENT-MIGRATION-GUIDE.md first and treat it as the source of truth for matching this application's UI, styling, layout, and interaction patterns.

Target application path: <INSERT TARGET REPO OR FOLDER>
Target application constraints: <INSERT KNOWN STACK / SECURITY / ROUTING / DESIGN-SYSTEM NOTES>
Out of scope: <INSERT ANY EXCLUDED FEATURES OR DOMAINS>

Your task:
1. Inspect the target app's current stack, layout model, theming, component layer, form layer, and list/table patterns.
2. Produce a gap analysis against the Internal frontend reference system.
3. Produce an implementation plan ordered from shared foundations to page scaffolds to feature screens.
4. Implement the migration in small slices, validating each slice immediately with the narrowest available checks.
5. Preserve or improve accessibility, responsive behaviour, and dark-mode consistency.
6. Do not migrate logos or unrelated business logic unless explicitly requested.

When planning and implementing, prioritise these reference areas:
- Theme tokens and styling rules.
- Shared button, card, input, select, textarea, checkbox, alert, dialog, tabs, and sheet primitives.
- Shared form-field wrapper and feedback components.
- Protected app shell, page shell, page header, and form-page frame.
- Responsive data tables or equivalent mobile-friendly list behaviour.

Before making edits, tell me:
- The main structural mismatches with the target app.
- The smallest safe migration sequence.
- The validation plan for each slice.
```

## Notes For Future Maintainers

- Keep this guide updated when the shared styling layer, shell layout, or reusable component contracts change.
- If the repo later introduces a dedicated docs folder, move this file there and leave a pointer at the root.
- If the reference design system becomes more explicit over time, update this guide so future migrations rely less on inferred conventions.
