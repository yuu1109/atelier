/** hisho流トースト（上からスライドイン）。App が state を持つ */
export function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <div className="anim-toast-in rounded-full bg-ink px-4 py-2.5 text-[13px] font-bold text-white shadow-float">
        {message}
      </div>
    </div>
  );
}
