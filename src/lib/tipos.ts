import type { Selectable } from "kysely";
import type { ConvitesParceiro, DataStatus, Eventos } from "@/lib/db.types";

/** Tipos de linha usados pelas telas (gerados de src/lib/db.types.ts, `npm run db:types`). */
export type Evento = Selectable<Eventos>;
export type Convite = Selectable<ConvitesParceiro>;
export type { DataStatus };
