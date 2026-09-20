import { parseHistory } from "./InterviewApp.history";

declare function test(name: string, callback: () => void): void;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseEvaluation = {
  levelScore: 7,
  jobReadinessScore: 7,
  englishScore: 7,
  technicalScore: 7,
  relevanceScore: 7,
  structureScore: 7,
  observedEnglishLevel: "B1",
  feedback: "Respuesta clara.",
  strengths: ["Explica una decisión."],
  priorityImprovement: "Añade evidencia.",
  correctedAnswer: "I made the API faster.",
  nextLevelAnswer: "I made the API faster by adding a cache.",
};

const baseSession = {
  id: "session-1",
  createdAt: "2026-09-19T00:00:00.000Z",
  profile: { role: "Backend Engineer", summary: "", focusAreas: [] },
  englishLevel: "B1",
};

test("keeps old sessions readable without coaching", () => {
  const [legacySession] = parseHistory(
    JSON.stringify([
      {
        ...baseSession,
        turns: [
          {
            question: "How did you improve the API?",
            answer: "I made the API faster.",
            evaluation: baseEvaluation,
          },
        ],
      },
    ]),
  );
  assert(
    legacySession?.turns[0]?.evaluation?.coaching === undefined,
    "legacy sessions must remain readable without coaching",
  );
});

test("keeps valid coaching and removes only invalid quote fields", () => {
  const answer = "I made the API faster with a cache.";
  const [session] = parseHistory(
    JSON.stringify([
      {
        ...baseSession,
        turns: [
          {
            question: "How did you improve the API?",
            answer,
            evaluation: {
              ...baseEvaluation,
              coaching: {
                language: {
                  original: "made",
                  replacement: "improved",
                  why: "Usa un verbo preciso.",
                },
                interview: {
                  skill: "structure",
                  evidence: "the API faster",
                  technique: "Acción + evidencia",
                  action: "Explica cómo comprobaste la mejora.",
                  miniChallenge: "Reescribe la respuesta en 30 segundos.",
                },
              },
            },
          },
        ],
      },
    ]),
  );
  const coaching = session?.turns[0]?.evaluation?.coaching;
  assert(
    coaching?.language?.original === "made",
    "valid language quote is kept",
  );
  assert(
    coaching?.interview.evidence === "the API faster",
    "valid interview evidence is kept",
  );

  const [degraded] = parseHistory(
    JSON.stringify([
      {
        ...baseSession,
        id: "session-2",
        turns: [
          {
            question: "How did you improve the API?",
            answer: "I made the API faster. I made the API safer.",
            evaluation: {
              ...baseEvaluation,
              coaching: {
                language: {
                  original: "made",
                  replacement: "improved",
                  why: "Usa un verbo preciso.",
                },
                interview: {
                  skill: "structure",
                  evidence: "not present",
                  technique: "Acción + evidencia",
                  action: "Explica cómo comprobaste la mejora.",
                  miniChallenge: "Reescribe la respuesta en 30 segundos.",
                },
              },
            },
          },
        ],
      },
    ]),
  );
  const degradedCoaching = degraded?.turns[0]?.evaluation?.coaching;
  assert(
    degradedCoaching?.language === undefined,
    "invalid language quote is removed without dropping coaching",
  );
  assert(
    degradedCoaching?.interview.evidence === undefined,
    "invalid interview evidence is removed without dropping coaching",
  );
  assert(
    degradedCoaching?.interview.action ===
      "Explica cómo comprobaste la mejora.",
    "the rest of coaching survives invalid evidence",
  );
});
