import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";

const outputDirectory = "dist";
const publicFiles = ["index.html", "styles.css", "script.js"];

const supabaseUrl = process.env.FIGMA_CALENDAR_SUPABASE_URL?.trim();
const publishableKey =
  process.env.FIGMA_CALENDAR_SUPABASE_PUBLISHABLE_KEY?.trim();
const captchaProvider =
  process.env.FIGMA_CALENDAR_CAPTCHA_PROVIDER?.trim().toLowerCase() ||
  "turnstile";
const captchaSiteKey =
  process.env.FIGMA_CALENDAR_CAPTCHA_SITE_KEY?.trim();

const requiredVariables = {
  FIGMA_CALENDAR_SUPABASE_URL: supabaseUrl,
  FIGMA_CALENDAR_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  FIGMA_CALENDAR_CAPTCHA_SITE_KEY: captchaSiteKey,
};
const missingVariables = Object.entries(requiredVariables)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVariables.length > 0) {
  throw new Error(
    `필수 Vercel 환경변수가 없습니다: ${missingVariables.join(", ")}`,
  );
}

let parsedSupabaseUrl;
try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch {
  throw new Error("FIGMA_CALENDAR_SUPABASE_URL 형식이 올바르지 않습니다.");
}

if (
  parsedSupabaseUrl.protocol !== "https:" ||
  !parsedSupabaseUrl.hostname.endsWith(".supabase.co")
) {
  throw new Error(
    "FIGMA_CALENDAR_SUPABASE_URL은 https://...supabase.co 형식이어야 합니다.",
  );
}

function getJwtRole(key) {
  const parts = key.split(".");
  if (parts.length !== 3) return null;

  try {
    return (
      JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")).role ??
      null
    );
  } catch {
    return null;
  }
}

const jwtRole = getJwtRole(publishableKey);
const isPublishableKey = publishableKey.startsWith("sb_publishable_");
const isLegacyAnonKey = jwtRole === "anon";
const isSecretKey =
  publishableKey.startsWith("sb_secret_") ||
  /service_role/i.test(publishableKey) ||
  jwtRole === "service_role";

if (isSecretKey) {
  throw new Error("브라우저 배포에는 secret 또는 service_role 키를 사용할 수 없습니다.");
}

if (!isPublishableKey && !isLegacyAnonKey) {
  throw new Error(
    "FIGMA_CALENDAR_SUPABASE_PUBLISHABLE_KEY에는 publishable key 또는 legacy anon key를 입력하세요.",
  );
}

if (!["turnstile", "hcaptcha"].includes(captchaProvider)) {
  throw new Error(
    "FIGMA_CALENDAR_CAPTCHA_PROVIDER는 turnstile 또는 hcaptcha여야 합니다.",
  );
}

const browserConfig = {
  url: supabaseUrl,
  publishableKey,
  captcha: {
    provider: captchaProvider,
    siteKey: captchaSiteKey,
  },
};

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of publicFiles) {
  await copyFile(file, `${outputDirectory}/${file}`);
}

await writeFile(
  `${outputDirectory}/supabase-config.js`,
  `window.FIGMA_CALENDAR_SUPABASE = ${JSON.stringify(browserConfig, null, 2)};\n`,
);

console.log(
  `Vercel 배포 파일 ${publicFiles.length + 1}개를 ${outputDirectory}/에 생성했습니다.`,
);
