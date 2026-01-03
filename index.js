const BACKGROUND = "#111111"
const FOREGROUND = "#4AF626"

const maxDimension = Math.min(document.documentElement.clientWidth, document.documentElement.clientHeight)
scene.width = maxDimension
scene.height = maxDimension
const ctx = scene.getContext("2d")

let model = {
  vertices: [],
  edges: [],
  boundingBox: null,
}
let showBoundingBox = true

function clear() {
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, scene.width, scene.height)
}

function point({x, y, size = 4, color = FOREGROUND}) {
  ctx.fillStyle = color
  // draw with centered origin
  ctx.beginPath()
  ctx.arc(x, y, size/2, 0, Math.PI * 2)
  ctx.fill()
}

function line({p1, p2}, lineWidth = 1, color = FOREGROUND) {
  ctx.beginPath()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
}

// Convert 3d cartesian coordinate space to 2d screen space
function project3DTo2D({x, y, z}) {
  const projected = {
    x: x / z,
    y: y / z,
  }

  // convert to screen space: [-1, 1] to [0, scene.width] and [0, scene.height]
  return {
    x: (projected.x+1) / 2 * scene.width,
    y: (1 - (projected.y+1) / 2)* scene.height,
  }
}

function rotate_xz({x, y, z}, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: x * cos - z * sin,
    y: y,
    z: x * sin + z * cos,
  }
}

function translate({x, y, z}, delta = {x: 0, y: 0, z: 0}) {
  return {
    x: x + delta.x,
    y: y + delta.y,
    z: z + delta.z,
  }
}

const camera_position = {x: 0, y: 0, z: 1}
let angle = 0
let animationId = null
let lastTime = 0
let lastFpsUpdate = 0
let frameCount = 0

function setCameraPosition(x, y, z) {
  camera_position = {x, y, z}
}

function frame(timestamp) {
  // Calculate delta time in seconds
  const deltaTime = (timestamp - lastTime) / 1000
  lastTime = timestamp

  // Update FPS counter every second
  frameCount++
  if (timestamp - lastFpsUpdate >= 1000) {
    document.getElementById('fps-count').textContent = frameCount
    frameCount = 0
    lastFpsUpdate = timestamp
  }

  angle += (deltaTime * Math.PI / 2)
  angle %= Math.PI * 2 // wrap around

  function animatedProjection(vertex) {
    // Apply animations to 3d coordinate and project to html canvas coordinate space
    return project3DTo2D(translate(rotate_xz(vertex, angle), camera_position))
  }

  clear()
  for (const edge of model.edges) {
    const p1 = animatedProjection(model.vertices[edge[0]])
    const p2 = animatedProjection(model.vertices[edge[1]])

    line({p1, p2})
  }
  for (const vertex of model.vertices) {
    point(animatedProjection(vertex))
  }
  if (showBoundingBox && model.boundingBox) {
    const { minX, maxX, minY, maxY, minZ, maxZ } = model.boundingBox
    const corners = [
      {x: minX, y: maxY, z: minZ}, // front-top-left
      {x: maxX, y: maxY, z: minZ}, // front-top-right
      {x: maxX, y: minY, z: minZ}, // front-bottom-right
      {x: minX, y: minY, z: minZ}, // front-bottom-left
      {x: minX, y: maxY, z: maxZ}, // back-top-left
      {x: maxX, y: maxY, z: maxZ}, // back-top-right
      {x: maxX, y: minY, z: maxZ}, // back-bottom-right
      {x: minX, y: minY, z: maxZ}, // back-bottom-left
    ]
    const boxEdges = [
      [0,1], [1,2], [2,3], [3,0], // front face
      [4,5], [5,6], [6,7], [7,4], // back face
      [0,4], [1,5], [2,6], [3,7], // connecting edges
    ]
    for (const [i, j] of boxEdges) {
      const p1 = animatedProjection(corners[i])
      const p2 = animatedProjection(corners[j])
      line({p1, p2}, 1, '#FF6B6B')
    }
  }

  animationId = requestAnimationFrame(frame)
}

async function onModelSelect(modelSrc) {  
  // Update button styles
  const buttons = document.querySelectorAll('#model-selector button')
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.model === modelSrc)
    if (btn.dataset.model === modelSrc) {
      const attribution = document.getElementById('model-attribution')
      attribution.href = btn.dataset.source
      attribution.innerHTML = `Model by <span>${btn.dataset.author}</span>`
    }
  })
  
  cancelAnimationFrame(animationId)
  model = await loadModel(modelSrc)
  
  // Center model based on its bounding box
  const center = {
    x: (model.boundingBox.minX + model.boundingBox.maxX) / 2,
    y: (model.boundingBox.minY + model.boundingBox.maxY) / 2,
    z: (model.boundingBox.minZ + model.boundingBox.maxZ) / 2,
  }
  model.vertices = model.vertices.map(v => ({
    x: v.x - center.x,
    y: v.y - center.y,
    z: v.z - center.z,
  }))
  model.boundingBox = {
    minX: model.boundingBox.minX - center.x,
    maxX: model.boundingBox.maxX - center.x,
    minY: model.boundingBox.minY - center.y,
    maxY: model.boundingBox.maxY - center.y,
    minZ: model.boundingBox.minZ - center.z,
    maxZ: model.boundingBox.maxZ - center.z,
  }

  // Update camera to be able to view entire model. Calculate how far points swing in xz during rotation
  const radiusXZ = Math.sqrt(
    Math.max(model.boundingBox.maxX ** 2, model.boundingBox.minX ** 2) +
    Math.max(model.boundingBox.maxZ ** 2, model.boundingBox.minZ ** 2)
  )
  // Position camera so model fills viewport even at closest rotation point
  const maxExtentY = Math.max(Math.abs(model.boundingBox.maxY), Math.abs(model.boundingBox.minY))
  camera_position.z = maxExtentY + radiusXZ
   
  console.log(`Loaded model ${modelSrc}: ${model.vertices.length} vertices, ${model.edges.length} edges`)
  
  // Update stats display
  document.getElementById('vertex-count').textContent = model.vertices.length.toLocaleString()
  document.getElementById('edge-count').textContent = model.edges.length.toLocaleString()
  
  // Start animation render loop
  lastTime = performance.now()
  animationId = requestAnimationFrame(frame)
}

// Load default model
onModelSelect(document.querySelector('#model-selector button.active').dataset.model)