import type { JSX } from 'hono/jsx/jsx-runtime';

export interface ErrorContainerProps {
  globalError?: string;
  isOob?: boolean;
}

export function ErrorContainer(props: ErrorContainerProps): JSX.Element {
  return (
    <div id="error-container" hx-swap-oob={props.isOob ? 'true' : undefined}>
      {props.globalError ? (
        <div class="error padding white-text" role="alert">
          <i aria-hidden="true">error</i>
          <div class="max">
            <p>{props.globalError}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
