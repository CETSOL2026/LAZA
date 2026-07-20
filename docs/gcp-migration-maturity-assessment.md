# LAZA - Avaliacao de maturidade para migracao GCP

> Data da avaliacao: 20 de julho de 2026.  
> Escopo: estado atual do repositorio LAZA_DEV, SQL Server local, API Node, frontend, scripts, documentos GCP, backlog e testes automatizados.  
> Esta avaliacao mede prontidao para migracao progressiva ao Google Cloud, nao autorizacao de cutover.

## Executive Summary

- **Maturidade geral estimada: 58%**. O projeto esta bem estruturado como MVP governado local, mas ainda nao esta cloud-native.
- **Ponto forte:** o contrato de dados Bronze/Silver/DQ/Gold ja existe, com fontes oficiais, evidencias, API, site e testes.
- **Principal gap:** a execucao ainda depende de SQL Server Express, `sqlcmd`, PowerShell, Windows Task Scheduler e caminhos locais como `D:\LAZA_DATA`.
- **Melhor estrategia:** seguir com migracao incremental por indicador, com o IPCN como primeiro piloto de portabilidade, conforme LAZA-033/035.

## Escala usada

| Percentual | Interpretacao |
| ---: | --- |
| 0-30% | Inicial; conceito existe, mas faltam artefatos executaveis |
| 31-55% | Parcial; pronto para desenho tecnico, ainda com dependencia local forte |
| 56-75% | Preparado para piloto controlado em GCP |
| 76-90% | Quase pronto para homologacao cloud |
| 91-100% | Pronto para producao cloud com operacao governada |

## Matriz de maturidade por processo

| Processo | Maturidade GCP | Estado atual | Principais gaps para GCP | Proximo passo recomendado |
| --- | ---: | --- | --- | --- |
| **Arquitetura medallion Bronze/Silver/DQ/Gold** | **78%** | Modelo local bem definido em SQL Server; documentos LAZA-033/034 mapeiam datasets BigQuery equivalentes | Falta aplicar estrutura em BigQuery e validar um indicador ponta a ponta | Executar LAZA-035 com IPCN |
| **Modelagem e qualidade de dados** | **72%** | DQ, excecoes, aprovacoes, score e publication gate ja aparecem no modelo SQL e no site | Regras ainda estao presas ao SQL Server; falta Dataform/BigQuery DQ ou job cloud equivalente | Criar tabelas BigQuery e reconciliar DQ do IPCN |
| **Fontes oficiais e lineage** | **70%** | Fonte, hash, asset mirror e downloads oficiais existem; API valida SHA-256 no download | Arquivos ainda dependem de `D:\LAZA_DATA`; falta Cloud Storage e politica formal de retencao/versionamento | Espelhar assets Bronze no bucket `bronze-assets` |
| **Cobertura dos indicadores oficiais** | **74%** | Seis indicadores oficiais e quatro produtos analiticos passam nos contratos da API | Historicos ainda variam em profundidade; automacoes incrementais incompletas | Definir ondas de migracao por indicador |
| **Pipelines de ingestao e transformacao** | **46%** | Existem scripts SQL, Python, PowerShell e alguns extratores; IPCN tem desenho incremental | Orquestracao local; maioria das fontes ainda nao automatizada; sem Cloud Run Jobs/Scheduler | Containerizar/executar o pipeline IPCN como Cloud Run Job |
| **API e camada de consumo** | **58%** | API Node esta funcional, testada e com contratos claros | Data access acoplado a `sqlcmd` e T-SQL; sem provider BigQuery; sessoes admin em memoria | Criar repository interface SQL Server/BigQuery |
| **Frontend e experiencia do usuario** | **76%** | React/Vite com paginas executivas, indicadores, insights, marketplace, admin e testes e2e | Hosting ainda local; sem deploy Firebase/Cloud Run; i18n e acessibilidade pendentes | Decidir Firebase Hosting vs Cloud Run full-stack |
| **Downloads e marketplace de dados** | **54%** | Catalogo e download real de assets oficiais funcionam localmente com hash check | Sem Cloud Storage provider; paths locais hardcoded; sem signed URLs ou controle por plano real | Criar storage abstraction local/GCS |
| **Admin Panel e governanca operacional** | **55%** | Login protegido, multiusuarios de teste, views de pipelines/camadas e rate limit local | Falta Identity Platform/IAP/IAM; papeis ainda pouco granulares; sessao em memoria | Definir identidade cloud e RBAC por papel |
| **Assinaturas e segregacao comercial** | **35%** | Matriz conceitual e simulacao visual Free/Professional/Enterprise existem | Sem billing, usuarios reais, entitlement service ou segregacao efetiva no backend | Manter como backlog ate decisao comercial |
| **Infraestrutura como codigo** | **62%** | Terraform scaffold cria APIs, buckets, datasets e service accounts por ambiente | Ainda nao aplicado; sem backend remoto real; Cloud Run/Scheduler/Dataform sao placeholders | Validar Terraform em projeto DEV aprovado |
| **CI/CD e release management** | **38%** | Build, lint, typecheck, test e Playwright existem localmente | Sem pipeline GitHub/Cloud Build, versionamento de releases, rollback cloud ou artifact registry | Criar pipeline CI com build/test/package |
| **Observabilidade e operacao** | **32%** | Health endpoint, testes e tarefa Windows existem | Logs persistentes, metricas, alertas, Error Reporting e dashboards GCP pendentes | Implementar logs estruturados e Cloud Monitoring |
| **Seguranca e secrets** | **48%** | Admin hash fora do repo; cookies HttpOnly; sem senhas claras versionadas | Dependencia de Windows Auth/local files; sem Secret Manager, IAP, service accounts aplicadas e rotacao cloud | Migrar segredos para Secret Manager no piloto |
| **Backup, retencao e DR** | **30%** | Backup esta no backlog; SQL Express local e assets locais exigem formalizacao | Sem restore testado, snapshots cloud, lifecycle final ou RPO/RTO | Executar LAZA-006 antes de qualquer cutover |
| **Documentacao e gestao do backlog** | **82%** | README, backlog, DONE, docs GCP, docs Word LAZA-033/034 e metodologia estao organizados | Falta catalogo funcional completo de indicadores/metodologias aprovado pelo cliente | Concluir LAZA-023/024/025 |

## Leitura por camada

| Camada | Maturidade | Comentario executivo |
| --- | ---: | --- |
| **Produto/site** | **74%** | Ja demonstra valor ao usuario e consome dados oficiais. A migracao de hosting e viavel sem grande redesenho visual. |
| **Dados governados** | **73%** | A arquitetura conceitual esta madura. O trabalho agora e portar fisicamente para BigQuery e GCS. |
| **Aplicacao/API** | **58%** | O contrato e bom, mas falta desacoplar SQL Server de BigQuery. |
| **Pipelines** | **46%** | A logica existe em partes, mas precisa virar jobs cloud idempotentes e observaveis. |
| **Operacao cloud** | **38%** | Ainda ha muita dependencia de Windows local, Task Scheduler e validacao manual. |
| **Seguranca/identidade** | **48%** | Boa base para MVP local, ainda insuficiente para producao GCP publica/restrita. |

## Principais riscos de migracao

1. **Acoplamento ao SQL Server e `sqlcmd`**  
   A API consulta diretamente views/tabelas SQL Server com T-SQL. Isso reduz portabilidade imediata para BigQuery.

2. **Caminhos locais para assets oficiais**  
   Downloads e lineage dependem de arquivos sob `D:\LAZA_DATA`. Em GCP isso precisa virar Cloud Storage com provider proprio.

3. **Automacao parcial das fontes**  
   O modelo aceita automacao, mas BNA, INE, UGD, ANPG, MINFIN e BODIVA ainda precisam de jobs recorrentes robustos.

4. **Identidade e sessao nao cloud-native**  
   O Admin Panel ja e protegido, mas Cloud Run exige sessao stateless ou storage externo, alem de IAP/Identity Platform.

5. **Observabilidade insuficiente para operacao gerenciada**  
   Health existe, mas faltam logs estruturados, metricas, alertas, runbooks e monitoramento de frescor dos dados.

## Recomendacao de ondas

| Onda | Objetivo | Maturidade necessaria | Criterio de saida |
| --- | --- | ---: | --- |
| **0 - Preparacao tecnica** | Criar repository interface, config provider e storage abstraction | 65% | Site roda localmente com provider SQL Server por interface, sem regressao |
| **1 - Foundation GCP DEV** | Aplicar Terraform em DEV aprovado | 70% | Buckets, datasets, service accounts e Secret Manager prontos |
| **2 - IPCN portability proof** | Migrar IPCN end to end para BigQuery/GCS | 75% | 66 meses reconciliados 100% contra SQL Server |
| **3 - Seis indicadores oficiais** | Migrar todos os cards e detalhes oficiais | 80% | API em HML pode alternar SQL Server/BigQuery |
| **4 - Advanced Intelligence** | Migrar Oil/Gas, Fiscal, Sovereign e Oil/Non-Oil GDP | 82% | Produtos avancados reconciliados com evidencia |
| **5 - Cutover controlado** | Publicar frontend/API em cloud com rollback | 90% | Cloudflare/IAP, logs, alertas, backup e rollback aprovados |

## Backlog recomendado para elevar maturidade

1. **Criar `DataProvider` para API**: `SqlServerProvider` atual e `BigQueryProvider` futuro.
2. **Criar `StorageProvider` para downloads**: local filesystem e Google Cloud Storage.
3. **Executar Terraform validate/plan em DEV** com landing zone real.
4. **Migrar IPCN para GCS/BigQuery** como LAZA-035.
5. **Criar contrato de reconciliacao SQL Server vs BigQuery**.
6. **Mover segredos e configuracoes sensiveis para Secret Manager**.
7. **Criar CI/CD** com lint, typecheck, tests, build, e2e smoke e artefato Docker/Cloud Run.
8. **Implementar logs estruturados e metricas** para API e pipelines.
9. **Formalizar backup/restore e retencao** para SQL atual e buckets futuros.
10. **Definir identidade admin cloud**: IAP, Identity Platform ou IAM + Cloudflare Access.

## Conclusao

O LAZA_DEV esta **pronto para iniciar uma prova controlada de portabilidade**, mas ainda **nao esta pronto para cutover GCP**. A base de produto e dados e forte: o maior trabalho agora e tecnico-operacional, nao de redesign do MVP.

Minha recomendacao e iniciar a proxima fase com **LAZA-035 - prova de portabilidade do IPCN**, antecedida por dois pequenos refactors: **repository interface da API** e **storage abstraction dos downloads**. Isso reduz risco sem alterar a experiencia do usuario.
