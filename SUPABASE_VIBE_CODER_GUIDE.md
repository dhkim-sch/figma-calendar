# Supabase 첫 사용 가이드 for 바이브 코더

이 문서는 `/Users/dante/Desktop/codex-vibecoding/figma-calendar` 프로젝트를 Supabase와 연결하려는 수강생을 위한 안내서입니다.

목표는 어렵게 백엔드를 배우는 것이 아닙니다. 목표는 아주 단순합니다.

> 캘린더에 일정을 추가하면, 새로고침해도 일정이 사라지지 않게 만들기.

Supabase는 이 목표를 위해 사용하는 "앱이 기억해야 할 데이터를 저장하는 곳"입니다.

## 1. Supabase를 처음 볼 때의 mental model

처음에는 Supabase를 이렇게 생각하면 됩니다.

- Supabase 프로젝트 = 앱 하나를 위한 작은 백엔드 공간
- Database = 데이터를 담는 표들의 모음
- Table = 시트 하나
- Column = 세로 항목
- Row = 데이터 한 줄
- SQL = 표에게 요청하는 문장
- API key = 내 앱이 Supabase에 접근할 때 쓰는 출입증
- RLS = 어떤 사용자가 어떤 줄을 읽고 쓸 수 있는지 정하는 규칙

이 캘린더 앱에서는 Auth, Storage, Edge Function까지 한 번에 배우지 않습니다.

이번 실습의 범위는 다음 3개입니다.

1. 일정 테이블 만들기
2. 브라우저 앱에서 일정 읽기
3. 브라우저 앱에서 새 일정 저장하기

## 2. Supabase를 쓰기 전에 절대 하지 말 것

처음 Supabase를 쓸 때 가장 중요한 것은 기능보다 안전입니다.

하지 말아야 할 것:

- production 프로젝트에 MCP를 바로 연결하지 않기
- 실제 개인 일정이나 고객 데이터를 강의 실습에 넣지 않기
- `service_role` key 또는 `sb_secret_...` key를 브라우저 코드에 넣지 않기
- Codex가 제안한 SQL을 읽지 않고 바로 실행하지 않기
- RLS가 꺼진 테이블을 공개 브라우저 앱에 연결하지 않기
- `drop table`, `truncate`, broad `delete` 같은 파괴적인 SQL을 실습 중 승인하지 않기

처음에는 반드시 개발용 프로젝트와 더미 데이터만 사용합니다.

## 3. 이번 캘린더 앱의 최종 그림

사용자는 브라우저에서 다음 흐름을 경험합니다.

1. 캘린더 화면이 열린다.
2. 날짜를 클릭한다.
3. 그 날짜의 일정 목록이 보인다.
4. 새 일정 제목과 시간을 입력한다.
5. 저장 버튼을 누른다.
6. Supabase의 `schedule_events` 테이블에 한 줄이 추가된다.
7. 새로고침해도 일정이 다시 보인다.

화면과 데이터는 이렇게 연결됩니다.

| 화면 요소 | Supabase 데이터 |
| --- | --- |
| 날짜 버튼 | `schedule_events.event_date` |
| 일정 제목 | `schedule_events.title` |
| 시작 시간 | `schedule_events.start_time` |
| 카테고리 색상 | `schedule_categories.color_key` |
| 빈 상태 | 선택한 날짜의 일정 row가 0개일 때 |
| 저장 완료 메시지 | `insert` 성공 후 |

## 4. Supabase에서 먼저 만들 것

이 앱은 테이블 2개로 시작하면 충분합니다.

### `schedule_categories`

일정의 종류와 색상을 저장합니다.

예:

| name | color_key |
| --- | --- |
| 업무 | green |
| 회의 | blue |
| 마감 | red |
| 개인 | gold |

### `schedule_events`

실제 일정을 저장합니다.

예:

| title | event_date | start_time | category |
| --- | --- | --- | --- |
| Daily Standup | 2026-01-02 | 08:00 | 업무 |
| Budget Review | 2026-01-02 | 09:00 | 회의 |

## 5. Codex에게 Supabase MCP를 맡길 때의 기본 순서

Supabase MCP는 강력합니다. 그래서 처음부터 "DB 만들어줘"라고 시키지 않습니다.

항상 이 순서로 갑니다.

1. 읽기
2. 요약
3. 제안
4. 사람 확인
5. 승인 후 실행
6. 다시 읽어서 검증

초보자에게 가장 중요한 문장은 이것입니다.

> Codex에게 DB를 맡길 때는 "실행"보다 "읽고 설명하기"가 먼저입니다.

## 6. Supabase MCP 연결 시 확인할 것

가능하면 MCP는 특정 프로젝트로 좁히고, 처음에는 읽기 전용으로 시작합니다.

확인할 것:

- 이 Supabase 프로젝트가 개발용인가?
- `project_ref`가 내가 의도한 프로젝트인가?
- `read_only=true`로 시작할 수 있는가?
- 현재 DB에 어떤 테이블이 있는가?
- 실제 개인정보나 민감한 일정이 들어 있지는 않은가?

Codex에게 이렇게 요청합니다.

```text
Supabase MCP를 사용해서 현재 연결된 프로젝트를 읽기 전용으로 확인해주세요.
아직 SQL 실행, 마이그레이션, 데이터 삽입, 데이터 수정은 하지 마세요.

확인할 것:
- project_ref
- 현재 테이블 목록
- schedule_categories 테이블 존재 여부
- schedule_events 테이블 존재 여부
- RLS 활성화 여부
- 샘플 row가 실제 개인정보인지 더미 데이터인지

결과는 초보자도 이해할 수 있게 요약해주세요.
```

## 7. 처음 만들 SQL은 파일로 먼저 남기기

처음부터 MCP로 SQL을 바로 실행하지 마세요.

먼저 Codex에게 SQL 파일을 만들게 합니다.

추천 요청:

```text
이 프로젝트에 필요한 Supabase SQL 초안을 작성해주세요.
아직 Supabase MCP로 실행하지 마세요.

목표:
- schedule_categories 테이블 생성
- schedule_events 테이블 생성
- RLS 활성화
- 개발 실습용 select/insert policy 제안
- 더미 카테고리와 더미 일정 seed 데이터 추가

파일로 저장할 위치:
supabase/schema.sql

주의:
- production용이 아니라 강의용 개발 프로젝트 기준이라고 주석을 달아주세요.
- 파괴적인 SQL은 넣지 마세요.
- 실행 전 사람이 확인해야 할 부분을 문서 아래에 적어주세요.
```

## 8. 강의용 SQL 예시

아래 SQL은 예시입니다. 실제 실행 전에 Codex와 함께 현재 Supabase 프로젝트 상태를 확인하세요.

```sql
create extension if not exists "pgcrypto";

create table if not exists public.schedule_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color_key text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time time,
  end_time time,
  category_id uuid references public.schedule_categories(id),
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.schedule_categories enable row level security;
alter table public.schedule_events enable row level security;
```

강의용 개발 프로젝트에서 브라우저로 읽기와 추가를 보여주려면 policy가 필요합니다.

아래 policy는 학습용입니다. 누구나 읽고 추가할 수 있으므로 production에 그대로 쓰면 안 됩니다.

```sql
create policy "Demo categories are readable"
on public.schedule_categories
for select
to anon
using (true);

create policy "Demo events are readable"
on public.schedule_events
for select
to anon
using (true);

create policy "Demo events are insertable"
on public.schedule_events
for insert
to anon
with check (true);
```

실제 앱에서는 보통 Supabase Auth를 붙이고, `user_id` 컬럼을 둔 뒤 "본인 일정만 읽고 쓰기" 정책으로 바꿉니다.

## 9. 더미 데이터 넣기

처음에는 실제 일정을 넣지 않습니다.

추천 더미 데이터:

```sql
insert into public.schedule_categories (name, color_key, sort_order)
values
  ('업무', 'green', 1),
  ('회의', 'blue', 2),
  ('마감', 'red', 3),
  ('개인', 'gold', 4)
on conflict (name) do nothing;
```

일정 seed는 category id를 가져와 넣는 방식이 안전합니다.

```sql
insert into public.schedule_events (title, event_date, start_time, category_id, notes)
select 'Daily Standup', '2026-01-02', '08:00', id, '강의용 더미 일정'
from public.schedule_categories
where name = '업무'
limit 1;
```

## 10. 브라우저 앱에서 필요한 키 이해하기

브라우저 앱에 넣어도 되는 것은 공개용 키입니다.

현재 Supabase 문서 기준으로는 새 프로젝트에서 `sb_publishable_...` 형태의 publishable key를 우선 고려합니다. 기존 프로젝트나 일부 환경에서는 legacy `anon` key를 사용할 수 있습니다.

브라우저에 넣으면 안 되는 것:

- `sb_secret_...`
- `service_role`
- database password
- access token
- MCP OAuth/PAT 값

정리하면:

| 키 종류 | 브라우저 사용 | 설명 |
| --- | --- | --- |
| publishable key | 가능 | 공개 클라이언트용 |
| legacy anon key | 가능 | publishable key의 이전 방식 |
| secret key | 불가 | 서버/Edge Function용 |
| service_role key | 절대 불가 | RLS를 우회하는 관리자 키 |

## 11. 정적 앱에서 Supabase 연결하는 방법

이 프로젝트는 번들러가 없는 정적 앱입니다.

가장 쉬운 방식은 Supabase JS를 CDN으로 불러오는 것입니다.

`index.html`에 Supabase JS와 로컬 설정 파일을 먼저 불러오고, 그 다음 `script.js`를 불러옵니다.

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./supabase-config.js"></script>
<script src="./script.js?v=20260503"></script>
```

`supabase-config.js`는 실제 키가 들어갈 수 있으므로 git에 올리지 않는 것이 좋습니다.

예시:

```js
window.FIGMA_CALENDAR_SUPABASE = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "sb_publishable_...",
};
```

대신 공유용 예시는 이렇게 만듭니다.

`supabase-config.example.js`

```js
window.FIGMA_CALENDAR_SUPABASE = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "YOUR_PUBLISHABLE_KEY",
};
```

그리고 `.gitignore`에는 실제 설정 파일을 추가합니다.

```gitignore
supabase-config.js
```

## 12. Supabase 클라이언트 만들기

`script.js`에서는 이렇게 시작할 수 있습니다.

```js
const supabaseConfig = window.FIGMA_CALENDAR_SUPABASE;

const supabaseClient =
  supabaseConfig?.url && supabaseConfig?.publishableKey
    ? window.supabase.createClient(
        supabaseConfig.url,
        supabaseConfig.publishableKey,
      )
    : null;
```

`supabaseClient`가 `null`이면 앱은 이렇게 동작해야 합니다.

- 캘린더 UI는 계속 보인다.
- "Supabase 설정이 아직 없습니다" 메시지를 보여준다.
- 더미 데이터 또는 빈 상태로 동작한다.
- 콘솔에 친절한 설정 안내를 남긴다.

## 13. 일정 읽기 흐름

처음에는 한 달 전체 데이터를 읽고, 선택한 날짜로 필터링하는 구조가 설명하기 쉽습니다.

예시:

```js
async function loadEventsForMonth(startDate, endDate) {
  if (!supabaseClient) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("schedule_events")
    .select(`
      id,
      title,
      event_date,
      start_time,
      end_time,
      status,
      notes,
      schedule_categories (
        name,
        color_key
      )
    `)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}
```

입문자에게 설명할 포인트:

- `.from("schedule_events")`: 어느 표를 볼지 정한다.
- `.select(...)`: 어떤 컬럼을 가져올지 정한다.
- `.gte`, `.lte`: 날짜 범위를 정한다.
- `.order`: 정렬한다.
- `error`: 실패했을 때 화면에 보여줄 내용이다.

## 14. 일정 저장 흐름

일정 추가는 처음에는 `insert` 하나로 이해하면 됩니다.

```js
async function createEvent(input) {
  if (!supabaseClient) {
    throw new Error("Supabase 설정이 없습니다.");
  }

  const { data, error } = await supabaseClient
    .from("schedule_events")
    .insert({
      title: input.title,
      event_date: input.eventDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      category_id: input.categoryId || null,
      notes: input.notes || null,
    })
    .select(`
      id,
      title,
      event_date,
      start_time,
      end_time,
      status,
      notes
    `)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
```

주의할 점:

- Supabase JS v2에서는 `insert`, `update`, `upsert`, `delete`가 기본적으로 변경된 row를 반환하지 않습니다.
- 저장 후 row를 바로 받고 싶으면 `.select()`를 이어 붙입니다.
- `.select()`를 붙이면 RLS에서 select 권한도 필요합니다.

## 15. Codex에게 앱 구현을 맡기는 프롬프트

처음 구현 요청은 이렇게 합니다.

```text
AGENTS.md와 SUPABASE_VIBE_CODER_GUIDE.md를 기준으로
이 정적 캘린더 앱에 Supabase 연동을 추가해주세요.

조건:
- React, Vite, Tailwind를 추가하지 마세요.
- 현재 Figma 캘린더 디자인 톤을 유지해주세요.
- service_role key나 secret key를 브라우저 코드에 넣지 마세요.
- 실제 키는 supabase-config.js에서 읽고, 예시는 supabase-config.example.js로 만들어주세요.
- supabase-config.js는 gitignore에 넣어주세요.
- Supabase 설정이 없을 때도 화면이 깨지지 않게 해주세요.
- 일정 읽기, 일정 추가, 로딩, 에러, 저장 성공 상태를 구현해주세요.

먼저 수정 계획을 보여주고, 제가 승인하면 구현해주세요.
```

구현까지 바로 맡길 때는 이렇게 바꿉니다.

```text
위 조건대로 구현까지 진행해주세요.
수정 후 변경 파일, 실행 방법, 브라우저 확인 항목, 남은 Supabase 수동 작업을 요약해주세요.
```

## 16. Supabase MCP로 SQL을 실행하기 전 승인 프롬프트

SQL 실행 전에는 반드시 내용을 확인합니다.

```text
방금 작성한 Supabase SQL을 실행하기 전에 검토해주세요.

확인할 것:
- 어떤 테이블을 만드는가
- 어떤 policy를 만드는가
- anon 또는 publishable key 사용자가 어떤 권한을 갖게 되는가
- production에 그대로 쓰면 위험한 부분은 무엇인가
- 실행해도 기존 데이터가 삭제되지 않는가

아직 실행하지 말고, 승인 여부를 판단할 수 있게 요약만 해주세요.
```

승인 후:

```text
이 SQL은 개발용 Supabase 프로젝트에서 실행해도 됩니다.
Supabase MCP로 적용한 뒤, 테이블 목록과 RLS policy가 만들어졌는지 다시 확인해주세요.
```

## 17. 브라우저에서 확인할 것

로컬 서버를 엽니다.

```bash
cd /Users/dante/Desktop/codex-vibecoding/figma-calendar
python3 -m http.server 4175
```

브라우저:

```text
http://localhost:4175
```

체크리스트:

- 캘린더가 보인다.
- Supabase 설정이 없을 때도 화면이 깨지지 않는다.
- 설정이 있을 때 일정 목록을 읽어온다.
- 날짜를 클릭하면 선택 상태가 바뀐다.
- 선택한 날짜에 맞는 일정이 보인다.
- 새 일정 추가 폼이 보인다.
- 제목 없이 저장하면 안내 메시지가 나온다.
- 정상 저장 후 일정이 목록에 추가된다.
- 새로고침 후에도 일정이 남아 있다.
- 콘솔에 예상하지 못한 에러가 없다.
- 모바일 390px 폭에서 가로 스크롤이 없다.

## 18. 자주 만나는 오류

### 1. 아무 일정도 안 보인다

가능한 원인:

- 테이블에 데이터가 없다.
- 날짜 범위가 잘못됐다.
- RLS select policy가 없다.
- 다른 Supabase 프로젝트에 연결했다.
- `supabase-config.js`가 로드되지 않았다.

Codex에게 물어볼 프롬프트:

```text
일정이 화면에 보이지 않습니다.
코드는 수정하지 말고 원인 후보를 점검해주세요.

확인할 것:
- supabase-config.js 로드 여부
- Supabase URL/key 존재 여부
- schedule_events 테이블명
- event_date 날짜 범위
- RLS select policy
- 브라우저 콘솔 에러
```

### 2. 저장이 안 된다

가능한 원인:

- insert policy가 없다.
- 필수 컬럼이 빠졌다.
- `category_id`가 존재하지 않는 uuid다.
- 시간 형식이 잘못됐다.
- `.select()`를 붙였는데 select policy가 없다.

### 3. service_role key를 넣으라고 한다

브라우저 앱에서는 거절해야 합니다.

Codex에게 이렇게 말합니다.

```text
브라우저 앱에는 service_role key를 넣지 않는 방향으로 다시 설계해주세요.
publishable key 또는 legacy anon key와 RLS policy를 사용하는 구조로 설명해주세요.
```

### 4. `file://`로 열었더니 이상하다

정적 앱도 Supabase와 외부 CDN을 쓰면 로컬 서버로 여는 편이 안전합니다.

```bash
python3 -m http.server 4175
```

## 19. 처음 Supabase를 쓰는 바이브 코더의 작업 루틴

매번 이 순서를 반복하면 됩니다.

1. 내가 만들 기능을 한 문장으로 쓴다.
2. 그 기능에 필요한 데이터를 표로 그린다.
3. Codex에게 테이블 구조를 제안하게 한다.
4. SQL은 파일로 먼저 만든다.
5. MCP로 DB 상태를 읽는다.
6. SQL을 읽고 위험한 부분을 확인한다.
7. 승인 후 개발용 프로젝트에만 적용한다.
8. 브라우저에서 읽기 기능을 먼저 확인한다.
9. 그 다음 추가/수정/삭제를 붙인다.
10. 새로고침 후에도 데이터가 유지되는지 본다.

## 20. 이번 앱의 성공 기준

이 실습은 "Supabase를 완벽히 배웠다"가 목표가 아닙니다.

성공 기준은 다음입니다.

- Supabase가 앱의 데이터를 저장하는 곳이라는 감각을 얻었다.
- 테이블, 컬럼, 로우를 화면 요소와 연결할 수 있다.
- Codex에게 DB 작업을 바로 실행시키지 않고, 먼저 읽고 계획하게 할 수 있다.
- 공개 키와 관리자 키를 구분할 수 있다.
- RLS가 왜 필요한지 설명할 수 있다.
- 브라우저에서 읽기와 추가를 직접 검증할 수 있다.

## 21. 최신성 메모

확인일: 2026-05-03

이 문서는 Supabase 공식 문서를 기준으로 작성했습니다.

- Supabase MCP는 LLM 도구가 Supabase 프로젝트를 조회하고 조작할 수 있게 하는 연결 방식입니다.
- MCP는 `project_ref`로 프로젝트 범위를 좁힐 수 있고, `read_only=true`로 읽기 전용 모드를 사용할 수 있습니다.
- Supabase는 MCP를 production 데이터가 아니라 개발/테스트 프로젝트에 사용하라고 권장합니다.
- 현재 Supabase는 브라우저 같은 공개 클라이언트에는 `sb_publishable_...` publishable key를 우선 안내하며, legacy `anon` key도 일부 환경에서 계속 사용됩니다.
- `service_role` 또는 secret key는 RLS를 우회할 수 있으므로 브라우저에 넣으면 안 됩니다.
- RLS가 켜진 테이블은 policy가 없으면 공개 키로 API 접근이 되지 않습니다.

참고:

- Supabase MCP: https://supabase.com/docs/guides/getting-started/mcp
- Supabase API Keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JavaScript Installing: https://supabase.com/docs/reference/javascript/installing
- Supabase JavaScript Insert: https://supabase.com/docs/reference/javascript/insert
- Supabase JavaScript Return data after inserting: https://supabase.com/docs/reference/javascript/db-modifiers-select
