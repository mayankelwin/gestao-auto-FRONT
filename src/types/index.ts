export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "navy";

export type NoteTone = "muted" | "success" | "danger" | "warning";

export type IconButtonTone = "neutral" | "danger" | "accent" | "soft" | "alerta";

export type IconButtonSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface PontoMensal {
  mes: string;
  vendas: number;
  compras: number;
}

export interface Coluna {
  key: string;
  label: string;
  align?: "left" | "right";
}
