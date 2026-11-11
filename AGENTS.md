# 💍 MatrimoniX - Plataforma White-Label de Casamento & Lista de Presentes Direta via Pix

> MVP desenvolvido no Lovable.dev para validação de mercado de uma plataforma de casamentos personalizável (white-label), com lista de presentes convertida em cotas financeiras com liquidação direta via Pix e QR Code dinâmico (taxa zero), eliminando taxas de intermediação de plataformas tradicionais.

---

## 🔗 Links do Projeto
- **Aplicação Publicada:** [https://vitoriaeluis.lovable.app/]
- **Repositório GitHub:** `https://github.com/SEU_USUARIO/NOME_DO_REPOSITORIO`

---

## 💡 A Dor de Negócio
Plataformas consagradas de casamento (como Casar.com e iCasei) cobram taxas entre 3,8% e 6% para repassar aos noivos o valor em dinheiro dos presentes virtuais. Em um casamento com arrecadação média entre R$ 30.000 e R$ 60.000, os noivos chegam a perder de R$ 1.200 a R$ 3.600 exclusivamente em comissões de intermediação.

O **MatrimoniX** resolve esse gargalo eliminando o intermediário: o convidado escolhe os presentes em uma interface interativa, e o valor total cai 100% líquido na conta bancária dos noivos via Pix dinâmico, sem comissões retidas. Além disso, a plataforma foi estruturada como *white-label*, permitindo ser comercializada como serviço para outros casais.

---

## 📊 Dimensionamento de Mercado
- **TAM (Total Addressable Market):** R$ 40 bilhões/ano (Mercado nacional de eventos sociais e celebrações de casamentos).
- **SAM (Serviceable Addressable Market):** R$ 2,5 bilhões/ano (Casais que utilizam listas de presentes virtuais em dinheiro no Brasil).
- **SOM (Serviceable Obtainable Market):** Convidados da festa dos próprios noivos no teste piloto, expandindo para 50 casais no primeiro ano de comercialização do software.

---

## 📋 Business Model Canvas
| Bloco | Definição |
| :--- | :--- |
| **Proposta de Valor** | Plataforma completa de casamento (música, fotos, contagem regressiva e presentes) com recebimento direto via Pix sem taxas percentuais. |
| **Segmento de Clientes** | Noivos que buscam autonomia financeira e convidados que priorizam praticidade ao presentear. |
| **Canais** | Links diretos em convites virtuais, WhatsApp e divulgação orgânica/redes sociais. |
| **Fontes de Receita** | Licença única de uso da plataforma para os noivos (taxa fixa de ativação, sem reter porcentagem dos presentes). |
| **Estrutura de Custos** | Hospedagem em nuvem (Lovable Cloud / Vercel), domínio e manutenção do código. |
| **Atividades-Chave** | Manutenção do gerador de payload Pix, gestão de catálogo e melhorias de UI/UX. |

---

## 🎯 Tese do MVP e Processos Manuais

### Tese Validada:
1. Os **convidados** preferem selecionar cotas simbólicas somadas em uma única sacola e pagar direto por Pix ou cartão, em vez de comprar presentes físicos redundantes.
2. Os **noivos** preferem o valor integral líquido em conta para bancar despesas da festa e lua de mel, sem repassar 4% a intermediários.

### O que ficou manual de propósito (Lean MVP):
- **Agradecimento aos convidados:** Realizado diretamente via WhatsApp através do botão de 1 clique no painel administrativo, mantendo o tom afetuoso e pessoal.
- **Conciliação bancária:** O noivo valida a entrada no aplicativo do seu banco e marca o pedido como "Confirmado" no painel `/admin`.
- **Curadoria dos presentes:** Títulos, categorias e valores são cadastrados pelos noivos pela interface do sistema.

---

## 🛠️ Tecnologias Utilizadas
- **Desenvolvimento Low-Code / IA:** [Lovable.dev](https://lovable.dev)
- **Frontend & Lógica:** React, TypeScript, Vite
- **Estilização & UI:** Tailwind CSS, shadcn/ui
- **Biblioteca de Ícones:** Lucide React
- **Pagamentos:** Gerador de payload Pix EMV BR Code + Links externos para checkout em cartão/boleto.

---

## 🧠 Mega Prompt Original Utilizado
```markdown
# Projeto: Site de Casamento White-Label com Lista de Presentes via Pix Dinâmico

Crie uma aplicação web moderna, elegante e responsiva para site de casamento, com visual white-label customizável pelo painel /admin, sacola multisseleção de presentes, seleção de cartões postais, player de música com contorno de autoplay e checkout com QR Code Pix dinâmico calculado na hora.
