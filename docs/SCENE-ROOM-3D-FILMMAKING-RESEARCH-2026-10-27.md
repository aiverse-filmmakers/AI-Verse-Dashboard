# Scene Room: 3D filmmaking research and MVP design

**Date:** 27 October 2026  
**Status:** Research and proposed implementation direction; not an accepted roadmap slice.

## Recommendation

Call the feature **Scene Room**. Its main job is AI-directed scene building: you talk to the AI in ordinary language, give it an image reference, and it builds a navigable 3D mock-up for you. You then explore the scene and direct the camera.

You should not have to build the room or animate its objects by hand. Moving objects yourself can remain an optional way to correct the AI's work.

**Three.js** is the 3D viewer and scene engine inside the browser. It is not the AI. The AI is the scene builder and camera assistant; Three.js displays the set, characters, props, and camera in real time.

Keep this distinction simple in the product. The user can say “3JS,” “Three JS,” or describe the 3D room. The assistant should understand the intent from context without making the user learn the technical name.

The goal is a detailed-enough, image-guided mock-up that stays quick to explore. Start with a lightweight scene, then add detail where it helps the composition match the reference. Do not wait for a heavy, finished-quality model before letting the user move the camera.

## What the supplied material shows

Sources reviewed: the two supplied Nexus DOCX guides and all five supplied MP4 clips. The MP4s were transcribed on the user's Mac with the local Whisper model; video visuals were reviewed using sampled frames. The 5-minute PJ film clip is a finished example, not a tutorial, so its dialogue does not explain the workflow.

The clips show two useful levels of detail. PJ's Blender method uses simple stand-ins and carefully planned storyboard frames. The JBooksCreative clips show browser-based Three.js scenes built to resemble the supplied location and characters more closely, with movement added for AI-video references. Another clip experiments with turning previs into a depth map. These are creator workflows shown in examples, not controlled quality or speed comparisons.

What to carry into Scene Room:

1. Give the AI the user's reference images and a plain-language scene request.
2. Have it create a navigable set with recognizable shapes, layout, colors, characters, props, and relative scale inferred from those references. Hidden parts are guesses and should be shown as guesses.
3. Animate or reposition scene objects when asked, then let the user move through the scene and choose a camera view.
4. Save camera stills or a storyboard sheet as visual references for later image/video creation.
5. Keep the 3D mock-up as direction for the AI; the final image or video model can add acting, texture, style, and visual detail.

The supplied Blender storyboard workflow adds useful filmmaking basics: real-world scale, clear screen direction, one named camera per shot, checking each camera view, and saving new versions instead of overwriting a useful setup. The supplied animation guide is mainly a later prompt-writing workflow; it should inform scene continuity without expanding the first build into a full video-generation pipeline.

## The “3JS” point

The speaker says **Three.js** (“three jay ess”). It is a JavaScript library for showing and controlling 3D scenes in a web page. It is not Blender and is not an image-to-3D AI model. It provides the building blocks for a browser-based room: 3D objects, cameras, lights, materials, and rendering.

Three.js is a sensible starting point for this browser feature. Its official documentation describes WebGL 2 rendering and a newer WebGPU renderer that can fall back to WebGL 2, while noting that the newer renderer still has limitations. Start with the broadly supported WebGL 2 path unless Dashboard compatibility testing gives a reason to change.

## Different 3D approaches

A reference image is the starting point for the AI to **rebuild a plausible scene around what it sees**. The goal is not to bend that flat image into fake depth. The AI should create separate floor, walls, openings, objects, people, and camera positions so the user can move around and change the view.

Three.js can display and animate that scene, but an AI model must interpret the reference and create the scene structure. Image-to-3D services such as Meshy and Tripo mainly create individual 3D models from images. World-generation services such as Marble create navigable environments, but may not return clean, measured, easily editable film-set geometry. Skybox tools make a surrounding background, not a solid set.

Those services can be optional inputs or later providers. They do not define the core Scene Room workflow. The core should remain a lightweight, editable mock-up whose parts and camera the AI can control.

## Proposed user experience

### 1. Ask the AI to build the scene

Inside the persistent chat, say something like:

> “Use this image as the reference. Build a navigable mock-up of the room. Put the window and table where they appear, add a person near the doorway, and keep the colors and proportions close. Then show me a wide camera view.”

The AI understands the request and image, then creates a preview scene. It should not ask the user to place each wall, prop, or person manually. It can summarize the main choices it inferred and point out areas it had to guess.

### 2. Explore the result

Scene Room opens with one large 3D view. The user can orbit, pan, zoom, walk around, and look through the selected camera. A small scene list shows the room, people, props, and cameras. Advanced details stay tucked away until needed.

If something is wrong, the user can say “move the table closer to the window,” “make the room wider,” or “add another person behind the chair.” The AI updates the scene and the user can undo the change. Directly dragging an object remains an optional correction, not the main way to build.

### 3. Direct the camera

The user can say “show it from the doorway,” “give me a low angle,” or “make a slow handheld move toward the table.” Camera presets can include **Static**, **Tripod**, **Handheld**, **Gimbal**, **Drone**, and **FPV**. The user adjusts the camera by moving it in the 3D view, with simple speed and smoothness controls. Lens, aspect ratio, and safe-area guides are available when useful.

### 4. Save views for the film

The user can ask for a few angles or camera positions. Scene Room captures selected views as named shots and adds them to the existing Canvas. Each shot stays linked to the scene and its camera details, so the user and AI can return to the editable setup later. A sequence of stills can become a storyboard sheet.

### The AI control contract

Three.js should not be controlled by one special model or by asking every model to invent and run arbitrary JavaScript. Scene Room should expose a documented set of scene actions that connected AIs can use: inspect the current scene and reference; create or edit set pieces and characters; move or animate objects; create cameras and paths; capture views; and undo changes.

Each connected AI provider/runtime needs to be mapped to those same actions. The app checks and applies the changes, shows the result, and preserves undo. This is what makes the feature usable across supported models, instead of teaching one model a private trick. Exact support still depends on whether a connected model can understand image inputs and use the app's available actions.

Voice and typed requests use the same chat. The AI should understand the user's meaning when speech recognition writes “3JS” or “Three JS”; the user should be able to say “build this room from the picture” without knowing the library name.

### Keep it quick

- Show a useful rough scene as early as possible; add detail progressively instead of blocking on a high-detail asset.
- Use lightweight geometry and simple character stand-ins for scene parts the camera does not need to inspect closely.
- Refine only the details that matter to the reference or the selected camera view.
- Keep camera movement responsive while models or assets are loading.
- Save changes as reversible scene edits; show an error and retain the last good preview if a build step fails.
- Do not promise a fixed build time before measuring real references and target devices.

## Build order

1. **AI-directed scene contract:** define the common actions for reading a scene/reference, creating and editing set pieces, people and props, setting camera views/movement, and capturing shots. Check how each supported AI runtime can call those actions.
2. **Image-guided scene building:** give a connected AI a reference image and plain-language request; create a lightweight, navigable scene with recognizable layout and visible uncertainty about guessed areas. The user should not need to construct it piece by piece.
3. **Explore and refine:** real-time Three.js view, camera movement, spoken or typed edit requests, optional direct manipulation, undo and restore.
4. **Shot capture to Canvas:** name camera views, capture stills or storyboard sheets, keep them linked to the source scene and camera details.
5. **Provider-backed refinement and creation:** where useful, connect optional asset/world-generation providers and send selected views to image/video generation through the existing approved provider route.

Each step should preserve useful work if later AI or asset generation fails. The initial user benefit is the scene-building AI workflow; do not ship a manual-only room and call that the requested feature.

## Keep the tool focused

Do not start with a full Blender tool shelf, mesh sculpting, node graphs, simulation, or final-quality rendering. Do not make the user learn Three.js or manually position every object. The first build should establish whether the AI can create a recognizable, editable, quick-to-explore mock-up from real image references.

A model's interpretation can be wrong, especially for objects hidden behind the camera. Make the layout editable, make guesses visible when they matter, and let the user correct the scene by voice, text, or direct manipulation.

## Decisions to confirm during implementation

- Which connected model/runtime combinations support both image understanding and structured Scene Room actions? Identify unsupported combinations clearly.
- Which scene actions can all supported models use through the existing Gateway/runtime architecture, and where does any provider-specific translation belong?
- What is the smallest representation that gives useful 3D movement, detail, editability, and quick response? Test with several of the supplied reference images.
- How should scene and camera edits, undo, save/restore, and Canvas shot links work without losing the source setup?
- Which details should the AI infer automatically, and when is a question worth asking instead of making a reversible guess?
- What performance evidence on the actual MacBook/browser will show that building and exploring remain responsive? Measure before setting a numeric target.

## Research sources

### User-supplied sources
- *Public - Nexus Blender Storyboard Workflow - Oct 22.docx* — blockout, scale, camera-by-camera checks, storyboard stills, screen direction, and saved versions.
- *PJ's Nexus Animation Skill Guide.docx* — later-stage prompt structure and continuity guidance.
- Five supplied MP4s: four short workflow/tutorial clips and *PJaccetturo_video_1.mp4*, a finished example film. Transcripts were generated locally for research; sampled visuals were inspected. No full transcript is reproduced here.

### Official technical documentation
- [Three.js fundamentals](https://threejs.org/manual/pages/fundamentals.html) — Three.js is a library for 3D content on web pages.
- [Three.js WebGL renderer](https://threejs.org/docs/pages/WebGLRenderer) — current WebGL renderer uses WebGL 2.
- [Three.js WebGPU renderer guidance](https://threejs.org/manual/pages/webgpurenderer) — fallback behavior and current limitations.
- [Meshy Image-to-3D API](https://docs.meshy.ai/en/api/image-to-3d) — creates a model from an image as an asynchronous provider task.
- [Tripo OpenAPI introduction](https://docs.tripo3d.ai/get-started/introduction.html) and [image-to-model docs](https://docs.tripo3d.ai/model-generation/image-to-model-v2-0-v2-5.html) — image/text-to-model and optional model controls.
- [World Labs Marble](https://marble.worldlabs.ai/) and [World Labs' 3D-world generation overview](https://www.worldlabs.ai/blog/bigger-better-worlds) — image/text/video-to-world generation and Gaussian-splat export.
- [Blockade Labs API docs](https://docs.blockadelabs.com/) — skybox generation; useful as a surrounding backdrop, not solid room geometry.

## Bottom line

Build **Scene Room** as an AI-operated 3D set. The filmmaker gives the AI a reference image and describes the scene; the AI creates and refines the navigable mock-up through common app actions. The filmmaker explores it, directs the camera, and saves shots to Canvas. Three.js displays the scene; the AI does the building. Keep the preview responsive, editable, reversible, and available to every connected model that supports the common scene actions.
