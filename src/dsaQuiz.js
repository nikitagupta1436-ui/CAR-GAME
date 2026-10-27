const questionFiles = import.meta.glob("./questions/*/*.json", { eager: true, import: "default" });
const questionSets = new Map(
  Object.entries(questionFiles).map(([path, questions]) => {
    const [, slug, difficulty] = path.match(/questions\/([^/]+)\/([^/]+)\.json$/);
    return [`${slug}:${difficulty}`, questions];
  }),
);
const languageSlugs = { "C++": "cpp", Java: "java", Python: "python", JavaScript: "javascript", C: "c" };
const usedQuestions = new Set();
let activeQuestion = null;
let timerId = null;
let settled = false;

export function resetUsedQuestions() {
  usedQuestions.clear();
}

function questionsFor(language, difficulty) {
  const slug = languageSlugs[language];
  const difficulties = difficulty === "mixed" ? ["easy", "medium", "hard"] : [difficulty];
  return difficulties.flatMap((tier) => questionSets.get(`${slug}:${tier}`) ?? []);
}

function chooseQuestion(language, difficulty, topic) {
  const difficultyPool = questionsFor(language, difficulty);
  let pool = difficultyPool.filter((question) => topic === "All" || question.topic === topic);
  if (!pool.length && topic !== "All") {
    console.warn(`No ${topic} questions for ${language}/${difficulty}; using all topics.`);
    pool = difficultyPool;
  }
  if (!pool.length) {
    console.warn(`No ${difficulty} questions for ${language}; using all difficulties.`);
    pool = questionsFor(language, "mixed");
    if (topic !== "All") {
      const topicPool = pool.filter((question) => question.topic === topic);
      if (topicPool.length) pool = topicPool;
    }
  }
  if (!pool.length) throw new Error(`No questions found for ${language}, ${difficulty}, topic ${topic}.`);
  let available = pool.filter((question) => !usedQuestions.has(question.id));
  if (!available.length) {
    pool.forEach((question) => usedQuestions.delete(question.id));
    available = pool;
  }
  const question = available[Math.floor(Math.random() * available.length)];
  usedQuestions.add(question.id);
  return question;
}

export function getQuestionPoolSize(language, difficulty, topic = "All") {
  return questionsFor(language, difficulty)
    .filter((question) => topic === "All" || question.topic === topic).length;
}

export function askQuestion(language, difficulty, topic = "All", { onHint = () => {}, practice = false } = {}) {
  activeQuestion = chooseQuestion(language, difficulty, topic);
  settled = false;
  const modal = document.getElementById("quiz-modal");
  const options = document.getElementById("quiz-options");
  const timerLabel = document.getElementById("timer-value");
  const feedback = document.getElementById("quiz-feedback");
  const explanation = document.getElementById("quiz-explanation");
  const code = document.getElementById("quiz-code");
  const buyFuelButton = document.getElementById("buy-fuel-button");
  const startedAt = performance.now();
  let seconds = 30;
  let hintUsed = false;

  document.getElementById("quiz-topic").textContent = activeQuestion.topic.toUpperCase();
  document.getElementById("quiz-difficulty").textContent = activeQuestion.difficulty.toUpperCase();
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
  buyFuelButton.classList.add("hidden");
  buyFuelButton.disabled = true;

  const buttons = activeQuestion.options.map((option, index) => {
    const button = document.createElement("button");
    button.className = "quiz-option";
    button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
    options.append(button);
    return button;
  });
  const hintButton = document.getElementById("hint-button");
  hintButton.disabled = false;
  hintButton.classList.toggle("hidden", practice);
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
      hintButton.disabled = true;
      feedback.textContent = correct ? "CORRECT! FULL TANK." : timedOut ? "TIME'S UP — HERE'S THE ANSWER." : "NOT QUITE — HERE'S THE ANSWER.";
      feedback.style.color = correct ? "#54e29b" : "#ff8a94";
      explanation.textContent = activeQuestion.explanation;
      explanation.classList.remove("hidden");
      buyFuelButton.classList.add("hidden");
      window.setTimeout(() => {
        modal.classList.add("hidden");
        resolve({
          correct,
          timedOut,
          timeTaken: (performance.now() - startedAt) / 1000,
          question: activeQuestion,
        });
      }, 3000);
    };
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => finish(index === activeQuestion.answerIndex, index, false));
    });
    timerId = window.setInterval(() => {
      seconds -= 1;
      timerLabel.textContent = seconds;
      document.getElementById("quiz-timer").style.setProperty("--timer-progress", `${seconds / 30 * 100}%`);
      if (seconds <= 7) document.getElementById("quiz-timer").classList.add("urgent");
      if (seconds <= 0) finish(false, -1, true);
    }, 1000);
  });
}
