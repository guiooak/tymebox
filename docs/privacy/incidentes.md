# Resposta a incidentes de segurança

Este é o roteiro para quando algo der errado com dados pessoais no Tymebox. A
base é a Resolução CD/ANPD nº 15/2024 (Regulamento de Comunicação de Incidente
de Segurança).

**Contato:** tymebox@gmail.com. **Projeto:** Firebase `tymebox-f1a2d`.

## O que é um incidente

Qualquer evento, confirmado ou suspeito, que comprometa a confidencialidade,
a integridade ou a disponibilidade de dados pessoais. Por exemplo:

- uma mudança nas regras do banco que abre dados a quem não deveria;
- uma chave de conta de serviço vazada (em commit, log ou print);
- uma conta Google ou GitHub de administrador comprometida;
- uma dependência maliciosa publicada no site;
- dados apagados ou alterados indevidamente.

## 1. Conter (na primeira hora)

1. **Fechar o banco, se dados estiverem expostos.** O caminho mais rápido é o
   console: Firebase → Realtime Database → Regras. Troque tudo por
   `{ "rules": { ".read": false, ".write": false } }` e clique em
   **Publicar**. O app fica fora do ar, mas os dados param de vazar.
   - Pelo terminal, logado como um proprietário (`firebase login`):
     ```bash
     cp database.rules.json /tmp/rules-backup.json
     echo '{ "rules": { ".read": false, ".write": false } }' > database.rules.json
     npx firebase-tools deploy --only database --project tymebox-f1a2d
     git checkout database.rules.json
     ```
   - **Não faça push na `main` enquanto a correção não estiver pronta.** O CI
     publica as regras do repositório a cada push e reabriria o banco.
2. **Revogar chaves.** Abrir Google Cloud → IAM e admin → Contas de serviço →
   `github-deploy` → Chaves, e apagar a chave exposta. Depois, gerar uma nova e
   trocar o secret `FIREBASE_SERVICE_ACCOUNT` no GitHub.
3. **Contas comprometidas:**
   - trocar a senha;
   - revisar o 2FA;
   - encerrar as sessões ativas (Google: Segurança → Seus dispositivos; GitHub:
     Settings → Sessions);
   - revisar quem tem papel no IAM do projeto e nos colaboradores do repositório.
4. **Site comprometido:** reverter o Hosting para a última versão boa em
   Firebase → Hosting → Histórico de versões → Reverter.
5. **Guardar evidências antes de corrigir:**
   - prints;
   - logs do GitHub Actions;
   - o histórico de versões das regras e do Hosting;
   - os horários de cada coisa.

## 2. Avaliar o risco

Responder, com o que se sabe:

- **Quais dados** foram afetados: e-mails, nomes, conteúdo dos eventos.
- **De quantas pessoas**, e quais. Dá para descobrir pelos `uid` e e-mails no
  banco.
- **Por quanto tempo** ficaram expostos, e se houve acesso de fato.
- **Que dano** isso pode causar: phishing com os e-mails, exposição de
  conteúdo sensível escrito nas anotações, etc.

O incidente **precisa ser comunicado** se puder trazer risco ou dano
relevante aos titulares (Res. 15/2024, art. 4º). Isso acontece, por exemplo,
quando dados em larga escala ou conteúdo confidencial vazam. Um incidente
contido sem acesso de ninguém normalmente não precisa ser comunicado, mas
**é registrado mesmo assim** (seção 5).

## 3. Comunicar a ANPD

- **Prazo:** até **3 dias úteis** depois de saber do incidente (art. 6º).
  Informações que faltarem podem ser complementadas em até 20 dias úteis.
- **Como:** pelo formulário de comunicação de incidente no site da ANPD
  (gov.br/anpd → Incidente de segurança → Comunicar incidente), com o login
  gov.br.
- **O que informar:**
  - a natureza dos dados;
  - os titulares afetados;
  - as medidas de segurança que já existiam;
  - os riscos;
  - os motivos de eventual atraso;
  - as medidas tomadas para reverter ou mitigar.

## 4. Comunicar os titulares

No mesmo prazo, por e-mail a cada pessoa afetada, em linguagem simples.
Modelo:

> **Assunto:** Aviso de segurança sobre sua conta no Tymebox
>
> Olá,
>
> No dia [data], identificamos [o que aconteceu, em uma frase]. Isso pode ter
> exposto [quais dados seus] entre [início] e [fim].
>
> O que já fizemos: [medidas: regras corrigidas, chaves revogadas…].
>
> O que recomendamos a você: [ex.: desconfiar de e-mails pedindo login em nome
> do Tymebox; revisar o conteúdo dos seus eventos].
>
> Se tiver dúvidas, ou quiser exportar ou excluir seus dados, responda este
> e-mail ou use Privacidade e dados no app.
>
> Equipe Tymebox, tymebox@gmail.com

Se não for possível identificar quem foi afetado, publicar um aviso no app e
na landing.

## 5. Registrar

Todo incidente fica registrado por pelo menos 5 anos (Res. 15/2024, art. 10),
comunicado ou não. Para cada um, anotar:

- datas em que aconteceu e em que foi descoberto;
- descrição;
- dados e titulares afetados;
- avaliação de risco e decisão de comunicar ou não, com o motivo;
- medidas tomadas;
- comunicações enviadas e protocolo da ANPD.

O registro vai num documento fora do repositório, porque pode conter dados
pessoais.

## 6. Depois

- **Corrigir a causa:** uma regra, uma dependência, um processo.
- **Prevenir a repetição:** escrever um teste em `src/test/rules` que teria
  pegado o problema.
- **Revisar** este documento e o [registro de operações](registro-de-operacoes.md).
