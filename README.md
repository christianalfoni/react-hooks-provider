# react-hooks-provider

Share hooks between components

## Install

```sh
npm install react-hooks-provider
```

## Examples

[Example on CodeSandbox](https://codesandbox.io/s/adoring-bhaskara-ibdvks?file=/src/index.tsx)

## How it works

Some hooks are tied to a specific component, but others should share their state between any consuming component. It is quite a ceremony to share hook state between components by creating and exposing the hook on a context. `react-hooks-provider` gives you a single provider with a simple API to expose any hook as a shared hook between components.

Every hook registered with the provider will receive the props passed to the provider, which allows you to configure your hooks for a certain session, environment etc. Each hook will internally get their own context, ensuring optimal reconciliation.

Additional utilities allows you to create a consumer component and mock the hook for testing purposes.

## API

### createHooksProvider

_hooks/index.ts_

```ts
import { createHooksProvider } from "react-hooks-provider";

// Any props passed to the Provider component, which will be
// passed to all registered hooks
type Props = {};

const { registerHook, Provider } = createHooksProvider<Props>();

export { registerHook, Provider };
```

_hooks/useCount.ts_

```ts
import { registerHook } from ".";

export const useCount = registerHook(() => useState(0));

// Derive a value from an existing hook, which ensures the consuming
// component will only reconcile if the derived value has changed
export const useSetCount = registerHook(useCount, [, setCount] => setCount)
```

_components/App.tsx_

```tsx
import { Provider as HooksProvider } from "./hooks";

export const App: React.FC = () => {
  <HooksProvider>
    <Content />
  </HooksProvider>;
};
```

### createHookConsumer

_hooks/useCount.ts_

```ts
import { createHookConsumer } from "react-hooks-provider";
import { registerHook } from ".";

export const useCount = registerHook(() => useState(0));

export const CountConsumer = createHookConsumer(useCount);
```

### getHookProvider

_hooks/useCount.test.ts_

```tsx
import { render, screen } from "@testing-library/react";
import { getHookProvider } from "react-hooks-provider";
import { useCount } from "./useCount";

const MockedCount = getHookProvider(useCount);

test("should show count in heading", () => {
  const setCount = jest.fn();
  const { result } = render(<SomeCountConsumer />, {
    wrapper: ({ children }) => (
      <MockedCount value={[5, setCount]}>{children}</MockedCount>
    ),
  });

  expect(screen.getByRole("heading")).toHaveTextContent("5");
});
```
