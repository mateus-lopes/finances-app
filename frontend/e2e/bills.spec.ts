import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/recorrentes");
  await expect(page).toHaveURL(/\/recorrentes/);
  await expect(page.getByRole("button", { name: "Despesas" })).toBeVisible({ timeout: 8_000 });
});

test("exibe abas de Despesas, Parcelas e Receitas", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Despesas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Receitas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Parcelas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aportes" })).toBeVisible();
});

test("exibe totalizadores por aba (Despesas)", async ({ page }) => {
  await expect(page.getByText("Comprometido")).toBeVisible();
  await expect(page.getByText("Pago")).toBeVisible();
  await expect(page.getByText("A pagar")).toBeVisible();
});

test("trocar para aba Receitas muda totalizadores", async ({ page }) => {
  await page.getByRole("button", { name: "Receitas" }).click();
  await expect(page.getByText("Previsto")).toBeVisible();
  await expect(page.getByText("Recebido")).toBeVisible();
  await expect(page.getByText("A receber")).toBeVisible();
});

test("FAB abre speed dial e opção Recorrente abre modal Novo recorrente", async ({ page }) => {
  // O FAB tem aria-label="Ações rápidas"
  await page.getByRole("button", { name: "Ações rápidas" }).click();

  await expect(page.getByRole("button", { name: "Recorrente" })).toBeVisible({ timeout: 3_000 });
  await page.getByRole("button", { name: "Recorrente" }).click();

  // QuickBillModal abre com o título "Novo recorrente"
  await expect(page.getByText("Novo recorrente")).toBeVisible({ timeout: 3_000 });
});
