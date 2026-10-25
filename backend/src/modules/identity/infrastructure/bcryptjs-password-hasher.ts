import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../application/ports";

const COST = 10;

/** bcrypt em JS puro (roda no Workers); compatível com os hashes `$2b$` já gravados. */
export class BcryptjsPasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
