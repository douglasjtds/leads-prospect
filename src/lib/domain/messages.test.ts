import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import {
  formatarNota,
  mensagem,
  nichoPlural,
  primeiraMensagem,
  respostasRapidas,
  varianteEfetiva,
  type ChaveMensagem,
} from './messages';
import { SITUACOES } from './types';

describe('nichoPlural', () => {
  it.each([
    ['Clínica de estética', 'clínicas de estética'],
    ['Dentista', 'dentistas'],
    ['Psicólogo', 'psicólogos'],
    ['Nutricionista', 'nutricionistas'],
    ['Advogado', 'advogados'],
    ['Contabilidade', 'escritórios de contabilidade'],
    ['Personal trainer', 'personal trainers'],
    ['Marcenaria', 'marcenarias'],
    ['Estética automotiva', 'estética automotiva'],
    ['Pet shop', 'pet shops'],
  ])('%s → %s', (nicho, plural) => {
    expect(nichoPlural(nicho)).toBe(plural);
  });

  it('aceita variação de acento e maiúsculas', () => {
    expect(nichoPlural('  PSICOLOGO ')).toBe('psicólogos');
  });

  it('fora da lista: minúsculo; palavra única em vogal ganha s, composto fica igual', () => {
    expect(nichoPlural('Fisioterapeuta')).toBe('fisioterapeutas');
    expect(nichoPlural('Salão de Beleza')).toBe('salão de beleza');
    expect(nichoPlural('Barbearia')).toBe('barbearias');
    expect(nichoPlural('Clínica veterinária')).toBe('clínica veterinária');
  });
});

describe('nota', () => {
  it('vírgula decimal e uma casa', () => {
    expect(formatarNota(5)).toBe('5,0');
    expect(formatarNota(4.8)).toBe('4,8');
  });
});

describe('primeira · curta', () => {
  it('Sem site, com 5+ avaliações', () => {
    expect(primeiraMensagem(fazerLead({ situacao: 'Sem site', nota: 5, avaliacoes: 1234 }), 'curta')).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Vi o perfil de vocês no Google: 1.234 avaliações com nota 5,0, parabéns! Reparei que vocês ainda não têm site no perfil.

      Posso te mostrar como ficaria uma página pra vocês?"
    `);
  });

  it('Instagram no lugar do site, com menos de 5 avaliações (prova pelo nicho)', () => {
    expect(
      primeiraMensagem(fazerLead({ situacao: 'Instagram no lugar do site', nicho: 'Pet shop', avaliacoes: 4 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Vi o perfil de vocês no Google pesquisando pet shops em Presidente Prudente. Reparei que o botão "Site" de vocês leva pro Instagram.

      Posso te mostrar como ficaria uma página pra vocês?"
    `);
  });

  it('Facebook no lugar do site, sem nota', () => {
    expect(
      primeiraMensagem(fazerLead({ situacao: 'Facebook no lugar do site', nota: null, avaliacoes: 40 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Vi o perfil de vocês no Google pesquisando dentistas em Presidente Prudente. Reparei que o botão "Site" de vocês leva pro Facebook.

      Posso te mostrar como ficaria uma página pra vocês?"
    `);
  });

  it('WhatsApp no lugar do site', () => {
    expect(primeiraMensagem(fazerLead({ situacao: 'WhatsApp no lugar do site', nota: 4.9, avaliacoes: 12 }), 'curta')).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Vi o perfil de vocês no Google: 12 avaliações com nota 4,9, parabéns! Reparei que o botão "Site" de vocês leva direto pro WhatsApp.

      Posso te mostrar como ficaria uma página pra vocês?"
    `);
  });

  it('Link na bio / plataforma', () => {
    expect(
      primeiraMensagem(fazerLead({ situacao: 'Link na bio / plataforma', nicho: 'Psicólogo', cidade: 'Marília', avaliacoes: 0 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Vi o perfil de vocês no Google pesquisando psicólogos em Marília. Reparei que o botão "Site" de vocês leva pra uma página de links.

      Posso te mostrar como ficaria uma página pra vocês?"
    `);
  });

  it('Site amador', () => {
    expect(
      primeiraMensagem(fazerLead({ situacao: 'Site amador (construtor grátis)', nota: 4.7, avaliacoes: 88 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Vi o perfil de vocês no Google: 88 avaliações com nota 4,7, parabéns! Dei uma olhada na página de vocês e tenho 2 ou 3 ideias pra ela trazer mais clientes.

      Posso te mandar?"
    `);
  });

  it('Situação vazia: sem a frase de observação', () => {
    expect(primeiraMensagem(fazerLead({ situacao: null }), 'curta')).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Vi o perfil de vocês no Google: 32 avaliações com nota 4,8, parabéns!

      Posso te mostrar como ficaria uma página pra vocês?"
    `);
  });

  it('nunca escreve "encontrei a" e sempre fala com "vocês"', () => {
    for (const situacao of SITUACOES) {
      const texto = primeiraMensagem(fazerLead({ situacao }), 'curta');
      expect(texto.toLowerCase()).not.toContain('encontrei');
      expect(texto).toContain('vocês');
    }
  });
});

describe('primeira · completa', () => {
  it('usa a coluna Mensagem (texto)', () => {
    const lead = fazerLead({ mensagemTexto: '  Mensagem pré-gerada.  ' });
    expect(primeiraMensagem(lead, 'completa')).toBe('Mensagem pré-gerada.');
    expect(varianteEfetiva(lead, 'completa')).toBe('completa');
  });

  it('sem texto cai para a curta', () => {
    const lead = fazerLead({ mensagemTexto: '' });
    expect(primeiraMensagem(lead, 'completa')).toBe(primeiraMensagem(lead, 'curta'));
    expect(varianteEfetiva(lead, 'completa')).toBe('curta');
    expect(varianteEfetiva(lead, 'curta')).toBe('curta');
  });
});

describe('demais mensagens', () => {
  it('fu3', () => expect(mensagem('fu3')).toMatchInlineSnapshot(`"Oi! Passando só pra ver se você viu minha mensagem. Se não for o momento, sem problema, é só me avisar 🙂"`));
  it('fu7', () => expect(mensagem('fu7')).toMatchInlineSnapshot(`"Última mensagem por aqui, prometo. Se um dia quiserem uma página pra receber quem chega pelo Google, é só me chamar. Sucesso pra vocês!"`));
  it('furar', () => expect(mensagem('furar')).toMatchInlineSnapshot(`"Oi! Aqui é o Douglas, desenvolvedor web. Queria falar com o responsável sobre uma página pra vocês receberem melhor quem chega pelo Google. Consegue me direcionar?"`));
  it('cobrarRA', () => expect(mensagem('cobrarRA')).toMatchInlineSnapshot(`"Oi! Passando pra ver se conseguiram ver minha mensagem sobre a página de vocês 🙂"`));
  it('site', () => expect(mensagem('site')).toMatchInlineSnapshot(`
    "Show! Esse é o meu site, com páginas que já estão no ar e como funciona:
    https://douglastertuliano.vercel.app/

    Pra vocês, eu pensaria numa página com quem vocês são, os principais serviços, as avaliações do Google em destaque e um botão direto pro WhatsApp. A entrega é em até 10 dias úteis.

    Me conta: hoje a maioria dos clientes chega como? Indicação, Instagram ou Google?"
  `));
  it('proposta', () => expect(mensagem('proposta')).toMatchInlineSnapshot(`"Oi! Conseguiu dar uma olhada na proposta? Fico à disposição pra ajustar o que precisar."`));
  it('respostas rápidas', () => expect(respostasRapidas()).toMatchInlineSnapshot(`
    [
      {
        "rotulo": "Quanto custa?",
        "texto": "O plano essencial começa em R$ 400, tá explicado no site. Se quiser, te digo o que entraria no caso de vocês pra ficar mais claro.",
      },
      {
        "rotulo": "Já tenho Instagram",
        "texto": "Faz sentido, e o Instagram continua sendo a vitrine. A página não substitui, ela complementa: no Instagram a pessoa precisa rolar o feed pra achar endereço, serviços e horários. Na página ela acha tudo em 5 segundos e clica no WhatsApp.",
      },
      {
        "rotulo": "Agora não",
        "texto": "Tranquilo! Posso te chamar de novo em janeiro? Começo de ano é quando o pessoal costuma organizar essas coisas.",
      },
      {
        "rotulo": "Link do site",
        "texto": "https://douglastertuliano.vercel.app/",
      },
    ]
  `));
});

describe('regras de texto', () => {
  it('nenhuma mensagem tem travessão', () => {
    const chaves: ChaveMensagem[] = ['fu3', 'fu7', 'furar', 'cobrarRA', 'site', 'proposta'];
    const textos = [
      ...chaves.map(mensagem),
      ...respostasRapidas().flatMap((r) => [r.rotulo, r.texto]),
      ...SITUACOES.map((situacao) => primeiraMensagem(fazerLead({ situacao }), 'curta')),
    ];
    for (const t of textos) expect(t).not.toMatch(/[—–]/);
  });
});
