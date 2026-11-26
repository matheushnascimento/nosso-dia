import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/**
 * Endpoints do Better Auth (/api/auth/*): links dos e-mails de confirmação e de nova senha.
 * Cadastro, entrada e saída passam pelas Server Actions de src/app/(auth)/actions.ts.
 */
export const GET = (req: Request) => toNextJsHandler(auth()).GET(req);
export const POST = (req: Request) => toNextJsHandler(auth()).POST(req);
