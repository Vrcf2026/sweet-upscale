# Documentos de Segurança Privada — app de gestão

App para um instalador certificado (Registo Prévio PSP) gerar, arquivar e exportar os documentos oficiais das suas instalações, com login e acesso multi-dispositivo.

## Fase 1 — Base e dados

- Ativar o backend (Lovable Cloud): base de dados, autenticação e ficheiros, sem contas externas.
- Login por email/password. Cada utilizador só vê os seus dados.
- Tabelas: `empresa` (dados do instalador, uma por conta), `clientes`, `instalacoes` (ligadas a um cliente), `equipamentos`, `intervencoes` (entradas do Livro de Registos) e `documentos` (histórico gerado).
- Migração do modelo antigo: o `historico[]` do cliente sem instalação é suportado por um campo opcional em `documentos`.

## Fase 2 — Gestão

- Página de definições da empresa (nome, NIPC, nº registo prévio, morada, contacto, técnico).
- Lista de clientes com pesquisa; ficha de cliente com as suas instalações.
- Ficha de instalação: dados do sistema, inventário de equipamento (tabela editável), linha do tempo de intervenções e histórico de documentos.

## Fase 3 — Documentos

Quatro geradores, cada um com formulário pré-preenchido a partir da empresa/cliente/instalação:

1. Relatório Técnico de Intervenção (Despacho 10/GDN/2022)
2. Livro de Registos do Sistema (um por instalação, acumula intervenções)
3. Declaração de Instalação (com lista de equipamento/serviços)
4. Auto de Instalação (inventário, checklist, testes, foto do local, assinatura)

Cada documento gerado fica arquivado no histórico da instalação e pode ser reaberto, reimpresso ou exportado.

- Assinatura no ecrã (canvas, funciona em telemóvel/tablet) na Declaração e no Auto.
- Foto do local comprimida no browser antes de guardar.
- Exportação para PDF real descarregável.

## Fase 4 — Entrada de dados assistida

- Colar texto solto (fatura/packing list) → IA estrutura em linhas de equipamento.
- Importar Excel com colunas Equipamento / Marca-Modelo / Nº Série / Localização.
- Importar PDF de orçamento → IA extrai cliente + instalação + equipamento e cria tudo.

A chave de IA fica no servidor (via IA integrada do Lovable), nunca no browser.

## Melhorias sugeridas (além do documento original)

- **Numeração automática** de relatórios (ex. `2026/0001`) em vez de escrita manual.
- **Estados do documento**: rascunho / assinado / entregue, para saber o que falta fechar.
- **Duplicar intervenção anterior** com um clique — a maioria das visitas repete os mesmos campos.
- **Pesquisa global** por cliente, nº de série, morada ou nº de relatório.
- **Envio por email** do PDF ao cliente a partir da ficha do documento (fase posterior).
- **Uso em obra**: interface responsiva pensada para telemóvel, com campos grandes e assinatura em ecrã táctil.
- **Exportação de backup** (JSON/ZIP) de todos os dados e documentos.

## Notas técnicas

- TanStack Start + React, dados via server functions e React Query.
- PDF com html2canvas + jsPDF (portável a partir da versão atual); templates dos documentos em HTML/CSS com estilo de impressão A4.
- Storage do backend para fotos e assinaturas; RLS por utilizador em todas as tabelas.
- Ficheiros Excel lidos no browser (SheetJS); PDFs enviados ao servidor para extração por IA.

## Ordem de entrega

Fase 1 e 2 primeiro (base utilizável), depois os documentos um a um começando pelo Relatório Técnico, e por fim a entrada assistida por IA.
