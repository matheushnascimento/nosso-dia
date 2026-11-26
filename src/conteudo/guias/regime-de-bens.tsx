/**
 * Guia do casamento civil e do regime de bens (M1 · #2).
 * CONTEÚDO INFORMATIVO A REVISAR por alguém com conhecimento jurídico antes da produção.
 * Fontes oficiais no fim da página (Planalto, STF, CNJ), conferidas em 25–26/11/2026.
 * Pontos a revisar estão listados no PR da #2.
 */
export default function RegimeDeBens() {
  return (
    <>
      <p>
        O regime de bens define o que é de cada um e o que é dos dois enquanto vocês estiverem casados, e como
        isso se divide se o casamento acabar. Ele também tem efeito na herança, com regras que dependem de cada
        situação. Vale conversar sobre isso com calma, de preferência meses antes da habilitação.
      </p>

      <h2>Um exemplo para comparar</h2>
      <p>
        Ana já tinha um apartamento antes de casar. Durante o casamento, ela e o Bruno compram um carro com o
        salário dos dois, e o Bruno herda uma casa dos avós. Veja como fica em cada regime se eles se separarem.
      </p>

      <h2>Comunhão parcial de bens</h2>
      <p>
        É o regime padrão: vale se vocês não escolherem outro, e não precisa de pacto antenupcial (a opção é
        registrada no próprio processo de habilitação). O que cada um tinha antes do casamento continua sendo de
        cada um, assim como heranças e doações recebidas depois. O que for comprado durante o casamento é dos
        dois.
      </p>
      <p>
        <strong>No exemplo:</strong> o apartamento continua da Ana, a casa herdada continua do Bruno e o carro é
        dos dois.
      </p>

      <h2>Comunhão universal de bens</h2>
      <p>
        Quase tudo passa a ser dos dois: o que cada um já tinha, o que vier depois e também as dívidas. Há
        exceções previstas em lei, como bens herdados ou doados com cláusula de incomunicabilidade e objetos de uso
        pessoal. Precisa de pacto antenupcial.
      </p>
      <p>
        <strong>No exemplo:</strong> apartamento, carro e casa herdada são dos dois (a casa só ficaria de fora se
        a herança tivesse cláusula de incomunicabilidade).
      </p>

      <h2>Separação convencional de bens</h2>
      <p>
        Cada um continua dono do que tem e do que comprar no próprio nome, e administra os próprios bens
        sozinho. Os dois dividem as despesas da casa na proporção do que ganham, salvo combinação diferente no
        pacto. Precisa de pacto antenupcial.
      </p>
      <p>
        <strong>No exemplo:</strong> o apartamento é da Ana, a casa é do Bruno e o carro é de quem consta como
        comprador (se compraram juntos, de cada um na parte que pagou).
      </p>

      <h2>Participação final nos aquestos</h2>
      <p>
        É o menos comum e mistura os outros: durante o casamento, cada um tem e administra o próprio patrimônio,
        como na separação. Se o casamento acabar, cada um tem direito à metade do que o casal comprou durante o
        casamento (heranças e doações ficam de fora). Precisa de pacto antenupcial e costuma exigir uma
        contabilidade mais cuidadosa.
      </p>
      <p>
        <strong>No exemplo:</strong> durante o casamento, cada um cuida do que é seu. Na separação, o carro entra na
        divisão pela metade; o apartamento e a casa herdada, não.
      </p>

      <h2>Pacto antenupcial: quando e em que ordem</h2>
      <ul>
        <li>
          Qualquer regime diferente da comunhão parcial exige pacto antenupcial, feito por{" "}
          <strong>escritura pública</strong> num tabelionato de notas. Sem escritura, o pacto não vale.
        </li>
        <li>
          A ordem é: <strong>pacto primeiro, habilitação depois</strong>. A escritura é apresentada no cartório
          quando vocês dão entrada na habilitação.
        </li>
        <li>O pacto só produz efeito se o casamento acontecer.</li>
        <li>
          Depois do casamento, o pacto precisa ser registrado no Registro de Imóveis do domicílio do casal para valer
          perante terceiros (bancos, compradores, credores).
        </li>
        <li>
          No pacto dá para combinar outras regras sobre os bens, desde que não contrariem a lei. Um advogado ou o
          próprio tabelião pode explicar o que cabe no caso de vocês.
        </li>
        <li>
          Mudar o regime depois de casados é possível, mas exige um pedido dos dois na Justiça, com motivo. Por isso
          vale decidir antes.
        </li>
      </ul>

      <h2>Casos especiais</h2>
      <p>
        O Código Civil impõe a <strong>separação obrigatória de bens</strong> em três situações:
      </p>
      <ul>
        <li>
          <strong>Quem tem mais de 70 anos.</strong> Desde 2024, o Supremo Tribunal Federal decidiu que essa regra
          pode ser afastada se o casal manifestar a vontade por escritura pública (Tema 1.236). Na prática, isso
          se faz no tabelionato, como um pacto antenupcial.
        </li>
        <li>
          <strong>Quem depende de autorização judicial para casar</strong> (por exemplo, quem tem 16 ou 17 anos e
          precisa que o juiz supra a autorização que os pais negaram).
        </li>
        <li>
          <strong>Quem casa sem respeitar uma causa suspensiva.</strong> Exemplos: a pessoa viúva que tem filhos do
          cônjuge falecido e ainda não fez o inventário e a partilha; a pessoa divorciada cuja partilha de bens
          ainda não foi homologada ou decidida. O juiz pode dispensar algumas dessas causas, se ficar provado que
          ninguém é prejudicado.
        </li>
      </ul>
      <p>Se for o caso de vocês, consultem o cartório e um advogado antes de decidir.</p>

      <h2>Civil no cartório ou religioso com efeito civil</h2>
      <ul>
        <li>
          <strong>Civil no cartório:</strong> a habilitação é feita no cartório da residência de um de vocês, mas o
          casamento pode ser celebrado em qualquer cartório de registro civil. A cerimônia pode ser na sede do
          cartório ou em outro lugar, se a autoridade concordar. Fora do cartório, em local particular, as portas
          ficam abertas e são quatro testemunhas em vez de duas. Perguntem ao cartório se há custo extra.
        </li>
        <li>
          <strong>Religioso com efeito civil:</strong> vocês fazem a habilitação no cartório do mesmo jeito e levam a
          certidão para quem celebra. Depois da cerimônia, o casamento precisa ser registrado no cartório. O Código
          Civil dá 90 dias para isso, mas a Lei de Registros Públicos ainda cita 30: registrem o quanto antes.
          Passado o prazo, é preciso uma nova habilitação.
        </li>
        <li>
          <strong>Cerimônia com celebrante:</strong> não tem efeito civil. O civil é feito à parte, no cartório,
          antes ou depois.
        </li>
        <li>
          <strong>Habilitação:</strong> com os documentos em ordem, o cartório publica o edital de proclamas em meio
          eletrônico e emite o certificado em até 5 dias. Ele vale 90 dias: o casamento (ou a cerimônia religiosa
          com efeito civil) precisa acontecer dentro desse prazo.
        </li>
      </ul>

      <h2>Sobrenome</h2>
      <p>
        Qualquer um dos dois pode acrescentar o sobrenome do outro. Normalmente isso é decidido na habilitação, mas
        hoje também dá para incluir ou tirar o sobrenome do cônjuge depois do casamento, direto no cartório, sem
        precisar da Justiça. Quem mudar atualiza os documentos a partir da certidão de casamento.
      </p>

      <h2>Onde confirmar</h2>
      <ul>
        <li>Cartório de Registro Civil da cidade de vocês: documentos, taxas, prazos e a cerimônia.</li>
        <li>Tabelionato de notas: pacto antenupcial e o que pode constar nele.</li>
        <li>Um advogado de família, se houver patrimônio, empresa, filhos de relações anteriores ou um caso especial.</li>
      </ul>

      <h2>Fontes oficiais</h2>
      <p>Textos consultados em novembro de 2026. As leis mudam: confiram sempre a versão atual.</p>
      <ul>
        <li>
          <a href="https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm" target="_blank" rel="noopener noreferrer">
            Código Civil (Lei nº 10.406/2002)
          </a>
          : regimes de bens (arts. 1.639 a 1.688), pacto antenupcial (arts. 1.653 a 1.657), separação obrigatória
          (art. 1.641) e causas suspensivas (art. 1.523), habilitação e celebração (arts. 1.517 a 1.535), casamento
          religioso com efeito civil (arts. 1.515 e 1.516), gratuidade (art. 1.512) e sobrenome (art. 1.565).
        </li>
        <li>
          <a href="https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm" target="_blank" rel="noopener noreferrer">
            Lei de Registros Públicos (Lei nº 6.015/1973)
          </a>
          : habilitação, proclamas eletrônicos e certificado em até 5 dias (art. 67), registro do casamento
          religioso (arts. 71 a 75) e mudança de sobrenome depois do casamento (art. 57).
        </li>
        <li>
          <a href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14382.htm" target="_blank" rel="noopener noreferrer">
            Lei nº 14.382/2022
          </a>
          , que modernizou os registros públicos (habilitação eletrônica, prazos e sobrenome).
        </li>
        <li>
          <a href="https://portal.stf.jus.br/processos/detalhe.asp?incidente=6096433" target="_blank" rel="noopener noreferrer">
            Supremo Tribunal Federal, ARE 1.309.642 (Tema 1.236)
          </a>
          : separação de bens para maiores de 70 anos pode ser afastada por escritura pública.
        </li>
        <li>
          <a href="https://atos.cnj.jus.br/atos/detalhar/5243" target="_blank" rel="noopener noreferrer">
            Conselho Nacional de Justiça, Provimento nº 149/2023
          </a>
          {" "}(Código Nacional de Normas do Foro Extrajudicial): regras nacionais para cartórios, como o edital de
          proclamas eletrônico (art. 122).
        </li>
      </ul>
    </>
  );
}
