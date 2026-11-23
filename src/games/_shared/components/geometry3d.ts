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

/**
 * Computes an exact orthonormal basis (tangent = screen-right, bitangent = screen-up, normal = screen-outward)
 * and projects the given planar polygon vertices into distortion-free isotropic [0, 1] UVs centered at visualCenter.
 */
function projectPlanarFacet(
  vertices: THREE.Vector3[],
  normal: THREE.Vector3,
  apexPoint: THREE.Vector3,
  visualCenter: THREE.Vector3,
  uvRadius = 0.42,
): { uvs: Array<[number, number]>; tangent: THREE.Vector3; bitangent: THREE.Vector3 } {
  const n = normal.clone().normalize()
  const rawUp = new THREE.Vector3().subVectors(apexPoint, visualCenter)
  const projectedUp = rawUp.sub(n.clone().multiplyScalar(rawUp.dot(n)))
  const bitangent =
    projectedUp.lengthSq() > 1e-6
      ? projectedUp.normalize()
      : new THREE.Vector3(0, 1, 0)
  const tangent = new THREE.Vector3().crossVectors(bitangent, n).normalize()

  let maxExtent = 1e-4
  const localCoords = vertices.map((v) => {
    const rel = new THREE.Vector3().subVectors(v, visualCenter)
    const x = rel.dot(tangent)
    const y = rel.dot(bitangent)
    maxExtent = Math.max(maxExtent, Math.abs(x), Math.abs(y))
    return [x, y] as const
  })

  const uvScale = uvRadius / maxExtent
  const uvs: Array<[number, number]> = localCoords.map(([x, y]) => [
    Math.min(0.96, Math.max(0.04, 0.5 + x * uvScale)),
    Math.min(0.96, Math.max(0.04, 0.5 + y * uvScale)),
  ])

  return { uvs, tangent, bitangent }
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
    // Mathematical pentagonal trapezohedron (10 coplanar kite facets with isotropic planar UVs)
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

      // Barycenter of the wide zone of the kite (biased away from narrow topApex)
      const visualCenter = new THREE.Vector3()
        .addScaledVector(topApex, 0.24)
        .addScaledVector(p0, 0.28)
        .addScaledVector(p1, 0.20)
        .addScaledVector(p2, 0.28)

      const { uvs: kiteUvs, bitangent } = projectPlanarFacet(
        [topApex, p2, p1, p0],
        n,
        topApex,
        visualCenter,
        0.42,
      )

      pushTri(topApex, p2, p1, kiteUvs[0], kiteUvs[1], kiteUvs[2])
      pushTri(topApex, p1, p0, kiteUvs[0], kiteUvs[2], kiteUvs[3])
      geo.addGroup(vertStart, 6, faces.length)
      vertStart += 6

      const v = topValues[i]
      const label = dieType === 'd10-tens' ? `${v}0` : formatDieValueLabel(v)
      faces.push({
        label,
        value: v,
        normal: n,
        up: bitangent,
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

      // Barycenter of the wide zone of the lower kite
      const visualCenter = new THREE.Vector3()
        .addScaledVector(botApex, 0.24)
        .addScaledVector(p0, 0.28)
        .addScaledVector(p1, 0.20)
        .addScaledVector(p2, 0.28)

      const { uvs: kiteUvs, bitangent } = projectPlanarFacet(
        [botApex, p0, p1, p2],
        n,
        botApex,
        visualCenter,
        0.42,
      )

      pushTri(botApex, p0, p1, kiteUvs[0], kiteUvs[1], kiteUvs[2])
      pushTri(botApex, p1, p2, kiteUvs[0], kiteUvs[2], kiteUvs[3])
      geo.addGroup(vertStart, 6, faces.length)
      vertStart += 6

      const v = botValues[i]
      const label = dieType === 'd10-tens' ? `${v}0` : formatDieValueLabel(v)
      faces.push({
        label,
        value: v,
        normal: n,
        up: bitangent,
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
    // 16-sided octagonal dipyramid (8 upper + 8 lower triangular facets with orthonormal planar UVs)
    const H = 1.18
    const R = 1.16
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

      const center = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3)
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize()
      if (n.dot(center) < 0) n.negate()

      // Barycenter of the wide zone near the base chord
      const visualCenter = new THREE.Vector3()
        .addScaledVector(a, 0.26)
        .addScaledVector(b, 0.37)
        .addScaledVector(c, 0.37)

      const { uvs: triUvs, bitangent } = projectPlanarFacet([a, b, c], n, a, visualCenter, 0.44)
      uvs.push(triUvs[0][0], triUvs[0][1], triUvs[1][0], triUvs[1][1], triUvs[2][0], triUvs[2][1])

      geo.addGroup(vertStart, 3, faces.length)
      faces.push({
        label: formatDieValueLabel(val),
        value: val,
        normal: n,
        up: bitangent,
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
 * Computes the exact rotation quaternion aligning a facet's local orthonormal basis
 * (tangent, bitangent, normal) directly onto screen space (+X, +Y, +Z).
 */
export function alignFaceToCamera(
  normal: THREE.Vector3,
  bitangent: THREE.Vector3,
): THREE.Quaternion {
  const n = normal.clone().normalize()
  const rawB = bitangent.clone().sub(n.clone().multiplyScalar(bitangent.dot(n)))
  const b = rawB.lengthSq() > 1e-6 ? rawB.normalize() : new THREE.Vector3(0, 1, 0)
  const t = new THREE.Vector3().crossVectors(b, n).normalize()
  const rotMat = new THREE.Matrix4().makeBasis(t, b, n).transpose()
  return new THREE.Quaternion().setFromRotationMatrix(rotMat)
}

/**
 * Computes the exact rotation quaternion that places the chosen value's face normal toward +Z
 * and its equilibrium bitangent upright toward +Y.
 */
export function computeTargetDieQuaternion(dieType: DieType, value: number): THREE.Quaternion {
  const { geometry, faces } = buildDieGeometryData(dieType)
  geometry.dispose()

  const fallbackVal = dieType === 'd10' || dieType === 'd10-tens' ? 0 : 1
  const match =
    faces.find((f) => f.value === value) ??
    faces.find((f) => f.value === fallbackVal) ??
    faces[0]

  return alignFaceToCamera(match.normal, match.up)
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
