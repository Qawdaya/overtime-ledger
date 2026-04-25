const STORAGE_KEY = "overtime-comp-time-ledger-v1";
const OVERTIME_START_MINUTES = 19 * 60;
const MEAL_ALLOWANCE_THRESHOLD = 20 * 60;
const MEAL_ALLOWANCE_AMOUNT = 20;

const initialState = {
  overtimeEntries: [],
  leaveEntries: [],
};

const overtimeForm = document.querySelector("#overtimeForm");
const leaveForm = document.querySelector("#leaveForm");
const overtimeTableBody = document.querySelector("#overtimeTableBody");
const leaveTableBody = document.querySelector("#leaveTableBody");
const overtimeRowTemplate = document.querySelector("#overtimeRowTemplate");
const leaveRowTemplate = document.querySelector("#leaveRowTemplate");
const exportDataButton = document.querySelector("#exportDataButton");
const importDataButton = document.querySelector("#importDataButton");
const importFileInput = document.querySelector("#importFileInput");

const metrics = {
  currentBalance: document.querySelector("#currentBalance"),
  monthlyOvertime: document.querySelector("#monthlyOvertime"),
  monthlyLeave: document.querySelector("#monthlyLeave"),
  monthlyMealAllowance: document.querySelector("#monthlyMealAllowance"),
  totalOvertime: document.querySelector("#totalOvertime"),
  totalLeave: document.querySelector("#totalLeave"),
  totalMealAllowance: document.querySelector("#totalMealAllowance"),
  overtimeCount: document.querySelector("#overtimeCount"),
  leaveCount: document.querySelector("#leaveCount"),
};

let state = loadState();

function normalizeImportedState(parsed) {
  return {
    overtimeEntries: Array.isArray(parsed.overtimeEntries) ? parsed.overtimeEntries : [],
    leaveEntries: Array.isArray(parsed.leaveEntries) ? parsed.leaveEntries : [],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return structuredClone(initialState);
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeImportedState(parsed);
  } catch (error) {
    console.warn("Failed to parse local data, reset to defaults.", error);
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function todayString() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function formatHours(value) {
  return `${value.toFixed(1)} 小时`;
}

function toMinutes(timeValue) {
  const [hour, minute] = timeValue.split(":").map(Number);
  return hour * 60 + minute;
}

function calculateOvertimeHours(entry) {
  const startMinutes = toMinutes(entry.startTime);
  const endMinutes = toMinutes(entry.endTime);
  const breakMinutes = Number(entry.breakMinutes) || 0;
  let normalizedEndMinutes = endMinutes;

  if (normalizedEndMinutes < startMinutes) {
    normalizedEndMinutes += 24 * 60;
  }

  const effectiveStartMinutes = Math.max(startMinutes, OVERTIME_START_MINUTES);
  const rawEffectiveDuration = normalizedEndMinutes - effectiveStartMinutes;
  const effectiveDuration = Math.max(0, rawEffectiveDuration - breakMinutes);

  return effectiveDuration / 60;
}

function hasMealAllowance(entry) {
  const startMinutes = toMinutes(entry.startTime);
  const endMinutes = toMinutes(entry.endTime);
  let normalizedEndMinutes = endMinutes;

  if (normalizedEndMinutes < startMinutes) {
    normalizedEndMinutes += 24 * 60;
  }

  return normalizedEndMinutes >= MEAL_ALLOWANCE_THRESHOLD && calculateOvertimeHours(entry) > 0;
}

function calculateMealAllowance(entry) {
  return hasMealAllowance(entry) ? MEAL_ALLOWANCE_AMOUNT : 0;
}

function getCurrentMonthKey() {
  return todayString().slice(0, 7);
}

function sumHours(entries, selector) {
  return entries.reduce((total, item) => total + selector(item), 0);
}

function refreshMetrics() {
  const currentMonth = getCurrentMonthKey();
  const totalOvertime = sumHours(state.overtimeEntries, calculateOvertimeHours);
  const totalLeave = sumHours(state.leaveEntries, (item) => Number(item.hours));
  const totalMealAllowance = sumHours(state.overtimeEntries, calculateMealAllowance);
  const monthlyOvertime = sumHours(
    state.overtimeEntries.filter((item) => item.date.startsWith(currentMonth)),
    calculateOvertimeHours,
  );
  const monthlyLeave = sumHours(
    state.leaveEntries.filter((item) => item.date.startsWith(currentMonth)),
    (item) => Number(item.hours),
  );
  const monthlyMealAllowance = sumHours(
    state.overtimeEntries.filter((item) => item.date.startsWith(currentMonth)),
    calculateMealAllowance,
  );
  const currentBalance = totalOvertime - totalLeave;

  metrics.currentBalance.textContent = formatHours(currentBalance);
  metrics.monthlyOvertime.textContent = formatHours(monthlyOvertime);
  metrics.monthlyLeave.textContent = formatHours(monthlyLeave);
  metrics.monthlyMealAllowance.textContent = `${monthlyMealAllowance} 元`;
  metrics.totalOvertime.textContent = formatHours(totalOvertime);
  metrics.totalLeave.textContent = formatHours(totalLeave);
  metrics.totalMealAllowance.textContent = `${totalMealAllowance} 元`;
  metrics.overtimeCount.textContent = `${state.overtimeEntries.length} 条`;
  metrics.leaveCount.textContent = `${state.leaveEntries.length} 条`;
}

function renderOvertimeTable() {
  overtimeTableBody.innerHTML = "";

  if (state.overtimeEntries.length === 0) {
    overtimeTableBody.innerHTML =
      '<tr class="empty-row"><td colspan="6">还没有加班记录</td></tr>';
    return;
  }

  const sortedEntries = [...state.overtimeEntries].sort((a, b) => b.date.localeCompare(a.date));

  sortedEntries.forEach((entry) => {
    const fragment = overtimeRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");

    row.dataset.id = entry.id;
    row.querySelector('[data-cell="date"]').textContent = entry.date;
    row.querySelector('[data-cell="time"]').textContent = `${entry.startTime} - ${entry.endTime}`;
    row.querySelector('[data-cell="hours"]').textContent = formatHours(calculateOvertimeHours(entry));
    row.querySelector('[data-cell="mealAllowance"]').textContent = `${calculateMealAllowance(entry)} 元`;
    row.querySelector('[data-cell="notes"]').textContent = entry.notes || "-";
    overtimeTableBody.appendChild(fragment);
  });
}

function renderLeaveTable() {
  leaveTableBody.innerHTML = "";

  if (state.leaveEntries.length === 0) {
    leaveTableBody.innerHTML =
      '<tr class="empty-row"><td colspan="4">还没有调休记录</td></tr>';
    return;
  }

  const sortedEntries = [...state.leaveEntries].sort((a, b) => b.date.localeCompare(a.date));

  sortedEntries.forEach((entry) => {
    const fragment = leaveRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector("tr");

    row.dataset.id = entry.id;
    row.querySelector('[data-cell="date"]').textContent = entry.date;
    row.querySelector('[data-cell="hours"]').textContent = formatHours(Number(entry.hours));
    row.querySelector('[data-cell="reason"]').textContent = entry.reason || "-";
    leaveTableBody.appendChild(fragment);
  });
}

function render() {
  refreshMetrics();
  renderOvertimeTable();
  renderLeaveTable();
}

function syncAndRender() {
  saveState();
  render();
}

function buildId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function downloadBackup() {
  const backupPayload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    ...state,
  };
  const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `overtime-ledger-backup-${todayString()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBackupFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state = normalizeImportedState(parsed);
      syncAndRender();
      alert("备份导入成功。");
    } catch (error) {
      console.error(error);
      alert("导入失败，请确认选择的是正确的 JSON 备份文件。");
    } finally {
      importFileInput.value = "";
    }
  });

  reader.readAsText(file);
}

function resetForms() {
  overtimeForm.reset();
  leaveForm.reset();
  overtimeForm.elements.date.value = todayString();
  leaveForm.elements.date.value = todayString();
  overtimeForm.elements.breakMinutes.value = 0;
}

overtimeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(overtimeForm);
  const entry = {
    id: buildId(),
    date: String(formData.get("date")),
    startTime: String(formData.get("startTime")),
    endTime: String(formData.get("endTime")),
    breakMinutes: Number(formData.get("breakMinutes")),
    notes: String(formData.get("notes")).trim(),
  };

  const hours = calculateOvertimeHours(entry);

  if (hours <= 0) {
    alert("19:00 后的有效加班时长需要大于 0 小时。");
    return;
  }

  state.overtimeEntries.unshift(entry);
  syncAndRender();
  overtimeForm.reset();
  overtimeForm.elements.date.value = todayString();
  overtimeForm.elements.breakMinutes.value = 0;
});

leaveForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(leaveForm);
  const hours = Number(formData.get("hours"));
  const totalOvertime = sumHours(state.overtimeEntries, calculateOvertimeHours);
  const totalLeave = sumHours(state.leaveEntries, (item) => Number(item.hours));
  const balance = totalOvertime - totalLeave;

  if (hours <= 0) {
    alert("调休时长需要大于 0 小时。");
    return;
  }

  if (hours > balance) {
    alert("当前调休余额不足，请先登记更多加班记录。");
    return;
  }

  state.leaveEntries.unshift({
    id: buildId(),
    date: String(formData.get("date")),
    hours,
    reason: String(formData.get("reason")).trim(),
  });
  syncAndRender();
  leaveForm.reset();
  leaveForm.elements.date.value = todayString();
});

overtimeTableBody.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="delete-overtime"]');

  if (!button) {
    return;
  }

  const row = button.closest("tr");
  state.overtimeEntries = state.overtimeEntries.filter((entry) => entry.id !== row.dataset.id);
  syncAndRender();
});

leaveTableBody.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="delete-leave"]');

  if (!button) {
    return;
  }

  const row = button.closest("tr");
  state.leaveEntries = state.leaveEntries.filter((entry) => entry.id !== row.dataset.id);
  syncAndRender();
});

exportDataButton.addEventListener("click", () => {
  downloadBackup();
});

importDataButton.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  importBackupFile(file);
});

resetForms();
render();
