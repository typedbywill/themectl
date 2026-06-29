# themectl — Gerenciador de Temas Completo para Linux (KDE Plasma 6)

`themectl` é uma ferramenta de linha de comando escrita em Rust projetada para instalar, aplicar, gerenciar, exportar e restaurar temas completos no ambiente desktop KDE Plasma 6 com um único comando.

## 🚀 Funcionalidades

- **Instalação Simplificada:** Instale temas compactados em formato `.theme` (`.tar.gz`) a partir de caminhos locais, URLs HTTP/HTTPS ou buscando diretamente em repositórios configurados.
- **Aplicação Completa:** Aplica múltiplos componentes do tema em sequência de forma automatizada:
  - Fontes (TTF, OTF, WOFF2)
  - Estilo do Plasma (`plasma_style`)
  - Esquema de Cores (`color_scheme`)
  - Temas de Ícones (`icon_theme`)
  - Temas de Cursor (`cursor_theme`)
  - Temas do Kvantum (`kvantum_theme`)
  - Temas GTK (`gtk_theme` - GTK3/GTK4)
  - Wallpaper (`wallpaper`)
  - Perfis do Konsole (`konsole_profile`)
- **Sistema de Backup Automático & Rollback:** Salva o estado atual de configurações antes de aplicar qualquer tema e permite restaurar instantaneamente o estado anterior com rotação inteligente de backups (limite de 10 snapshots).
- **Exportação de Temas:** Compacta suas configurações de aparência atuais em um arquivo `.theme` pronto para ser compartilhado ou importado em outras máquinas.
- **Gerenciamento de Repositórios:** Adicione, liste e atualize fontes customizadas de repositórios de temas.

---

## 🛠️ Instalação e Compilação

### Pré-requisitos
Certifique-se de que o Rust (cargo) e as ferramentas de build estão instaladas no seu sistema:

```bash
# No Fedora
sudo dnf groupinstall "Development Tools"

# Instalar o Rust via rustup (caso não possua)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Compilando o Projeto

Para compilar e gerar o binário de produção do `themectl`:

```bash
# Clone o repositório e acesse a pasta
git clone https://github.com/typedbywill/themectl.git
cd themectl

# Compilar em modo release
cargo build --release
```

O binário final estará disponível em `target/release/themectl`. Você pode copiá-lo para um diretório no seu `PATH` (ex: `/usr/local/bin/` ou `~/.local/bin/`).

---

## 📖 Como Usar (Guia Rápido)

### 1. Listar Temas
Para visualizar os temas instalados localmente e os disponíveis para download:
```bash
# Listar temas instalados
themectl list

# Listar temas disponíveis nos repositórios remotos
themectl list --available
```

### 2. Instalar um Tema
Você pode instalar de três fontes diferentes:
```bash
# A partir de um repositório configurado
themectl install catppuccin-mocha

# A partir de um arquivo local .theme
themectl install ./meu-tema.theme

# A partir de uma URL direta
themectl install https://exemplo.com/download/tema.theme
```
*Use a flag `--force` para reinstalar um tema já instalado.*

### 3. Aplicar um Tema
Aplica o tema configurando automaticamente todas as propriedades suportadas:
```bash
# Aplica o tema criando um backup automático do estado atual
themectl apply catppuccin-mocha

# Aplica apenas componentes específicos (ex: cores e wallpaper)
themectl apply catppuccin-mocha --components color_scheme,wallpaper

# Aplica sem criar um backup do estado anterior
themectl apply catppuccin-mocha --no-backup
```

### 4. Restaurar/Desfazer Alterações (Rollback)
```bash
# Listar os backups existentes
themectl rollback --list

# Restaurar para o backup mais recente
themectl rollback

# Restaurar para um timestamp de backup específico
themectl rollback --to 2026-06-29T09-24-22
```

### 5. Exportar sua Aparência Atual
Você pode salvar o seu visual atual em um tema portátil:
```bash
# Exporta as configurações atuais de aparência
themectl export --output ./meu-tema-custom.theme
```

### 6. Detalhes de um Tema
Mostra os metadados do tema instalado e verifica se as dependências do sistema estão presentes:
```bash
themectl info catppuccin-mocha
```

### 7. Remover um Tema
```bash
themectl remove catppuccin-mocha
```

### 8. Gerenciar Repositórios (Fontes)
```bash
# Adicionar novo repositório
themectl source add https://raw.githubusercontent.com/usuario/repositorio/main/index.json --name meu-repo

# Atualizar caches locais de repositório
themectl source refresh

# Listar repositórios configurados
themectl source list

# Remover um repositório
themectl source remove meu-repo
```

---

## 🎨 Especificação de Pacotes de Tema (`.theme`)

Um pacote `.theme` nada mais é do que um arquivo compactado `.tar.gz` que contém a seguinte estrutura interna mínima:

```
nome-do-tema/
├── theme.yaml              # Manifesto do tema (obrigatório)
├── plasma/                 # Pasta contendo o estilo Plasma (opcional)
├── colors/                 # Arquivo .colors do KDE (opcional)
├── icons/                  # Pasta contendo o tema de ícones (opcional)
├── wallpapers/             # Imagens de fundo (opcional)
├── fonts/                  # Arquivos .ttf/.otf (opcional)
└── cursors/                # Pasta contendo o tema de cursor (opcional)
```

### Exemplo de Manifesto `theme.yaml`
```yaml
name: catppuccin-mocha
version: 1.2.0
display_name: "Catppuccin Mocha"
description: "Dark theme with pastel colors, inspired by coffee."
author: "Catppuccin Org"
license: "MIT"
supports:
  - kde-plasma-6

dependencies:
  packages:
    - kvantum

components:
  plasma_style: plasma/
  color_scheme: colors/CatppuccinMocha.colors
  icon_theme: ./icons/
  wallpaper: wallpapers/mocha.jpg
  fonts:
    - fonts/JetBrainsMono.ttf
```

---

## 🧪 Testes

Para executar toda a suíte de testes unitários e de integração:

```bash
cargo test
```

*Os testes de integração criam ambientes isolados em diretórios temporários usando variáveis `XDG_DATA_HOME` e `XDG_CONFIG_HOME`, sem poluir ou alterar suas configurações reais do KDE.*
