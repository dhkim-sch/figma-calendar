(function () {
  "use strict";

  const COLOR_KEYS = new Set(["green", "red", "gold", "mint", "violet", "blue"]);
  const CAPTCHA_PROVIDERS = {
    turnstile: {
      globalName: "turnstile",
      scriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    },
    hcaptcha: {
      globalName: "hcaptcha",
      scriptUrl: "https://js.hcaptcha.com/1/api.js?render=explicit",
    },
  };
  const MONTH_LABEL = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" });
  const DATE_LABEL = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const elements = {
    connectionBadge: document.querySelector("#connection-badge"),
    connectionStatus: document.querySelector("#connection-status"),
    captchaPanel: document.querySelector("#captcha-panel"),
    captchaWidget: document.querySelector("#captcha-widget"),
    captchaStatus: document.querySelector("#captcha-status"),
    captchaRetry: document.querySelector("#captcha-retry"),
    monthHeading: document.querySelector("#month-heading"),
    calendarGrid: document.querySelector("#calendar-grid"),
    previousMonth: document.querySelector("#previous-month"),
    nextMonth: document.querySelector("#next-month"),
    agendaHeading: document.querySelector("#agenda-heading"),
    agendaContent: document.querySelector("#agenda-content"),
    refreshEvents: document.querySelector("#refresh-events"),
    form: document.querySelector("#event-form"),
    formDateLabel: document.querySelector("#form-date-label"),
    formStatus: document.querySelector("#form-status"),
    titleInput: document.querySelector("#event-title"),
    startInput: document.querySelector("#event-start"),
    endInput: document.querySelector("#event-end"),
    categorySelect: document.querySelector("#event-category"),
    notesInput: document.querySelector("#event-notes"),
    submitButton: document.querySelector("#submit-event"),
    submitLabel: document.querySelector(".primary-button__label"),
  };

  const today = new Date();
  const state = {
    client: null,
    userId: null,
    visibleMonth: new Date(today.getFullYear(), today.getMonth(), 1),
    selectedDate: formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate()),
    categories: [],
    events: [],
    loading: false,
    saving: false,
    loadToken: 0,
    captcha: null,
    captchaWidgetId: null,
    captchaScriptPromise: null,
    authInProgress: false,
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateKey(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function parseDateKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return { year, month, day };
  }

  function dateFromKey(dateKey) {
    const { year, month, day } = parseDateKey(dateKey);
    return new Date(year, month - 1, day);
  }

  function getMonthRange() {
    const year = state.visibleMonth.getFullYear();
    const monthIndex = state.visibleMonth.getMonth();
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();

    return {
      first: formatDateKey(year, monthIndex + 1, 1),
      last: formatDateKey(year, monthIndex + 1, lastDay),
    };
  }

  function selectedDateLabel() {
    return DATE_LABEL.format(dateFromKey(state.selectedDate));
  }

  function setConnectionState(kind, badgeText, message) {
    elements.connectionBadge.className = `connection-badge connection-badge--${kind}`;
    elements.connectionBadge.textContent = badgeText;
    elements.connectionStatus.className = "status-message";

    if (kind === "connected") {
      elements.connectionStatus.classList.add("status-message--success");
    }

    if (kind === "error") {
      elements.connectionStatus.classList.add("status-message--error");
    }

    elements.connectionStatus.textContent = message;
  }

  function setFormStatus(message, kind) {
    elements.formStatus.className = "event-form__status";
    if (kind) {
      elements.formStatus.classList.add(`event-form__status--${kind}`);
    }
    elements.formStatus.textContent = message;
  }

  function setCaptchaStatus(message, kind) {
    elements.captchaStatus.className = "captcha-panel__status";
    if (kind) {
      elements.captchaStatus.classList.add(`captcha-panel__status--${kind}`);
    }
    elements.captchaStatus.textContent = message;
  }

  function showCaptchaRetry() {
    elements.captchaRetry.hidden = false;
  }

  function hideCaptchaRetry() {
    elements.captchaRetry.hidden = true;
  }

  function renderCalendar() {
    const year = state.visibleMonth.getFullYear();
    const monthIndex = state.visibleMonth.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const mondayFirstOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const todayKey = formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const eventCountByDate = state.events.reduce((counts, event) => {
      counts[event.event_date] = (counts[event.event_date] || 0) + 1;
      return counts;
    }, {});

    elements.monthHeading.textContent = MONTH_LABEL.format(state.visibleMonth);
    elements.calendarGrid.replaceChildren();

    for (let index = 0; index < mondayFirstOffset; index += 1) {
      const blank = document.createElement("span");
      blank.className = "month-calendar__blank";
      blank.setAttribute("aria-hidden", "true");
      elements.calendarGrid.append(blank);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = formatDateKey(year, monthIndex + 1, day);
      const eventCount = eventCountByDate[dateKey] || 0;
      const button = document.createElement("button");
      const classNames = ["month-calendar__day"];

      if (dateKey === todayKey) classNames.push("month-calendar__day--today");
      if (dateKey === state.selectedDate) classNames.push("month-calendar__day--selected");
      if (eventCount > 0) classNames.push("month-calendar__day--has-events");

      button.className = classNames.join(" ");
      button.type = "button";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-pressed", String(dateKey === state.selectedDate));
      button.setAttribute(
        "aria-label",
        `${year}년 ${monthIndex + 1}월 ${day}일${eventCount ? `, 일정 ${eventCount}개` : ""}`,
      );
      button.textContent = String(day);
      button.addEventListener("click", () => selectDate(dateKey));
      elements.calendarGrid.append(button);
    }
  }

  function renderAgenda() {
    elements.agendaHeading.textContent = selectedDateLabel();
    elements.formDateLabel.textContent = state.selectedDate;

    if (state.loading) {
      const loading = document.createElement("div");
      loading.className = "agenda__loading";
      const message = document.createElement("p");
      message.textContent = "일정을 불러오는 중입니다…";
      loading.append(message);
      elements.agendaContent.replaceChildren(loading);
      return;
    }

    const selectedEvents = state.events
      .filter((event) => event.event_date === state.selectedDate)
      .sort((first, second) => (first.start_time || "99:99").localeCompare(second.start_time || "99:99"));

    if (selectedEvents.length === 0) {
      const empty = document.createElement("div");
      empty.className = "agenda__empty";
      const icon = document.createElement("span");
      icon.className = "agenda__empty-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "🎉";
      const message = document.createElement("p");
      message.textContent = "선택한 날짜에 예정된 일정이 없습니다.";
      empty.append(icon, message);
      elements.agendaContent.replaceChildren(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "agenda__list";

    selectedEvents.forEach((event) => {
      const category = normalizeCategory(event.schedule_categories);
      const colorKey = COLOR_KEYS.has(category?.color_key) ? category.color_key : "default";
      const item = document.createElement("li");
      item.className = "agenda__item";

      const dot = document.createElement("span");
      dot.className = `agenda__dot agenda__dot--${colorKey}`;
      dot.setAttribute("aria-hidden", "true");

      const details = document.createElement("div");
      details.className = "agenda__details";
      const name = document.createElement("p");
      name.className = "agenda__name";
      name.textContent = event.title;
      const categoryName = document.createElement("p");
      categoryName.className = "agenda__category";
      categoryName.textContent = category?.name || "카테고리 없음";
      details.append(name, categoryName);

      const time = document.createElement("time");
      time.className = "agenda__time";
      time.textContent = formatEventTime(event.start_time, event.end_time);

      item.append(dot, details, time);
      list.append(item);
    });

    elements.agendaContent.replaceChildren(list);
  }

  function normalizeCategory(categoryRelation) {
    if (Array.isArray(categoryRelation)) return categoryRelation[0] || null;
    return categoryRelation || null;
  }

  function formatEventTime(startTime, endTime) {
    const start = startTime ? startTime.slice(0, 5) : "시간 미정";
    const end = endTime ? endTime.slice(0, 5) : "";
    return end ? `${start}–${end}` : start;
  }

  function renderCategoryOptions() {
    const previousValue = elements.categorySelect.value;
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "카테고리 없음";
    elements.categorySelect.replaceChildren(defaultOption);

    state.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      elements.categorySelect.append(option);
    });

    const previousStillExists = state.categories.some((category) => category.id === previousValue);
    if (previousStillExists) elements.categorySelect.value = previousValue;
  }

  function renderSavingState() {
    elements.submitButton.disabled = state.saving;
    elements.submitButton.classList.toggle("primary-button--loading", state.saving);
    elements.submitLabel.textContent = state.saving ? "저장 중" : "일정 저장";
  }

  function createLocallyVisibleEvent(payload) {
    const category = state.categories.find((item) => item.id === payload.category_id) || null;
    const localId =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return {
      ...payload,
      id: `local-${localId}`,
      schedule_categories: category
        ? {
            id: category.id,
            name: category.name,
            color_key: category.color_key,
          }
        : null,
    };
  }

  function selectDate(dateKey) {
    state.selectedDate = dateKey;
    renderCalendar();
    renderAgenda();
    setFormStatus("");
  }

  async function changeMonth(offset) {
    const year = state.visibleMonth.getFullYear();
    const monthIndex = state.visibleMonth.getMonth() + offset;
    state.visibleMonth = new Date(year, monthIndex, 1);

    const isCurrentMonth =
      state.visibleMonth.getFullYear() === today.getFullYear() &&
      state.visibleMonth.getMonth() === today.getMonth();
    state.selectedDate = formatDateKey(
      state.visibleMonth.getFullYear(),
      state.visibleMonth.getMonth() + 1,
      isCurrentMonth ? today.getDate() : 1,
    );

    state.events = [];
    renderCalendar();
    renderAgenda();

    if (state.client && state.userId) {
      await loadEventsForVisibleMonth();
    }
  }

  function validateConfig(config) {
    if (!config || typeof config !== "object") {
      return { valid: false, kind: "missing", message: "Supabase 로컬 설정이 없습니다." };
    }

    const url = typeof config.url === "string" ? config.url.trim() : "";
    const publishableKey =
      typeof config.publishableKey === "string" ? config.publishableKey.trim() : "";

    if (!url || !publishableKey || /YOUR_|PLACEHOLDER/i.test(`${url}${publishableKey}`)) {
      return { valid: false, kind: "missing", message: "Supabase URL과 publishable key를 설정해주세요." };
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { valid: false, kind: "error", message: "Supabase URL 형식이 올바르지 않습니다." };
    }

    if (parsedUrl.protocol !== "https:" || !parsedUrl.hostname.endsWith(".supabase.co")) {
      return { valid: false, kind: "error", message: "https://…supabase.co 형식의 개발 프로젝트 URL을 사용해주세요." };
    }

    if (/service_role/i.test(publishableKey) || publishableKey.startsWith("sb_secret_")) {
      return { valid: false, kind: "error", message: "브라우저에서는 secret 또는 service_role 키를 사용할 수 없습니다." };
    }

    const jwtRole = getJwtRole(publishableKey);
    if (jwtRole === "service_role") {
      return { valid: false, kind: "error", message: "service_role 키가 감지되어 연결을 중단했습니다." };
    }

    const isPublishableKey = publishableKey.startsWith("sb_publishable_");
    const isLegacyAnonKey = jwtRole === "anon";
    if (!isPublishableKey && !isLegacyAnonKey) {
      return { valid: false, kind: "error", message: "publishable key 또는 legacy anon key를 사용해주세요." };
    }

    const captcha = validateCaptchaConfig(config.captcha);
    if (!captcha.valid) {
      return { valid: false, kind: "error", message: captcha.message };
    }

    return { valid: true, url, publishableKey, captcha: captcha.value };
  }

  function validateCaptchaConfig(captchaConfig) {
    if (captchaConfig == null) {
      return { valid: true, value: null };
    }

    if (typeof captchaConfig !== "object") {
      return { valid: false, message: "CAPTCHA 설정 형식이 올바르지 않습니다." };
    }

    const provider =
      typeof captchaConfig.provider === "string" ? captchaConfig.provider.trim().toLowerCase() : "";
    const siteKey = typeof captchaConfig.siteKey === "string" ? captchaConfig.siteKey.trim() : "";

    if (!CAPTCHA_PROVIDERS[provider]) {
      return { valid: false, message: "CAPTCHA provider는 turnstile 또는 hcaptcha여야 합니다." };
    }

    if (!siteKey || /YOUR_|PLACEHOLDER/i.test(siteKey)) {
      return { valid: false, message: "CAPTCHA site key를 supabase-config.js에 입력해주세요." };
    }

    return { valid: true, value: { provider, siteKey } };
  }

  function getJwtRole(key) {
    const parts = key.split(".");
    if (parts.length !== 3) return null;

    try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      return JSON.parse(atob(padded)).role || null;
    } catch {
      return null;
    }
  }

  function loadCaptchaScript(provider) {
    const providerConfig = CAPTCHA_PROVIDERS[provider];
    if (window[providerConfig.globalName]) return Promise.resolve();
    if (state.captchaScriptPromise) return state.captchaScriptPromise;

    state.captchaScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = providerConfig.scriptUrl;
      script.async = true;
      script.defer = true;
      script.dataset.captchaProvider = provider;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error(`${provider} CAPTCHA 스크립트를 불러오지 못했습니다.`)),
        { once: true },
      );
      document.head.append(script);
    });

    return state.captchaScriptPromise;
  }

  function destroyCaptchaWidget() {
    if (state.captchaWidgetId == null || !state.captcha) return;

    const api = window[CAPTCHA_PROVIDERS[state.captcha.provider].globalName];
    if (typeof api?.remove === "function") {
      api.remove(state.captchaWidgetId);
    }

    state.captchaWidgetId = null;
    elements.captchaWidget.replaceChildren();
  }

  function hideCaptcha() {
    destroyCaptchaWidget();
    elements.captchaPanel.hidden = true;
    hideCaptchaRetry();
    setCaptchaStatus("");
  }

  function resetCaptchaWidget() {
    if (state.captchaWidgetId == null || !state.captcha) return;
    const api = window[CAPTCHA_PROVIDERS[state.captcha.provider].globalName];
    if (typeof api?.reset === "function") api.reset(state.captchaWidgetId);
  }

  async function renderCaptcha(captchaConfig) {
    state.captcha = captchaConfig;
    elements.captchaPanel.hidden = false;
    hideCaptchaRetry();
    setConnectionState(
      "pending",
      "보안 확인 필요",
      "CAPTCHA 확인을 완료하면 익명 사용자로 연결됩니다.",
    );
    setCaptchaStatus("보안 확인 위젯을 불러오는 중입니다…");

    try {
      await loadCaptchaScript(captchaConfig.provider);
      destroyCaptchaWidget();

      const callbacks = {
        callback: (token) => handleCaptchaSuccess(token),
        "expired-callback": () => {
          setCaptchaStatus("보안 확인이 만료되었습니다. 다시 확인해주세요.", "error");
          showCaptchaRetry();
        },
        "error-callback": () => {
          setCaptchaStatus("보안 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", "error");
          showCaptchaRetry();
          return true;
        },
      };

      if (captchaConfig.provider === "turnstile") {
        state.captchaWidgetId = window.turnstile.render(elements.captchaWidget, {
          sitekey: captchaConfig.siteKey,
          theme: "light",
          size: "flexible",
          language: "ko",
          ...callbacks,
        });
      } else {
        state.captchaWidgetId = window.hcaptcha.render(elements.captchaWidget, {
          sitekey: captchaConfig.siteKey,
          theme: "light",
          size: "normal",
          hl: "ko",
          ...callbacks,
        });
      }

      setCaptchaStatus("위 보안 확인을 완료해주세요.");
    } catch (error) {
      setCaptchaStatus(safeErrorMessage(error), "error");
      setConnectionState("error", "CAPTCHA 오류", safeErrorMessage(error));
      console.error("[calendar] CAPTCHA 로드 실패:", safeErrorMessage(error));
    }
  }

  async function signInAnonymously(captchaToken) {
    const credentials = captchaToken ? { options: { captchaToken } } : undefined;
    const { data, error } = await state.client.auth.signInAnonymously(credentials);
    if (error) throw error;
    if (!data.session?.user?.id) throw new Error("익명 사용자 세션을 만들지 못했습니다.");
    return data.session;
  }

  async function finishAuthenticatedSetup(session) {
    state.userId = session.user.id;
    await loadCategories();
    const eventsLoaded = await loadEventsForVisibleMonth();
    if (eventsLoaded) {
      hideCaptcha();
      setConnectionState(
        "connected",
        "Supabase 연결됨",
        "익명 사용자로 안전하게 연결되었습니다. 저장한 일정은 새로고침 후에도 유지됩니다.",
      );
    }
  }

  async function handleCaptchaSuccess(captchaToken) {
    if (state.authInProgress) return;
    state.authInProgress = true;
    hideCaptchaRetry();
    setCaptchaStatus("확인 완료. Supabase에 연결하는 중입니다…", "success");
    setConnectionState("pending", "인증 중", "CAPTCHA 토큰으로 익명 사용자 세션을 만들고 있습니다.");

    try {
      const session = await signInAnonymously(captchaToken);
      await finishAuthenticatedSetup(session);
    } catch (error) {
      state.userId = null;
      setCaptchaStatus(
        "CAPTCHA 인증에 실패했습니다. provider, site key, secret key와 허용 도메인을 확인해주세요.",
        "error",
      );
      setConnectionState("error", "인증 실패", readableConnectionError(error));
      showCaptchaRetry();
      console.error("[calendar] CAPTCHA 인증 실패:", safeErrorMessage(error));
    } finally {
      state.authInProgress = false;
    }
  }

  async function initializeSupabase() {
    const validation = validateConfig(window.FIGMA_CALENDAR_SUPABASE);

    if (!validation.valid) {
      state.client = null;
      state.userId = null;
      state.categories = [];
      state.events = [];
      renderCategoryOptions();
      renderCalendar();
      renderAgenda();
      hideCaptcha();

      if (validation.kind === "missing") {
        setConnectionState(
          "offline",
          "설정 필요",
          "supabase-config.example.js를 복사해 개발 프로젝트의 URL과 publishable key를 입력해주세요.",
        );
      } else {
        setConnectionState("error", "연결 차단", validation.message);
      }
      return;
    }

    if (!window.supabase?.createClient) {
      setConnectionState(
        "error",
        "라이브러리 오류",
        "Supabase 라이브러리를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.",
      );
      return;
    }

    setConnectionState("pending", "인증 중", "안전한 익명 사용자 세션을 준비하고 있습니다.");

    try {
      state.client = window.supabase.createClient(validation.url, validation.publishableKey);
      const { data: sessionData, error: sessionError } = await state.client.auth.getSession();
      if (sessionError) throw sessionError;

      const session = sessionData.session;
      if (session) {
        await finishAuthenticatedSetup(session);
        return;
      }

      if (validation.captcha) {
        await renderCaptcha(validation.captcha);
        return;
      }

      const anonymousSession = await signInAnonymously();
      await finishAuthenticatedSetup(anonymousSession);
    } catch (error) {
      state.userId = null;
      state.categories = [];
      state.events = [];
      renderCategoryOptions();
      renderCalendar();
      renderAgenda();
      setConnectionState("error", "연결 실패", readableConnectionError(error));
      console.error("[calendar] Supabase 연결 실패:", safeErrorMessage(error));
    }
  }

  async function loadCategories() {
    const { data, error } = await state.client
      .from("schedule_categories")
      .select("id, name, color_key, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    state.categories = data || [];
    renderCategoryOptions();
  }

  async function loadEventsForVisibleMonth() {
    if (!state.client || !state.userId) return false;

    const currentToken = state.loadToken + 1;
    state.loadToken = currentToken;
    state.loading = true;
    elements.refreshEvents.disabled = true;
    renderAgenda();

    const { first, last } = getMonthRange();
    const { data, error } = await state.client
      .from("schedule_events")
      .select(`
        id,
        title,
        event_date,
        start_time,
        end_time,
        status,
        notes,
        category_id,
        schedule_categories (
          id,
          name,
          color_key
        )
      `)
      .gte("event_date", first)
      .lte("event_date", last)
      .eq("status", "scheduled")
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (currentToken !== state.loadToken) return false;

    state.loading = false;
    elements.refreshEvents.disabled = false;

    if (error) {
      renderAgenda();
      setConnectionState("error", "조회 실패", readableDatabaseError(error));
      console.error("[calendar] 일정 조회 실패:", safeErrorMessage(error));
      return false;
    }

    state.events = data || [];
    renderCalendar();
    renderAgenda();
    return true;
  }

  async function createEvent(formData) {
    if (!state.client || !state.userId) {
      setFormStatus("Supabase 설정과 익명 인증이 완료된 후 저장할 수 있습니다.", "error");
      return;
    }

    const title = String(formData.get("title") || "").trim();
    const startTime = String(formData.get("startTime") || "");
    const endTime = String(formData.get("endTime") || "");
    const categoryId = String(formData.get("categoryId") || "");
    const notes = String(formData.get("notes") || "").trim();

    if (!title) {
      setFormStatus("일정 제목을 입력해주세요.", "error");
      elements.titleInput.focus();
      return;
    }

    if (!startTime) {
      setFormStatus("시작 시간을 선택해주세요.", "error");
      elements.startInput.focus();
      return;
    }

    if (endTime && endTime <= startTime) {
      setFormStatus("종료 시간은 시작 시간보다 늦어야 합니다.", "error");
      elements.endInput.focus();
      return;
    }

    state.saving = true;
    renderSavingState();
    setFormStatus("일정을 저장하고 있습니다…");

    const payload = {
      user_id: state.userId,
      title,
      event_date: state.selectedDate,
      start_time: startTime,
      end_time: endTime || null,
      category_id: categoryId || null,
      status: "scheduled",
      notes: notes || null,
    };

    try {
      const { error } = await state.client.from("schedule_events").insert(payload);
      if (error) throw error;

      // INSERT가 성공했다면 재조회 결과를 기다리는 동안에도 새 일정을 바로 보여준다.
      // 월별 SELECT가 실패해도 이 항목은 화면에 남고, 사용자에게 재조회 오류를 따로 알린다.
      state.events = [...state.events, createLocallyVisibleEvent(payload)];
      renderCalendar();
      renderAgenda();

      elements.form.reset();
      elements.startInput.value = "09:00";
      elements.endInput.value = "10:00";
      const eventsLoaded = await loadEventsForVisibleMonth();

      if (eventsLoaded) {
        setFormStatus("일정이 저장되었습니다.", "success");
      } else {
        setFormStatus(
          "일정은 저장됐지만 목록을 다시 불러오지 못했습니다. 일정 새로고침 버튼을 눌러주세요.",
          "error",
        );
        console.warn("[calendar] 일정 저장 후 목록 재조회 실패");
      }

      elements.titleInput.focus();
    } catch (error) {
      setFormStatus(readableDatabaseError(error), "error");
      console.error("[calendar] 일정 저장 실패:", safeErrorMessage(error));
    } finally {
      state.saving = false;
      renderSavingState();
    }
  }

  function safeErrorMessage(error) {
    return typeof error?.message === "string" ? error.message : "알 수 없는 오류";
  }

  function readableConnectionError(error) {
    const message = safeErrorMessage(error).toLowerCase();
    if (message.includes("anonymous") && message.includes("disabled")) {
      return "Supabase Dashboard에서 Anonymous Sign-Ins를 활성화해주세요.";
    }
    if (message.includes("captcha")) {
      return "CAPTCHA 토큰이 거절되었습니다. provider, site key, Supabase CAPTCHA secret과 허용 도메인을 확인해주세요.";
    }
    return "Supabase 연결에 실패했습니다. 프로젝트 URL, publishable key, 익명 인증 설정을 확인해주세요.";
  }

  function readableDatabaseError(error) {
    const message = safeErrorMessage(error).toLowerCase();
    if (message.includes("row-level security") || message.includes("permission denied")) {
      return "RLS 정책이 요청을 허용하지 않았습니다. 사용자별 select/insert 정책을 확인해주세요.";
    }
    if (message.includes("does not exist") || message.includes("schema cache")) {
      return "필요한 테이블을 찾지 못했습니다. supabase/schema.sql 적용 여부를 확인해주세요.";
    }
    return "데이터 처리 중 오류가 발생했습니다. 연결과 테이블 설정을 확인해주세요.";
  }

  elements.previousMonth.addEventListener("click", () => changeMonth(-1));
  elements.nextMonth.addEventListener("click", () => changeMonth(1));
  elements.refreshEvents.addEventListener("click", () => {
    if (state.client && state.userId) {
      loadEventsForVisibleMonth();
    } else {
      initializeSupabase();
    }
  });
  elements.captchaRetry.addEventListener("click", () => {
    hideCaptchaRetry();
    setCaptchaStatus("보안 확인을 다시 준비하고 있습니다…");
    resetCaptchaWidget();
  });
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    createEvent(new FormData(elements.form));
  });

  renderCalendar();
  renderAgenda();
  renderCategoryOptions();
  renderSavingState();
  initializeSupabase();
})();
