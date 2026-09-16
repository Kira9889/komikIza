import { useState } from 'react'
import { BookIcon } from '../icons'

type LogoProps = {
  size?: number
  className?: string
}

export default function Logo({ size = 36, className = '' }: LogoProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className={`grid place-items-center rounded-lg bg-primary-500 text-white ${className}`}
        style={{ width: size, height: size }}
      >
        <BookIcon style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    )
  }

  return (
    <img
      src="/logo.jpg"
      alt="Tenshi.id"
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
