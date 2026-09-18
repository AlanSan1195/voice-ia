type AccessScreenProps = {
  accessCode: string;
  accessBusy: boolean;
  error: string;
  onAccessCodeChange: (value: string) => void;
  onSubmit: () => void;
};

export function AccessScreen({
  accessCode,
  accessBusy,
  error,
  onAccessCodeChange,
  onSubmit,
}: AccessScreenProps) {
  return (
    <main className="app-shell">
      <section className="panel" style={{ maxWidth: 520, margin: "15vh auto" }}>
        <div className="eyebrow">Vera · interview lab</div>
        <h1>Acceso privado</h1>
        <p className="hero-copy">
          Introduce el código de acceso para comenzar. Tu historial se conserva
          únicamente en este navegador.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label className="field">
            Código de acceso
            <input
              autoFocus
              type="password"
              value={accessCode}
              onChange={(event) => onAccessCodeChange(event.target.value)}
            />
          </label>
          <button
            className="primary-btn wide"
            disabled={accessBusy || !accessCode.trim()}
          >
            {accessBusy ? "Validando…" : "Entrar"}
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
