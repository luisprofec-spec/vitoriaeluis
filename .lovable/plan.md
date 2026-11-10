# Sacola de presentes, cartões postais e configurações dos noivos

## 1. Sacola de presentes (vários de uma vez)
- Cada presente ganha o botão "Adicionar à Sacola" (vira "Na sacola" quando já foi escolhido).
- Um ícone de sacola com contador fica fixo no topo da página. Ao clicar, abre um painel lateral com:
  - os presentes escolhidos, cada um com foto, nome, valor e botão de remover;
  - o valor total da sacola;
  - o botão "Finalizar Presente", que abre o fluxo de confirmação.
- A sacola é mantida se o convidado recarregar a página.

## 2. Cartões postais no fluxo de confirmação
O fluxo passa a ter 3 passos:
1. **Seus dados**: nome, WhatsApp ou e-mail.
2. **Cartão e mensagem**: escolha entre 4 cartões (Floral, Praia/Lua de Mel, Romântico, Festa), cada um com estilo e ilustração próprios. O convidado escreve a mensagem e vê ao vivo a prévia do cartão com o texto, o nome dele e a assinatura para os noivos.
3. **Pagamento**: resumo dos presentes e do total, Pix em destaque (chave, botão de copiar, QR code) e cartão de crédito ou boleto com o link que os noivos configurarem. Depois, "Confirmar e Enviar Mensagem" abre o WhatsApp dos noivos com a lista de presentes.
- No mural, cada recado aparece com o estilo do cartão escolhido.

## 3. Sigilo financeiro
- A página dos convidados não mostra total arrecadado, meta nem progresso. Hoje ela já não mostra; isso será mantido e revisado.
- O único total na página pública é o da própria sacola do convidado.
- Total arrecadado, meta e progresso aparecem só em /admin.

## 4. Painel dos noivos (/admin)
- Nova aba **Configurações**, com um formulário salvo:
  - Chave Pix: tipo (e-mail, CPF, telefone, aleatória) e a chave;
  - WhatsApp dos noivos;
  - links de pagamento por cartão de crédito e por boleto;
  - data do casamento e horários da cerimônia e da recepção, além do nome e endereço de cada local.
  - Ao salvar, a página inicial é atualizada na hora: contagem regressiva, cartões de "Onde e Quando", Pix e links.
- **Tabela de presentes**: um registro por compra, com todos os presentes escolhidos e o total. Cada linha ganha o botão "Agradecer Convidado", que abre o WhatsApp do convidado com uma mensagem como: "Oi, Marina! Muito obrigado pelo carinho e pelo presente Jantar Romântico na Lua de Mel. Estamos muito felizes em ter você nesse momento — Helena & Rafael". Se o contato for um e-mail, o botão abre o e-mail com a mesma mensagem.
- **Mensagens**: o recado mostra o cartão escolhido.

## Limitação que continua
Os dados ainda ficam salvos só no navegador. Configurações e presentes salvos num aparelho não aparecem em outro. Para os noivos e convidados verem tudo em qualquer aparelho, é preciso ativar um banco de dados. Isso pode ser um passo seguinte.

## Detalhes técnicos
- Estender o armazenamento em `src/lib/wedding.ts`:
  - `settings` (pixType, pixKey, whatsapp, cardLink, boletoLink, date, ceremony/reception {time, place, address});
  - compras com `items[]` e `total`;
  - mensagens com `cardStyle`;
  - um módulo de sacola separado.
- Migrar os dados salvos antes (compras de um só presente viram `items: [gift]`).
- Novos componentes: `CartSheet` (Sheet do shadcn), `PostcardPicker` e `Postcard` (variantes de cartão em `styles.css`, com tokens próprios por estilo), `SettingsForm`.
- Nova aba Configurações com Tabs em /admin.
- Agradecer: telefone normalizado só com dígitos e prefixo 55 em `wa.me`; para e-mail, `mailto:`.
- Testes no Vitest: total da sacola, migração de compras antigas e texto do agradecimento citando o nome e os presentes.
