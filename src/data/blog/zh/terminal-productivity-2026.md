---
title: "Terminal 生产力：重塑我工作流的工具"
description: 一趟现代命令行工具之旅：它们取代了 Unix 经典工具——更快、更智能，DX 也更好。
pubDatetime: 2026-01-18T10:00:00Z
tags:
  - terminal
  - productivity
  - linux
  - cli
  - tools
draft: false
---

CLI 生态经历了一场静悄悄的革命。用 Rust 和 Go 写成的工具取代了沿用数十年的 Unix 二进制程序，在几乎不牺牲速度的前提下，带来了彩色输出、语法高亮、模糊搜索和 Git 感知。下面这些就是我每天都在用的工具。

## Shell：Zsh + Starship

[Starship](https://starship.rs) 无疑是花最少力气、却能最大程度提升体验的 prompt。它适用于任何 shell，速度快得惊人（用 Rust 编写），还会展示相关上下文：Git 分支、Node/Python/Rust 版本、上一条命令的执行状态。

```toml file=~/.config/starship.toml
# Minimalist but informative style
format = """
$directory\
$git_branch\
$git_status\
$nodejs\
$rust\
$python\
$cmd_duration\
$line_break\
$character"""

[git_branch]
symbol = " "
style = "bold purple"

[git_status]
conflicted = "⚔️ "
ahead = "⇡${count}"
behind = "⇣${count}"
modified = "✎${count}"
untracked = "?${count}"

[cmd_duration]
min_time = 2_000
format = "took [$duration](bold yellow)"
```

## 经典工具的现代替代

### `ls` → `eza`（前身为 `exa`）

```bash
eza --tree --level=2 --icons --git    # tree with icons and Git status
eza -la --sort=modified               # long list, sorted by date
```

### `find` → `fd`

```bash
# find: verbose and poor ergonomics
find . -name "*.ts" -not -path "*/node_modules/*"    # [!code --]

# fd: intuitive, respects .gitignore by default
fd -e ts                    # all .ts in the project          # [!code ++]
fd -e ts --exec bat {}      # open each result with bat       # [!code ++]
```

### `grep` → `ripgrep`（`rg`）

```bash
# classic grep
grep -r "useEffect" src/ --include="*.tsx"      # [!code --]

# rg: 5-10× faster, respects .gitignore
rg "useEffect" --type ts                         # [!code ++]
rg "TODO|FIXME|HACK" --type ts --stats           # [!code ++]
rg "deprecated" -l                               # filenames only # [!code ++]
```

### `cat` → `bat`

`bat` 就是带语法高亮、行号、分页和内置 Git diff 的 `cat`：

```bash
bat src/components/Header.astro     # with colors and lines
bat --diff file.ts                  # shows inline Git changes
```

### `cd` → `zoxide`

它会学习你常去的目录，让你只敲几个字母就能跳转过去：

```bash
z astro      # jumps to ~/projects/my-astro-blog if it's the most visited
z blog src   # multiple match
zi           # interactive mode with fzf
```

## 多路复用器：`tmux` 的现代配置

```bash file=~/.tmux.conf
# More comfortable prefix
set -g prefix C-a
unbind C-b

# Split panes with intuitive keys
bind | split-window -h -c "#{pane_current_path}"  # [!code highlight]
bind - split-window -v -c "#{pane_current_path}"  # [!code highlight]

# Navigation with Alt+arrow (no prefix)
bind -n M-Left  select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up    select-pane -U
bind -n M-Down  select-pane -D

# Mouse enabled
set -g mouse on

# 256 colors
set -g default-terminal "tmux-256color"
```

## 模糊查找器：`fzf`——万物的放大器

`fzf` 能把任何列表变成交互式查找器。只需在任何命令后面加上 `| fzf`。

```bash
# Search in command history
CTRL+R with integrated fzf

# Checkout branch with preview
git branch | fzf --preview 'git log --oneline {}' | xargs git checkout

# Kill processes
ps aux | fzf --multi | awk '{print $2}' | xargs kill

# Find and open file
fd -e ts | fzf --preview 'bat --color=always {}' | xargs nvim
```

## 现代 Git：`lazygit`

一个 Git TUI（Terminal UI），让仓库里正在发生什么一目了然：

```bash
lazygit   # opens the interface
```

亮点功能：

- 按文件、按行查看 diff
- 选择性 stage（可以精确到单行，而不只是整个文件）
- 可视化解决冲突
- 支持拖放的交互式 rebase

## 我优化过的基础 `.zshrc`

```bash file=~/.zshrc
# Fast load with lazy loading
export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"

# Modern aliases
alias ls='eza --icons'
alias ll='eza -la --icons --git'
alias tree='eza --tree --icons'
alias cat='bat'
alias find='fd'
alias grep='rg'
alias lg='lazygit'

# fzf integration
source <(fzf --zsh)

# zoxide
eval "$(zoxide init zsh)"

# starship
eval "$(starship init zsh)"
```

> 在 terminal 生产力上，最划算的时间投入不是学习新工具，而是精通手头已有的工具。不过，当一款现代工具能以 5 倍的速度、更好的 DX 完成同样的事情时，换过去第一周就回本了。
