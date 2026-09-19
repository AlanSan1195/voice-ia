export const ui = {
  shell:
    "mx-auto w-[min(1240px,calc(100%-48px))] py-7 pb-16 max-[560px]:w-[calc(100%-28px)] max-[560px]:pt-[18px]",
  topbar:
    "mb-[72px] flex flex-wrap items-center justify-between gap-6 max-[850px]:mb-[42px]",
  brand:
    "flex items-center gap-3 text-[1.15rem] font-extrabold tracking-[-0.03em]",
  brandMark:
    "grid size-[34px] place-items-center rounded-full bg-accent text-[#0b0e12] shadow-[0_0_32px_rgb(198_242_107_/_18%)]",
  eyebrow: "text-[0.7rem] font-bold uppercase tracking-[0.18em] text-accent",
  muted: "text-muted",
  subtle: "text-subtle",
  panel:
    "rounded-[28px] border border-line bg-gradient-to-br from-[rgb(25_32_44_/_92%)] to-[rgb(14_18_25_/_92%)] p-[30px] shadow-[0_24px_80px_rgb(0_0_0_/_22%)] max-[560px]:rounded-[22px] max-[560px]:p-5",
  panelLabel: "mb-[18px] text-[0.75rem] uppercase tracking-[0.15em] text-muted",
  field: "mb-4 flex flex-col gap-[9px]",
  fieldLabel: "text-[0.78rem] text-muted",
  textarea:
    "w-full resize-y rounded-[17px] border border-line bg-[rgb(5_7_11_/_42%)] p-[15px] leading-[1.55] text-ink outline-none transition duration-200 placeholder:text-subtle focus:border-[rgb(198_242_107_/_65%)] focus:shadow-[0_0_0_3px_rgb(198_242_107_/_8%)]",
  primary:
    "inline-flex items-center justify-center gap-[9px] rounded-full bg-accent px-[18px] py-[13px] font-bold text-[#0b0e12] shadow-[0_8px_28px_rgb(198_242_107_/_15%)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(198_242_107_/_25%)] disabled:opacity-45",
  secondary:
    "inline-flex items-center justify-center gap-[9px] rounded-full bg-white/[0.07] px-[18px] py-[13px] font-bold text-ink transition duration-200 disabled:opacity-45",
  wide: "w-full",
  error: "mt-3 text-[0.8rem] leading-[1.5] text-danger",
  metric: "rounded-[15px] bg-white/[0.045] p-[14px]",
  metricValue: "block text-[1.05rem] font-bold",
  metricLabel: "text-[0.68rem] text-muted",
  chip: "rounded-full bg-[rgb(140_199_255_/_9%)] px-[9px] py-[7px] text-[0.72rem] text-accent-2",
  sideSection: "rounded-[20px] bg-white/[0.045] p-5",
  select:
    "min-w-[132px] rounded-[10px] border border-line bg-panel-hi px-[10px] py-[9px] pr-7 text-[0.75rem] text-ink",
} as const;

export const classes = {
  focus:
    "focus:border-[rgb(198_242_107_/_65%)] focus:shadow-[0_0_0_3px_rgb(198_242_107_/_8%)]",
  hiddenInput: "absolute size-px overflow-hidden opacity-0",
} as const;
