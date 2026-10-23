import { LEGAL } from '../contact';
import type { LegalContent } from './types';

const { controller, email } = LEGAL;

/*
 * Privacy Policy and Terms of Use in English, a translation of pt.ts with the
 * same section ids. The Portuguese text is the reference one.
 */
export const en: LegalContent = {
  ui: {
    updated: (date) => {
      const [year, month, day] = date.split('-').map(Number);
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return `Last updated: ${months[month - 1]} ${day}, ${year}`;
    },
    otherLanguage: 'Ler em português',
    home: 'Back to Tymebox',
    contents: 'On this page',
  },

  privacy: {
    title: 'Privacy Policy',
    intro:
      'Tymebox helps you keep meetings and events inside their time box. This policy explains, plainly, what personal data we use, why, who holds it and how you stay in control, under Brazil’s General Data Protection Law (Law 13,709/2018, the LGPD).',
    sections: [
      {
        id: 'controlador',
        title: '1. Who looks after your data',
        blocks: [
          `The data controller is ${controller}, who runs Tymebox (tymebox.web.app).`,
          `For any privacy request or question, write to ${email}. That is our channel for data subjects and for Brazil’s data protection authority (ANPD).`,
        ],
      },
      {
        id: 'dados',
        title: '2. What data we use and why',
        blocks: [
          'We use only what Tymebox needs to work:',
          {
            table: {
              head: ['Data', 'What for', 'Legal basis (LGPD, art. 7)'],
              rows: [
                [
                  'From your Google account: name, email, photo and an internal identifier',
                  'Signing you in, telling who you are, showing your name and photo',
                  'Performing the service you asked for (item V)',
                ],
                [
                  'Your events: name, description, times, milestones, notes and side topics',
                  'It is the app’s own content',
                  'Performing the service (item V)',
                ],
                [
                  'Emails of the people you share an event with',
                  'Giving them access and building their "Shared with me" list',
                  'Legitimate interest, yours and theirs, in working together (item IX)',
                ],
                [
                  'Access requests: the requester’s name, email, photo and message',
                  'Showing the event’s owner who is asking to join',
                  'Performing the service (item V)',
                ],
                [
                  'Preferences: language, automatic milestone mode, current event and shared events you have opened',
                  'Keeping the app the way you left it, on any device',
                  'Performing the service (item V)',
                ],
                [
                  'Google’s technical logs (IP address, browser) on the servers',
                  'Security and running the infrastructure',
                  'Legitimate interest in keeping the service secure (item IX)',
                ],
              ],
            },
          },
          'We use no analytics, show no ads, and never sell or rent data.',
        ],
      },
      {
        id: 'quem-ve',
        title: '3. Who sees what',
        blocks: [
          {
            list: [
              'Your events are private: only you see them until you share.',
              'People you share an event with see its content and your name, as its owner.',
              'Only the owner sees who has access and the access requests.',
              'If you open an event by link, anyone signed in who has the link can see it (or edit it, if you allow). You can close the link at any time.',
            ],
          },
        ],
      },
      {
        id: 'operadores',
        title: '4. Who holds the data, and where',
        blocks: [
          'Tymebox runs on Google Firebase (Authentication, Realtime Database and Hosting), which processes the data on our behalf, as a processor.',
          'The servers are in the United States. This international transfer relies on the standard contractual clauses Google has adopted (LGPD, art. 33, II).',
          'We share your data with no one else, unless a court order or the law requires it.',
        ],
      },
      {
        id: 'retencao',
        title: '5. For how long',
        blocks: [
          {
            list: [
              'We keep your data while your account exists.',
              'Unanswered access requests expire after 30 days.',
              'When you delete your account, your events, shares, requests and profile are erased right away. Backups kept by Google go on their normal cycle.',
            ],
          },
        ],
      },
      {
        id: 'direitos',
        title: '6. Your rights',
        blocks: [
          'The LGPD (art. 18) gives you these rights, and this is how to use them:',
          {
            list: [
              'Confirm and access your data, and take it with you (portability): in Privacy and data, use "Export my data" to download everything as a JSON file.',
              'Correct it: edit your events in the app; your name and photo come from your Google account and change there.',
              'Delete it: in Privacy and data, use "Delete account".',
              'Know who your data is shared with: see section 4.',
              `Anything else, including objecting to a use or asking for a review: write to ${email}. We reply within 15 days.`,
            ],
          },
          'You can also complain to the ANPD (www.gov.br/anpd).',
        ],
      },
      {
        id: 'armazenamento-local',
        title: '7. Cookies and browser storage',
        blocks: [
          'Tymebox uses no tracking cookies. It keeps only working preferences in your browser (localStorage): theme, language, collapsed menu, alerts and the welcome card. They stay on your device and are sent to no one. Being essential, they need no consent; you can remove them by clearing the site’s data in your browser.',
        ],
      },
      {
        id: 'seguranca',
        title: '8. Security',
        blocks: [
          'Data travels encrypted (HTTPS) and is encrypted on Google’s servers. Database rules make sure each person reads and changes only what they may, and access by email requires a verified address. The accounts that run the service use two-factor authentication.',
          'If a security incident could bring you relevant risk or harm, we will tell you and the ANPD within the regulatory deadlines.',
        ],
      },
      {
        id: 'menores',
        title: '9. Children and teenagers',
        blocks: ['Tymebox is not aimed at people under 18.'],
      },
      {
        id: 'mudancas',
        title: '10. Changes to this policy',
        blocks: [
          'If this policy changes, we update the date at the top and say so in the app when the change matters.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Use',
    intro: 'By using Tymebox you agree to these terms. They are short; take your time.',
    sections: [
      {
        id: 'servico',
        title: '1. The service',
        blocks: [
          'Tymebox is a free tool for planning and running events inside a time box. It is provided as is, with no guarantee of uninterrupted availability or fitness for a particular purpose.',
          `The service is run by ${controller}. Contact: ${email}.`,
        ],
      },
      {
        id: 'conta',
        title: '2. Your account',
        blocks: [
          'You sign in with your Google account and are responsible for what happens in it. If you suspect misuse, sign out of every session in your Google account and get in touch.',
        ],
      },
      {
        id: 'uso',
        title: '3. Acceptable use',
        blocks: [
          'When using Tymebox you agree not to:',
          {
            list: [
              'post content that is illegal, offensive or infringes other people’s rights;',
              'share events with people who don’t expect them, or use sharing to send spam;',
              'try to reach events or data without permission, or get around the service’s protections;',
              'overload or disrupt the service.',
            ],
          },
        ],
      },
      {
        id: 'conteudo',
        title: '4. Your content',
        blocks: [
          'What you write in your events is yours. You only allow us to store it and show it to you and to the people you give access. You are responsible for the content and for the emails of the people you share with.',
        ],
      },
      {
        id: 'encerramento',
        title: '5. Ending',
        blocks: [
          'You can delete your account whenever you like, in Privacy and data. We may suspend accounts that break these terms and, if the service is discontinued, we will give reasonable notice so you can export your data.',
        ],
      },
      {
        id: 'responsabilidade',
        title: '6. Liability',
        blocks: [
          'To the extent the law allows, Tymebox is not liable for indirect losses from using the service or from it being unavailable. Nothing here limits the rights Brazil’s Consumer Protection Code gives you.',
        ],
      },
      {
        id: 'lei',
        title: '7. Law and venue',
        blocks: [
          'These terms are governed by the laws of Brazil, and disputes go to the courts where you live.',
          'How we handle your data is in the Privacy Policy.',
        ],
      },
    ],
  },
};
