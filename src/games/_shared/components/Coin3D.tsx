import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { clsx } from 'clsx'
import { resolveCoinTheme, type CoinThemeId } from '../themes'
import { computeCoinTargetQuaternion } from './geometry3d'

export interface Coin3DProps {
  face: 'heads' | 'tails'
  coinThemeId?: CoinThemeId | string
  flipKey?: string | number
  flipping?: boolean
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  className?: string
}

interface CoinPalette3D {
  headsBg: string
  tailsBg: string
  rimHex: string
  headsFg: string
  tailsFg: string
  metalness: number
  roughness: number
  edgeHex: string
}

const COIN_PALETTES_3D: Record<CoinThemeId, CoinPalette3D> = {
  'classic-yen': {
    headsBg: '#f59e0b',
    tailsBg: '#94a3b8',
    rimHex: '#fcd34d',
    headsFg: '#451a03',
    tailsFg: '#0f172a',
    metalness: 0.88,
    roughness: 0.22,
    edgeHex: '#d97706',
  },
  'momobami-seal': {
    headsBg: '#fbbf24',
    tailsBg: '#1c1917',
    rimHex: '#fef08a',
    headsFg: '#1c1917',
    tailsFg: '#fbbf24',
    metalness: 0.92,
    roughness: 0.16,
    edgeHex: '#b45309',
  },
  'engei-scarlet': {
    headsBg: '#b91c1c',
    tailsBg: '#18181b',
    rimHex: '#f59e0b',
    headsFg: '#fde68a',
    tailsFg: '#fca5a5',
    metalness: 0.72,
    roughness: 0.24,
    edgeHex: '#991b1b',
  },
  'railgun-coin': {
    headsBg: '#0284c7',
    tailsBg: '#ea580c',
    rimHex: '#67e8f9',
    headsFg: '#ecfeff',
    tailsFg: '#fff7ed',
    metalness: 0.84,
    roughness: 0.18,
    edgeHex: '#06b6d4',
  },
  'kinto-railgun-coin': {
    headsBg: '#d97706',
    tailsBg: '#450a0a',
    rimHex: '#facc15',
    headsFg: '#1c1917',
    tailsFg: '#fde047',
    metalness: 0.9,
    roughness: 0.16,
    edgeHex: '#f97316',
  },
  'eclipse-medal': {
    headsBg: '#d97706',
    tailsBg: '#312e81',
    rimHex: '#c4b5fd',
    headsFg: '#1c1917',
    tailsFg: '#e0e7ff',
    metalness: 0.85,
    roughness: 0.2,
    edgeHex: '#7c3aed',
  },
}

function createCoinFaceTexture(
  symbol: string,
  subLabel: string,
  bgHex: string,
  fgHex: string,
  rimHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const grad = ctx.createRadialGradient(200, 180, 30, 256, 256, 256)
    grad.addColorStop(0, rimHex)
    grad.addColorStop(0.55, bgHex)
    grad.addColorStop(1, '#111115')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)

    // Minted concentric rings
    ctx.strokeStyle = rimHex
    ctx.lineWidth = 14
    ctx.beginPath()
    ctx.arc(256, 256, 232, 0, Math.PI * 2)
    ctx.stroke()

    ctx.lineWidth = 5
    ctx.setLineDash([12, 8])
    ctx.beginPath()
    ctx.arc(256, 256, 198, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = fgHex
    ctx.font = `900 ${symbol.length >= 3 ? 112 : 165}px "Georgia", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(symbol, 256, 235)

    ctx.font = 'bold 34px sans-serif'
    ctx.fillText(subLabel, 256, 355)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

const COIN_SIZES = {
  sm: 100,
  md: 128,
  lg: 164,
}

export function Coin3D({
  face,
  coinThemeId,
  flipKey,
  flipping = false,
  size = 'md',
  interactive = true,
  className,
}: Coin3DProps) {
  const coinTheme = resolveCoinTheme(coinThemeId)
  const palette = COIN_PALETTES_3D[coinTheme.id]
  const pxSize = COIN_SIZES[size]

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hasWebGL, setHasWebGL] = useState(true)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotState, setRotState] = useState({ x: 8, y: 12 })
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 })

  const targetQuatRef = useRef<THREE.Quaternion>(computeCoinTargetQuaternion(face))
  const userOffsetQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion())
  const spinStartRef = useRef<number>(0)
  const spinningRef = useRef<boolean>(false)

  useEffect(() => {
    targetQuatRef.current = computeCoinTargetQuaternion(face)
    userOffsetQuatRef.current.identity()

    if (flipping || flipKey !== undefined) {
      spinningRef.current = true
      spinStartRef.current = performance.now()
      setIsSpinning(true)
      const timer = window.setTimeout(() => {
        spinningRef.current = false
        setIsSpinning(false)
      }, 950)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [face, flipKey, flipping])

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    if (typeof WebGLRenderingContext === 'undefined') {
      setHasWebGL(false)
      return
    }

    let renderer: THREE.WebGLRenderer | null = null
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setHasWebGL(false)
      return
    }

    setHasWebGL(true)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(pxSize, pxSize)
    host.innerHTML = ''
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50)
    camera.position.set(0, 0, 4.9)

    scene.add(new THREE.AmbientLight('#ffffff', 1.1))
    const keyLight = new THREE.DirectionalLight('#fffbeb', 2.4)
    keyLight.position.set(3, 4, 5)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(palette.rimHex, 2.8, 12)
    rimLight.position.set(-2.5, -2, 3.5)
    scene.add(rimLight)

    const cylGeo = new THREE.CylinderGeometry(1.16, 1.16, 0.16, 64)
    const rimGeo = new THREE.TorusGeometry(1.16, 0.06, 16, 64)
    rimGeo.rotateX(Math.PI / 2)

    const texHeads = createCoinFaceTexture(
      coinTheme.headsSymbol,
      'FACE · HEADS',
      palette.headsBg,
      palette.headsFg,
      palette.rimHex,
    )
    const texTails = createCoinFaceTexture(
      coinTheme.tailsSymbol,
      'PILE · TAILS',
      palette.tailsBg,
      palette.tailsFg,
      palette.rimHex,
    )

    const edgeMat = new THREE.MeshStandardMaterial({
      color: palette.edgeHex,
      metalness: palette.metalness,
      roughness: palette.roughness,
    })
    const headsMat = new THREE.MeshStandardMaterial({
      map: texHeads,
      metalness: palette.metalness,
      roughness: palette.roughness,
    })
    const tailsMat = new THREE.MeshStandardMaterial({
      map: texTails,
      metalness: palette.metalness,
      roughness: palette.roughness,
    })

    const coinGroup = new THREE.Group()
    const bodyMesh = new THREE.Mesh(cylGeo, [edgeMat, headsMat, tailsMat])
    const rimMesh = new THREE.Mesh(rimGeo, edgeMat)
    coinGroup.add(bodyMesh, rimMesh)
    scene.add(coinGroup)

    let frameId = 0
    const renderLoop = (now: number) => {
      if (spinningRef.current) {
        const elapsed = Math.min(1, (now - spinStartRef.current) / 920)
        // High toss arc + multi-axis metallic spin before landing onto target face
        coinGroup.position.set(0, Math.sin(elapsed * Math.PI) * 0.95, Math.sin(elapsed * Math.PI) * 0.65)
        if (elapsed < 0.72) {
          coinGroup.rotation.x += 0.42
          coinGroup.rotation.y += 0.16
        } else {
          coinGroup.quaternion.slerp(targetQuatRef.current, 0.28)
        }
      } else {
        coinGroup.position.lerp(new THREE.Vector3(0, 0, 0), 0.25)
        const desired = userOffsetQuatRef.current.clone().multiply(targetQuatRef.current)
        coinGroup.quaternion.slerp(desired, 0.25)
      }

      renderer?.render(scene, camera)
      frameId = window.requestAnimationFrame(renderLoop)
    }

    frameId = window.requestAnimationFrame(renderLoop)

    return () => {
      window.cancelAnimationFrame(frameId)
      cylGeo.dispose()
      rimGeo.dispose()
      edgeMat.dispose()
      headsMat.dispose()
      tailsMat.dispose()
      texHeads.dispose()
      texTails.dispose()
      renderer?.dispose()
      if (host.contains(renderer?.domElement ?? null)) {
        host.innerHTML = ''
      }
    }
  }, [coinTheme.id, coinTheme.headsSymbol, coinTheme.tailsSymbol, palette, pxSize])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    dragRef.current = { active: true, x: e.clientX, y: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current.active) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { active: true, x: e.clientX, y: e.clientY }

    setRotState((prev) => ({
      x: Math.round(prev.x - dy * 0.8),
      y: Math.round(prev.y + dx * 0.8),
    }))

    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.016)
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.016)
    userOffsetQuatRef.current.premultiply(qYaw).premultiply(qPitch)
  }

  const handlePointerUp = () => {
    dragRef.current.active = false
  }

  const isRailgun = coinTheme.id === 'kinto-railgun-coin' || coinTheme.id === 'railgun-coin'
  const faceGradient = face === 'heads' ? coinTheme.headsGradientClass : coinTheme.tailsGradientClass
  const faceSymbol = face === 'heads' ? coinTheme.headsSymbol : coinTheme.tailsSymbol

  return (
    <div
      data-testid="coin-3d-canvas"
      data-coin-theme={coinTheme.id}
      data-coin-face={face}
      data-rotation-x={String(rotState.x)}
      data-rotation-y={String(rotState.y)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ width: pxSize, height: pxSize, touchAction: 'none' }}
      className={clsx(
        'relative flex items-center justify-center rounded-full select-none',
        interactive ? 'cursor-grab active:cursor-grabbing' : '',
        coinTheme.glowClass,
        className,
      )}
    >
      {isSpinning && (
        <span
          aria-hidden="true"
          className={clsx(
            'absolute inset-0 rounded-full border-2 pointer-events-none animate-impact-ring motion-reduce:hidden',
            coinTheme.rimColorClass,
          )}
        />
      )}
      {isRailgun && isSpinning && (
        <span
          aria-hidden="true"
          className="absolute -inset-2 rounded-full border border-dashed border-amber-400/75 pointer-events-none animate-spin motion-reduce:hidden"
        />
      )}

      {/* WebGL Canvas mount */}
      <div ref={containerRef} className={clsx('w-full h-full', !hasWebGL && 'hidden')} />

      {/* JSDOM / Non-WebGL Metallic Coin Fallback */}
      {!hasWebGL && (
        <div
          className={clsx(
            'relative size-[88%] rounded-full border-4 bg-gradient-to-br flex items-center justify-center transition-transform duration-150',
            faceGradient,
            isSpinning && 'animate-coin-flip motion-reduce:animate-none',
          )}
          style={{
            transform: `perspective(600px) rotateX(${rotState.x}deg) rotateY(${rotState.y}deg)`,
          }}
        >
          <div className="size-[78%] rounded-full border-2 border-dashed border-current/45 flex flex-col items-center justify-center bg-white/10">
            <span className="text-2xl font-black leading-none" aria-hidden="true">
              {faceSymbol}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest mt-1">
              {face === 'heads' ? 'Face (Heads)' : 'Pile (Tails)'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
