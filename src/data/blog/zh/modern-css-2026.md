---
title: "2026 年的现代 CSS：容器查询、:has() 与锚点定位"
description: 面对复杂布局，如今的 CSS 丝毫不逊于 JavaScript。这份实用指南带你了解对界面开发影响最深的三大特性。
pubDatetime: 2026-02-03T10:00:00Z
tags:
  - css
  - frontend
  - design
  - web
draft: false
---

多年来，"这个效果用 CSS 怎么做？"的答案一直是"用 JavaScript"。到了 2026 年，这个答案在大多数场景下已经不成立了。有三个特性尤其突出，重新绘制了浏览器里的设计版图。

## Container Queries：响应容器，而不是屏幕

媒体查询响应的是 _viewport_ 宽度。问题在于：同一个组件，可能因为父级布局不同而身处窄栏或宽栏。**容器查询**解决的正是这个问题。

```css file=card.css
/* Declare the container */
.card-wrapper {
  container-type: inline-size; /* [!code highlight] */
  container-name: card;
}

/* The component responds to its container */
@container card (min-width: 400px) {
  /* [!code highlight] */
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }

  .card__image {
    grid-row: 1 / 3;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
```

```html file=card.html
<!-- The same component works in any context -->
<aside class="card-wrapper" style="width: 300px">
  <article class="card">...</article>
  <!-- vertical layout -->
</aside>

<main class="card-wrapper" style="width: 700px">
  <article class="card">...</article>
  <!-- horizontal layout -->
</main>
```

### 容器查询单位

容器查询还带来了相对于容器的单位：

```css file=typography.css
.card__title {
  font-size: clamp(1rem, 4cqi, 2rem); /* cqi = container query inline size */
}
```

## `:has()` 伪类——我们期盼已久的父选择器

`:has()` 根据元素的**后代**来选中元素。它就是 CSS 几十年来一直不肯给的"父选择器"。

```css file=styles.css
/* Form with empty required field */
form:has(input:required:invalid) .submit-btn {
  opacity: 0.5;
  pointer-events: none;
}

/* Card containing an image: different layout */
.card:has(img) {
  /* [!code highlight] */
  display: grid;
  grid-template-columns: 150px 1fr;
}

.card:not(:has(img)) {
  padding: 1.5rem;
}

/* Navbar with open menu: disable scroll on body */
body:has(.nav-menu[aria-expanded="true"]) {
  /* [!code highlight] */
  overflow: hidden;
}
```

> 自 2023 年起，所有现代浏览器都已支持 `:has()`。今天就可以直接在生产环境使用，无需 polyfill。

## Anchor Positioning：不用 JavaScript 实现 tooltip 和 popover

在 Anchor Positioning 出现之前，想把 tooltip 摆在触发元素旁边，得用 JavaScript 计算位置。现在不用了：

```css file=tooltip.css
/* Declare the anchor */
.btn-trigger {
  anchor-name: --my-button; /* [!code highlight] */
}

/* Position the tooltip relative to the anchor */
.tooltip {
  position: absolute;
  position-anchor: --my-button; /* [!code highlight] */
  bottom: calc(anchor(top) + 8px); /* [!code highlight] */
  left: anchor(center); /* [!code highlight] */
  transform: translateX(-50%);

  /* Flip automatically if it doesn't fit */
  position-try-fallbacks: flip-block; /* [!code ++] */
}
```

```html file=tooltip.html
<button class="btn-trigger" popovertarget="tip">Hover me</button>
<div id="tip" class="tooltip" popover>
  This tooltip positions itself, without JS.
</div>
```

### `position-try-fallbacks`：声明式的碰撞处理逻辑

```css file=tooltip.css
.tooltip {
  position-try-fallbacks:
    flip-block,
    /* try top if it doesn't fit below */ flip-inline,
    /* try left if it doesn't fit right */ flip-start; /* combine both */
}
```

## 兼容性如何？

| 特性               | Chrome | Firefox | Safari  |
| ------------------ | ------ | ------- | ------- |
| Container Queries  | 105+ ✓ | 110+ ✓  | 16+ ✓   |
| `:has()`           | 105+ ✓ | 121+ ✓  | 15.4+ ✓ |
| Anchor Positioning | 125+ ✓ | 131+ ✓  | 18+ ✓   |

2026 年，以当前的浏览器分布来看，大多数项目都可以放心把这三个特性用到生产环境。只有当你的用户群还包含非常老的浏览器时，才需要考虑 polyfill。

## 今天的 CSS：声明式且富有表达力

CSS 那场静悄悄的革命，不是 Grid，也不是 Flexbox，而是思维方式的转变：**浏览器负责推理约束，你只声明想要的结果**。容器查询、`:has()` 和锚点定位，正是这一范式的集大成者。
