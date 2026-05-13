/**
 * Work cards rendered in the Work section of the homepage.
 *
 * Each entry mirrors a card in the live jitesht.com index. Order in this array
 * is the order shown on the page; `displayNumber` is the printed numeral.
 *
 * The Edit Feature and Supplier Master cards link to /legacy/ during the
 * migration. Stages 7.5 and 7.6 swap those to /work/edit-feature and
 * /work/supplier-master once the Astro routes ship.
 */

export type WorkCard = {
  /** DOM id mirrored from the legacy source (analytics + deep-linking) */
  htmlId: string;
  /** Display title */
  title: string;
  /** Short description */
  summary: string;
  /** Filter / category tags shown above the title */
  tags: readonly string[];
  /** Image src (currently legacy path; Stage 9 swaps to imported assets) */
  thumbnail: string;
  /** Alt text */
  thumbnailAlt: string;
  /** Visual numeral printed on the thumbnail (01, 02, …) */
  displayNumber: string;
  /** Decorative gradient class from the legacy theme (thumb-1 … thumb-4) */
  thumbClass: 'thumb-1' | 'thumb-2' | 'thumb-3' | 'thumb-4';
  /** Where the card links to */
  href: string;
  /** True → external link, opens in new tab with rel=noopener */
  external: boolean;
};

export const workCards: readonly WorkCard[] = [
  {
    htmlId: 'project-4',
    title: "When Read-Only Wasn't Good Enough(dataX.ai)",
    summary:
      'Identified and resolved a permission asymmetry in the B2B catalogue that was blocking data quality and AI enrichment.',
    tags: ['B2B', 'CATALOGUE', 'UX PROBLEM'],
    thumbnail: '/legacy/assets/edit feature.png',
    thumbnailAlt: 'Edit Feature case study hero',
    displayNumber: '01',
    thumbClass: 'thumb-4',
    href: '/legacy/edit-feature.html',
    external: false,
  },
  {
    htmlId: 'project-1',
    title: 'Making Data Consolidation Feel Safe (dataX.ai)',
    summary:
      'Designing the Supplier Details, Merge & Split flows for an AI-powered supplier master data platform.',
    tags: ['B2B', 'ENTERPRISE', 'DATA MANAGEMENT'],
    thumbnail: '/legacy/assets/Supplier master (1).png',
    thumbnailAlt: 'Supplier Master case study hero',
    displayNumber: '02',
    thumbClass: 'thumb-1',
    href: '/legacy/supplier-master.html',
    external: false,
  },
  {
    htmlId: 'project-2',
    title: 'Fixing Offer Approvals',
    summary:
      'End-to-end UX design for the offer rollout process within Vasitum, streamlining complex HR workflows and candidate interactions.',
    tags: ['HR Tech', 'B2B', 'Workflow'],
    thumbnail: '/legacy/assets/Offer rollout (3).png',
    thumbnailAlt: 'Vasitum Offer Rollout Design',
    displayNumber: '03',
    thumbClass: 'thumb-2',
    href: 'https://medium.com/@thakker.jitesh04/offer-rollout-at-vasitum-342539f4c8f1',
    external: true,
  },
  {
    htmlId: 'project-3',
    title: 'Designing for Independent Artists',
    summary:
      'My very first design project. A personal exploration of layout, aesthetics, and mobile interactions for an artist biography application.',
    tags: ['Personal', 'App Design', 'UI/UX'],
    thumbnail: '/legacy/assets/Artx (1).png',
    thumbnailAlt: 'ArtX Artist Bio App Design',
    displayNumber: '04',
    thumbClass: 'thumb-3',
    href: 'https://www.behance.net/gallery/184744245/ART-X-The-Artist-bio-app',
    external: true,
  },
];
