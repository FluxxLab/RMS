import Image from "next/image";

/**
 * The lab mark and the product name, as one unit. The mark is decorative:
 * the name beside it already carries the meaning, so announcing the image
 * again would just repeat it.
 */
export function Wordmark({ appName }: { appName: string }) {
  return (
    <span className="flex shrink-0 items-center gap-3">
      <Image src="/PIC-LOGO-white.png" alt="" width={72} height={72} priority className="size-[72px] shrink-0 object-contain" />
      <span className="whitespace-nowrap text-base font-semibold leading-6">{appName}</span>
    </span>
  );
}
