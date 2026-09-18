import type { JSX } from 'hono/jsx/jsx-runtime';
import { raw } from 'hono/utils/html';
import type { TranslateFn } from '../../locales';

export interface WorkflowInstructionsProps {
  /** Element id — one instructions block per page. */
  id: string;
  /** localStorage key under which the open/closed state is persisted. */
  storageKey: string;
  heading: string;
  steps: string[];
  /** Optional explanatory tip rendered after the step list. */
  tip?: string;
  confirmedNote: string;
  confirmed: boolean;
  /** Out-of-band re-render for status-changing swaps (confirm/reopen). */
  isOob?: boolean;
}

/**
 * Role instructions for the organizer / opponent captain pages: a collapsible
 * "How it works" block describing the postponement workflow, or a single
 * closing note once a date is confirmed. The `open` state is persisted by
 * ui.js (`initPersistedDetails`) under `storageKey`; SSR renders it open.
 */
export function WorkflowInstructions(props: WorkflowInstructionsProps): JSX.Element {
  return (
    <details
      id={props.id}
      class="side-block workflow-instructions"
      data-persist-details={props.storageKey}
      hx-swap-oob={props.isOob ? 'true' : undefined}
      open
    >
      <summary>{props.heading}</summary>
      {props.confirmed
       ? <p class="mt-2">{props.confirmedNote}</p>
       : (
         <>
           <ol class="list mt-2">
             {props.steps.map((step) => <li key={step}>{step}</li>)}
           </ol>
           {/* Locale strings are our own literals, so raw() cannot carry
            user-typed HTML — same as the vote description. */}
           {props.tip ? <p class="mt-2">{raw(props.tip)}</p> : null}
         </>
       )}
    </details>
  );
}

/**
 * The organizer page's instructions block. One definition of the step list is
 * shared by the initial edit page and the OOB re-render that confirm/reopen
 * swaps ship so the block condenses the moment the status changes.
 */
export function OrganizerWorkflowInstructions(props: {
  t: TranslateFn;
  confirmed: boolean;
  /** Optional explanatory tip rendered after the step list. */
  tip?: string;
  isOob?: boolean;
}): JSX.Element {
  return (
    <WorkflowInstructions
      id="organizer-workflow"
      storageKey="postpony-workflow-organizer"
      heading={props.t('workflow_heading')}
      steps={[
        props.t('workflow_organizer_step1'),
        props.t('workflow_organizer_step2'),
        props.t('workflow_organizer_step3'),
        props.t('workflow_organizer_step4'),
        props.t('workflow_organizer_step5'),
      ]}
      tip={props.tip}
      confirmedNote={props.t('workflow_organizer_confirmed')}
      confirmed={props.confirmed}
      isOob={props.isOob}
    />
  );
}
