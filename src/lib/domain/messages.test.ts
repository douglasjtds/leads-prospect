import { describe, expect, it } from 'vitest';
import { fazerLead } from './__fixtures__/lead';
import {
  despedida,
  formatarNota,
  mensagem,
  nichoPlural,
  primeiraMensagem,
  respostasRapidas,
  URL_SITE,
  varianteEfetiva,
  VERSOES_DESPEDIDA,
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
  const camila = { empresa: 'Dra. Camila Branco Cirurgiã Dentista' };

  it('Sem site, com 5+ avaliações', () => {
    expect(
      primeiraMensagem(fazerLead({ ...camila, situacao: 'Sem site', cidade: 'Araçatuba', nota: 5, avaliacoes: 1234 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Estava pesquisando dentistas em Araçatuba no Google e encontrei vocês: 1.234 avaliações com nota 5,0, parabéns! Reparei que vocês ainda não têm site no perfil.

      Posso te mostrar como ficaria uma página pra Dra. Camila Branco Cirurgiã Dentista?"
    `);
  });

  it('Instagram no lugar do site, com menos de 5 avaliações (sem os números)', () => {
    expect(
      primeiraMensagem(
        fazerLead({ empresa: 'Pet Feliz', situacao: 'Instagram no lugar do site', nicho: 'Pet shop', avaliacoes: 4 }),
        'curta',
      ),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Estava pesquisando pet shops em Presidente Prudente no Google e encontrei vocês. Reparei que o botão "Site" de vocês leva pro Instagram.

      Posso te mostrar como ficaria uma página pra Pet Feliz?"
    `);
  });

  it('Facebook no lugar do site, sem nota', () => {
    expect(
      primeiraMensagem(fazerLead({ ...camila, situacao: 'Facebook no lugar do site', nota: null, avaliacoes: 40 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Estava pesquisando dentistas em Presidente Prudente no Google e encontrei vocês. Reparei que o botão "Site" de vocês leva pro Facebook.

      Posso te mostrar como ficaria uma página pra Dra. Camila Branco Cirurgiã Dentista?"
    `);
  });

  it('WhatsApp no lugar do site', () => {
    expect(
      primeiraMensagem(fazerLead({ ...camila, situacao: 'WhatsApp no lugar do site', nota: 4.9, avaliacoes: 12 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Estava pesquisando dentistas em Presidente Prudente no Google e encontrei vocês: 12 avaliações com nota 4,9, parabéns! Reparei que o botão "Site" de vocês leva direto pro WhatsApp.

      Posso te mostrar como ficaria uma página pra Dra. Camila Branco Cirurgiã Dentista?"
    `);
  });

  it('Link na bio / plataforma', () => {
    expect(
      primeiraMensagem(
        fazerLead({
          empresa: 'Dr. João Lima Psicólogo',
          situacao: 'Link na bio / plataforma',
          nicho: 'Psicólogo',
          cidade: 'Marília',
          avaliacoes: 0,
        }),
        'curta',
      ),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Estava pesquisando psicólogos em Marília no Google e encontrei vocês. Reparei que o botão "Site" de vocês leva pra uma página de links.

      Posso te mostrar como ficaria uma página pra Dr. João Lima Psicólogo?"
    `);
  });

  it('Site amador', () => {
    expect(
      primeiraMensagem(fazerLead({ ...camila, situacao: 'Site amador (construtor grátis)', nota: 4.7, avaliacoes: 88 }), 'curta'),
    ).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Estava pesquisando dentistas em Presidente Prudente no Google e encontrei vocês: 88 avaliações com nota 4,7, parabéns! Dei uma olhada na página de vocês e tenho 2 ou 3 ideias pra ela trazer mais clientes.

      Posso te mandar o que pensei pra Dra. Camila Branco Cirurgiã Dentista?"
    `);
  });

  it('Situação vazia: sem a frase de observação', () => {
    expect(primeiraMensagem(fazerLead({ ...camila, situacao: null }), 'curta')).toMatchInlineSnapshot(`
      "Oi, tudo bem? Aqui é o Douglas, sou desenvolvedor web.

      Estava pesquisando dentistas em Presidente Prudente no Google e encontrei vocês: 32 avaliações com nota 4,8, parabéns!

      Posso te mostrar como ficaria uma página pra Dra. Camila Branco Cirurgiã Dentista?"
    `);
  });

  it('sem nome da empresa: o fecho volta para "vocês"', () => {
    expect(primeiraMensagem(fazerLead({ empresa: '  ', situacao: 'Sem site' }), 'curta')).toContain(
      'Posso te mostrar como ficaria uma página pra vocês?',
    );
    expect(primeiraMensagem(fazerLead({ empresa: '', situacao: 'Site amador (construtor grátis)' }), 'curta')).toContain(
      'Posso te mandar o que pensei pra vocês?',
    );
  });

  it('cita o nome sem artigo, nunca "encontrei a/o {empresa}", e sempre fala com "vocês"', () => {
    for (const situacao of SITUACOES) {
      const texto = primeiraMensagem(fazerLead({ ...camila, situacao }), 'curta');
      expect(texto).toContain('encontrei vocês');
      expect(texto).toContain(`pra ${camila.empresa}?`);
      expect(texto).not.toMatch(/\b(a|o|da|do) Dra\./);
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
        "chave": "rrPreco",
        "rotulo": "Quanto custa?",
        "texto": "O plano essencial começa em R$ 500, tá explicado no site. Se quiser, te digo o que entraria no caso de vocês pra ficar mais claro.",
      },
      {
        "chave": "rrInstagram",
        "rotulo": "Já tenho Instagram",
        "texto": "Faz sentido, e o Instagram continua sendo a vitrine. A página não substitui, ela complementa: no Instagram a pessoa precisa rolar o feed pra achar endereço, serviços e horários. Na página ela acha tudo em 5 segundos e clica no WhatsApp.",
      },
      {
        "chave": "rrAgoraNao",
        "rotulo": "Agora não",
        "texto": "Tranquilo! Posso te chamar de novo em janeiro? Começo de ano é quando o pessoal costuma organizar essas coisas.",
      },
      {
        "chave": "rrLink",
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
      ...chaves.map((c) => mensagem(c)),
      ...respostasRapidas().flatMap((r) => [r.rotulo, r.texto]),
      ...SITUACOES.map((situacao) => primeiraMensagem(fazerLead({ situacao }), 'curta')),
    ];
    for (const t of textos) expect(t).not.toMatch(/[—–]/);
  });
});

describe('despedida', () => {
  const cainã = fazerLead({ empresa: 'Cainã Nicolletti Personal Trainer', avaliacoes: 37, nota: 5 });

  it('padrão: copy exata, link numa linha própria', () => {
    expect(despedida(cainã, 'padrão')).toBe(
      [
        'Sem problema, obrigado por responder! Vou deixar aqui meu site com alguns exemplos de páginas que já fiz, caso queira dar uma olhada por curiosidade:',
        URL_SITE,
        '',
        'Sem compromisso nenhum. Sucesso pra vocês! 💪',
      ].join('\n'),
    );
  });

  it('curta: copy exata', () => {
    expect(despedida(cainã, 'curta')).toBe(
      [
        'Tranquilo, obrigado pelo retorno! Se um dia quiser ver como ficaria, deixo aqui alguns trabalhos meus:',
        URL_SITE,
        '',
        'Sucesso!',
      ].join('\n'),
    );
  });

  it('avaliações: preenche empresa, número e nota do lead', () => {
    expect(despedida(cainã, 'avaliações')).toBe(
      [
        'Entendo, obrigado por responder! Só deixo aqui meu site com exemplos de páginas, caso queira ver como ficaria uma pra Cainã Nicolletti Personal Trainer mostrando essas 37 avaliações com nota 5,0:',
        URL_SITE,
        '',
        'Sem compromisso, qualquer coisa é só chamar. Abraço!',
      ].join('\n'),
    );
  });

  it('avaliações: milhar com ponto', () => {
    expect(despedida(fazerLead({ empresa: 'X', avaliacoes: 1234, nota: 4.7 }), 'avaliações')).toContain(
      'pra X mostrando essas 1.234 avaliações com nota 4,7:',
    );
  });

  it('empresa vazia vira "vocês"; espaços nas pontas são aparados', () => {
    expect(despedida(fazerLead({ empresa: '' }), 'avaliações')).toContain('uma pra vocês mostrando');
    expect(despedida(fazerLead({ empresa: '  Studio X  ' }), 'avaliações')).toContain('uma pra Studio X mostrando');
  });

  it.each([
    ['menos de 5 avaliações', { avaliacoes: 4, nota: 5 }],
    ['sem nota', { avaliacoes: 30, nota: null }],
    ['sem avaliações', { avaliacoes: null, nota: 4.9 }],
  ])('avaliações, %s: sem números', (_, dados) => {
    const texto = despedida(fazerLead({ empresa: 'Studio X', ...dados }), 'avaliações');
    expect(texto).toContain('caso queira ver como ficaria uma pra Studio X:\n');
    expect(texto).not.toContain('avaliações com nota');
  });

  it('modelo salvo pela tela sai com as variáveis do lead preenchidas', () => {
    const modelos = { despedidaCurta: 'Valeu, {empresa}{avaliacoes}! {cidade}' };
    expect(despedida(fazerLead({ empresa: 'Studio X', cidade: 'Londrina', avaliacoes: 12, nota: 4.5 }), 'curta', modelos)).toBe(
      'Valeu, Studio X mostrando essas 12 avaliações com nota 4,5! Londrina',
    );
  });

  it('nenhuma versão deixa variável sem preencher nem travessão', () => {
    const leads = [cainã, fazerLead({ empresa: '' }), fazerLead({ avaliacoes: null, nota: null })];
    for (const lead of leads) {
      for (const versao of VERSOES_DESPEDIDA) {
        const texto = despedida(lead, versao);
        expect(texto).not.toMatch(/[{}—–]|undefined|null|NaN/);
        expect(texto).toContain(`\n${URL_SITE}\n`);
      }
    }
  });
});
