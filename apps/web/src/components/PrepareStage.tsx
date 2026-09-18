import type { DragEvent } from "react";
import { FileText, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import type { EnglishLevel } from "./InterviewApp.types";
import { ReadySignal } from "./ReadySignal";

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
      className="hero"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
    >
      <div>
        <ReadySignal />
        <div className="eyebrow">Technical interview rehearsal</div>
        <h1>
          Practice with <em>purpose.</em>
        </h1>
        <p className="hero-copy">
          Convierte tu próximo puesto o tu experiencia en una entrevista técnica
          en inglés, diseñada para ayudarte a pensar, responder y mejorar.
        </p>
      </div>
      <div className="panel">
        <p className="panel-label">01 / prepara tu sesión</p>
        <div className="field">
          <label>¿Qué puesto estás buscando?</label>
          <textarea
            value={jobDescription}
            onChange={(event) => onJobDescriptionChange(event.target.value)}
            placeholder="Pega aquí el nombre del puesto, responsabilidades, tecnologías y requisitos..."
          />
        </div>
        <div className="field">
          <label>Tu nivel de inglés</label>
          <div
            className="level-options"
            role="radiogroup"
            aria-label="Nivel de inglés"
          >
            {(["A1", "A2", "B1", "B2"] as EnglishLevel[]).map((level) => (
              <button
                type="button"
                role="radio"
                aria-checked={englishLevel === level}
                tabIndex={englishLevel === level ? 0 : -1}
                className={`level-option ${englishLevel === level ? "active" : ""}`}
                onClick={() => onEnglishLevelChange(level)}
                key={level}
              >
                <strong>{level}</strong>
                <span>{levelDescriptions[level]}</span>
              </button>
            ))}
          </div>
          <small className="level-hint">
            La entrevista adaptará su vocabulario y dificultad a este nivel.
          </small>
        </div>
        <div className="field">
          <label>
            CV <span className="muted">· opcional</span>
          </label>
          <label
            className={`file-drop ${dragActive ? "drag-active" : ""}`}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <FileText size={22} color="var(--accent)" />
            <span>
              <strong>{cvFileName || "Arrastra tu CV aquí"}</strong>
              <small>o haz clic para seleccionar un PDF, TXT o Markdown</small>
            </span>
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              onChange={(event) => onFileChange(event.target.files?.[0])}
            />
          </label>
        </div>
        <button className="primary-btn wide" disabled={busy} onClick={onStart}>
          {busy ? "Preparando tu entrevista…" : "Preparar entrevista"}
          <Sparkles size={16} />
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </motion.section>
  );
}
