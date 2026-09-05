import { HOME_TITLE_WIDTH_RATIO } from "@/lib/home-title-style"

export interface HeaderBandLayout {
  left: number
  width: number
  welcomeWidth: number
}

export function readHeaderBandLayout(
  container: HTMLElement,
  isMobile: boolean,
): HeaderBandLayout | null {
  const logo = document.querySelector<HTMLElement>('[data-header-align="logo"]')
  if (!logo) return null

  const navEnd = document.querySelector<HTMLElement>('[data-header-align="nav-end"]')
  const navEndMobile = document.querySelector<HTMLElement>(
    '[data-header-align="nav-end-mobile"]',
  )
  const endElement = isMobile ? navEndMobile ?? navEnd : navEnd
  if (!endElement) return null

  const containerRect = container.getBoundingClientRect()
  const logoRect = logo.getBoundingClientRect()
  const endRect = endElement.getBoundingClientRect()
  const width = endRect.right - logoRect.left

  if (width <= 0) return null

  return {
    left: logoRect.left - containerRect.left,
    width,
    welcomeWidth: width * HOME_TITLE_WIDTH_RATIO,
  }
}
