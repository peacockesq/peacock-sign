import React from "react";
import { useTranslation } from "react-i18next";

function PrevNext({ pageNumber, allPages, changePage }) {
  const { t } = useTranslation();
  //for go to previous page
  function previousPage() {
    changePage(-1);
  }
  //for go to next page
  function nextPage() {
    changePage(1);
  }

  return (
    <div className="flex items-center justify-center gap-2 min-w-0" aria-label="PDF page navigation">
      <button
        type="button"
        className="op-btn op-btn-neutral op-btn-sm min-h-9 h-9 w-9 min-w-9 p-0 rounded-full font-semibold text-base leading-none shadow-sm"
        disabled={pageNumber <= 1}
        onClick={previousPage}
        aria-label="Previous page"
      >
        <span aria-hidden="true" className="block text-[18px] leading-none -mt-[1px]">‹</span>
      </button>
      <span className="text-sm text-base-content font-semibold whitespace-nowrap min-w-[4.25rem] text-center 2xl:text-[20px]">
        {pageNumber || (allPages ? 1 : "--")} {t("of")} {allPages || "--"}
      </span>
      <button
        type="button"
        className="op-btn op-btn-neutral op-btn-sm min-h-9 h-9 w-9 min-w-9 p-0 rounded-full font-semibold text-base leading-none shadow-sm"
        disabled={pageNumber >= allPages}
        onClick={nextPage}
        aria-label="Next page"
      >
        <span aria-hidden="true" className="block text-[18px] leading-none -mt-[1px]">›</span>
      </button>
    </div>
  );
}

export default PrevNext;
