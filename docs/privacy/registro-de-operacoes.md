# Registro das operações de tratamento de dados pessoais

Registro exigido pelo art. 37 da LGPD, no formato simplificado para agentes de
tratamento de pequeno porte (Resolução CD/ANPD nº 2/2022, art. 9º).

|                       |                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Controlador**       | {{CONTROLADOR}} (pessoa física), responsável pelo Tymebox                                                      |
| **Canal de contato**  | tymebox@gmail.com, que responde a titulares e à ANPD                                                           |
| **Encarregado (DPO)** | Dispensado (Resolução CD/ANPD nº 2/2022, art. 11). O canal acima cumpre a função de comunicação.               |
| **Operador**          | Google LLC (Firebase Authentication, Realtime Database e Hosting)                                              |
| **Projeto**           | Firebase `tymebox-f1a2d`. Proprietários: tymebox@gmail.com e a conta pessoal do controlador. Os dois usam 2FA. |
| **Última revisão**    | 23/10/2026                                                                                                     |

Para os titulares, a versão pública é a Política de Privacidade:
[/privacidade](https://tymebox.web.app/privacidade). O texto está em
`src/features/legal/content/pt.ts`.

## Operações

Os caminhos citados são do Realtime Database (ver `scripts/database-rules.py`).

### 1. Conta e login

- **Dados:**
  - nome, e-mail e foto da conta Google;
  - `uid` do Firebase Auth;
  - datas de criação da conta e do último acesso.
- **Titulares:** usuários do app.
- **Finalidade:** autenticar e identificar o usuário.
- **Base legal:** execução de contrato / procedimentos a pedido do titular
  (art. 7º, V).
- **Onde fica:** no Firebase Auth. O nome do dono também é copiado em
  `meetings/$id/ownerName`, para quem recebe o compartilhamento.
- **Retenção:** enquanto a conta existir. "Excluir conta" apaga o usuário do
  Auth.
- **Acesso:** o próprio usuário. Quem recebe um evento vê o nome do dono.

### 2. Eventos

- **Dados:**
  - nome, descrição e horários previstos e reais;
  - status;
  - marcos (nome, peso, ordem, conclusão, anotações);
  - assuntos paralelos;
  - datas de criação e edição.
- **Titulares:** usuários. As anotações podem conter dados de terceiros que o
  usuário escreva.
- **Finalidade:** prestar o serviço.
- **Base legal:** art. 7º, V.
- **Onde fica:** `meetings/$id`.
- **Retenção:** até o usuário excluir o evento ou a conta.
- **Acesso:**
  - o dono;
  - quem recebeu o evento por e-mail;
  - qualquer pessoa logada com o link, se o dono deixou o link público.

### 3. Compartilhamento por e-mail

- **Dados:** e-mail da pessoa convidada, papel (leitura ou edição) e data em
  que foi adicionada.
- **Titulares:** terceiros convidados pelo usuário.
- **Finalidade:** dar acesso ao evento e montar a lista "Compartilhados
  comigo".
- **Base legal:** legítimo interesse do usuário e do convidado em colaborar
  (art. 7º, IX).
- **Onde fica:** `meetingAccess/$id/members/$emailKey` e
  `sharedWith/$emailKey/$id`.
- **Retenção:** até o dono remover a pessoa, a pessoa sair do evento, o evento
  ser excluído ou uma das contas ser excluída.
- **Acesso:** o dono vê a lista. Cada convidado vê apenas a própria entrada.

### 4. Pedidos de acesso

- **Dados:** e-mail, nome, URL da foto (apenas do Google), mensagem opcional e
  data do pedido.
- **Titulares:** usuários que pedem acesso a um evento.
- **Finalidade:** mostrar ao dono quem pede para entrar.
- **Base legal:** art. 7º, V.
- **Onde fica:**
  - `accessRequests/$id/$emailKey`;
  - o índice `requestsByOwner/$uid/$id/$emailKey`;
  - o índice do solicitante `users/$uid/requested/$id`.
- **Retenção:**
  - o pedido é apagado ao ser aprovado ou recusado;
  - sem resposta, expira em 30 dias (limpo quando o dono abre o app);
  - "Excluir conta" retira os pedidos do solicitante.
- **Acesso:** o dono do evento e o solicitante.

### 5. Preferências e uso

- **Dados:**
  - idioma;
  - modo automático dos marcos;
  - evento atual;
  - eventos compartilhados já abertos, com a data da visita;
  - índice de pedidos feitos.
- **Titulares:** usuários.
- **Finalidade:** manter o app como o usuário deixou, em qualquer aparelho.
- **Base legal:** art. 7º, V.
- **Onde fica:** `users/$uid`.
- **Retenção:** até a exclusão da conta.
- **Acesso:** só o próprio usuário.

### 6. Armazenamento no navegador

- **Dados (chaves do localStorage):**
  - `tw-theme`;
  - `tw-locale`;
  - `tw-sidebar-collapsed`;
  - `tw-onboarding-dismissed`;
  - `tw-threshold-alerts`;
  - `tw-countdown-seconds`.
- **Titulares:** quem usa o navegador.
- **Finalidade:** preferências de funcionamento. Não há rastreamento.
- **Base legal:** são estritamente necessários ao serviço pedido.
- **Onde fica:** só no aparelho; nunca são enviados ao servidor.
- **Retenção:** até o usuário limpar os dados do site. "Excluir conta" apaga
  as chaves `tw-*`.
- **Acesso:** ninguém além do próprio aparelho.

### 7. Registros técnicos

- **Dados:** endereço IP, navegador e horários, nos logs da infraestrutura do
  Google.
- **Titulares:** visitantes e usuários.
- **Finalidade:** segurança e funcionamento.
- **Base legal:** legítimo interesse (art. 7º, IX).
- **Onde fica:** na infraestrutura do Google. O app não lê esses dados.
- **Retenção:** conforme as políticas do Google.
- **Acesso:** Google.

## Compartilhamento e transferência internacional

- **Operador:** o Google (Firebase) é o único. Não há outros destinatários.
  Não há analytics, anúncios nem venda de dados.
- **Local dos servidores:** o Realtime Database fica em us-central1 (Estados
  Unidos). A transferência se apoia nas cláusulas contratuais padrão do Google
  (art. 33, II). Os Termos de Processamento de Dados do Google Cloud e do
  Firebase cobrem o tratamento como operador.

## Medidas de segurança (art. 46)

- **Banco de dados:** fechado por padrão, com regras por caminho e validação
  de campos (`scripts/database-rules.py`).
- **Testes das regras:** testes negativos para cada nó rodam no CI
  (`src/test/rules`) e bloqueiam o deploy se falharem.
- **Acesso por e-mail:** exige `email_verified`.
- **Navegador:**
  - CSP restrita;
  - `frame-ancestors 'none'`;
  - `nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- **Deploy:** o CI usa uma conta de serviço dedicada (`github-deploy`), só com
  Hosting Admin, Realtime Database Admin, Service Usage Consumer e API Keys
  Viewer. A conta `firebase-adminsdk` não tem chaves.
- **Contas e repositório:**
  - 2FA nas contas Google e GitHub;
  - Secret Protection e Push protection no repositório.
- **Dependências:**
  - Dependabot;
  - auditoria de produção no CI;
  - Yarn sem scripts de instalação e com idade mínima de 3 dias para versões
    novas.
- **App Check (reCAPTCHA Enterprise):** preparado no código. O enforcement é
  ligado no console.
- **Incidentes:** ver [incidentes.md](incidentes.md).

## Direitos dos titulares (art. 18)

| Direito                             | Como é atendido                                           |
| ----------------------------------- | --------------------------------------------------------- |
| Confirmação e acesso, portabilidade | Privacidade e dados → "Exportar meus dados" (JSON)        |
| Correção                            | Edição no app. Nome e foto vêm da conta Google.           |
| Eliminação                          | Privacidade e dados → "Excluir conta"                     |
| Informação sobre compartilhamento   | Política de Privacidade, seção 4                          |
| Oposição, revisão e outros          | Pedido por tymebox@gmail.com, com resposta em até 15 dias |

Pedidos recebidos por e-mail são registrados na planilha de pedidos (data,
titular, pedido, resposta e data da resposta). Ela é guardada fora do
repositório.
