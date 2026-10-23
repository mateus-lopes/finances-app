import type { Router } from "express";
import type { Database } from "../../db/client";
import type { Clock } from "../../shared/kernel/clock";
import type { RequireAuth } from "../../shared/infrastructure/http/auth-context";
import type { LedgerApi } from "./contracts";
import { LedgerFacade } from "./application/ledger-facade";
import { GetAccountBalances } from "./application/use-cases/accounts/get-account-balances";
import { GetRealBalance } from "./application/use-cases/accounts/get-real-balance";
import { CreateAccount } from "./application/use-cases/accounts/create-account";
import { UpdateAccount } from "./application/use-cases/accounts/update-account";
import { DeactivateAccount } from "./application/use-cases/accounts/deactivate-account";
import { ListCreditCardInvoices } from "./application/use-cases/invoices/list-credit-card-invoices";
import { GetCreditCardInvoice } from "./application/use-cases/invoices/get-credit-card-invoice";
import { ToggleInvoicePaid } from "./application/use-cases/invoices/toggle-invoice-paid";
import { ListTransactions } from "./application/use-cases/transactions/list-transactions";
import { CreateTransaction } from "./application/use-cases/transactions/create-transaction";
import { UpdateTransaction } from "./application/use-cases/transactions/update-transaction";
import { DeleteTransaction } from "./application/use-cases/transactions/delete-transaction";
import { AutoCategorizeByHistory } from "./application/use-cases/transactions/auto-categorize-by-history";
import { ListCategories } from "./application/use-cases/categories/list-categories";
import { CreateCategory } from "./application/use-cases/categories/create-category";
import { UpdateCategory } from "./application/use-cases/categories/update-category";
import { DeleteCategory } from "./application/use-cases/categories/delete-category";
import { DrizzleAccountRepository } from "./infrastructure/drizzle-account-repository";
import { DrizzleTransactionRepository } from "./infrastructure/drizzle-transaction-repository";
import { DrizzleCategoryRepository } from "./infrastructure/drizzle-category-repository";
import { DrizzleInvoiceRepository } from "./infrastructure/drizzle-invoice-repository";
import { createAccountsRouter } from "./presentation/http/accounts.routes";
import { createTransactionsRouter } from "./presentation/http/transactions.routes";
import { createCategoriesRouter } from "./presentation/http/categories.routes";

export interface LedgerModuleDeps {
  db: Database;
  clock: Clock;
  requireAuth: RequireAuth;
}

export interface LedgerModule {
  accountsRouter: Router;
  transactionsRouter: Router;
  categoriesRouter: Router;
  api: LedgerApi;
}

export function createLedgerModule({ db, clock, requireAuth }: LedgerModuleDeps): LedgerModule {
  const accounts = new DrizzleAccountRepository(db);
  const transactions = new DrizzleTransactionRepository(db);
  const categories = new DrizzleCategoryRepository(db);
  const invoices = new DrizzleInvoiceRepository(db);

  const listCreditCardInvoices = new ListCreditCardInvoices(accounts, transactions, invoices);
  const getAccountBalances = new GetAccountBalances(accounts, transactions, listCreditCardInvoices, clock);
  const getRealBalance = new GetRealBalance(accounts, transactions);

  return {
    accountsRouter: createAccountsRouter({
      requireAuth,
      getAccountBalances,
      createAccount: new CreateAccount(accounts, transactions, clock),
      updateAccount: new UpdateAccount(accounts),
      deactivateAccount: new DeactivateAccount(accounts),
      getCreditCardInvoice: new GetCreditCardInvoice(accounts, transactions, invoices),
      toggleInvoicePaid: new ToggleInvoicePaid(invoices, clock),
    }),
    transactionsRouter: createTransactionsRouter({
      requireAuth,
      listTransactions: new ListTransactions(transactions, accounts, categories),
      createTransaction: new CreateTransaction(transactions),
      updateTransaction: new UpdateTransaction(transactions),
      deleteTransaction: new DeleteTransaction(transactions),
      autoCategorizeByHistory: new AutoCategorizeByHistory(transactions),
    }),
    categoriesRouter: createCategoriesRouter({
      requireAuth,
      listCategories: new ListCategories(categories),
      createCategory: new CreateCategory(categories),
      updateCategory: new UpdateCategory(categories),
      deleteCategory: new DeleteCategory(categories),
    }),
    api: new LedgerFacade({
      accounts,
      transactions,
      categories,
      getAccountBalances,
      getRealBalance,
      listCreditCardInvoices,
    }),
  };
}
