const MODEL_SRC = 'ufo.obj'
const BACKGROUND = "#111111"
const FOREGROUND = "#4AF626"

scene.width = 600
scene.height = 600
const ctx = scene.getContext("2d")

let vertices = []
let edges = []

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

let camera_position = {x: 0, y: 0, z: 2}
let angle = 0

function setCameraPosition(x, y, z) {
  camera_position = {x, y, z}
}

function frame() {
  const deltaTime = 1/FPS
  angle += (deltaTime * Math.PI / 2)
  angle %= Math.PI * 2 // wrap around

  clear()
  for (const vertex of vertices) {
    point(project3DTo2D(translate(rotate_xz(vertex, angle), camera_position)))
  }

  for (const edge of edges) {
    const p1 = project3DTo2D(translate(rotate_xz(vertices[edge[0]], angle), camera_position))
    const p2 = project3DTo2D(translate(rotate_xz(vertices[edge[1]], angle), camera_position))
    
    line({p1, p2})
  }

  for (const vertex of vertices) {
    point(project3DTo2D(translate(rotate_xz(vertex, angle), camera_position)))
  }

  return setTimeout(frame, 1000/FPS)
}

async function main() {
  const model = await loadModel(MODEL_SRC)
  vertices = model.vertices
  edges = model.edges
  console.log(`Loaded model ${MODEL_SRC}: ${vertices.length} vertices, ${edges.length} edges`)
  
  // Start animation
  setTimeout(frame, 1000/FPS)
}

main()
