import "server-only";

/**
 * E-mails do app via Resend (https://resend.com): confirmação de cadastro, nova senha e convite.
 * Retorna true só quando o e-mail saiu de fato.
 *
 * Sem RESEND_API_KEY e EMAIL_REMETENTE:
 *  - em desenvolvimento, o e-mail (com o link) é mostrado no terminal do `next dev`;
 *  - em produção, o envio falha e o erro vai para o log.
 */

type Email = { para: string; assunto: string; titulo: string; paragrafos: string[]; botao: { texto: string; link: string }; rodape?: string };

export async function enviarEmail(email: Email): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;

  if (!chave || !remetente) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `\n[nosso-dia] E-mail (sem Resend configurado, só no terminal)\n` +
          `  Para: ${email.para}\n  Assunto: ${email.assunto}\n  Link: ${email.botao.link}\n`,
      );
      return false; // não saiu de verdade (o convite, por exemplo, mostra o link para copiar)
    }
    console.error("[nosso-dia] E-mail não enviado: RESEND_API_KEY ou EMAIL_REMETENTE ausente.");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remetente,
        to: [email.para],
        subject: email.assunto,
        html: html(email),
        text: [email.titulo, ...email.paragrafos, `${email.botao.texto}: ${email.botao.link}`, email.rodape ?? ""].join("\n\n"),
      }),
    });
    if (!res.ok) console.error("[nosso-dia] Resend respondeu", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[nosso-dia] Falha ao enviar e-mail:", e);
    return false;
  }
}

function html({ titulo, paragrafos, botao, rodape }: Email): string {
  return `
    <div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#2b2622">
      <h1 style="font-weight:normal">${escapar(titulo)}</h1>
      ${paragrafos.map((p) => `<p>${escapar(p)}</p>`).join("")}
      <p><a href="${escapar(botao.link)}" style="display:inline-block;padding:12px 20px;background:#2b2622;color:#fff;text-decoration:none;border-radius:999px">${escapar(botao.texto)}</a></p>
      ${rodape ? `<p style="font-size:13px;color:#7a6f66">${escapar(rodape)}</p>` : ""}
    </div>`;
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Convite do parceiro (Configurações). */
export function enviarEmailConvite(opcoes: { para: string; link: string; nomeEvento: string; quemConvidou: string }) {
  const { para, link, nomeEvento, quemConvidou } = opcoes;
  return enviarEmail({
    para,
    assunto: `${quemConvidou} convidou você para o Nosso Dia`,
    titulo: nomeEvento,
    paragrafos: [`${quemConvidou} convidou você para planejarem o casamento juntos no Nosso Dia.`],
    botao: { texto: "Aceitar convite", link },
    rodape: "O link vale por 7 dias.",
  });
}
