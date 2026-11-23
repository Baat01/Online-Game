import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { clsx } from 'clsx'
import { resolveDiceTheme, type DiceThemeId } from '../themes'
import {
  alignFaceToCamera,
  buildDieGeometryData,
  computeTargetDieQuaternion,
  type DieType,
} from './geometry3d'

export interface Dice3DProps {
  dieType: DieType
  value: number | null
  diceThemeId?: DiceThemeId | string
  rollKey?: string | number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  label?: string
  className?: string
}

interface DicePalette3D {
  bodyHex: string
  gradientHex: string
  numeralHex: string
  edgeHex: string
  metalness: number
  roughness: number
  clearcoat: number
  emissiveHex: string
  emissiveIntensity: number
}

const DICE_PALETTES_3D: Record<DiceThemeId, DicePalette3D> = {
  'obsidian-gold': {
    bodyHex: '#15151a',
    gradientHex: '#27231a',
    numeralHex: '#fde047',
    edgeHex: '#eab308',
    metalness: 0.55,
    roughness: 0.25,
    clearcoat: 0.9,
    emissiveHex: '#ca8a04',
    emissiveIntensity: 0.14,
  },
  'crimson-engei': {
    bodyHex: '#5b0b12',
    gradientHex: '#991b1b',
    numeralHex: '#fef3c7',
    edgeHex: '#f59e0b',
    metalness: 0.35,
    roughness: 0.22,
    clearcoat: 1.0,
    emissiveHex: '#dc2626',
    emissiveIntensity: 0.18,
  },
  'ivory-academy': {
    bodyHex: '#f5f0e1',
    gradientHex: '#e7dec8',
    numeralHex: '#292524',
    edgeHex: '#a16207',
    metalness: 0.18,
    roughness: 0.36,
    clearcoat: 0.65,
    emissiveHex: '#000000',
    emissiveIntensity: 0,
  },
  'cyber-tokyo': {
    bodyHex: '#090d16',
    gradientHex: '#0e172a',
    numeralHex: '#22d3ee',
    edgeHex: '#e879f9',
    metalness: 0.5,
    roughness: 0.18,
    clearcoat: 1.0,
    emissiveHex: '#06b6d4',
    emissiveIntensity: 0.28,
  },
  'astral-crystal': {
    bodyHex: '#1e1b4b',
    gradientHex: '#4c1d95',
    numeralHex: '#e0e7ff',
    edgeHex: '#c084fc',
    metalness: 0.42,
    roughness: 0.14,
    clearcoat: 1.0,
    emissiveHex: '#7c3aed',
    emissiveIntensity: 0.26,
  },
  'kinto-gacha-dice': {
    bodyHex: '#0c0a09',
    gradientHex: '#291a06',
    numeralHex: '#fbbf24',
    edgeHex: '#ef4444',
    metalness: 0.72,
    roughness: 0.18,
    clearcoat: 1.0,
    emissiveHex: '#d97706',
    emissiveIntensity: 0.24,
  },
}

function drawDiePolygonFrame(
  ctx: CanvasRenderingContext2D,
  dieType: DieType,
  size: number,
  color: string,
  lineWidth: number,
) {
  const c = size / 2
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()

  if (dieType === 'd6') {
    const pad = size * 0.09
    ctx.strokeRect(pad, pad, size - pad * 2, size - pad * 2)
    return
  }

  if (dieType === 'd12') {
    const r = size * 0.41
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5
      const x = c + r * Math.cos(a)
      const y = c + r * Math.sin(a)
      if (k === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
    return
  }

  if (dieType === 'd10' || dieType === 'd10-tens') {
    ctx.moveTo(c, size * 0.14)
    ctx.lineTo(size * 0.84, size * 0.56)
    ctx.lineTo(c, size * 0.72)
    ctx.lineTo(size * 0.16, size * 0.56)
    ctx.closePath()
    ctx.stroke()
    return
  }

  if (dieType === 'd16') {
    ctx.moveTo(c, size * 0.14)
    ctx.lineTo(size * 0.67, size * 0.67)
    ctx.lineTo(size * 0.33, size * 0.67)
    ctx.closePath()
    ctx.stroke()
    return
  }

  // d4, d8, d20: triangular frame matched to UV coordinates
  ctx.moveTo(c, size * 0.16)
  ctx.lineTo(size * 0.83, size * 0.78)
  ctx.lineTo(size * 0.17, size * 0.78)
  ctx.closePath()
  ctx.stroke()
}

function createDieFaceTexture(
  label: string,
  palette: DicePalette3D,
  isCritical: boolean,
  dieType: DieType,
): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const cx = size / 2
    const cy = size / 2
    const grad = ctx.createRadialGradient(cx, cy, size * 0.06, cx, cy, size * 0.68)
    grad.addColorStop(0, palette.gradientHex)
    grad.addColorStop(0.75, palette.bodyHex)
    grad.addColorStop(1, '#070709')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)

    // Subtle filigree face polygon + inner bevel ring
    ctx.globalAlpha = isCritical ? 0.85 : 0.55
    drawDiePolygonFrame(ctx, dieType, size, isCritical ? '#fde047' : palette.edgeHex, 7)
    if (dieType !== 'd16') {
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2)
      ctx.strokeStyle = palette.edgeHex
      ctx.lineWidth = 3
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    const cleanLabel = label.endsWith('.') ? label.slice(0, -1) : label
    const hasUnderbar = label.endsWith('.')
    let fontSize = cleanLabel.length >= 2 ? 152 : 184
    let textY = size * 0.51

    if (dieType === 'd16') {
      // Sized generously inside the narrower dipyramid width around visualCenter (0.5, 0.5)
      fontSize = cleanLabel.length >= 2 ? 84 : 102
      textY = size * 0.505
    } else if (dieType === 'd10' || dieType === 'd10-tens') {
      fontSize = cleanLabel.length >= 2 ? 116 : 140
      textY = size * 0.505
    } else if (dieType === 'd4' || dieType === 'd8' || dieType === 'd20') {
      fontSize = cleanLabel.length >= 2 ? 116 : 138
      textY = size * 0.56
    }

    ctx.fillStyle = isCritical ? '#fef08a' : palette.numeralHex
    ctx.font = `900 ${fontSize}px "Georgia", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = isCritical ? '#f59e0b' : palette.edgeHex
    ctx.shadowBlur = isCritical ? 22 : 12
    ctx.fillText(cleanLabel, cx, textY)

    if (hasUnderbar) {
      const barW = fontSize * 0.44
      const barH = Math.max(6, Math.round(fontSize * 0.055))
      ctx.fillRect(cx - barW / 2, textY + fontSize * 0.46, barW, barH)
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function formatDieValue(dieType: DieType, val: number | null): string {
  if (val === null || val === undefined) return dieType === 'd10-tens' ? '--' : '-'
  if (dieType === 'd10-tens') return `${val}0`
  return String(val)
}

const CANVAS_SIZES = {
  sm: 96,
  md: 132,
  lg: 172,
}

export function Dice3D({
  dieType,
  value,
  diceThemeId,
  rollKey,
  size = 'md',
  interactive = true,
  label,
  className,
}: Dice3DProps) {
  const theme = resolveDiceTheme(diceThemeId)
  const palette = DICE_PALETTES_3D[theme.id]
  const pxSize = CANVAS_SIZES[size]

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hasWebGL, setHasWebGL] = useState(true)
  const [isRolling, setIsRolling] = useState(false)
  const [rotationState, setRotationState] = useState({ x: 14, y: -18 })
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 })

  // Shared animation refs for Three.js loop
  const targetQuatRef = useRef<THREE.Quaternion>(
    computeTargetDieQuaternion(dieType, value ?? (dieType === 'd10' || dieType === 'd10-tens' ? 0 : 1)),
  )
  const userOffsetQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion())
  const rollStartTimeRef = useRef<number>(0)
  const rollingRef = useRef<boolean>(false)

  useEffect(() => {
    const resolvedVal = value ?? (dieType === 'd10' || dieType === 'd10-tens' ? 0 : 1)
    const targetSpec = buildDieGeometryData(dieType)
    targetSpec.geometry.dispose()
    const matchFace = targetSpec.faces.find((f) => f.value === resolvedVal)
    targetQuatRef.current = matchFace
      ? alignFaceToCamera(matchFace.normal, matchFace.up)
      : computeTargetDieQuaternion(dieType, resolvedVal)
    userOffsetQuatRef.current.identity()

    if (value !== null) {
      rollingRef.current = true
      rollStartTimeRef.current = performance.now()
      setIsRolling(true)
      const t = window.setTimeout(() => {
        rollingRef.current = false
        setIsRolling(false)
      }, 950)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [dieType, value, rollKey])

  // Three.js WebGL setup + render loop
  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    if (typeof WebGLRenderingContext === 'undefined') {
      setHasWebGL(false)
      return
    }

    let renderer: THREE.WebGLRenderer | null = null
    let frameId = 0
    const materials: THREE.Material[] = []
    const textures: THREE.Texture[] = []

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
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
    camera.position.set(0, 0, 4.9)

    // 3-point BG3 lighting + rim glow
    scene.add(new THREE.AmbientLight('#ffffff', 0.95))
    const keyLight = new THREE.DirectionalLight('#fffbeb', 2.2)
    keyLight.position.set(3.2, 4.2, 5)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(palette.edgeHex, 3.0, 14)
    rimLight.position.set(-2.8, -1.8, 3.6)
    scene.add(rimLight)

    const { geometry, faces } = buildDieGeometryData(dieType)
    const criticalVal =
      dieType === 'd20'
        ? 20
        : dieType === 'd16'
          ? 16
          : dieType === 'd12'
            ? 12
            : dieType === 'd8'
              ? 8
              : dieType === 'd6'
                ? 6
                : dieType === 'd4'
                  ? 4
                  : 9
    for (const f of faces) {
      const tex = createDieFaceTexture(f.label, palette, f.value === criticalVal, dieType)
      textures.push(tex)
      const mat = new THREE.MeshPhysicalMaterial({
        map: tex,
        metalness: palette.metalness,
        roughness: palette.roughness,
        clearcoat: palette.clearcoat,
        clearcoatRoughness: 0.14,
        emissive: new THREE.Color(palette.emissiveHex),
        emissiveIntensity: palette.emissiveIntensity,
      })
      materials.push(mat)
    }

    const mesh = new THREE.Mesh(geometry, materials)
    const edgeGeo = new THREE.EdgesGeometry(geometry, 12)
    const edgeMat = new THREE.LineBasicMaterial({ color: palette.edgeHex, transparent: true, opacity: 0.82 })
    const wireframe = new THREE.LineSegments(edgeGeo, edgeMat)
    mesh.add(wireframe)
    scene.add(mesh)

    const renderLoop = (now: number) => {
      if (rollingRef.current) {
        const elapsed = Math.min(1, (now - rollStartTimeRef.current) / 940)
        // Curved launch arc -> upper wall rebound -> bounce onto center divider bar
        let arcX = 0
        let arcY = 0
        let arcZ = 0
        if (elapsed < 0.34) {
          const p = elapsed / 0.34
          arcX = -1.25 * (1 - p) + 0.35 * p
          arcY = 0.85 * Math.sin(p * Math.PI * 0.72)
          arcZ = 0.95 * Math.sin(p * Math.PI)
        } else if (elapsed < 0.84) {
          const p = (elapsed - 0.34) / 0.5
          arcX = 0.35 * (1 - p)
          arcY = Math.abs(Math.sin(p * Math.PI * 2.2)) * (1 - p) * 0.75
          arcZ = Math.sin((1 - p) * Math.PI * 0.5) * 0.55
        }
        mesh.position.set(arcX, arcY, arcZ)

        if (elapsed < 0.7) {
          mesh.rotation.x += 0.32
          mesh.rotation.y += 0.38
          mesh.rotation.z += 0.21
        } else {
          mesh.quaternion.slerp(targetQuatRef.current, 0.3)
        }
      } else {
        mesh.position.lerp(new THREE.Vector3(0, 0, 0), 0.25)
        const desired = userOffsetQuatRef.current.clone().multiply(targetQuatRef.current)
        mesh.quaternion.slerp(desired, 0.24)
      }

      renderer?.render(scene, camera)
      frameId = window.requestAnimationFrame(renderLoop)
    }

    frameId = window.requestAnimationFrame(renderLoop)

    return () => {
      window.cancelAnimationFrame(frameId)
      geometry.dispose()
      edgeGeo.dispose()
      edgeMat.dispose()
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
      renderer?.dispose()
      if (host.contains(renderer?.domElement ?? null)) {
        host.innerHTML = ''
      }
    }
  }, [dieType, diceThemeId, pxSize, palette])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    dragRef.current = { active: true, x: e.clientX, y: e.clientY }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || !dragRef.current.active) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { active: true, x: e.clientX, y: e.clientY }

    setRotationState((prev) => ({
      x: Math.round(prev.x - dy * 0.8),
      y: Math.round(prev.y + dx * 0.8),
    }))

    const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.015)
    const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.015)
    userOffsetQuatRef.current.premultiply(qYaw).premultiply(qPitch)
  }

  const handlePointerUp = () => {
    dragRef.current.active = false
  }

  const displayText = formatDieValue(dieType, value)

  return (
    <div className={clsx('flex flex-col items-center gap-1.5', className)}>
      <div
        data-testid="dice-3d-canvas"
        data-dice-type={dieType}
        data-dice-value={value !== null ? String(value) : ''}
        data-dice-theme={theme.id}
        data-rotation-x={String(rotationState.x)}
        data-rotation-y={String(rotationState.y)}
        aria-label={`${label ?? dieType.toUpperCase()} : ${displayText}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ width: pxSize, height: pxSize, touchAction: 'none' }}
        className={clsx(
          'relative flex items-center justify-center rounded-2xl select-none',
          interactive ? 'cursor-grab active:cursor-grabbing' : '',
          theme.glowColorClass,
        )}
      >
        {isRolling && (
          <span
            aria-hidden="true"
            className={clsx(
              'absolute inset-1 rounded-full border-2 pointer-events-none animate-impact-ring motion-reduce:hidden',
              theme.ringBorderClass,
            )}
          />
        )}

        {/* WebGL mount */}
        <div ref={containerRef} className={clsx('w-full h-full', !hasWebGL && 'hidden')} />

        {/* Graceful SVG/DOM 3D Fallback (active in headless JSDOM tests or when WebGL is unavailable) */}
        {!hasWebGL && (
          <div
            className={clsx(
              'relative flex items-center justify-center w-full h-full transition-transform duration-150',
              isRolling && 'animate-dice-tumble motion-reduce:animate-none',
            )}
            style={{
              transform: `perspective(600px) rotateX(${rotationState.x}deg) rotateY(${rotationState.y}deg)`,
            }}
          >
            <svg viewBox="0 0 100 100" className="w-[84%] h-[84%]" aria-hidden="true">
              {dieType === 'd6' ? (
                <>
                  <rect x="14" y="14" width="72" height="72" rx="14" strokeWidth="3.5" className={theme.tensFillClass} />
                  <rect x="24" y="24" width="52" height="52" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
                </>
              ) : dieType === 'd20' ? (
                <>
                  <polygon points="50,4 92,28 92,72 50,96 8,72 8,28" strokeWidth="3.2" className={theme.tensFillClass} />
                  <polygon points="50,14 82,66 18,66" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.4" />
                </>
              ) : (
                <>
                  <polygon
                    points="50,3 95,38 78,94 22,94 5,38"
                    strokeWidth="3.5"
                    className={dieType === 'd10-tens' ? theme.tensFillClass : theme.unitsFillClass}
                  />
                  <polygon points="50,3 80,44 50,86 20,44" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
                </>
              )}
            </svg>
            <span
              className={clsx(
                'absolute inset-0 flex items-center justify-center font-mono font-extrabold tracking-tight drop-shadow',
                theme.textColorClass,
                size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl',
              )}
            >
              {displayText}
            </span>
          </div>
        )}
      </div>

      {label && (
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">
          {label}
        </span>
      )}
    </div>
  )
}
