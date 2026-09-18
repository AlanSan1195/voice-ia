import { History } from "lucide-react";
import type { Session } from "./InterviewApp.types";

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
    <div className="panel">
      <div className="interview-head">
        <div>
          <div className="eyebrow">
            <History
              size={13}
              style={{ verticalAlign: "middle", marginRight: 5 }}
            />{" "}
            Recent sessions
          </div>
          <h2 style={{ fontSize: "1.4rem", margin: "10px 0 0" }}>
            Your practice archive
          </h2>
        </div>
        {history.length > 0 && (
          <button
            className="secondary-btn"
            type="button"
            onClick={onClearHistory}
          >
            Delete local history
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="empty">
          Your completed interviews will live here, locally and privately.
        </p>
      ) : (
        history.slice(0, 4).map((session) => (
          <button
            className="history-item"
            key={session.id}
            onClick={() => onOpenSession(session)}
          >
            <span>
              <strong>{session.profile.role}</strong>
              <small>
                {new Date(session.createdAt).toLocaleDateString()} ·{" "}
                {session.turns.length} answers · {session.englishLevel || "B1"}
              </small>
            </span>
            <span className="chip">
              {session.feedback ? `${session.feedback.levelScore}/10` : "—"}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
