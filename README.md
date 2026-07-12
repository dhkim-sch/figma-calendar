# Figma Calendar + Supabase

Figma Community의 **Responsive Calendar** 디자인을 바탕으로 만든 Vanilla HTML/CSS/JavaScript 일정 관리 앱입니다. 날짜를 선택하고 일정을 추가하면 개발용 Supabase 프로젝트에 사용자별로 저장할 수 있습니다.

## 주요 기능

- 현재 월 기준 월간 캘린더와 이전·다음 월 이동
- 날짜 선택 및 선택한 날짜의 일정 목록
- 일정 제목, 시작·종료 시간, 카테고리, 메모 저장
- Supabase 익명 인증과 사용자별 RLS
- Cloudflare Turnstile 또는 hCaptcha 보안 확인
- 일정 없음, 로딩, 저장, 성공, 연결 오류 상태
- 설정이 없어도 깨지지 않는 로컬 화면
- 390px 모바일과 키보드 접근성 대응

## 폴더 구조

- [`index.html`](./index.html) — 앱 화면과 Supabase CDN 로딩
- [`styles.css`](./styles.css) — Figma 분위기의 BEM 기반 반응형 스타일
- [`script.js`](./script.js) — 캘린더 렌더링, 익명 인증, 일정 조회·저장
- [`supabase-config.example.js`](./supabase-config.example.js) — 공개 설정 예시
- [`supabase/schema.sql`](./supabase/schema.sql) — 테이블, RLS 정책, 기본 카테고리 SQL 초안
- [`.gitignore`](./.gitignore) — 실제 로컬 설정과 생성 파일 제외

실제 키를 넣는 `supabase-config.js`는 Git에서 추적하지 않습니다.

## 로컬에서 실행하기

별도 패키지 설치나 빌드 과정이 필요하지 않습니다.

```bash
cd /Users/dhkim/Documents/Codex/figma-calendar
python3 -m http.server 4175
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:4175
```

서버를 종료하려면 실행한 터미널에서 `Control + C`를 누릅니다.

## Supabase 연결 준비

이 앱은 실제 개인정보가 없는 **개발 또는 교육용 프로젝트**에서만 사용하세요.

1. Supabase Dashboard에서 개발용 프로젝트를 준비합니다.
2. Authentication 설정에서 **Anonymous Sign-Ins**를 활성화합니다.
3. [`supabase/schema.sql`](./supabase/schema.sql)을 읽고 테이블과 RLS 정책을 검토합니다.
4. 검토·승인 후 개발 프로젝트의 SQL Editor에서 스키마를 적용합니다.
5. 설정 예시를 로컬 설정 파일로 복사합니다.

```bash
cp supabase-config.example.js supabase-config.js
```

6. `supabase-config.js`에 개발 프로젝트 값을 입력합니다.

```js
window.FIGMA_CALENDAR_SUPABASE = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "sb_publishable_...",
  captcha: {
    provider: "turnstile",
    siteKey: "CAPTCHA_SITE_KEY",
  },
};
```

기존 프로젝트에서는 legacy `anon` key도 사용할 수 있습니다. 앱은 `sb_secret_`, `service_role` 역할의 JWT, 잘못된 URL을 감지하면 연결을 중단합니다.

## CAPTCHA 설정

Supabase Dashboard에서 설정한 CAPTCHA 공급자와 앱 설정의 `provider`가 반드시 같아야 합니다.

1. Cloudflare Turnstile 또는 hCaptcha에서 사이트를 만들고 site key와 secret key를 발급합니다.
2. Supabase Dashboard의 Authentication 보안 설정에서 같은 공급자를 선택하고 **secret key**를 등록합니다.
3. 브라우저용 `supabase-config.js`에는 공개 가능한 **site key만** 입력합니다.
4. `provider`는 `turnstile` 또는 `hcaptcha` 중 하나로 지정합니다.
5. 로컬 테스트를 위해 공급자 설정의 허용 도메인에 `localhost`와 `127.0.0.1`을 추가합니다.

```js
captcha: {
  provider: "turnstile", // 또는 "hcaptcha"
  siteKey: "공개_SITE_KEY",
}
```

CAPTCHA secret key는 Supabase Dashboard에만 저장하며 `supabase-config.js`에 넣지 않습니다. 기존 익명 세션이 있으면 위젯을 표시하지 않고, 새 익명 사용자를 만들 때만 CAPTCHA가 나타납니다.

### `invalid-input-response` 오류

Turnstile 확인은 성공했지만 Supabase에서 `invalid-input-response`를 반환하면 다음 값을 다시 맞춰야 합니다.

- 앱의 `captcha.provider`가 Supabase Dashboard의 CAPTCHA provider와 같은지 확인
- `supabase-config.js`의 site key와 Supabase에 입력한 secret key가 **같은 Turnstile/hCaptcha 위젯에서 발급된 한 쌍**인지 확인
- 테스트 site key와 운영 secret key를 섞지 않았는지 확인
- 공급자의 허용 도메인에 현재 실행 주소가 포함되어 있는지 확인

설정을 고친 뒤 화면의 `다시 확인하기`를 누르세요. 인증 실패 시 앱은 자동 재시도하지 않으므로 반복 요청이 발생하지 않습니다.

## 데이터 보안

`schedule_events.user_id`는 Supabase Auth의 사용자 ID를 저장합니다. 익명 로그인 사용자도 `authenticated` 역할로 요청하며, RLS 정책은 다음 작업만 허용합니다.

- 모든 인증 사용자가 기본 카테고리를 읽기
- 로그인한 사용자가 자신의 일정만 읽기
- 로그인한 사용자가 자신의 일정만 추가하기

일정 수정·삭제 권한은 이번 버전에 포함하지 않습니다. 브라우저 코드에는 절대로 secret key, `service_role` key, DB 비밀번호를 넣지 마세요.

## 연결 전 동작

`supabase-config.js`가 없거나 placeholder 상태여도 월간 캘린더와 일정 폼은 표시됩니다. 저장 버튼을 누르면 네트워크 요청 없이 연결 설정이 필요하다는 안내가 나타납니다.

CAPTCHA 설정이 있으면 보안 확인 위젯을 통과한 뒤 익명 로그인을 시도합니다. site key가 없거나 provider가 일치하지 않으면 연결을 중단하고 설정 안내를 표시합니다.

## 검증

JavaScript 문법을 확인합니다.

```bash
node --check script.js
```

브라우저에서 다음 항목을 확인합니다.

- 날짜 선택과 이전·다음 월 이동
- 설정이 없는 상태의 안내와 빈 일정 화면
- 제목과 시간 입력 검증
- 연결 후 카테고리와 월별 일정 조회
- 새 브라우저 세션에서 CAPTCHA 위젯 표시 및 토큰 인증
- CAPTCHA 만료·오류 후 재시도
- 저장 직후 일정 목록 갱신
- 새로고침 후 일정 유지
- 서로 다른 익명 세션 사이의 일정 격리
- 390px 모바일에서 가로 스크롤 없음
- 브라우저 콘솔의 예상하지 못한 오류 없음

## 참고 문서

- [Supabase 익명 로그인](https://supabase.com/docs/reference/javascript/auth-signinanonymously)
- [Supabase CAPTCHA 보호](https://supabase.com/docs/guides/auth/auth-captcha)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Cloudflare Turnstile 위젯](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [hCaptcha 설정](https://docs.hcaptcha.com/configuration/)
