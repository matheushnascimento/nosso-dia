/**
 * Guia do casamento civil e do regime de bens (M1 · #2).
 * CONTEÚDO INFORMATIVO A REVISAR por alguém com conhecimento jurídico antes da produção.
 * Base: Código Civil (Lei 10.406/2002) e Lei 6.015/1973 (arts. 57 e 67, redação da Lei 14.382/2022),
 * texto compilado do Planalto (25/11/2026). Pontos a revisar estão listados no PR da #2.
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
        Em algumas situações a lei impõe a <strong>separação obrigatória de bens</strong>, por exemplo quando um
        dos dois tem mais de 70 anos, quando alguém depende de autorização judicial para casar ou quando há uma
        causa suspensiva (como a pessoa viúva que ainda não fez a partilha dos bens do casamento anterior). Há
        decisões judiciais e exceções que mudam como essas regras se aplicam. Se for o caso de vocês, consultem o
        cartório e um advogado antes de decidir.
      </p>

      <h2>Civil no cartório ou religioso com efeito civil</h2>
      <ul>
        <li>
          <strong>Civil no cartório:</strong> depois da habilitação, vocês marcam a cerimônia com o cartório. Ela pode
          ser na sede do cartório ou em outro lugar, se o cartório fizer. Fora do cartório, em local particular,
          são quatro testemunhas em vez de duas, e costuma haver taxa extra.
        </li>
        <li>
          <strong>Religioso com efeito civil:</strong> vocês fazem a habilitação no cartório do mesmo jeito e levam a
          certidão para quem celebra. Depois da cerimônia, o casamento precisa ser registrado no cartório dentro do
          prazo legal (o Código Civil fala em 90 dias). Fora do prazo, é preciso uma nova habilitação.
        </li>
        <li>
          <strong>Cerimônia com celebrante:</strong> não tem efeito civil. O civil é feito à parte, no cartório,
          antes ou depois.
        </li>
        <li>
          <strong>Validade da habilitação:</strong> 90 dias a partir da emissão do certificado. O casamento (ou a
          cerimônia religiosa com efeito civil) precisa acontecer dentro desse prazo.
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
    </>
  );
}
