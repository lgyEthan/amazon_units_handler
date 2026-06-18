const unitInput = document.querySelector("#unit-input");
const boxResult = document.querySelector("#box-result");
const excessResult = document.querySelector("#excess-result");
const dozenResult = document.querySelector("#dozen-result");
const pairResult = document.querySelector("#pair-result");
const slotGrid = document.querySelector("#slot-grid");
const slotLabel = document.querySelector("#slot-label");
const summaryOutput = document.querySelector("#summary-output");
const copyButton = document.querySelector("#copy-button");
const resetButton = document.querySelector("#reset-button");
const copyStatus = document.querySelector("#copy-status");

const BOX_UNIT_COUNT = 12;
const DOZEN_PER_UNIT = 0.5;
const PAIR_PER_UNIT = 6;
const DEFAULT_UNITS = 0;

let lastSummary = "";
let copyStatusTimer;

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function parseUnits(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.trunc(numeric);
}

function calculate(units) {
  return {
    units,
    boxes: Math.floor(units / BOX_UNIT_COUNT),
    excessUnits: units % BOX_UNIT_COUNT,
    dozens: units * DOZEN_PER_UNIT,
    pairs: units * PAIR_PER_UNIT,
  };
}

function renderSlots(excessUnits) {
  slotGrid.replaceChildren();

  for (let index = 0; index < BOX_UNIT_COUNT; index += 1) {
    const slot = document.createElement("span");
    slot.className = `slot${index < excessUnits ? " is-filled" : ""}`;
    slotGrid.append(slot);
  }

  slotLabel.textContent = `${formatNumber(excessUnits)} / ${BOX_UNIT_COUNT}`;
}

function renderResults() {
  const normalizedUnits = parseUnits(unitInput.value);

  if (unitInput.value !== "" && String(normalizedUnits) !== unitInput.value) {
    unitInput.value = normalizedUnits;
  }

  const result = calculate(normalizedUnits);

  boxResult.textContent = formatNumber(result.boxes);
  excessResult.textContent = formatNumber(result.excessUnits);
  dozenResult.textContent = formatNumber(result.dozens);
  pairResult.textContent = formatNumber(result.pairs);
  renderSlots(result.excessUnits);

  lastSummary = [
    "아마존 재고 관리 시스템",
    `Units: ${formatNumber(result.units)}`,
    `# Box: ${formatNumber(result.boxes)}`,
    `Excess units: ${formatNumber(result.excessUnits)}`,
    `# Dozen: ${formatNumber(result.dozens)}`,
    `# Pair: ${formatNumber(result.pairs)}`,
  ].join("\n");

  summaryOutput.textContent =
    `Units ${formatNumber(result.units)} = Box ${formatNumber(result.boxes)} / ` +
    `Excess ${formatNumber(result.excessUnits)} / Dozen ${formatNumber(result.dozens)} / ` +
    `Pair ${formatNumber(result.pairs)}`;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-999px";
  document.body.append(textArea);
  textArea.select();
  const didCopy = document.execCommand("copy");
  textArea.remove();

  if (!didCopy) {
    throw new Error("Copy command was not available.");
  }
}

function showCopyStatus(message) {
  copyStatus.textContent = message;
  window.clearTimeout(copyStatusTimer);
  copyStatusTimer = window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

document.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => {
    const nextValue = parseUnits(unitInput.value) + Number(button.dataset.step);
    unitInput.value = Math.max(0, nextValue);
    renderResults();
    unitInput.focus();
  });
});

unitInput.addEventListener("input", renderResults);

resetButton.addEventListener("click", () => {
  unitInput.value = DEFAULT_UNITS;
  renderResults();
  unitInput.focus();
});

copyButton.addEventListener("click", async () => {
  try {
    await copyText(lastSummary);
    showCopyStatus("복사 완료");
  } catch {
    showCopyStatus("복사할 수 없습니다");
  }
});

renderResults();
