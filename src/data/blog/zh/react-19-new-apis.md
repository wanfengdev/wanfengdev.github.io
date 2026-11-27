---
title: "React 19：useActionState、useOptimistic，告别手动管理加载状态"
description: React 19 重新设计了我们处理表单、数据变更和过渡状态的方式。一份结合真实示例的新 API 实战指南。
pubDatetime: 2026-01-28T10:00:00Z
tags:
  - react
  - javascript
  - frontend
  - ux
draft: false
---

React 19 是自 Hooks 问世以来最重要的一次更新。它没有带来激进的新概念，而是为一个我们已经换着花样解决过上千次的问题给出了最终答案：**处理表单和数据变更**。

## React 19 解决了什么问题

在 React 19 之前，一个带加载反馈、错误处理和乐观更新的表单得写成这样：

```tsx file=before.tsx
// Before: 35+ lines for something "basic"
function ProfileForm() {
  const [isPending, setIsPending] = useState(false); // [!code --]
  const [error, setError] = useState<string | null>(null); // [!code --]
  const [success, setSuccess] = useState(false); // [!code --]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // [!code --]
    e.preventDefault(); // [!code --]
    setIsPending(true); // [!code --]
    setError(null); // [!code --]
    try {
      // [!code --]
      const data = new FormData(e.currentTarget); // [!code --]
      await updateProfile(data); // [!code --]
      setSuccess(true); // [!code --]
    } catch (err) {
      // [!code --]
      setError("Error saving"); // [!code --]
    } finally {
      // [!code --]
      setIsPending(false); // [!code --]
    } // [!code --]
  }
  // ...
}
```

## `useActionState`：表单无需再手写 useState

```tsx file=profile-form.tsx
import { useActionState } from "react"; // [!code ++]

async function updateProfileAction(prevState: State, formData: FormData) {
  try {
    await updateProfile({
      name: formData.get("name") as string,
      bio: formData.get("bio") as string,
    });
    return { success: true, error: null };
  } catch {
    return { success: false, error: "Error saving profile" };
  }
}

function ProfileForm() {
  const [state, action, isPending] = useActionState(
    // [!code highlight]
    updateProfileAction,
    { success: false, error: null }
  );

  return (
    <form action={action}>
      <input name="name" placeholder="Name" />
      <textarea name="bio" placeholder="Biography" />

      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">Saved!</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

## `useOptimistic`：UI 即时响应，自动回滚

乐观更新模式（在服务端确认之前先更新 UI）过去实现起来相当繁琐。现在：

```tsx file=todo-list.tsx
import { useOptimistic, useActionState } from "react";

function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    // [!code highlight]
    initialTodos,
    (state, newTodo: Todo) => [...state, newTodo]
  );

  async function addTodoAction(_: State, formData: FormData) {
    const title = formData.get("title") as string;

    // Immediate UI update
    addOptimisticTodo({ id: crypto.randomUUID(), title, done: false }); // [!code highlight]

    // Real mutation (the hook reverts if it fails)
    await createTodo(title);
    return { error: null };
  }

  const [state, action, isPending] = useActionState(addTodoAction, {
    error: null,
  });

  return (
    <>
      <ul>
        {optimisticTodos.map(todo => (
          <li
            key={todo.id}
            style={{ opacity: todo.id.startsWith("temp") ? 0.5 : 1 }}
          >
            {todo.title}
          </li>
        ))}
      </ul>
      <form action={action}>
        <input name="title" required />
        <button disabled={isPending}>Add</button>
      </form>
    </>
  );
}
```

## `use()`：在条件分支中读取 Promise 和 context

```tsx file=user-profile.tsx
import { use, Suspense } from "react";

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // [!code highlight] — can be used inside conditionals

  return <h1>{user.name}</h1>;
}

// The Suspense boundary caches and resolves the promise
function App() {
  const userPromise = fetchUser("123"); // created outside the component

  return (
    <Suspense fallback={<p>Loading user…</p>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

## Server Actions 实战

React 19 正式确立了 **Server Actions**（用 `"use server"` 标记、运行在服务端的函数）：

```tsx file=actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
  revalidatePath("/posts"); // invalidates server cache // [!code highlight]
}
```

```tsx file=post-card.tsx
import { deletePost } from "./actions";

export function PostCard({ post }: { post: Post }) {
  return (
    <article>
      <h2>{post.title}</h2>
      <form action={deletePost.bind(null, post.id)}>
        <button type="submit">Delete</button>
      </form>
    </article>
  );
}
```

## 新 API 一览

| API              | 替代了什么                                | 什么时候用                      |
| ---------------- | ----------------------------------------- | ------------------------------- |
| `useActionState` | 表单场景下的 `useState` + `useReducer`    | 任何需要 UI 反馈的数据变更      |
| `useOptimistic`  | 手写的回滚逻辑                            | 能提升感知性能的更新操作        |
| `use(promise)`   | 数据请求场景下的 `useEffect` + `useState` | 在渲染期间读取 promise 的组件   |
| `use(context)`   | `useContext`                              | 需要在条件分支中读取 context 时 |
| `ref` 作为 prop  | `forwardRef`                              | 始终推荐——省去了不必要的包装层  |
