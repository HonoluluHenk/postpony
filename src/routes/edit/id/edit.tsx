import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../../app';
import type { Postponement } from '../../../lib/models';
import { matchUpLine } from '../../../lib/postponement';
import { pageLayout } from '../../layouts/main';
import { inviteLinkLabels } from './invite-link-labels';
import { OwnTeamVotes } from './own-team-votes';
import { ProposedDatesSection, type EditPartialsData } from './proposed-dates-section';
import { StatusChip } from './status-chip';
import { TeamSection } from './team-section';
import { VoteTallySection } from './vote-tally-section';

export interface EditPageProps extends ViewContext, EditPartialsData {
  title?: string;
  session: Postponement;
  organizerPassword?: string;
  proposedDateTime?: string;
  globalError?: string;
  fromDate?: string;
  toDate?: string;
  homeTeam?: string;
  guestTeam?: string;
  matchDateTime?: string;
}

interface InviteLinksProps {
  baseUrl: string;
  session: Postponement;
  t: ViewContext['t'];
}

function InviteLinks(props: InviteLinksProps): JSX.Element {
  const homeLink = `${props.baseUrl}/join/${props.session.id}/home?token=${props.session.invitationPassword}`;
  const awayLink = `${props.baseUrl}/join/${props.session.id}/away?token=${props.session.invitationPassword}`;
  const labels = inviteLinkLabels(props.session, props.t);

  return (
    <div>
      <p>{props.t('invite_link_label')}</p>
      <ul class="list">
        <li class="row items-center gap wrap">
          <a href={homeLink}>{labels.home}</a>
          <button
            class="clipboard-btn"
            data-copy={homeLink}
            aria-label={props.t('copy_to_clipboard')}
            type="button"
          >
            <i aria-hidden="true">content_copy</i>
          </button>
        </li>
        <li class="row items-center gap wrap">
          <a href={awayLink}>{labels.away}</a>
          <button
            class="clipboard-btn"
            data-copy={awayLink}
            aria-label={props.t('copy_to_clipboard')}
            type="button"
          >
            <i aria-hidden="true">content_copy</i>
          </button>
        </li>
      </ul>
      <p>{props.t('organizer_join_note')}</p>
    </div>
  );
}

export function EditPage(props: EditPageProps): JSX.Element {
  const title = props.title ?? props.t('app_title');

  const headingTitle = (
    <>
      <span class="heading-row">{props.t('edit_postponement_heading')}</span>
      <span class="heading-row">{matchUpLine(props.session.homeTeam ?? '', props.session.guestTeam ?? '')}</span>
      {props.proposedDateTime ? (
        <span class="heading-row">{props.proposedDateTime}</span>
      ) : null}
    </>
  );

  const content = (
    <>
      {props.organizerPassword ? (
        <div class="toast primary white-text top" role="alert">
          <i aria-hidden="true">info</i>
          <div class="max">
            <p><strong>{props.t('postponement_created_success')}</strong></p>
            <p>{raw(props.t('organizer_password_label'))} <span class="password-display">{props.organizerPassword}</span></p>
            <p>{props.t('save_password_warning')}</p>
          </div>
        </div>
      ) : null}

      <div class="row items-center gap wrap">
        <StatusChip status={props.session.status} t={props.t} />
        <p class="match-summary">
          {props.t('match_summary', {
            home: props.homeTeam ?? '',
            guest: props.guestTeam ?? '',
            datetime: props.matchDateTime ?? '',
          })}
        </p>
      </div>

      <InviteLinks
        baseUrl={props.baseUrl}
        session={props.session}
        t={props.t}
      />

      <div>
        <header>
          <h2>{props.t('scheduling_engine_info')}</h2>
        </header>

        <div id="scheduling-info" class="grid">
          <TeamSection
            sessionId={props.session.id}
            players={props.session.players}
            organizerPlayers={props.organizerPlayers}
            ownTeamResults={props.ownTeamResults}
            t={props.t}
          />
          <ProposedDatesSection
            sessionId={props.session.id}
            status={props.session.status}
            reopenCount={props.session.reopenCount}
            proposedDates={props.proposedDates}
            homeProposedDates={props.homeProposedDates}
            awayProposedDates={props.awayProposedDates}
            clashCheckable={props.clashCheckable}
            venues={props.venues}
            organizerPlayers={props.organizerPlayers}
            ownTeamResults={props.ownTeamResults}
            t={props.t}
            locale={props.locale}
            inputFormat={props.inputFormat}
            proposedDateTime={props.proposedDateTime}
            fromDate={props.fromDate}
            toDate={props.toDate}
          />
        </div>

        <OwnTeamVotes
          organizerPlayers={props.organizerPlayers}
          ownTeamResults={props.ownTeamResults}
          t={props.t}
        />
        <VoteTallySection
          homeProposedDates={props.homeProposedDates}
          awayProposedDates={props.awayProposedDates}
          t={props.t}
        />
      </div>
    </>
  );

  return pageLayout(props, content, title, props.globalError, headingTitle);
}
