/**
 * حد إعادة تحرير الملصق — تطلقه قائمة السياق على الكانفس لعنصر يحمل
 * `stickerSource`، ويلتقطه ToolbarAddTools (مالك حالة نافذة الاستوديو)
 * فيفتح الاستوديو على العنصر نفسه في وضع إعادة التحرير.
 * (ملف مستقل لالتزام قاعدة react-refresh/only-export-components)
 */
export interface ReeditStickerEventDetail {
  elementId: string;
}

export const REEDIT_STICKER_EVENT = 'grido:reedit-sticker-element';

/** مُطلق مساعد لقائمة السياق */
export const requestStickerReedit = (elementId: string) => {
  window.dispatchEvent(
    new CustomEvent<ReeditStickerEventDetail>(REEDIT_STICKER_EVENT, { detail: { elementId } }),
  );
};
