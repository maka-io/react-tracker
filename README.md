# react-meteor-data

This package provides an integration between React and [`Tracker`](https://atmospherejs.com/meteor/tracker), Meteor's reactive data system.

## Table of Contents

- [Install](#install)
  - [Changelog](#changelog)
- [Usage](#usage)
  - [`useTracker`](#usetrackerreactivefn-basic-hook)
    - [With dependencies](#usetrackerreactivefn-deps-hook-with-deps)
    - [Skipping updates](#usetrackerreactivefn-deps-skipUpdate-or-usetrackerreactivefn-skipUpdate)
  - [`withTracker`](#withtrackerreactivefn-higher-order-component)
    - [Advanced container config](#withtracker-reactivefn-pure-skipupdate--advanced-container-config)
  - [Concurrent Mode, Suspense, and Error Boundaries](#concurrent-mode-suspense-and-error-boundaries)
  - [Suspendable version of hooks](#suspendable-hooks)
    - [useTracker](#suspense/useTracker)
  - [Version compatibility notes](#version-compatibility-notes)

## Install

To install the package, use `meteor add`:

```bash
meteor add react-meteor-data
```

You'll also need to install `react` if you have not already:

```bash
meteor npm install react
```

### Changelog

[check recent changes here](./CHANGELOG.md)

## Usage

This package provides two ways to use Tracker reactive data in your React components:

The `useTracker` hook, introduced in version 2.0.0, embraces the [benefits of hooks](https://reactjs.org/docs/hooks-faq.html). Like all React hooks, it can only be used in function components, not in class components.

The `withTracker` HOC can be used with all components, function or class based.

It is not necessary to rewrite existing applications to use the `useTracker` hook instead of the existing `withTracker` HOC.

### `useTracker(reactiveFn)` basic hook

You can use the `useTracker` hook to get the value of a Tracker reactive function in your React "function components." The reactive function will get re-run whenever its reactive inputs change, and the component will re-render with the new value.

`useTracker` manages its own state, and causes re-renders when necessary. There is no need to call React state setters from inside your `reactiveFn`. Instead, return the values from your `reactiveFn` and assign those to variables directly. When the `reactiveFn` updates, the variables will be updated, and the React component will re-render.

Arguments:

- `reactiveFn`: A Tracker reactive function (receives the current computation).

The basic way to use `useTracker` is to simply pass it a reactive function, with no further fuss. This is the preferred configuration in many cases.

#### `useTracker(reactiveFn, deps)` hook with deps

You can pass an optional deps array as a second value. When provided, the computation will be retained, and reactive updates after the first run will run asynchronously from the react render execution frame. This array typically includes all variables from the outer scope "captured" in the closure passed as the 1st argument. For example, the value of a prop used in a subscription or a minimongo query; see example below.

This should be considered a low level optimization step for cases where your computations are somewhat long running - like a complex minimongo query. In many cases it's safe and even preferred to omit deps and allow the computation to run synchronously with render.

Arguments:

- `reactiveFn`
- `deps`: An optional array of "dependencies" of the reactive function. This is very similar to how the `deps` argument for [React's built-in `useEffect`, `useCallback` or `useMemo` hooks](https://reactjs.org/docs/hooks-reference.html) work.

```js
import { useTracker } from 'meteor/react-meteor-data';

// React function component.
function Foo({ listId }) {
  // This computation uses no value from the outer scope,
  // and thus does not needs to pass a 'deps' argument.
  // However, we can optimize the use of the computation
  // by providing an empty deps array. With it, the
  // computation will be retained instead of torn down and
  // rebuilt on every render. useTracker will produce the
  // same results either way.
  const currentUser = useTracker(() => Meteor.user(), []);

  // The following two computations both depend on the
  // listId prop. When deps are specified, the computation
  // will be retained.
  const listLoading = useTracker(() => {
    // Note that this subscription will get cleaned up
    // when your component is unmounted or deps change.
    const handle = Meteor.subscribe('todoList', listId);
    return !handle.ready();
  }, [listId]);
  const tasks = useTracker(() => Tasks.find({ listId }).fetch(), [listId]);

  return (
    <h1>Hello {currentUser.username}</h1>
    {listLoading ? (
        <div>Loading</div>
      ) : (
        <div>
          Here is the Todo list {listId}:
          <ul>
            {tasks.map(task => (
              <li key={task._id}>{task.label}</li>
            ))}
          </ul>
        </div>
      )}
  );
}
```

**Note:** the [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks) package provides ESLint hints to help detect missing values in the `deps` argument of React built-in hooks. It can be configured to also validate the `deps` argument of the `useTracker` hook or some other hooks, with the following `eslintrc` config:

```json
"react-hooks/exhaustive-deps": ["warn", { "additionalHooks": "useTracker|useSomeOtherHook|..." }]
```

#### `useTracker(reactiveFn, deps, skipUpdate)` or `useTracker(reactiveFn, skipUpdate)`

You may optionally pass a function as a second or third argument. The `skipUpdate` function can evaluate the return value of `reactiveFn` for changes, and control re-renders in sensitive cases. *Note:* This is not meant to be used with a deep compare (even fast-deep-equals), as in many cases that may actually lead to worse performance than allowing React to do it's thing. But as an example, you could use this to compare an `updatedAt` field between updates, or a subset of specific fields, if you aren't using the entire document in a subscription. As always with any optimization, measure first, then optimize second. Make sure you really need this before implementing it.

Arguments:

- `reactiveFn`
- `deps?` - optional - you may omit this, or pass a "falsy" value.
- `skipUpdate` - A function which receives two arguments: `(prev, next) => (prev === next)`. `prev` and `next` will match the type or data shape as that returned by `reactiveFn`. Note: A return value of `true` means the update will be "skipped". `false` means re-render will occur as normal. So the function should be looking for equivalence.

```jsx
import { useTracker } from 'meteor/react-meteor-data';

// React function component.
function Foo({ listId }) {
  const tasks = useTracker(
    () => Tasks.find({ listId }).fetch(), [listId],
    (prev, next) => {
      // prev and next will match the type returned by the reactiveFn
      return prev.every((doc, i) => (
        doc._id === next[i] && doc.updatedAt === next[i]
      )) && prev.length === next.length;
    }
  );

  return (
    <h1>Hello {currentUser.username}</h1>
    <div>
      Here is the Todo list {listId}:
      <ul>
        {tasks.map(task => (
          <li key={task._id}>{task.label}</li>
        ))}
      </ul>
    </div>
  );
}
```

### `withTracker(reactiveFn)` higher-order component

You can use the `withTracker` HOC to wrap your components and pass them additional props values from a Tracker reactive function. The reactive function will get re-run whenever its reactive inputs change, and the wrapped component will re-render with the new values for the additional props.

Arguments:

- `reactiveFn`: a Tracker reactive function, getting the props as a parameter, and returning an object of additional props to pass to the wrapped component.

```js
import { withTracker } from 'meteor/react-meteor-data';

// React component (function or class).
function Foo({ listId, currentUser, listLoading, tasks }) {
  return (
    <h1>Hello {currentUser.username}</h1>
    {listLoading ?
      <div>Loading</div> :
      <div>
        Here is the Todo list {listId}:
        <ul>{tasks.map(task => <li key={task._id}>{task.label}</li>)}</ul>
      </div}
  );
}

export default withTracker(({ listId }) => {
  // Do all your reactive data access in this function.
  // Note that this subscription will get cleaned up when your component is unmounted
  const handle = Meteor.subscribe('todoList', listId);

  return {
    currentUser: Meteor.user(),
    listLoading: !handle.ready(),
    tasks: Tasks.find({ listId }).fetch(),
  };
})(Foo);
```

The returned component will, when rendered, render `Foo` (the "lower-order" component) with its provided props in addition to the result of the reactive function. So `Foo` will receive `{ listId }` (provided by its parent) as well as `{ currentUser, listLoading, tasks }` (added by the `withTracker` HOC).

For more information, see the [React article](http://guide.meteor.com/react.html) in the Meteor Guide.

#### `withTracker({ reactiveFn, pure, skipUpdate })` advanced container config

The `withTracker` HOC can receive a config object instead of a simple reactive function.

- `getMeteorData` - The `reactiveFn`.
- `pure` - `true` by default. Causes the resulting Container to be wrapped with React's `memo()`.
- `skipUpdate` - A function which receives two arguments: `(prev, next) => (prev === next)`. `prev` and `next` will match the type or data shape as that returned by `reactiveFn`. Note: A return value of `true` means the update will be "skipped". `false` means re-render will occur as normal. So the function should be looking for equivalence.

```js
import { withTracker } from 'meteor/react-meteor-data';

// React component (function or class).
function Foo({ listId, currentUser, listLoading, tasks }) {
  return (
    <h1>Hello {currentUser.username}</h1>
    {listLoading ?
      <div>Loading</div> :
      <div>
        Here is the Todo list {listId}:
        <ul>{tasks.map(task => <li key={task._id}>{task.label}</li>)}</ul>
      </div}
  );
}

export default withTracker({
  getMeteorData ({ listId }) {
    // Do all your reactive data access in this function.
    // Note that this subscription will get cleaned up when your component is unmounted
    const handle = Meteor.subscribe('todoList', listId);

    return {
      currentUser: Meteor.user(),
      listLoading: !handle.ready(),
      tasks: Tasks.find({ listId }).fetch(),
    };
  },
  pure: true,
  skipUpdate (prev, next) {
    // prev and next will match the shape returned by the reactiveFn
    return (
      prev.currentUser?._id === next.currentUser?._id
    ) && (
      prev.listLoading === next.listLoading
    ) && (
      prev.tasks.every((doc, i) => (
        doc._id === next[i] && doc.updatedAt === next[i]
      ))
      && prev.tasks.length === next.tasks.length
    );
  }
})(Foo);
```

### Maintaining the reactive context

To maintain a reactive context using the new Meteor Async methods, we are using the new `Tracker.withComputation` API to maintain the reactive context of an
async call, this is needed because otherwise it would be only called once, and the computation would never run again,
this way, every time we have a new Link being added, this useTracker is ran.

```jsx

// needs Tracker.withComputation because otherwise it would be only called once, and the computation would never run again
const docs = useTracker('name', async (c) => {
    const placeholders = await fetch('https://jsonplaceholder.typicode.com/todos').then(x => x.json());
    console.log(placeholders);
    return await Tracker.withComputation(c, () => LinksCollection.find().fetchAsync());
});

```

A rule of thumb is that if you are using a reactive function for example `find` + `fetchAsync`, it is nice to wrap it
inside `Tracker.withComputation` to make sure that the computation is kept alive, if you are just calling that function
that is not necessary, like the one bellow, will be always reactive.

```jsx

const docs = useTracker('name', () => LinksCollection.find().fetchAsync());

```
