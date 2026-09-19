type AccessScreenProps = {
  accessCode: string;
  accessBusy: boolean;
  error: string;
  onAccessCodeChange: (value: string) => void;
  onSubmit: () => void;
};

import { ui } from "./uiClasses";

export function AccessScreen({
  accessCode,
  accessBusy,
  error,
  onAccessCodeChange,
  onSubmit,
}: AccessScreenProps) {
  return (
    <main className={ui.shell}>
      <section className={`${ui.panel} mx-auto my-[15vh] max-w-[520px]`}>
        <div className={ui.eyebrow}>Vera · interview lab</div>
        <h1 className="mt-[18px] text-[clamp(2rem,5vw,3rem)] font-bold tracking-[-0.05em]">
          Acceso privado
        </h1>
        <p className="my-5 max-w-[500px] text-[1.05rem] leading-[1.7] text-muted">
          Introduce el código de acceso para comenzar. Tu historial se conserva
          únicamente en este navegador.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className={ui.field}>
            <span className={ui.fieldLabel}>Código de acceso</span>
            <input
              autoFocus
              type="password"
              value={accessCode}
              onChange={(event) => onAccessCodeChange(event.target.value)}
              className={`${ui.textarea} min-h-0`}
            />
          </label>
          <button
            className={`${ui.primary} ${ui.wide}`}
            disabled={accessBusy || !accessCode.trim()}
          >
            {accessBusy ? "Validando…" : "Entrar"}
          </button>
          {error && (
            <p className={ui.error} role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
