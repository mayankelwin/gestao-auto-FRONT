import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import AppShell from "@/components/layout/AppShell.vue";
import { navigation } from "@/lib/navigation";
import { recursoPorRota } from "@/lib/recursos";

type CarregarTela = () => Promise<unknown>;

const ListaPage: CarregarTela = () => import("@/pages/ListaPage.vue");
const PlaceholderPage: CarregarTela = () => import("@/pages/PlaceholderPage.vue");

const telasProprias: Record<string, CarregarTela> = {
  "/contas-a-receber": () => import("@/pages/AgingPage.vue"),
  "/contas-a-pagar": () => import("@/pages/AgingPage.vue"),
  "/perfis-de-acesso": () => import("@/pages/PerfisDeAcessoPage.vue"),
  "/razao": () => import("@/pages/RazaoPage.vue"),
  "/balancete": () => import("@/pages/BalancetePage.vue"),
  "/balanco": () => import("@/pages/BalancoPage.vue"),
  "/dre": () => import("@/pages/DrePage.vue"),
  "/lotes-e-series": () => import("@/pages/RastreabilidadePage.vue"),
  "/clientes-da-plataforma": () => import("@/pages/PlataformaPage.vue"),
  "/conciliacao-bancaria": () => import("@/pages/ConciliacaoPage.vue"),
  "/turnos-de-caixa": () => import("@/pages/TurnosPage.vue"),
  "/pdv": () => import("@/pages/PdvPage.vue"),
};

const menuRoutes: RouteRecordRaw[] = navigation
  .flatMap((group) => (group.items ?? []).map((item) => ({ item, group })))
  .filter(({ item }) => item.to !== "/")
  .map(({ item, group }) => ({
    path: item.to,
    component:
      telasProprias[item.to] ?? (recursoPorRota.has(item.to) ? ListaPage : PlaceholderPage),
    meta: {
      title: item.label,
      breadcrumb: group.label ? `${group.label} / ${item.label}` : item.label,
      pending: item.pending,
    },
  }));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppShell,
      children: [
        {
          path: "",
          component: () => import("@/pages/DashboardPage.vue"),
          meta: { title: "Dashboard", breadcrumb: "Início" },
        },
        ...menuRoutes,
        {
          path: ":pathMatch(.*)*",
          component: PlaceholderPage,
          meta: { title: "Página não encontrada", pending: "Esta rota não existe." },
        },
      ],
    },
  ],
});
