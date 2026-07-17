# Backlog do MVP LAZA

> Atualizado em 17 de julho de 2026. Este documento contém apenas trabalho
> aberto ou decisões pendentes. A ordem dentro de cada prioridade representa a
> sequência recomendada de execução.

## Ponto de partida confirmado

- seis indicadores oficiais publicados no SQL Server e consumidos pelo site;
- três produtos analíticos avançados: Oil & Gas, Execução Fiscal e Curva
  Soberana;
- camadas Bronze, Silver e Gold, evidências de qualidade e API somente leitura;
- build de produção servido localmente em `127.0.0.1:8790`;
- inicialização automática e invisível pela tarefa `LAZA Production Site`;
- túnel Cloudflare compartilhado com NOVOAPP e ALT_ORC, ainda sem a rota pública
  do LAZA.

## Prioridades

| Prioridade | Interpretação |
| --- | --- |
| **P0** | Bloqueia publicação segura ou continuidade do MVP |
| **P1** | Necessário para operação governada e demonstração recorrente |
| **P2** | Evolução funcional, escala ou melhoria relevante |
| **P3** | Exploração futura, condicionada a adoção e orçamento |

## P0 — Publicação e segurança

| ID | Item | Estado | Esforço | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| LAZA-001 | Criar a rota `laza.way4u.com.br` no túnel `Tunnel_Alteryx`, apontando para `http://127.0.0.1:8790` | Pendente no painel Cloudflare | XS | Sessão autenticada Cloudflare | DNS resolve, HTTPS retorna 200 e as rotas ALT_ORC/NOVOAPP permanecem disponíveis |
| LAZA-002 | Executar validação pública ponta a ponta | Bloqueado por LAZA-001 | S | LAZA-001 | Página, assets e todas as APIs retornam 200 fora da rede local; certificado é válido |
| LAZA-003 | Proteger ou remover o `Admin Panel` antes da divulgação pública | Concluído em 16/07/2026 | M | Nenhuma | Login validado no servidor, sessão HttpOnly, limitação de tentativas e logout invalidando a sessão |
| LAZA-004 | Definir política Cloudflare Access para homologação e demonstrações restritas | Pendente | S | Lista de utilizadores autorizados | Somente identidades aprovadas acessam o hostname de homologação |
| LAZA-005 | Rotacionar o token do túnel e atualizar o serviço Windows | Pendente | S | Janela curta de manutenção | Novo token instalado, túnel saudável e token anterior revogado sem indisponibilidade prolongada |
| LAZA-006 | Formalizar backup e restauração do `LAZA_DATA_PLATFORM_DEV` | Pendente | M | Espaço de backup aprovado | Backup executado, restauração testada em base isolada e evidência registrada |

## P1 — Operação e confiabilidade

| ID | Item | Estado | Esforço | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| LAZA-007 | Adicionar logs persistentes e rotação para site/API | Pendente | S | Nenhuma | Inicialização, erro de API e encerramento ficam registrados sem guardar segredos |
| LAZA-008 | Criar monitor de saúde para porta `8790`, SQL Server e Cloudflare | Pendente | M | LAZA-001 | Falha gera alerta e tentativa controlada de recuperação; estado saudável fica auditável |
| LAZA-009 | Avaliar execução no arranque do Windows sem depender de login interativo | Pendente | M | Conta de serviço/credenciais SQL | Site volta automaticamente após reinício e mantém autenticação SQL com privilégio mínimo |
| LAZA-010 | Criar procedimento de publicação: build, smoke test, rollback e versionamento | Pendente | M | LAZA-007 | Uma versão pode ser publicada e revertida com comandos documentados e evidência de teste |
| LAZA-011 | Adicionar testes automatizados de contrato para as APIs | Concluído em 17/07/2026 | M | Nenhuma | Testes cobrem `/health`, seis indicadores e quatro módulos avançados, incluindo esquemas, contagens, ordenação cronológica, autenticação admin e download de assets |
| LAZA-012 | Adicionar testes de interface para navegação, detalhes e quatro análises avançadas | Concluído em 17/07/2026 | L | Ambiente de teste de navegador | Fluxos críticos passam em desktop e viewport móvel antes de cada publicação |
| LAZA-013 | Monitorar tamanho do SQL Express e crescimento das camadas | Pendente | S | LAZA-007 | Relatório periódico alerta antes de atingir 70%, 85% e 95% do limite operacional |

## P1 — Automação dos dados oficiais

| ID | Item | Estado | Esforço | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| LAZA-014 | Revisar e ativar de forma controlada a automação incremental do IPCN | Em backlog por decisão anterior | M | Janela operacional | Nova competência válida percorre Bronze, Silver, DQ e Gold; ausência de novidade não escreve dados |
| LAZA-015 | Automatizar câmbio e ativos bancários do BNA | Pendente | L | Contratos das fontes BNA | Cargas incrementais idempotentes, preliminares identificados e falhas de fonte não publicam Gold |
| LAZA-016 | Automatizar PIB e atualizações censitárias do INE | Pendente | L | Contratos das fontes INE | Revisões históricas são versionadas e a série publicada permanece reconciliável |
| LAZA-017 | Automatizar Dívida Pública/PIB da UGD/MINFIN | Pendente | L | Regra oficial do denominador | Componentes e razão final mantêm linhagem, versão metodológica e aprovação explícita |
| LAZA-018 | Automatizar produção Oil & Gas da ANPG | Pendente | L | Estabilidade dos PDFs ANPG | Novo mês é detectado, validado contra totais e publicado sem transcrição manual |
| LAZA-019 | Automatizar execução fiscal trimestral do MINFIN | Pendente | L | Estabilidade do catálogo/PDF | Novo trimestre é reconciliado e exceções de metadados exigem aprovação documentada |
| LAZA-020 | Automatizar snapshots da curva soberana BODIVA | Pendente | L | Política de periodicidade | Curva oficial de 12 prazos é capturada sem interpolação, com hash do boletim e spreads recalculados |
| LAZA-021 | Criar alertas de frescor, completude e falha de publicação | Pendente | M | LAZA-014 a LAZA-020 | Atrasos e falhas críticas são visíveis sem consultar diretamente o banco |

## P1 — Governança e documentação

| ID | Item | Estado | Esforço | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| LAZA-022 | Atualizar README e documentos que ainda descrevem indicadores como DEMO | Concluído em 17/07/2026 | S | Nenhuma | Documentação reflete os nove produtos oficiais e a execução atual |
| LAZA-023 | Criar catálogo funcional dos indicadores e metodologias | Pendente | M | Aprovação dos donos de dados | Cada indicador apresenta definição, fórmula, unidade, frequência, fonte, owner e versão |
| LAZA-024 | Formalizar fluxo de aprovação e segregação de funções | Pendente | M | Papéis do projeto | Ingestão, validação e aprovação possuem responsáveis e evidência verificável |
| LAZA-025 | Criar registro de mudanças de fonte e metodologia | Pendente | M | LAZA-023 | Alterações não sobrescrevem silenciosamente séries ou regras anteriores |
| LAZA-041 | Versionar na Bronze os HTMLs da ANPG alterados pelo publicador após a extração | Em backlog por decisão de 16/07/2026 | M | Política de versionamento de fontes | Cada HTML alterado gera uma nova versão de `source_asset`, sem sobrescrever hash, caminho ou linhagem histórica |

## P2 — Evolução analítica e experiência

| ID | Item | Estado | Esforço | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| LAZA-026 | Ampliar a cobertura histórica dos três produtos avançados | Pendente | XL | Capacidade de aquisição | Período-alvo e lacunas documentados; nenhuma série é preenchida artificialmente |
| LAZA-027 | Adicionar filtros, comparação de períodos e exportação CSV/XLSX | Pendente | L | Contratos de API | Exportação reproduz exatamente filtros, unidades, fonte e qualidade exibidos |
| LAZA-028 | Uniformizar a apresentação de fonte e metodologia nos nove indicadores | Pendente | M | LAZA-023 | Todo detalhe possui fonte clicável, referência, qualidade e metodologia |
| LAZA-029 | Melhorar responsividade, acessibilidade e navegação por teclado | Pendente | L | Design review | Fluxos principais atendem WCAG 2.1 AA nos critérios acordados |
| LAZA-030 | Internacionalizar conteúdos em português e inglês | Pendente | L | Glossário aprovado | Troca de idioma não altera métricas, unidades ou fontes |
| LAZA-031 | Otimizar o bundle do frontend com divisão de código | Pendente | M | Testes de interface | Build deixa de emitir alerta de chunk principal acima de 500 kB sem regressão visual |
| LAZA-032 | Avaliar o quarto indicador avançado: Investimento Direto Estrangeiro | Pendente | M | Validação de fonte externa | Business case, fonte, granularidade, DQ e mockup aprovados antes da implementação |

## P2 — Preparação para Google Cloud

| ID | Item | Estado | Esforço | Dependência | Critério de aceite |
| --- | --- | --- | --- | --- | --- |
| LAZA-033 | Mapear Bronze/Silver/Gold local para os serviços Google aprovados na arquitetura | Concluído em 17/07/2026 | M | Decisão de landing zone | Documento `docs/google-cloud-migration-blueprint.md` cobre storage, processamento, warehouse, API, IAM e observabilidade |
| LAZA-034 | Definir infraestrutura como código e ambientes DEV/HML/PRD | Concluído em 17/07/2026 | L | LAZA-033 | Documento `docs/google-cloud-iac-environments.md`, Word oficial e scaffold `infra/google/` definem recursos recriáveis com configuração versionada e segregação de ambientes |
| LAZA-035 | Executar prova de portabilidade de um indicador ponta a ponta | Pendente | XL | LAZA-033 e landing zone | Um indicador percorre ingestão, DQ, Gold e site na Google Cloud com reconciliação 100% contra SQL Server |
| LAZA-036 | Planejar migração dos nove produtos e corte operacional | Pendente | L | LAZA-035 | Plano possui ondas, rollback, custos, responsáveis e critérios de saída |

## P3 — Estacionamento estratégico

| ID | Item | Gatilho para avaliação |
| --- | --- | --- |
| LAZA-037 | Assinaturas, notificações e alertas personalizados | Confirmar procura de utilizadores e canais autorizados |
| LAZA-038 | Insights narrativos assistidos por IA | Definir política de explicabilidade, fontes e revisão humana |
| LAZA-039 | Expansão para outros países e novas geografias | Estabilizar operação angolana e modelo de ownership |
| LAZA-040 | Produtos premium e controlo por plano | Validar estratégia comercial e requisitos de faturação |

## Decisões pendentes para a próxima revisão

1. O primeiro hostname será público ou protegido por Cloudflare Access?
2. Quem pode acessar e administrar o `Admin Panel`?
3. Qual periodicidade desejada para a curva BODIVA: diária, semanal ou mensal?
4. Quais pipelines devem ser automatizados primeiro após o IPCN?
5. Qual retenção de logs, arquivos Bronze e backups deve ser adotada?
6. A prova na Google Cloud faz parte deste MVP ou da fase seguinte?

## Definition of Done

Um item somente pode ser encerrado quando:

- o critério de aceite foi demonstrado;
- testes proporcionais ao risco passaram;
- segurança e qualidade de dados foram avaliadas;
- documentação operacional foi atualizada;
- não existem segredos em código, logs ou evidências;
- impacto nas rotas e produtos existentes foi verificado.
