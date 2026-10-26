import easyQuestions from "./questions/easy.json";
import mediumQuestions from "./questions/medium.json";
import hardQuestions from "./questions/hard.json";

const questionSets = { easy: easyQuestions, medium: mediumQuestions, hard: hardQuestions };
const usedQuestions = new Set();
let activeQuestion = null;
let timerId = null;
let settled = false;

export function resetUsedQuestions() {
  usedQuestions.clear();
}

function selectQuestion(difficulty) {
  const available = questionSets[difficulty].filter((question) => !usedQuestions.has(question.id));
  if (!available.length) return null;
  const selected = available[Math.floor(Math.random() * available.length)];
  usedQuestions.add(selected.id);
  return selected;
}

export function askQuestion(difficulty, onHint = () => {}) {
  activeQuestion = selectQuestion(difficulty);
  if (!activeQuestion) {
    return Promise.resolve({ correct: false, timedOut: false, bankExhausted: true, timeTaken: 0 });
  }
  settled = false;
  const modal = document.getElementById("quiz-modal");
  const options = document.getElementById("quiz-options");
  const timerLabel = document.getElementById("timer-value");
  const feedback = document.getElementById("quiz-feedback");
  const explanation = document.getElementById("quiz-explanation");
  const code = document.getElementById("quiz-code");
  const startedAt = performance.now();
  let seconds = 30;
  let hintUsed = false;

  document.getElementById("quiz-topic").textContent = activeQuestion.topic.toUpperCase();
  document.getElementById("quiz-difficulty").textContent = difficulty.toUpperCase();
  document.getElementById("quiz-question").textContent = activeQuestion.question;
  code.textContent = activeQuestion.code ?? "";
  code.classList.toggle("hidden", !activeQuestion.code);
  feedback.textContent = "";
  explanation.textContent = "";
  explanation.classList.add("hidden");
  timerLabel.textContent = seconds;
  document.getElementById("quiz-timer").style.setProperty("--timer-progress", "100%");
  document.getElementById("quiz-timer").classList.remove("urgent");
  options.replaceChildren();
  const buttons = activeQuestion.options.map((option, index) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
    button.addEventListener("click", () => finish(index === activeQuestion.answerIndex, index, false));
    options.append(button);
    return button;
  });
  const hintButton = document.getElementById("hint-button");
  hintButton.disabled = false;
  hintButton.onclick = () => {
    if (hintUsed || settled) return;
    hintUsed = true;
    hintButton.disabled = true;
    onHint();
    let removed = 0;
    buttons.forEach((button, index) => {
      if (index !== activeQuestion.answerIndex && removed < 2) {
        button.disabled = true;
        button.style.opacity = "0.38";
        removed += 1;
      }
    });
  };

  modal.classList.remove("hidden");

  return new Promise((resolve) => {
    const finish = (correct, selectedIndex, timedOut) => {
      if (settled) return;
      settled = true;
      window.clearInterval(timerId);
      buttons.forEach((button, index) => {
        button.disabled = true;
        if (index === activeQuestion.answerIndex) button.classList.add("correct");
        else if (index === selectedIndex && !correct) button.classList.add("wrong");
      });
      feedback.textContent = correct ? "CORRECT! FULL TANK." : timedOut ? "TIME'S UP — HERE'S THE ANSWER." : "NOT QUITE — HERE'S THE ANSWER.";
      feedback.style.color = correct ? "#54e29b" : "#ff8a94";
      explanation.textContent = activeQuestion.explanation;
      explanation.classList.remove("hidden");
      window.setTimeout(() => {
        modal.classList.add("hidden");
        resolve({ correct, timedOut, timeTaken: (performance.now() - startedAt) / 1000 });
      }, 3000);
    };
    timerId = window.setInterval(() => {
      seconds -= 1;
      timerLabel.textContent = seconds;
      document.getElementById("quiz-timer").style.setProperty("--timer-progress", `${seconds / 30 * 100}%`);
      if (seconds <= 7) document.getElementById("quiz-timer").classList.add("urgent");
      if (seconds <= 0) finish(false, -1, true);
    }, 1000);
    buttons.forEach((button, index) => {
      button.onclick = () => finish(index === activeQuestion.answerIndex, index, false);
    });
  });
}
