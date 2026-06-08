import React from 'react';

type IntrinsicTag = keyof React.JSX.IntrinsicElements;

type MotionProps<T extends IntrinsicTag> = React.JSX.IntrinsicElements[T] & {
  initial?: unknown;
  animate?: unknown;
  exit?: unknown;
  transition?: unknown;
  whileHover?: unknown;
  whileTap?: unknown;
  layout?: boolean | string;
};

function createMotionComponent<T extends IntrinsicTag>(tag: T) {
  return React.forwardRef<HTMLElement, MotionProps<T>>(function MotionComponent(props, ref) {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      layout: _layout,
      ...rest
    } = props as MotionProps<T>;

    return React.createElement(tag as string, { ...rest, ref });
  });
}

export const motion = {
  div: createMotionComponent('div'),
  button: createMotionComponent('button'),
  form: createMotionComponent('form'),
  img: createMotionComponent('img'),
  span: createMotionComponent('span'),
  ul: createMotionComponent('ul'),
  li: createMotionComponent('li'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  aside: createMotionComponent('aside'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  nav: createMotionComponent('nav'),
  main: createMotionComponent('main'),
  p: createMotionComponent('p'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  tr: createMotionComponent('tr'),
  td: createMotionComponent('td'),
  th: createMotionComponent('th'),
  table: createMotionComponent('table'),
  input: createMotionComponent('input'),
  textarea: createMotionComponent('textarea'),
  label: createMotionComponent('label'),
  a: createMotionComponent('a'),
};

export function AnimatePresence({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
