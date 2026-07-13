# 2026-07-12 CAPTCHA 토큰 반복 거절

- 증상: Turnstile 확인 성공 후 다음 화면으로 넘어가지 않고 익명 로그인 요청이 반복됨.
- 브라우저/서버 근거: Turnstile은 성공 토큰을 반환하지만 Supabase Auth `/signup`이 `captcha_failed`, `invalid-input-response`로 HTTP 400을 반환함.
- 로컬 설정: `provider=turnstile`, 운영용 Turnstile site key 형식이며 placeholder가 아님.
- 근본 원인: Supabase Authentication의 CAPTCHA provider 또는 secret key가 브라우저에서 사용한 Turnstile 위젯의 site key와 같은 위젯 쌍이 아님.
- 코드 문제: 서버 거절 직후 `reset()`을 자동 호출해 새 토큰과 요청이 반복되는 루프가 있었음.
- 적용한 수정: 자동 reset을 제거하고 오류 메시지와 `다시 확인하기` 수동 버튼을 추가함.
- 남은 외부 설정: Supabase Dashboard에서 provider를 Turnstile로 선택하고, 현재 site key와 같은 Cloudflare Turnstile 위젯에서 발급된 secret key를 저장한 뒤 재시도해야 함.

# 2026-07-12 저장한 일정이 목록에 표시되지 않음

- 증상: 일정 INSERT 뒤 폼에는 성공 메시지가 표시되지만 선택 날짜의 일정 목록이 갱신되지 않을 수 있었음.
- 코드 원인: `loadEventsForVisibleMonth()`가 SELECT 오류 시 `false`를 반환하지만 `createEvent()`가 결과를 확인하지 않고 항상 `일정이 저장되었습니다.`로 덮어썼음.
- 적용한 수정: INSERT 성공 직후 서버 payload를 로컬 일정으로 먼저 추가해 달력과 목록에 즉시 표시함.
- 오류 구분: 월별 SELECT 재조회가 실패하면 로컬 일정은 화면에 유지하고 `저장은 됐지만 목록 재조회 실패` 안내를 표시함.
- 브라우저 검증: 모의 Supabase에서 INSERT 1회, 월별 조회 2회(초기 조회와 저장 후 조회)를 확인했으며, 저장 후 조회를 실패시켜도 일정 1개와 날짜의 `일정 1개` 접근성 라벨이 유지됨.
- 실제 환경 제한: Chrome DevTools의 실제 설정 페이지에서는 새 익명 세션을 위한 Turnstile 수동 확인이 필요했고, Supabase MCP는 transport 오류로 실제 테이블 행과 API 로그를 이번 확인에서 다시 읽지 못했음.

# 2026-07-13 Vercel 배포에서 Supabase 설정 파일 404

- 증상: Production 배포는 성공했지만 `/supabase-config.js` 요청이 HTTP 404여서 앱이 `설정 필요` 상태로 실행됨.
- 원인: 실제 설정 파일은 보안을 위해 `.gitignore`에 포함되어 있고, 기존 Vercel 정적 배포는 Git에 있는 프로젝트 루트 파일만 배포함.
- 부수 문제: 프로젝트 루트를 그대로 배포해 `AGENTS.md`, Supabase 가이드, SQL, `memory-bank` 문서도 공개 URL로 접근할 수 있었음.
- 적용한 수정: `scripts/build.mjs`가 Vercel의 공개 환경변수로 `dist/supabase-config.js`를 생성하고 앱 파일만 `dist/`에 복사하도록 구성함.
- 배포 설정: `vercel.json`에서 `node scripts/build.mjs`와 `outputDirectory: dist`를 지정함.
- 안전장치: 필수 환경변수 누락, 잘못된 Supabase URL, `sb_secret_`, `service_role`, 지원하지 않는 CAPTCHA provider가 감지되면 빌드를 실패시킴.
- 남은 외부 설정: Vercel Production 환경변수 4개 등록, Turnstile 허용 호스트 및 Supabase CAPTCHA secret 쌍 확인, 새 배포 후 실제 저장/새로고침 검증.
