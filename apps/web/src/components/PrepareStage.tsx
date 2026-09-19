import type { DragEvent } from "react";
import { FileText, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { EnglishLevel } from "./InterviewApp.types";
import { ReadySignal } from "./ReadySignal";
import { ui } from "./uiClasses";

type PrepareStageProps = {
  jobDescription: string;
  englishLevel: EnglishLevel;
  cvFileName: string;
  dragActive: boolean;
  busy: boolean;
  error: string;
  onJobDescriptionChange: (value: string) => void;
  onEnglishLevelChange: (level: EnglishLevel) => void;
  onDragEnter: (event: DragEvent<HTMLLabelElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onFileChange: (file?: File) => void;
  onStart: () => void;
};

const levelDescriptions: Record<EnglishLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-intermediate",
};

export function PrepareStage({
  jobDescription,
  englishLevel,
  cvFileName,
  dragActive,
  busy,
  error,
  onJobDescriptionChange,
  onEnglishLevelChange,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onStart,
}: PrepareStageProps) {
  return (
    <motion.section
      key="prepare"
      className="grid grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] items-end gap-[72px] mb-14 max-[850px]:grid-cols-1 max-[850px]:gap-7 max-[850px]:mb-[34px]"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
    >
      <div>
        <ReadySignal />
        <div className={ui.eyebrow}>Technical interview rehearsal</div>
        <h1 className="my-[18px] max-w-[760px] text-[clamp(3rem,7vw,6.8rem)] font-bold leading-[0.94] tracking-[-0.08em]">
          Practice with <em className="text-accent not-italic">purpose.</em>
        </h1>
        <p className="max-w-[500px] text-[1.05rem] leading-[1.7] text-muted">
          Convierte tu próximo puesto o tu experiencia en una entrevista técnica
          en inglés, diseñada para ayudarte a pensar, responder y mejorar.
        </p>
      </div>
      <div className={ui.panel}>
        <p className={ui.panelLabel}>01 / prepara tu sesión</p>
        <div className={ui.field}>
          <label className={ui.fieldLabel}>¿Qué puesto estás buscando?</label>
          <textarea
            className={ui.textarea}
            value={jobDescription}
            onChange={(event) => onJobDescriptionChange(event.target.value)}
            placeholder="Pega aquí el nombre del puesto, responsabilidades, tecnologías y requisitos..."
          />
        </div>
        <div className={ui.field}>
          <label className={ui.fieldLabel}>Tu nivel de inglés</label>
          <div
            className="grid grid-cols-4 gap-2 max-[560px]:grid-cols-2"
            role="radiogroup"
            aria-label="Nivel de inglés"
          >
            {(["A1", "A2", "B1", "B2"] as EnglishLevel[]).map((level) => (
              <button
                type="button"
                role="radio"
                aria-checked={englishLevel === level}
                tabIndex={englishLevel === level ? 0 : -1}
                className={`flex flex-col items-start gap-1 rounded-[14px] border px-3 py-[11px] text-left transition duration-200 ${englishLevel === level ? "border-[rgb(198_242_107_/_65%)] bg-[rgb(198_242_107_/_10%)]" : "border-line bg-white/[0.035] hover:border-[rgb(198_242_107_/_65%)] hover:bg-[rgb(198_242_107_/_10%)]"}`}
                onClick={() => onEnglishLevelChange(level)}
                key={level}
              >
                <strong
                  className={`text-[0.95rem] ${englishLevel === level ? "text-accent" : "text-ink"}`}
                >
                  {level}
                </strong>
                <span className="text-[0.62rem] leading-[1.2] text-muted">
                  {levelDescriptions[level]}
                </span>
              </button>
            ))}
          </div>
          <small className="text-[0.7rem] text-subtle">
            La entrevista adaptará su vocabulario y dificultad a este nivel.
          </small>
        </div>
        <div className={ui.field}>
          <label>
            CV <span className={ui.muted}>· opcional</span>
          </label>
          <label
            className={`flex min-h-[70px] items-center gap-3 rounded-[17px] border border-dashed p-[15px] transition duration-200 ${dragActive ? "border-accent bg-[rgb(198_242_107_/_10%)] shadow-[0_0_0_3px_rgb(198_242_107_/_8%)]" : "border-line bg-[rgb(5_7_11_/_42%)]"}`}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <FileText size={22} className="text-accent" />
            <span>
              <strong className="block text-[0.86rem]">
                {cvFileName || "Arrastra tu CV aquí"}
              </strong>
              <small className="text-muted">
                o haz clic para seleccionar un PDF, TXT o Markdown
              </small>
            </span>
            <input
              className="absolute size-px overflow-hidden opacity-0"
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              onChange={(event) => onFileChange(event.target.files?.[0])}
            />
          </label>
        </div>
        <button
          className={`${ui.primary} ${ui.wide}`}
          disabled={busy}
          onClick={onStart}
        >
          {busy ? "Preparando tu entrevista…" : "Preparar entrevista"}
          <Sparkles size={16} />
        </button>
        {error && <p className={ui.error}>{error}</p>}
      </div>
    </motion.section>
  );
}
