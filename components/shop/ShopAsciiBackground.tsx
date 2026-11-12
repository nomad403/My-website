"use client"

import {useCallback, useState} from "react"
import dynamic from "next/dynamic"
import AsciiGpuOverlay from "@/components/ascii/AsciiGpuOverlay"
import type {AsciiGpuSource} from "@/lib/ascii/ascii-gpu-pass"
import {useViewportSize} from "@/hooks/useViewportSize"
import {usePerformanceProfile} from "@/hooks/usePerformanceProfile"
import {resolveAsciiSettings} from "@/lib/ui/performance"
import {getPageConfig} from "@/lib/home/page-config"

const SpheresPacking = dynamic(() => import("@/components/ascii/SpheresPacking"), {ssr:false})
const AsciiOverlay = dynamic(() => import("@/components/ascii/AsciiOverlay"), {ssr:false})

export default function ShopAsciiBackground() {
  const {profile} = usePerformanceProfile()
  const viewport = useViewportSize()
  const [canvas,setCanvas] = useState<HTMLCanvasElement|null>(null)
  const [source,setSource] = useState<AsciiGpuSource|null>(null)
  const [ready,setReady] = useState(false)
  const [failed,setFailed] = useState(false)
  const onError = useCallback(() => {
    if(source) source.three.render = source.renderOriginal
    setFailed(true)
    setReady(false)
  },[source])
  if(!profile) return null
  const config = getPageConfig("home").ascii
  const settings = resolveAsciiSettings(config,profile,viewport)
  return <>
    <SpheresPacking currentPage="home" count={profile.spheres.count} renderQuality={profile.spheres} onCanvasReady={setCanvas} onGpuReady={setSource} gpuAsciiVisible={ready} />
    {source && !failed && <AsciiGpuOverlay source={source} onReady={setReady} onError={onError} visible mode={settings.mode} invert={config.invert} opacity={config.opacity} color={config.color} fontPx={settings.fontPx} />}
    {failed && <AsciiOverlay source={canvas} pageKey="shop" visible mode={settings.mode} invert={config.invert} opacity={config.opacity} color={config.color} fontPx={settings.fontPx} fps={settings.fps} domUpdateEvery={settings.domUpdateEvery} />}
  </>
}
