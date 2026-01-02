const BACKGROUND = "#111111"
const FOREGROUND = "#4AF626"

scene.width = 600
scene.height = 600
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

function line({p1, p2}, lineWidth = 2, color = FOREGROUND) {
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

const FPS = 60

const camera_position = {x: 0, y: 0, z: 1}
let angle = 0
let timer = undefined

function setCameraPosition(x, y, z) {
  camera_position = {x, y, z}
}

function frame() {
  const deltaTime = 1/FPS
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

  timer = setTimeout(frame, 1000/FPS)
}

async function onModelSelect(modelSrc) {  
  // Update button styles
  const buttons = document.querySelectorAll('#model-selector button')
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.model === modelSrc)
  })
  
  clearTimeout(timer)
  model = await loadModel(modelSrc)
  console.log(`Loaded model ${modelSrc}: ${model.vertices.length} vertices, ${model.edges.length} edges`)

  // Update camera to be able to view entire model
  const maxExtent = Math.max(
    Math.abs(model.boundingBox.maxX), Math.abs(model.boundingBox.minX),
    Math.abs(model.boundingBox.maxY), Math.abs(model.boundingBox.minY),
    Math.abs(model.boundingBox.maxZ), Math.abs(model.boundingBox.minZ)
  )
  camera_position.z = maxExtent + 2
  
  // Start animation render loop
  timer = setTimeout(frame, 1000/FPS)
}

// Load default model
onModelSelect(document.querySelector('#model-selector button.active').dataset.model)