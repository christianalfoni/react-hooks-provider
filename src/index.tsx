/* eslint-disable */
import * as React from "react";

/**
 * A factory for creating a provider which allows you to register "singleton hooks". Whenever
 * a hook is considered to be a single instance shared between any component in the app, this
 * factory allows you to do so. Every hook gets their own provider, which avoid unnecessary
 * reconciliation for unrelated hooks.
 *
 * // These hooks gets their props through the provider instead of directly to the hook, as
 * // two unrelated components consuming the same hook could pass different arguments, which
 * // makes no sense
 *
 * type Props = { foo: string }
 *
 * const { Provider, registerHook } = createHooksProvider<Props>()
 *
 * const someHook = registerHook(({ foo }) => {
 *   return useState(foo)
 * })
 *
 * // By referencing an existing hook you can derive its returned value, which puts
 * // that value on its own context. For example exposing just the dispatcher of a
 * // reducer to avoid reconciliation when the reducer state changes
 * const someDerivedHook = registerHook(someHook, ([, setFoo]) => setFoo)
 */

// Use to ensure hook passed into "createRegisteredHookConsumer" actually
// takes a registered hook and the context can be used for testing
export const $CONTEXT_PROVIDER = Symbol("$CONTEXT_PROVIDER");

type Hook<T> = (() => any) | ((props: T) => any);

type RegisteredHook<H extends Hook<any>> = (() => ReturnType<H>) & {
  [$CONTEXT_PROVIDER]: React.FC<{ value: ReturnType<H> }>;
};

// ;

export const createHooksProvider = <T extends object>() => {
  const hooks: Array<{
    hook: () => any;
    originHook: Hook<T>;
    context: React.Context<any>;
  }> = [];
  const derivedHooks: Array<{
    hook: Hook<T>;
    deriveCb: (value: any) => any;
    context: React.Context<any>;
  }> = [];

  return {
    Provider: ({ children, ...props }) => {
      const evaluatedHooks = hooks.map(({ originHook, context }) => ({
        hookValue: originHook(props as T),
        context,
      }));
      const evaluatedDerivedHooks = derivedHooks.map(
        ({ hook, context, deriveCb }) => {
          return {
            hookValue: deriveCb(
              evaluatedHooks[
                hooks.findIndex(
                  (registeredHook) => registeredHook.hook === hook
                )
              ].hookValue
            ),
            context,
          };
        }
      );

      return evaluatedDerivedHooks
        .concat(evaluatedHooks)
        .reduceRight(
          (aggr, { hookValue, context }) => (
            <context.Provider value={hookValue}>{aggr}</context.Provider>
          ),
          children
        );
    },
    registerHook(originHook, deriveCb) {
      const context = React.createContext<any>(null);
      const hook = () => React.useContext(context);

      if (deriveCb) {
        derivedHooks.push({ hook: originHook, deriveCb, context });
      } else {
        hooks.push({ hook, originHook, context });
      }

      // @ts-ignore
      hook[$CONTEXT_PROVIDER] = context.Provider;

      return hook;
    },
  } as {
    Provider: React.FC<T & { children: React.ReactNode }>;
    registerHook<H extends Hook<T>>(hook: H): RegisteredHook<H>;
    registerHook<H extends Hook<T>, HR>(
      hook: H,
      deriveCb?: (value: ReturnType<H>) => HR
    ): RegisteredHook<(...params: Parameters<Hook<T>>) => HR>;
  };
};

// Allows you to pass a registered hook and consume it as a Consumer
// component
export const createHookConsumer =
  <H extends RegisteredHook<Hook<any>>, T extends React.ReactElement | null>(
    useHook: H
  ) =>
  ({ children }: { children: (hook: ReturnType<H>) => T }) =>
    children(useHook());

export const getHookProvider = <T extends Hook<any>>(hook: RegisteredHook<T>) =>
  hook[$CONTEXT_PROVIDER];
