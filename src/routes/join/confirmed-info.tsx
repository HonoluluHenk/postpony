import type { JSX } from 'hono/jsx/jsx-runtime';
import type { ViewContext } from '../../app';
import { pageLayout } from '../layouts/main';
import type { Team } from './join-utils';

export interface ConfirmedInfoPageProps extends ViewContext {
  title?: string;
  confirmedDateDisplay?: string;
  reopenCount: number;
  sessionId: string;
  team: Team;
  token: string;
  /** Whether the Postponement still has dates open for export (hidden otherwise). */
  hasVotableDates: boolean;
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

      {props.hasVotableDates ? (
        <a
          class="button outline"
          href={`${props.baseUrl}/join/${props.sessionId}/${props.team}/calendar.ics?token=${props.token}`}
          hx-boost="false"
        >
          <i aria-hidden="true">download</i>
          {props.t('export_calendar')}
        </a>
      ) : null}
    </>
  );

  return pageLayout(props, content, title, props.globalError);
}
