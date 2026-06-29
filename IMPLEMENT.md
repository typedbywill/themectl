# SPEC — Linux Theme Manager (themectl)

> Documento de especificação para desenvolvimento assistido por IA.
> Este arquivo é a fonte de verdade do projeto. Toda decisão técnica, estrutura de código, formato de arquivo e comportamento esperado está definido aqui.
> A IA deve seguir este documento rigorosamente e jamais tomar decisões arquiteturais por conta própria sem que estejam aqui descritas.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Regras Gerais para a IA](#2-regras-gerais-para-a-ia)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [Estrutura de Diretórios do Projeto](#4-estrutura-de-diretórios-do-projeto)
5. [Especificação do Formato de Tema](#5-especificação-do-formato-de-tema)
6. [Especificação da CLI](#6-especificação-da-cli)
7. [Sistema de Backup e Rollback](#7-sistema-de-backup-e-rollback)
8. [Aplicador KDE Plasma](#8-aplicador-kde-plasma)
9. [Sistema de Repositórios](#9-sistema-de-repositórios)
10. [Tratamento de Erros](#10-tratamento-de-erros)
11. [Testes](#11-testes)
12. [Convenções de Código](#12-convenções-de-código)
13. [Escopo Proibido no MVP](#13-escopo-proibido-no-mvp)

---

## 1. Visão Geral

**Nome do projeto:** `themectl`
**Escopo atual:** MVP — CLI + suporte a KDE Plasma 6
**Objetivo:** Permitir que um usuário instale e aplique um tema completo do KDE com um único comando.

```bash
themectl install catppuccin-mocha
themectl apply catppuccin-mocha
```

O projeto é desenvolvido em fases. A IA deve implementar **somente o MVP** descrito neste documento. Nenhuma feature fora do escopo do MVP deve ser implementada, mesmo que pareça simples ou óbvia.

---

## 2. Regras Gerais para a IA

### 2.1 Regras de Comportamento

- A IA deve **sempre perguntar** antes de tomar uma decisão que não esteja coberta por este documento.
- A IA **não deve inventar** abstrações, camadas ou padrões que não estejam especificados aqui.
- A IA deve **preferir simplicidade** à elegância. Código simples e direto é melhor do que código "engenhoso".
- A IA deve **implementar uma coisa por vez**, confirmando o resultado antes de avançar.
- A IA deve **nunca silenciosamente ignorar** um erro. Todo erro deve ser tratado explicitamente.
- A IA deve **escrever testes** para cada função pública que implementar.
- A IA deve **comentar o código** em inglês, mas os outputs para o usuário devem ser em inglês também.
- Quando houver conflito entre este documento e um pedido do usuário, a IA deve **alertar o conflito** e pedir confirmação.

### 2.2 Ordem de Implementação

A IA deve seguir esta ordem estritamente:

```
1. Estrutura de diretórios e Cargo.toml
2. Tipos de dados (structs, enums) — sem lógica
3. Parsing do theme.yaml
4. Sistema de backup
5. Aplicador KDE Plasma
6. Comandos da CLI (um por vez)
7. Sistema de repositórios
8. Testes de integração
```

Nenhuma etapa deve ser pulada. Se uma etapa anterior não estiver funcionando, a próxima não deve começar.

### 2.3 O que a IA deve entregar a cada etapa

Para cada etapa, a IA deve entregar:

- O código-fonte completo dos arquivos modificados
- Os testes correspondentes
- Um exemplo de uso em comentário no topo do arquivo ou em `examples/`
- Uma descrição de uma linha do que foi implementado

---

## 3. Stack Tecnológica

### 3.1 Linguagem

**Rust (edição 2021)**

Motivo: binário único sem dependências de runtime, distribuição simples via `.tar.gz` ou pacote `.deb`/`.rpm`, excelente para CLIs.

### 3.2 Dependências Permitidas no MVP

A IA deve usar **apenas** as crates listadas abaixo. Nenhuma outra crate pode ser adicionada sem aprovação explícita.

```toml
[dependencies]
# CLI
clap = { version = "4", features = ["derive"] }

# Serialização
serde = { version = "1", features = ["derive"] }
serde_yaml = "0.9"
serde_json = "1"

# HTTP (para download de temas)
reqwest = { version = "0.12", features = ["blocking", "json"] }

# Arquivos compactados
flate2 = "1"
tar = "0.4"

# Erros
anyhow = "1"
thiserror = "1"

# Cores no terminal
colored = "2"

# Paths
dirs = "5"

# Data/hora para backups
chrono = { version = "0.4", features = ["serde"] }

[dev-dependencies]
tempfile = "3"
assert_cmd = "2"
predicates = "3"
```

### 3.3 Versão Mínima do Rust

`1.75.0` (estável)

### 3.4 Targets de Build

- `x86_64-unknown-linux-gnu` (obrigatório)
- `aarch64-unknown-linux-gnu` (opcional no MVP)

---

## 4. Estrutura de Diretórios do Projeto

### 4.1 Repositório

```
themectl/
├── Cargo.toml
├── Cargo.lock
├── README.md
├── LICENSE                    # GPL-3.0
├── SPEC.md                    # este documento
│
├── src/
│   ├── main.rs                # ponto de entrada, monta a CLI
│   ├── cli.rs                 # definição dos comandos com clap
│   ├── error.rs               # tipos de erro do projeto
│   │
│   ├── theme/
│   │   ├── mod.rs
│   │   ├── manifest.rs        # structs do theme.yaml
│   │   ├── package.rs         # lógica de leitura/escrita de .theme
│   │   └── validator.rs       # validação do manifesto
│   │
│   ├── apply/
│   │   ├── mod.rs
│   │   ├── kde.rs             # aplicador KDE Plasma
│   │   └── detector.rs        # detecção de ambiente desktop
│   │
│   ├── backup/
│   │   ├── mod.rs
│   │   ├── snapshot.rs        # criação de snapshots
│   │   └── restore.rs         # restauração de snapshots
│   │
│   ├── repo/
│   │   ├── mod.rs
│   │   ├── source.rs          # gerenciamento de fontes
│   │   └── registry.rs        # índice local de temas instalados
│   │
│   └── util/
│       ├── mod.rs
│       ├── fs.rs              # operações de arquivo helpers
│       └── cmd.rs             # execução de comandos externos
│
├── tests/
│   ├── cli_install.rs
│   ├── cli_apply.rs
│   ├── cli_rollback.rs
│   └── fixtures/
│       └── minimal-theme/     # tema mínimo para testes
│           ├── theme.yaml
│           └── wallpapers/
│               └── test.jpg
│
└── examples/
    └── catppuccin-mocha/      # tema de exemplo completo
        ├── theme.yaml
        ├── plasma/
        ├── colors/
        ├── icons/
        ├── kvantum/
        ├── gtk/
        ├── wallpapers/
        └── fonts/
```

### 4.2 Diretórios do Sistema (em tempo de execução)

```
~/.local/share/themectl/
├── themes/                    # temas instalados
│   └── catppuccin-mocha/
│       ├── theme.yaml
│       └── ... (conteúdo do tema)
│
├── backups/                   # snapshots de configurações anteriores
│   └── 2024-01-15T10:30:00/
│       └── snapshot.yaml
│
├── sources.yaml               # lista de repositórios configurados
└── registry.yaml              # índice de temas instalados e aplicados
```

A IA deve **sempre usar `dirs::data_local_dir()`** para resolver `~/.local/share/themectl/`. Hardcode do caminho é proibido.

---

## 5. Especificação do Formato de Tema

### 5.1 Arquivo de Pacote

Um tema é distribuído como um arquivo `.theme` que é internamente um `.tar.gz`.

```
catppuccin-mocha.theme  →  catppuccin-mocha.tar.gz
```

Ao descompactar, a raiz deve ser um diretório com o mesmo nome do tema:

```
catppuccin-mocha/
├── theme.yaml          ← obrigatório
├── plasma/             ← opcional
├── colors/             ← opcional
├── icons/              ← opcional
├── kvantum/            ← opcional
├── gtk/                ← opcional
├── wallpapers/         ← opcional
├── fonts/              ← opcional
└── cursors/            ← opcional
```

### 5.2 Manifesto — `theme.yaml`

Este é o schema completo do `theme.yaml`. A IA deve usar este schema exato, sem adicionar ou remover campos.

```yaml
# ============================================================
# CAMPOS OBRIGATÓRIOS
# ============================================================

# Identificador único do tema. Apenas letras minúsculas, números e hífens.
# Regex: ^[a-z0-9][a-z0-9-]{1,63}$
name: catppuccin-mocha

# Versão semântica. Deve seguir SemVer 2.0.
version: 1.2.0

# ============================================================
# CAMPOS OPCIONAIS — METADADOS
# ============================================================

# Nome legível para humanos.
display_name: "Catppuccin Mocha"

# Descrição curta (máximo 200 caracteres).
description: "Dark theme with pastel colors, inspired by coffee."

# Nome do autor ou organização.
author: "Catppuccin Org"

# URL do repositório ou homepage do tema.
homepage: "https://github.com/catppuccin/kde"

# Licença do tema (SPDX identifier).
license: "MIT"

# Lista de ambientes desktop suportados.
# Valores válidos: kde-plasma-6, kde-plasma-5
supports:
  - kde-plasma-6

# ============================================================
# CAMPOS OPCIONAIS — DEPENDÊNCIAS
# ============================================================

dependencies:
  # Pacotes do sistema necessários (nome do pacote no sistema).
  # O aplicador vai verificar se existem, mas NÃO vai instalar automaticamente no MVP.
  packages:
    - kvantum

  # Fontes necessárias (nome da fonte como aparece no sistema).
  fonts:
    - "JetBrains Mono"
    - "Noto Sans"

# ============================================================
# CAMPOS OPCIONAIS — COMPONENTES
# ============================================================

components:
  # Caminho relativo dentro do pacote para o Plasma Style.
  plasma_style: plasma/

  # Caminho relativo para o arquivo .colors do KDE.
  color_scheme: colors/CatppuccinMocha.colors

  # Nome do tema de ícones (deve ser instalado separadamente ou incluído em icons/).
  # Se o campo for um caminho relativo (começa com ./), aponta para pasta dentro do pacote.
  # Se for um nome simples, assume que já está instalado no sistema.
  icon_theme: ./icons/

  # Caminho relativo para o tema Kvantum.
  kvantum_theme: kvantum/

  # Caminho relativo para o tema GTK (pasta com gtk.css ou index.theme).
  gtk_theme: gtk/

  # Caminho relativo para a imagem de wallpaper padrão.
  wallpaper: wallpapers/mocha.jpg

  # Lista de fontes a copiar para ~/.local/share/fonts/.
  # Caminhos relativos dentro do pacote.
  fonts:
    - fonts/JetBrainsMono.ttf

  # Configurações do Konsole (perfil .profile).
  konsole_profile: konsole/catppuccin.profile

  # Tema de cursor.
  # Mesmo comportamento do icon_theme: relativo ou nome do sistema.
  cursor_theme: ./cursors/
```

### 5.3 Regras de Validação do Manifesto

A função `validator::validate(manifest: &ThemeManifest) -> Result<()>` deve verificar:

- `name` corresponde ao regex `^[a-z0-9][a-z0-9-]{1,63}$`
- `version` é SemVer válido
- `description`, se presente, tem no máximo 200 caracteres
- Todos os caminhos em `components` que começam com `./` existem dentro do pacote descompactado
- `supports` contém pelo menos um valor válido do enum `DesktopEnvironment`
- Nenhum campo desconhecido está presente (modo strict — retornar erro se houver campo extra)

---

## 6. Especificação da CLI

### 6.1 Estrutura Geral

```
themectl [FLAGS GLOBAIS] <COMANDO> [ARGS]
```

**Flags globais:**

| Flag | Tipo | Descrição |
|---|---|---|
| `--verbose` / `-v` | bool | Exibe informações detalhadas de execução |
| `--no-color` | bool | Desativa cores no output |
| `--dry-run` | bool | Simula a operação sem fazer alterações reais |

### 6.2 Comando: `install`

```bash
themectl install <SOURCE> [--name <NOME>] [--force]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|---|---|---|
| `<SOURCE>` | sim | Caminho local (`.theme`), URL HTTP/HTTPS, ou nome de tema em repositório configurado |
| `--name` | não | Sobrescreve o nome do tema durante a instalação |
| `--force` | não | Reinstala mesmo se já estiver instalado |

**Comportamento:**

1. Detectar o tipo de `<SOURCE>`:
   - Se começa com `http://` ou `https://`: fazer download para arquivo temporário
   - Se termina em `.theme` e o arquivo existe localmente: usar diretamente
   - Caso contrário: buscar nos repositórios configurados em `sources.yaml`
2. Validar que o arquivo é um `.tar.gz` válido
3. Descompactar em diretório temporário
4. Validar o `theme.yaml` (chamar `validator::validate`)
5. Verificar dependências declaradas em `dependencies.packages` (apenas avisar se não estiver instalado — não abortar)
6. Copiar o conteúdo para `~/.local/share/themectl/themes/<nome>/`
7. Registrar no `registry.yaml`
8. Exibir resumo do que foi instalado

**Output esperado (sucesso):**

```
✓ Downloaded catppuccin-mocha v1.2.0
✓ Validated theme manifest
⚠ Missing dependency: kvantum (install it for full theme support)
✓ Installed to ~/.local/share/themectl/themes/catppuccin-mocha
✓ Done! Run: themectl apply catppuccin-mocha
```

**Output esperado (erro — já instalado):**

```
✗ Theme 'catppuccin-mocha' is already installed. Use --force to reinstall.
```

### 6.3 Comando: `apply`

```bash
themectl apply <NOME> [--no-backup] [--components <LISTA>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|---|---|---|
| `<NOME>` | sim | Nome do tema instalado |
| `--no-backup` | não | Pula a criação de backup antes de aplicar |
| `--components` | não | Aplica apenas os componentes listados (ex: `plasma_style,color_scheme`) |

**Comportamento:**

1. Verificar que o tema está instalado (existe em `~/.local/share/themectl/themes/<nome>/`)
2. Detectar ambiente desktop (chamar `detector::detect()`)
3. Verificar que o ambiente está em `supports` do manifesto — abortar se não estiver
4. Criar backup automático (a menos que `--no-backup` seja passado)
5. Aplicar cada componente declarado no manifesto, na ordem abaixo:
   1. `fonts` (copiar arquivos para `~/.local/share/fonts/`)
   2. `plasma_style`
   3. `color_scheme`
   4. `icon_theme`
   5. `cursor_theme`
   6. `kvantum_theme`
   7. `gtk_theme`
   8. `wallpaper`
   9. `konsole_profile`
6. Atualizar `registry.yaml` com o tema atualmente aplicado
7. Exibir resumo

**Output esperado (sucesso):**

```
✓ Backup created: 2024-01-15T10:30:00
✓ Applied: plasma_style
✓ Applied: color_scheme
✓ Applied: icon_theme
✓ Applied: wallpaper
⚠ Skipped: kvantum_theme (kvantum not found)
✓ Theme 'catppuccin-mocha' applied successfully!
  Some changes may require re-login to take full effect.
```

**Output esperado (erro — ambiente não suportado):**

```
✗ Theme 'catppuccin-mocha' does not support 'gnome'.
  Supported environments: kde-plasma-6
```

### 6.4 Comando: `rollback`

```bash
themectl rollback [--to <TIMESTAMP>] [--list]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|---|---|---|
| `--to` | não | Restaura para um snapshot específico. Se omitido, restaura o mais recente |
| `--list` | não | Lista todos os snapshots disponíveis sem fazer rollback |

**Comportamento:**

1. Se `--list`: exibir tabela de snapshots e sair
2. Encontrar o snapshot alvo
3. Restaurar cada valor salvo no snapshot
4. Atualizar `registry.yaml`

**Output de `--list`:**

```
Available backups:
  2024-01-15T10:30:00  (current)  plasma: Breeze, colors: BreezeLight
  2024-01-14T08:12:00             plasma: Breeze, colors: BreezeDark
  2024-01-10T15:00:00             plasma: Arc, colors: ArcDark

Run: themectl rollback --to 2024-01-14T08:12:00
```

### 6.5 Comando: `list`

```bash
themectl list [--installed] [--available]
```

**Comportamento:**

- Sem flags (ou `--installed`): lista temas em `~/.local/share/themectl/themes/`
- `--available`: lista temas disponíveis nos repositórios configurados (faz requisição HTTP)

**Output:**

```
Installed themes:
  catppuccin-mocha   v1.2.0   applied ✓
  everforest-dark    v0.9.1
  nord               v2.0.0

Run: themectl apply <name>
```

### 6.6 Comando: `remove`

```bash
themectl remove <NOME> [--force]
```

**Comportamento:**

1. Verificar que o tema existe
2. Se o tema está atualmente aplicado e `--force` não foi passado: abortar com mensagem
3. Remover diretório `~/.local/share/themectl/themes/<nome>/`
4. Atualizar `registry.yaml`

**Output:**

```
✓ Removed theme 'catppuccin-mocha'
```

### 6.7 Comando: `source`

Gerencia a lista de repositórios de temas.

```bash
themectl source add <URL> [--name <NOME>]
themectl source remove <NOME_OU_URL>
themectl source list
themectl source refresh
```

**`source add`:** Adiciona uma nova entrada em `sources.yaml`. Faz uma requisição para validar que a URL é um repositório válido (retorna JSON com campo `"themes"`).

**`source list`:** Exibe as fontes configuradas.

**`source refresh`:** Atualiza o cache local do índice de todos os repositórios configurados.

**Output de `source list`:**

```
Configured sources:
  official    https://themes.themectl.dev/index.json   (refreshed 2h ago)
  catppuccin  https://catppuccin.github.io/kde/index.json
```

### 6.8 Comando: `export`

```bash
themectl export [--output <ARQUIVO>]
```

Exporta a configuração atual do desktop como um arquivo `.theme` que pode ser reimportado depois.

**Comportamento:**

1. Detectar ambiente desktop
2. Ler a configuração atual de cada componente KDE
3. Criar `theme.yaml` com os valores lidos
4. Empacotar tudo como `.theme`
5. Salvar no caminho especificado (padrão: `./my-theme-<timestamp>.theme`)

### 6.9 Comando: `info`

```bash
themectl info <NOME>
```

Exibe todos os metadados de um tema instalado.

**Output:**

```
Theme: catppuccin-mocha
Version: 1.2.0
Author: Catppuccin Org
License: MIT
Supports: kde-plasma-6

Components:
  plasma_style   ✓
  color_scheme   ✓
  icon_theme     ✓
  wallpaper      ✓
  kvantum_theme  ✓
  gtk_theme      ✓

Dependencies:
  kvantum        ✓ installed
```

---

## 7. Sistema de Backup e Rollback

### 7.1 O que é um Snapshot

Um snapshot captura o estado atual da aparência do desktop **antes** de qualquer `apply`. É salvo em:

```
~/.local/share/themectl/backups/<ISO8601_TIMESTAMP>/snapshot.yaml
```

Exemplo de timestamp: `2024-01-15T10-30-00` (colons substituídos por hífens para compatibilidade com sistemas de arquivos).

### 7.2 Formato do `snapshot.yaml`

```yaml
created_at: "2024-01-15T10:30:00Z"
desktop: kde-plasma-6
theme_applied: catppuccin-mocha   # pode ser null se nenhum tema estava aplicado

kde:
  plasma_style: "Breeze"
  color_scheme: "BreezeLight"
  icon_theme: "breeze"
  cursor_theme: "breeze_cursors"
  wallpaper: "/usr/share/wallpapers/Next/contents/images/1920x1080.png"
  gtk_theme: "Breeze"
  font_general: "Noto Sans,10,-1,5,50,0,0,0,0,0"
  font_fixed: "Hack,10,-1,5,50,0,0,0,0,0"
```

### 7.3 Como Ler os Valores Atuais do KDE

A IA deve usar estes comandos exatos para capturar o estado atual:

```rust
// Lê configurações do kwinrc, kdeglobals, etc.
// Wrapper em util::cmd::kreadconfig5(file, group, key) -> Result<String>

kreadconfig5 --file kdeglobals --group "KDE" --key "widgetStyle"
kreadconfig5 --file kdeglobals --group "General" --key "ColorScheme"
kreadconfig5 --file kdeglobals --group "Icons" --key "Theme"
kreadconfig5 --file kcminputrc --group "Mouse" --key "cursorTheme"
kreadconfig5 --file plasmarc --group "Theme" --key "name"
```

Para wallpaper, usar:
```bash
dbus-send --session --print-reply \
  --dest=org.kde.plasmashell /PlasmaShell \
  org.kde.PlasmaShell.evaluateScript \
  'string:var a = desktops(); print(a[0].wallpaperPlugin)'
```

> **Nota para a IA:** Se um comando falhar ou retornar vazio, o valor no snapshot deve ser `null`, não uma string vazia. Nunca abortar o backup por causa de um campo que não foi possível ler.

### 7.4 Limite de Backups

Manter no máximo **10 snapshots**. Ao criar um novo, se já houver 10, deletar o mais antigo automaticamente.

---

## 8. Aplicador KDE Plasma

### 8.1 Função Principal

```rust
pub fn apply(theme_dir: &Path, manifest: &ThemeManifest, opts: ApplyOptions) -> Result<ApplyReport>
```

Onde `ApplyReport` é uma struct que lista o que foi aplicado, o que foi pulado e os avisos.

### 8.2 Comandos de Aplicação por Componente

A IA deve usar **exatamente** estes comandos para aplicar cada componente:

#### `plasma_style`

```bash
# 1. Copiar arquivos para ~/.local/share/plasma/desktoptheme/<nome>/
# 2. Aplicar:
plasma-apply-desktoptheme <nome>
```

#### `color_scheme`

```bash
# 1. Copiar arquivo .colors para ~/.local/share/color-schemes/
# 2. Aplicar:
plasma-apply-colorscheme <NomeDoArquivo>
```

#### `icon_theme`

```bash
# 1. Se caminho relativo: copiar para ~/.local/share/icons/<nome>/
# 2. Aplicar:
kwriteconfig5 --file kdeglobals --group Icons --key Theme <nome>
# 3. Notificar o sistema:
dbus-send --session --print-reply --dest=org.kde.KWin \
  /KWin org.kde.KWin.reloadConfig
```

#### `cursor_theme`

```bash
# 1. Se caminho relativo: copiar para ~/.local/share/icons/<nome>/
# 2. Aplicar:
kwriteconfig5 --file kcminputrc --group Mouse --key cursorTheme <nome>
```

#### `kvantum_theme`

```bash
# 1. Copiar para ~/.config/Kvantum/<nome>/
# 2. Aplicar (requer que kvantum esteja instalado):
kvantummanager --set <nome>
# 3. Definir o style do Qt:
kwriteconfig5 --file kdeglobals --group KDE --key widgetStyle kvantum-dark
```

#### `gtk_theme`

```bash
# 1. Copiar para ~/.themes/<nome>/
# 2. Aplicar via gsettings:
gsettings set org.gnome.desktop.interface gtk-theme '<nome>'
# 3. Para GTK4:
kwriteconfig5 --file ~/.config/gtk-4.0/settings.ini --group Settings \
  --key gtk-theme-name '<nome>'
```

#### `wallpaper`

```bash
# Usar script DBus via qdbus:
qdbus org.kde.plasmashell /PlasmaShell \
  org.kde.PlasmaShell.evaluateScript \
  "var allDesktops = desktops(); for (var i=0; i<allDesktops.length; i++) { var d = allDesktops[i]; d.wallpaperPlugin = 'org.kde.image'; d.currentConfigGroup = Array('Wallpaper', 'org.kde.image', 'General'); d.writeConfig('Image', 'file://<CAMINHO_ABSOLUTO>'); }"
```

#### `fonts`

```bash
# 1. Copiar arquivos .ttf/.otf/.woff2 para ~/.local/share/fonts/
# 2. Atualizar cache:
fc-cache -fv ~/.local/share/fonts/
```

#### `konsole_profile`

```bash
# Copiar arquivo .profile para ~/.local/share/konsole/
# Não há como setar o perfil padrão do Konsole via CLI — apenas copiar o arquivo.
```

### 8.3 Detecção de Ambiente Desktop

```rust
pub fn detect() -> Result<DesktopEnvironment>
```

Verificar, em ordem:

1. Variável de ambiente `XDG_CURRENT_DESKTOP`
2. Variável `KDE_SESSION_VERSION`
3. Presença do processo `plasmashell`

```rust
pub enum DesktopEnvironment {
    KdePlasma6,
    KdePlasma5,
    Unknown(String),
}
```

### 8.4 Verificação de Disponibilidade de Ferramentas

Antes de aplicar qualquer componente, verificar se o binário necessário existe com `which`:

```rust
pub fn check_tool(name: &str) -> bool
```

Se a ferramenta não estiver disponível, **pular o componente** e registrar aviso no `ApplyReport`. Nunca abortar toda a operação por causa de uma ferramenta faltando.

---

## 9. Sistema de Repositórios

### 9.1 Arquivo `sources.yaml`

```yaml
sources:
  - name: official
    url: https://themes.themectl.dev/index.json
    last_refreshed: "2024-01-15T10:30:00Z"

  - name: catppuccin
    url: https://catppuccin.github.io/kde/index.json
    last_refreshed: null
```

### 9.2 Formato do Índice de Repositório (JSON)

Este é o formato que um servidor de repositório deve servir. A IA deve validar que uma URL segue este schema antes de adicionar como source.

```json
{
  "name": "Catppuccin Repository",
  "description": "Official Catppuccin themes for Linux",
  "version": "1",
  "themes": [
    {
      "name": "catppuccin-mocha",
      "display_name": "Catppuccin Mocha",
      "version": "1.2.0",
      "description": "Dark theme with pastel colors.",
      "author": "Catppuccin Org",
      "license": "MIT",
      "supports": ["kde-plasma-6"],
      "download_url": "https://example.com/catppuccin-mocha-1.2.0.theme",
      "screenshots": [
        "https://example.com/screenshots/catppuccin-mocha-1.jpg"
      ],
      "size_bytes": 4200000
    }
  ]
}
```

### 9.3 Arquivo `registry.yaml`

Rastreia os temas instalados localmente.

```yaml
applied: catppuccin-mocha   # null se nenhum tema aplicado

themes:
  catppuccin-mocha:
    version: "1.2.0"
    installed_at: "2024-01-15T10:00:00Z"
    source_url: "https://example.com/catppuccin-mocha-1.2.0.theme"

  everforest-dark:
    version: "0.9.1"
    installed_at: "2024-01-10T08:00:00Z"
    source_url: null   # instalado localmente
```

---

## 10. Tratamento de Erros

### 10.1 Tipos de Erro

Definir em `error.rs`:

```rust
#[derive(thiserror::Error, Debug)]
pub enum ThemectlError {
    #[error("Theme '{0}' not found")]
    ThemeNotFound(String),

    #[error("Theme '{0}' is already installed. Use --force to reinstall.")]
    AlreadyInstalled(String),

    #[error("Invalid theme manifest: {0}")]
    InvalidManifest(String),

    #[error("Unsupported desktop environment: {0}")]
    UnsupportedDesktop(String),

    #[error("Theme '{name}' does not support '{desktop}'")]
    ThemeNotCompatible { name: String, desktop: String },

    #[error("Required tool not found: {0}")]
    ToolNotFound(String),

    #[error("Download failed: {0}")]
    DownloadFailed(String),

    #[error("No backup available to restore")]
    NoBackupAvailable,

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("YAML parse error: {0}")]
    YamlParse(#[from] serde_yaml::Error),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
}
```

### 10.2 Regras de Tratamento

- **Nunca usar `unwrap()` ou `expect()` fora de testes**
- **Sempre propagar com `?` ou converter explicitamente**
- **Erros não fatais** (ex: componente individual falhou) devem ser acumulados em `ApplyReport.warnings` e não interromper a execução
- **Erros fatais** (ex: manifesto inválido, tema não encontrado) devem retornar `Err` imediatamente
- **Código de saída:** 0 para sucesso, 1 para erro fatal, 2 para aviso (sucesso parcial)

### 10.3 Output de Erro para o Usuário

```
✗ Error: Theme 'catppuccin-mocha' does not support 'gnome'.
  Supported environments: kde-plasma-6

  Hint: Run 'themectl list' to see available themes.
```

Formato:
- Linha 1: `✗ Error: <mensagem>`
- Linha 2 (opcional): contexto adicional indentado
- Linha em branco
- Linha `Hint:` (opcional): sugestão de próximo passo

---

## 11. Testes

### 11.1 Obrigatoriedade

- Todo módulo em `src/` deve ter um bloco `#[cfg(test)]` com testes unitários
- Os arquivos em `tests/` são testes de integração que testam a CLI como um binário
- **Cobertura mínima:** todas as funções públicas devem ter ao menos um teste de caminho feliz e um de caminho de erro

### 11.2 Fixtures

O diretório `tests/fixtures/minimal-theme/` deve conter um tema mínimo válido:

```yaml
# tests/fixtures/minimal-theme/theme.yaml
name: minimal-theme
version: 0.1.0
supports:
  - kde-plasma-6
```

### 11.3 Testes de Integração Obrigatórios

```rust
// tests/cli_install.rs
// ✓ install from local .theme file
// ✓ install already installed theme returns error
// ✓ install already installed theme with --force succeeds
// ✓ install file that is not a valid .theme returns error
// ✓ install theme with invalid manifest returns error

// tests/cli_apply.rs
// ✓ apply installed theme with --dry-run prints plan and does not apply
// ✓ apply theme not installed returns error
// ✓ apply creates backup before applying (unless --no-backup)

// tests/cli_rollback.rs
// ✓ rollback with no backup returns error
// ✓ rollback --list shows available backups
```

### 11.4 Regra de Testes com Comandos de Sistema

Testes que chamam `plasma-apply-desktoptheme` ou similares **não devem ser executados em CI**. Eles devem ser marcados com:

```rust
#[ignore = "requires KDE Plasma session"]
```

---

## 12. Convenções de Código

### 12.1 Formatação

- Usar `rustfmt` com configurações padrão
- Máximo de 100 caracteres por linha
- Sem `#[allow(dead_code)]` em código de produção

### 12.2 Nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Módulos | `snake_case` | `apply/kde.rs` |
| Structs e Enums | `PascalCase` | `ThemeManifest` |
| Funções e métodos | `snake_case` | `apply_plasma_style` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_BACKUPS` |
| Variáveis | `snake_case` | `theme_dir` |

### 12.3 Comentários

- Documentar com `///` todas as funções e tipos públicos
- Usar `//` para comentários inline explicando o *porquê*, não o *o quê*
- Comentários em inglês

### 12.4 Estrutura de `main.rs`

`main.rs` deve conter apenas:

```rust
fn main() {
    if let Err(e) = themectl::run() {
        eprintln!("{} {}", "✗ Error:".red(), e);
        std::process::exit(1);
    }
}
```

Toda lógica deve estar em módulos.

### 12.5 Funções de Utilidade

A IA não deve reimplementar operações comuns. Deve criar helpers em `util/`:

- `util::fs::copy_dir(src, dst)` — copia diretório recursivamente
- `util::fs::ensure_dir(path)` — cria diretório se não existir
- `util::cmd::run(program, args)` — executa comando e retorna stdout
- `util::cmd::kreadconfig5(file, group, key)` — wrapper específico

---

## 13. Escopo Proibido no MVP

A IA **não deve implementar** nenhum dos itens abaixo no MVP, mesmo que sejam simples ou que o usuário peça:

- Suporte a GNOME, XFCE, Cinnamon ou qualquer outro ambiente além do KDE Plasma
- Interface gráfica (GUI ou TUI)
- Backend HTTP / servidor de repositório
- Sistema de autenticação
- Avaliações ou comentários
- Atualizações automáticas
- Sincronização em nuvem
- Suporte a KDE Plasma 5 (foco total no Plasma 6)
- Instalação automática de dependências via `apt`, `pacman`, `dnf`, etc.
- Edição de temas
- Preview de temas antes de aplicar
- Suporte a `.deb` ou `.rpm` como formato de distribuição de temas
- Integração com KDE Store / Pling / OpenDesktop

Se o usuário solicitar qualquer um desses itens, a IA deve responder:

> "Este item está fora do escopo do MVP conforme definido em SPEC.md, seção 13. Deseja adicioná-lo a um roadmap futuro ou atualizar o SPEC?"

---

*Fim do documento de especificação — versão 0.1.0*
*Qualquer alteração neste documento deve ser acompanhada de atualização do changelog abaixo.*

## Changelog

| Versão | Data | Alteração |
|---|---|---|
| 0.1.0 | inicial | Criação do documento |