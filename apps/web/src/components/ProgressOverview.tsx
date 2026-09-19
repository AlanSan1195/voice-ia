import type {
  EnglishLevel,
  ProgressDimension,
  ProgressFilterLevel,
  ProgressSummary,
} from "./InterviewApp.types";
import { ui } from "./uiClasses";

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
    <div className={`${ui.panel} mb-5`}>
      <div className="flex items-start justify-between gap-5 max-[850px]:flex-col">
        <div>
          <div className={ui.eyebrow}>Progress overview</div>
          <h2 className="mt-[10px] text-[1.4rem] font-bold tracking-[-0.04em]">
            See how your practice is moving
          </h2>
          <p className="mt-[10px] max-w-[48ch] text-[0.8rem] leading-[1.5] text-muted">
            A local view of completed interviews. Nothing is uploaded or synced.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5" aria-label="Progress filters">
          <label className="grid gap-1.5 text-[0.68rem] uppercase tracking-[0.08em] text-muted">
            <span>Role</span>
            <select
              className={ui.select}
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
          <label className="grid gap-1.5 text-[0.68rem] uppercase tracking-[0.08em] text-muted">
            <span>Level</span>
            <select
              className={ui.select}
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
        <p className="py-5 text-[0.85rem] text-muted">
          No completed interviews match these filters yet.
        </p>
      ) : (
        <>
          <div
            className="mt-6 grid grid-cols-3 gap-2.5 max-[560px]:grid-cols-1"
            aria-label="Progress summary"
          >
            <div className="grid gap-[5px] rounded-[14px] border border-line bg-white/[0.025] p-[14px]">
              <span className="text-[0.68rem] text-muted">Completed</span>
              <strong className="text-[1.4rem] tracking-[-0.04em]">
                {progress.completed.length}
              </strong>
              <small className="text-[0.68rem] text-muted">interviews</small>
            </div>
            <div className="grid gap-[5px] rounded-[14px] border border-line bg-white/[0.025] p-[14px]">
              <span className="text-[0.68rem] text-muted">
                English progress
              </span>
              <strong className="text-[1.4rem] tracking-[-0.04em]">
                {formatScore(progress.averageLevel)}
                <small className="ml-0.5 text-[0.65rem] text-muted">/10</small>
              </strong>
              <small className="text-[0.68rem] text-muted">
                average level score
              </small>
            </div>
            <div className="grid gap-[5px] rounded-[14px] border border-line bg-white/[0.025] p-[14px]">
              <span className="text-[0.68rem] text-muted">Job readiness</span>
              <strong className="text-[1.4rem] tracking-[-0.04em]">
                {formatScore(progress.averageJobReadiness)}
                <small className="ml-0.5 text-[0.65rem] text-muted">/10</small>
              </strong>
              <small className="text-[0.68rem] text-muted">average score</small>
            </div>
          </div>
          <div className="mt-[26px] grid grid-cols-2 gap-7 max-[560px]:grid-cols-1">
            <div>
              <h3 className="mb-[15px] text-[0.84rem] font-bold">Dimensions</h3>
              {(Object.keys(dimensionLabels) as ProgressDimension[]).map(
                (dimension) => {
                  const score = progress.dimensions[dimension];
                  return (
                    <div
                      className="grid gap-2 border-t border-line py-[11px] first:border-t-0"
                      key={dimension}
                    >
                      <div className="flex justify-between gap-3 text-[0.78rem] text-muted">
                        <span>{dimensionLabels[dimension]}</span>
                        <strong className="text-ink">
                          {formatScore(score)}
                          <small className="ml-0.5 text-[0.65rem] text-muted">
                            /10
                          </small>
                        </strong>
                      </div>
                      <div
                        className="h-[5px] overflow-hidden rounded-full bg-white/[0.08]"
                        aria-label={`${dimensionLabels[dimension]} ${formatScore(score)} out of 10`}
                      >
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            <div>
              <h3 className="mb-[15px] text-[0.84rem] font-bold">
                Recent practice
              </h3>
              {progress.completed.slice(0, 5).map((session) => (
                <div
                  className="flex items-center justify-between gap-3 border-t border-line py-[11px] first:border-t-0"
                  key={session.id}
                >
                  <div>
                    <strong className="block text-[0.78rem]">
                      {session.profile.role}
                    </strong>
                    <small className="mt-1 block text-[0.68rem] text-muted">
                      {new Date(session.createdAt).toLocaleDateString()} ·{" "}
                      {session.englishLevel || "B1"}
                    </small>
                  </div>
                  <span className={ui.chip}>
                    {session.feedback.levelScore}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
