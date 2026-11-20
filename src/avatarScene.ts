import {
  AnimationMixer,
  DirectionalLight,
  HemisphereLight,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type AnimationAction,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

// Camera matches the Blender camera that rendered the poster image, so the swap from
// poster to live canvas does not jump: 22° vertical field of view, 5.2 m away, 0.9 m high.
const FOV = 22
const CAM_Z = 5.2
const CAM_Y = 0.9
/** The poster shows frame 22 of the 24 fps wave, so the live animation starts there too. */
export const START_AT = 21 / 24

export type AvatarScene = {
  /** Size of one rendered pixel in CSS pixels. 1 is full resolution; larger looks 8-bit. */
  setBlock: (block: number) => void
  /** 1 plays the wave fully; 0 blends back to the resting pose. */
  setWave: (weight: number) => void
  render: (dt: number) => void
  resize: () => void
  dispose: () => void
}

export async function createAvatarScene(canvas: HTMLCanvasElement, url: string): Promise<AvatarScene> {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(FOV, 4 / 5, 0.1, 50)
  camera.position.set(0, CAM_Y, CAM_Z)
  camera.lookAt(0, CAM_Y, 0)

  scene.add(new HemisphereLight(0xffffff, 0x9aa0a8, 1.9))
  const key = new DirectionalLight(0xfff3e4, 2.1)
  key.position.set(2.2, 3, 2.6)
  const rim = new DirectionalLight(0xffffff, 1.2)
  rim.position.set(-1.5, 2.6, -2.8)
  scene.add(key, rim)

  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url)
  scene.add(gltf.scene)

  const mixer = new AnimationMixer(gltf.scene)
  const wave: AnimationAction = mixer.clipAction(gltf.animations[0])
  wave.play()
  mixer.setTime(START_AT)

  let block = 1
  let size = ''

  const resize = () => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    const dpr = block === 1 ? Math.min(devicePixelRatio, 1.75) : 1
    const bw = Math.max(6, Math.round((w * dpr) / block))
    const bh = Math.max(8, Math.round((h * dpr) / block))
    const next = `${bw}x${bh}`
    if (next === size) return
    size = next
    renderer.setPixelRatio(1)
    renderer.setSize(bw, bh, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()

  return {
    setBlock: (next) => {
      if (next === block) return
      block = next
      resize()
    },
    setWave: (weight) => wave.setEffectiveWeight(weight),
    render: (dt) => {
      mixer.update(dt)
      renderer.render(scene, camera)
    },
    resize,
    dispose: () => {
      mixer.stopAllAction()
      renderer.dispose()
    },
  }
}
