import "server-only";

/**
 * Envio do convite de parceiro por e-mail via Resend (https://resend.com).
 * Opcional: sem RESEND_API_KEY e EMAIL_REMETENTE, o app só mostra o link para copiar.
 */
export async function enviarEmailConvite(opcoes: {
  para: string;
  link: string;
  nomeEvento: string;
  quemConvidou: string;
}): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) return false;

  const { para, link, nomeEvento, quemConvidou } = opcoes;
  const html = `
    <div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#2b2622">
      <h1 style="font-weight:normal">${escapar(nomeEvento)}</h1>
      <p>${escapar(quemConvidou)} convidou você para planejarem o casamento juntos no Nosso Dia.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#2b2622;color:#fff;text-decoration:none;border-radius:999px">Aceitar convite</a></p>
      <p style="font-size:13px;color:#7a6f66">O link vale por 7 dias.</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remetente,
        to: [para],
        subject: `${quemConvidou} convidou você para o Nosso Dia`,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
