# AGENTS.md

## memory bank 사용 (memory-bank/)
현재 작업 사항에 대해서 progress.md를 확인합니다.
이슈 발생 시 issue.md에 작성합니다.

## 작업 완료 후
작업이 완료되면 memory-bank/를 업데이트 합니다.

## Project Mission

이 프로젝트는 Figma 캘린더 UI를 바탕으로 만든 정적 캘린더 앱을 Supabase 연동 일정 관리 앱으로 확장하는 실습 프로젝트입니다.

최종 목표는 다음입니다.

- 월간 캘린더에서 날짜를 선택할 수 있다.
- 선택한 날짜의 일정 목록을 Supabase에서 읽어온다.
- 새 일정을 추가하면 Supabase DB에 저장된다.
- 새로고침 후에도 저장된 일정이 다시 보인다.
- Figma에서 가져온 작고 정돈된 캘린더 사이드바 분위기를 유지한다.

이 프로젝트는 입문자 강의용 예제입니다. 구현은 과하게 추상화하지 말고, 코드 흐름이 수강생에게 설명 가능해야 합니다.

Supabase 작업을 시작하기 전에는 `SUPABASE_VIBE_CODER_GUIDE.md`를 먼저 읽고, 그 문서의 초보자용 작업 순서, 안전 규칙, 프롬프트 흐름을 따르세요.

## Current Stack

- Vanilla HTML, CSS, JavaScript
- No framework
- No bundler
- Current files:
  - `index.html`: app shell and script/style loading
  - `styles.css`: Figma calendar visual styling
  - `script.js`: calendar rendering, mode toggle, agenda rendering

Do not introduce React, Vite, Next.js, Tailwind, TypeScript, or a state-management library unless the user explicitly asks for that migration.

## Product Shape

Preserve the current Figma-inspired visual direction:

- compact white calendar panel
- soft page background
- Poppins/system font stack
- small date buttons
- agenda sections below the mini calendar
- empty state and scheduled state
- accessible buttons and live region behavior

When improving the UI, prefer small practical changes:

- loading state
- save status
- selected date state
- error message
- add event form
- refresh/retry button

Avoid turning this into a dashboard or landing page.

## Supabase MCP Rules

Use Supabase MCP as a database context and inspection tool, not as an uncontrolled database editor.

Before touching app code, use Supabase MCP to confirm:

- the target project is a development or test project
- the MCP server is scoped to the correct `project_ref`
- whether the server is currently in read-only mode
- existing tables, columns, RLS policies, and sample rows

Default MCP workflow:

1. Read the database structure.
2. Summarize what exists.
3. Propose required SQL or data changes.
4. Wait for explicit user approval before running SQL, migrations, destructive queries, or bulk inserts.
5. After approval, apply the smallest necessary DB change.
6. Re-read the affected table or policy and report the result.

Never use Supabase MCP against production data for this lesson. If the connected project looks like production or contains real personal schedules, stop and ask for confirmation.

## Database Model

Prefer this beginner-friendly schema unless the existing Supabase project already has a compatible schema.

### `schedule_categories`

Purpose: category labels and colors for event cards.

Suggested columns:

- `id` uuid primary key
- `name` text not null
- `color_key` text not null
- `sort_order` integer
- `created_at` timestamptz

Suggested `color_key` values should map to the existing UI palette in `script.js`:

- `green`
- `red`
- `gold`
- `mint`
- `violet`
- `blue`

### `schedule_events`

Purpose: actual calendar events.

Suggested columns:

- `id` uuid primary key
- `title` text not null
- `event_date` date not null
- `start_time` time
- `end_time` time
- `category_id` uuid references `schedule_categories(id)`
- `status` text default `'scheduled'`
- `notes` text
- `created_at` timestamptz
- `updated_at` timestamptz

Use `date` for calendar dates and `time` for event times. Avoid converting date-only values through local timezone-sensitive `Date` objects unless carefully normalized.

## Security Rules

- Never put a Supabase `service_role` key in browser code.
- Do not paste secrets into `index.html`, `script.js`, `styles.css`, screenshots, or course materials.
- For browser demos, use the Supabase anon key only with appropriate RLS policies.
- Prefer a local ignored config file such as `supabase-config.js` for real project values.
- Commit only examples or placeholders, for example `supabase-config.example.js`.
- If `.gitignore` is missing and a local config file is introduced, add the ignore rule before creating the real local config.
- Do not log keys, access tokens, cookies, or full MCP auth headers.

## Implementation Guidance

Keep the implementation easy to teach.

Recommended structure inside `script.js`:

- constants for DOM nodes and color styles
- Supabase configuration loading
- database functions:
  - `loadCategories()`
  - `loadEventsForMonth()`
  - `createEvent()`
- state:
  - selected date
  - visible month
  - categories
  - events
  - loading/error/saving state
- render functions:
  - `renderCalendar()`
  - `renderAgenda()`
  - `renderEventForm()`
  - `renderStatusMessage()`
- event handlers:
  - date selection
  - form submit
  - retry/refresh

Separate DOM rendering from Supabase queries where practical, but do not over-engineer with classes or complex abstractions.

## UX Requirements

The app should handle these states:

- initial loading
- no events for selected date
- events found for selected date
- event save in progress
- event save success
- Supabase connection error
- missing config

For errors, show a user-visible message in the app and also keep a concise console error for debugging.

## Accessibility Requirements

- Calendar dates should be buttons.
- The selected date should expose `aria-pressed="true"` or equivalent accessible state.
- Agenda updates should remain inside an `aria-live` region.
- Form inputs need visible labels.
- Focus states must remain visible.
- Do not rely only on color to indicate event category or selected state.

## Styling Rules

- Keep the current compact Figma calendar composition.
- Avoid large hero sections, marketing copy, decorative gradients, or card-heavy dashboard redesigns.
- Keep border radius modest, around 6-8px.
- Ensure the app works at 390px mobile width without horizontal scrolling.
- Do not add decorative blobs, orbs, or unrelated illustrations.

## Supabase SQL Change Policy

When SQL is needed:

- Create or update a SQL file first, preferably under `supabase/schema.sql` or `supabase/seed.sql`.
- Explain what the SQL does in plain Korean.
- Do not run SQL through MCP until the user approves.
- Avoid destructive commands such as `drop table`, `truncate`, or broad `delete` unless the user explicitly asks.
- For RLS, explain the demo policy clearly before applying it.

For this course demo, a simple dev-only RLS policy may be acceptable, but it must be clearly labeled as development/demo-only.

## Verification

After code changes, verify locally.

Recommended commands:

```bash
cd /Users/dante/Desktop/codex-vibecoding/figma-calendar
python3 -m http.server 4175
```

Open:

```text
http://localhost:4175
```

Check manually:

- calendar renders
- selected date changes
- agenda updates for selected date
- add event form validates required fields
- new event appears after save
- reload still shows saved event when Supabase is connected
- empty state still works
- mobile width around 390px has no horizontal scroll
- browser console has no unexpected errors

If `script.js` remains classic non-module JavaScript, run:

```bash
node --check script.js
```

If it is converted to an ES module for Supabase imports, rely on browser module loading plus console verification unless a project-level JS check command is added.

## Reporting Back

When finishing a task, report:

- changed files
- Supabase tables or policies inspected
- SQL proposed or executed
- whether MCP was read-only or write-enabled
- local verification performed
- remaining risks or manual steps

Keep the summary beginner-friendly because this project is used for teaching.
