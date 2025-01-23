AFRAME.registerSystem('ssao', {
  schema: {
    // You can add properties for your SSAO settings if desired
    strength:    {default: 1.0},
    radius:      {default: 5.0},
    samples:     {default: 32},
    onlyAO:      {default: false},
    lumInfluence:{default: 0.7}
    // etc.
  },
  init: function () {
    const sceneEl = this.el; // <a-scene> element
    const renderer = sceneEl.renderer; // THREE.WebGLRenderer
    const scene    = sceneEl.object3D; // THREE.Scene
    const camera   = sceneEl.camera;   // THREE.Camera (once loaded)

    // Wait for camera to be ready:
    if (!camera) {
      sceneEl.addEventListener('camera-set-active', () => {
        this.setupPostprocessing();
      });
    } else {
      this.setupPostprocessing();
    }
  },
  setupPostprocessing: function () {
    const sceneEl = this.el;
    const renderer = sceneEl.renderer;
    const scene    = sceneEl.object3D;
    const camera   = sceneEl.camera;

    // Make sure the camera has near/far that match your desired depth range
    camera.near = 0.1;
    camera.far = 1000;
    camera.updateProjectionMatrix();

    // 1) Create EffectComposer
    this.composer = new THREE.EffectComposer(renderer);
    this.composer.setSize(renderer.domElement.width, renderer.domElement.height);

    // 2) Add a RenderPass for the main scene
    const renderPass = new THREE.RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 3) Enable a DepthTexture so our SSAO shader can sample depth
    //    We can attach it directly to the renderer's output or to an extra pass
    //    Easiest: Let the composer automatically create the depthTexture.
    const size = renderer.getSize(new THREE.Vector2());
    this.depthTarget = new THREE.WebGLRenderTarget(size.x, size.y);
    this.depthTarget.texture.format = THREE.RGBAFormat;
    this.depthTarget.texture.minFilter = THREE.NearestFilter;
    this.depthTarget.texture.magFilter = THREE.NearestFilter;
    this.depthTarget.texture.generateMipmaps = false;
    this.depthTarget.stencilBuffer = false;
    this.depthTarget.depthBuffer = true;
    this.depthTarget.depthTexture = new THREE.DepthTexture(size.x, size.y);
    this.depthTarget.depthTexture.format = THREE.DepthFormat;
    this.depthTarget.depthTexture.type = THREE.UnsignedShortType;
    // We will pass this depthTexture into our SSAO shader as 'tDepth'.

    // For a full “two-pass” approach, you might:
    //  - Have a depth-only pass that writes into this.depthTarget
    //  - Then your color pass
    //  - Then the SSAO pass
    // but for simplicity we can do it all in one pass if we just read from depthTexture.

    // 4) Custom SSAO Shader (vertex + fragment).
    //    We adapt your code into a ShaderMaterial or use a ShaderPass.
    //    We'll define a "SSAOShader" object with uniforms, vertexShader, fragmentShader.
    const SSAOShader = {
      uniforms: {
        'tDiffuse':  { value: null }, // color pass
        'tDepth':    { value: this.depthTarget.depthTexture }, // our depth
        'resolution':{ value: new THREE.Vector2(size.x, size.y) },
        'zNear':     { value: camera.near },
        'zFar':      { value: camera.far },
        'strength':  { value: this.data.strength },
        'radius':    { value: this.data.radius },
        'samples':   { value: this.data.samples },
        // etc. add the rest from your fragment code
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: /* glsl */`
        // Insert your big SSAO fragment code here, but adapted to:
        //  - read from uniforms instead of "uniform float strength;" => "uniform float strength;"
        //  - read from tDiffuse for color, if you combine with the final image
        //  - or just output the occlusion if you want a debug pass

        // NOTE: For demonstration, I'm using your posted snippet but simplified.
        // You definitely need to adapt it to your actual pipeline: do you want to
        // combine with the color, or just see AO pass?

        varying vec2 vUv;
        uniform sampler2D tDepth;
        uniform vec2 resolution;
        uniform float zNear;
        uniform float zFar;
        uniform float strength;

        // ... plus the rest of your SSAO code ...

        void main() {
          // run your code
          // gl_FragColor = vec4( ao * finalColor, 1.0 );
          gl_FragColor = vec4(vec3(1.0),1.0); // placeholder
        }
      `
    };

    // 5) Make a ShaderPass from the SSAOShader:
    const ssaoPass = new THREE.ShaderPass(SSAOShader);
    // If you do not combine AO with color, the pass might overwrite your scene.
    // Typically you'd do: finalColor = AO * tDiffuse, or something similar.

    // 6) Add the pass to the composer
    this.composer.addPass(ssaoPass);

    // 7) After everything, make sure the last pass has "renderToScreen = true"
    ssaoPass.renderToScreen = true;

    // 8) We must now re-render to a separate target to get the depth
    //    The simplest approach is each frame:
    //       - render scene into `this.depthTarget` (so we have an up-to-date depthTexture)
    //       - then run composer which uses that tDepth
    //    We'll do that in `tick()`.
  },
  tick: function(t, dt) {
    if (!this.composer) return;

    const sceneEl = this.el;
    const renderer = sceneEl.renderer;
    const scene    = sceneEl.object3D;
    const camera   = sceneEl.camera;

    // 1) Render scene into the depthTarget so depthTexture is up to date
    renderer.setRenderTarget(this.depthTarget);
    renderer.clear();
    renderer.render(scene, camera);

    // 2) Now run composer (which references tDepth=depthTarget.depthTexture)
    renderer.setRenderTarget(null);
    this.composer.render();
  }
});
