import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { ViewContext } from '../../../app';
import type { Postponement } from '../../../lib/models';
import { pageLayout } from '../../layouts/main';
import { OwnTeamVotes } from './own-team-votes';
import { ProposedDatesSection, type EditPartialsData } from './proposed-dates-section';
import { StatusChip } from './status-chip';
import { TeamSection } from './team-section';
import { VoteTallySection } from './vote-tally-section';

export interface EditPageProps extends ViewContext, EditPartialsData {
  title?: string;
  session: Postponement;
  ownerPassword?: string;
  proposedDateTime?: string;
  globalError?: string;
}

interface InviteLinksProps {
  baseUrl: string;
  session: Postponement;
  t: ViewContext['t'];
}

function InviteLinks(props: InviteLinksProps): JSX.Element {
  const homeLink = `${props.baseUrl}/join/${props.session.id}/home?token=${props.session.invitationPassword}`;
  const awayLink = `${props.baseUrl}/join/${props.session.id}/away?token=${props.session.invitationPassword}`;

  return (
    <div>
      <p>{props.t('invite_link_label')}</p>
      <ul class="list">
        <li class="row items-center gap wrap">
          <a href={homeLink}>{props.t('invite_link_home_label')}</a>
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
          <a href={awayLink}>{props.t('invite_link_away_label')}</a>
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

  const content = (
    <>
      {props.ownerPassword ? (
        <div class="toast primary white-text top" role="alert">
          <i aria-hidden="true">info</i>
          <div class="max">
            <p><strong>{props.t('postponement_created_success')}</strong></p>
            <p>{raw(props.t('owner_password_label'))} <span class="password-display">{props.ownerPassword}</span></p>
            <p>{props.t('save_password_warning')}</p>
          </div>
        </div>
      ) : null}

      <div class="row items-center gap wrap">
        <StatusChip status={props.session.status} t={props.t} />
        {props.ownerPassword ? (
          <a
            class="button outline"
            href={`/create?sessionId=${props.session.id}&ownerPassword=${props.ownerPassword}`}
          >
            {props.t('change_match_details')}
          </a>
        ) : null}
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
            organizerPlayers={props.organizerPlayers}
            ownTeamResults={props.ownTeamResults}
            t={props.t}
            locale={props.locale}
            inputFormat={props.inputFormat}
            proposedDateTime={props.proposedDateTime}
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

  return pageLayout(props, content, title, props.globalError);
}
