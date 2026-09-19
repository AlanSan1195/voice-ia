import { Sparkles } from "lucide-react";
import { ui } from "./uiClasses";

export function InterviewHeader() {
  return (
    <header className={ui.topbar}>
      <div className={ui.brand}>
        <span className={ui.brandMark}>
          <Sparkles size={17} />
        </span>{" "}
        vera<span className={ui.subtle}>/ interview lab</span>
      </div>
      <div className={`${ui.subtle} font-mono`}>ENGLISH MODE · 01</div>
    </header>
  );
}
