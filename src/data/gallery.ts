/**
 * Gallery items shown in the two CSS-driven carousel tracks. Each track
 * duplicates its items at render time so the marquee-style loop appears
 * seamless. Add a new item here and Gallery.astro picks it up automatically.
 */

export type GalleryItem = {
  src: string;
  alt: string;
  title: string;
  tag: string;
  /** Optional inline-style override (object-fit positioning for tall mockups) */
  style?: string;
};

export const galleryTrackLeft: readonly GalleryItem[] = [
  {
    src: '/legacy/assets/Golden SKUs.png',
    alt: 'Golden SKU Product Data Table',
    title: 'Golden SKU Database',
    tag: 'Dense Data Table',
  },
  {
    src: '/legacy/assets/Dashboard.png',
    alt: 'Analytics Dashboard',
    title: 'Analytics Dashboard',
    tag: 'Data Visualization',
  },
  {
    src: '/legacy/assets/Products Table view.png',
    alt: 'Products Table View',
    title: 'Product Catalog Tabular View',
    tag: 'B2B Interfaces',
  },
  {
    src: '/legacy/assets/MacBook Air - 19.png',
    alt: 'Full Desktop Layout',
    title: 'Desktop Management Layout',
    tag: 'UI/UX Layouts',
    style: 'object-fit: cover; object-position: top; padding: 0;',
  },
];

export const galleryTrackRight: readonly GalleryItem[] = [
  {
    src: '/legacy/assets/Screen config _ PDP.png',
    alt: 'Screen config PDP',
    title: 'Product Detail Configuration',
    tag: 'B2B Workflows',
  },
  {
    src: '/legacy/assets/03. HomePage (View All Products).png',
    alt: 'HomePage Catalog',
    title: 'Global Catalog Overview',
    tag: 'Navigation',
  },
  {
    src: '/legacy/assets/Upload entires.png',
    alt: 'Bulk Upload Flow',
    title: 'Bulk Upload Flow',
    tag: 'UX Patterns',
  },
  {
    src: '/legacy/assets/Final Landing page.png',
    alt: 'Final Landing page',
    title: 'Marketing Landing Page',
    tag: 'Web Design',
    style: 'object-fit: cover; object-position: top; padding: 0;',
  },
];
