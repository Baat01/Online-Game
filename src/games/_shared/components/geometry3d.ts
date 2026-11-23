import * as THREE from 'three'

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd10-tens' | 'd12' | 'd16' | 'd20'

export interface DieFaceSpec {
  label: string
  value: number
  normal: THREE.Vector3
  up: THREE.Vector3
}

export interface DieGeometryData {
  geometry: THREE.BufferGeometry
  faces: DieFaceSpec[]
}

function formatDieValueLabel(val: number): string {
  if (val === 6) return '6.'
  if (val === 9) return '9.'
  return `${val}`
}

function buildTrianglePolyhedronData(raw: THREE.BufferGeometry, dieLabelOffset = 1): DieGeometryData {
  const geometry = raw.index ? raw.toNonIndexed() : raw
  if (raw.index) raw.dispose()

  const posAttr = geometry.getAttribute('position')
  const triCount = Math.floor(posAttr.count / 3)
  const uvs = new Float32Array(posAttr.count * 2)
  const faces: DieFaceSpec[] = []

  geometry.clearGroups()
  for (let f = 0; f < triCount; f++) {
    const i0 = f * 3
    const v0 = new THREE.Vector3().fromBufferAttribute(posAttr, i0)
    const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, i0 + 1)
    const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, i0 + 2)

    const center = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3)
    const normal = new THREE.Vector3()
      .subVectors(v1, v0)
      .cross(new THREE.Vector3().subVectors(v2, v0))
      .normalize()
    if (normal.dot(center) < 0) normal.negate()

    const up = new THREE.Vector3()
      .subVectors(v0, new THREE.Vector3().add(v1).add(v2).multiplyScalar(0.5))
      .normalize()

    uvs[i0 * 2] = 0.5
    uvs[i0 * 2 + 1] = 0.86
    uvs[(i0 + 1) * 2] = 0.14
    uvs[(i0 + 1) * 2 + 1] = 0.2
    uvs[(i0 + 2) * 2] = 0.86
    uvs[(i0 + 2) * 2 + 1] = 0.2

    geometry.addGroup(i0, 3, f)
    const val = f + dieLabelOffset
    faces.push({
      label: formatDieValueLabel(val),
      value: val,
      normal,
      up,
    })
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()
  return { geometry, faces }
}

/**
 * Builds real Three.js polyhedral geometry + exact face normals for d4, d6, d8, d10, d10-tens, d12, d16, and d20.
 */
export function buildDieGeometryData(dieType: DieType): DieGeometryData {
  if (dieType === 'd4') {
    return buildTrianglePolyhedronData(new THREE.TetrahedronGeometry(1.26, 0), 1)
  }

  if (dieType === 'd6') {
    const geometry = new THREE.BoxGeometry(1.36, 1.36, 1.36)
    const faces: DieFaceSpec[] = [
      { label: '3', value: 3, normal: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
      { label: '4', value: 4, normal: new THREE.Vector3(-1, 0, 0), up: new THREE.Vector3(0, 1, 0) },
      { label: '5', value: 5, normal: new THREE.Vector3(0, 1, 0), up: new THREE.Vector3(0, 0, -1) },
      { label: '2', value: 2, normal: new THREE.Vector3(0, -1, 0), up: new THREE.Vector3(0, 0, 1) },
      { label: '1', value: 1, normal: new THREE.Vector3(0, 0, 1), up: new THREE.Vector3(0, 1, 0) },
      { label: '6.', value: 6, normal: new THREE.Vector3(0, 0, -1), up: new THREE.Vector3(0, 1, 0) },
    ]
    return { geometry, faces }
  }

  if (dieType === 'd8') {
    return buildTrianglePolyhedronData(new THREE.OctahedronGeometry(1.24, 0), 1)
  }

  if (dieType === 'd10' || dieType === 'd10-tens') {
    // Mathematical pentagonal trapezohedron (10 coplanar kite facets)
    const H = 1.28
    const R = 1.08
    const cos36 = Math.cos(Math.PI / 5)
    const zEq = H * ((1 - cos36) / (1 + cos36))

    const topApex = new THREE.Vector3(0, H, 0)
    const botApex = new THREE.Vector3(0, -H, 0)
    const ring: THREE.Vector3[] = []
    for (let k = 0; k < 10; k++) {
      const theta = (k * 2 * Math.PI) / 10
      const y = (k % 2 === 0 ? 1 : -1) * zEq
      ring.push(new THREE.Vector3(R * Math.cos(theta), y, R * Math.sin(theta)))
    }

    const positions: number[] = []
    const uvs: number[] = []
    const faces: DieFaceSpec[] = []
    const geo = new THREE.BufferGeometry()

    const pushTri = (
      a: THREE.Vector3,
      b: THREE.Vector3,
      c: THREE.Vector3,
      uva: [number, number],
      uvb: [number, number],
      uvc: [number, number],
    ) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
      uvs.push(uva[0], uva[1], uvb[0], uvb[1], uvc[0], uvc[1])
    }

    const topValues = [0, 2, 4, 6, 8]
    const botValues = [1, 3, 5, 7, 9]

    let vertStart = 0
    for (let i = 0; i < 5; i++) {
      const p0 = ring[(i * 2) % 10]
      const p1 = ring[(i * 2 + 1) % 10]
      const p2 = ring[(i * 2 + 2) % 10]

      const center = new THREE.Vector3().add(topApex).add(p0).add(p1).add(p2).divideScalar(4)
      const n = new THREE.Vector3()
        .subVectors(p2, topApex)
        .cross(new THREE.Vector3().subVectors(p1, topApex))
        .normalize()
      if (n.dot(center) < 0) n.negate()

      pushTri(topApex, p2, p1, [0.5, 0.94], [0.1, 0.44], [0.5, 0.08])
      pushTri(topApex, p1, p0, [0.5, 0.94], [0.5, 0.08], [0.9, 0.44])
      geo.addGroup(vertStart, 6, faces.length)
      vertStart += 6

      const v = topValues[i]
      const label = dieType === 'd10-tens' ? `${v}0` : formatDieValueLabel(v)
      faces.push({
        label,
        value: v,
        normal: n,
        up: new THREE.Vector3().subVectors(topApex, p1).normalize(),
      })
    }

    for (let i = 0; i < 5; i++) {
      const p0 = ring[(i * 2 + 1) % 10]
      const p1 = ring[(i * 2 + 2) % 10]
      const p2 = ring[(i * 2 + 3) % 10]

      const center = new THREE.Vector3().add(botApex).add(p0).add(p1).add(p2).divideScalar(4)
      const n = new THREE.Vector3()
        .subVectors(p0, botApex)
        .cross(new THREE.Vector3().subVectors(p1, botApex))
        .normalize()
      if (n.dot(center) < 0) n.negate()

      pushTri(botApex, p0, p1, [0.5, 0.94], [0.1, 0.44], [0.5, 0.08])
      pushTri(botApex, p1, p2, [0.5, 0.94], [0.5, 0.08], [0.9, 0.44])
      geo.addGroup(vertStart, 6, faces.length)
      vertStart += 6

      const v = botValues[i]
      const label = dieType === 'd10-tens' ? `${v}0` : formatDieValueLabel(v)
      faces.push({
        label,
        value: v,
        normal: n,
        up: new THREE.Vector3().subVectors(botApex, p1).normalize(),
      })
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.computeVertexNormals()
    return { geometry: geo, faces }
  }

  if (dieType === 'd12') {
    const raw = new THREE.DodecahedronGeometry(1.22, 0)
    const geometry = raw.index ? raw.toNonIndexed() : raw
    if (raw.index) raw.dispose()

    const posAttr = geometry.getAttribute('position')
    const uvs = new Float32Array(posAttr.count * 2)
    const faces: DieFaceSpec[] = []
    const vertsPerFace = 9
    const faceCount = Math.floor(posAttr.count / vertsPerFace)

    geometry.clearGroups()
    for (let f = 0; f < faceCount; f++) {
      const start = f * vertsPerFace
      const center = new THREE.Vector3()
      const verts: THREE.Vector3[] = []
      for (let k = 0; k < vertsPerFace; k++) {
        const v = new THREE.Vector3().fromBufferAttribute(posAttr, start + k)
        verts.push(v)
        center.add(v)
      }
      center.divideScalar(vertsPerFace)

      const normal = new THREE.Vector3()
        .subVectors(verts[1], verts[0])
        .cross(new THREE.Vector3().subVectors(verts[2], verts[0]))
        .normalize()
      if (normal.dot(center) < 0) normal.negate()

      const worldUp = new THREE.Vector3(0, 1, 0)
      const projected = worldUp.clone().sub(normal.clone().multiplyScalar(worldUp.dot(normal)))
      const up =
        projected.lengthSq() > 1e-4
          ? projected.normalize()
          : new THREE.Vector3().subVectors(verts[0], center).normalize()
      const right = new THREE.Vector3().crossVectors(up, normal).normalize()

      let maxR = 1e-4
      for (const v of verts) {
        maxR = Math.max(maxR, v.distanceTo(center))
      }

      for (let k = 0; k < vertsPerFace; k++) {
        const d = new THREE.Vector3().subVectors(verts[k], center)
        const u = Math.min(0.95, Math.max(0.05, 0.5 + 0.42 * (d.dot(right) / maxR)))
        const vCoord = Math.min(0.95, Math.max(0.05, 0.5 + 0.42 * (d.dot(up) / maxR)))
        uvs[(start + k) * 2] = u
        uvs[(start + k) * 2 + 1] = vCoord
      }

      geometry.addGroup(start, vertsPerFace, f)
      const val = f + 1
      faces.push({
        label: formatDieValueLabel(val),
        value: val,
        normal,
        up,
      })
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.computeVertexNormals()
    return { geometry, faces }
  }

  if (dieType === 'd16') {
    // 16-sided octagonal dipyramid (8 upper + 8 lower triangular facets)
    const H = 1.34
    const R = 1.08
    const topApex = new THREE.Vector3(0, H, 0)
    const botApex = new THREE.Vector3(0, -H, 0)
    const ring: THREE.Vector3[] = []
    for (let k = 0; k < 8; k++) {
      const theta = (k * 2 * Math.PI) / 8
      ring.push(new THREE.Vector3(R * Math.cos(theta), 0, R * Math.sin(theta)))
    }

    const positions: number[] = []
    const uvs: number[] = []
    const faces: DieFaceSpec[] = []
    const geo = new THREE.BufferGeometry()

    const pushFace = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, val: number) => {
      const vertStart = positions.length / 3
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
      uvs.push(0.5, 0.88, 0.14, 0.18, 0.86, 0.18)

      const center = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3)
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize()
      if (n.dot(center) < 0) n.negate()
      const up = new THREE.Vector3().subVectors(a, new THREE.Vector3().add(b).add(c).multiplyScalar(0.5)).normalize()

      geo.addGroup(vertStart, 3, faces.length)
      faces.push({
        label: formatDieValueLabel(val),
        value: val,
        normal: n,
        up,
      })
    }

    for (let k = 0; k < 8; k++) {
      const next = (k + 1) % 8
      pushFace(topApex, ring[next], ring[k], k * 2 + 1)
    }
    for (let k = 0; k < 8; k++) {
      const next = (k + 1) % 8
      pushFace(botApex, ring[k], ring[next], k * 2 + 2)
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.computeVertexNormals()
    return { geometry: geo, faces }
  }

  // d20: 20-sided Icosahedron
  return buildTrianglePolyhedronData(new THREE.IcosahedronGeometry(1.18, 0), 1)
}

/**
 * Computes the exact rotation quaternion that places the chosen value's face normal toward +Z.
 */
export function computeTargetDieQuaternion(dieType: DieType, value: number): THREE.Quaternion {
  const { geometry, faces } = buildDieGeometryData(dieType)
  geometry.dispose()

  const fallbackVal = dieType === 'd10' || dieType === 'd10-tens' ? 0 : 1
  const match =
    faces.find((f) => f.value === value) ??
    faces.find((f) => f.value === fallbackVal) ??
    faces[0]

  const zForward = new THREE.Vector3(0, 0, 1)
  const qAlign = new THREE.Quaternion().setFromUnitVectors(match.normal.clone().normalize(), zForward)

  const rotatedUp = match.up.clone().applyQuaternion(qAlign)
  rotatedUp.z = 0
  if (rotatedUp.lengthSq() > 1e-4) {
    rotatedUp.normalize()
    const angle = Math.atan2(rotatedUp.x, rotatedUp.y)
    const qTwist = new THREE.Quaternion().setFromAxisAngle(zForward, angle)
    qAlign.premultiply(qTwist)
  }
  return qAlign
}

/**
 * Computes the exact rotation quaternion aligning the coin's Heads (+Y) or Tails (-Y) face toward +Z.
 */
export function computeCoinTargetQuaternion(face: 'heads' | 'tails'): THREE.Quaternion {
  const euler =
    face === 'heads'
      ? new THREE.Euler(Math.PI / 2, 0, 0)
      : new THREE.Euler(-Math.PI / 2, 0, 0)
  return new THREE.Quaternion().setFromEuler(euler)
}
