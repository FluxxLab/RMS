import Image from "next/image";

/*
 * What a page shows while it is being fetched.
 *
 * The mark sits on the brand indigo because the only logo asset is the white
 * one — on the light page ground it would be invisible. The disc gives it the
 * background it was drawn for.
 *
 * Two motions, both slow: the mark breathes, and a thin bar travels beneath it.
 * The bar is what says "still working" when the breathing alone could be
 * mistaken for a static graphic, and neither is fast enough to nag on the
 * quick navigations that make up most of them.
 */
export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-6 p-6"
    >
      <span className="flex size-[88px] items-center justify-center rounded-2xl bg-brand motion-safe:animate-pulse">
        <Image
          src="/PIC-LOGO-white.png"
          alt=""
          width={56}
          height={56}
          className="size-14 object-contain"
        />
      </span>

      {/* The track is the tint of the same hue, so the bar reads as one object. */}
      <span aria-hidden="true" className="h-1 w-40 overflow-hidden rounded-full bg-brand-tint">
        <span className="block h-full w-1/3 rounded-full bg-brand motion-safe:animate-loader-sweep" />
      </span>

      <span className="sr-only">{label}</span>
    </div>
  );
}
