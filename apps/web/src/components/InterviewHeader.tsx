import { Sparkles } from "lucide-react";

export function InterviewHeader() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Sparkles size={17} />
        </span>{" "}
        vera<span className="subtle">/ interview lab</span>
      </div>
      <div className="mono subtle">ENGLISH MODE · 01</div>
    </header>
  );
}
