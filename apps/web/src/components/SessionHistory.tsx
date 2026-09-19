import { History } from "lucide-react";
import type { Session } from "./InterviewApp.types";
import { ui } from "./uiClasses";

type SessionHistoryProps = {
  history: Session[];
  onClearHistory: () => void;
  onOpenSession: (session: Session) => void;
};

export function SessionHistory({
  history,
  onClearHistory,
  onOpenSession,
}: SessionHistoryProps) {
  return (
    <div className={ui.panel}>
      <div className="flex items-start justify-between gap-5 max-[560px]:flex-col">
        <div>
          <div className={`${ui.eyebrow} flex items-center gap-[5px]`}>
            <History size={13} />
            Recent sessions
          </div>
          <h2 className="mt-[10px] text-[1.4rem] font-bold tracking-[-0.04em]">
            Your practice archive
          </h2>
        </div>
        {history.length > 0 && (
          <button
            className={ui.secondary}
            type="button"
            onClick={onClearHistory}
          >
            Delete local history
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="py-5 text-[0.85rem] text-muted">
          Your completed interviews will live here, locally and privately.
        </p>
      ) : (
        history.slice(0, 4).map((session) => (
          <button
            className="flex w-full items-center justify-between gap-3 border-0 border-t border-line bg-transparent py-3 text-left text-ink first:border-t-0"
            key={session.id}
            onClick={() => onOpenSession(session)}
          >
            <span>
              <strong>{session.profile.role}</strong>
              <small className="mt-[3px] block text-muted">
                {new Date(session.createdAt).toLocaleDateString()} ·{" "}
                {session.turns.length} answers · {session.englishLevel || "B1"}
              </small>
            </span>
            <span className={ui.chip}>
              {session.feedback ? `${session.feedback.levelScore}/10` : "—"}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
