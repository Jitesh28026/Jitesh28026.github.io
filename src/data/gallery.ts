/**
 * Gallery items shown in the two CSS-driven carousel tracks. Each track
 * duplicates its items at render time so the marquee-style loop appears
 * seamless. Add a new item here and Gallery.astro picks it up automatically.
 */

import type { ImageMetadata } from 'astro';

import goldenSkus from '../assets/gallery/golden-skus.png';
import dashboard from '../assets/gallery/dashboard.png';
import productsTable from '../assets/gallery/products-table.png';
import macbookDesktop from '../assets/gallery/macbook-desktop.png';
import pdpScreenConfig from '../assets/gallery/pdp-screen-config.png';
import homepageCatalog from '../assets/gallery/homepage-catalog.png';
import bulkUpload from '../assets/gallery/bulk-upload.png';
import landingPage from '../assets/gallery/landing-page.png';

export type GalleryItem = {
  src: ImageMetadata;
  alt: string;
  title: string;
  tag: string;
  /** Optional inline-style override (object-fit positioning for tall mockups) */
  style?: string;
};

export const galleryTrackLeft: readonly GalleryItem[] = [
  {
    src: goldenSkus,
    alt: 'Golden SKU Product Data Table',
    title: 'Golden SKU Database',
    tag: 'Dense Data Table',
  },
  {
    src: dashboard,
    alt: 'Analytics Dashboard',
    title: 'Analytics Dashboard',
    tag: 'Data Visualization',
  },
  {
    src: productsTable,
    alt: 'Products Table View',
    title: 'Product Catalog Tabular View',
    tag: 'B2B Interfaces',
  },
  {
    src: macbookDesktop,
    alt: 'Full Desktop Layout',
    title: 'Desktop Management Layout',
    tag: 'UI/UX Layouts',
    style: 'object-fit: cover; object-position: top; padding: 0;',
  },
];

export const galleryTrackRight: readonly GalleryItem[] = [
  {
    src: pdpScreenConfig,
    alt: 'Screen config PDP',
    title: 'Product Detail Configuration',
    tag: 'B2B Workflows',
  },
  {
    src: homepageCatalog,
    alt: 'HomePage Catalog',
    title: 'Global Catalog Overview',
    tag: 'Navigation',
  },
  {
    src: bulkUpload,
    alt: 'Bulk Upload Flow',
    title: 'Bulk Upload Flow',
    tag: 'UX Patterns',
  },
  {
    src: landingPage,
    alt: 'Final Landing page',
    title: 'Marketing Landing Page',
    tag: 'Web Design',
    style: 'object-fit: cover; object-position: top; padding: 0;',
  },
];
