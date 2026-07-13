# 2026-05-03

- 보안 강화 Supabase v1 구현 계획을 적용했다.
- CDN 기반 `@supabase/supabase-js@2`, 로컬 `supabase-config.js`, 익명 Auth, 사용자 소유권 RLS 모델을 기준으로 앱 코드를 재작성했다.
- 실제 Supabase SQL은 실행하지 않고 `supabase/schema.sql` 초안으로만 추가했다.
- 브라우저에 `sb_secret_`, `service_role`, DB 연결 문자열처럼 보이는 값이 들어오면 연결을 중단하도록 설정 검증을 추가했다.
- `supabase-config.js`는 git에 올리지 않는 로컬 placeholder로 만들었고, 예시값 상태에서는 연결하지 않도록 막았다.
- 달력이 1월 고정으로 멈추지 않도록 이전/다음 월 이동 버튼을 추가하고, 앱 시작 날짜를 현재 날짜 기준으로 바꿨다.
- Supabase가 아직 연결되지 않아도 폼 입력은 가능하게 하고, 저장 시에는 네트워크 호출 없이 연결 필요 메시지를 보여주도록 조정했다.
- Supabase Auth CAPTCHA 보호에 대응하기 위해 Turnstile/hCaptcha site key 설정, 위젯 렌더링, captchaToken 기반 익명 로그인 흐름을 추가했다.
- CAPTCHA 통과 후 Supabase가 토큰을 거절하는 경우 provider/secret key/site key 도메인 확인 메시지가 화면에 뜨도록 오류 상태를 보강했다.
- 남은 작업: 개발용 Supabase 프로젝트에서 SQL 검토/승인/실행, Anonymous Sign-Ins 활성화, 실제 `supabase-config.js` 작성 후 브라우저 저장 흐름 확인.

# 2026-07-12

- 실제 저장소의 React/Vite 앱을 AGENTS.md 기준의 Vanilla HTML/CSS/JavaScript 앱으로 재구축했다.
- 컴팩트 월간 캘린더, 월 이동, 날짜 선택, 일정 있음/빈 상태, 일정 추가 폼, 로딩·저장·성공·오류 상태를 구현했다.
- Supabase JS v2 CDN, 설정 검증, 기존 세션 확인, 익명 로그인, 월별 일정 조회, 일정 추가 흐름을 `script.js`에 구현했다.
- `sb_secret_`, `service_role` 키와 잘못된 Supabase URL이 감지되면 브라우저 연결을 중단하도록 했다.
- `supabase/schema.sql`에 사용자별 `user_id`, RLS select/insert 정책, 기본 카테고리 seed를 비파괴 SQL 초안으로 추가했다.
- 실제 Supabase 프로젝트에는 연결하지 않았고 SQL도 실행하지 않았다.
- `node --check script.js`, 로컬 HTTP 응답, DOM ID 연결, 비밀 키 패턴 검색, `git diff --check`를 통과했다.
- 현재 환경에 브라우저 자동화 런타임이 없어 실제 390px 시각 검증과 브라우저 상호작용 검증은 수행하지 못했다.
- 남은 수동 작업: 개발용 프로젝트에서 SQL 검토·승인·적용, Anonymous Sign-Ins 활성화, 실제 `supabase-config.js` 작성, 두 익명 세션 간 데이터 격리 및 새로고침 영속성 검증.

## CAPTCHA 보강

- Chrome DevTools와 Supabase Auth 로그에서 익명 로그인 실패 원인이 `captcha_token` 누락임을 확인했다.
- 설정형 `captcha.provider`와 `captcha.siteKey` 인터페이스를 추가하고 Turnstile/hCaptcha explicit 위젯을 모두 지원하도록 구현했다.
- 위젯 성공 토큰을 `signInAnonymously({ options: { captchaToken } })`에 전달하도록 변경했다.
- CAPTCHA 스크립트 로드, 토큰 만료, 위젯 오류, Supabase 토큰 거절 상태를 화면에 표시하고 실패 시 위젯을 재설정하도록 했다.
- 기존 익명 세션이 있으면 CAPTCHA를 생략하고, 새 익명 세션이 필요할 때만 위젯을 표시하도록 했다.
- Chrome DevTools에서 Cloudflare 공개 테스트 site key로 Turnstile iframe 렌더링, 토큰 callback, Supabase 전달, 실패 후 위젯 재설정까지 확인하고 테스트 키는 제거했다.
- 실제 project secret과 맞지 않는 테스트 토큰은 예상대로 거절되었고 화면에 provider/site key/secret/허용 도메인 확인 안내가 표시됐다.
- 남은 수동 작업: Supabase Dashboard에 등록한 공급자와 일치하는 공개 site key를 `supabase-config.js`에 입력하고 Chrome에서 실제 토큰 인증을 재검증한다.
- 실제 운영 site key 입력 후에도 Supabase Auth가 `invalid-input-response`를 반환하는 것을 확인했다. Turnstile 성공 후 자동 reset하던 코드를 제거하고 `다시 확인하기` 수동 재시도로 변경해 반복 요청 루프를 차단했다.
- 일정 INSERT 성공 직후 로컬 일정 객체를 추가해 재조회 완료 전에도 선택 날짜와 달력 표시가 즉시 갱신되도록 수정했다.
- 저장 후 월별 SELECT 실패를 무시하고 성공 메시지를 표시하던 문제를 수정해, 저장 성공과 목록 재조회 실패를 별도 상태로 안내하도록 했다.
- Chrome DevTools 모의 Supabase에서 INSERT 1회와 저장 후 SELECT 실패를 재현했으며, 일정 카드 1개, 날짜 `일정 1개` 라벨, 재조회 실패 안내가 함께 유지되는 것을 확인했다.
- 정상 SELECT 경로에서도 INSERT 1회, 초기/저장 후 조회 2회, 일정 카드 1개와 `일정이 저장되었습니다.` 상태를 확인했다.
- `node --check script.js`와 `git diff --check`를 통과했다.
- 실제 Supabase 재검증은 Turnstile 수동 확인과 Supabase MCP transport 복구 후 남아 있다.

# 2026-07-13

- Vercel Production에서 `supabase-config.js`가 404여서 Supabase 연결이 비활성화되는 원인을 확인했다.
- `scripts/build.mjs`를 추가해 Vercel 환경변수에서 브라우저 공개 설정을 만들고 `index.html`, `styles.css`, `script.js`와 함께 `dist/`에 출력하도록 했다.
- 빌드 단계에서 Supabase URL, publishable/legacy anon key, CAPTCHA provider와 site key를 검증하고 secret/service_role 키는 거부하도록 했다.
- `vercel.json`에 빌드 명령과 `dist` 출력 디렉터리를 고정해 프로젝트 문서와 SQL이 배포되지 않도록 했다.
- README에 Vercel 환경변수 4개, 빌드 방법, 배포 파일 목록과 비밀 키 금지 규칙을 추가했다.
- 필수 환경변수 누락과 `sb_secret_` 입력이 빌드를 차단하는지 확인했고, 안전한 테스트 설정에서는 `dist/`에 앱 파일 4개만 생성되는 것을 확인했다.
- `dist/` 정적 서버에서 `/`와 `/supabase-config.js`는 200, `/AGENTS.md`와 `/supabase/schema.sql`은 404를 반환했다.
- `node --check scripts/build.mjs`, `node --check script.js`, `vercel.json` JSON 파싱, `git diff --check`를 통과했다.
- 현재 환경에 `agent-browser` 실행 파일이 없어 이번 변경의 시각적 브라우저 검증은 수행하지 못했다.
- 남은 외부 작업: Vercel Production 환경변수 등록, Cloudflare Turnstile 허용 호스트 등록, Supabase CAPTCHA secret/site key 쌍 확인, 새 배포에서 일정 저장과 새로고침 영속성 검증.
