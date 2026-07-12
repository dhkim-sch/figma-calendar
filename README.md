# Responsive Calendar

Figma Community의 **Responsive Calendar** 두 상태를 바탕으로 만든 React 캘린더 앱입니다.

- 주간 시간표와 일정 카드
- 일정이 있을 때의 그룹형 사이드바
- 검색 결과나 데이터가 없을 때의 빈 상태
- 일정 추가 및 삭제
- 모바일 오버레이 사이드바
- 키보드 포커스와 reduced-motion 대응

## 폴더 구조

```text
figma-calendar/
├── src/
│   ├── App.tsx           # 캘린더 UI, 상태 및 상호작용
│   ├── main.tsx          # React 애플리케이션 진입점
│   └── styles.css        # BEM 기반 반응형 스타일
├── .gitignore            # Git 추적 제외 파일 설정
├── index.html            # Vite HTML 진입점
├── package.json          # 패키지와 실행 스크립트
├── package-lock.json     # npm 패키지 버전 잠금
├── eslint.config.js      # ESLint 검사 설정
├── tsconfig.json         # TypeScript 공통 설정
├── tsconfig.app.json     # React 애플리케이션 TypeScript 설정
├── tsconfig.node.json    # Vite 설정 파일용 TypeScript 설정
├── vite.config.ts        # Vite 개발·빌드 설정
└── README.md             # 프로젝트 안내 문서
```

`npm install` 후 생성되는 `node_modules/`와 `npm run build` 후 생성되는 `dist/`는 Git에서 추적하지 않습니다.

## 실행 환경

- Node.js 20 이상
- npm

## 로컬에서 실행하기

터미널에서 프로젝트 폴더로 이동합니다.

```bash
cd /Users/dhkim/Documents/Codex/figma-calendar
```

처음 실행할 때는 패키지를 설치합니다.

```bash
npm install
```

개발 서버를 실행합니다.

```bash
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:5173
```

개발 서버를 종료하려면 서버를 실행한 터미널에서 `Control + C`를 누릅니다.

## 검사 및 빌드

```bash
# ESLint 검사
npm run lint

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

프로덕션 빌드 결과는 `dist/` 폴더에 생성됩니다.
