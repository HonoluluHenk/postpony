import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../app';
import { pageLayout } from '../layouts/main';

export interface ConfirmedInfoPageProps extends ViewContext {
  title?: string;
  confirmedDateDisplay?: string;
  reopenCount: number;
  globalError?: string;
}

export function ConfirmedInfoPage(props: ConfirmedInfoPageProps): JSX.Element {
  const title = props.title ?? props.t('confirmed_date_title');

  const content = (
    <>
      <header>
        <h2>{title}</h2>
      </header>

      <p>{props.t('confirmed_view_info')}</p>

      <div class="row items-center wrap">
        <p class="chip outline">{props.t('confirmed_date_label')}: {props.confirmedDateDisplay}</p>
        {props.reopenCount > 0 ? (
          <p class="chip outline">{props.t('reopened_count', {count: String(props.reopenCount)})}</p>
        ) : null}
      </div>
    </>
  );

  return pageLayout(props, content, title, props.globalError);
}
