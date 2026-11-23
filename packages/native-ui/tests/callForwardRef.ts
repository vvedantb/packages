// A `forwardRef` component is an object, not a function. Tests that call a part
// as a plain function outside a renderer call its `render` instead, which takes
// the props and the ref.
type ForwardRefParts<P> = { render: (props: P, ref: unknown) => unknown };

export function callForwardRef<P>(component: unknown, props: P, ref: unknown = null): unknown {
  return (component as ForwardRefParts<P>).render(props, ref);
}
