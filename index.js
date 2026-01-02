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
    y: (projected.y+1) / 2 * scene.height,
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

function translate_z({x, y, z}, dz) {
  return {
    x: x,
    y: y,
    z: z + dz,
  }
}

const FPS = 60

const camera_distance = 2
let angle = 0

function frame() {
  const deltaTime = 1/FPS
  angle += (deltaTime * Math.PI / 2)
  angle %= Math.PI * 2 // wrap around

  clear()
  for (const vertex of vertices) {
    point(project3DTo2D(translate_z(rotate_xz(vertex, angle), camera_distance)))
  }

  for (const edge of edges) {
    const p1 = project3DTo2D(translate_z(rotate_xz(vertices[edge[0]], angle), camera_distance))
    const p2 = project3DTo2D(translate_z(rotate_xz(vertices[edge[1]], angle), camera_distance))
    
    line({p1, p2})
  }

  for (const vertex of vertices) {
    point(project3DTo2D(translate_z(rotate_xz(vertex, angle), camera_distance)))
  }

  return setTimeout(frame, 1000/FPS)
}

// Load model and start animation
loadModel(MODEL_SRC).then(model => {
  vertices = model.vertices
  edges = model.edges
  console.log(`Loaded model ${MODEL_SRC}: ${vertices.length} vertices, ${edges.length} edges`)
  setTimeout(frame, 1000/FPS)
})