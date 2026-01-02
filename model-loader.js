function parseOBJ(objText) {
  const lines = objText.split('\n')
  const vertices = []
  const edgeSet = new Set()

  for (const line of lines) {
    const trimmed = line.trim()
    
    // Parse vertex lines: "v x y z"
    if (trimmed.startsWith('v ')) {
      const parts = trimmed.split(/\s+/)
      vertices.push({
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
        z: parseFloat(parts[3])
      })
    }
    
    // Parse face lines: "f v1/vt1 v2/vt2 ..." or "f v1 v2 v3"
    if (trimmed.startsWith('f ')) {
      const parts = trimmed.split(/\s+/).slice(1)
      const faceVertices = parts.map(p => {
        // Extract vertex index (before the first /)
        // OBJ indices are 1-based, convert to 0-based
        return parseInt(p.split('/')[0]) - 1
      })
      
      // Create edges from consecutive vertices in the face
      for (let i = 0; i < faceVertices.length; i++) {
        const v1 = faceVertices[i]
        const v2 = faceVertices[(i + 1) % faceVertices.length]
        
        // Store edges with smaller index first to avoid duplicates
        const edgeKey = v1 < v2 ? `${v1},${v2}` : `${v2},${v1}`
        edgeSet.add(edgeKey)
      }
    }
  }
  
  // Convert edge set to array of [v1, v2] pairs
  const edges = Array.from(edgeSet).map(key => {
    const [v1, v2] = key.split(',').map(Number)
    return [v1, v2]
  })

  // Find bounding box
  const boundingBox = vertices.reduce((acc, v) => ({
    minX: Math.min(acc.minX, v.x), maxX: Math.max(acc.maxX, v.x),
    minY: Math.min(acc.minY, v.y), maxY: Math.max(acc.maxY, v.y),
    minZ: Math.min(acc.minZ, v.z), maxZ: Math.max(acc.maxZ, v.z),
  }), { 
    minX: Infinity, maxX: -Infinity, 
    minY: Infinity, maxY: -Infinity, 
    minZ: Infinity, maxZ: -Infinity })
  
  return { vertices, edges, boundingBox }
}

/**
 * Load and parse an OBJ file.
 * @param {string} path - Path to the .obj file
 * @returns {Promise<{vertices: Array<{x: number, y: number, z: number}>, edges: Array<[number, number]>}>}
 */
function loadModel(path) {
  return fetch(path)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status}`)
      }
      return response.text()
    })
    .then(parseOBJ)
}

