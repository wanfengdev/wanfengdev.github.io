---
title: "面向 JavaScript 开发者的 Rust：值得迈出的一步"
description: 如果你来自 JS/TS 世界，又对 Rust 望而生畏，这篇指南就是为你准备的。我们用直观的示例，把你熟悉的概念一一映射到 Rust 生态。
pubDatetime: 2026-02-12T10:00:00Z
tags:
  - rust
  - javascript
  - systems
  - webassembly
draft: false
---

Rust 早在几年前就进入了 Web 开发者的视野，但普及一直很缓慢。到了 2026 年，局面变了：JS 生态里的关键工具（Biome、Oxc、Rolldown、SWC 编译器）都由 Rust 驱动，WebAssembly 更让它在前端变得不可或缺。是时候学起来了。

## 最大的思维转变：ownership

在 JavaScript 里，内存由垃圾回收器管理。而在 Rust 里，这份责任通过 **ownership** 系统交给了编译器。

```rust file=ownership.rs
// In JS: this works
// let a = [1, 2, 3];
// let b = a; // a is still valid

// In Rust:
fn main() {
    let a = vec![1, 2, 3];
    let b = a;          // a is "moved" to b // [!code highlight]
    println!("{:?}", a); // ✗ ERROR: a was moved
    println!("{:?}", b); // ✓
}
```

解决办法：通过引用来 **borrow**。

```rust file=borrowing.rs
fn main() {
    let a = vec![1, 2, 3];
    let b = &a;          // immutable borrow // [!code ++]
    println!("{:?}", a); // ✓ a is still valid
    println!("{:?}", b); // ✓
}

fn print_vec(v: &Vec<i32>) { // receives reference, not ownership // [!code highlight]
    for n in v {
        print!("{} ", n);
    }
}
```

## 类型：从 `any` 到世界上最安全的类型系统

| JavaScript/TypeScript  | Rust 中的对应                    |
| ---------------------- | -------------------------------- |
| `number`               | `i32`、`u32`、`f64`……            |
| `string`               | `String`（堆上）/ `&str`（切片） |
| `T \| null`            | `Option<T>`                      |
| `T \| Error`           | `Result<T, E>`                   |
| `any[]`                | `Vec<T>`                         |
| `{ [key: string]: T }` | `HashMap<String, T>`             |

```rust file=types.rs
fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 {
        None   // equivalent to null without the billion-dollar mistake
    } else {
        Some(a / b)
    }
}

fn main() {
    match divide(10.0, 0.0) {
        Some(result) => println!("Result: {result}"),
        None => println!("Division by zero"),
    }
}
```

## 错误处理：`Result` 就是 Rust 里的 `Promise`

在 JS 里，你用 `try/catch` 或 `Promise` 链来处理错误。在 Rust 里，`Result<T, E>` 才是惯用做法：

```rust file=errors.rs
use std::fs;
use std::io;

// Before: without the ? operator
fn read_config_verbose() -> Result<String, io::Error> {
    let content = match fs::read_to_string("config.toml") { // [!code --]
        Ok(c) => c,                                            // [!code --]
        Err(e) => return Err(e),                               // [!code --]
    };                                                         // [!code --]
    Ok(content.to_uppercase())
}

// With the ? operator (equivalent to JS await, but for errors)
fn read_config() -> Result<String, io::Error> {               // [!code ++]
    let content = fs::read_to_string("config.toml")?;       // [!code ++]
    Ok(content.to_uppercase())                               // [!code ++]
}
```

## 闭包与高阶函数

语法不同，概念却完全一致：

```rust file=closures.rs
fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    // map + filter + collect (like Array.map + filter in JS)
    let double_evens: Vec<i32> = numbers
        .iter()
        .filter(|&&x| x % 2 == 0)  // [!code highlight]
        .map(|&x| x * 2)            // [!code highlight]
        .collect();

    println!("{:?}", double_evens); // [4, 8]
}
```

## Rust → WebAssembly：通往前端的桥梁

```rust file=lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}
```

```bash
# Compile to WASM
wasm-pack build --target web
```

```javascript file=main.js
import init, { fibonacci } from "./pkg/my_project.js";

await init();
console.log(fibonacci(40)); // ~10x faster than pure JS version
```

## 从哪里入手

1. **[Rust 程序设计语言](https://doc.rust-lang.org/book/)**——所有编程语言中最好的文档。
2. **Rustlings**——在终端里完成的交互式练习。
3. **[通过例子学 Rust](https://doc.rust-lang.org/rust-by-example/)**——用真实示例学习。
4. 用 **`wasm-pack`** 构建点东西，然后在你现有的 Web 项目里调用它。

> 学习曲线确实存在，但 Rust 编译器是你能遇到的最好的老师：它的报错信息详尽、准确，而且几乎总是附带解决方案。
