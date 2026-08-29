import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/transacoes");
  await expect(page).toHaveURL(/\/transacoes/);
  await expect(page.getByText("Entradas")).toBeVisible({ timeout: 8_000 });
});

test("exibe totalizadores de receita e despesa", async ({ page }) => {
  await expect(page.getByText("Entradas")).toBeVisible();
  await expect(page.getByText("Saídas")).toBeVisible();
  await expect(page.getByText("Saldo")).toBeVisible();
});

test("FAB abre speed dial e opção Despesa abre modal Lançar transação", async ({ page }) => {
  // O FAB tem aria-label="Ações rápidas"
  await page.getByRole("button", { name: "Ações rápidas" }).click();

  // Speed dial deve mostrar opções
  await expect(page.getByRole("button", { name: "Despesa" })).toBeVisible({ timeout: 3_000 });

  await page.getByRole("button", { name: "Despesa" }).click();

  // QuickAddModal abre com o título "Lançar transação"
  await expect(page.getByText("Lançar transação")).toBeVisible({ timeout: 3_000 });
});

test("criar transação via FAB aparece na lista", async ({ page }) => {
  await page.getByRole("button", { name: "Ações rápidas" }).click();
  await page.getByRole("button", { name: "Despesa" }).click();
  await expect(page.getByText("Lançar transação")).toBeVisible({ timeout: 3_000 });

  // Preencher formulário
  await page.getByPlaceholder(/almoço|salário/i).fill("Teste E2E Despesa");
  await page.locator('input[type="number"]').first().fill("77.5");

  // Salvar
  await page.getByRole("button", { name: "Salvar" }).click();

  // Modal fecha e transação aparece
  await expect(page.getByText("Lançar transação")).not.toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("Teste E2E Despesa")).toBeVisible({ timeout: 5_000 });
});
