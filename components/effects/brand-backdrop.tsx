import Image from "next/image"

export function BrandBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_14%_42%,rgba(16,185,129,0.10),transparent_28%),radial-gradient(circle_at_86%_56%,rgba(59,130,246,0.09),transparent_30%)]" />

      <div className="absolute left-1/2 top-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full border border-primary/15 opacity-70 sm:h-[48rem] sm:w-[48rem]" />
      <div className="absolute left-1/2 top-24 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full border border-primary/10 opacity-60 sm:h-[38rem] sm:w-[38rem]" />
      <div className="absolute left-1/2 top-40 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full border border-primary/10 opacity-50 sm:h-[28rem] sm:w-[28rem]" />

      <div className="absolute left-1/2 top-20 h-[28rem] w-[28rem] -translate-x-1/2 opacity-[0.075] blur-[0.2px] sm:h-[44rem] sm:w-[44rem] lg:top-10 lg:h-[58rem] lg:w-[58rem]">
        <Image
          src="/images/narcoguard-logo.png"
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 28rem, (max-width: 1024px) 44rem, 58rem"
          className="object-contain drop-shadow-[0_0_60px_rgba(34,197,94,0.28)]"
        />
      </div>

      <div className="absolute -left-28 top-[28rem] h-96 w-96 rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none" />
      <div className="absolute -right-32 top-[42rem] h-[30rem] w-[30rem] rounded-full bg-cyan-400/5 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none" />

      <div className="absolute inset-x-0 top-0 h-[70rem] opacity-20 [background-image:linear-gradient(rgba(34,197,94,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.08)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />

      <div className="absolute left-1/2 top-[9rem] h-[1px] w-[80vw] max-w-6xl -translate-x-1/2 bg-linear-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute left-1/2 top-[37rem] h-[1px] w-[64vw] max-w-4xl -translate-x-1/2 bg-linear-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  )
}
