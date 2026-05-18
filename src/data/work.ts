/**
 * Work cards rendered in the Work section of the homepage.
 * Each entry mirrors a card in the live jitesht.com index.
 *
 * Thumbnails are imported as Astro `ImageMetadata` so the image pipeline
 * generates AVIF/WebP at multiple widths automatically.
 */

import type { ImageMetadata } from 'astro';

import editFeatureThumb from '../assets/work/edit-feature.png';
import supplierMasterThumb from '../assets/work/supplier-master.png';
import offerRolloutThumb from '../assets/work/offer-rollout.png';
import artxThumb from '../assets/work/artx.png';

export type WorkCard = {
  htmlId: string;
  title: string;
  summary: string;
  tags: readonly string[];
  thumbnail: ImageMetadata;
  thumbnailAlt: string;
  displayNumber: string;
  thumbClass: 'thumb-1' | 'thumb-2' | 'thumb-3' | 'thumb-4';
  href: string;
  external: boolean;
};

export const workCards: readonly WorkCard[] = [
  {
    htmlId: 'project-4',
    title: "When Read-Only Wasn't Good Enough(dataX.ai)",
    summary:
      'Identified and resolved a permission asymmetry in the B2B catalogue that was blocking data quality and AI enrichment.',
    tags: ['EDIT + REVIEW FLOW', 'PERMISSION ASYMMETRY', 'B2B CATALOGUE'],
    thumbnail: editFeatureThumb,
    thumbnailAlt: 'Edit Feature case study hero',
    displayNumber: '01',
    thumbClass: 'thumb-4',
    href: '/work/edit-feature',
    external: false,
  },
  {
    htmlId: 'project-1',
    title: 'Making Data Consolidation Feel Safe (dataX.ai)',
    summary:
      'Designing the Supplier Details, Merge & Split flows for an AI-powered supplier master data platform.',
    tags: ['4-STEP MERGE FLOW', 'AI-POWERED MDM', 'ENTERPRISE GOVERNANCE'],
    thumbnail: supplierMasterThumb,
    thumbnailAlt: 'Supplier Master case study hero',
    displayNumber: '02',
    thumbClass: 'thumb-1',
    href: '/work/supplier-master',
    external: false,
  },
  {
    htmlId: 'project-2',
    title: 'Fixing Offer Approvals',
    summary:
      'End-to-end UX design for the offer rollout process within Vasitum, streamlining complex HR workflows and candidate interactions.',
    tags: ['OFFER APPROVAL FLOW', 'HR TECH SAAS', 'CANDIDATE EXPERIENCE'],
    thumbnail: offerRolloutThumb,
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
    tags: ['ARTIST PROFILES', 'MOBILE UI', 'FIRST PROJECT'],
    thumbnail: artxThumb,
    thumbnailAlt: 'ArtX Artist Bio App Design',
    displayNumber: '',
    thumbClass: 'thumb-3',
    href: 'https://www.behance.net/gallery/184744245/ART-X-The-Artist-bio-app',
    external: true,
  },
];
