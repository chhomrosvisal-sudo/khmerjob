# Website and dashboard languages

Use the language selector in the website header, dashboard header, Smart Home header, or sign-in page. Options are **English**, **ខ្មែរ (Khmer)**, and **简体中文 (Simplified Chinese)**. Settings has the same selector. Changes apply immediately without signing out or reloading.

The selected language is saved in browser local storage under `kjm-language`, survives navigation/reloads, and synchronizes between tabs. Invalid saved values fall back to English. If storage is blocked, switching still works for the current page session and a notice explains the limitation. This preference contains no account credentials and applies to everyone using that browser until changed.

The shared React provider covers public pages, authentication/recovery, job-seeker accounts, employer management, admin management, and the separate Smart Home concept. Auth forms, buttons, placeholders, accessibility labels, standard statuses/categories, salary descriptions, date formatting, and known application-update notifications use the selected language. Search filters and submitted API values retain their original IDs/values. Smart Home device search accepts translated and original device names.

Job titles/descriptions, company names/descriptions, uploaded resumes, skill names, and personal information remain in their original language. There is no automatic external translation service and no personal content is sent to a translator. Unknown server/provider messages fall back to their original text. This is interface localization, not translation of arbitrary documents or database content.

## Maintain translations

`frontend/src/i18n/translations.tsv` contains human-authored messages. Each row has three tab-separated columns:

```text
English message or aliases separated by |    Khmer translation    Simplified Chinese translation
```

Use actual tabs between columns. Keep interpolation names such as `{page}` or `{v0}` identical in each translation, although their order may differ. English is the source key. Original names and private content belong in interpolation values, not dictionary keys.

From `frontend`:

```powershell
npm run i18n:build
npm test
npm run test:i18n
npm run test:routes
npm run lint
npm run build
```

The build script validates rows and conflicting aliases and regenerates `src/i18n/messages.js`. Commit both the TSV source and generated catalog. `core.js` provides translation, safe fallback, interpolation, and locale selection. `LanguageContext.jsx` stores the shared preference and renders the selector; `useI18n.js` supplies `t`, `language`, and `locale` to components. Khmer font/line-height adjustments and responsive selector styles are in `language.css`.

Use `t('Message')` in a component that calls `useI18n()`, or `t('Page {page} of {pages}', { page, pages })` for a complete dynamic sentence. Do not translate URL paths, internal state IDs, form values, database keys, or user-entered text. Add an explicit `value` on translated `<option>` elements so browsers submit the unchanged internal value.

## Verification and limits

Node tests check supported locales, complete Khmer/Chinese entries, matching interpolation placeholders, fallback behavior, localized dates/salaries, known notification envelopes, and translated device searches. Server rendering checks public pages, account/admin/employer components, original employer data, and Smart Home in all three languages. These checks do not replace interactive browser testing or professional linguistic review. Native Khmer/Chinese review is recommended before public release. Browser interaction tests have not been executed in this environment.
