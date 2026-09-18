import type {
  EnglishLevel,
  Feedback,
  ProgressDimension,
  ProgressSummary,
  Session,
  Turn,
  TurnEvaluation,
} from "./InterviewApp.types";

export const HISTORY_KEY = "vera-interview-history-v2";
export const LEGACY_HISTORY_KEY = "vera-interview-history-v1";

const ENGLISH_LEVELS: EnglishLevel[] = ["A1", "A2", "B1", "B2"];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isEnglishLevel(value: unknown): value is EnglishLevel {
  return (
    typeof value === "string" && ENGLISH_LEVELS.includes(value as EnglishLevel)
  );
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function dedupeSessions(sessions: Session[]) {
  const seen = new Set<string>();
  return sessions.filter((session) => {
    if (seen.has(session.id)) return false;
    seen.add(session.id);
    return true;
  });
}

export function normalizeScore(value: unknown, fallback = 5) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(10, value > 10 ? value / 10 : value));
}

function migrateEvaluation(
  value: unknown,
  level: EnglishLevel,
): TurnEvaluation | undefined {
  if (!isRecord(value)) return undefined;
  const score = normalizeScore(value.levelScore ?? value.score);
  return {
    levelScore: score,
    jobReadinessScore: normalizeScore(value.jobReadinessScore, score),
    englishScore: normalizeScore(value.englishScore, score),
    technicalScore: normalizeScore(value.technicalScore, score),
    relevanceScore: normalizeScore(value.relevanceScore, score),
    structureScore: normalizeScore(value.structureScore, score),
    observedEnglishLevel: isEnglishLevel(value.observedEnglishLevel)
      ? value.observedEnglishLevel
      : level,
    feedback: stringValue(value.feedback, "Evaluación anterior."),
    strengths:
      arrayValue(value.strengths).filter(
        (item): item is string => typeof item === "string",
      ).length > 0
        ? arrayValue(value.strengths).filter(
            (item): item is string => typeof item === "string",
          )
        : ["Respuesta completada"],
    priorityImprovement: stringValue(
      value.priorityImprovement ?? value.improvement,
      "Continúa practicando claridad y precisión.",
    ),
    correctedAnswer: stringValue(
      value.correctedAnswer,
      "No corrected answer available.",
    ),
    nextLevelAnswer: stringValue(
      value.nextLevelAnswer ?? value.correctedAnswer,
      "No next-level answer available.",
    ),
  };
}

function migrateTurn(value: unknown, level: EnglishLevel): Turn | undefined {
  if (!isRecord(value)) return undefined;
  const question = stringValue(value.question);
  const answer = stringValue(value.answer);
  if (!question || !answer) return undefined;
  const evaluation = migrateEvaluation(value.evaluation, level);
  return {
    question,
    answer,
    ...(typeof value.transcript === "string"
      ? { transcript: value.transcript }
      : {}),
    ...(evaluation ? { evaluation } : {}),
  };
}

function migrateFeedback(
  value: unknown,
  level: EnglishLevel,
): Feedback | undefined {
  if (!isRecord(value)) return undefined;
  const levelScore = normalizeScore(value.levelScore ?? value.overallScore);
  const dimensionAverages = isRecord(value.dimensionAverages)
    ? {
        english: normalizeScore(value.dimensionAverages.english),
        technical: normalizeScore(value.dimensionAverages.technical),
        relevance: normalizeScore(value.dimensionAverages.relevance),
        structure: normalizeScore(value.dimensionAverages.structure),
      }
    : {
        english: normalizeScore(value.clarity),
        technical: normalizeScore(value.technicalFit),
        relevance: levelScore,
        structure: normalizeScore(value.structure),
      };
  const mapFeedbackItems = (items: unknown) =>
    arrayValue(items).flatMap((item) => {
      if (!isRecord(item)) return [];
      const label = stringValue(item.label);
      if (!label) return [];
      return [
        {
          label,
          description: stringValue(item.description),
        },
      ];
    });
  const turnReviews = arrayValue(value.turnReviews).flatMap((review) => {
    if (!isRecord(review) || typeof review.turnIndex !== "number") return [];
    const reviewScore = normalizeScore(review.levelScore ?? review.score);
    return [
      {
        turnIndex: review.turnIndex,
        levelScore: reviewScore,
        jobReadinessScore: normalizeScore(
          review.jobReadinessScore,
          reviewScore,
        ),
        feedback: stringValue(review.feedback, "Evaluación anterior."),
        correctedAnswer: stringValue(
          review.correctedAnswer,
          "No corrected answer available.",
        ),
      },
    ];
  });

  return {
    overallScore: normalizeScore(value.overallScore, levelScore),
    levelScore,
    jobReadinessScore: normalizeScore(value.jobReadinessScore, levelScore),
    englishLevel: isEnglishLevel(value.englishLevel)
      ? value.englishLevel
      : level,
    dimensionAverages,
    summary: stringValue(value.summary),
    strengths: mapFeedbackItems(value.strengths),
    gaps: mapFeedbackItems(value.gaps),
    recommendations: mapFeedbackItems(value.recommendations),
    turnReviews,
  };
}

export function migrateSession(value: unknown): Session {
  if (!isRecord(value)) throw new Error("Invalid stored session");
  const profileValue = isRecord(value.profile) ? value.profile : null;
  const role = stringValue(profileValue?.role);
  if (!role) throw new Error("Stored session has no profile role");
  const level = isEnglishLevel(value.englishLevel) ? value.englishLevel : "B1";
  const profile = {
    role,
    summary: stringValue(profileValue?.summary),
    focusAreas: arrayValue(profileValue?.focusAreas).filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    ),
  };
  const turns = arrayValue(value.turns).flatMap((turn) => {
    const migrated = migrateTurn(turn, level);
    return migrated ? [migrated] : [];
  });
  const session: Session = {
    id: stringValue(value.id),
    createdAt: stringValue(value.createdAt),
    profile,
    turns,
    englishLevel: level,
  };
  if (!session.id || !session.createdAt) throw new Error("Invalid session id");
  const feedback = migrateFeedback(value.feedback, level);
  return feedback ? { ...session, feedback } : session;
}

function getStorage(storage?: Storage) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function parseHistory(raw: string | null): Session[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return dedupeSessions(
      parsed.flatMap((item) => {
        try {
          return [migrateSession(item)];
        } catch {
          return [];
        }
      }),
    );
  } catch {
    return [];
  }
}

export function loadHistory(storage?: Storage): Session[] {
  const target = getStorage(storage);
  if (!target) return [];
  const current = target.getItem(HISTORY_KEY);
  const legacy = target.getItem(LEGACY_HISTORY_KEY);
  const sessions = parseHistory(current || legacy);
  if (!current && legacy && sessions.length) {
    try {
      target.setItem(HISTORY_KEY, JSON.stringify(sessions));
    } catch {
      /* storage is optional */
    }
  }
  return sessions;
}

export function saveSession(session: Session, storage?: Storage) {
  const target = getStorage(storage);
  if (!target) return;
  const next = [
    session,
    ...loadHistory(target).filter((item) => item.id !== session.id),
  ].slice(0, 20);
  try {
    target.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* feedback remains visible when storage is full */
  }
}

export function clearHistory(storage?: Storage) {
  const target = getStorage(storage);
  if (!target) return;
  target.removeItem(HISTORY_KEY);
  target.removeItem(LEGACY_HISTORY_KEY);
}

export function deleteSession(id: string, storage?: Storage) {
  const target = getStorage(storage);
  const next = loadHistory(target ?? undefined).filter(
    (session) => session.id !== id,
  );
  if (!target) return next;
  try {
    target.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* optional local archive */
  }
  return next;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

export function summarizeProgress(sessions: Session[]): ProgressSummary {
  const completed = sessions.filter(
    (session): session is Session & { feedback: Feedback } =>
      Boolean(session.feedback),
  );
  const dimensions: Record<ProgressDimension, number> = {
    english: average(
      completed.map((session) => session.feedback.dimensionAverages.english),
    ),
    technical: average(
      completed.map((session) => session.feedback.dimensionAverages.technical),
    ),
    relevance: average(
      completed.map((session) => session.feedback.dimensionAverages.relevance),
    ),
    structure: average(
      completed.map((session) => session.feedback.dimensionAverages.structure),
    ),
  };
  return {
    completed,
    averageLevel: average(
      completed.map((session) => session.feedback.levelScore),
    ),
    averageJobReadiness: average(
      completed.map((session) => session.feedback.jobReadinessScore),
    ),
    dimensions,
  };
}
