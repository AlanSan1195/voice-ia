import type {
  EnglishLevel,
  ProgressDimension,
  ProgressFilterLevel,
  ProgressSummary,
} from "./InterviewApp.types";

type ProgressOverviewProps = {
  progress: ProgressSummary;
  progressRole: string;
  progressLevel: ProgressFilterLevel;
  progressRoles: string[];
  onProgressRoleChange: (role: string) => void;
  onProgressLevelChange: (level: ProgressFilterLevel) => void;
};

const dimensionLabels: Record<ProgressDimension, string> = {
  english: "English",
  technical: "Technical",
  relevance: "Relevance",
  structure: "Structure",
};

function formatScore(value: number) {
  return value ? value.toFixed(1) : "—";
}

export function ProgressOverview({
  progress,
  progressRole,
  progressLevel,
  progressRoles,
  onProgressRoleChange,
  onProgressLevelChange,
}: ProgressOverviewProps) {
  return (
    <div className="panel progress-panel">
      <div className="interview-head">
        <div>
          <div className="eyebrow">Progress overview</div>
          <h2 style={{ fontSize: "1.4rem", margin: "10px 0 0" }}>
            See how your practice is moving
          </h2>
          <p className="muted progress-intro">
            A local view of completed interviews. Nothing is uploaded or synced.
          </p>
        </div>
        <div className="progress-filters" aria-label="Progress filters">
          <label>
            Role
            <select
              value={progressRole}
              onChange={(event) => onProgressRoleChange(event.target.value)}
            >
              <option value="all">All roles</option>
              {progressRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Level
            <select
              value={progressLevel}
              onChange={(event) =>
                onProgressLevelChange(event.target.value as ProgressFilterLevel)
              }
            >
              <option value="all">All levels</option>
              {(["A1", "A2", "B1", "B2"] as EnglishLevel[]).map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {progress.completed.length === 0 ? (
        <p className="empty">
          No completed interviews match these filters yet.
        </p>
      ) : (
        <>
          <div className="progress-summary" aria-label="Progress summary">
            <div className="progress-stat">
              <span>Completed</span>
              <strong>{progress.completed.length}</strong>
              <small>interviews</small>
            </div>
            <div className="progress-stat">
              <span>English progress</span>
              <strong>
                {formatScore(progress.averageLevel)}
                <small>/10</small>
              </strong>
              <small>average level score</small>
            </div>
            <div className="progress-stat">
              <span>Job readiness</span>
              <strong>
                {formatScore(progress.averageJobReadiness)}
                <small>/10</small>
              </strong>
              <small>average score</small>
            </div>
          </div>
          <div className="progress-grid">
            <div className="progress-dimensions">
              <h3>Dimensions</h3>
              {(Object.keys(dimensionLabels) as ProgressDimension[]).map(
                (dimension) => {
                  const score = progress.dimensions[dimension];
                  return (
                    <div className="dimension-row" key={dimension}>
                      <div>
                        <span>{dimensionLabels[dimension]}</span>
                        <strong>
                          {formatScore(score)}
                          <small>/10</small>
                        </strong>
                      </div>
                      <div
                        className="dimension-track"
                        aria-label={`${dimensionLabels[dimension]} ${formatScore(score)} out of 10`}
                      >
                        <span style={{ width: `${score * 10}%` }} />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            <div className="progress-recent">
              <h3>Recent practice</h3>
              {progress.completed.slice(0, 5).map((session) => (
                <div className="progress-session" key={session.id}>
                  <div>
                    <strong>{session.profile.role}</strong>
                    <small>
                      {new Date(session.createdAt).toLocaleDateString()} ·{" "}
                      {session.englishLevel || "B1"}
                    </small>
                  </div>
                  <span className="chip">{session.feedback.levelScore}/10</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
