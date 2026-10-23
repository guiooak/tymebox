import { LEGAL } from '../contact';
import type { LegalContent } from './types';

const { controller, email } = LEGAL;

/*
 * Política de Privacidade e Termos de Uso, em português. A versão em inglês
 * (en.ts) tem as mesmas seções, com os mesmos ids; um teste confere.
 */
export const pt: LegalContent = {
  ui: {
    updated: (date) => {
      const [year, month, day] = date.split('-');
      return `Última atualização: ${day}/${month}/${year}`;
    },
    otherLanguage: 'Read in English',
    home: 'Voltar ao Tymebox',
    contents: 'Nesta página',
  },

  privacy: {
    title: 'Política de Privacidade',
    intro:
      'O Tymebox ajuda você a manter reuniões e eventos dentro do tempo. Esta política explica, em linguagem direta, quais dados pessoais usamos, por quê, com quem eles ficam e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018, a LGPD).',
    sections: [
      {
        id: 'controlador',
        title: '1. Quem cuida dos seus dados',
        blocks: [
          `O controlador dos dados é ${controller}, responsável pelo Tymebox (tymebox.web.app).`,
          `Para qualquer pedido ou dúvida sobre privacidade, escreva para ${email}. Esse é o nosso canal de comunicação com titulares de dados e com a Autoridade Nacional de Proteção de Dados (ANPD).`,
        ],
      },
      {
        id: 'dados',
        title: '2. Quais dados usamos e por quê',
        blocks: [
          'Usamos apenas o necessário para o Tymebox funcionar:',
          {
            table: {
              head: ['Dado', 'Para quê', 'Base legal (LGPD, art. 7º)'],
              rows: [
                [
                  'Da sua conta Google: nome, e-mail, foto e um identificador interno',
                  'Entrar no app, identificar você e mostrar seu nome e foto',
                  'Execução do serviço que você pediu (inciso V)',
                ],
                [
                  'Seus eventos: nome, descrição, horários, marcos, anotações e assuntos paralelos',
                  'É o próprio conteúdo do app',
                  'Execução do serviço (inciso V)',
                ],
                [
                  'E-mails das pessoas com quem você compartilha um evento',
                  'Dar acesso a elas e montar a lista "Compartilhados comigo" delas',
                  'Legítimo interesse, seu e delas, em colaborar (inciso IX)',
                ],
                [
                  'Pedidos de acesso: nome, e-mail, foto e mensagem de quem pede',
                  'Mostrar ao dono do evento quem está pedindo para entrar',
                  'Execução do serviço (inciso V)',
                ],
                [
                  'Preferências: idioma, modo automático dos marcos, evento atual e eventos compartilhados que você já abriu',
                  'Manter o app como você deixou, em qualquer aparelho',
                  'Execução do serviço (inciso V)',
                ],
                [
                  'Registros técnicos do Google (endereço IP, navegador) nos servidores',
                  'Segurança e funcionamento da infraestrutura',
                  'Legítimo interesse em manter o serviço seguro (inciso IX)',
                ],
              ],
            },
          },
          'Não usamos ferramentas de analytics, não exibimos anúncios e não vendemos nem alugamos dados.',
        ],
      },
      {
        id: 'quem-ve',
        title: '3. Quem vê o quê',
        blocks: [
          {
            list: [
              'Seus eventos são privados: só você os vê, até compartilhar.',
              'Quem recebe um evento vê o conteúdo dele e o seu nome, como dono.',
              'Só o dono vê a lista de pessoas com acesso e os pedidos de acesso.',
              'Se você abrir um evento por link, qualquer pessoa conectada que tenha o link pode vê-lo (ou editar, se você permitir). Você pode fechar o link a qualquer momento.',
            ],
          },
        ],
      },
      {
        id: 'operadores',
        title: '4. Com quem os dados ficam, e onde',
        blocks: [
          'O Tymebox é hospedado no Google Firebase (Authentication, Realtime Database e Hosting), que trata os dados em nosso nome, como operador.',
          'Os servidores ficam nos Estados Unidos. Essa transferência internacional se apoia nas cláusulas contratuais padrão adotadas pelo Google (LGPD, art. 33, II).',
          'Não compartilhamos seus dados com mais ninguém, a não ser por ordem judicial ou obrigação legal.',
        ],
      },
      {
        id: 'retencao',
        title: '5. Por quanto tempo',
        blocks: [
          {
            list: [
              'Guardamos seus dados enquanto sua conta existir.',
              'Pedidos de acesso sem resposta expiram depois de 30 dias.',
              'Ao excluir sua conta, apagamos seus eventos, seus compartilhamentos, seus pedidos e seu perfil na hora. Cópias de segurança mantidas pelo Google somem no ciclo normal delas.',
            ],
          },
        ],
      },
      {
        id: 'direitos',
        title: '6. Seus direitos',
        blocks: [
          'A LGPD (art. 18) garante a você estes direitos, e eis como exercê-los:',
          {
            list: [
              'Confirmar e acessar seus dados, e levá-los com você (portabilidade): em Privacidade e dados, use "Exportar meus dados" para baixar tudo num arquivo JSON.',
              'Corrigir: edite seus eventos no próprio app; nome e foto vêm da sua conta Google e se alteram por lá.',
              'Excluir: em Privacidade e dados, use "Excluir conta".',
              'Saber com quem seus dados são compartilhados: veja a seção 4.',
              `Qualquer outro pedido, inclusive oposição a um tratamento ou revisão: escreva para ${email}. Respondemos em até 15 dias.`,
            ],
          },
          'Você também pode reclamar à ANPD (www.gov.br/anpd).',
        ],
      },
      {
        id: 'armazenamento-local',
        title: '7. Cookies e armazenamento no navegador',
        blocks: [
          'O Tymebox não usa cookies de rastreamento. Ele guarda no seu navegador (localStorage) só preferências de funcionamento: tema, idioma, menu recolhido, alertas e o aviso de boas-vindas. Elas ficam no seu aparelho e não são enviadas a ninguém. Por serem essenciais, não pedem consentimento; você pode apagá-las limpando os dados do site no navegador.',
        ],
      },
      {
        id: 'seguranca',
        title: '8. Segurança',
        blocks: [
          'Os dados trafegam com criptografia (HTTPS) e ficam criptografados nos servidores do Google. Regras no banco de dados garantem que cada pessoa só leia e altere o que pode, e o acesso por e-mail exige um endereço verificado. As contas que administram o serviço usam autenticação em dois fatores.',
          'Se acontecer um incidente de segurança que possa trazer risco ou dano relevante a você, avisaremos você e a ANPD, nos prazos da regulamentação.',
        ],
      },
      {
        id: 'menores',
        title: '9. Crianças e adolescentes',
        blocks: ['O Tymebox não é direcionado a menores de 18 anos.'],
      },
      {
        id: 'mudancas',
        title: '10. Mudanças nesta política',
        blocks: [
          'Se esta política mudar, atualizaremos a data no topo e avisaremos no app quando a mudança for relevante.',
        ],
      },
    ],
  },

  terms: {
    title: 'Termos de Uso',
    intro:
      'Ao usar o Tymebox, você concorda com estes termos. Eles são curtos; leia com calma.',
    sections: [
      {
        id: 'servico',
        title: '1. O serviço',
        blocks: [
          'O Tymebox é uma ferramenta gratuita para planejar e conduzir eventos dentro de uma caixa de tempo. Ele é oferecido como está, sem garantia de disponibilidade contínua ou de adequação a um fim específico.',
          `O serviço é mantido por ${controller}. Contato: ${email}.`,
        ],
      },
      {
        id: 'conta',
        title: '2. Sua conta',
        blocks: [
          'Você entra com sua conta Google e é responsável pelo que acontece nela. Se suspeitar de uso indevido, saia de todas as sessões na sua conta Google e fale conosco.',
        ],
      },
      {
        id: 'uso',
        title: '3. Uso aceitável',
        blocks: [
          'Ao usar o Tymebox, você concorda em não:',
          {
            list: [
              'publicar conteúdo ilegal, ofensivo ou que viole direitos de outras pessoas;',
              'compartilhar eventos com quem não espera recebê-los ou usar o compartilhamento para enviar spam;',
              'tentar acessar eventos ou dados sem permissão, ou burlar as proteções do serviço;',
              'sobrecarregar ou atrapalhar o funcionamento do serviço.',
            ],
          },
        ],
      },
      {
        id: 'conteudo',
        title: '4. Seu conteúdo',
        blocks: [
          'O que você escreve nos eventos é seu. Você nos autoriza apenas a guardá-lo e exibi-lo a você e a quem você der acesso. Você é responsável pelo conteúdo e pelos e-mails das pessoas com quem compartilha.',
        ],
      },
      {
        id: 'encerramento',
        title: '5. Encerramento',
        blocks: [
          'Você pode excluir sua conta quando quiser, em Privacidade e dados. Podemos suspender contas que violem estes termos e, se o serviço for descontinuado, avisaremos com antecedência razoável para você exportar seus dados.',
        ],
      },
      {
        id: 'responsabilidade',
        title: '6. Responsabilidade',
        blocks: [
          'Na medida permitida pela lei, o Tymebox não responde por perdas indiretas decorrentes do uso ou da indisponibilidade do serviço. Nada aqui limita direitos que o Código de Defesa do Consumidor garante a você.',
        ],
      },
      {
        id: 'lei',
        title: '7. Lei e foro',
        blocks: [
          'Estes termos seguem as leis do Brasil. Fica eleito o foro do seu domicílio.',
          'Como tratamos seus dados está na Política de Privacidade.',
        ],
      },
    ],
  },
};
