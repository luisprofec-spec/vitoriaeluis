# Sacola de presentes, cartões postais, configurações e banco de dados

## 1. Sacola de presentes (vários de uma vez)
- Cada presente ganha o botão "Adicionar à Sacola" (vira "Na sacola" quando já foi escolhido).
- Um ícone de sacola com contador fica fixo no topo. Ao clicar, abre um painel lateral com:
  - os presentes escolhidos, cada um com foto, nome, valor e botão de remover;
  - o valor total da sacola;
  - o botão "Finalizar Presente".

## 2. Cartões postais no fluxo de confirmação
O fluxo passa a ter 3 passos:
1. **Seus dados**: nome, WhatsApp ou e-mail.
2. **Cartão e mensagem**: escolha entre 4 cartões (Floral, Praia/Lua de Mel, Romântico, Festa). O convidado escreve a mensagem e vê ao vivo a prévia do cartão com o texto.
3. **Pagamento**: resumo dos presentes e do total, Pix em destaque (chave, botão de copiar, QR code) e cartão de crédito ou boleto com os links que os noivos configurarem. Depois, "Confirmar e Enviar Mensagem" grava o presente e abre o WhatsApp dos noivos com a lista.
- No mural, cada recado aparece com o estilo do cartão escolhido.

## 3. Sigilo financeiro
- A página dos convidados não mostra total arrecadado, meta nem progresso.
- O único valor somado que aparece lá é o da própria sacola do convidado.
- Os totais aparecem só em /admin. Além disso, o banco bloqueia os convidados de lerem valores de outras pessoas.

## 4. Painel dos noivos (/admin)
- Nova aba **Configurações**, com um formulário salvo:
  - Chave Pix: tipo e chave;
  - WhatsApp dos noivos;
  - links de pagamento por cartão e por boleto;
  - data do casamento e, para a cerimônia e para a recepção, horário, local e endereço.
  - Ao salvar, a página inicial é atualizada.
- **Tabela de presentes**: uma linha por compra, com os presentes e o total. Cada linha ganha o botão "Agradecer Convidado", que abre o WhatsApp do convidado com uma mensagem carinhosa citando o nome dele e os presentes. Se o contato for um e-mail, o botão abre o e-mail com a mesma mensagem.
- **Mensagens**: alternar entre exibir no mural e ocultar, com o cartão escolhido visível.

## 5. Banco de dados (Lovable Cloud)
- Presentes, recados e configurações ficam salvos na nuvem e aparecem iguais em qualquer aparelho.
- **Login real dos noivos**: /admin pede e-mail e senha, e só as contas marcadas como noivos entram. O código de demonstração 2028 deixa de existir.
- **Os convidados podem**: enviar presentes e recados, e ver os recados liberados e os dados públicos do casamento. Não conseguem ver contatos, valores nem totais.
- Os 4 presentes e 4 recados de exemplo já vêm cadastrados.

## Detalhes técnicos
- Ativar o Lovable Cloud. Tabelas, cada uma com GRANT e RLS:
  - `settings`: linha única; leitura pública e alteração só por admin;
  - `contributions`: guest, contact, items jsonb, total, method, status; leitura e alteração só por admin;
  - `messages`: guest, text, card_style, visible; leitura pública só dos recados visíveis; admin vê todos e altera;
  - `user_roles` com `has_role()`.
- A migração inclui um INSERT com os dados de exemplo.
- O envio do convidado é feito por um server function público com validação via zod e limites de tamanho, que grava a compra e o recado juntos.
- O admin acessa com o cliente autenticado, sob RLS.
- Login por e-mail e senha em /auth, com /admin numa rota protegida.
- A sacola continua só no navegador.
- Testes no Vitest: total da sacola, validação do envio e texto do agradecimento.
