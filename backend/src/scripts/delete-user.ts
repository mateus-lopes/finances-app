import { db } from "../db/client";
import { users } from "../db/schema";
import { eq, ne } from "drizzle-orm";

const KEEP_EMAIL = "mateusalbano22@gmail.com";

async function run() {
  const all = await db.select({ id: users.id, email: users.email, name: users.name }).from(users);

  console.log("\nUsuários no banco:");
  all.forEach(u => console.log(`  [${u.id}] ${u.name} — ${u.email}`));

  const toDelete = all.filter(u => u.email !== KEEP_EMAIL);
  if (!toDelete.length) {
    console.log("\nNenhum usuário para deletar.");
    process.exit(0);
  }

  console.log("\nVão ser deletados (cascade em todos os dados):");
  toDelete.forEach(u => console.log(`  [${u.id}] ${u.name} — ${u.email}`));

  const result = await db.delete(users).where(ne(users.email, KEEP_EMAIL)).returning({ id: users.id, email: users.email });

  console.log(`\n✓ ${result.length} usuário(s) deletado(s).`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
