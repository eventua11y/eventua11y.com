import type { CustomElements } from '@awesome.me/webawesome/dist/custom-elements-jsx.d.ts';
import type { EmitFn, HTMLAttributes, PublicProps } from 'vue';

type ListenerKeys<Props> = {
  [Key in keyof Props]-?: Key extends `on${string}`
    ? NonNullable<Props[Key]> extends (event: never) => void
      ? Key
      : never
    : never;
}[keyof Props];

type ElementProps<Props> = Omit<
  Props,
  | ListenerKeys<Props>
  | 'children'
  | 'className'
  | 'classList'
  | 'htmlFor'
  | 'ref'
  | 'key'
  | 'class'
  | 'style'
>;

// Web Awesome lists native JSX listeners as onClick and component events as onchange or onwa-hide.
type ElementEvents<Props> = {
  [
    Key in ListenerKeys<Props> as Key extends `on${infer Name}`
      ? Name extends Lowercase<Name>
        ? Name
        : never
      : never
  ]-?: NonNullable<Props[Key]>;
};

// shortcut: Adapt the exported JSX types until Web Awesome ships working Vue declarations.
type VueElements = {
  [
    Tag in keyof CustomElements & keyof HTMLElementTagNameMap
  ]: new () => HTMLElementTagNameMap[Tag] & {
    $props: ElementProps<CustomElements[Tag]> &
      Omit<HTMLAttributes, keyof ElementProps<CustomElements[Tag]>> &
      PublicProps;
    $emit: EmitFn<ElementEvents<CustomElements[Tag]>>;
  };
};

declare module 'vue' {
  // Vue augments its registry via interface merging, so this cannot be a type alias.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface GlobalComponents extends VueElements {}
}
