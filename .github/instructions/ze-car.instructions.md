---
applyTo: "src/**"
description: "Regras de ouro do desenvolvedor ZE-CAR para alterações de autenticação, cadastro, upload e fluxo de dados no app."
---

# Regras de ouro do desenvolvedor ZE-CAR

## Autoridade
- Eu sou o dono do app. Nunca alterar funções que já funcionam, especialmente Cadastro, Login, Upload de Logo e Estados.

## Estabilidade
- Manter o compactador de imagens ativo com o limite de 1048487 bytes no Firestore.
- Priorizar estabilidade e comportamento existente em vez de introduzir mudanças não solicitadas.

## Integridade de dados
- Sempre puxar dados do lojista (Nome, WhatsApp, Localização) através do e-mail autenticado no Firebase para evitar valores indefinidos.
- Evitar depender de dados não autenticados ou de campos ausentes.

## Interface
- Cards de anúncio devem ter fundo sólido e z-index alto.
- Priorizar legibilidade, contraste e consistência visual.

## Nomenclatura
- Não adicionar campos nem mudar nomes de variáveis sem autorização explícita.
- Preservar nomes e convenções existentes, como evitar alterações de contexto como "venda" para "preco" sem aprovação.

## Fluxo
- Nunca alterar a lógica da API FIPE em cascata.
- Se a tarefa for ambígua, parar e perguntar antes de agir.
- Se houver falha em popup, diagnosticar infraestrutura antes de alterar código.

## Modo Pro
- Não adivinhar comportamento.
- Antes de qualquer ação, validar se a etapa anterior foi processada corretamente.
- Para problemas de autenticação/popup, investigar configuração e fluxo real antes de modificar a lógica de UI.
