import { useEffect } from 'react';
import { Html } from './Html';
import shell from './sections/shell.json';
import header from './sections/header.html?raw';
import breadcrumb from './sections/breadcrumb.html?raw';
import gallery from './sections/gallery.html?raw';
import core from './sections/core.html?raw';
import seller from './sections/seller.html?raw';
import reviews from './sections/reviews.html?raw';
import recos from './sections/recos.html?raw';
import stickyBar from './sections/stickyBar.html?raw';
import footer from './sections/footer.html?raw';
import { wireInteractions } from './interactions';
import { CustomerPhotos } from './features/CustomerPhotos';

const reviewSlots = { 'customer-photos': <CustomerPhotos /> };

// Page skeleton mirrors noon's DOM: #catalog-page-container > mainContainer > fullWrappers.
// To build a feature, replace one <Html html={…}/> with a real React component.
export default function App() {
  useEffect(() => wireInteractions(), []);
  return (
    <>
      <Html html={header} />
      <div id="catalog-page-container" className={shell.main}>
        <div className={shell.mainInner}>
          <div className={shell.topWrap}>
            <Html html={breadcrumb} />
            <div className={shell.productWrap}>
              <div className={shell.middle}>
                <div className={shell.primary}>
                  <Html html={gallery} />
                  <Html html={core} />
                </div>
                <Html html={seller} />
              </div>
            </div>
          </div>
          <div className={shell.separator} />
          <div id="sticky-bar-top-visibility-trigger" className={shell.stickyTrigger} />
          <div className={shell.reviewsWrap}>
            <div className={shell.reviewsSeparator} />
            <Html html={reviews} slots={reviewSlots} />
            <div className={shell.reviewsAfter} />
          </div>
          <div className={shell.recosWrap}>
            <Html html={recos} />
          </div>
          <Html html={stickyBar} />
          <Html html={shell.scrollTop} />
        </div>
      </div>
      <Html html={footer} />
    </>
  );
}
