// Tailwind class lists that many components share. Change a look here and it changes everywhere.
//
//   <button className={ui.btnPrimary}>Save</button>
//   <input className={ui.input} />
//   <div className={cx(ui.card, 'p-4')}>   // add or override classes with cx()
import { twMerge } from 'tailwind-merge'

/**
 * Joins class names, skipping empty ones: cx('a', isOpen && 'b').
 * When two classes set the same thing (e.g. p-7 and p-0), the LAST one wins, so
 * cx(ui.card, 'p-0') really removes the card padding.
 */
export const cx = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(' '))

const btn =
  'inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const linkButton =
  'cursor-pointer border-0 bg-transparent p-0 text-[0.85rem] font-semibold hover:enabled:underline disabled:cursor-not-allowed disabled:text-muted'

export const ui = {
  // ---- Layout ----
  page: 'flex min-w-0 flex-1 flex-col gap-5.5 px-9 py-8 max-md:px-4 max-md:py-5.5',
  card: 'w-full rounded-[10px] border border-line bg-surface p-7 max-sm:p-5',
  section: 'flex flex-col gap-3.5',
  sectionHead: 'flex flex-wrap items-start justify-between gap-4',

  // ---- Text ----
  h1: 'mb-1 text-[1.6rem] font-bold tracking-tight text-heading',
  h2: 'text-[1.1rem] font-bold text-heading',
  h3: 'mb-3.5 text-base font-bold text-heading',
  subtitle: 'text-muted',
  hint: 'text-[0.85rem] text-muted',
  small: 'text-[0.82rem]',
  backLink: 'text-[0.88rem] font-semibold text-accent no-underline hover:underline',
  rowLink: 'inline-flex items-center gap-2.5 text-heading no-underline hover:text-accent hover:underline',

  // ---- Buttons ----
  btnPrimary: cx(btn, 'border-transparent bg-side px-4 py-2.5 text-white hover:enabled:bg-black dark:bg-lime dark:text-ink dark:hover:enabled:bg-lime-light'),
  btnGhost: cx(btn, 'border-line bg-surface px-3.5 py-1.75 text-[0.88rem] text-heading hover:border-muted'),
  btnDanger: cx(btn, 'border-transparent bg-danger px-4 py-2.5 text-white'),
  link: cx(linkButton, 'text-accent'),
  linkDanger: cx(linkButton, 'text-danger'),

  // ---- Forms ----
  form: 'flex flex-col gap-4',
  // Forms use the full width of the page. '@container' lets the grids below count the FORM's width
  // (not the screen's), so the number of columns fits the space the form really has.
  formCard:
    '@container mx-auto flex w-full max-w-7xl flex-col gap-4 rounded-[10px] border border-line bg-surface p-6 max-sm:p-4',
  // 1 column on phones, then 2, 3, and 4 as the form gets wider
  formGrid: 'grid grid-cols-1 gap-x-4 gap-y-3.5 @sm:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4',
  formGrid3: 'grid grid-cols-1 gap-x-4 gap-y-3.5 @sm:grid-cols-2 @2xl:grid-cols-3',
  /** A row of buttons and short fields that wraps on small screens */
  actionRow: 'flex flex-wrap items-end gap-2.5 [&>label]:min-w-50 [&>label]:flex-1',
  /** A text field that grows to fill a row */
  rowInput:
    'min-w-45 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 font-normal text-heading outline-none focus:border-accent focus:ring-3 focus:ring-accent/20',
  formActions: 'mt-2 flex flex-wrap items-center justify-end gap-2.5',
  legend: 'mb-3 text-[0.78rem] font-bold tracking-wider text-muted uppercase',
  label: 'flex flex-col gap-1.5 text-[0.88rem] font-semibold text-heading',
  /** A label with its input beside it on one line (e.g. 'Acting as [select]') */
  inlineLabel: 'flex items-center gap-2 text-[0.88rem] font-semibold whitespace-nowrap text-heading',
  checkboxLabel: 'flex cursor-pointer items-start gap-2 text-[0.88rem] font-medium text-heading',
  checkbox: 'mt-0.75 accent-accent',
  input:
    'w-full rounded-lg border border-line bg-surface px-3 py-2 font-normal text-heading outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-70',
  inputAuto:
    'w-auto rounded-lg border border-line bg-surface px-3 py-2.5 font-normal text-heading outline-none focus:border-accent focus:ring-3 focus:ring-accent/20',
  inputSmall:
    'rounded-lg border border-line bg-surface px-2 py-1.5 font-normal text-heading outline-none focus:border-accent focus:ring-3 focus:ring-accent/20',

  // ---- Messages ----
  alertError: 'rounded-lg bg-danger-soft px-3 py-2.5 text-[0.9rem] whitespace-pre-line text-danger',
  alertInfo: 'rounded-lg bg-info-soft px-3 py-2.5 text-[0.9rem] text-info [&_a]:font-bold [&_a]:underline',
  alertWarn: 'rounded-lg bg-warn-soft px-3 py-2.5 text-[0.9rem] text-warn [&_a]:font-bold [&_a]:underline',

  // ---- Tables ----
  tableWrap: 'w-full overflow-x-auto rounded-[10px] border border-line bg-surface',
  table:
    'w-full border-collapse text-[0.9rem] [&_tbody>tr:hover]:bg-page [&_tbody>tr:last-child>td]:border-b-0',
  th: 'border-b border-line px-4.5 py-3.25 text-left text-[0.75rem] font-semibold whitespace-nowrap text-muted',
  td: 'border-b border-line px-4.5 py-3.25 whitespace-nowrap',
  num: 'text-right tabular-nums',
  strong: 'font-semibold text-heading',
  actions: 'text-right [&>*:not(:first-child)]:ml-3.5', // a table cell with several links
  wrap: 'max-w-90 whitespace-normal',

  // ---- Danger zone (delete business / product) ----
  dangerZone: 'mt-auto w-full rounded-[10px] border border-line bg-surface px-6 py-5.5',
  dangerTitle: 'mb-3.5 text-base font-bold text-danger',
  confirmText: 'mr-auto text-[0.9rem] text-heading',

  // ---- Small bits ----
  avatar: 'grid size-7.5 shrink-0 place-items-center rounded-full bg-chip text-[0.8rem] font-bold text-accent',
  thumb: 'inline-block size-9 shrink-0 rounded-md bg-chip object-cover',
  chip: 'rounded-full bg-chip px-2.5 py-0.75 text-[0.75rem] font-semibold text-body',
}
